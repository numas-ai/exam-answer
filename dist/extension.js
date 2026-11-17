"use strict";var T=Object.create;var p=Object.defineProperty;var $=Object.getOwnPropertyDescriptor;var U=Object.getOwnPropertyNames;var C=Object.getPrototypeOf,j=Object.prototype.hasOwnProperty;var d=(i,e)=>p(i,"name",{value:e,configurable:!0});var E=(i,e)=>{for(var t in e)p(i,t,{get:e[t],enumerable:!0})},x=(i,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let n of U(e))!j.call(i,n)&&n!==t&&p(i,n,{get:()=>e[n],enumerable:!(s=$(e,n))||s.enumerable});return i};var I=(i,e,t)=>(t=i!=null?T(C(i)):{},x(e||!i||!i.__esModule?p(t,"default",{value:i,enumerable:!0}):t,i)),L=i=>x(p({},"__esModule",{value:!0}),i);var B={};E(B,{AnswerProvider:()=>h,activate:()=>H});module.exports=L(B);var o=I(require("vscode"));var q="numas.exam.answer.view",P=".sumi/state.json",y=".sumi/workspace.conf",v=".opencode/tools/repo-submit.mjs",A=".sumi/repo-submit.json",_=500,N=180*1e3,z=4e3,g=d(async()=>{let i=o.workspace.workspaceFolders?.[0]?.uri;for(let e=0;i!==void 0&&e<6;e+=1){try{return await o.workspace.fs.stat(o.Uri.joinPath(i,...P.split("/"))),i}catch{}let t=o.Uri.joinPath(i,"..");if(t.toString()===i.toString())break;i=t}},"resolveExamRoot"),k={answering:!1,deadlineAtMs:null,branch:"",inQuestion:!1,questions:[],paperTitle:"",grades:[],graded:!1,gradeTotal:0,gradeMax:0},h=class{static{d(this,"AnswerProvider")}view;timer;submitting=!1;switched=!1;paperUri;dispose(){this.timer!==void 0&&(clearInterval(this.timer),this.timer=void 0)}resolveWebviewView(e){this.timer!==void 0&&(clearInterval(this.timer),this.timer=void 0),this.switched=!1,this.view=e,e.onDidDispose(()=>{this.view===e&&(this.view=void 0),this.timer!==void 0&&(clearInterval(this.timer),this.timer=void 0)}),e.webview.options={enableScripts:!0},e.webview.html=this.html(),e.webview.onDidReceiveMessage(s=>{if(typeof s!="object"||s===null)return;let n=s;if(n.type==="ready"){this.refresh();return}if(n.type==="submit"){this.submit(n.auto===!0).catch(r=>{this.post({type:"submitProgress",state:"failed",message:`${n.auto===!0?"\u81EA\u52A8\u63D0\u4EA4\u5931\u8D25":"\u63D0\u4EA4\u5931\u8D25"}\uFF1A${r instanceof Error?r.message:String(r)}`})});return}n.type==="reveal"&&typeof s.number=="number"&&o.commands.executeCommand("numas.paper.reveal",String(s.number))}),this.timer=setInterval(()=>void this.refresh(),z);let t=o.window.onDidChangeActiveTextEditor(()=>void this.refresh());e.onDidDispose(()=>t.dispose()),this.refresh()}async read(e){try{return new TextDecoder("utf-8").decode(await o.workspace.fs.readFile(e))}catch{return}}async exists(e){return await this.read(e)!==void 0}post(e){let t=this.view?.webview;t?.postMessage(e)}async refresh(){if(this.view===void 0)return;let e=await this.load();if(this.post({type:"model",model:e}),e.answering&&!this.switched){this.switched=!0;try{await o.commands.executeCommand("workbench.view.extension.numas.exam.answer")}catch{this.switched=!1}}}async load(){let e=await g();if(e===void 0)return k;let t=await this.session(e);if(t===void 0)return k;let s=await this.read(o.Uri.joinPath(e,...y.split("/"))),n=s===void 0?"":M(s);n.length>0&&(this.paperUri=o.Uri.joinPath(e,...n.split("/")));let r=n.length===0?void 0:await this.read(o.Uri.joinPath(e,...n.split("/"))),a=o.window.activeTextEditor?.document.uri,l=a!==void 0&&a.scheme==="file"&&a.toString()!==e.toString()&&a.fsPath.startsWith(`${e.fsPath}/`)&&!/\.paper$/i.test(a.fsPath),u=r===void 0?"":/^---[\s\S]*?\n---/.exec(r)?.[0]??"",w=O(u),b=R(u),f=[...new Set([...w.keys(),...b.keys()])].sort((c,m)=>Number(c)-Number(m)).map(c=>({number:c,score:b.get(c)?.score??null,comment:b.get(c)?.comment??"",max:w.get(c)??0})),S=f.some(c=>c.score!==null||c.comment.length>0);return{answering:!0,inQuestion:l,deadlineAtMs:t.deadlineAt.length===0||!Number.isFinite(Date.parse(t.deadlineAt))?null:Date.parse(t.deadlineAt),branch:await this.branch(e),questions:r===void 0?[]:Q(r),paperTitle:r===void 0?"":D(r,n),grades:f,graded:S,gradeTotal:f.reduce((c,m)=>c+(m.score??0),0),gradeMax:f.reduce((c,m)=>c+m.max,0)}}async session(e){let t=await this.read(o.Uri.joinPath(e,...P.split("/")));if(t!==void 0)try{let s=JSON.parse(t);if(typeof s!="object"||s===null)return;let n=s.behaviors;if(!Array.isArray(n))return;let r=n.find(l=>typeof l=="object"&&l!==null&&l.event==="exam.enter");if(r===void 0)return;let a=typeof r.timestamp=="string"?r.timestamp:"";return a.length===0?void 0:{firstEnteredAt:a,deadlineAt:typeof r.content=="string"?r.content:""}}catch{return}}async branch(e){let t=await this.read(o.Uri.joinPath(e,".git","HEAD"));if(t===void 0)return"";let s=/^ref:\s*refs\/heads\/(.+)\s*$/m.exec(t);return s===null?"":(s[1]??"").trim()}async revealQuestion(e){await this.backToPaper();try{await o.commands.executeCommand("numas.paper.reveal",String(e))}catch{}}async backToPaper(){let e=await g(),t=this.paperUri;if(t===void 0&&e!==void 0){let s=await this.read(o.Uri.joinPath(e,...y.split("/"))),n=s===void 0?"":M(s);n.length>0&&(t=o.Uri.joinPath(e,...n.split("/")))}if(t!==void 0)try{await o.commands.executeCommand("numas.paper.exitProject").then(void 0,()=>{}),await o.commands.executeCommand("numas.paper.open",t.toString()),await o.commands.executeCommand("editor.focusActiveEditorGroup").then(void 0,()=>{})}catch(s){o.window.showWarningMessage(`\u6253\u5F00\u8BD5\u5377\u5931\u8D25\uFF1A${s instanceof Error?s.message:String(s)}`)}}async submit(e){if(this.submitting)return;let t=await g();if(t===void 0)throw new Error("\u5F53\u524D\u5DE5\u4F5C\u533A\u4E0D\u53EF\u7528");if(!await this.exists(o.Uri.joinPath(t,...v.split("/"))))throw new Error(`\u5DE5\u4F5C\u533A\u91CC\u6CA1\u6709\u63D0\u4EA4\u5DE5\u5177\uFF08${v}\uFF09`);this.submitting=!0,this.post({type:"submitProgress",state:"running",message:e?"\u6B63\u5728\u81EA\u52A8\u63D0\u4EA4\u2026":"\u6B63\u5728\u63D0\u4EA4\u4F5C\u7B54\u2026"});try{let s=o.Uri.joinPath(t,...A.split("/"));await o.workspace.fs.delete(s,{useTrash:!1}).then(void 0,()=>{});let n=`node ${v}`;try{await o.commands.executeCommand("numas.ui.terminal.run",{text:n,cwd:t.fsPath})}catch{await o.commands.executeCommand("numas.ui.terminal.run",{text:`cd ${JSON.stringify(t.fsPath)} && ${n}`})}let r=await this.waitForSubmit(s);if(!r.ok)throw new Error(r.error.length>0?r.error:"\u63D0\u4EA4\u5931\u8D25\uFF1A\u7EC8\u7AEF\u5DE5\u5177\u6CA1\u6709\u7ED9\u51FA\u539F\u56E0");let a=r.branch.length>0?`\u5DF2\u63D0\u4EA4\u5230 ${r.branch}`:"\u5DF2\u63D0\u4EA4";this.post({type:"submitProgress",state:"done",message:a}),o.window.showInformationMessage(a),await this.refresh()}finally{this.submitting=!1}}async waitForSubmit(e){let t=Date.now()+N;for(;Date.now()<t;){await new Promise(a=>setTimeout(a,_));let s=await this.read(e);if(s===void 0||s.trim().length===0)continue;let n;try{n=JSON.parse(s)}catch{continue}if(typeof n!="object"||n===null)continue;let r=n;if(r.ok===!0)return{ok:!0,branch:typeof r.branch=="string"?r.branch:""};if(r.ok===!1)return{ok:!1,error:typeof r.error=="string"?r.error:""}}return{ok:!1,error:"\u63D0\u4EA4\u8D85\u65F6\uFF1A\u7EC8\u7AEF\u5DE5\u5177\u53EF\u80FD\u4ECD\u5728\u8FD0\u884C\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5"}}html(){let e=String(Date.now());return`<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${e}';" />
<style>
/*
 * \u53EA\u7528\u4EAE\u8272\uFF1A\u4F5C\u7B54\u9762\u677F\u4E0D\u8DDF\u968F\u7CFB\u7EDF\u6DF1\u6D45\u8272\u3002
 * \u989C\u8272\u5199\u6B7B\u6210\u6696\u767D\u4E00\u5957\uFF0C\u4E0D\u8BFB --vscode-* \u53D8\u91CF \u2014\u2014 \u90A3\u5957\u4F1A\u8DDF\u7740\u5BBF\u4E3B\u4E3B\u9898\u53D8\u3002
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
/* \u8BD5\u5377\u5206\u7EC4\u680F\uFF1A\u5DE6\u6807\u9898\u3001\u53F3\u300C\u6253\u5F00\u300D\uFF0C\u4E0E exam-panel \u540C\u6B3E\u3002 */
.paper-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 10px;margin:0 0 6px}
.paper-head__title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--accent);font-size:13px;font-weight:600}
.paper-head__open{flex:none;padding:2px 0;border:0;background:none;color:var(--accent);font:inherit;font-size:12px;font-weight:600;cursor:pointer}
.paper-head__open:hover{text-decoration:underline;text-underline-offset:3px}
/* \u9898\u53F7\uFF1A48px \u65B9\u5F62\u6309\u94AE\u7F51\u683C\uFF0C\u4E0E exam-panel \u4E00\u81F4\u3002 */
.q-grid{display:grid;grid-template-columns:repeat(4,48px);justify-content:space-between;gap:8px;padding:0 10px}
.q-card{width:48px;height:48px;border:0;border-radius:10px;background:var(--accent-soft);color:var(--accent);font:inherit;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .16s cubic-bezier(.2,.8,.2,1),background-color .15s ease,color .15s ease}
.q-card:hover{background:var(--accent);color:#fff;transform:translateY(-1px) scale(1)}
.q-card:active{background:var(--accent);color:#fff;transform:translateY(0) scale(.92);transition-duration:.08s}
.q-card:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.empty{padding:10px;color:var(--faint);font-size:12px;line-height:1.6}
/* \u4E0E exam-panel \u7684 foot \u540C\u6B3E\uFF1A4px \u4E0A\u8FB9\u8DDD\u300112px \u4E0B\u8FB9\u8DDD\u3001\u65E0 1px \u5206\u9694\u7EBF\u3002 */
.foot{flex:none;display:flex;flex-direction:column;gap:6px;padding:4px 12px 12px}
/* \u4E0E exam-panel \u7684\u300C\u53D1\u5E03\u8003\u8BD5\u300D\u540C\u4E00\u5957\u6309\u94AE\uFF1A32px / 9px \u5706\u89D2 / \u5B9E\u8272 accent / 600\u3002 */
.foot-btn{width:100%;height:32px;border:0;border-radius:9px;background:var(--accent);color:#fff;font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:transform .16s cubic-bezier(.2,.8,.2,1),filter .15s ease}
.foot-btn:hover:not(:disabled){filter:brightness(.94)}
.foot-btn:active:not(:disabled){transform:scale(.95);filter:brightness(.88);transition-duration:.08s}
.foot-btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.foot-btn:disabled{cursor:default;filter:none;opacity:.6;transform:none}
.submit-status{margin:0;font-size:11px;line-height:1.45;color:var(--faint);word-break:break-word}
.submit-status.is-running{color:var(--accent)}
.submit-status.is-error{color:#b42318}
.submit-status[hidden]{display:none}
/* \u6210\u7EE9\uFF1A\u8001\u5E08\u9605\u5377\u540E\u5199\u8FDB .paper frontmatter\uFF0C\u5B66\u751F\u5728\u8FD9\u91CC\u770B\u5206\u6570\u4E0E\u8BC4\u8BED\u3002 */
.grade-item{margin:0 10px;padding:7px 0;border-top:1px solid var(--line)}
.grade-item:first-child{border-top:0}
.grade-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font-size:12px;color:var(--muted)}
.grade-score{color:var(--accent);font-weight:600;font-variant-numeric:tabular-nums}
.grade-comment{margin-top:2px;font-size:12px;line-height:1.5;color:#2f2a26;word-break:break-word}
.grade-total{color:var(--accent);font-size:14px;font-weight:600;font-variant-numeric:tabular-nums}
.hidden{display:none !important}
</style></head><body>
<div class="panel">
  <div class="body">
    <div class="group" id="time-group">
      <div class="group-title">\u5269\u4F59\u65F6\u95F4</div>
      <div class="rows">
        <div class="row"><span class="row-value"><span class="mono" id="countdown">--:--</span></span></div>
      </div>
    </div>
    <div class="group hidden" id="grade-group">
      <div class="group-title">\u6210\u7EE9</div>
      <div class="rows">
        <div class="row"><span class="row-label">\u603B\u5206</span><span class="row-value"><span class="grade-total" id="grade-total">\u2014</span></span></div>
      </div>
      <div id="grade-list"></div>
    </div>
    <div class="group">
      <div class="paper-head">
        <span class="paper-head__title" id="q-title">\u9898\u76EE</span>
        <button class="paper-head__open" id="open-paper" type="button">\u6253\u5F00</button>
      </div>
      <div class="q-grid" id="q-list"></div>
      <div class="empty hidden" id="q-empty">\u8FD8\u6CA1\u6709\u9898\u76EE</div>
    </div>
  </div>
  <div class="foot hidden" id="foot">
    <button class="foot-btn" id="submit-btn" type="button">\u63D0\u4EA4\u4F5C\u7B54</button>
    <p class="submit-status" id="submit-status" hidden></p>
  </div>
</div>
<script nonce="${e}">
const vscode = acquireVsCodeApi();
let model = null;
let timer = null;
let autoSubmitted = false;
const $ = (id) => document.getElementById(id);
const pad2 = (n) => (n < 10 ? "0" + n : String(n));
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function stopTimer(){ if (timer !== null) { clearInterval(timer); timer = null; } }

function renderCountdown(){
  const el = $("countdown");
  if (!el || !model || !model.answering) return;
  if (model.deadlineAtMs === null) { el.textContent = "\u4E0D\u9650\u65F6"; el.classList.remove("is-over"); return; }
  const left = model.deadlineAtMs - Date.now();
  if (left <= 0) {
    el.textContent = "\u5DF2\u5230\u65F6";
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

function renderGrades(){
  const group = $("grade-group");
  if (!group) return;
  const on = !!model && model.answering && model.graded === true;
  group.classList.toggle("hidden", !on);
  if (!on) return;
  $("grade-total").textContent = (model.gradeTotal || 0) + " / " + (model.gradeMax || 0);
  const list = $("grade-list");
  list.innerHTML = (model.grades || []).map((item) => {
    const score = item.score === null ? "\u672A\u8BC4\u5206" : item.score + " / " + item.max;
    const comment = item.comment ? '<div class="grade-comment">' + esc(item.comment) + "</div>" : "";
    return '<div class="grade-item"><div class="grade-head"><span>\u7B2C ' + esc(item.number) + ' \u9898</span><span class="grade-score">' + esc(score) + "</span></div>" + comment + "</div>";
  }).join("");
}

function render(){
  const on = !!model && model.answering;
  const inQuestion = on && model.inQuestion === true;
  $("foot").classList.toggle("hidden", !on);
  $("time-group").classList.toggle("hidden", !on);
  /*
   * \u5377\u9762\uFF08URL \u4E0D\u5E26\u9898\u76EE\uFF09\u53EA\u7ED9\u300C\u63D0\u4EA4\u4F5C\u7B54\u300D\uFF1B\u8FDB\u5165\u9898\u76EE\uFF08URL \u5E26\u9898\u76EE\u6BB5\uFF09\u53EA\u7ED9\u300C\u8FD4\u56DE\u8BD5\u5377\u300D\u3002
   * \u4E24\u4E2A\u52A8\u4F5C\u4E0D\u5728\u540C\u4E00\u5C4F\u51FA\u73B0\uFF0C\u907F\u514D\u5B66\u751F\u6CA1\u4F5C\u7B54\u5C31\u4EA4\u5377 / \u5728\u9898\u76EE\u91CC\u627E\u4E0D\u5230\u56DE\u5377\u5165\u53E3\u3002
   */
  $("submit-btn").classList.toggle("hidden", !on || inQuestion);
  $("submit-status").classList.toggle("hidden", inQuestion || $("submit-status").dataset.hidden === "1");
  const list = $("q-list");
  const empty = $("q-empty");
  const title = $("q-title");
  if (on && model.paperTitle) title.textContent = model.paperTitle;
  /*
   * \u5012\u8BA1\u65F6\u5148\u8DD1\u8D77\u6765\uFF1A\u8BD5\u5377\u8FD8\u6CA1\u89E3\u6790\u51FA\u6765\uFF08\u9898\u76EE\u4E3A\u7A7A\uFF09\u65F6\u4E5F\u8981\u8BA1\u65F6\uFF0C
   * \u4E0D\u80FD\u7B49\u9898\u76EE\u51FA\u73B0\u624D\u5F00\u59CB\u7B97 \u2014\u2014 \u90A3\u4F1A\u8BA9\u300C\u5DF2\u8FDB\u5165\u300D\u7684\u524D\u51E0\u79D2\u4E0D\u8BA1\u5165\u8003\u8BD5\u3002
   */
  if (on) startTimer();
  renderGrades();
  const items = (model && model.questions) || [];
  if (!on || items.length === 0) {
    list.innerHTML = "";
    empty.classList.toggle("hidden", !on);
    return;
  }
  empty.classList.add("hidden");
  list.innerHTML = items
    .map((q) => '<button class="q-card" type="button" data-number="' + q.number + '" title="' + esc(q.title) + '">' + q.number + "</button>")
    .join("");
  startTimer();
}

function setSubmit(state, message){
  const status = $("submit-status"), btn = $("submit-btn");
  if (!status || !btn) return;
  if (state === "running") { btn.disabled = true; status.dataset.hidden = "0"; status.hidden = false; status.className = "submit-status is-running"; status.textContent = message || "\u6B63\u5728\u63D0\u4EA4\u4F5C\u7B54\u2026"; return; }
  if (state === "failed") { btn.disabled = false; status.dataset.hidden = "0"; status.hidden = false; status.className = "submit-status is-error"; status.textContent = message || "\u63D0\u4EA4\u5931\u8D25"; return; }
  if (state === "done") { btn.disabled = true; status.dataset.hidden = "0"; status.hidden = false; status.className = "submit-status"; status.textContent = message || "\u5DF2\u63D0\u4EA4"; return; }
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
<\/script></body></html>`}},M=d(i=>{let e=/^\s*content:\s*(?:"([^"]+)"|'([^']+)'|([^\s#]+))\s*$/m.exec(i);return(e?.[1]??e?.[2]??e?.[3]??"").trim()},"paperPathOf"),D=d((i,e)=>{let t=/^---[\s\S]*?\n---/.exec(i)?.[0]??"",s=/^title:\s*(?:"([^"]+)"|'([^']+)'|([^\s#]+))\s*$/m.exec(t),n=(s?.[1]??s?.[2]??s?.[3]??"").trim();return n.length>0?n:(e.split("/").pop()??"").replace(/\.paper$/i,"")},"paperTitleOf"),O=d(i=>{let e=new Map,t=!1;for(let s of i.split(/\r?\n/)){if(/^scores:\s*$/.test(s)){t=!0;continue}if(!t)continue;if(!/^\s+\S/.test(s)){t=!1;continue}let n=/^\s*"?([^":]+)"?\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*$/.exec(s);n!==null&&e.set((n[1]??"").trim(),Number(n[2]))}return e},"parseScores"),R=d(i=>{let e=new Map,t=!1,s="";for(let n of i.split(/\r?\n/)){if(/^grades:\s*$/.test(n)){t=!0;continue}if(!t)continue;if(!/^\s/.test(n)){t=!1;continue}let r=/^\s{2}"?([^":]+)"?:\s*$/.exec(n);if(r!==null){s=(r[1]??"").trim(),e.set(s,{score:null,comment:""});continue}let a=/^\s{4}(score|comment):\s*(.*)$/.exec(n);if(a===null||s.length===0)continue;let l=e.get(s);if(l!==void 0)if(a[1]==="score"){let u=Number(a[2]);l.score=Number.isFinite(u)?u:null}else l.comment=F(a[2]??"")}return e},"parseGrades"),F=d(i=>{let e=i.trim();if(e.length>=2&&e.startsWith('"')&&e.endsWith('"'))try{return JSON.parse(e)}catch{return e.slice(1,-1)}return e},"unquote"),Q=d(i=>{let e=[],t=/^:::([a-z-]+)#(\d+)\s*$/gm,s=0,n=t.exec(i);for(;n!==null;){let r=Number(n[2]),a=i.slice(s,n.index),l=W(V(a));e.push({number:r,title:l.length>0?l:`\u7B2C ${String(r)} \u9898`}),s=n.index+n[0].length,n=t.exec(i)}return e},"parseQuestions"),V=d(i=>{let e=i.replace(/^---[\s\S]*?\n---\s*/,""),t=e.lastIndexOf(`
## `);return(t>=0?e.slice(t+1):e).split(/\r?\n/).filter(n=>!/^#{1,6}\s/.test(n.trim())&&!/^---\s*$/.test(n.trim())).join(`
`)},"stemOf"),W=d(i=>{for(let e of i.split(/\r?\n/)){let t=e.trim();if(!(t.length===0||/^:::/.test(t)||/^[-*+]\s/.test(t)||/^!\[/.test(t)||/^```/.test(t)))return t.replace(/^>\s*/,"").replace(/^\d+[.)]\s*/,"").slice(0,60)}return""},"firstLineOf"),G=d(async()=>{let i=await g();if(i===void 0)return!1;try{await o.workspace.fs.stat(o.Uri.joinPath(i,".sumi","state.json"))}catch{return!1}try{return await o.commands.executeCommand("workbench.view.extension.numas.exam.answer"),!0}catch{return!1}},"switchLeftView");function H(i){i.subscriptions.push(o.window.registerWebviewViewProvider(q,new h));let e=d(t=>{t<=0||G().then(s=>{s||setTimeout(()=>e(t-1),1200)})},"attempt");setTimeout(()=>e(3),800)}d(H,"activate");
