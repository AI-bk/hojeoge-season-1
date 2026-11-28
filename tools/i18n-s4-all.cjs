// 시즌 4(Claude 설계판)의 모든 경로 화면(시작 처지 8가지 × 시즌 3 판결 4가지)을 그려, 영어 사전에 없는 문장을 찾는다.
// 사용법: node tools/i18n-s4-all.cjs [--pieces] [--write-seen]
//   기본: 사전에 없는 화면 문장을 한 줄에 하나씩 출력
//   --pieces: 문장을 i18n.js가 자르는 단위(I.split)로 나눠, 사전에 없는 조각만 출력 (번역표 만들 때 씀)
//   --write-seen: 화면에 나온 한국어 문장 전체를 docs/i18n/ko-sentences.json의 s4로 바꿔 쓴다 (tests/i18n.cjs가 검사)
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=__dirname+'/../site/';
const src=['season-4-new-slots.js','season-4-story.js','season-4-art.js','season-4.js'].map(f=>fs.readFileSync(root+f,'utf8'));
const ic={window:{},document:{readyState:'complete',documentElement:{lang:'',classList:{add(){}}},addEventListener(){}},location:{search:''},navigator:{languages:['ko']},localStorage:{getItem(){return 'ko'},setItem(){}}};
vm.createContext(ic);vm.runInContext(fs.readFileSync(root+'i18n.js','utf8'),ic);vm.runInContext(fs.readFileSync(root+'i18n/en.js','utf8'),ic);
const I=ic.window.HOJEOGE_I18N,D=ic.window.I18N_EN,H=/[가-힣]/;
const pieceOk=p=>!H.test(p)||D[p]!=null||p.split(' · ').every(b=>!H.test(b)||D[b]!=null||D[b.replace(/[.]$/,'')]!=null);
const has=t=>D[I.norm(t)]!=null||I.split(t).every(pieceOk);
const node=()=>({children:[],append(...c){this.children.push(...c)},set innerHTML(s){this.markup=s;this.children=[];this._q=null},get innerHTML(){return this.markup},querySelector(){return this._q||(this._q=node())},focus(){},setAttribute(){},paused:true,play(){return Promise.resolve()},pause(){},set textContent(v){this.t=v},get textContent(){return this.t}});
const texts=html=>html.replace(/<[^>]+>/g,'\n').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').split('\n').map(s=>s.trim()).filter(s=>H.test(s));
const seenText=new Map(),miss=new Map(),seenHtml=new Set();
for(const rank of [2,3,4,5])for(const done of [true,false])for(const verdict of ['record','voices','seal','pending']){
  const st=new Map([['yeocheon-season-four-v1handoff:k',JSON.stringify({version:1,rank,verdict,rankGoal:{name:'g',done}})],['yeocheon-season-four-v1latest','"k"']]);
  const els={};const q=k=>els[k]||(els[k]=node());
  const c=vm.createContext({document:{querySelector:q,createElement:node,addEventListener(){}},window:{scrollTo(){}},localStorage:{getItem:k=>st.get(k)??null,setItem:(k,v)=>st.set(k,v),length:0,key:()=>null}});
  src.forEach(s=>vm.runInContext(s,c));
  const key=vm.runInContext('storageKey',c),seen=new Set();
  const collect=n=>[n.markup||'',n.t||'',...(n.children||[]).flatMap(collect),...(n._q?collect(n._q):[])];
  const show=(a,reaction)=>{
    const id=a.join('')+(reaction?'r':'');if(seen.has(id))return;seen.add(id);
    st.set(key,JSON.stringify({answers:a,reaction}));
    vm.runInContext('progress=read(storageKey);render()',c);
    const html=collect(q('#reader')).join('\n');
    const h=require('crypto').createHash('sha1').update(html).digest('base64'); // 화면 전체를 들고 있으면 메모리가 넘친다
    if(seenHtml.has(h))return;seenHtml.add(h);
    for(const t of texts(html))seenText.set(t,(seenText.get(t)||0)+1);
  };
  // 시즌 3 판결은 첫 화면만 바꾼다. 나머지 경로는 판결 하나('record')로만 끝까지 훑는다.
  if(verdict!=='record'){show([],false);continue;}
  const walk=a=>{
    const r=vm.runInContext('resolve4(handoff,'+JSON.stringify(a)+')',c);
    show(a,false);
    if(r)return;
    if(a.length>0&&a.length<=7)show(a,true);
    for(let p=0;p<(a.length<7?3:2);p++)walk([...a,p]);
  };
  walk([]);
}
for(const [t,n] of seenText)if(!has(t))miss.set(t,n); // 같은 문장은 한 번만 검사한다
const args=process.argv.slice(2);
if(args.includes('--write-seen')){
  const f=path.join(__dirname,'../docs/i18n/ko-sentences.json');
  // 사전은 문장 조각 단위라, 화면 글을 I.split 조각(가운뎃점 목록은 항목)으로 나눠 적는다
  const list=new Set();
  for(const t of seenText.keys())for(const p of I.split(t)){
    if(!H.test(p))continue;
    if(D[p]!=null||!p.includes(' · '))list.add(p);
    else for(const b of p.split(' · '))if(H.test(b))list.add(D[b]!=null?b:b.replace(/[.]$/,''));
  }
  const j=JSON.parse(fs.readFileSync(f,'utf8'));j.s4=[...list];
  fs.writeFileSync(f,JSON.stringify(j,null,1)+'\n','utf8');
  console.error('s4 sentences written',j.s4.length);
}
if(args.includes('--pieces')){
  const pieces=new Set();
  for(const t of miss.keys())for(const p of I.split(t))if(!pieceOk(p))pieces.add(p);
  console.log([...pieces].join('\n'));console.error('missing pieces',pieces.size);
}else{console.log([...miss.keys()].join('\n'));console.error('missing',miss.size,'of',seenText.size);}
