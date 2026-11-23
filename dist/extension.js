"use strict";var j=Object.create;var p=Object.defineProperty;var U=Object.getOwnPropertyDescriptor;var M=Object.getOwnPropertyNames;var E=Object.getPrototypeOf,$=Object.prototype.hasOwnProperty;var c=(o,e)=>p(o,"name",{value:e,configurable:!0});var C=(o,e)=>{for(var t in e)p(o,t,{get:e[t],enumerable:!0})},k=(o,e,t,n)=>{if(e&&typeof e=="object"||typeof e=="function")for(let i of M(e))!$.call(o,i)&&i!==t&&p(o,i,{get:()=>e[i],enumerable:!(n=U(e,i))||n.enumerable});return o};var R=(o,e,t)=>(t=o!=null?j(E(o)):{},k(e||!o||!o.__esModule?p(t,"default",{value:o,enumerable:!0}):t,o)),q=o=>k(p({},"__esModule",{value:!0}),o);var H={};C(H,{AnswerProvider:()=>m,activate:()=>V});module.exports=q(H);var s=R(require("vscode"));var A="numas.exam.answer.view",S=".sumi/state.json";var g=".sumi/workspace.conf",v=".opencode/tools/repo-submit.mjs",L=".sumi/repo-submit.json",_=500,I=180*1e3,D=4e3,F=c(async()=>{let o=s.workspace.workspaceFolders?.[0]?.uri;for(let e=0;o!==void 0&&e<6;e+=1){try{let n=await s.workspace.fs.readFile(s.Uri.joinPath(o,".sumi","settings.json")),i=JSON.parse(new TextDecoder("utf-8").decode(n));if(typeof i=="object"&&i!==null){let r=i["numas.page.mode"];return typeof r=="string"?r:void 0}return}catch{}let t=s.Uri.joinPath(o,"..");if(t.toString()===o.toString())break;o=t}},"readPageMode");var f=c(async()=>{let o=s.workspace.workspaceFolders?.[0]?.uri;for(let e=0;o!==void 0&&e<6;e+=1){try{return await s.workspace.fs.stat(s.Uri.joinPath(o,...S.split("/"))),o}catch{}let t=s.Uri.joinPath(o,"..");if(t.toString()===o.toString())break;o=t}},"resolveExamRoot"),w={answering:!1,autoSubmit:!0,submitted:!1,deadlineAtMs:null,branch:"",inQuestion:!1,questions:[],refs:[],paperTitle:""},m=class{static{c(this,"AnswerProvider")}view;timer;submitting=!1;paperUri;dispose(){this.timer!==void 0&&(clearInterval(this.timer),this.timer=void 0)}resolveWebviewView(e){this.timer!==void 0&&(clearInterval(this.timer),this.timer=void 0),this.view=e,e.onDidDispose(()=>{this.view===e&&(this.view=void 0),this.timer!==void 0&&(clearInterval(this.timer),this.timer=void 0)}),e.webview.options={enableScripts:!0},e.webview.html=this.html(),e.webview.onDidReceiveMessage(n=>{if(typeof n!="object"||n===null)return;let i=n;if(i.type==="ready"){this.refresh();return}if(i.type==="submit"){this.submit(i.auto===!0).catch(r=>{this.post({type:"submitProgress",state:"failed",message:`\u4EA4\u5377\u5931\u8D25\uFF1A${r instanceof Error?r.message:String(r)}`})});return}if(i.type==="openPaper"){this.backToPaper();return}if(i.type==="openRef"&&typeof n.name=="string"){this.openRef(n.name);return}i.type==="reveal"&&typeof n.number=="number"&&this.revealQuestion(n.number)}),this.timer=setInterval(()=>void this.refresh(),D);let t=s.window.onDidChangeActiveTextEditor(()=>void this.refresh());e.onDidDispose(()=>t.dispose()),this.refresh()}async read(e){try{return new TextDecoder("utf-8").decode(await s.workspace.fs.readFile(e))}catch{return}}async exists(e){return await this.read(e)!==void 0}post(e){let t=this.view?.webview;t?.postMessage(e)}lastModelJson="";async refresh(){if(this.view===void 0)return;let e=await this.load(),t=JSON.stringify(e);t!==this.lastModelJson&&(this.lastModelJson=t,this.post({type:"model",model:e}))}async load(){if(await F()!=="answer")return w;let e=await f();if(e===void 0)return w;let t=await this.session(e);if(t===void 0)return w;let n=await this.read(s.Uri.joinPath(e,...g.split("/"))),i=n===void 0?"":x(n);i.length>0&&(this.paperUri=s.Uri.joinPath(e,...i.split("/")));let r=i.length===0?void 0:await this.read(s.Uri.joinPath(e,...i.split("/"))),a=s.window.activeTextEditor?.document.uri,d=a!==void 0&&a.scheme==="file"&&a.toString()!==e.toString()&&a.fsPath.startsWith(`${e.fsPath}/`)&&!/\.paper$/i.test(a.fsPath),l=Number.isFinite(Date.parse(t.firstEnteredAt))?Date.parse(t.firstEnteredAt):0,u=await this.autoSubmit(e);return{answering:!0,autoSubmit:u,submitted:u&&await this.submitted(e),inQuestion:d,deadlineAtMs:t.deadlineAt.length===0||!Number.isFinite(Date.parse(t.deadlineAt))?null:Date.parse(t.deadlineAt),branch:await this.branch(e),questions:r===void 0?[]:await W(r,e,l),refs:await this.references(e),paperTitle:r===void 0?"":O(r,i)}}async submitted(e){try{let t=await this.read(s.Uri.joinPath(e,".sumi","repo-submit.json"));if(t===void 0)return!1;let n=JSON.parse(t);return typeof n=="object"&&n!==null&&n.ok===!0}catch{return!1}}async autoSubmit(e){try{let t=await this.read(s.Uri.joinPath(e,".sumi","settings.json"));if(t===void 0)return!0;let n=JSON.parse(t);if(typeof n=="object"&&n!==null)return n["numas.answer.autoSubmit"]!==!1}catch{}return!0}async references(e){try{return(await s.workspace.fs.readDirectory(s.Uri.joinPath(e,"references"))).filter(([,n])=>(n&s.FileType.File)!==0).map(([n])=>n).sort((n,i)=>n.localeCompare(i))}catch{return[]}}async session(e){let t=await this.read(s.Uri.joinPath(e,...S.split("/")));if(t!==void 0)try{let n=JSON.parse(t);if(typeof n!="object"||n===null)return;let i=n.behaviors;if(!Array.isArray(i))return;let r=i.find(d=>typeof d=="object"&&d!==null&&d.event==="exam.enter");if(r===void 0)return;let a=typeof r.timestamp=="string"?r.timestamp:"";return a.length===0?void 0:{firstEnteredAt:a,deadlineAt:typeof r.content=="string"?r.content:""}}catch{return}}async branch(e){let t=await this.read(s.Uri.joinPath(e,".git","HEAD"));if(t===void 0)return"";let n=/^ref:\s*refs\/heads\/(.+)\s*$/m.exec(t);return n===null?"":(n[1]??"").trim()}async openRef(e){let t=await f();if(t===void 0||e.trim().length===0)return;let n=s.Uri.joinPath(t,"references",e.trim());try{await s.commands.executeCommand("vscode.open",n,{preview:!1})}catch{}}async revealQuestion(e){try{if(await s.commands.executeCommand("numas.paper.reveal",String(e))===!0)return}catch{}let t=await f();if(t===void 0)return;let n=await this.read(s.Uri.joinPath(t,...g.split("/"))),i=n===void 0?"":x(n);if(i.length===0)return;let r=s.Uri.joinPath(t,...i.split("/"));try{await s.commands.executeCommand("numas.paper.open",r.toString()),await s.commands.executeCommand("numas.paper.reveal",String(e))}catch{}}async backToPaper(){let e=await f(),t=this.paperUri;if(t===void 0&&e!==void 0){let n=await this.read(s.Uri.joinPath(e,...g.split("/"))),i=n===void 0?"":x(n);i.length>0&&(t=s.Uri.joinPath(e,...i.split("/")))}if(t!==void 0)try{await s.commands.executeCommand("numas.paper.exitProject").then(void 0,()=>{}),await s.commands.executeCommand("numas.paper.open",t.toString()).then(i=>i===!0,()=>!1)||await s.commands.executeCommand("vscode.openWith",t,"numas.paper",{preview:!1}).then(void 0,()=>{}),await s.commands.executeCommand("editor.focusActiveEditorGroup").then(void 0,()=>{})}catch(n){s.window.showWarningMessage(`\u6253\u5F00\u8BD5\u5377\u5931\u8D25\uFF1A${n instanceof Error?n.message:String(n)}`)}}async submit(e){if(this.submitting)return;let t=await f();if(t===void 0)throw new Error("\u5F53\u524D\u5DE5\u4F5C\u533A\u4E0D\u53EF\u7528");if(!await this.exists(s.Uri.joinPath(t,...v.split("/"))))throw new Error(`\u5DE5\u4F5C\u533A\u91CC\u6CA1\u6709\u63D0\u4EA4\u5DE5\u5177\uFF08${v}\uFF09`);if(await this.submitted(t)){this.post({type:"submitProgress",state:"done",message:"\u5DF2\u4EA4\u5377"});return}if(!e&&await s.window.showWarningMessage("\u786E\u8BA4\u4EA4\u5377\uFF1F\u4EA4\u5377\u540E\u4E0D\u80FD\u518D\u4FEE\u6539\u7B54\u6848\u3002",{modal:!0},"\u786E\u8BA4\u4EA4\u5377")!=="\u786E\u8BA4\u4EA4\u5377"){this.post({type:"submitProgress",state:"idle"});return}this.submitting=!0,this.post({type:"submitProgress",state:"running",message:"\u6B63\u5728\u4EA4\u5377\u2026"});try{let n=s.Uri.joinPath(t,...L.split("/"));await s.workspace.fs.delete(n,{useTrash:!1}).then(void 0,()=>{});let i=`node ${v}`;await s.commands.executeCommand("numas.ui.background.run",{text:i,cwd:t.fsPath,name:"\u4EA4\u5377"});let r=await this.waitForSubmit(n);if(!r.ok)throw new Error(r.error.length>0?r.error:"\u4EA4\u5377\u5931\u8D25\uFF1A\u6CA1\u6709\u6536\u5230\u7ED3\u679C\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");this.post({type:"submitProgress",state:"done",message:"\u5DF2\u4EA4\u5377"}),await this.refresh()}finally{this.submitting=!1}}async waitForSubmit(e){let t=Date.now()+I;for(;Date.now()<t;){await new Promise(a=>setTimeout(a,_));let n=await this.read(e);if(n===void 0||n.trim().length===0)continue;let i;try{i=JSON.parse(n)}catch{continue}if(typeof i!="object"||i===null)continue;let r=i;if(r.ok===!0)return{ok:!0,branch:typeof r.branch=="string"?r.branch:""};if(r.ok===!1)return{ok:!1,error:typeof r.error=="string"?r.error:""}}return{ok:!1,error:"\u63D0\u4EA4\u8D85\u65F6\uFF1A\u7EC8\u7AEF\u5DE5\u5177\u53EF\u80FD\u4ECD\u5728\u8FD0\u884C\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5"}}html(){let e=String(Date.now());return`<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8" />
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
.tabs{display:flex;gap:4px;margin:10px 10px 0;padding:3px;border-radius:11px;background:color-mix(in srgb,#2f2a26 7%,transparent)}
.tab{flex:1;height:30px;border:0;border-radius:8px;background:transparent;color:#6b6158;font:inherit;font-size:12px;font-weight:600;cursor:pointer}
.tab.is-active{background:#fffdf9;color:var(--accent);box-shadow:0 1px 3px rgba(90,55,20,.12)}
.paper-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 10px;margin:0 0 6px}
.paper-head__title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--accent);font-size:13px;font-weight:600}
.paper-head__open{flex:none;padding:2px 0;border:0;background:none;color:var(--accent);font:inherit;font-size:12px;font-weight:600;cursor:pointer}
.paper-head__open:hover{text-decoration:underline;text-underline-offset:3px}
/* \u9898\u53F7\uFF1A48px \u65B9\u5F62\u6309\u94AE\u7F51\u683C\uFF0C\u4E0E exam-panel \u4E00\u81F4\u3002 */
.q-grid{display:grid;grid-template-columns:repeat(4,48px);justify-content:space-between;gap:8px;padding:0 10px}
.q-card{position:relative;width:48px;height:48px;border:0;border-radius:10px;background:var(--accent-soft);color:var(--accent);font:inherit;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .16s cubic-bezier(.2,.8,.2,1),background-color .15s ease,color .15s ease}
.q-card:hover{background:var(--accent);color:#fff;transform:translateY(-1px) scale(1)}
.q-card:active{background:var(--accent);color:#fff;transform:translateY(0) scale(.92);transition-duration:.08s}
.q-card:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.q-card.is-answered{background:color-mix(in srgb,#1a7f37 14%,transparent);color:#1a7f37}
.q-card.is-answered:hover{background:#1a7f37;color:#fff}
.empty{padding:10px;color:var(--faint);font-size:12px;line-height:1.6}
/* \u4E0E exam-panel \u7684 foot \u540C\u6B3E\uFF1A4px \u4E0A\u8FB9\u8DDD\u300112px \u4E0B\u8FB9\u8DDD\u3001\u65E0 1px \u5206\u9694\u7EBF\u3002 */
.foot{flex:none;display:flex;flex-direction:column;gap:6px;padding:6px 12px 14px}
/* \u4E0E exam-panel \u7684\u300C\u53D1\u5E03\u8003\u8BD5\u300D\u540C\u6B3E\uFF1A42px / 14px \u5706\u89D2 / \u5B9E\u8272 accent / 14px 600\u3002 */
.foot-btn{width:100%;height:36px;border:0;border-radius:10px;background:var(--accent);color:#fff;font:inherit;font-size:13px;font-weight:400;letter-spacing:.02em;cursor:pointer;transition:transform .16s cubic-bezier(.2,.8,.2,1),filter .15s ease}
.foot-btn:hover:not(:disabled){filter:brightness(.94)}
.foot-btn:active:not(:disabled){transform:scale(.95);filter:brightness(.88);transition-duration:.08s}
.foot-btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.foot-btn:disabled{cursor:default;filter:none;opacity:.6;transform:none}
.submit-status{margin:0;font-size:11px;line-height:1.45;color:var(--faint);word-break:break-word}
.submit-status.is-running{color:var(--accent)}
.submit-status.is-error{color:#b42318}
.submit-status[hidden]{display:none}
.hidden{display:none !important}

/* \u5168\u5C40\uFF1A\u4E0D\u663E\u793A\u6EDA\u52A8\u6761\uFF08\u5185\u5BB9\u4ECD\u53EF\u6EDA\u52A8\uFF09\u3002 */
*{scrollbar-width:none!important;-ms-overflow-style:none!important}
*::-webkit-scrollbar{width:0!important;height:0!important;display:none!important}
</style></head><body>
<div class="panel">
  <div class="body">
    <section id="pane-paper">
      <div class="group" id="time-group">
        <div class="group-title">\u5269\u4F59\u65F6\u95F4</div>
        <div class="rows">
          <div class="row"><span class="row-value"><span class="mono" id="countdown">--:--</span></span></div>
        </div>
      </div>
      <div class="group">
        <div class="paper-head">
          <span class="paper-head__title" id="q-title">\u8BD5\u5377</span>
          <button class="paper-head__open" id="open-paper" type="button">\u67E5\u770B</button>
        </div>
        <div class="q-grid" id="q-list"></div>
        <div class="empty hidden" id="q-empty">\u8FD8\u6CA1\u6709\u9898\u76EE</div>
      </div>
    </section>
  </div>
  <div class="foot hidden" id="foot">
    <button class="foot-btn" id="submit-btn" type="button">\u63D0\u4EA4\u4F5C\u7B54</button>
  </div>
</div>
<script nonce="${e}">
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
  /* \u5DF2\u4EA4\u5377\uFF1A\u5012\u8BA1\u65F6\u505C\u6B62\uFF0C\u4E0D\u518D\u8DF3\u5230\u300C\u5DF2\u5230\u65F6\u300D\u3002 */
  if (model.submitted) { el.textContent = "\u5DF2\u4EA4\u5377"; el.classList.remove("is-over"); return; }
  if (model.deadlineAtMs === null) { el.textContent = "\u4E0D\u9650\u65F6"; el.classList.remove("is-over"); return; }
  const left = model.deadlineAtMs - Date.now();
  if (left <= 0) {
    el.textContent = "\u5DF2\u5230\u65F6";
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
  if (!model || !model.answering || model.submitted) return;
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
  $("submit-btn").classList.toggle("hidden", !on || inQuestion);
  if (on && model.submitted) {
    const btn = $("submit-btn");
    btn.disabled = true;
    btn.dataset.state = "done";
    btn.textContent = "\u5DF2\u4EA4\u5377";
  }
  const title = $("q-title");
  if (title) title.textContent = (model && model.paperTitle) || "\u8BD5\u5377";
  const list = $("q-list");
  const empty = $("q-empty");
  /*
   * \u5012\u8BA1\u65F6\u5148\u8DD1\u8D77\u6765\uFF1A\u8BD5\u5377\u8FD8\u6CA1\u89E3\u6790\u51FA\u6765\uFF08\u9898\u76EE\u4E3A\u7A7A\uFF09\u65F6\u4E5F\u8981\u8BA1\u65F6\uFF0C
   * \u4E0D\u80FD\u7B49\u9898\u76EE\u51FA\u73B0\u624D\u5F00\u59CB\u7B97 \u2014\u2014 \u90A3\u4F1A\u8BA9\u300C\u5DF2\u8FDB\u5165\u300D\u7684\u524D\u51E0\u79D2\u4E0D\u8BA1\u5165\u8003\u8BD5\u3002
   * \u5DF2\u4EA4\u5377\u5219\u505C\u8868\uFF0C\u5237\u65B0\u540E\u4E5F\u4E0D\u518D\u8D70\u300C\u5DF2\u5230\u65F6\u300D\u3002
   */
  if (on && model.submitted) {
    stopTimer();
    const countdown = $("countdown");
    if (countdown) {
      countdown.textContent = "\u5DF2\u4EA4\u5377";
      countdown.classList.remove("is-over");
    }
  } else if (on) {
    startTimer();
  } else {
    stopTimer();
  }
  const items = (model && model.questions) || [];
  /* \u9898\u53F7\u7F51\u683C\u53EA\u5728\u5185\u5BB9\u53D8\u5316\u65F6\u91CD\u5EFA\uFF1A4 \u79D2\u8F6E\u8BE2 / \u70B9\u51FB\u9898\u53F7\u89E6\u53D1\u5237\u65B0\u65F6\u4E0D\u518D\u6574\u5757\u95EA\u70C1\u3002 */
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

let submitResetTimer = null;
function setSubmit(state, message){
  /* \u63D0\u4EA4\u72B6\u6001\u53EA\u5728\u6309\u94AE\u5185\u53D8\u5316\uFF1A\u4E0D\u53E6\u8D77\u72B6\u6001\u884C\uFF1B\u5931\u8D25\u6001\u77ED\u6682\u505C\u7559\u540E\u590D\u539F\u3002 */
  const btn = $("submit-btn");
  if (!btn) return;
  if (submitResetTimer !== null) { clearTimeout(submitResetTimer); submitResetTimer = null; }
  if (state === "running") { btn.disabled = true; btn.dataset.state = "running"; btn.textContent = "\u6B63\u5728\u4EA4\u5377\u2026"; return; }
  if (state === "failed") {
    btn.disabled = false;
    btn.dataset.state = "failed";
    btn.textContent = "\u4EA4\u5377\u5931\u8D25\uFF0C\u91CD\u8BD5";
    submitResetTimer = setTimeout(() => {
      submitResetTimer = null;
      if (!btn.disabled) { btn.dataset.state = ""; btn.textContent = "\u63D0\u4EA4\u4F5C\u7B54"; }
    }, 2600);
    return;
  }
  if (state === "done") {
    btn.disabled = true;
    btn.dataset.state = "done";
    btn.textContent = message || "\u5DF2\u4EA4\u5377";
    stopTimer();
    const countdown = $("countdown");
    if (countdown) {
      countdown.textContent = "\u5DF2\u4EA4\u5377";
      countdown.classList.remove("is-over");
    }
    return;
  }
  btn.disabled = false; btn.dataset.state = ""; btn.textContent = "\u63D0\u4EA4\u4F5C\u7B54";
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
<\/script></body></html>`}},x=c(o=>{let e=/^\s*content:\s*(.+?)\s*$/m.exec(o);return e===null?"":(e[1]??"").replace(/\s+#.*$/,"").trim().replace(/^["']|["']$/g,"")},"paperPathOf"),O=c((o,e)=>{let t=/^---[\s\S]*?\n---/.exec(o)?.[0]??"",n=/^title:\s*(?:"([^"]+)"|'([^']+)'|([^\s#]+))\s*$/m.exec(t),i=(n?.[1]??n?.[2]??n?.[3]??"").trim();return i.length>0?i:(e.split("/").pop()??"").replace(/\.paper$/i,"")},"paperTitleOf"),z=c((o,e)=>{let t=new RegExp(`^\\s*${String(e)}[.)]\\s+`,"gm"),n=-1,i=t.exec(o);for(;i!==null;)n=i.index,i=t.exec(o);return n>=0?o.slice(n):o},"stemForNumber"),N=c(o=>{let e=[],t=/^\s*[-*+]\s*\[[^\]]*\]\(([^)]+)\)\s*$/gm,n=t.exec(o);for(;n!==null;){let i=(n[1]??"").trim().replace(/^<|>$/g,"");i.length>0&&!/^[a-z]+:/i.test(i)&&!i.startsWith("/")&&!i.includes("..")&&e.push(i.replace(/\/+$/,"")),n=t.exec(o)}return e},"projectPaths"),Q=c(async(o,e,t)=>{let n=new Set([".git","node_modules",".sumi",".opencode","logs",".tmp","target","build","dist","out",".gradle",".mvn",".idea",".vscode"]),i=[s.Uri.joinPath(o,...e.split("/"))];for(;i.length>0;){let r=i.pop();if(r===void 0)continue;let a;try{a=await s.workspace.fs.readDirectory(r)}catch{continue}for(let[d,l]of a){if((l&s.FileType.Directory)!==0){n.has(d)||i.push(s.Uri.joinPath(r,d));continue}try{if((await s.workspace.fs.stat(s.Uri.joinPath(r,d))).mtime>t)return!0}catch{}}}return!1},"projectChanged"),W=c(async(o,e,t)=>{let n=[],i=/^:::([a-z-]+)#(\d+)\s*$/gm,r=0,a=i.exec(o);for(;a!==null;){let d=Number(a[2]),l=o.slice(r,a.index),u=J(P(l)),b=a.index+a[0].length,y=o.indexOf(`
:::`,b),h=o.slice(b,y<0?o.length:y).trim().length>0;if(!h&&a[1]==="engineering"&&t>0){for(let T of N(z(P(l),d)))if(await Q(e,T,t)){h=!0;break}}n.push({number:d,title:u.length>0?u:`\u7B2C ${String(d)} \u9898`,answered:h}),r=b,a=i.exec(o)}return n},"parseQuestions"),P=c(o=>{let e=o.replace(/^---[\s\S]*?\n---\s*/,""),t=e.lastIndexOf(`
## `);return(t>=0?e.slice(t+1):e).split(/\r?\n/).filter(i=>!/^#{1,6}\s/.test(i.trim())&&!/^---\s*$/.test(i.trim())).join(`
`)},"stemOf"),J=c(o=>{for(let e of o.split(/\r?\n/)){let t=e.trim();if(!(t.length===0||/^:::/.test(t)||/^[-*+]\s/.test(t)||/^!\[/.test(t)||/^```/.test(t)))return t.replace(/^>\s*/,"").replace(/^\d+[.)]\s*/,"").slice(0,60)}return""},"firstLineOf");function V(o){o.subscriptions.push(s.window.registerWebviewViewProvider(A,new m))}c(V,"activate");
