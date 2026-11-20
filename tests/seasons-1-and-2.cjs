const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
const root=require('node:path').resolve(__dirname,'../site')+'/';
const s1=fs.readFileSync(root+'season-1.js','utf8');
const s2=['season-2-story.js','season-2.js'].map(f=>fs.readFileSync(root+f,'utf8'));
const storage=new Map(), s1key='yeocheon-season-one-v1progress';
function open(scripts){
 const node=()=>({children:[],append(child){this.children.push(child)},set innerHTML(v){this.html=v;this.children=[]},querySelector(){return{focus(){}}},insertAdjacentHTML(where,html){assert.equal(where,'afterbegin');this.html=html+this.html},setAttribute(){},paused:true,addEventListener(event,handler){if(event==="click")this.handler=handler},play(){this.paused=false;return Promise.resolve()},pause(){this.paused=true}});
 const els=Object.fromEntries(['#reader','#reset','#music','#music-toggle','#score','#save-progress','#load-progress','#save-status','#save','#load','#status','#count'].map(id=>[id,node()]));
 const ctx=vm.createContext({document:{querySelector:id=>els[id],createElement:node},window:{scrollTo(){}},localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)}});
 for(const script of scripts)vm.runInContext(script,ctx);
 const reader=els['#reader'];
 return {els,html:()=>reader.html,buttons:()=>reader.children.find(el=>el.className==='choices')?.children??[],pick(i){const b=this.buttons()[i];(b.onclick??b.handler)()},value(code){return JSON.parse(vm.runInContext('JSON.stringify('+code+')',ctx))}};
}
const counts=[1,2,2,2,2,3],endings=new Set(),links=new Set();
const first=['강 아래의 버선','사공이 본 두 짐','떠나기 전 받은 편지'];
for(let route=0;route<3;route++)for(let claim=0;claim<2;claim++){
 const rank=5-route*2-claim;
 for(let ending=0;ending<counts[rank];ending++){
  storage.set(s1key,JSON.stringify({page:-1,rank:null,flags:[],moves:[],route:0,echo:'',ending:null,choiceOrders:Array(14).fill(0)}));
  let one=open([s1]);
  one.pick(0);
  assert.match(one.html(),/등불을 켜 두어라[\s\S]*구휼소/);
  assert.equal(one.buttons().length,3);
  one.pick(route);
  assert.match(one.html(),new RegExp(first[route]+'[\\s\\S]*이름을 쓰는 밤'));
  assert.equal(one.buttons().length,2);
  const mark=one.html();
  one.els['#save-progress'].onclick();
  one=open([s1]);
  assert.equal(one.html(),mark);
  one.pick(0);
  assert.match(one.html(),/나루로 내려가 배를 묶던 옥례[\s\S]*옥례가 나루 헛간 문/);
  one.pick(1);one.pick(route);one.pick(claim);
  assert.equal(one.value('state.rank'),rank);
  assert.equal(one.value('state.page'),6);
  assert.match(one.html(),/중반 · 첫 신분[\s\S]*마지막 배/);
  for(let stage=0;stage<(rank===0?3:8);stage++){
   const step=stage<6?1:2;
   const options=[step,0,-step].filter(delta=>rank+delta>=0&&rank+delta<6);
   assert.equal(one.buttons().length,options.length);
   one.pick(options.indexOf(0));
   assert.equal(one.value('state.page'),rank===0&&stage===2?15:stage+7);
   assert.match(one.html(),/reading-lead/);
  }
  if(rank!==0){
   one.pick(rank%3);
   assert.equal(one.value('state.rankLeadRead'),true);
   assert.match(one.html(),/판결 뒤/);
   assert.equal(one.buttons().length,counts[rank]);
   one.pick(ending);
  }else{
   assert.match(one.html(),/창살 너머의 이름/);
   assert.equal((one.html().match(/data-bonded-art=/g)||[]).length,4);
   assert.doesNotMatch(one.html(),/href="season-2.html"/);
   one=open([s1]);
   assert.match(one.html(),/창살 너머의 이름/);
  }
  assert.equal(one.value('state.page'),15);
  endings.add(rank+':'+one.value('state.ending'));
  one.pick(0);
  assert.match(one.html(),/이서의 마지막 호적/);
  if(rank===0)assert.match(one.html(),/최종 신분[\s\S]*<dd>노비<[/]dd>/);
  const handoff=open(s2);
  if(one.value('state.departureRank')!==null){
   assert.equal(handoff.value('inherited.rank'),one.value('state.departureRank'));
   assert.match(one.html(),/href="season-2.html"/);
   links.add(handoff.value('inherited.rank'));
  }else assert.equal(handoff.value('inherited'),null);
 }
}
assert.equal(endings.size,12);
assert.deepEqual([...links].sort(),[2,3,4,5]);
const legacy={page:-0.5,rank:null,flags:[],moves:[],route:0,echo:'',ending:null};
storage.set(s1key,JSON.stringify(legacy));
assert.equal(open([s1]).value('state.page'),0);
storage.set(s1key,JSON.stringify({...legacy,page:5,rank:4}));
assert.match(open([s1]).html(),/중반 · 첫 신분[\s\S]*마지막 배/);
storage.set(s1key,JSON.stringify({...legacy,page:14,rank:4,rankLead:1,rankLeadRead:false}));
assert.match(open([s1]).html(),/판결 뒤[\s\S]*판결이 끝난 뒤/);
// 여정 상태가 결말을 바꾸므로, 신분마다 여섯 결말에 닿는 경로를 직접 찾는다.
const pathsByRank={},fatalSeen=[],midSeen=[];
for(const rank of [2,3,4,5]){
 for(const key of storage.keys())if(key.startsWith('yeocheon-season-two'))storage.delete(key);
 storage.set(s1key,JSON.stringify({...legacy,page:15,rank,ending:0,rankLead:1,departureRank:rank}));
 const probe=open(s2);
 const found=probe.value('(()=>{const f=[];for(let n=0;n<6561;n++){const a=[];let x=n;for(let i=0;i<8;i++){a.push(x%3);x=Math.floor(x/3);}const e=endingIndex(a);if(!fatalEnding(a)&&![3,4,5,6].some(k=>midFatal(a.slice(0,k)))&&!f[e])f[e]=a;}return f})()');
 const mids=probe.value('(()=>{const f={};for(let n=0;n<729;n++){const a=[];let x=n;for(let i=0;i<6;i++){a.push(x%3);x=Math.floor(x/3);}for(let k=3;k<=6;k++){const m=midFatal(a.slice(0,k));if(m){f[m]=1;break;}}}return Object.keys(f)})()');
 midSeen.push(...mids);
 const fates=probe.value('(()=>{const f={};for(let n=0;n<6561;n++){const a=[];let x=n;for(let i=0;i<8;i++){a.push(x%3);x=Math.floor(x/3);}const k=fatalEnding(a);if(k)f[k]=(f[k]||0)+1;}return f})()');
 fatalSeen.push([rank,fates]);
 assert.equal(found.filter(Boolean).length,6,'rank '+rank+' reaches all six gate endings');
 pathsByRank[rank]=found;
}
for(const rank of [2,3,4,5])for(let ending=0;ending<6;ending++){
 const paths=pathsByRank[rank];
 for(const key of storage.keys())if(key.startsWith('yeocheon-season-two'))storage.delete(key);
 storage.set(s1key,JSON.stringify({...legacy,page:15,rank,ending:0,rankLead:1,departureRank:rank}));
 let two=open(s2);
 for(const [step,choice] of paths[ending].entries()){
  assert.equal(two.buttons().length,3);
  two.pick(choice);
  if(step<7){
   assert.match(two.html(),new RegExp('reading-lead[\\s\\S]*'+(step+2)+' / 8'));
   assert.equal(two.buttons().length,3);
   if(step===2){const last=two.html();two=open(s2);assert.equal(two.html(),last);}
  }
 }
 assert.equal(two.value('endingIndex(progress.answers)'),ending);
 assert.match(two.html(),/시즌 2 엔딩/);
}
{const all=new Set(fatalSeen.flatMap(([,f])=>Object.keys(f)));for(const k of ['assassinated','executed','enslaved','imprisoned','exiled'])assert.ok(all.has(k),'fatal ending '+k+' reachable');
 for(const k of ['checkpoint','collapsed','ambushed','seized','recalled','confined'])assert.ok(midSeen.includes(k),'road ending '+k+' reachable');
 const rate=Object.fromEntries(fatalSeen.map(([r,f])=>[r,Object.values(f).reduce((a,b)=>a+b,0)]));assert.ok(rate[2]>rate[4]&&rate[3]>rate[4],'higher ranks fail fatally less often');
 for(const [rank,f] of fatalSeen){if(rank>=4){assert.ok(!f.enslaved,'no enslavement for rank '+rank);}if(rank!==5)assert.ok(!f.executed);}}
console.log('PASS: joined reading pages across both seasons, all 12 + 6 endings, exact route captions, previous save compatibility and reload');

const observed=new Map();
for(let order=0;order<6;order++){
 for(const page of [3,4,6,7,8,9,10,11,12,13]){
  storage.set(s1key,JSON.stringify({page,rank:3,route:0,flags:['neighbors'],moves:[],echo:'',ending:null,choiceOrders:Array(14).fill(order)}));
  let app=open([s1]);
  const labels=app.buttons().map(button=>button.textContent);
  const upper=labels[0];
  if(!observed.has(page))observed.set(page,new Set());
  observed.get(page).add(upper);
  app=open([s1]);
  assert.deepEqual(app.buttons().map(button=>button.textContent),labels);
  if(page>=6){
    const delta=page<12?1:2;
    const expected=[[delta,0,-delta],[delta,-delta,0],[0,delta,-delta],[0,-delta,delta],[-delta,delta,0],[-delta,0,delta]][order][0];
    app.pick(0);
    assert.equal(app.value('state.rank'),3+expected);
  }
 }
}
for(const [page,choices] of observed)assert.equal(choices.size,page===4?2:3);
console.log('PASS: ordering changes by playthrough, reload keeps it, and callbacks preserve the selected rank outcome');

for(const page of [6,7,8,9,10,11,12,13]){
 const step=page<12?1:2;
 storage.set(s1key,JSON.stringify({...legacy,page,rank:step,flags:['neighbors'],choiceOrders:Array(14).fill(0)}));
 const one=open([s1]);
 one.pick(one.buttons().length-1);
 assert.equal(one.value('state.rank'),0);
 assert.equal(one.value('state.page'),page<8?page+1:15);
}
storage.set(s1key,JSON.stringify({...legacy,page:8,rank:0,flags:['neighbors'],choiceOrders:Array(14).fill(0)}));
const earnsFreedom=open([s1]);
earnsFreedom.pick(0);
assert.equal(earnsFreedom.value('state.rank'),1);
assert.equal(earnsFreedom.value('state.page'),9);
assert.doesNotMatch(earnsFreedom.html(),/창살 너머의 이름/);
console.log('PASS: early imprisonment at cutoff, later demotion terminates, final opportunity can escape, all endings still reachable');
const specific=new Set();
const expectedFinals=new Set();
for(const rank of [2,3,4,5]){
  storage.set(s1key,JSON.stringify({...legacy,page:15,rank,ending:0,rankLead:1,departureRank:rank}));
  const probe=open(s2);
  const current=probe.value('currentKey');
  for(let step=0;step<7;step++)for(let option=0;option<3;option++){
    const answers=Array(step).fill(0);
    if(step===6&&option===1)answers[3]=1;
    storage.set(current,JSON.stringify({answers,reaction:step>0}));
    const selecting=open(s2);
    assert.equal(selecting.buttons().length,3);
    selecting.pick(option);
    const outcome=selecting.value('turns.outcomes['+step+']['+option+']');
    const changed=option===1&&[2,4,5].includes(step);
    const fell=selecting.value('midFatal(progress.answers)');
    if(fell)assert.match(selecting.html(),/궁에 닿지 못함[\s\S]*방금 고른 선택 다시 하기|궁에 닿지 못함/);
    else if(!changed)assert.ok(selecting.html().includes(outcome),rank+':'+step+':'+option);
    specific.add(outcome);
    if(!fell)assert.ok(selecting.els['#reader'].children.some(child=>child.html?.includes('이서가 확인한 단서')));
  }
  for(const [end,answers] of pathsByRank[rank].entries()){
    storage.set(current,JSON.stringify({answers,reaction:false}));
    const done=open(s2);
    const record=done.value('gateRecord()');
    assert.equal(record.rank,rank);
    assert.equal(record.ending,end);
    assert.equal(record.location,'궁문 바깥');
    assert.deepEqual(record.routeSelections,answers);
    assert.match(done.html(),/data-art="n13"[\s\S]*궁문 앞에 남긴 기록/);
    assert.match(done.html(),/시즌 3는 이 문이 열리는 순간부터 시작/);
    const transfer=JSON.parse(storage.get('yeocheon-season-three-v1handoff:'+done.value('inherited.key')));
    assert.deepEqual(transfer,record);
    if(end===2)assert.ok(record.witness);
    expectedFinals.add(end);
  }
  storage.set(current,JSON.stringify({answers:[0,0,0,2,1,1,1],reaction:true}));
  const sheltered=open(s2);
  assert.equal(sheltered.value('progress.answers[3]'),2);
  assert.doesNotMatch(sheltered.html(),/명선도 자기 이름으로|data-art="r13"/);
}
assert.equal(specific.size,84);
assert.equal(expectedFinals.size,6);
console.log('PASS: 84 rank-specific actions, six door endings per eligible rank, no offsite witness illustrated at the gate, S3 record persisted outside the palace');
for(const rank of [2,3,4,5]){
  storage.set(s1key,JSON.stringify({...legacy,page:15,rank,ending:0,rankLead:1,departureRank:rank}));
  const current=open(s2).value('currentKey');
  for(const child of [0,1,2])for(const answer of [0,1,2])for(const invited of [0,1])for(const preparation of [0,1,2]){
    const journey=[0,invited,0,child,answer,preparation,1];
    storage.set(current,JSON.stringify({answers:journey,reaction:true}));
    const gate=open(s2);
    if([3,4,5,6].some(k=>gate.value('midFatal('+JSON.stringify(journey.slice(0,k))+')'))){assert.match(gate.html(),/궁에 닿지 못함/);continue;}
    assert.equal(gate.buttons().length,3);
    assert.equal(gate.html().includes('data-art="r13"'),child===1);
    assert.equal(gate.html().includes('data-art="n8"'),answer===1);
    for(const endingChoice of [0,1,2]){
      const answers=[...journey,endingChoice];
      storage.set(current,JSON.stringify({answers,reaction:false}));
      const ending=open(s2);
      if(ending.value('fatalEnding(progress.answers)')){assert.match(ending.html(),/궁에 닿지 못함/);assert.doesNotMatch(ending.html(),/season-3.html/);continue;}
      const record=ending.value('gateRecord()');
      const atGate=record.characters.gatePeople;
      assert.equal(atGate.includes('명선'),child===1);
      assert.equal(atGate.includes('서겸'),answer===1&&endingChoice!==2);
      assert.equal(atGate.length,2+ +(child===1)+ +(invited===1&&preparation===1)+ +(answer===1&&endingChoice!==2));
      assert.deepEqual(JSON.parse(storage.get('yeocheon-season-three-v1handoff:'+ending.value('inherited.key'))).characters,record.characters);
      assert.equal(ending.html().includes('data-art="n8"'),atGate.includes('서겸'));
    }
  }
}
console.log('PASS: 648 variations in named cast at the gate, panel presence and season-three handoff');
for(const rank of [2,3,4,5]){
  storage.set(s1key,JSON.stringify({...legacy,page:15,rank,ending:0,rankLead:1,departureRank:rank}));
  const current=open(s2).value('currentKey');
  const variants=[
    {choices:[0,1,0,1,1,0,0,0], key:'supervisor', person:'문 주부', onGate:true},
    {choices:[0,1,0,1,1,1,0,0], key:'messenger', person:'서겸', onGate:false},
    {choices:[0,1,0,1,2,2,0,0], key:'clerk', person:'하 서리', onGate:false},
    {choices:[0,1,0,1,1,1,0,1], key:null, person:null, onGate:true},
    {choices:[0,1,1,1,1,0,0,0], key:null, person:null, onGate:true}
  ];
  for(const {choices,key,person,onGate} of variants){
    let p;
    if([3,4,5,6].some(k=>open(s2).value('midFatal('+JSON.stringify(choices.slice(0,k))+')')))continue; // 이 신분은 이 길에서 궁에 닿지 못한다
    for(let step=0;step<8;step++){
      storage.set(current,JSON.stringify({answers:choices.slice(0,step),reaction:step>0}));
      p=open(s2);
      const active=p.value('disciplinaryAction(progress.answers)');
      assert.equal(active?.key??null,key==='clerk'&&step>=6?'clerk':null);
      if(key==='clerk'&&step===6)assert.match(p.html(),/당분간 필사석에 앉지 말랍니다/);
      assert.equal(p.buttons().length,3);
    }
    p.pick(choices[7]);
    const result=p.value('gateRecord()');
    assert.equal(result.discipline?.key??null,key);
    assert.equal(result.discipline?.person??null,person);
    assert.equal(result.characters.gatePeople.includes('서겸'),onGate);
    assert.equal(result.location,'궁문 바깥');
    if(p.value('fatalEnding(progress.answers)')){assert.match(p.html(),/궁에 닿지 못함/);continue;} // 여정이 무너진 신분은 궁문 기록 대신 실패 결말
    assert.match(p.html(),/data-art="n13"[\s\S]*궁문 밖에 온 사람/);
    assert.deepEqual(JSON.parse(storage.get('yeocheon-season-three-v1handoff:'+p.value('inherited.key'))).discipline,result.discipline);
    assert.deepEqual(open(s2).value('gateRecord()'),result);
  }
}
console.log('PASS: each rank supports all three disciplinary outcomes, an evidence shortfall, a delayed testimony, and persisted consequences without early disclosure');
for(const moves of [[0,0,0],[0,0,-1],[0,0,0,0,0,-2],[]]){
  storage.set(s1key,JSON.stringify({...legacy,page:15,rank:0,ending:0,departureRank:null,moves}));
  const jailed=open([s1]);
  assert.match(jailed.html(),/창살 너머의 이름[\s\S]*이송 지시 불복[\s\S]*여천 옥에 가뒀다/);
  assert.doesNotMatch(jailed.html(),/숨을 거뒀|시즌 2 이어 읽기|생전 마지막 신분/);
  assert.deepEqual(Array.from(jailed.html().matchAll(/data-bonded-art="(\d)"/g),m=>m[1]),['0','1','3','2']);
  if(moves.at(-1)<0)assert.match(jailed.html(),/보증이 효력을 잃었다/);
  if(moves.length===3&&moves.at(-1)===0)assert.match(jailed.html(),/창고지기와 곡식을 나른 사람의 말이 달랐다/);
  jailed.pick(0);
  assert.match(jailed.html(),/최종 신분[\s\S]*노비[\s\S]*여천 관아의 옥/);
  assert.doesNotMatch(jailed.html(),/시즌 2 이어 읽기|생전 마지막 신분/);
  assert.match(open([s1]).html(),/여천 관아의 옥/);
  assert.equal(open(s2).value('inherited'),null);
}
console.log('PASS: jail ending follows choice consequences, final record and existing saves reopen, no onward season for the bonded rank');
