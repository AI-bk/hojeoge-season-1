// 시즌 4(Claude 설계판)에서 실제로 화면에 나올 수 있는 그림 번호를 모두 뽑는다.
// 8가지 시작 처지 × 모든 컷을 season-4-art.js의 배정 규칙으로 바꿔 본 결과다. 출력은 한 줄에 하나.
const path=require('path');
const site=path.resolve(__dirname,'../site');
const s=require(path.join(site,'season-4-story.js'));
const m=require(path.join(site,'season-4-art.js'));
const ids=new Set(),raw=new Set();
const cut=c=>raw.add(c[0]);
s.acts4.forEach(a=>{raw.add(a.art);a.buildup.forEach(cut);a.outcomes.forEach(cut);});
s.finalChoice4.buildup.forEach(cut);
s.finalChoice4.conditions.forEach(c=>raw.add(c.art));
Object.values(s.endings4).forEach(e=>e.beats.forEach(cut));
Object.values(s.fatalEndings4).forEach(e=>e[2].forEach(cut));
for(const rank of [2,3,4,5])for(const done of [true,false]){
  const h={rank,rankGoal:{done}};
  ids.add(m.entry4(h));
  for(const [v,hook] of Object.entries(s.verdictHooks4))ids.add(m.hook4(v,hook[0],h));
  for(const id of raw)ids.add(m.art4(id,h));
}
Object.values(m.speakerArt4).forEach(v=>ids.add(v));
console.log([...ids].sort().join('\n'));
