/**
 * 学生侧「作答」面板（`numas.exam.answer.view`）。
 *
 * <p>职责只有三件：**倒计时、题目列表、交卷**。
 * 与出题方的考试面板（考试信息 / 参考资料 / 发布考试）分开成两个扩展：
 * 两类角色看到的东西没有交集，混在一起会让彼此的界面互相污染。
 *
 * <p>显示条件：工作区里有 `.sumi/exam-session.json`（进入工具在首次进入时写下）。
 * 出题方的工作区没有这个文件。
 */
import * as vscode from "vscode";

const VIEW_ID = "numas.exam.answer.view";
/** 个人计时状态（进入工具写入，不进 git）。 */
const SESSION_FILE = ".sumi/exam-session.json";
/** 工作区业务配置：试卷清单与作答时长。 */
const CONF_FILE = ".sumi/workspace.conf";
/** 提交工具与它写出的状态文件（工作区自带）。 */
const SUBMIT_TOOL_PATH = ".opencode/tools/repo-submit.mjs";
const SUBMIT_STATE_PATH = ".sumi/repo-submit.json";
const SUBMIT_POLL_INTERVAL_MS = 500;
const SUBMIT_TIMEOUT_MS = 3 * 60 * 1000;
/** 刷新节奏：会话文件可能稍后才写入，面板先空着再自动接上。 */
const REFRESH_MS = 4000;

type QuestionItem = {
  /** 卷面题号（`:::type#N` 的 N）。 */
  readonly number: number;
  /** 题干首行，用作列表标题。 */
  readonly title: string;
};

type ViewModel = {
  /** 是否处于作答工作区（没有会话文件时为 false）。 */
  readonly answering: boolean;
  /** 个人截止时间（epoch 毫秒）；null = 不限时。 */
  readonly deadlineAtMs: number | null;
  /** 当前分支（提交要 push 到它）。 */
  readonly branch: string;
  /** 是否在工程题 / 项目视图（URL 带题目段）。 */
  readonly inQuestion: boolean;
  readonly questions: readonly QuestionItem[];
  /** 试卷标题。 */
  readonly paperTitle: string;
};

/**
 * 解析考试工作区根。
 *
 * <p>工程题会把 `vscode.workspace.workspaceFolders` 切到 `project/`，
 * 这时 `.sumi/exam-session.json`、`workspace.conf`、提交工具都不在当前根下，
 * 直接读会得到「没有会话 → 面板消失 / 返回试卷空转」。
 * 从当前根向上找带会话文件的目录，最多 6 层。
 */
const resolveExamRoot = async (): Promise<vscode.Uri | undefined> => {
  let current = vscode.workspace.workspaceFolders?.[0]?.uri;
  for (let depth = 0; current !== undefined && depth < 6; depth += 1) {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.joinPath(current, ...SESSION_FILE.split("/")));
      return current;
    } catch {
      /* 当前层没有会话文件，继续向上。 */
    }
    const parent = vscode.Uri.joinPath(current, "..");
    if (parent.toString() === current.toString()) {
      break;
    }
    current = parent;
  }
  return undefined;
};

const EMPTY: ViewModel = {
  answering: false,
  deadlineAtMs: null,
  branch: "",
  inQuestion: false,
  questions: [],
  paperTitle: "",
};

export class AnswerProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private view: vscode.WebviewView | undefined;
  private timer: NodeJS.Timeout | undefined;
  private submitting = false;
  /** 是否已经主动把左侧切到作答面板；只切一次，之后尊重用户选择。 */
  private switched = false;
  /** 老师身份下是否已经把左栏切回考试面板。 */
  private teacherViewRestored = false;

  dispose(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    /*
     * 页面刷新 / 视图重建时，旧视图会被销毁但扩展实例还在：
     * 旧定时器如果继续跑，postMessage 会打在 null 上（实测每 4 秒一条
     * `Cannot read properties of null (reading 'postMessage')`）。
     */
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.switched = false;
    this.view = view;
    view.onDidDispose(() => {
      if (this.view === view) {
        this.view = undefined;
      }
      if (this.timer !== undefined) {
        clearInterval(this.timer);
        this.timer = undefined;
      }
    });
    view.webview.options = { enableScripts: true };
    view.webview.html = this.html();
    view.webview.onDidReceiveMessage((message: unknown) => {
      if (typeof message !== "object" || message === null) {
        return;
      }
      const record = message as { type?: unknown; auto?: unknown };
      if (record.type === "ready") {
        void this.refresh();
        return;
      }
      if (record.type === "submit") {
        void this.submit(record.auto === true).catch((error: unknown) => {
          this.post({
            type: "submitProgress",
            state: "failed",
            message: `${record.auto === true ? "自动提交失败" : "提交失败"}：${
              error instanceof Error ? error.message : String(error)
            }`,
          });
        });
        return;
      }
      if (record.type === "reveal" && typeof (message as { number?: unknown }).number === "number") {
        void vscode.commands.executeCommand("numas.paper.reveal", String((message as { number: number }).number));
      }
    });
    this.timer = setInterval(() => void this.refresh(), REFRESH_MS);
    /* 打开工程题 / 返回试卷会切换 activeTextEditor：立即刷新按钮，不等 4 秒轮询。 */
    const activeListener = vscode.window.onDidChangeActiveTextEditor(() => void this.refresh());
    view.onDidDispose(() => activeListener.dispose());
    void this.refresh();
  }

  private async read(uri: vscode.Uri): Promise<string | undefined> {
    try {
      return new TextDecoder("utf-8").decode(await vscode.workspace.fs.readFile(uri));
    } catch {
      return undefined;
    }
  }

  private async exists(uri: vscode.Uri): Promise<boolean> {
    return (await this.read(uri)) !== undefined;
  }

  private post(message: unknown): void {
    const webview = this.view?.webview;
    if (webview === undefined || webview === null) {
      return;
    }
    void webview.postMessage(message);
  }

  private async refresh(): Promise<void> {
    if (this.view === undefined) {
      return;
    }
    const model = await this.load();
    this.post({ type: "model", model });
    /*
     * 进入工具是在 IDE 起来之后才写 role 的，扩展激活时可能还没写成；
     * 这里在**确认作答身份之后**再切一次，避免「面板有数据但左侧还停在考试面板」。
     */
    if (!model.answering && !this.teacherViewRestored) {
      const folder = await resolveExamRoot();
      if (folder !== undefined) {
        const role = await readRole(folder);
        const branch = await readBranch(folder);
        /* 只有明确是老师（或主分支）才切考试面板；会话还没写时不抢学生的视图。 */
        if (role === "teacher" || branch === "main") {
          this.teacherViewRestored = true;
          try {
            await vscode.commands.executeCommand("workbench.view.extension.numas.exam.panel");
          } catch {
            this.teacherViewRestored = false;
          }
        }
      }
    }
    if (model.answering && !this.switched) {
      this.switched = true;
      try {
        await vscode.commands.executeCommand("workbench.view.extension.numas.exam.answer");
      } catch {
        this.switched = false;
      }
    }
  }

  /** 组装面板数据；没有会话文件说明不是作答工作区。 */
  private async load(): Promise<ViewModel> {
    const folder = await resolveExamRoot();
    if (folder === undefined) {
      return EMPTY;
    }
    const session = await this.session(folder);
    if (session === undefined) {
      return EMPTY;
    }
    /*
     * 只有**明确判定为学生**才显示作答面板。
     * 判据是进入工具写下的 `role`（查 repo 所有权：owner = 老师）。
     * 老会话没有 role 字段时按老师处理 —— 宁可不出作答面板，
     * 也不能让出题方看见学生的倒计时与交卷入口。
     */
    if (session.role !== "student") {
      return EMPTY;
    }
    /*
     * 主分支是老师的仓。即使会话被历史/模拟写成了 student，
     * 也不能在主分支上出作答面板 —— 这是最后一道兜底。
     */
    const branch = await this.branch(folder);
    if (branch.length === 0 || branch === "main") {
      return EMPTY;
    }
    const conf = await this.read(vscode.Uri.joinPath(folder, ...CONF_FILE.split("/")));
    const paperPath = conf === undefined ? "" : paperPathOf(conf);
    const paper =
      paperPath.length === 0
        ? undefined
        : await this.read(vscode.Uri.joinPath(folder, ...paperPath.split("/")));
    /*
     * 题目视图的判据：当前激活的是考试根下的普通文件（工程题默认文件，如 analyzer.js），
     * 不是试卷自定义编辑器。学生工程题不再切 workspace 根（paper 0.5.51），
     * 所以不能再用「当前根 != 考试根」判断。
     */
    const active = vscode.window.activeTextEditor?.document.uri;
    const inQuestion =
      active !== undefined &&
      active.scheme === "file" &&
      active.toString() !== folder.toString() &&
      active.fsPath.startsWith(`${folder.fsPath}/`) &&
      !/\.paper$/i.test(active.fsPath);
    return {
      answering: true,
      inQuestion,
      /* 解析不出来按不限时处理，避免卷面出现 NaN:NaN:NaN。 */
      deadlineAtMs:
        session.deadlineAt.length === 0 || !Number.isFinite(Date.parse(session.deadlineAt))
          ? null
          : Date.parse(session.deadlineAt),
      branch: await this.branch(folder),
      questions: paper === undefined ? [] : parseQuestions(paper),
      paperTitle: paper === undefined ? "" : paperTitleOf(paper, paperPath),
    };
  }

  private async session(
    folder: vscode.Uri,
  ): Promise<{ firstEnteredAt: string; deadlineAt: string; role: string } | undefined> {
    const text = await this.read(vscode.Uri.joinPath(folder, ...SESSION_FILE.split("/")));
    if (text === undefined) {
      return undefined;
    }
    try {
      const data: unknown = JSON.parse(text);
      if (typeof data !== "object" || data === null) {
        return undefined;
      }
      const record = data as Record<string, unknown>;
      const firstEnteredAt = typeof record["firstEnteredAt"] === "string" ? record["firstEnteredAt"] : "";
      if (firstEnteredAt.length === 0) {
        return undefined;
      }
      return {
        firstEnteredAt,
        deadlineAt: typeof record["deadlineAt"] === "string" ? record["deadlineAt"] : "",
        role: typeof record["role"] === "string" ? record["role"] : "",
      };
    } catch {
      return undefined;
    }
  }

  /** 当前分支短名；分离头指针返回空串。 */
  private async branch(folder: vscode.Uri): Promise<string> {
    const head = await this.read(vscode.Uri.joinPath(folder, ".git", "HEAD"));
    if (head === undefined) {
      return "";
    }
    const ref = /^ref:\s*refs\/heads\/(.+)\s*$/m.exec(head);
    return ref === null ? "" : (ref[1] ?? "").trim();
  }

  /**
   * 回到试卷：工程题打开项目文件后，卷面页签会被挤到后台。
   *
   * <p>按 `workspace.conf` 的 `content:` 找到当前试卷，调试卷扩展的
   * `numas.paper.open`（与 webapp / 其它扩展同一入口），把卷面重新拉到前台。
   */
  private async backToPaper(): Promise<void> {
    const folder = await resolveExamRoot();
    if (folder === undefined) {
      return;
    }
    const conf = await this.read(vscode.Uri.joinPath(folder, ...CONF_FILE.split("/")));
    const paperPath = conf === undefined ? "" : paperPathOf(conf);
    if (paperPath.length === 0) {
      return;
    }
    const uri = vscode.Uri.joinPath(folder, ...paperPath.split("/")).toString();
    try {
      /*
       * 先退出工程题的项目模式：试卷扩展会把资源管理器根目录、左栏视图和卷面
       * 一起恢复；再打开试卷，把卷面标签页拉到前台。
       */
      await vscode.commands.executeCommand("numas.paper.exitProject").then(undefined, () => undefined);
      await vscode.commands.executeCommand("numas.paper.open", uri);
    } catch (error) {
      void vscode.window.showWarningMessage(
        `打开试卷失败：${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 交卷：起终端跑工作区自带的 `repo-submit.mjs`，把改动 commit 并 push 到当前分支。
   *
   * <p>不在这里另写一套提交：排除项与 push 规则都在工具里。
   */
  private async submit(auto: boolean): Promise<void> {
    if (this.submitting) {
      return;
    }
    const folder = await resolveExamRoot();
    if (folder === undefined) {
      throw new Error("当前工作区不可用");
    }
    if (!(await this.exists(vscode.Uri.joinPath(folder, ...SUBMIT_TOOL_PATH.split("/"))))) {
      throw new Error(`工作区里没有提交工具（${SUBMIT_TOOL_PATH}）`);
    }
    this.submitting = true;
    this.post({ type: "submitProgress", state: "running", message: auto ? "正在自动提交…" : "正在提交作答…" });
    try {
      const stateUri = vscode.Uri.joinPath(folder, ...SUBMIT_STATE_PATH.split("/"));
      await vscode.workspace.fs.delete(stateUri, { useTrash: false }).then(undefined, () => undefined);

      const command = `node ${SUBMIT_TOOL_PATH}`;
      try {
        await vscode.commands.executeCommand("numas.ui.terminal.run", { text: command, cwd: folder.fsPath });
      } catch {
        await vscode.commands.executeCommand("numas.ui.terminal.run", {
          text: `cd ${JSON.stringify(folder.fsPath)} && ${command}`,
        });
      }

      const outcome = await this.waitForSubmit(stateUri);
      if (!outcome.ok) {
        throw new Error(outcome.error.length > 0 ? outcome.error : "提交失败：终端工具没有给出原因");
      }
      const message = outcome.branch.length > 0 ? `已提交到 ${outcome.branch}` : "已提交";
      this.post({ type: "submitProgress", state: "done", message });
      void vscode.window.showInformationMessage(message);
      await this.refresh();
    } finally {
      this.submitting = false;
    }
  }

  private async waitForSubmit(
    stateUri: vscode.Uri,
  ): Promise<{ ok: true; branch: string } | { ok: false; error: string }> {
    const deadline = Date.now() + SUBMIT_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await new Promise<void>((resolve) => setTimeout(resolve, SUBMIT_POLL_INTERVAL_MS));
      const text = await this.read(stateUri);
      if (text === undefined || text.trim().length === 0) {
        continue;
      }
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        continue;
      }
      if (typeof data !== "object" || data === null) {
        continue;
      }
      const record = data as Record<string, unknown>;
      if (record["ok"] === true) {
        return { ok: true, branch: typeof record["branch"] === "string" ? record["branch"] : "" };
      }
      if (record["ok"] === false) {
        return { ok: false, error: typeof record["error"] === "string" ? record["error"] : "" };
      }
    }
    return { ok: false, error: "提交超时：终端工具可能仍在运行，请检查网络后重试" };
  }

  private html(): string {
    const nonce = String(Date.now());
    return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
<style>
/*
 * 只用亮色：作答面板不跟随系统深浅色。
 * 颜色写死成暖白一套，不读 --vscode-* 变量 —— 那套会跟着宿主主题变。
 */
html,body{background:#fbf7f1}
*{box-sizing:border-box}
body{margin:0;padding:0;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;color:#2f2a26}
:root{--accent:#e0771e;--accent-soft:rgba(224,119,30,.12);--muted:#6b6158;--faint:#9c9089;--line:#efe5da;--surface:#f7f2ec}
.panel{display:flex;flex-direction:column;height:100vh;width:256px;max-width:100%}
.body{flex:1 1 auto;overflow:auto;padding:12px 6px 8px}
.body::-webkit-scrollbar{width:6px}
.body::-webkit-scrollbar-thumb{background:rgba(47,42,38,.16);border-radius:3px}
.group{display:flex;flex-direction:column;gap:6px;margin:0 0 12px}
.group-title{padding:0 10px;color:var(--accent);font-size:13px;font-weight:600}
.rows{display:flex;flex-direction:column;gap:6px;padding:0 10px}
.row{display:flex;align-items:center;gap:8px;min-height:30px;line-height:1.25}
.row-label{flex:0 0 64px;margin:0;font-size:12px;white-space:nowrap;color:var(--muted)}
.row-value{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:6px;font-size:13px}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace}
#countdown{font-variant-numeric:tabular-nums;font-size:15px;font-weight:600;color:#2f2a26}
#countdown.is-over{color:#b42318}
/* 题目列表：每行一个题号 + 题干首行，行高固定不跳动。 */
.q-list{display:flex;flex-direction:column;gap:4px;padding:0 6px}
.q-item{display:flex;align-items:center;gap:9px;width:100%;padding:7px 8px;border:0;border-radius:9px;background:none;color:#2f2a26;font:inherit;font-size:12.5px;text-align:left;cursor:pointer;transition:background-color 120ms ease}
.q-item:hover{background:var(--surface)}
.q-item:active{background:var(--accent-soft)}
.q-no{flex:none;width:22px;height:22px;border-radius:6px;background:var(--accent-soft);color:var(--accent);font-size:11.5px;font-weight:700;display:flex;align-items:center;justify-content:center}
.q-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.empty{padding:10px;color:var(--faint);font-size:12px;line-height:1.6}
.foot{flex:none;display:flex;flex-direction:column;gap:6px;padding:10px 12px 14px;border-top:1px solid var(--line)}
/* 与 exam-panel 的「发布考试」同一套按钮：32px / 9px 圆角 / 实色 accent / 600。 */
.foot-btn{width:100%;height:32px;border:0;border-radius:9px;background:var(--accent);color:#fff;font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:transform .16s cubic-bezier(.2,.8,.2,1),filter .15s ease}
.foot-btn:hover:not(:disabled){filter:brightness(.94)}
.foot-btn:active:not(:disabled){transform:scale(.95);filter:brightness(.88);transition-duration:.08s}
.foot-btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.foot-btn:disabled{cursor:default;filter:none;opacity:.6;transform:none}
.submit-status{margin:0;font-size:11px;line-height:1.45;color:var(--faint);word-break:break-word}
.submit-status.is-running{color:var(--accent)}
.submit-status.is-error{color:#b42318}
.submit-status[hidden]{display:none}
.hidden{display:none !important}
</style></head><body>
<div class="panel">
  <div class="body">
    <div class="group" id="time-group">
      <div class="group-title">剩余时间</div>
      <div class="rows">
        <div class="row"><span class="row-value"><span class="mono" id="countdown">--:--</span></span></div>
      </div>
    </div>
    <div class="group">
      <div class="group-title" id="q-title">题目</div>
      <div class="q-list" id="q-list"></div>
      <div class="empty hidden" id="q-empty">还没有题目</div>
    </div>
  </div>
  <div class="foot hidden" id="foot">
    <button class="foot-btn" id="back-paper" type="button">返回试卷</button>
    <button class="foot-btn" id="submit-btn" type="button">提交作答</button>
    <p class="submit-status" id="submit-status" hidden></p>
  </div>
</div>
<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
let model = null;
let timer = null;
let autoSubmitted = false;
const $ = (id) => document.getElementById(id);
const pad2 = (n) => (n < 10 ? "0" + n : String(n));

function stopTimer(){ if (timer !== null) { clearInterval(timer); timer = null; } }

function renderCountdown(){
  const el = $("countdown");
  if (!el || !model || !model.answering) return;
  if (model.deadlineAtMs === null) { el.textContent = "不限时"; el.classList.remove("is-over"); return; }
  const left = model.deadlineAtMs - Date.now();
  if (left <= 0) {
    el.textContent = "已到时";
    el.classList.add("is-over");
    if (!autoSubmitted) {
      autoSubmitted = true;
      const btn = $("submit-btn");
      if (btn) btn.disabled = true;
      vscode.postMessage({ type: "submit", auto: true });
    }
    return;
  }
  const total = Math.floor(left / 1000);
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  el.textContent = h > 0 ? h + ":" + pad2(m) + ":" + pad2(s) : pad2(m) + ":" + pad2(s);
}

function startTimer(){
  stopTimer();
  if (!model || !model.answering) return;
  renderCountdown();
  timer = setInterval(renderCountdown, 1000);
}

function render(){
  const on = !!model && model.answering;
  const inQuestion = on && model.inQuestion === true;
  $("foot").classList.toggle("hidden", !on);
  $("time-group").classList.toggle("hidden", !on);
  /*
   * 卷面（URL 不带题目）只给「提交作答」；进入题目（URL 带题目段）只给「返回试卷」。
   * 两个动作不在同一屏出现，避免学生没作答就交卷 / 在题目里找不到回卷入口。
   */
  $("back-paper").classList.toggle("hidden", !inQuestion);
  $("submit-btn").classList.toggle("hidden", !on || inQuestion);
  $("submit-status").classList.toggle("hidden", inQuestion || $("submit-status").dataset.hidden === "1");
  const list = $("q-list");
  const empty = $("q-empty");
  const title = $("q-title");
  if (on && model.paperTitle) title.textContent = model.paperTitle;
  /*
   * 倒计时先跑起来：试卷还没解析出来（题目为空）时也要计时，
   * 不能等题目出现才开始算 —— 那会让「已进入」的前几秒不计入考试。
   */
  if (on) startTimer();
  const items = (model && model.questions) || [];
  if (!on || items.length === 0) {
    list.innerHTML = "";
    empty.classList.toggle("hidden", !on);
    return;
  }
  empty.classList.add("hidden");
  list.innerHTML = items
    .map((q) => {
      const safeTitle = String(q.title || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
      return '<button class="q-item" type="button" data-number="' + q.number + '">' +
        '<span class="q-no">' + q.number + '</span><span class="q-title">' + safeTitle + "</span></button>";
    })
    .join("");
  startTimer();
}

function setSubmit(state, message){
  const status = $("submit-status"), btn = $("submit-btn");
  if (!status || !btn) return;
  if (state === "running") { btn.disabled = true; status.dataset.hidden = "0"; status.hidden = false; status.className = "submit-status is-running"; status.textContent = message || "正在提交作答…"; return; }
  if (state === "failed") { btn.disabled = false; status.dataset.hidden = "0"; status.hidden = false; status.className = "submit-status is-error"; status.textContent = message || "提交失败"; return; }
  if (state === "done") { btn.disabled = true; status.dataset.hidden = "0"; status.hidden = false; status.className = "submit-status"; status.textContent = message || "已提交"; return; }
  status.dataset.hidden = "1"; status.hidden = true; status.className = "submit-status"; status.textContent = "";
}

window.addEventListener("message", (event) => {
  const data = event.data;
  if (!data) return;
  if (data.type === "model") {
    const next = data.model || null;
    const changed = !model || !next ? true : model.deadlineAtMs !== next.deadlineAtMs;
    model = next;
    if (changed) autoSubmitted = false;
    render();
    return;
  }
  if (data.type === "submitProgress") setSubmit(data.state, data.message);
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!target || !target.closest) return;
  const item = target.closest(".q-item");
  if (item) {
    vscode.postMessage({ type: "reveal", number: Number(item.dataset.number) });
  }
});

$("back-paper").onclick = () => { vscode.postMessage({ type: "backToPaper" }); };
$("submit-btn").onclick = () => { const btn = $("submit-btn"); if (!btn.disabled) { btn.disabled = true; vscode.postMessage({ type: "submit", auto: false }); } };
render();
vscode.postMessage({ type: "ready" });
</script></body></html>`;
  }
}

/** `workspace.conf` 里第一篇试卷的相对路径。 */
const paperPathOf = (conf: string): string => {
  const match = /^\s*content:\s*(?:"([^"]+)"|'([^']+)'|([^\s#]+))\s*$/m.exec(conf);
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
};

/** 试卷标题：frontmatter 的 `title`，读不到用文件名。 */
const paperTitleOf = (paper: string, path: string): string => {
  const front = /^---[\s\S]*?\n---/.exec(paper)?.[0] ?? "";
  const title = /^title:\s*(?:"([^"]+)"|'([^']+)'|([^\s#]+))\s*$/m.exec(front);
  const value = (title?.[1] ?? title?.[2] ?? title?.[3] ?? "").trim();
  if (value.length > 0) {
    return value;
  }
  return (path.split("/").pop() ?? "").replace(/\.paper$/i, "");
};

/**
 * 题目列表：按卷面顺序取每个 `:::type#N` 块的题号与题干首行。
 *
 * <p>只做「能列出题号与标题」这件事，完整解析归试卷扩展。
 */
const parseQuestions = (paper: string): QuestionItem[] => {
  const items: QuestionItem[] = [];
  const blockRegex = /^:::([a-z-]+)#(\d+)\s*$/gm;
  let previousIndex = 0;
  let match: RegExpExecArray | null = blockRegex.exec(paper);
  while (match !== null) {
    const number = Number(match[2]);
    const before = paper.slice(previousIndex, match.index);
    const title = firstLineOf(stemOf(before));
    items.push({ number, title: title.length > 0 ? title : `第 ${String(number)} 题` });
    previousIndex = match.index + match[0].length;
    match = blockRegex.exec(paper);
  }
  return items;
};

/** 去掉 frontmatter、分组标题与空行，留下题干正文。 */
const stemOf = (before: string): string => {
  const body = before.replace(/^---[\s\S]*?\n---\s*/, "");
  const heading = body.lastIndexOf("\n## ");
  const scoped = heading >= 0 ? body.slice(heading + 1) : body;
  return scoped
    .split(/\r?\n/)
    .filter((line) => !/^#{1,6}\s/.test(line.trim()) && !/^---\s*$/.test(line.trim()))
    .join("\n");
};

/** 题干首行：跳过空行与列表 / 图片这类非文字行。 */
const firstLineOf = (text: string): string => {
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (
      line.length === 0 ||
      /^:::/.test(line) ||
      /^[-*+]\s/.test(line) ||
      /^!\[/.test(line) ||
      /^```/.test(line)
    ) {
      continue;
    }
    return line.replace(/^>\s*/, "").replace(/^\d+[.)]\s*/, "").slice(0, 60);
  }
  return "";
};

/** 当前分支短名；读不到返回空串。 */
const readBranch = async (folder: vscode.Uri): Promise<string> => {
  try {
    const raw = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(folder, ".git", "HEAD"));
    const text = new TextDecoder().decode(raw);
    const ref = /^ref:\s*refs\/heads\/(.+)\s*$/m.exec(text);
    return ref === null ? "" : (ref[1] ?? "").trim();
  } catch {
    return "";
  }
};

/** 读进入工具写下的 role；没有会话文件或字段时返回空串。 */
const readRole = async (folder: vscode.Uri): Promise<string> => {
  try {
    const raw = await vscode.workspace.fs.readFile(
      vscode.Uri.joinPath(folder, ".sumi", "exam-session.json"),
    );
    const data: unknown = JSON.parse(new TextDecoder().decode(raw));
    if (typeof data !== "object" || data === null) {
      return "";
    }
    const role = (data as Record<string, unknown>)["role"];
    return typeof role === "string" ? role : "";
  } catch {
    return "";
  }
};

/**
 * 左侧默认视图是出题方的考试面板（模板里静态写的 `sumi.defaultView.left`），
 * 而活动栏默认隐藏、学生没有图标可点 —— 检测到这是作答工作区（有会话文件）时，
 * 主动把左侧切到本面板。只切一次，之后尊重用户自己的选择。
 */
const switchLeftView = async (): Promise<boolean> => {
  const folder = await resolveExamRoot();
  if (folder === undefined) {
    return false;
  }
  try {
    await vscode.workspace.fs.stat(vscode.Uri.joinPath(folder, ".sumi", "exam-session.json"));
  } catch {
    return false;
  }
  /* 只有学生才切到作答面板：老师那边是本扩展不该抢的位置。 */
  const role = await readRole(folder);
  if (role !== "student") {
    return false;
  }
  const branch = await readBranch(folder);
  if (branch.length === 0 || branch === "main") {
    return false;
  }
  try {
    await vscode.commands.executeCommand("workbench.view.extension.numas.exam.answer");
    return true;
  } catch {
    return false;
  }
};

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(vscode.window.registerWebviewViewProvider(VIEW_ID, new AnswerProvider()));
  /*
   * 稍等一拍：工作区与视图容器要先建好，命令才能切过去。
   * 没切成功就再试一次 —— 前一次可能发生在视图注册之前。
   */
  const attempt = (remaining: number): void => {
    if (remaining <= 0) {
      return;
    }
    void switchLeftView().then((done) => {
      if (!done) {
        setTimeout(() => attempt(remaining - 1), 1200);
      }
    });
  };
  setTimeout(() => attempt(3), 800);
}
