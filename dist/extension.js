"use strict";var E=Object.create;var h=Object.defineProperty;var q=Object.getOwnPropertyDescriptor;var C=Object.getOwnPropertyNames;var R=Object.getPrototypeOf,A=Object.prototype.hasOwnProperty;var c=(s,e)=>h(s,"name",{value:e,configurable:!0});var I=(s,e)=>{for(var t in e)h(s,t,{get:e[t],enumerable:!0})},M=(s,e,t,n)=>{if(e&&typeof e=="object"||typeof e=="function")for(let r of C(e))!A.call(s,r)&&r!==t&&h(s,r,{get:()=>e[r],enumerable:!(n=q(e,r))||n.enumerable});return s};var L=(s,e,t)=>(t=s!=null?E(R(s)):{},M(e||!s||!s.__esModule?h(t,"default",{value:s,enumerable:!0}):t,s)),_=s=>M(h({},"__esModule",{value:!0}),s);var ee={};I(ee,{AnswerProvider:()=>w,activate:()=>Z});module.exports=_(ee);var i=L(require("vscode"));var F="numas.exam.answer.view",$=".sumi/state.json";var k=".sumi/workspace.conf",P=".opencode/tools/repo-submit.mjs",D=".sumi/repo-submit.json",N=500,z=180*1e3,O=4e3,Q=c(async()=>{let s=i.workspace.workspaceFolders?.[0]?.uri;for(let e=0;s!==void 0&&e<6;e+=1){try{let n=await i.workspace.fs.readFile(i.Uri.joinPath(s,".sumi","settings.json")),r=JSON.parse(new TextDecoder("utf-8").decode(n));if(typeof r=="object"&&r!==null){let o=r["numas.page.mode"];return typeof o=="string"?o:void 0}return}catch{}let t=i.Uri.joinPath(s,"..");if(t.toString()===s.toString())break;s=t}},"readPageMode");var v=c(async()=>{let s=i.workspace.workspaceFolders?.[0]?.uri;for(let e=0;s!==void 0&&e<6;e+=1){try{return await i.workspace.fs.stat(i.Uri.joinPath(s,...$.split("/"))),s}catch{}let t=i.Uri.joinPath(s,"..");if(t.toString()===s.toString())break;s=t}},"resolveExamRoot"),S={answering:!1,autoSubmit:!0,submitted:!1,deadlineAtMs:null,branch:"",inQuestion:!1,questions:[],refs:[],paperTitle:"",grades:[],graded:!1,gradeTotal:0,gradeMax:0},w=class{static{c(this,"AnswerProvider")}view;timer;submitting=!1;paperUri;dispose(){this.timer!==void 0&&(clearInterval(this.timer),this.timer=void 0)}resolveWebviewView(e){this.timer!==void 0&&(clearInterval(this.timer),this.timer=void 0),this.view=e,e.onDidDispose(()=>{this.view===e&&(this.view=void 0),this.timer!==void 0&&(clearInterval(this.timer),this.timer=void 0)}),e.webview.options={enableScripts:!0},e.webview.html=this.html(),e.webview.onDidReceiveMessage(n=>{if(typeof n!="object"||n===null)return;let r=n;if(r.type==="ready"){this.refresh();return}if(r.type==="submit"){this.submit(r.auto===!0).catch(o=>{this.post({type:"submitProgress",state:"failed",message:`\u4EA4\u5377\u5931\u8D25\uFF1A${o instanceof Error?o.message:String(o)}`})});return}if(r.type==="openPaper"){this.backToPaper();return}if(r.type==="openRef"&&typeof n.name=="string"){this.openRef(n.name);return}r.type==="reveal"&&typeof n.number=="number"&&this.revealQuestion(n.number)}),this.timer=setInterval(()=>void this.refresh(),O);let t=i.window.onDidChangeActiveTextEditor(()=>void this.refresh());e.onDidDispose(()=>t.dispose()),this.refresh()}async read(e){try{return new TextDecoder("utf-8").decode(await i.workspace.fs.readFile(e))}catch{return}}async exists(e){return await this.read(e)!==void 0}post(e){let t=this.view?.webview;t?.postMessage(e)}lastModelJson="";async refresh(){if(this.view===void 0)return;let e=await this.load(),t=JSON.stringify(e);t!==this.lastModelJson&&(this.lastModelJson=t,this.post({type:"model",model:e}))}async load(){if(await Q()!=="answer")return S;let e=await v();if(e===void 0)return S;let t=await this.session(e);if(t===void 0)return S;let n=await this.read(i.Uri.joinPath(e,...k.split("/"))),r=n===void 0?"":T(n);r.length>0&&(this.paperUri=i.Uri.joinPath(e,...r.split("/")));let o=r.length===0?void 0:await this.read(i.Uri.joinPath(e,...r.split("/"))),a=i.window.activeTextEditor?.document.uri,d=a!==void 0&&a.scheme==="file"&&a.toString()!==e.toString()&&a.fsPath.startsWith(`${e.fsPath}/`)&&!/\.paper$/i.test(a.fsPath),u=o===void 0?"":/^---[\s\S]*?\n---/.exec(o)?.[0]??"",m=J(u),p=V(u),f=[...new Set([...m.keys(),...p.keys()])].sort((l,b)=>Number(l)-Number(b)).map(l=>({number:l,score:p.get(l)?.score??null,comment:p.get(l)?.comment??"",max:m.get(l)??0})),g=f.some(l=>l.score!==null||l.comment.length>0),y=Number.isFinite(Date.parse(t.firstEnteredAt))?Date.parse(t.firstEnteredAt):0,j=await this.autoSubmit(e);return{answering:!0,autoSubmit:j,submitted:j&&await this.submitted(e),inQuestion:d,deadlineAtMs:t.deadlineAt.length===0||!Number.isFinite(Date.parse(t.deadlineAt))?null:Date.parse(t.deadlineAt),branch:await this.branch(e),questions:o===void 0?[]:await K(o,e,y),refs:await this.references(e),paperTitle:o===void 0?"":W(o,r),grades:f,graded:g,gradeTotal:f.reduce((l,b)=>l+(b.score??0),0),gradeMax:f.reduce((l,b)=>l+b.max,0)}}async submitted(e){try{let t=await this.read(i.Uri.joinPath(e,".sumi","repo-submit.json"));if(t===void 0)return!1;let n=JSON.parse(t);return typeof n=="object"&&n!==null&&n.ok===!0}catch{return!1}}async autoSubmit(e){try{let t=await this.read(i.Uri.joinPath(e,".sumi","settings.json"));if(t===void 0)return!0;let n=JSON.parse(t);if(typeof n=="object"&&n!==null)return n["numas.answer.autoSubmit"]!==!1}catch{}return!0}async references(e){try{return(await i.workspace.fs.readDirectory(i.Uri.joinPath(e,"references"))).filter(([,n])=>(n&i.FileType.File)!==0).map(([n])=>n).sort((n,r)=>n.localeCompare(r))}catch{return[]}}async session(e){let t=await this.read(i.Uri.joinPath(e,...$.split("/")));if(t!==void 0)try{let n=JSON.parse(t);if(typeof n!="object"||n===null)return;let r=n.behaviors;if(!Array.isArray(r))return;let o=r.find(d=>typeof d=="object"&&d!==null&&d.event==="exam.enter");if(o===void 0)return;let a=typeof o.timestamp=="string"?o.timestamp:"";return a.length===0?void 0:{firstEnteredAt:a,deadlineAt:typeof o.content=="string"?o.content:""}}catch{return}}async branch(e){let t=await this.read(i.Uri.joinPath(e,".git","HEAD"));if(t===void 0)return"";let n=/^ref:\s*refs\/heads\/(.+)\s*$/m.exec(t);return n===null?"":(n[1]??"").trim()}async openRef(e){let t=await v();if(t===void 0||e.trim().length===0)return;let n=i.Uri.joinPath(t,"references",e.trim());try{await i.commands.executeCommand("vscode.open",n,{preview:!1})}catch{}}async revealQuestion(e){try{if(await i.commands.executeCommand("numas.paper.reveal",String(e))===!0)return}catch{}let t=await v();if(t===void 0)return;let n=await this.read(i.Uri.joinPath(t,...k.split("/"))),r=n===void 0?"":T(n);if(r.length===0)return;let o=i.Uri.joinPath(t,...r.split("/"));try{await i.commands.executeCommand("numas.paper.open",o.toString()),await i.commands.executeCommand("numas.paper.reveal",String(e))}catch{}}async backToPaper(){let e=await v(),t=this.paperUri;if(t===void 0&&e!==void 0){let n=await this.read(i.Uri.joinPath(e,...k.split("/"))),r=n===void 0?"":T(n);r.length>0&&(t=i.Uri.joinPath(e,...r.split("/")))}if(t!==void 0)try{await i.commands.executeCommand("numas.paper.exitProject").then(void 0,()=>{}),await i.commands.executeCommand("numas.paper.open",t.toString()).then(r=>r===!0,()=>!1)||await i.commands.executeCommand("vscode.openWith",t,"numas.paper",{preview:!1}).then(void 0,()=>{}),await i.commands.executeCommand("editor.focusActiveEditorGroup").then(void 0,()=>{})}catch(n){i.window.showWarningMessage(`\u6253\u5F00\u8BD5\u5377\u5931\u8D25\uFF1A${n instanceof Error?n.message:String(n)}`)}}async submit(e){if(this.submitting)return;let t=await v();if(t===void 0)throw new Error("\u5F53\u524D\u5DE5\u4F5C\u533A\u4E0D\u53EF\u7528");if(!await this.exists(i.Uri.joinPath(t,...P.split("/"))))throw new Error(`\u5DE5\u4F5C\u533A\u91CC\u6CA1\u6709\u63D0\u4EA4\u5DE5\u5177\uFF08${P}\uFF09`);if(await this.submitted(t)){this.post({type:"submitProgress",state:"done",message:"\u5DF2\u4EA4\u5377"});return}this.submitting=!0,this.post({type:"submitProgress",state:"running",message:"\u6B63\u5728\u4EA4\u5377\u2026"});try{let n=i.Uri.joinPath(t,...D.split("/"));await i.workspace.fs.delete(n,{useTrash:!1}).then(void 0,()=>{});let r=`node ${P}`;await i.commands.executeCommand("numas.ui.background.run",{text:r,cwd:t.fsPath,name:"\u4EA4\u5377"});let o=await this.waitForSubmit(n);if(!o.ok)throw new Error(o.error.length>0?o.error:"\u4EA4\u5377\u5931\u8D25\uFF1A\u6CA1\u6709\u6536\u5230\u7ED3\u679C\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");this.post({type:"submitProgress",state:"done",message:"\u5DF2\u4EA4\u5377"}),await this.refresh()}finally{this.submitting=!1}}async waitForSubmit(e){let t=Date.now()+z;for(;Date.now()<t;){await new Promise(a=>setTimeout(a,N));let n=await this.read(e);if(n===void 0||n.trim().length===0)continue;let r;try{r=JSON.parse(n)}catch{continue}if(typeof r!="object"||r===null)continue;let o=r;if(o.ok===!0)return{ok:!0,branch:typeof o.branch=="string"?o.branch:""};if(o.ok===!1)return{ok:!1,error:typeof o.error=="string"?o.error:""}}return{ok:!1,error:"\u63D0\u4EA4\u8D85\u65F6\uFF1A\u7EC8\u7AEF\u5DE5\u5177\u53EF\u80FD\u4ECD\u5728\u8FD0\u884C\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5"}}html(){let e=String(Date.now());return`<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8" />
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
/* \u6210\u7EE9\uFF1A\u8001\u5E08\u9605\u5377\u540E\u5199\u8FDB .paper frontmatter\uFF0C\u5B66\u751F\u5728\u8FD9\u91CC\u770B\u5206\u6570\u4E0E\u8BC4\u8BED\u3002 */
.grade-item{margin:0 10px;padding:7px 0;border-top:1px solid var(--line)}
.grade-item:first-child{border-top:0}
.grade-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font-size:12px;color:var(--muted)}
.grade-score{color:var(--accent);font-weight:600;font-variant-numeric:tabular-nums}
.grade-comment{margin-top:2px;font-size:12px;line-height:1.5;color:#2f2a26;word-break:break-word}
.grade-total{color:var(--accent);font-size:14px;font-weight:600;font-variant-numeric:tabular-nums}
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
      <div class="group hidden" id="grade-group">
        <div class="group-title">\u6210\u7EE9</div>
        <div class="rows">
          <div class="row"><span class="row-label">\u603B\u5206</span><span class="row-value"><span class="grade-total" id="grade-total">\u2014</span></span></div>
        </div>
        <div id="grade-list"></div>
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
   */
  if (on) startTimer();
  renderGrades();
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
  if (state === "done") { btn.disabled = true; btn.dataset.state = "done"; btn.textContent = message || "\u5DF2\u4EA4\u5377"; return; }
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
<\/script></body></html>`}},T=c(s=>{let e=/^\s*content:\s*(.+?)\s*$/m.exec(s);return e===null?"":(e[1]??"").replace(/\s+#.*$/,"").trim().replace(/^["']|["']$/g,"")},"paperPathOf"),W=c((s,e)=>{let t=/^---[\s\S]*?\n---/.exec(s)?.[0]??"",n=/^title:\s*(?:"([^"]+)"|'([^']+)'|([^\s#]+))\s*$/m.exec(t),r=(n?.[1]??n?.[2]??n?.[3]??"").trim();return r.length>0?r:(e.split("/").pop()??"").replace(/\.paper$/i,"")},"paperTitleOf"),J=c(s=>{let e=new Map,t=!1;for(let n of s.split(/\r?\n/)){if(/^scores:\s*$/.test(n)){t=!0;continue}if(!t)continue;if(!/^\s+\S/.test(n)){t=!1;continue}let r=/^\s*"?([^":]+)"?\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*$/.exec(n);r!==null&&e.set((r[1]??"").trim(),Number(r[2]))}return e},"parseScores"),V=c(s=>{let e=new Map,t=!1,n="";for(let r of s.split(/\r?\n/)){if(/^grades:\s*$/.test(r)){t=!0;continue}if(!t)continue;if(!/^\s/.test(r)){t=!1;continue}let o=/^\s{2}"?([^":]+)"?:\s*$/.exec(r);if(o!==null){n=(o[1]??"").trim(),e.set(n,{score:null,comment:""});continue}let a=/^\s{4}(score|comments):\s*(.*)$/.exec(r);if(a===null||n.length===0)continue;let d=e.get(n);if(d!==void 0)if(a[1]==="score"){let u=Number(a[2]);d.score=Number.isFinite(u)?u:null}else d.comment=G(a[2]??"")}return e},"parseGrades"),G=c(s=>{let e=s.trim();if(e.length>=2&&e.startsWith('"')&&e.endsWith('"'))try{return JSON.parse(e)}catch{return e.slice(1,-1)}return e},"unquote"),H=c((s,e)=>{let t=new RegExp(`^\\s*${String(e)}[.)]\\s+`,"gm"),n=-1,r=t.exec(s);for(;r!==null;)n=r.index,r=t.exec(s);return n>=0?s.slice(n):s},"stemForNumber"),B=c(s=>{let e=[],t=/^\s*[-*+]\s*\[[^\]]*\]\(([^)]+)\)\s*$/gm,n=t.exec(s);for(;n!==null;){let r=(n[1]??"").trim().replace(/^<|>$/g,"");r.length>0&&!/^[a-z]+:/i.test(r)&&!r.startsWith("/")&&!r.includes("..")&&e.push(r.replace(/\/+$/,"")),n=t.exec(s)}return e},"projectPaths"),Y=c(async(s,e,t)=>{let n=new Set([".git","node_modules",".sumi",".opencode","logs",".tmp","target","build","dist","out",".gradle",".mvn",".idea",".vscode"]),r=[i.Uri.joinPath(s,...e.split("/"))];for(;r.length>0;){let o=r.pop();if(o===void 0)continue;let a;try{a=await i.workspace.fs.readDirectory(o)}catch{continue}for(let[d,u]of a){if((u&i.FileType.Directory)!==0){n.has(d)||r.push(i.Uri.joinPath(o,d));continue}try{if((await i.workspace.fs.stat(i.Uri.joinPath(o,d))).mtime>t)return!0}catch{}}}return!1},"projectChanged"),K=c(async(s,e,t)=>{let n=[],r=/^:::([a-z-]+)#(\d+)\s*$/gm,o=0,a=r.exec(s);for(;a!==null;){let d=Number(a[2]),u=s.slice(o,a.index),m=X(U(u)),p=a.index+a[0].length,x=s.indexOf(`
:::`,p),g=s.slice(p,x<0?s.length:x).trim().length>0;if(!g&&a[1]==="engineering"&&t>0){for(let y of B(H(U(u),d)))if(await Y(e,y,t)){g=!0;break}}n.push({number:d,title:m.length>0?m:`\u7B2C ${String(d)} \u9898`,answered:g}),o=p,a=r.exec(s)}return n},"parseQuestions"),U=c(s=>{let e=s.replace(/^---[\s\S]*?\n---\s*/,""),t=e.lastIndexOf(`
## `);return(t>=0?e.slice(t+1):e).split(/\r?\n/).filter(r=>!/^#{1,6}\s/.test(r.trim())&&!/^---\s*$/.test(r.trim())).join(`
`)},"stemOf"),X=c(s=>{for(let e of s.split(/\r?\n/)){let t=e.trim();if(!(t.length===0||/^:::/.test(t)||/^[-*+]\s/.test(t)||/^!\[/.test(t)||/^```/.test(t)))return t.replace(/^>\s*/,"").replace(/^\d+[.)]\s*/,"").slice(0,60)}return""},"firstLineOf");function Z(s){s.subscriptions.push(i.window.registerWebviewViewProvider(F,new w))}c(Z,"activate");
