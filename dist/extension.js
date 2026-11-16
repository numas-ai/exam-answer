"use strict";var y=Object.create;var l=Object.defineProperty;var k=Object.getOwnPropertyDescriptor;var P=Object.getOwnPropertyNames;var S=Object.getPrototypeOf,M=Object.prototype.hasOwnProperty;var a=(n,e)=>l(n,"name",{value:e,configurable:!0});var T=(n,e)=>{for(var t in e)l(n,t,{get:e[t],enumerable:!0})},h=(n,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let i of P(e))!M.call(n,i)&&i!==t&&l(n,i,{get:()=>e[i],enumerable:!(s=k(e,i))||s.enumerable});return n};var $=(n,e,t)=>(t=n!=null?y(S(n)):{},h(e||!n||!n.__esModule?l(t,"default",{value:n,enumerable:!0}):t,n)),E=n=>h(l({},"__esModule",{value:!0}),n);var V={};T(V,{AnswerProvider:()=>f,activate:()=>N});module.exports=E(V);var o=$(require("vscode"));var U="numas.exam.answer.view",v=".sumi/exam-session.json",b=".sumi/workspace.conf",m=".opencode/tools/repo-submit.mjs",j=".sumi/repo-submit.json",C=500,A=180*1e3,L=4e3,u=a(async()=>{let n=o.workspace.workspaceFolders?.[0]?.uri;for(let e=0;n!==void 0&&e<6;e+=1){try{return await o.workspace.fs.stat(o.Uri.joinPath(n,...v.split("/"))),n}catch{}let t=o.Uri.joinPath(n,"..");if(t.toString()===n.toString())break;n=t}},"resolveExamRoot"),p={answering:!1,deadlineAtMs:null,branch:"",inQuestion:!1,questions:[],paperTitle:""},f=class{static{a(this,"AnswerProvider")}view;timer;submitting=!1;switched=!1;teacherViewRestored=!1;dispose(){this.timer!==void 0&&(clearInterval(this.timer),this.timer=void 0)}resolveWebviewView(e){this.timer!==void 0&&(clearInterval(this.timer),this.timer=void 0),this.switched=!1,this.view=e,e.onDidDispose(()=>{this.view===e&&(this.view=void 0),this.timer!==void 0&&(clearInterval(this.timer),this.timer=void 0)}),e.webview.options={enableScripts:!0},e.webview.html=this.html(),e.webview.onDidReceiveMessage(s=>{if(typeof s!="object"||s===null)return;let i=s;if(i.type==="ready"){this.refresh();return}if(i.type==="submit"){this.submit(i.auto===!0).catch(r=>{this.post({type:"submitProgress",state:"failed",message:`${i.auto===!0?"\u81EA\u52A8\u63D0\u4EA4\u5931\u8D25":"\u63D0\u4EA4\u5931\u8D25"}\uFF1A${r instanceof Error?r.message:String(r)}`})});return}i.type==="reveal"&&typeof s.number=="number"&&o.commands.executeCommand("numas.paper.reveal",String(s.number))}),this.timer=setInterval(()=>void this.refresh(),L);let t=o.window.onDidChangeActiveTextEditor(()=>void this.refresh());e.onDidDispose(()=>t.dispose()),this.refresh()}async read(e){try{return new TextDecoder("utf-8").decode(await o.workspace.fs.readFile(e))}catch{return}}async exists(e){return await this.read(e)!==void 0}post(e){let t=this.view?.webview;t?.postMessage(e)}async refresh(){if(this.view===void 0)return;let e=await this.load();if(this.post({type:"model",model:e}),!e.answering&&!this.teacherViewRestored){let t=await u();if(t!==void 0){let s=await x(t),i=await w(t);if(s==="teacher"||i==="main"){this.teacherViewRestored=!0;try{await o.commands.executeCommand("workbench.view.extension.numas.exam.panel")}catch{this.teacherViewRestored=!1}}}}if(e.answering&&!this.switched){this.switched=!0;try{await o.commands.executeCommand("workbench.view.extension.numas.exam.answer")}catch{this.switched=!1}}}async load(){let e=await u();if(e===void 0)return p;let t=await this.session(e);if(t===void 0||t.role!=="student")return p;let s=await this.branch(e);if(s.length===0||s==="main")return p;let i=await this.read(o.Uri.joinPath(e,...b.split("/"))),r=i===void 0?"":g(i),d=r.length===0?void 0:await this.read(o.Uri.joinPath(e,...r.split("/"))),c=o.window.activeTextEditor?.document.uri;return{answering:!0,inQuestion:c!==void 0&&c.scheme==="file"&&c.toString()!==e.toString()&&c.fsPath.startsWith(`${e.fsPath}/`)&&!/\.paper$/i.test(c.fsPath),deadlineAtMs:t.deadlineAt.length===0||!Number.isFinite(Date.parse(t.deadlineAt))?null:Date.parse(t.deadlineAt),branch:await this.branch(e),questions:d===void 0?[]:I(d),paperTitle:d===void 0?"":q(d,r)}}async session(e){let t=await this.read(o.Uri.joinPath(e,...v.split("/")));if(t!==void 0)try{let s=JSON.parse(t);if(typeof s!="object"||s===null)return;let i=s,r=typeof i.firstEnteredAt=="string"?i.firstEnteredAt:"";return r.length===0?void 0:{firstEnteredAt:r,deadlineAt:typeof i.deadlineAt=="string"?i.deadlineAt:"",role:typeof i.role=="string"?i.role:""}}catch{return}}async branch(e){let t=await this.read(o.Uri.joinPath(e,".git","HEAD"));if(t===void 0)return"";let s=/^ref:\s*refs\/heads\/(.+)\s*$/m.exec(t);return s===null?"":(s[1]??"").trim()}async revealQuestion(e){await this.backToPaper();try{await o.commands.executeCommand("numas.paper.reveal",String(e))}catch{}}async backToPaper(){let e=await u();if(e===void 0)return;let t=await this.read(o.Uri.joinPath(e,...b.split("/"))),s=t===void 0?"":g(t);if(s.length===0)return;let i=o.Uri.joinPath(e,...s.split("/")).toString();try{await o.commands.executeCommand("numas.paper.exitProject").then(void 0,()=>{}),await o.commands.executeCommand("numas.paper.open",i)}catch(r){o.window.showWarningMessage(`\u6253\u5F00\u8BD5\u5377\u5931\u8D25\uFF1A${r instanceof Error?r.message:String(r)}`)}}async submit(e){if(this.submitting)return;let t=await u();if(t===void 0)throw new Error("\u5F53\u524D\u5DE5\u4F5C\u533A\u4E0D\u53EF\u7528");if(!await this.exists(o.Uri.joinPath(t,...m.split("/"))))throw new Error(`\u5DE5\u4F5C\u533A\u91CC\u6CA1\u6709\u63D0\u4EA4\u5DE5\u5177\uFF08${m}\uFF09`);this.submitting=!0,this.post({type:"submitProgress",state:"running",message:e?"\u6B63\u5728\u81EA\u52A8\u63D0\u4EA4\u2026":"\u6B63\u5728\u63D0\u4EA4\u4F5C\u7B54\u2026"});try{let s=o.Uri.joinPath(t,...j.split("/"));await o.workspace.fs.delete(s,{useTrash:!1}).then(void 0,()=>{});let i=`node ${m}`;try{await o.commands.executeCommand("numas.ui.terminal.run",{text:i,cwd:t.fsPath})}catch{await o.commands.executeCommand("numas.ui.terminal.run",{text:`cd ${JSON.stringify(t.fsPath)} && ${i}`})}let r=await this.waitForSubmit(s);if(!r.ok)throw new Error(r.error.length>0?r.error:"\u63D0\u4EA4\u5931\u8D25\uFF1A\u7EC8\u7AEF\u5DE5\u5177\u6CA1\u6709\u7ED9\u51FA\u539F\u56E0");let d=r.branch.length>0?`\u5DF2\u63D0\u4EA4\u5230 ${r.branch}`:"\u5DF2\u63D0\u4EA4";this.post({type:"submitProgress",state:"done",message:d}),o.window.showInformationMessage(d),await this.refresh()}finally{this.submitting=!1}}async waitForSubmit(e){let t=Date.now()+A;for(;Date.now()<t;){await new Promise(d=>setTimeout(d,C));let s=await this.read(e);if(s===void 0||s.trim().length===0)continue;let i;try{i=JSON.parse(s)}catch{continue}if(typeof i!="object"||i===null)continue;let r=i;if(r.ok===!0)return{ok:!0,branch:typeof r.branch=="string"?r.branch:""};if(r.ok===!1)return{ok:!1,error:typeof r.error=="string"?r.error:""}}return{ok:!1,error:"\u63D0\u4EA4\u8D85\u65F6\uFF1A\u7EC8\u7AEF\u5DE5\u5177\u53EF\u80FD\u4ECD\u5728\u8FD0\u884C\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5"}}html(){let e=String(Date.now());return`<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8" />
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
    <button class="foot-btn" id="back-paper" type="button">\u8FD4\u56DE\u8BD5\u5377</button>
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

function render(){
  const on = !!model && model.answering;
  const inQuestion = on && model.inQuestion === true;
  $("foot").classList.toggle("hidden", !on);
  $("time-group").classList.toggle("hidden", !on);
  /*
   * \u5377\u9762\uFF08URL \u4E0D\u5E26\u9898\u76EE\uFF09\u53EA\u7ED9\u300C\u63D0\u4EA4\u4F5C\u7B54\u300D\uFF1B\u8FDB\u5165\u9898\u76EE\uFF08URL \u5E26\u9898\u76EE\u6BB5\uFF09\u53EA\u7ED9\u300C\u8FD4\u56DE\u8BD5\u5377\u300D\u3002
   * \u4E24\u4E2A\u52A8\u4F5C\u4E0D\u5728\u540C\u4E00\u5C4F\u51FA\u73B0\uFF0C\u907F\u514D\u5B66\u751F\u6CA1\u4F5C\u7B54\u5C31\u4EA4\u5377 / \u5728\u9898\u76EE\u91CC\u627E\u4E0D\u5230\u56DE\u5377\u5165\u53E3\u3002
   */
  $("back-paper").classList.toggle("hidden", !inQuestion);
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

$("back-paper").onclick = () => { vscode.postMessage({ type: "backToPaper" }); };
$("submit-btn").onclick = () => { const btn = $("submit-btn"); if (!btn.disabled) { btn.disabled = true; vscode.postMessage({ type: "submit", auto: false }); } };
render();
vscode.postMessage({ type: "ready" });
<\/script></body></html>`}},g=a(n=>{let e=/^\s*content:\s*(?:"([^"]+)"|'([^']+)'|([^\s#]+))\s*$/m.exec(n);return(e?.[1]??e?.[2]??e?.[3]??"").trim()},"paperPathOf"),q=a((n,e)=>{let t=/^---[\s\S]*?\n---/.exec(n)?.[0]??"",s=/^title:\s*(?:"([^"]+)"|'([^']+)'|([^\s#]+))\s*$/m.exec(t),i=(s?.[1]??s?.[2]??s?.[3]??"").trim();return i.length>0?i:(e.split("/").pop()??"").replace(/\.paper$/i,"")},"paperTitleOf"),I=a(n=>{let e=[],t=/^:::([a-z-]+)#(\d+)\s*$/gm,s=0,i=t.exec(n);for(;i!==null;){let r=Number(i[2]),d=n.slice(s,i.index),c=D(_(d));e.push({number:r,title:c.length>0?c:`\u7B2C ${String(r)} \u9898`}),s=i.index+i[0].length,i=t.exec(n)}return e},"parseQuestions"),_=a(n=>{let e=n.replace(/^---[\s\S]*?\n---\s*/,""),t=e.lastIndexOf(`
## `);return(t>=0?e.slice(t+1):e).split(/\r?\n/).filter(i=>!/^#{1,6}\s/.test(i.trim())&&!/^---\s*$/.test(i.trim())).join(`
`)},"stemOf"),D=a(n=>{for(let e of n.split(/\r?\n/)){let t=e.trim();if(!(t.length===0||/^:::/.test(t)||/^[-*+]\s/.test(t)||/^!\[/.test(t)||/^```/.test(t)))return t.replace(/^>\s*/,"").replace(/^\d+[.)]\s*/,"").slice(0,60)}return""},"firstLineOf"),w=a(async n=>{try{let e=await o.workspace.fs.readFile(o.Uri.joinPath(n,".git","HEAD")),t=new TextDecoder().decode(e),s=/^ref:\s*refs\/heads\/(.+)\s*$/m.exec(t);return s===null?"":(s[1]??"").trim()}catch{return""}},"readBranch"),x=a(async n=>{try{let e=await o.workspace.fs.readFile(o.Uri.joinPath(n,".sumi","exam-session.json")),t=JSON.parse(new TextDecoder().decode(e));if(typeof t!="object"||t===null)return"";let s=t.role;return typeof s=="string"?s:""}catch{return""}},"readRole"),R=a(async()=>{let n=await u();if(n===void 0)return!1;try{await o.workspace.fs.stat(o.Uri.joinPath(n,".sumi","exam-session.json"))}catch{return!1}if(await x(n)!=="student")return!1;let t=await w(n);if(t.length===0||t==="main")return!1;try{return await o.commands.executeCommand("workbench.view.extension.numas.exam.answer"),!0}catch{return!1}},"switchLeftView");function N(n){n.subscriptions.push(o.window.registerWebviewViewProvider(U,new f));let e=a(t=>{t<=0||R().then(s=>{s||setTimeout(()=>e(t-1),1200)})},"attempt");setTimeout(()=>e(3),800)}a(N,"activate");
