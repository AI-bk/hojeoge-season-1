// 영어판: 사전이 최신인지, 모아 둔 화면 문장이 모두 번역됐는지, 화면 바꾸기와 음성 원문 보존이 되는지
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const root=require('node:path').resolve(__dirname,'..')+'/';
const before=fs.readFileSync(root+'site/i18n/en.js','utf8');
execFileSync('node',[root+'tools/i18n-build.cjs'],{stdio:'ignore'});
assert.equal(fs.readFileSync(root+'site/i18n/en.js','utf8'),before,'site/i18n/en.js is stale: run node tools/i18n-build.cjs');
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(before,ctx);const D=ctx.window.I18N_EN;
const seen=JSON.parse(fs.readFileSync(root+'docs/i18n/ko-sentences.json','utf8'));
for(const [k,list] of Object.entries(seen)){const miss=list.filter(s=>D[s]==null);assert.equal(miss.length,0,k+' untranslated: '+miss.slice(0,3).join(' / '));}
for(const [ko,en] of Object.entries(D)){assert.ok(en.trim(),'empty translation for '+ko);assert.doesNotMatch(en,/[가-힣]/,'Hangul left in translation of '+ko);}
// 화면 층: 아주 작은 DOM으로 i18n.js를 영어 모드에서 돌린다
function el(tag,text){const e={nodeType:1,tagName:tag,attrs:{},childNodes:[],parentNode:null,hasAttribute(a){return a in this.attrs},getAttribute(a){return this.attrs[a]??null},setAttribute(a,v){this.attrs[a]=String(v)},closest(){return null},append(c){c.parentNode=this;this.childNodes.push(c)}};if(text!=null)e.append({nodeType:3,nodeValue:text,parentNode:e});return e;}
const q=el('Q','“관아에서 쌀을 나눈대.'+' 우리 이름은 호적에 있으니까.”'),who=el('STRONG','이서'),list=el('DD','지친 몸으로 닿았다 · 혼자 왔다');
const body=el('BODY');[q,who,list].forEach(c=>body.append(c));
const all=[];(function walk(n){all.push(n);(n.childNodes||[]).forEach(walk);})(body);
const doc={readyState:'complete',title:'호적에 없는 봄',documentElement:Object.assign(el('HTML'),{lang:'ko',classList:{add(){}}}),addEventListener(){},querySelector(){return null},
  createTreeWalker(){let i=0;const nodes=all.slice(1);return {nextNode(){return nodes[i++]||null}};}};
doc.documentElement.append(body);
const win={MutationObserver:class{observe(){}},NodeFilter:{SHOW_TEXT:4,SHOW_ELEMENT:1,FILTER_REJECT:2,FILTER_ACCEPT:1}};
const c=vm.createContext({window:win,document:doc,location:{search:'?lang=en'},navigator:{languages:['en-US']},localStorage:{getItem(){return null},setItem(){}},MutationObserver:win.MutationObserver,NodeFilter:win.NodeFilter});
win.I18N_EN=D;c.I18N_EN=D;
vm.runInContext(fs.readFileSync(root+'site/i18n.js','utf8').replace("document.write('<script src=\"i18n/en.js\"><\\/script>');",'0;'),c);
assert.equal(doc.documentElement.lang,'en');
assert.equal(q.childNodes[0].nodeValue,D['“관아에서 쌀을 나눈대.']+' '+D['우리 이름은 호적에 있으니까.”']);
assert.equal(q.getAttribute('data-ko'),'“관아에서 쌀을 나눈대. 우리 이름은 호적에 있으니까.”','voice keeps the Korean line');
assert.equal(who.childNodes[0].nodeValue,'Iseo');assert.equal(who.getAttribute('data-ko'),'이서');
assert.equal(list.childNodes[0].nodeValue,'arrived worn out · came alone');
assert.equal(doc.title,'Spring Without a Name');
console.log('PASS: English dictionary up to date, '+Object.values(seen).reduce((n,l)=>n+l.length,0)+' collected screen sentences translated, no Hangul left in English, sentence and "·" list swapping, Korean kept for voice');
