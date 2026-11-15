"use strict";var b=Object.create;var l=Object.defineProperty;var h=Object.getOwnPropertyDescriptor;var g=Object.getOwnPropertyNames;var v=Object.getPrototypeOf,w=Object.prototype.hasOwnProperty;var a=(i,e)=>l(i,"name",{value:e,configurable:!0});var x=(i,e)=>{for(var t in e)l(i,t,{get:e[t],enumerable:!0})},f=(i,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let n of g(e))!w.call(i,n)&&n!==t&&l(i,n,{get:()=>e[n],enumerable:!(s=h(e,n))||s.enumerable});return i};var y=(i,e,t)=>(t=i!=null?b(v(i)):{},f(e||!i||!i.__esModule?l(t,"default",{value:i,enumerable:!0}):t,i)),k=i=>f(l({},"__esModule",{value:!0}),i);var O={};x(O,{AnswerProvider:()=>c,activate:()=>N});module.exports=k(O);var r=y(require("vscode"));var M="numas.exam.answer.view",S=".sumi/exam-session.json",T=".sumi/workspace.conf",u=".opencode/tools/repo-submit.mjs",P=".sumi/repo-submit.json",q=500,$=180*1e3,E=4e3,m={answering:!1,deadlineAtMs:null,branch:"",questions:[],paperTitle:""},c=class{static{a(this,"AnswerProvider")}view;timer;submitting=!1;dispose(){this.timer!==void 0&&(clearInterval(this.timer),this.timer=void 0)}resolveWebviewView(e){this.view=e,e.webview.options={enableScripts:!0},e.webview.html=this.html(),e.webview.onDidReceiveMessage(t=>{if(typeof t!="object"||t===null)return;let s=t;if(s.type==="ready"){this.refresh();return}if(s.type==="submit"){this.submit(s.auto===!0).catch(n=>{this.post({type:"submitProgress",state:"failed",message:`${s.auto===!0?"\u81EA\u52A8\u63D0\u4EA4\u5931\u8D25":"\u63D0\u4EA4\u5931\u8D25"}\uFF1A${n instanceof Error?n.message:String(n)}`})});return}s.type==="reveal"&&typeof t.number=="number"&&r.commands.executeCommand("numas.paper.reveal",String(t.number))}),this.timer=setInterval(()=>void this.refresh(),E),this.refresh()}folder(){return r.workspace.workspaceFolders?.[0]?.uri}async read(e){try{return new TextDecoder("utf-8").decode(await r.workspace.fs.readFile(e))}catch{return}}async exists(e){return await this.read(e)!==void 0}post(e){this.view?.webview.postMessage(e)}async refresh(){this.view!==void 0&&this.post({type:"model",model:await this.load()})}async load(){let e=this.folder();if(e===void 0)return m;let t=await this.session(e);if(t===void 0||t.role==="teacher")return m;let s=await this.read(r.Uri.joinPath(e,...T.split("/"))),n=s===void 0?"":A(s),o=n.length===0?void 0:await this.read(r.Uri.joinPath(e,...n.split("/")));return{answering:!0,deadlineAtMs:t.deadlineAt.length===0?null:Date.parse(t.deadlineAt),branch:await this.branch(e),questions:o===void 0?[]:C(o),paperTitle:o===void 0?"":I(o,n)}}async session(e){let t=await this.read(r.Uri.joinPath(e,...S.split("/")));if(t!==void 0)try{let s=JSON.parse(t);if(typeof s!="object"||s===null)return;let n=s,o=typeof n.firstEnteredAt=="string"?n.firstEnteredAt:"";return o.length===0?void 0:{firstEnteredAt:o,deadlineAt:typeof n.deadlineAt=="string"?n.deadlineAt:"",role:typeof n.role=="string"?n.role:""}}catch{return}}async branch(e){let t=await this.read(r.Uri.joinPath(e,".git","HEAD"));if(t===void 0)return"";let s=/^ref:\s*refs\/heads\/(.+)\s*$/m.exec(t);return s===null?"":(s[1]??"").trim()}async submit(e){if(this.submitting)return;let t=this.folder();if(t===void 0)throw new Error("\u5F53\u524D\u5DE5\u4F5C\u533A\u4E0D\u53EF\u7528");if(!await this.exists(r.Uri.joinPath(t,...u.split("/"))))throw new Error(`\u5DE5\u4F5C\u533A\u91CC\u6CA1\u6709\u63D0\u4EA4\u5DE5\u5177\uFF08${u}\uFF09`);this.submitting=!0,this.post({type:"submitProgress",state:"running",message:e?"\u6B63\u5728\u81EA\u52A8\u63D0\u4EA4\u2026":"\u6B63\u5728\u63D0\u4EA4\u7B54\u5377\u2026"});try{let s=r.Uri.joinPath(t,...P.split("/"));await r.workspace.fs.delete(s,{useTrash:!1}).then(void 0,()=>{});let n=`node ${u}`;try{await r.commands.executeCommand("numas.ui.terminal.run",{text:n,cwd:t.fsPath})}catch{await r.commands.executeCommand("numas.ui.terminal.run",{text:`cd ${JSON.stringify(t.fsPath)} && ${n}`})}let o=await this.waitForSubmit(s);if(!o.ok)throw new Error(o.error.length>0?o.error:"\u63D0\u4EA4\u5931\u8D25\uFF1A\u7EC8\u7AEF\u5DE5\u5177\u6CA1\u6709\u7ED9\u51FA\u539F\u56E0");let d=o.branch.length>0?`\u5DF2\u63D0\u4EA4\u5230 ${o.branch}`:"\u5DF2\u63D0\u4EA4";this.post({type:"submitProgress",state:"done",message:d}),r.window.showInformationMessage(d),await this.refresh()}finally{this.submitting=!1}}async waitForSubmit(e){let t=Date.now()+$;for(;Date.now()<t;){await new Promise(d=>setTimeout(d,q));let s=await this.read(e);if(s===void 0||s.trim().length===0)continue;let n;try{n=JSON.parse(s)}catch{continue}if(typeof n!="object"||n===null)continue;let o=n;if(o.ok===!0)return{ok:!0,branch:typeof o.branch=="string"?o.branch:""};if(o.ok===!1)return{ok:!1,error:typeof o.error=="string"?o.error:""}}return{ok:!1,error:"\u63D0\u4EA4\u8D85\u65F6\uFF1A\u7EC8\u7AEF\u5DE5\u5177\u53EF\u80FD\u4ECD\u5728\u8FD0\u884C\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5"}}html(){let e=String(Date.now());return`<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8" />
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
.submit-btn{width:100%;height:34px;border:0;border-radius:10px;background:linear-gradient(135deg,#e0771e,#c45a0d);color:#fff;font:inherit;font-size:13px;font-weight:650;cursor:pointer;box-shadow:0 8px 18px rgba(224,119,30,.24);transition:filter 120ms ease,transform 120ms ease}
.submit-btn:hover:not(:disabled){filter:brightness(1.04)}
.submit-btn:active:not(:disabled){transform:scale(.97)}
.submit-btn:disabled{cursor:default;filter:none;opacity:.55;box-shadow:none}
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
    <button class="submit-btn" id="submit-btn" type="button">\u63D0\u4EA4\u7B54\u5377</button>
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
  $("foot").classList.toggle("hidden", !on);
  $("time-group").classList.toggle("hidden", !on);
  const list = $("q-list");
  const empty = $("q-empty");
  const title = $("q-title");
  if (on && model.paperTitle) title.textContent = model.paperTitle;
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
  if (state === "running") { btn.disabled = true; status.hidden = false; status.className = "submit-status is-running"; status.textContent = message || "\u6B63\u5728\u63D0\u4EA4\u7B54\u5377\u2026"; return; }
  if (state === "failed") { btn.disabled = false; status.hidden = false; status.className = "submit-status is-error"; status.textContent = message || "\u63D0\u4EA4\u5931\u8D25"; return; }
  if (state === "done") { btn.disabled = true; status.hidden = false; status.className = "submit-status"; status.textContent = message || "\u5DF2\u63D0\u4EA4"; return; }
  status.hidden = true; status.className = "submit-status"; status.textContent = "";
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

$("submit-btn").onclick = () => { const btn = $("submit-btn"); if (!btn.disabled) { btn.disabled = true; vscode.postMessage({ type: "submit", auto: false }); } };
render();
vscode.postMessage({ type: "ready" });
<\/script></body></html>`}},A=a(i=>{let e=/^\s*content:\s*(?:"([^"]+)"|'([^']+)'|([^\s#]+))\s*$/m.exec(i);return(e?.[1]??e?.[2]??e?.[3]??"").trim()},"paperPathOf"),I=a((i,e)=>{let t=/^---[\s\S]*?\n---/.exec(i)?.[0]??"",s=/^title:\s*(?:"([^"]+)"|'([^']+)'|([^\s#]+))\s*$/m.exec(t),n=(s?.[1]??s?.[2]??s?.[3]??"").trim();return n.length>0?n:(e.split("/").pop()??"").replace(/\.paper$/i,"")},"paperTitleOf"),C=a(i=>{let e=[],t=/^:::([a-z-]+)#(\d+)\s*$/gm,s=0,n=t.exec(i);for(;n!==null;){let o=Number(n[2]),d=i.slice(s,n.index),p=U(L(d));e.push({number:o,title:p.length>0?p:`\u7B2C ${String(o)} \u9898`}),s=n.index+n[0].length,n=t.exec(i)}return e},"parseQuestions"),L=a(i=>{let e=i.replace(/^---[\s\S]*?\n---\s*/,""),t=e.lastIndexOf(`
## `);return(t>=0?e.slice(t+1):e).split(/\r?\n/).filter(n=>!/^#{1,6}\s/.test(n.trim())&&!/^---\s*$/.test(n.trim())).join(`
`)},"stemOf"),U=a(i=>{for(let e of i.split(/\r?\n/)){let t=e.trim();if(!(t.length===0||/^:::/.test(t)||/^[-*+]\s/.test(t)||/^!\[/.test(t)||/^```/.test(t)))return t.replace(/^>\s*/,"").replace(/^\d+[.)]\s*/,"").slice(0,60)}return""},"firstLineOf"),j=a(async()=>{let i=r.workspace.workspaceFolders?.[0]?.uri;if(i===void 0)return!1;try{await r.workspace.fs.stat(r.Uri.joinPath(i,".sumi","exam-session.json"))}catch{return!1}try{return await r.commands.executeCommand("workbench.view.extension.numas.exam.answer"),!0}catch{return!1}},"switchLeftView");function N(i){i.subscriptions.push(r.window.registerWebviewViewProvider(M,new c));let e=a(t=>{t<=0||j().then(s=>{s||setTimeout(()=>e(t-1),1200)})},"attempt");setTimeout(()=>e(3),800)}a(N,"activate");
