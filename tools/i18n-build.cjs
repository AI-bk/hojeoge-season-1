// docs/i18n/en/*.tsv(한국어 문장 \t 영어)를 합쳐 site/i18n/en.js를 만들고, 빠진 문장을 센다.
// 사용법: node tools/i18n-build.cjs [--missing <시즌 키> <개수>]  (빠진 문장 목록을 순서대로 보여 준다)
const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'../docs/i18n/en');
const dict={};let dup=0;
for(const f of fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>f.endsWith('.tsv')).sort():[]){
  for(const [i,line] of fs.readFileSync(path.join(dir,f),'utf8').split('\n').entries()){
    if(!line.trim()||line.startsWith('#'))continue;
    const tab=line.indexOf('\t');
    if(tab<0)throw new Error(f+':'+(i+1)+' 탭이 없습니다');
    const ko=line.slice(0,tab).replace(/\s+/g,' ').trim(),en=line.slice(tab+1).trim();
    if(!en)continue;
    if(dict[ko]!=null&&dict[ko]!==en)dup++;
    dict[ko]=en;
  }
}
const out=path.join(__dirname,'../site/i18n/en.js');
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,'// tools/i18n-build.cjs가 docs/i18n/en/*.tsv로 만든다. 직접 고치지 않는다.\nwindow.I18N_EN='+JSON.stringify(dict)+';\n');
const seen=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/i18n/ko-sentences.json'),'utf8'));
const report=Object.entries(seen).map(([k,list])=>{const miss=list.filter(s=>dict[s]==null);return [k,list.length,miss];});
console.log('entries',Object.keys(dict).length,'(conflicting duplicates '+dup+')');
for(const [k,n,miss] of report)console.log(k,'translated',n-miss.length,'/',n);
const i=process.argv.indexOf('--missing');
if(i>0){const k=process.argv[i+1],n=+process.argv[i+2]||50;const r=report.find(x=>x[0]===k);console.log((r?r[2]:[]).slice(0,n).join('\n'));}
