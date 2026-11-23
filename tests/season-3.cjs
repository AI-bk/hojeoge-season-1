const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const root=require('node:path').resolve(__dirname,'../site')+'/';
const scripts=n=>['story.js','.js'].map((s,i)=>readFileSync(root+'season-'+n+(i?s:'-'+s),'utf8'));
const source=Object.fromEntries([2,3].map(n=>[n,scripts(n)]));
const s1Key='yeocheon-season-one-v1progress';
const storage=new Map();
function node(){
  return {
    children:[],append(child){this.children.push(child)},
    set innerHTML(s){this.markup=s;this.children=[];this.selectors=new Map()},
    querySelector(s){if(!this.selectors)this.selectors=new Map();if(!this.selectors.has(s))this.selectors.set(s,node());return this.selectors.get(s)},
    focus(){},setAttribute(){},insertAdjacentHTML(_,s){this.markup=s+this.markup},paused:true,
    play(){this.paused=false;return Promise.resolve()},pause(){this.paused=true}
  };
}
function open(n){
  const globals=node();
  const context=vm.createContext({
    document:{querySelector:k=>globals.querySelector(k),createElement:node,addEventListener(){}},
    window:{scrollTo(){}},
    localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}
  });
  for(const s of source[n])vm.runInContext(s,context);
  const dom=globals.querySelector('#reader');
  return {dom,globals,eval:s=>JSON.parse(vm.runInContext('JSON.stringify('+s+')',context)),
    options:()=>dom.querySelector('.decision .frame-body').children[0]?.children??[],
    pick(i){this.options()[i].onclick()},
    next(){dom.querySelector('.frame:last-of-type .frame-body').children.at(-1).onclick()}
  };
}
function join(rank,two){
  storage.clear();
  const one={page:15,rank,ending:0,rankLead:0,departureRank:rank,route:0,flags:['child'],moves:[]};
  storage.set(s1Key,JSON.stringify(one));
  const journey=open(2);
  storage.set(journey.eval('currentKey'),JSON.stringify({answers:two,reaction:false}));
  const finale=open(2);
  assert.match(finale.dom.markup,/href="season-3.html"/);
  return open(3);
}
assert.match(open(3).dom.markup,/시즌 2로 돌아가기/);
const records={
  record:[0,0,0,0,0,0,0,0],
  voices:[1,1,1,1,1,1,1,1],
  seal:[2,2,2,2,2,2,2,2],
  pending:[2,2,2,2,2,2,2,0]
};
const itineraries=[
  [0,0,0,1,1,0,0,0],
  [0,0,0,2,1,1,0,0],
  [0,0,0,0,2,2,2,2],
  [0,0,0,2,0,2,1,1]
];
// 궁 안의 실패(palaceFall)를 피하면서 각 결말에 닿는 길을 신분마다 찾는다.
const reached=new Set();
for(const rank of [2,3,4,5]){
  for(const [outcome] of Object.entries(records)){
    let game=join(rank,itineraries[Object.keys(records).indexOf(outcome)]);
    const picks=game.eval(`(()=>{const keep=progress.answers;let found=null;for(let n=0;n<6561&&!found;n++){const a=[];let x=n;for(let i=0;i<8;i++){a.push(x%3);x=Math.floor(x/3);}if(palaceFall(a))continue;progress.answers=a;if(finalOutcome()==='${outcome}')found=a;}progress.answers=keep;return found})()`);
    if(!picks)continue; // 이 신분·이 도착 상태로는 궁 안의 위험 때문에 닿을 수 없는 결말
    reached.add(outcome);
    assert.equal(game.eval('handoff.rank'),rank);
    assert.match(game.dom.markup,/궁문 걸쇠가 밀렸다/);
    assert.equal(game.options().length,3);
    assert.equal(game.eval('handoff.witness'),outcome==='record'?'명선':null);
    if(outcome==='record')assert.match(game.dom.markup,/이 증인을 누가 데려왔느냐\?/);
    else assert.match(game.dom.markup,/이 기록을 가지고 온 사람이 너냐\?/);
    for(const [i,pick] of picks.entries()){
      assert.equal(game.options().length,3);
      assert.match(game.dom.markup,/class="frame decision"/);
      if(i===1)assert.equal(game.options()[0].textContent,game.eval('rankStories[handoff.rank][2]'));
      game.pick(pick);
      assert.match(game.dom.markup,/방금 고른 행동/);
      assert.equal(game.eval('progress.reaction'),true);
      if(i===2){
        game.globals.querySelector('#save').onclick();
        const old=game.dom.markup;
        game=open(3);
        assert.equal(game.dom.markup,old);
        assert.equal(game.globals.querySelector('#load').disabled,false);
      }
      game.next();
    }
    assert.equal(game.eval('finalOutcome()'),outcome);
    assert.match(game.dom.markup,/궁에 남은 기록/);
    assert.equal(JSON.parse(storage.get('yeocheon-season-four-v1latest')),game.eval('storageKey'),'S3 ending points S4 at this handoff');
    assert.ok(storage.get('yeocheon-season-four-v1handoff:'+game.eval('storageKey')));
    assert.ok(game.dom.querySelector('.verdict').children.some(c=>c.href==='season-4.html'),'S3 ending links to S4');
    game.globals.querySelector('#load').onclick();
    assert.equal(game.eval('progress.answers.length'),3);
    assert.match(game.dom.markup,/방금 고른 행동/);
  }
}
assert.equal(reached.size,4,'all four finales reachable without falling');
// 궁 안의 실패 결말: 신분마다 실패할 길이 있고, 다시 하기로 돌아갈 수 있다
for(const rank of [2,3,4,5]){
  let game=join(rank,itineraries[1]);
  const fall=game.eval('(()=>{for(let n=0;n<6561;n++){const a=[];let x=n;for(let i=0;i<8;i++){a.push(x%3);x=Math.floor(x/3);}const f=palaceFall(a);if(f)return a.slice(0,f.at);}return null})()');
  assert.ok(fall,'palace fall reachable for rank '+rank);
  storage.set(game.eval('storageKey'),JSON.stringify({answers:fall,reaction:true}));
  game=open(3);
  assert.match(game.dom.markup,/궁에서 밀려나다/);
  assert.doesNotMatch(game.dom.markup,/시즌 4 · 궁 안의 이름/);
}
// 신분이 높을수록 궁 안에서 노리는 쪽이 많아 실패할 길도 많다
const probe3=join(2,itineraries[1]);
const falls=[2,3,4,5].map(rank=>probe3.eval('(()=>{const keep=JSON.stringify(handoff);Object.assign(handoff,{rank:'+rank+',accepted:true,journey:{pursuit:\'followed\',papers:\'partial\'},rankGoal:{done:true}});let c=0;for(let n=0;n<6561;n++){const a=[];let x=n;for(let i=0;i<8;i++){a.push(x%3);x=Math.floor(x/3);}if(palaceFall(a))c++;}Object.assign(handoff,JSON.parse(keep));return c})()'));
assert.ok(falls[0]<falls[1]&&falls[1]<falls[2]&&falls[2]<falls[3],'higher ranks fall more often: '+falls);
for(const [idx,two] of itineraries.entries()){
 const game=join(2,two);
 if(idx===0)assert.match(game.dom.markup,/문 주부/);
 if(idx===1)assert.match(game.dom.markup,/서겸.*파면/);
 if(idx===2)assert.match(game.dom.markup,/하 서리/);
 const path=game.eval('handoff.key');
 const s2Key='yeocheon-season-two-v1:'+path.slice(0,path.lastIndexOf(':'));
 storage.set(s2Key,JSON.stringify({answers:[0],reaction:false}));
 assert.match(open(3).dom.markup,/시즌 2로 돌아가기/);
}
for(let step=0;step<8;step++){
  const outcomes=new Set();
  for(let pick=0;pick<3;pick++){
    let game=join(5,itineraries[0]);
    const key=game.eval('storageKey');
    const safe=game.eval('(()=>{for(let n=0;n<6561;n++){const a=[];let x=n;for(let i=0;i<8;i++){a.push(x%3);x=Math.floor(x/3);}if(!palaceFall(a))return a;}})()').slice(0,step);
    storage.set(key,JSON.stringify({answers:safe,reaction:false}));
    game=open(3);
    game.pick(pick);
    outcomes.add(game.dom.markup);
  }
  assert.equal(outcomes.size,3);
}
console.log('PASS: four inherited ranks, named witness/solo openings, discipline handoffs, all eight three-way decisions and reactions, four finales, saved and reloaded reaction, no abandoned S2 handoff');
