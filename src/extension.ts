/**
 * 学生侧「作答」面板（`numas.exam.answer.view`）。
 *
 * <p>职责只有三件：**倒计时、题目列表、交卷**。
 * 与出题方的考试面板（考试信息 / 参考资料 / 发布考试）分开成两个扩展：
 * 两类角色看到的东西没有交集，混在一起会让彼此的界面互相污染。
 *
 * <p>显示条件：`.sumi/state.json` 的 `behaviors` 里有 `exam.enter`（进入工具在首次进入时写下）。
 * 出题方的工作区没有这条记录。
 */
import * as vscode from "vscode";

const VIEW_ID = "numas.exam.answer.view";
/** 工作区状态（进入工具写入，不进 git）。 */
const STATE_FILE = ".sumi/state.json";
/** 工作区角色（webapp 按 repo 生效权限写入，扩展只读）。 */
const ROLE_FILE = ".sumi/repo-job.json";
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
  readonly answered: boolean;
};

type GradeItem = {
  /** 卷面题号（frontmatter `grades` 的键）。 */
  readonly number: string;
  /** 得分；null = 老师还没给分。 */
  readonly score: number | null;
  /** 老师评语。 */
  readonly comment: string;
  /** 该题满分（frontmatter `scores`）；缺省 0。 */
  readonly max: number;
};

type ViewModel = {
  /** 是否处于作答工作区（没有会话文件时为 false）。 */
  readonly answering: boolean;
  /** 到时是否自动交卷；有管理权限的预览页为 false。 */
  readonly autoSubmit: boolean;
  /** 个人截止时间（epoch 毫秒）；null = 不限时。 */
  readonly deadlineAtMs: number | null;
  /** 当前分支（提交要 push 到它）。 */
  readonly branch: string;
  /** 是否在工程题 / 项目视图（URL 带题目段）。 */
  readonly inQuestion: boolean;
  readonly questions: readonly QuestionItem[];
  readonly refs: readonly string[];
  /** 试卷标题。 */
  readonly paperTitle: string;
  /** 老师写入的成绩；没有 grades 或还没评分时为空数组。 */
  readonly grades: readonly GradeItem[];
  /** 是否已经出分（任一题有分数或评语）。 */
  readonly graded: boolean;
  readonly gradeTotal: number;
  readonly gradeMax: number;
};

/**
 * 读工作区角色（`teacher` / `student`）；缺失或损坏返回 undefined。
 *
 * <p>角色由 webapp 在进入前按 repo 的生效权限查询后写入 `.sumi/repo-job.json`，
 * 是「当前这个人」的角色，不是仓里有没有答案推断出来的。工程题会切根，
 * 所以从当前根逐级向上找。
 */
const readPageMode = async (): Promise<string | undefined> => {
  let current = vscode.workspace.workspaceFolders?.[0]?.uri;
  for (let depth = 0; current !== undefined && depth < 6; depth += 1) {
    try {
      const bytes = await vscode.workspace.fs.readFile(
        vscode.Uri.joinPath(current, ".sumi", "settings.json"),
      );
      const data: unknown = JSON.parse(new TextDecoder("utf-8").decode(bytes));
      if (typeof data === "object" && data !== null) {
        const mode = (data as Record<string, unknown>)["numas.page.mode"];
        return typeof mode === "string" ? mode : undefined;
      }
      return undefined;
    } catch {
      /* 继续向上。 */
    }
    const parent = vscode.Uri.joinPath(current, "..");
    if (parent.toString() === current.toString()) break;
    current = parent;
  }
  return undefined;
};

const readWorkspaceRole = async (): Promise<"teacher" | "student" | undefined> => {
  let current = vscode.workspace.workspaceFolders?.[0]?.uri;
  for (let depth = 0; current !== undefined && depth < 6; depth += 1) {
    try {
      const bytes = await vscode.workspace.fs.readFile(
        vscode.Uri.joinPath(current, ...ROLE_FILE.split("/")),
      );
      const data: unknown = JSON.parse(new TextDecoder("utf-8").decode(bytes));
      if (typeof data === "object" && data !== null) {
        const role = (data as Record<string, unknown>)["role"];
        if (role === "teacher" || role === "student") {
          return role;
        }
      }
      return undefined;
    } catch {
      /* 当前层没有角色文件，继续向上。 */
    }
    const parent = vscode.Uri.joinPath(current, "..");
    if (parent.toString() === current.toString()) {
      break;
    }
    current = parent;
  }
  return undefined;
};

/**
 * 解析考试工作区根。
 *
 * <p>工程题会把 `vscode.workspace.workspaceFolders` 切到 `project/`，
 * 这时 `.sumi/state.json`、`workspace.conf`、提交工具都不在当前根下，
 * 直接读会得到「没有会话 → 面板消失 / 返回试卷空转」。
 * 从当前根向上找带会话文件的目录，最多 6 层。
 */
const resolveExamRoot = async (): Promise<vscode.Uri | undefined> => {
  let current = vscode.workspace.workspaceFolders?.[0]?.uri;
  for (let depth = 0; current !== undefined && depth < 6; depth += 1) {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.joinPath(current, ...STATE_FILE.split("/")));
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
  autoSubmit: true,
  deadlineAtMs: null,
  branch: "",
  inQuestion: false,
  questions: [],
  refs: [],
  paperTitle: "",
  grades: [],
  graded: false,
  gradeTotal: 0,
  gradeMax: 0,
};

export class AnswerProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private view: vscode.WebviewView | undefined;
  private timer: NodeJS.Timeout | undefined;
  private submitting = false;
  /** 是否已经主动把左侧切到作答面板；只切一次，之后尊重用户选择。 */
  /** 老师身份下是否已经把左栏切回考试面板。 */
  /** 最近一次解析到的试卷 URI：工程题切根 / 页面状态变化后仍能直接打开。 */
  private paperUri: vscode.Uri | undefined;

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
            message: `交卷失败：${
              error instanceof Error ? error.message : String(error)
            }`,
          });
        });
        return;
      }
      if (record.type === "openPaper") {
        void this.backToPaper();
        return;
      }
      if (record.type === "openRef" && typeof (message as { name?: unknown }).name === "string") {
        void this.openRef((message as { name: string }).name);
        return;
      }
      if (record.type === "reveal" && typeof (message as { number?: unknown }).number === "number") {
        void this.revealQuestion((message as { number: number }).number);
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

  private lastModelJson = "";

  private async refresh(): Promise<void> {
    if (this.view === undefined) {
      return;
    }
    const model = await this.load();
    /*
     * 模型没变就不重发：4 秒轮询 / 点题号触发的 activeEditor 变化
     * 不应该让左侧面板重新渲染（那正是闪烁的来源）。
     */
    const json = JSON.stringify(model);
    if (json === this.lastModelJson) {
      return;
    }
    this.lastModelJson = json;
    this.post({ type: "model", model });
  }

  /** 组装面板数据；没有会话文件说明不是作答工作区。 */
  private async load(): Promise<ViewModel> {
    /* 只认路由：不是 /answer 就直接不显示作答面板，角色完全不参与。 */
    if ((await readPageMode()) === "answer" ? false : true) {
      return EMPTY;
    }
    const folder = await resolveExamRoot();
    if (folder === undefined) {
      return EMPTY;
    }
    const session = await this.session(folder);
    if (session === undefined) {
      return EMPTY;
    }
    const conf = await this.read(vscode.Uri.joinPath(folder, ...CONF_FILE.split("/")));
    const paperPath = conf === undefined ? "" : paperPathOf(conf);
    if (paperPath.length > 0) {
      this.paperUri = vscode.Uri.joinPath(folder, ...paperPath.split("/"));
    }
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
    const frontmatter = paper === undefined ? "" : (/^---[\s\S]*?\n---/.exec(paper)?.[0] ?? "");
    const scores = parseScores(frontmatter);
    const rawGrades = parseGrades(frontmatter);
    const numbers = [...new Set([...scores.keys(), ...rawGrades.keys()])].sort(
      (left, right) => Number(left) - Number(right),
    );
    const grades: GradeItem[] = numbers.map((number) => ({
      number,
      score: rawGrades.get(number)?.score ?? null,
      comment: rawGrades.get(number)?.comment ?? "",
      max: scores.get(number) ?? 0,
    }));
    const graded = grades.some((item) => item.score !== null || item.comment.length > 0);
    return {
      answering: true,
      autoSubmit: await this.autoSubmit(folder),
      inQuestion,
      /* 解析不出来按不限时处理，避免卷面出现 NaN:NaN:NaN。 */
      deadlineAtMs:
        session.deadlineAt.length === 0 || !Number.isFinite(Date.parse(session.deadlineAt))
          ? null
          : Date.parse(session.deadlineAt),
      branch: await this.branch(folder),
      questions: paper === undefined ? [] : parseQuestions(paper),
      refs: await this.references(folder),
      paperTitle: paper === undefined ? "" : paperTitleOf(paper, paperPath),
      grades,
      graded,
      gradeTotal: grades.reduce((sum, item) => sum + (item.score ?? 0), 0),
      gradeMax: grades.reduce((sum, item) => sum + item.max, 0),
    };
  }

  /** 到时是否自动交卷：页面写 `.sumi/settings.json` 的 `numas.answer.autoSubmit`。 */
  private async autoSubmit(folder: vscode.Uri): Promise<boolean> {
    try {
      const raw = await this.read(vscode.Uri.joinPath(folder, ".sumi", "settings.json"));
      if (raw === undefined) return true;
      const data: unknown = JSON.parse(raw);
      if (typeof data === "object" && data !== null) {
        return (data as Record<string, unknown>)["numas.answer.autoSubmit"] !== false;
      }
    } catch {
      /* 读不到按自动交卷。 */
    }
    return true;
  }

  /** 参考资料：只列文件名，作答页只读。 */
  private async references(folder: vscode.Uri): Promise<string[]> {
    try {
      const entries = await vscode.workspace.fs.readDirectory(
        vscode.Uri.joinPath(folder, "references"),
      );
      return entries
        .filter(([, type]) => (type & vscode.FileType.File) !== 0)
        .map(([name]) => name)
        .sort((left, right) => left.localeCompare(right));
    } catch {
      return [];
    }
  }

  private async session(
    folder: vscode.Uri,
  ): Promise<{ firstEnteredAt: string; deadlineAt: string } | undefined> {
    const text = await this.read(vscode.Uri.joinPath(folder, ...STATE_FILE.split("/")));
    if (text === undefined) {
      return undefined;
    }
    try {
      const data: unknown = JSON.parse(text);
      if (typeof data !== "object" || data === null) {
        return undefined;
      }
      const behaviors = (data as Record<string, unknown>)["behaviors"];
      if (!Array.isArray(behaviors)) {
        return undefined;
      }
      const entry = behaviors.find(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null && item["event"] === "exam.enter",
      );
      if (entry === undefined) {
        return undefined;
      }
      const firstEnteredAt = typeof entry["timestamp"] === "string" ? entry["timestamp"] : "";
      if (firstEnteredAt.length === 0) {
        return undefined;
      }
      return {
        firstEnteredAt,
        deadlineAt: typeof entry["content"] === "string" ? entry["content"] : "",
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
   * 打开试卷并锚定到题目：先走 `backToPaper`（退出项目模式 / 聚焦卷面），
   * 再让试卷扩展滚到对应题卡。只发 reveal 不打开的话，卷面在后台时用户看不到。
   */
  /** 打开参考资料（只读）：统一走编辑器，不弹终端。 */
  private async openRef(name: string): Promise<void> {
    const folder = await resolveExamRoot();
    if (folder === undefined || name.trim().length === 0) return;
    const uri = vscode.Uri.joinPath(folder, "references", name.trim());
    try {
      await vscode.commands.executeCommand("vscode.open", uri, { preview: false });
    } catch {
      /* 文件已被删：面板下一次刷新会消失。 */
    }
  }

  private async revealQuestion(number: number): Promise<void> {
    /*
     * 只发 reveal：不 exitProject、不切左栏。点题号是纯定位动作，
     * 任何打开/恢复动作都会让左栏与编辑器整块重建，表现就是一闪一闪。
     */
    try {
      const revealed = await vscode.commands.executeCommand<boolean>(
        "numas.paper.reveal",
        String(number),
      );
      if (revealed === true) {
        return;
      }
    } catch {
      /* 试卷扩展未就绪：走下面的兜底。 */
    }
    /* 卷面还没就绪时只把它打开，不退出项目、不动左栏。 */
    const folder = await resolveExamRoot();
    if (folder === undefined) {
      return;
    }
    const conf = await this.read(vscode.Uri.joinPath(folder, ...CONF_FILE.split("/")));
    const paperPath = conf === undefined ? "" : paperPathOf(conf);
    if (paperPath.length === 0) {
      return;
    }
    const uri = vscode.Uri.joinPath(folder, ...paperPath.split("/"));
    try {
      await vscode.commands.executeCommand("numas.paper.open", uri.toString());
      await vscode.commands.executeCommand("numas.paper.reveal", String(number));
    } catch {
      /* 打开失败也不动左栏。 */
    }
  }

  /**
   * 回到试卷：工程题打开项目文件后，卷面页签会被挤到后台。
   *
   * <p>按 `workspace.conf` 的 `content:` 找到当前试卷，调试卷扩展的
   * `numas.paper.open`（与 webapp / 其它扩展同一入口），把卷面重新拉到前台。
   */
  private async backToPaper(): Promise<void> {
    const folder = await resolveExamRoot();
    let uri = this.paperUri;
    if (uri === undefined && folder !== undefined) {
      const conf = await this.read(vscode.Uri.joinPath(folder, ...CONF_FILE.split("/")));
      const paperPath = conf === undefined ? "" : paperPathOf(conf);
      if (paperPath.length > 0) {
        uri = vscode.Uri.joinPath(folder, ...paperPath.split("/"));
      }
    }
    if (uri === undefined) {
      return;
    }
    try {
      /*
       * 先退出工程题的项目模式：试卷扩展会把资源管理器根目录、左栏视图和卷面
       * 一起恢复；再打开试卷，把卷面标签页拉到前台。
       */
      await vscode.commands.executeCommand("numas.paper.exitProject").then(undefined, () => undefined);
      /*
       * 先走 paper.open 复用已打开面板；只有它明确失败时才 openWith，
       * 避免同一份试卷被重新拉起、webview 整块重建。
       */
      const opened = await vscode.commands
        .executeCommand<boolean>("numas.paper.open", uri.toString())
        .then((value) => value === true, () => false);
      if (!opened) {
        await vscode.commands
          .executeCommand("vscode.openWith", uri, "numas.paper", { preview: false })
          .then(undefined, () => undefined);
      }
      /* 中间编辑区没标签时 webapp 会收成 0；打开后再显式聚焦，确保卷面可见。 */
      await vscode.commands
        .executeCommand("editor.focusActiveEditorGroup")
        .then(undefined, () => undefined);
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
    this.post({ type: "submitProgress", state: "running", message: "正在交卷…" });
    try {
      const stateUri = vscode.Uri.joinPath(folder, ...SUBMIT_STATE_PATH.split("/"));
      await vscode.workspace.fs.delete(stateUri, { useTrash: false }).then(undefined, () => undefined);

      const command = `node ${SUBMIT_TOOL_PATH}`;
      /* 自动提交是后台任务：创建 PTY 执行，不弹终端 widget。 */
      await vscode.commands.executeCommand("numas.ui.background.run", {
        text: command,
        cwd: folder.fsPath,
        name: "交卷",
      });

      const outcome = await this.waitForSubmit(stateUri);
      if (!outcome.ok) {
        throw new Error(outcome.error.length > 0 ? outcome.error : "交卷失败：没有收到结果，请稍后重试");
      }
      /* 对用户只说「已交卷」：分支、提交等实现细节不进产品文案。 */
      this.post({ type: "submitProgress", state: "done", message: "已交卷" });
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
/* 试卷分组栏：左标题、右「打开」，与 exam-panel 同款。 */
.tabs{display:flex;gap:4px;margin:10px 10px 0;padding:3px;border-radius:11px;background:color-mix(in srgb,#2f2a26 7%,transparent)}
.tab{flex:1;height:30px;border:0;border-radius:8px;background:transparent;color:#6b6158;font:inherit;font-size:12px;font-weight:600;cursor:pointer}
.tab.is-active{background:#fffdf9;color:var(--accent);box-shadow:0 1px 3px rgba(90,55,20,.12)}
.paper-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 10px;margin:0 0 6px}
.paper-head__title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--accent);font-size:13px;font-weight:600}
.paper-head__open{flex:none;padding:2px 0;border:0;background:none;color:var(--accent);font:inherit;font-size:12px;font-weight:600;cursor:pointer}
.paper-head__open:hover{text-decoration:underline;text-underline-offset:3px}
/* 题号：48px 方形按钮网格，与 exam-panel 一致。 */
.q-grid{display:grid;grid-template-columns:repeat(4,48px);justify-content:space-between;gap:8px;padding:0 10px}
.q-card{position:relative;width:48px;height:48px;border:0;border-radius:10px;background:var(--accent-soft);color:var(--accent);font:inherit;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .16s cubic-bezier(.2,.8,.2,1),background-color .15s ease,color .15s ease}
.q-card:hover{background:var(--accent);color:#fff;transform:translateY(-1px) scale(1)}
.q-card:active{background:var(--accent);color:#fff;transform:translateY(0) scale(.92);transition-duration:.08s}
.q-card:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.q-card.is-answered{background:color-mix(in srgb,#1a7f37 14%,transparent);color:#1a7f37}
.q-card.is-answered:hover{background:#1a7f37;color:#fff}
.empty{padding:10px;color:var(--faint);font-size:12px;line-height:1.6}
/* 与 exam-panel 的 foot 同款：4px 上边距、12px 下边距、无 1px 分隔线。 */
.foot{flex:none;display:flex;flex-direction:column;gap:6px;padding:6px 12px 14px}
/* 与 exam-panel 的「发布考试」同款：42px / 14px 圆角 / 实色 accent / 14px 600。 */
.foot-btn{width:100%;height:36px;border:0;border-radius:10px;background:var(--accent);color:#fff;font:inherit;font-size:13px;font-weight:400;letter-spacing:.02em;cursor:pointer;transition:transform .16s cubic-bezier(.2,.8,.2,1),filter .15s ease}
.foot-btn:hover:not(:disabled){filter:brightness(.94)}
.foot-btn:active:not(:disabled){transform:scale(.95);filter:brightness(.88);transition-duration:.08s}
.foot-btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.foot-btn:disabled{cursor:default;filter:none;opacity:.6;transform:none}
.submit-status{margin:0;font-size:11px;line-height:1.45;color:var(--faint);word-break:break-word}
.submit-status.is-running{color:var(--accent)}
.submit-status.is-error{color:#b42318}
.submit-status[hidden]{display:none}
/* 成绩：老师阅卷后写进 .paper frontmatter，学生在这里看分数与评语。 */
.grade-item{margin:0 10px;padding:7px 0;border-top:1px solid var(--line)}
.grade-item:first-child{border-top:0}
.grade-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font-size:12px;color:var(--muted)}
.grade-score{color:var(--accent);font-weight:600;font-variant-numeric:tabular-nums}
.grade-comment{margin-top:2px;font-size:12px;line-height:1.5;color:#2f2a26;word-break:break-word}
.grade-total{color:var(--accent);font-size:14px;font-weight:600;font-variant-numeric:tabular-nums}
.hidden{display:none !important}

/* 全局：不显示滚动条（内容仍可滚动）。 */
*{scrollbar-width:none!important;-ms-overflow-style:none!important}
*::-webkit-scrollbar{width:0!important;height:0!important;display:none!important}
</style></head><body>
<div class="panel">
  <div class="body">
    <section id="pane-paper">
      <div class="group" id="time-group">
        <div class="group-title">剩余时间</div>
        <div class="rows">
          <div class="row"><span class="row-value"><span class="mono" id="countdown">--:--</span></span></div>
        </div>
      </div>
      <div class="group hidden" id="grade-group">
        <div class="group-title">成绩</div>
        <div class="rows">
          <div class="row"><span class="row-label">总分</span><span class="row-value"><span class="grade-total" id="grade-total">—</span></span></div>
        </div>
        <div id="grade-list"></div>
      </div>
      <div class="group">
        <div class="paper-head">
          <span class="paper-head__title" id="q-title">试卷</span>
          <button class="paper-head__open" id="open-paper" type="button">查看</button>
        </div>
        <div class="q-grid" id="q-list"></div>
        <div class="empty hidden" id="q-empty">还没有题目</div>
      </div>
    </section>
  </div>
  <div class="foot hidden" id="foot">
    <button class="foot-btn" id="submit-btn" type="button">提交作答</button>
  </div>
</div>
<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
let model = null;
let gridSignature = "";
let timer = null;
let autoSubmitted = false;
const $ = (id) => document.getElementById(id);
const pad2 = (n) => (n < 10 ? "0" + n : String(n));
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function stopTimer(){ if (timer !== null) { clearInterval(timer); timer = null; } }

function renderCountdown(){
  const el = $("countdown");
  if (!el || !model || !model.answering) return;
  if (model.deadlineAtMs === null) { el.textContent = "不限时"; el.classList.remove("is-over"); return; }
  const left = model.deadlineAtMs - Date.now();
  if (left <= 0) {
    el.textContent = "已到时";
    el.classList.add("is-over");
    if (!autoSubmitted && model.autoSubmit !== false) {
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

function renderGrades(){
  const group = $("grade-group");
  if (!group) return;
  const on = !!model && model.answering && model.graded === true;
  group.classList.toggle("hidden", !on);
  if (!on) return;
  $("grade-total").textContent = (model.gradeTotal || 0) + " / " + (model.gradeMax || 0);
  const list = $("grade-list");
  list.innerHTML = (model.grades || []).map((item) => {
    const score = item.score === null ? "未评分" : item.score + " / " + item.max;
    const comment = item.comment ? '<div class="grade-comment">' + esc(item.comment) + "</div>" : "";
    return '<div class="grade-item"><div class="grade-head"><span>第 ' + esc(item.number) + ' 题</span><span class="grade-score">' + esc(score) + "</span></div>" + comment + "</div>";
  }).join("");
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
  $("submit-btn").classList.toggle("hidden", !on || inQuestion);
  const title = $("q-title");
  if (title) title.textContent = (model && model.paperTitle) || "试卷";
  const list = $("q-list");
  const empty = $("q-empty");
  /*
   * 倒计时先跑起来：试卷还没解析出来（题目为空）时也要计时，
   * 不能等题目出现才开始算 —— 那会让「已进入」的前几秒不计入考试。
   */
  if (on) startTimer();
  renderGrades();
  const items = (model && model.questions) || [];
  /* 题号网格只在内容变化时重建：4 秒轮询 / 点击题号触发刷新时不再整块闪烁。 */
  const signature = (on ? "1" : "0") + "|" + items
    .map((q) => q.number + ":" + q.title + ":" + (q.answered ? "1" : "0"))
    .join("||");
  if (!on || items.length === 0) {
    if (gridSignature !== signature) {
      gridSignature = signature;
      list.innerHTML = "";
    }
    empty.classList.toggle("hidden", !on);
    return;
  }
  empty.classList.add("hidden");
  if (gridSignature !== signature) {
    gridSignature = signature;
    list.innerHTML = items
      .map((q) => '<button class="q-card' + (q.answered ? " is-answered" : "") + '" type="button" data-number="' + q.number + '" title="' + esc(q.title) + '">' + q.number + "</button>")
      .join("");
  }
  startTimer();
}

function setSubmit(state, message){
  /* 提交状态只在按钮内变化：不另起状态行。 */
  const btn = $("submit-btn");
  if (!btn) return;
  if (state === "running") { btn.disabled = true; btn.dataset.state = "running"; btn.textContent = "正在交卷…"; return; }
  if (state === "failed") { btn.disabled = false; btn.dataset.state = "failed"; btn.textContent = "交卷失败，重试"; return; }
  if (state === "done") { btn.disabled = true; btn.dataset.state = "done"; btn.textContent = message || "已交卷"; return; }
  btn.disabled = false; btn.dataset.state = ""; btn.textContent = "提交作答";
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

$("open-paper").onclick = () => vscode.postMessage({ type: "openPaper" });

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!target || !target.closest) return;
  const item = target.closest(".q-card");
  if (item) {
    vscode.postMessage({ type: "reveal", number: Number(item.dataset.number) });
    return;
  }
  if (target.closest("#open-paper")) {
    vscode.postMessage({ type: "openPaper" });
  }
});

$("submit-btn").onclick = () => { const btn = $("submit-btn"); if (!btn.disabled) { btn.disabled = true; vscode.postMessage({ type: "submit", auto: false }); } };
render();
vscode.postMessage({ type: "ready" });
</script></body></html>`;
  }
}

/** `workspace.conf` 里第一篇试卷的相对路径。 */
const paperPathOf = (conf: string): string => {
  /*
   * 文件名可能带空格（`Python 工程题.paper`）。旧正则只取到第一个空白，
   * 会把路径截成 `Python`，导致试卷读不到、题目列表为空。
   * 这里取整行，去掉行尾注释与成对引号。
   */
  const match = /^\s*content:\s*(.+?)\s*$/m.exec(conf);
  if (match === null) {
    return "";
  }
  return (match[1] ?? "")
    .replace(/\s+#.*$/, "")
    .trim()
    .replace(/^["']|["']$/g, "");
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

/** 读 frontmatter 里的题分映射（`scores: { "1": 2 }` 的 YAML 子集）。 */
const parseScores = (frontmatter: string): Map<string, number> => {
  const scores = new Map<string, number>();
  let inScores = false;
  for (const line of frontmatter.split(/\r?\n/)) {
    if (/^scores:\s*$/.test(line)) {
      inScores = true;
      continue;
    }
    if (!inScores) continue;
    if (!/^\s+\S/.test(line)) {
      inScores = false;
      continue;
    }
    const match = /^\s*"?([^":]+)"?\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*$/.exec(line);
    if (match !== null) scores.set((match[1] ?? "").trim(), Number(match[2]));
  }
  return scores;
};

/** 读老师写入的成绩（`grades` 下每题 score / comments，唯一格式）。 */
const parseGrades = (frontmatter: string): Map<string, { score: number | null; comment: string }> => {
  const grades = new Map<string, { score: number | null; comment: string }>();
  let inGrades = false;
  let current = "";
  for (const line of frontmatter.split(/\r?\n/)) {
    if (/^grades:\s*$/.test(line)) {
      inGrades = true;
      continue;
    }
    if (!inGrades) continue;
    if (!/^\s/.test(line)) {
      inGrades = false;
      continue;
    }
    const key = /^\s{2}"?([^":]+)"?:\s*$/.exec(line);
    if (key !== null) {
      current = (key[1] ?? "").trim();
      grades.set(current, { score: null, comment: "" });
      continue;
    }
    const field = /^\s{4}(score|comments):\s*(.*)$/.exec(line);
    if (field === null || current.length === 0) continue;
    const value = grades.get(current);
    if (value === undefined) continue;
    if (field[1] === "score") {
      const parsed = Number(field[2]);
      value.score = Number.isFinite(parsed) ? parsed : null;
    } else {
      value.comment = unquote(field[2] ?? "");
    }
  }
  return grades;
};

/** 去掉 YAML 双引号并按需转义还原。 */
const unquote = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed) as string;
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
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
    const contentStart = match.index + match[0].length;
    const close = paper.indexOf("\n:::", contentStart);
    const body = paper.slice(contentStart, close < 0 ? paper.length : close);
    items.push({
      number,
      title: title.length > 0 ? title : `第 ${String(number)} 题`,
      answered: body.trim().length > 0,
    });
    previousIndex = contentStart;
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

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(vscode.window.registerWebviewViewProvider(VIEW_ID, new AnswerProvider()));
}
