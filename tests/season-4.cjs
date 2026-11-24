// 시즌 4: 시즌 3이 남긴 기록에서 시작해 여덟 막, 네 결말, 일곱 실패 결말, 시즌 5 기록까지
const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');
const vm=require('node:vm');
const root=require('node:path').resolve(__dirname,'../site')+'/';
const source=['season-4-new-slots.js','season-4-story.js','season-4.js'].map(f=>readFileSync(root+f,'utf8'));
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

// 그림 칸 이름: 빌드 도구의 SLOTS4와 같아야 한다
const tool=readFileSync(root+'../tools/build-new-cuts.py','utf8');
const extra=tool.match(/_extra4 = \[([^\]]*)\]/)[1].match(/'([^']+)'/g).map(x=>'S4-'+x.slice(1,-1));
const slotNames=new Set([...Array.from({length:79},(_,i)=>'S4-'+String(i+1).padStart(2,'0')),...extra,...Array.from({length:21},(_,i)=>'S4-F'+String(i+1).padStart(2,'0'))]);
const usedSlots=new Set();
function check(markup,where){
  assert.doesNotMatch(markup,/undefined|NaN|\[object/,where);
  for(const m of markup.matchAll(/data-slot="([^"]+)"/g)){assert.ok(slotNames.has(m[1]),'unknown slot '+m[1]+' at '+where);usedSlots.add(m[1]);}
}
const all=[];for(let n=0;n<6561;n++){const a=[];let x=n;for(let i=0;i<8;i++){a.push(x%3);x=Math.floor(x/3);}all.push(a);}
const endings=new Map(),fates=new Map(),goals=new Map();
for(const rank of [2,3,4,5])for(const done of [true,false]){
  const g=enter(rank,done,['record','voices','seal','pending'][rank-2]);
  const key=g.eval('storageKey');
  // 막마다 모든 선택 앞뒤 화면을 그려 본다(실패하면 그 자리에서 멈춘다)
  const seen=new Set();
  for(const a of all){
    const fall=g.eval('palaceFall4('+JSON.stringify(a)+')');
    const stop=fall?fall.at:8;
    for(let n=0;n<=stop;n++)for(const reaction of n&&n<8?[true,false]:[false]){
      if(n===stop&&!reaction&&n<8&&!fall)continue;
      const id=a.slice(0,n).join('')+(reaction?'r':'');
      if(seen.has(id))continue;seen.add(id);
      storage.set(key,JSON.stringify({answers:a.slice(0,n),reaction}));
      g.run('progress=read(storageKey);render()');
      check(g.dom.markup,rank+done+':'+id);
    }
    if(fall){fates.set(fall.fate,(fates.get(fall.fate)||new Set()).add(rank));continue;}
    const end=g.eval('finalEnding('+JSON.stringify(a)+')');
    endings.set(end,(endings.get(end)||new Set()).add(rank));
    if(g.eval('rankGoalDone4('+JSON.stringify(a)+')'))goals.set(rank,true);
  }
}
for(const e of ['spring','half','yeon','jimil'])assert.deepEqual([...(endings.get(e)||[])].sort(),[2,3,4,5],'ending '+e+' for every rank');
for(const f of ['knot','bolt','poison','forgery','exile','expelled','pawn'])assert.ok(fates.has(f),'fail ending '+f+' reachable');
for(const r of [2,3,4,5])assert.ok(goals.get(r),'rank goal reachable for '+r);
// 신분이 높을수록 실패하기 쉽다
const fallCount=r=>{const g=enter(r,true);return all.filter(a=>g.eval('!!palaceFall4('+JSON.stringify(a)+')')).length;};
const counts=[2,3,4,5].map(fallCount);
assert.ok(counts[0]<counts[3],'royal rank falls more often than commoner: '+counts);
// 그림 칸 목록에 있는데 한 번도 안 쓰이는 칸이 없어야 한다
for(const s of slotNames)assert.ok(usedSlots.has(s),'slot never shown: '+s);

// 한 판을 버튼으로 끝까지: 왕에게 가는 봄 결말, 음악, 시즌 5 기록
let g=enter(3,true);
const path=all.find(a=>g.eval('!palaceFall4('+JSON.stringify(a)+')&&finalEnding('+JSON.stringify(a)+')===\'spring\''));
for(const [i,p] of path.entries()){
  assert.equal(g.globals.querySelector('#score').src,'audio/s4-ost-0'+(i+1)+'.mp3');
  assert.equal(g.choices().length,3);
  g.choices()[p].onclick();
  if(i===7)break;
  assert.match(g.dom.markup,/방금 고른 행동/);
  if(i===3){g.globals.querySelector('#save').onclick();const old=g.dom.markup;g=open();assert.equal(g.dom.markup,old);}
  g.next();
}
assert.match(g.dom.markup,/이름을 돌려받은 봄/);
assert.equal(g.globals.querySelector('#score').src,'audio/s4-ost-e1.mp3');
const five=JSON.parse(storage.get('yeocheon-season-five-v1handoff:'+g.eval('storageKey')));
assert.equal(five.ending,'spring');assert.equal(five.rank,3);
// 덫이 풀리지 않으면 8막에서 왕에게 갈 수 없다
g=enter(2,true);
const trapped=all.map(a=>a.slice(0,7)).find(a=>g.eval('!palaceFall4('+JSON.stringify(a)+')&&!released('+JSON.stringify(a)+')'));
assert.ok(trapped,'a trapped-but-not-expelled path exists');
storage.set(g.eval('storageKey'),JSON.stringify({answers:trapped,reaction:false}));
g=open();
assert.equal(g.eval('released(progress.answers)'),false);
assert.equal(g.choices()[0].disabled,true);
// 실패 결말: 그림 세 칸, 실패 음악, 다시 하기
g=enter(5,true);
storage.set(g.eval('storageKey'),JSON.stringify({answers:[0,1],reaction:true}));
g=open();
assert.match(g.dom.markup,/되감긴 매듭/);
assert.equal((g.dom.markup.match(/data-slot="S4-F0[1-3]"/g)||[]).length,3);
assert.equal(g.globals.querySelector('#score').src,'audio/s4-ost-e5.mp3');
g.dom.querySelector('.verdict').children[0].onclick();
assert.deepEqual(g.eval('progress.answers'),[0]);
// 신분별 그림: '칸@옷'이 있으면 그 신분에서는 그것을, 없으면 공용 칸을 쓴다
{
  const keep=source[0];
  source[0]="var NEW_CUT_SLOTS_4={'S4-13':0,'S4-13@NA':1,'S4-13@OJ':2};var NEW_CUT_ROWS_4=1;";
  for(const [rank,done,want] of [[4,true,'S4-13@NA'],[5,true,'S4-13@OJ'],[5,false,'S4-13'],[2,true,'S4-13']]){
    const g=enter(rank,done);
    assert.match(g.dom.markup,new RegExp('data-cut="'+want+'"'),rank+' '+done+' uses '+want);
  }
  source[0]=keep;
}
// 음악 파일이 모두 있다
for(const t of ['00','01','02','03','04','05','06','07','08','e1','e2','e3','e4','e5'])assert.ok(existsSync(root+'audio/s4-ost-'+t+'.mp3'),t);
console.log('PASS: S3 handoff and fallback, all prefixes render for 8 rank/goal starts, 4 endings per rank, 7 fail endings, rank goals, harsher for higher rank ('+counts+'), every image slot used, button playthrough with save/reload, S5 handoff, music');
