// 번역할 문장 목록: 화면에서 모은 문장(처음 본 순서) + 소스에만 있는 온전한 문장. 사전에 이미 있는 것은 뺀다.
// 사용법: node tools/i18n-todo.cjs <시즌 키 s3> <소스 파일들…>  → 표준 출력에 한 줄씩
const fs=require('fs'),vm=require('vm'),{execFileSync}=require('child_process');
const [key,...files]=process.argv.slice(2);
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../site/i18n/en.js','utf8'),ctx);
const dict=ctx.window.I18N_EN;
const seen=JSON.parse(fs.readFileSync(__dirname+'/../docs/i18n/ko-sentences.json','utf8'))[key]||[];
const list=seen.filter(s=>dict[s]==null);
const stat=files.length?execFileSync('node',[__dirname+'/i18n-static.cjs',...files],{stdio:['ignore','pipe','ignore']}).toString().split('\n').filter(Boolean):[];
const have=new Set(list);
for(const t of stat)if(!have.has(t)&&!/[<>]/.test(t)&&!/^[·은는이가도의’을를]/.test(t)){list.push(t);have.add(t);}
console.log(list.join('\n'));console.error('todo',list.length);
