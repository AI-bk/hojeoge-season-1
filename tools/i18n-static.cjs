// 소스 파일의 한국어 글자 덩어리(따옴표 문자열)를 문장으로 나눠, 사전에 없는 것을 보여 준다.
// 화면에서 조합되는 조각도 섞여 나오므로 사람이 보고 골라 번역한다.
// 사용법: node tools/i18n-static.cjs site/season-2-story.js [site/season-2.js …]
const fs=require('fs'),vm=require('vm');
const ctx={window:{},document:{readyState:'complete',documentElement:{lang:'',classList:{add(){}}},addEventListener(){}},location:{search:''},navigator:{languages:['ko']},localStorage:{getItem(){return 'ko'},setItem(){}}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../site/i18n.js','utf8'),ctx);
const I=ctx.window.HOJEOGE_I18N;
const dict={};vm.runInContext(fs.readFileSync(__dirname+'/../site/i18n/en.js','utf8'),ctx);Object.assign(dict,ctx.window.I18N_EN);
const out=new Set();
for(const f of process.argv.slice(2)){
  const s=fs.readFileSync(f,'utf8');
  for(const m of s.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g)){
    const t=(m[1]??m[2]).replace(/\\'/g,"'").replace(/\\"/g,'"');
    if(!/[가-힣]/.test(t))continue;
    for(const p of I.split(t))if(/[가-힣]/.test(p)&&dict[p]==null)out.add(p);
  }
}
console.log([...out].join('\n'));console.error('untranslated',out.size);
