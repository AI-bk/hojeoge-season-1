'use strict';
// 시즌 4 · 궁 안의 이름 (완결). Claude 설계판: 이야기 season-4-story.js, 그림 배정 season-4-art.js.
// 고른 답(answers)만 저장하고 결말·실패는 매번 resolve4로 다시 계산한다.
// answers: [0..6] 일곱 막(0 증거, 1 사람, 2 봉함), [7] 0 왕 / 1 대비, [8] 그 사람이 내건 마지막 조건.

const handoffPrefix4='yeocheon-season-four-v1handoff:';
const latestKey4='yeocheon-season-four-v1latest';
const progressKey4='yeocheon-season-four-v2progress:'; // v2: Claude 설계판. 예전 판(v1) 진행 기록과 섞이지 않게 열쇠를 바꿨다
const rankNames4={2:'양민',3:'중인',4:'양반',5:'왕족'};
const reader=document.querySelector('#reader');
const save=document.querySelector('#save');
const load=document.querySelector('#load');
const music=document.querySelector('#music');
const status=document.querySelector('#status');
const score=document.querySelector('#score');

function read(key,fallback=null){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function write(key,data){try{localStorage.setItem(key,JSON.stringify(data));return true;}catch{return false;}}
const verdictKinds4=['record','voices','seal','pending'];
function handoffValid(h){return h&&h.version===1&&rankNames4[h.rank]&&verdictKinds4.includes(h.verdict)&&typeof h.rankGoal?.done==='boolean';}
// 시즌 3 결말이 남긴 기록. 가장 최근 것을 가리키는 열쇠가 있으면 그것을, 없으면 저장된 것 가운데 하나를 찾는다.
function getHandoff(){
  const latest=read(latestKey4);
  if(typeof latest==='string'){const h=read(handoffPrefix4+latest);if(handoffValid(h))return {...h,key:latest};}
  try{
    for(let i=localStorage.length-1;i>=0;i--){
      const k=localStorage.key(i);
      if(k&&k.startsWith(handoffPrefix4)){const h=read(k);if(handoffValid(h))return {...h,key:k.slice(handoffPrefix4.length)};}
    }
  }catch{}
  return null;
}
const handoff=getHandoff();
const storageKey=handoff?progressKey4+handoff.key:null;
const bookmark=storageKey?storageKey+':bookmark':null;
const ACTS=acts4.length; // 7
function answersOk(a){
  if(!Array.isArray(a)||a.length>ACTS+2)return false;
  return a.every((p,i)=>Number.isInteger(p)&&p>=0&&p<=(i<ACTS?2:1));
}
const valid=s=>s&&answersOk(s.answers)&&typeof s.reaction==='boolean'&&(!s.reaction||(s.answers.length>0&&s.answers.length<=ACTS));
let progress=read(storageKey);
if(!valid(progress))progress={answers:[],reaction:false};
let sound=read('yeocheon-season-four-music',read('yeocheon-season-three-music',false));

// ── 글과 그림 ──
const isRoyal=()=>royal4(handoff);
const say=v=>v&&typeof v==='object'?(isRoyal()?v.royal:v.other):v; // {royal,other}로 나뉜 문장
function text(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function button(label,fn,className=''){const b=document.createElement('button');b.type='button';b.textContent=label;b.className=className;b.onclick=fn;return b;}
function picture(slot){
  const slots=typeof NEW_CUT_SLOTS_4==='object'&&NEW_CUT_SLOTS_4?NEW_CUT_SLOTS_4:{};
  if(!(slot in slots))return '';
  const rows=typeof NEW_CUT_ROWS_4==='number'?NEW_CUT_ROWS_4:1,cut=slots[slot];
  const x=(cut%4)*100/3,y=rows>1?Math.floor(cut/4)*100/(rows-1):0;
  return '<div class="picture new-picture" data-cut="'+slot+'" aria-hidden="true" style="background-position:'+x+'% '+y+'%;background-size:400% '+rows*100+'%"></div>';
}
// 칸 하나: 이야기 데이터의 [그림, 해설, 말한 사람, 대사]. 그림 번호는 처지(옷)에 맞게 바꿔서 쓴다.
const cutOf=([id,caption,who,line])=>[art4(id,handoff),caption,who,line];
function frame([slot,caption,who,line],cls='narrative'){
  const pic=picture(slot),c=say(caption),l=say(line);
  const words=who&&l?'<p class="speech"><strong>'+text(who)+'</strong><q>'+text(l)+'</q></p>':'';
  return '<section class="frame '+cls+(pic?'':' no-art')+'" data-slot="'+text(slot)+'">'+pic+'<div class="frame-body">'+(c?'<p class="frame-caption">'+text(c)+'</p>':'')+words+'</div></section>';
}
function heading(chapter,title,level='h1'){return '<p class="chapter">'+text(chapter)+'</p><'+level+' tabindex="-1">'+text(title)+'</'+level+'>';}
function saveChange(change){change();render(true,write(storageKey,progress)?'':'이 브라우저에서 자동 저장할 수 없습니다.');}
const startKey=()=>handoff.rank+':'+(handoff.rankGoal.done?1:0);
const chapter=step=>'시즌 4 · '+(step+1)+' / 8 · '+rankNames4[handoff.rank];

// ── 막마다 선택 앞에 나오는 칸들 ──
function buildup(step){
  const F=[];
  if(step===0){
    const [,cap,who,line]=entries4[startKey()];
    F.push([entry4(handoff),cap,who,line]);
    const [id,hcap]=verdictHooks4[handoff.verdict];
    F.push([hook4(handoff.verdict,id,handoff),hcap,'','']);
  }
  const act=acts4[step];
  act.buildup.forEach(c=>F.push(cutOf(c)));
  const beat=rankBeats4[handoff.rank]?.[step];
  if(beat){const [who,cap,line]=beat;F.push([speakerArt4[who]||art4(act.art,handoff),cap,who,line]);}
  F.push([art4(act.art,handoff),'',act.speaker,act.line]);
  return F;
}
function choicesBox(labels,pick){
  const box=document.createElement('div');box.className='choices';
  labels.forEach((label,i)=>box.append(button(label,()=>saveChange(()=>pick(i)))));
  return box;
}
function decisionScreen(title,chap,F,question,labels,pick){
  reader.innerHTML=heading(chap,title)+F.slice(0,-1).map(f=>frame(f)).join('')+frame(F.at(-1),'decision');
  const body=reader.querySelector('.decision .frame-body');
  const q=document.createElement('p');q.className='question';q.textContent=question;body.append(q);
  body.append(choicesBox(labels,pick));
}
function decision(step){
  const act=acts4[step];
  decisionScreen(act.title,chapter(step),buildup(step),'이서는 어떻게 할까?',act.choices,i=>{progress.answers.push(i);progress.reaction=true;});
  playTrack('s4-ost-0'+(step+1));
}
function finalDecision(){
  decisionScreen(finalChoice4.title,chapter(7),finalChoice4.buildup.map(cutOf),'이서는 누구의 손을 잡을까?',finalChoice4.choices,i=>{progress.answers.push(i);});
  playTrack('s4-ost-08');
}
function conditionDecision(){
  const a=progress.answers,c=finalChoice4.conditions[a[7]];
  decisionScreen('마지막 조건',chapter(7)+' · '+finalChoice4.choices[a[7]],[[art4(c.art,handoff),'',c.speaker,c.line]],'이서의 대답은?',finalOptions4(a),i=>{progress.answers.push(i);});
  playTrack('s4-ost-08');
}
function reaction(step,pick){
  reader.innerHTML=heading('방금 고른 행동',acts4[step].choices[pick])+frame(cutOf(acts4[step].outcomes[pick]));
  const box=document.createElement('section');box.className='verdict';
  box.append(button(step<ACTS-1?'다음 막으로':'그날 밤으로',()=>saveChange(()=>{progress.reaction=false;}),'inline-action'));
  reader.append(box);
  playTrack('s4-ost-0'+(step+1));
}
// 고른 행동 이름(실패 화면 머리에 쓴다)
function pickedLabel(at){
  const a=progress.answers,step=at-1;
  if(step<ACTS)return acts4[step].choices[a[step]];
  return finalOptions4(a)[a[8]];
}
function fatal4(r){
  progress.answers=progress.answers.slice(0,r.at);
  const step=r.at-1,[title,place,beats]=fatalEndings4[r.fate];
  const lead=step<ACTS?frame(cutOf(acts4[step].outcomes[progress.answers[step]])):'';
  reader.innerHTML=heading('방금 고른 행동',pickedLabel(r.at))+lead+heading('시즌 4 완 · 궁에서 밀려나다',title,'h2')+beats.map(c=>frame(cutOf(c))).join('')+
    '<section class="verdict"><h2>궁에 남은 기록</h2><dl><dt>이서의 신분</dt><dd>'+text(rankNames4[handoff.rank])+'</dd><dt>이서가 있는 곳</dt><dd>'+text(place)+'</dd></dl><p>이 길에서는 지워진 이름들을 끝내 되찾지 못했습니다. 다른 선택으로 다시 읽어 보세요.</p></section>';
  const box=reader.querySelector('.verdict');
  box.append(button('방금 고른 선택 다시 하기',()=>saveChange(()=>{progress.answers=progress.answers.slice(0,-1);progress.reaction=false;})));
  box.append(button('시즌 4 처음부터 다시 읽기',()=>saveChange(()=>{progress={answers:[],reaction:false};})));
  playTrack('s4-ost-e5');
}
function ending4(r){
  const {title,beats}=endings4[r.ending];
  reader.innerHTML=heading('시즌 4 완 · '+rankNames4[handoff.rank],title)+beats.map(c=>frame(cutOf(c))).join('')+
    '<section class="verdict"><h2>호적에 없는 봄 · 완결</h2><dl><dt>이서의 신분</dt><dd>'+text(rankNames4[handoff.rank])+'</dd><dt>처음 선 자리</dt><dd>'+text(entries4[startKey()][0])+'</dd><dt>시즌 4의 결말</dt><dd>'+text(title)+'</dd></dl><p>《호적에 없는 봄》은 시즌 4로 끝납니다. 결말은 다섯 가지입니다. 다른 선택으로 다른 봄을 만나 보세요.</p></section>';
  reader.querySelector('.verdict').append(button('다른 선택으로 다시 읽기',()=>saveChange(()=>{progress={answers:[],reaction:false};})));
  try{localStorage.setItem('yeocheon-season-four-v2ending:'+handoff.key,JSON.stringify({version:2,rank:handoff.rank,ending:r.ending,answers:[...progress.answers]}));}catch{}
  playTrack('s4-ost-'+r.ending.toLowerCase());
}
function render(focus=false,message=''){
  if(!handoff){
    reader.innerHTML=heading('시즌 4','궁 안의 이름')+'<section class="missing"><p>이 브라우저에서 시즌 3의 결말(궁에 들어가는 장면)까지 읽으면, 그때의 신분과 판결을 들고 시즌 4를 시작할 수 있어요.</p><a class="link" href="season-3.html">시즌 3로 돌아가기</a></section>';
    playTrack('s4-ost-00');
  }else{
    const a=progress.answers,r=resolve4(handoff,a);
    if(r&&r.ending==='E5')fatal4(r);
    else if(r)ending4(r);
    else if(progress.reaction)reaction(a.length-1,a.at(-1));
    else if(a.length<ACTS)decision(a.length);
    else if(a.length===ACTS)finalDecision();
    else conditionDecision();
  }
  save.disabled=!handoff;
  load.disabled=!bookmark||!valid(read(bookmark));
  status.textContent=message;
  if(focus){reader.querySelector('h1,h2')?.focus({preventScroll:true});window.scrollTo(0,0);}
}

// ── 음악: 막마다 곡, 결말은 E1~E5, 시작 전 화면은 주제곡 ──
let track4='';
function playTrack(name){
  if(track4===name)return;
  track4=name;
  const wasPlaying=!score.paused;
  score.src='audio/'+name+'.mp3';
  if(wasPlaying||sound)score.play().then(syncMusic).catch(syncMusic);
}
score.volume=.44; // 시즌 4 곡은 원본이 작아 시즌 1·2(.32)보다 크게 튼다
function syncMusic(){music.textContent=score.paused?'배경음악 켜기':'배경음악 끄기';music.setAttribute('aria-pressed',String(!score.paused));}
music.onclick=()=>{sound=score.paused;write('yeocheon-season-four-music',sound);if(sound)score.play().then(syncMusic).catch(syncMusic);else{score.pause();syncMusic();}};
document.addEventListener('pointerdown',e=>{if(sound&&score.paused&&e.target!==music)score.play().then(syncMusic).catch(syncMusic);},{once:true});
save.onclick=()=>{if(bookmark)render(false,write(bookmark,progress)?'이 컷을 저장했어요.':'이 브라우저에 저장할 수 없습니다.');};
load.onclick=()=>{const mark=bookmark?read(bookmark):null;if(valid(mark))saveChange(()=>{progress=mark;});};
render();
