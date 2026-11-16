"use strict";var w=Object.create;var c=Object.defineProperty;var x=Object.getOwnPropertyDescriptor;var y=Object.getOwnPropertyNames;var k=Object.getPrototypeOf,P=Object.prototype.hasOwnProperty;var d=(s,e)=>c(s,"name",{value:e,configurable:!0});var S=(s,e)=>{for(var t in e)c(s,t,{get:e[t],enumerable:!0})},h=(s,e,t,i)=>{if(e&&typeof e=="object"||typeof e=="function")for(let n of y(e))!P.call(s,n)&&n!==t&&c(s,n,{get:()=>e[n],enumerable:!(i=x(e,n))||i.enumerable});return s};var T=(s,e,t)=>(t=s!=null?w(k(s)):{},h(e||!s||!s.__esModule?c(t,"default",{value:s,enumerable:!0}):t,s)),M=s=>h(c({},"__esModule",{value:!0}),s);var R={};S(R,{AnswerProvider:()=>u,activate:()=>O});module.exports=M(R);var o=T(require("vscode"));var $="numas.exam.answer.view",v=".sumi/exam-session.json",b=".sumi/workspace.conf",m=".opencode/tools/repo-submit.mjs",E=".sumi/repo-submit.json",q=500,U=180*1e3,C=4e3,l=d(async()=>{let s=o.workspace.workspaceFolders?.[0]?.uri;for(let e=0;s!==void 0&&e<6;e+=1){try{return await o.workspace.fs.stat(o.Uri.joinPath(s,...v.split("/"))),s}catch{}let t=o.Uri.joinPath(s,"..");if(t.toString()===s.toString())break;s=t}},"resolveExamRoot"),p={answering:!1,deadlineAtMs:null,branch:"",inQuestion:!1,questions:[],paperTitle:""},u=class{static{d(this,"AnswerProvider")}view;timer;submitting=!1;switched=!1;dispose(){this.timer!==void 0&&(clearInterval(this.timer),this.timer=void 0)}resolveWebviewView(e){this.timer!==void 0&&(clearInterval(this.timer),this.timer=void 0),this.switched=!1,this.view=e,e.onDidDispose(()=>{this.view===e&&(this.view=void 0),this.timer!==void 0&&(clearInterval(this.timer),this.timer=void 0)}),e.webview.options={enableScripts:!0},e.webview.html=this.html(),e.webview.onDidReceiveMessage(i=>{if(typeof i!="object"||i===null)return;let n=i;if(n.type==="ready"){this.refresh();return}if(n.type==="submit"){this.submit(n.auto===!0).catch(r=>{this.post({type:"submitProgress",state:"failed",message:`${n.auto===!0?"\u81EA\u52A8\u63D0\u4EA4\u5931\u8D25":"\u63D0\u4EA4\u5931\u8D25"}\uFF1A${r instanceof Error?r.message:String(r)}`})});return}n.type==="reveal"&&typeof i.number=="number"&&o.commands.executeCommand("numas.paper.reveal",String(i.number))}),this.timer=setInterval(()=>void this.refresh(),C);let t=o.window.onDidChangeActiveTextEditor(()=>void this.refresh());e.onDidDispose(()=>t.dispose()),this.refresh()}async read(e){try{return new TextDecoder("utf-8").decode(await o.workspace.fs.readFile(e))}catch{return}}async exists(e){return await this.read(e)!==void 0}post(e){let t=this.view?.webview;t?.postMessage(e)}async refresh(){if(this.view===void 0)return;let e=await this.load();if(this.post({type:"model",model:e}),e.answering&&!this.switched){this.switched=!0;try{await o.commands.executeCommand("workbench.view.extension.numas.exam.answer")}catch{this.switched=!1}}}async load(){let e=await l();if(e===void 0)return p;let t=await this.session(e);if(t===void 0||t.role!=="student")return p;let i=await this.read(o.Uri.joinPath(e,...b.split("/"))),n=i===void 0?"":g(i),r=n.length===0?void 0:await this.read(o.Uri.joinPath(e,...n.split("/"))),a=o.window.activeTextEditor?.document.uri;return{answering:!0,inQuestion:a!==void 0&&a.scheme==="file"&&a.toString()!==e.toString()&&a.fsPath.startsWith(`${e.fsPath}/`)&&!/\.paper$/i.test(a.fsPath),deadlineAtMs:t.deadlineAt.length===0||!Number.isFinite(Date.parse(t.deadlineAt))?null:Date.parse(t.deadlineAt),branch:await this.branch(e),questions:r===void 0?[]:j(r),paperTitle:r===void 0?"":L(r,n)}}async session(e){let t=await this.read(o.Uri.joinPath(e,...v.split("/")));if(t!==void 0)try{let i=JSON.parse(t);if(typeof i!="object"||i===null)return;let n=i,r=typeof n.firstEnteredAt=="string"?n.firstEnteredAt:"";return r.length===0?void 0:{firstEnteredAt:r,deadlineAt:typeof n.deadlineAt=="string"?n.deadlineAt:"",role:typeof n.role=="string"?n.role:""}}catch{return}}async branch(e){let t=await this.read(o.Uri.joinPath(e,".git","HEAD"));if(t===void 0)return"";let i=/^ref:\s*refs\/heads\/(.+)\s*$/m.exec(t);return i===null?"":(i[1]??"").trim()}async backToPaper(){let e=await l();if(e===void 0)return;let t=await this.read(o.Uri.joinPath(e,...b.split("/"))),i=t===void 0?"":g(t);if(i.length===0)return;let n=o.Uri.joinPath(e,...i.split("/")).toString();try{await o.commands.executeCommand("numas.paper.exitProject").then(void 0,()=>{}),await o.commands.executeCommand("numas.paper.open",n)}catch(r){o.window.showWarningMessage(`\u6253\u5F00\u8BD5\u5377\u5931\u8D25\uFF1A${r instanceof Error?r.message:String(r)}`)}}async submit(e){if(this.submitting)return;let t=await l();if(t===void 0)throw new Error("\u5F53\u524D\u5DE5\u4F5C\u533A\u4E0D\u53EF\u7528");if(!await this.exists(o.Uri.joinPath(t,...m.split("/"))))throw new Error(`\u5DE5\u4F5C\u533A\u91CC\u6CA1\u6709\u63D0\u4EA4\u5DE5\u5177\uFF08${m}\uFF09`);this.submitting=!0,this.post({type:"submitProgress",state:"running",message:e?"\u6B63\u5728\u81EA\u52A8\u63D0\u4EA4\u2026":"\u6B63\u5728\u63D0\u4EA4\u4F5C\u7B54\u2026"});try{let i=o.Uri.joinPath(t,...E.split("/"));await o.workspace.fs.delete(i,{useTrash:!1}).then(void 0,()=>{});let n=`node ${m}`;try{await o.commands.executeCommand("numas.ui.terminal.run",{text:n,cwd:t.fsPath})}catch{await o.commands.executeCommand("numas.ui.terminal.run",{text:`cd ${JSON.stringify(t.fsPath)} && ${n}`})}let r=await this.waitForSubmit(i);if(!r.ok)throw new Error(r.error.length>0?r.error:"\u63D0\u4EA4\u5931\u8D25\uFF1A\u7EC8\u7AEF\u5DE5\u5177\u6CA1\u6709\u7ED9\u51FA\u539F\u56E0");let a=r.branch.length>0?`\u5DF2\u63D0\u4EA4\u5230 ${r.branch}`:"\u5DF2\u63D0\u4EA4";this.post({type:"submitProgress",state:"done",message:a}),o.window.showInformationMessage(a),await this.refresh()}finally{this.submitting=!1}}async waitForSubmit(e){let t=Date.now()+U;for(;Date.now()<t;){await new Promise(a=>setTimeout(a,q));let i=await this.read(e);if(i===void 0||i.trim().length===0)continue;let n;try{n=JSON.parse(i)}catch{continue}if(typeof n!="object"||n===null)continue;let r=n;if(r.ok===!0)return{ok:!0,branch:typeof r.branch=="string"?r.branch:""};if(r.ok===!1)return{ok:!1,error:typeof r.error=="string"?r.error:""}}return{ok:!1,error:"\u63D0\u4EA4\u8D85\u65F6\uFF1A\u7EC8\u7AEF\u5DE5\u5177\u53EF\u80FD\u4ECD\u5728\u8FD0\u884C\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5"}}html(){let e=String(Date.now());return`<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8" />
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
/* \u9898\u76EE\u5217\u8868\uFF1A\u6BCF\u884C\u4E00\u4E2A\u9898\u53F7 + \u9898\u5E72\u9996\u884C\uFF0C\u884C\u9AD8\u56FA\u5B9A\u4E0D\u8DF3\u52A8\u3002 */
.q-list{display:flex;flex-direction:column;gap:4px;padding:0 6px}
.q-item{display:flex;align-items:center;gap:9px;width:100%;padding:7px 8px;border:0;border-radius:9px;background:none;color:#2f2a26;font:inherit;font-size:12.5px;text-align:left;cursor:pointer;transition:background-color 120ms ease}
.q-item:hover{background:var(--surface)}
.q-item:active{background:var(--accent-soft)}
.q-no{flex:none;width:22px;height:22px;border-radius:6px;background:var(--accent-soft);color:var(--accent);font-size:11.5px;font-weight:700;display:flex;align-items:center;justify-content:center}
.q-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.empty{padding:10px;color:var(--faint);font-size:12px;line-height:1.6}
.foot{flex:none;display:flex;flex-direction:column;gap:6px;padding:10px 12px 14px;border-top:1px solid var(--line)}
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
      <div class="group-title" id="q-title">\u9898\u76EE</div>
      <div class="q-list" id="q-list"></div>
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
  const item = target.closest(".q-item");
  if (item) {
    vscode.postMessage({ type: "reveal", number: Number(item.dataset.number) });
  }
});

$("back-paper").onclick = () => { vscode.postMessage({ type: "backToPaper" }); };
$("submit-btn").onclick = () => { const btn = $("submit-btn"); if (!btn.disabled) { btn.disabled = true; vscode.postMessage({ type: "submit", auto: false }); } };
render();
vscode.postMessage({ type: "ready" });
<\/script></body></html>`}},g=d(s=>{let e=/^\s*content:\s*(?:"([^"]+)"|'([^']+)'|([^\s#]+))\s*$/m.exec(s);return(e?.[1]??e?.[2]??e?.[3]??"").trim()},"paperPathOf"),L=d((s,e)=>{let t=/^---[\s\S]*?\n---/.exec(s)?.[0]??"",i=/^title:\s*(?:"([^"]+)"|'([^']+)'|([^\s#]+))\s*$/m.exec(t),n=(i?.[1]??i?.[2]??i?.[3]??"").trim();return n.length>0?n:(e.split("/").pop()??"").replace(/\.paper$/i,"")},"paperTitleOf"),j=d(s=>{let e=[],t=/^:::([a-z-]+)#(\d+)\s*$/gm,i=0,n=t.exec(s);for(;n!==null;){let r=Number(n[2]),a=s.slice(i,n.index),f=I(A(a));e.push({number:r,title:f.length>0?f:`\u7B2C ${String(r)} \u9898`}),i=n.index+n[0].length,n=t.exec(s)}return e},"parseQuestions"),A=d(s=>{let e=s.replace(/^---[\s\S]*?\n---\s*/,""),t=e.lastIndexOf(`
## `);return(t>=0?e.slice(t+1):e).split(/\r?\n/).filter(n=>!/^#{1,6}\s/.test(n.trim())&&!/^---\s*$/.test(n.trim())).join(`
`)},"stemOf"),I=d(s=>{for(let e of s.split(/\r?\n/)){let t=e.trim();if(!(t.length===0||/^:::/.test(t)||/^[-*+]\s/.test(t)||/^!\[/.test(t)||/^```/.test(t)))return t.replace(/^>\s*/,"").replace(/^\d+[.)]\s*/,"").slice(0,60)}return""},"firstLineOf"),D=d(async s=>{try{let e=await o.workspace.fs.readFile(o.Uri.joinPath(s,".sumi","exam-session.json")),t=JSON.parse(new TextDecoder().decode(e));if(typeof t!="object"||t===null)return"";let i=t.role;return typeof i=="string"?i:""}catch{return""}},"readRole"),N=d(async()=>{let s=await l();if(s===void 0)return!1;try{await o.workspace.fs.stat(o.Uri.joinPath(s,".sumi","exam-session.json"))}catch{return!1}if(await D(s)!=="student")return!1;try{return await o.commands.executeCommand("workbench.view.extension.numas.exam.answer"),!0}catch{return!1}},"switchLeftView");function O(s){s.subscriptions.push(o.window.registerWebviewViewProvider($,new u));let e=d(t=>{t<=0||N().then(i=>{i||setTimeout(()=>e(t-1),1200)})},"attempt");setTimeout(()=>e(3),800)}d(O,"activate");
