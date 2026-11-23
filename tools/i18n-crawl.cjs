// 화면에 실제로 나오는 한국어 문장을 모은다: 시즌 1→4를 무작위로 끝까지 읽기를 여러 번 반복한다.
// 사용법: (site/를 8765로 띄운 뒤) node tools/i18n-crawl.cjs [회차, 기본 40] [시즌 안 반복, 기본 30]
// 결과: docs/i18n/ko-sentences.json {시즌: [문장, …] (처음 본 순서)}
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const episodes=+process.argv[2]||40,inner=+process.argv[3]||30;
const out=path.join(__dirname,'../docs/i18n/ko-sentences.json');
const BASE='http://localhost:8765/';
(async()=>{
  const b=await chromium.launch();const p=await b.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/pagead2.googlesyndication.com/**',r=>r.fulfill({status:200,body:''}));
  await p.goto(BASE+'about.html');
  await p.evaluate(()=>{localStorage.clear();localStorage.setItem('hojeoge-lang','ko');});
  const seen={};const add=(k,list)=>{seen[k]=seen[k]||new Map();for(const s of list)if(!seen[k].has(s))seen[k].set(s,seen[k].size);};
  async function frame(page){
    await p.evaluate(src=>{document.body.innerHTML='<iframe id="f" src="'+src+'" style="width:390px;height:844px"></iframe>';},page);
    await p.waitForFunction(page=>{const f=document.getElementById('f');return f&&f.contentWindow&&f.contentWindow.location.pathname.endsWith(page)&&f.contentDocument.readyState==='complete';},page,{timeout:15000});
    await p.waitForTimeout(150);
    return p.frames().find(f=>f.url().endsWith(page));
  }
  // 페이지 안에서: 보이는 글 모으기 + 무작위로 고르기
  const walker=`(()=>{
    const I=window.HOJEOGE_I18N,H=/[가-힣]/;
    window.__seen=window.__seen||new Map();
    window.__grab=()=>{
      const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
      while((n=w.nextNode())){if(n.parentNode.closest('script,style,[data-no-i18n]'))continue;const t=I.norm(n.nodeValue);if(!H.test(t))continue;for(const s of I.split(t))if(H.test(s)&&!__seen.has(s))__seen.set(s,__seen.size);}
      for(const el of document.querySelectorAll('[aria-label],[title],[alt]'))for(const a of ['aria-label','title','alt']){const v=el.getAttribute(a);if(v&&H.test(v)){const t=I.norm(v);if(!__seen.has(t))__seen.set(t,__seen.size);}}
      if(H.test(document.title)){const t=I.norm(document.title);if(!__seen.has(t))__seen.set(t,__seen.size);}
    };
    window.__step=()=>{
      __grab();
      const r=document.querySelector('#reader');
      const bs=[...r.querySelectorAll('button')].filter(b=>!b.disabled);
      if(!bs.length)return false;
      const restart=bs.filter(b=>/처음부터|다시 읽기/.test(b.textContent));
      const pick=bs.filter(b=>!restart.includes(b));
      (pick.length?pick:restart)[Math.floor(Math.random()*(pick.length?pick.length:restart.length))].click();
      return pick.length>0;
    };
  })()`;
  async function play(f,runs){
    await f.evaluate(walker);
    return f.evaluate(runs=>{
      let ends=0;
      for(let k=0;k<runs*80&&ends<runs;k++){if(!__step())ends++;}
      __grab();return [...__seen.keys()];
    },runs);
  }
  for(const page of ['index.html','about.html','privacy.html']){
    await p.goto(BASE+page+'?lang=ko');await p.evaluate(()=>{localStorage.setItem('hojeoge-lang','ko');});await p.goto(BASE+page);
    await p.evaluate(walker);add('pages',await p.evaluate(()=>{__grab();return [...__seen.keys()];}));
  }
  await p.goto(BASE+'about.html');
  for(let e=0;e<episodes;e++){
    await p.evaluate(()=>{const keep=localStorage.getItem('hojeoge-lang');localStorage.clear();localStorage.setItem('hojeoge-lang',keep);});
    for(const s of [1,2,3,4]){
      const f=await frame('season-'+s+'.html');
      // 앞 시즌들은 여러 번 돌고 마지막 한 판의 결말을 다음 시즌에 넘긴다
      add('s'+s,await play(f,e===0?inner*3:inner));
    }
    process.stdout.write('\repisode '+(e+1)+'/'+episodes+' '+Object.entries(seen).map(([k,v])=>k+':'+v.size).join(' '));
  }
  fs.mkdirSync(path.dirname(out),{recursive:true});
  const prev=fs.existsSync(out)?JSON.parse(fs.readFileSync(out,'utf8')):{};
  const res={};
  for(const k of new Set([...Object.keys(prev),...Object.keys(seen)])){const m=new Map((prev[k]||[]).map((s,i)=>[s,i]));for(const s of (seen[k]?[...seen[k].keys()]:[]))if(!m.has(s))m.set(s,m.size);res[k]=[...m.keys()];}
  fs.writeFileSync(out,JSON.stringify(res,null,1));
  console.log('\nerrors',errs.slice(0,5));await b.close();
})();
