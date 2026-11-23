// 시즌 4의 모든 선택 경로 화면(신분 8가지 × 판결)을 그려, 영어 사전에 없는 문장을 찾는다.
const fs=require('fs'),vm=require('vm');
const root=__dirname+'/../site/';
const src=['season-4-new-slots.js','season-4-story.js','season-4.js'].map(f=>fs.readFileSync(root+f,'utf8'));
const ic={window:{},document:{readyState:'complete',documentElement:{lang:'',classList:{add(){}}},addEventListener(){}},location:{search:''},navigator:{languages:['ko']},localStorage:{getItem(){return 'ko'},setItem(){}}};
vm.createContext(ic);vm.runInContext(fs.readFileSync(root+'i18n.js','utf8'),ic);vm.runInContext(fs.readFileSync(root+'i18n/en.js','utf8'),ic);
const I=ic.window.HOJEOGE_I18N,D=ic.window.I18N_EN,H=/[가-힣]/;
const has=t=>{if(D[I.norm(t)]!=null)return true;return I.split(t).every(p=>!H.test(p)||D[p]!=null||p.split(' · ').every(b=>!H.test(b)||D[b]!=null||D[b.replace(/[.]$/,'')]!=null));};
const node=()=>({children:[],append(...c){this.children.push(...c)},set innerHTML(s){this.markup=s;this.children=[]},querySelector(){return this._q||(this._q=node())},focus(){},setAttribute(){},paused:true,play(){return Promise.resolve()},pause(){},set textContent(v){this.t=v},get textContent(){return this.t}});
const miss=new Map();
const texts=html=>html.replace(/<[^>]+>/g,'\n').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').split('\n').map(s=>s.trim()).filter(s=>H.test(s));
for(const rank of [2,3,4,5])for(const done of [true,false])for(const verdict of ['record','voices','seal','pending']){
  const st=new Map([['yeocheon-season-four-v1handoff:k',JSON.stringify({version:1,rank,verdict,rankGoal:{name:'g',done}})],['yeocheon-season-four-v1latest','"k"']]);
  const els={};const q=k=>els[k]||(els[k]=node());
  const c=vm.createContext({document:{querySelector:q,createElement:node,addEventListener(){}},window:{scrollTo(){}},localStorage:{getItem:k=>st.get(k)??null,setItem:(k,v)=>st.set(k,v),length:0,key:()=>null}});
  src.forEach(s=>vm.runInContext(s,c));
  const seen=new Set();
  for(let n=0;n<6561;n++){const a=[];let x=n;for(let i=0;i<8;i++){a.push(x%3);x=Math.floor(x/3);}
    const f=vm.runInContext('palaceFall4('+JSON.stringify(a)+')',c);const stop=f?f.at:8;
    for(let m=0;m<=stop;m++)for(const r of (m&&m<8?[true,false]:[false])){
      const id=a.slice(0,m).join('')+r;if(seen.has(id))continue;seen.add(id);
      st.set('yeocheon-season-four-v1progress:k',JSON.stringify({answers:a.slice(0,m),reaction:r}));
      vm.runInContext('progress=read(storageKey);render()',c);
      const r0=q('#reader');const all=[r0.markup||'',...r0.children.flatMap(ch=>[ch.markup||'',ch.t||'',...(ch.children||[]).map(b=>b.t||'')])].join('\n');
      for(const t of texts(all))if(!has(t))miss.set(t,(miss.get(t)||0)+1);
    }
  }
}
console.log([...miss.keys()].join('\n'));console.error('missing',miss.size);
