// 시즌 4(Claude 설계판, 완결): 시즌 3 기록에서 시작해 일곱 막 + 왕·대비 선택 + 마지막 조건, 결말 다섯 가지(E1~E5)
const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');
const vm=require('node:vm');
const root=require('node:path').resolve(__dirname,'../site')+'/';
const source=['season-4-new-slots.js','season-4-story.js','season-4-art.js','season-4.js'].map(f=>readFileSync(root+f,'utf8'));
// season-4.html이 같은 순서로 불러와야 한다
const html=readFileSync(root+'season-4.html','utf8');
const order=['season-4-new-slots.js','season-4-story.js','season-4-art.js','season-4.js'].map(f=>html.indexOf('src="'+f+'"'));
assert.ok(order.every((p,i)=>p>0&&(i===0||p>order[i-1])),'script order in season-4.html');
const storage=new Map();
function node(){
  return {
    children:[],append(...c){this.children.push(...c)},
    set innerHTML(s){this.markup=s;this.children=[];this.selectors=new Map()},
    get innerHTML(){return this.markup},
    querySelector(s){if(!this.selectors)this.selectors=new Map();if(!this.selectors.has(s))this.selectors.set(s,node());return this.selectors.get(s)},
    focus(){},setAttribute(){},paused:true,
    play(){this.paused=false;return Promise.resolve()},pause(){this.paused=true}
  };
}
function open(){
  const globals=node();
  const context=vm.createContext({
    document:{querySelector:k=>globals.querySelector(k),createElement:node,addEventListener(){}},
    window:{scrollTo(){}},
    localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),get length(){return storage.size},key:i=>[...storage.keys()][i]??null}
  });
  for(const s of source)vm.runInContext(s,context);
  const dom=globals.querySelector('#reader');
  const run=s=>vm.runInContext(s,context);
  return {dom,globals,run,eval:s=>JSON.parse(run('JSON.stringify('+s+')')),
    choices:()=>dom.querySelector('.decision .frame-body').children.find(c=>c.className==='choices')?.children??[],
    next(){dom.children.at(-1).children.at(-1).onclick()}
  };
}
const S3KEY='yeocheon-season-three-v1progress:demo';
function enter(rank,done,verdict='record',pointer=true){
  storage.clear();
  storage.set('yeocheon-season-four-v1handoff:'+S3KEY,JSON.stringify({version:1,rank,verdict,rankGoal:{name:'목표',done},entry:'궁',journey:null,witness:null,answers:[0,0,0,0,0,0,0,0]}));
  if(pointer)storage.set('yeocheon-season-four-v1latest',JSON.stringify(S3KEY));
  return open();
}
// 시즌 3 기록이 없으면 시즌 3로 돌려보낸다
storage.clear();
const none=open();
assert.match(none.dom.markup,/href="season-3.html"/);
assert.equal(none.globals.querySelector('#score').src,'audio/s4-ost-00.mp3');
// 가리키는 열쇠가 없어도 남은 기록을 찾아 시작한다
assert.match(enter(4,true,'voices',false).dom.markup,/문 안의 첫날/);

// 모든 경로의 모든 화면을 그려 본다. 그림이 빠진 칸, undefined 같은 글자가 없어야 한다.
const slots=new Set(Object.keys(JSON.parse(open().run('JSON.stringify(NEW_CUT_SLOTS_4)'))));
const usedCuts=new Set();
function check(markup,where){
  assert.doesNotMatch(markup,/undefined|NaN|\[object|null/,where);
  assert.doesNotMatch(markup,/no-art/,'frame without picture at '+where);
  for(const m of markup.matchAll(/data-cut="([^"]+)"/g))usedCuts.add(m[1]);
}
const endings=new Map(),fates=new Map();
const verdicts=['record','voices','seal','pending'];
let screens=0;
for(const rank of [2,3,4,5])for(const done of [true,false])for(const verdict of verdicts){
  const g=enter(rank,done,verdict),key=g.eval('storageKey'),seen=new Set();
  const show=(a,reaction)=>{
    const id=a.join('')+(reaction?'r':'');
    if(seen.has(id))return;seen.add(id);
    storage.set(key,JSON.stringify({answers:a,reaction}));
    g.run('progress=read(storageKey);render()');
    check(g.dom.markup,rank+':'+done+':'+verdict+':'+id);
    screens++;
  };
  const walk=a=>{
    const r=g.eval('resolve4(handoff,'+JSON.stringify(a)+')');
    if(r){
      show(a,false);
      const k=r.ending==='E5'?r.fate:r.ending;
      (r.ending==='E5'?fates:endings).set(k,(((r.ending==='E5'?fates:endings).get(k))||new Set()).add(rank+':'+done));
      return;
    }
    show(a,false);
    if(a.length>0&&a.length<=7)show(a,true);
    const n=a.length<7?3:2;
    for(let p=0;p<n;p++)walk([...a,p]);
  };
  walk([]);
}
for(const e of ['E1','E2','E3','E4'])assert.equal((endings.get(e)||new Set()).size,8,'ending '+e+' for every start');
for(const f of ['tea','bargain','needle','seal','yeoni','trap','empty','refused'])assert.ok(fates.has(f),'fail ending '+f+' reachable');
// 묶음에 들어간 그림은 모두 어딘가에서 보인다(쓰이지 않는 그림을 싣지 않는다)
for(const s of slots)assert.ok(usedCuts.has(s),'packed cut never shown: '+s);
// 옹주가 아닌 처지에서는 유튜브판(옹주 옷) 핵심 장면 대신 처지별 그림이 나온다
{
  const g=enter(2,true);
  assert.equal(g.eval("art4('S4-R035',handoff)"),'S4-KR035-MU');
  const r=enter(5,true);
  assert.equal(r.eval("art4('S4-R035',handoff)"),'S4-R035');
}

// 한 판을 버튼으로 끝까지: 이름을 돌려받은 봄(E1), 음악, 저장·불러오기
let g=enter(3,true);
const win=(()=>{const all=[];const go=a=>{const r=g.eval('resolve4(handoff,'+JSON.stringify(a)+')');if(r){if(r.ending==='E1')all.push(a);return;}for(let p=0;p<(a.length<7?3:2);p++)go([...a,p]);};go([]);return all[0];})();
assert.ok(win,'E1 path exists');
for(const [i,p] of win.entries()){
  if(i<7){
    assert.equal(g.globals.querySelector('#score').src,'audio/s4-ost-0'+(i+1)+'.mp3');
    assert.equal(g.choices().length,3);
    g.choices()[p].onclick();
    assert.match(g.dom.markup,/방금 고른 행동/);
    if(i===3){g.globals.querySelector('#save').onclick();const old=g.dom.markup;g=open();assert.equal(g.dom.markup,old);}
    g.next();
  }else{
    assert.equal(g.globals.querySelector('#score').src,'audio/s4-ost-08.mp3');
    assert.equal(g.choices().length,2);
    g.choices()[p].onclick();
  }
}
assert.match(g.dom.markup,/이름을 돌려받은 봄/);
assert.match(g.dom.markup,/완결/);
assert.equal(g.globals.querySelector('#score').src,'audio/s4-ost-e1.mp3');
// 실패 결말: 실패 음악, 방금 고른 선택 다시 하기
g=enter(5,true);
const fallAt=(()=>{const go=a=>{const r=g.eval('resolve4(handoff,'+JSON.stringify(a)+')');if(r)return r.ending==='E5'&&r.at<=7?a:null;for(let p=0;p<3;p++){const x=go([...a,p]);if(x)return x;}return null;};return go([]);})();
storage.set(g.eval('storageKey'),JSON.stringify({answers:fallAt,reaction:true}));
g=open();
assert.match(g.dom.markup,/궁에서 밀려나다/);
assert.equal(g.globals.querySelector('#score').src,'audio/s4-ost-e5.mp3');
g.dom.querySelector('.verdict').children[0].onclick();
assert.deepEqual(g.eval('progress.answers'),fallAt.slice(0,-1));
// 음악 파일이 모두 있다
for(const t of ['00','01','02','03','04','05','06','07','08','e1','e2','e3','e4','e5'])assert.ok(existsSync(root+'audio/s4-ost-'+t+'.mp3'),t);
console.log('PASS: S3 handoff and fallback, '+screens+' screens for 8 starts x 4 verdicts, E1-E4 for every start, 8 fail endings, every packed cut shown, costume art, button playthrough with save/reload, music');
