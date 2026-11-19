'use strict';

const finishKey='yeocheon-season-three-v1handoff:';
const progressKey='yeocheon-season-three-v1progress:';
const reader=document.querySelector('#reader');
const save=document.querySelector('#save');
const load=document.querySelector('#load');
const music=document.querySelector('#music');
const status=document.querySelector('#status');
const score=document.querySelector('#score');

function read(key, fallback=null){
  try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}
}
function write(key,data){
  try{localStorage.setItem(key,JSON.stringify(data));return true;}catch{return false;}
}
function answersValid(answers,length){
  return Array.isArray(answers)&&answers.length<=length&&answers.every(pick=>Number.isInteger(pick)&&pick>=0&&pick<=2);
}
function getHandoff(){
  const from=read('yeocheon-season-one-v1progress');
  const allowed={1:[0],2:[0,2],3:[0,2],4:[0,2],5:[0,1,2]};
  if(from?.page!==15||!allowed[from.rank]?.includes(from.ending))return null;
  const rank=from.rank===1?2:from.departureRank??from.rank;
  if(!rankStories[rank]||rank!==(from.rank===1?2:from.rank))return null;
  const lead=[0,1,2].includes(from.rankLead)?from.rankLead:0;
  const source=JSON.stringify([from.rank,rank,from.ending,lead,from.route??0,from.flags??[],from.moves??[]]);
  const handoff=read(finishKey+source);
  if(handoff?.location!=='궁문 바깥'||handoff.rank!==rank||!answersValid(handoff.routeSelections,8)||handoff.routeSelections.length!==8)return null;
  const previous=read('yeocheon-season-two-v1:'+source);
  if(!previous?.answers||JSON.stringify(previous.answers)!==JSON.stringify(handoff.routeSelections))return null;
  const witness=handoff.witness|| (handoff.characters?.seo==='gate-shadow'?'서겸':null);
  return {...handoff,witness,key:source+':'+handoff.routeSelections.join('')};
}
const handoff=getHandoff();
const storageKey=handoff?progressKey+handoff.key:null;
const bookmark=storageKey?storageKey+':bookmark':null;
const valid=state=>state&&answersValid(state.answers,acts.length)&&typeof state.reaction==='boolean'&&(!state.reaction||state.answers.length>0);
let progress=read(storageKey);
if(!valid(progress))progress={answers:[],reaction:false};
let sound=read('yeocheon-season-three-music',read('yeocheon-season-two-music',false));

function text(value){
  return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function button(label,fn,className=''){
  const element=document.createElement('button');
  element.type='button';
  element.textContent=label;
  element.className=className;
  element.onclick=fn;
  return element;
}
function frame(sheet,cut,caption,speaker,line,actionClass='narrative'){
  const size=sheet==='s'?3:4;
  const x=(cut%size)*100/(size-1);
  const y=Math.floor(cut/size)*100/(size-1);
  const art='<div class="picture '+(sheet==='s'?'scene':sheet==='g'?'new':'reaction')+'-picture" data-cut="'+sheet+cut+'" aria-hidden="true" style="background-position:'+x+'% '+y+'%"></div>';
  const words=speaker&&line?'<p class="speech"><strong>'+text(speaker)+'</strong><q>'+text(line)+'</q></p>':'';
  return '<section class="frame '+actionClass+'">'+art+'<div class="frame-body">'+(caption?'<p class="frame-caption">'+text(caption)+'</p>':'')+words+'</div></section>';
}
// ChatGPT로 새로 그린 컷(season-3-new.webp, 'g'). 없으면 원래 그림을 쓴다.
function newCut(slot,sheet,cut){
  const slots=typeof NEW_CUT_SLOTS_3==='object'&&NEW_CUT_SLOTS_3?NEW_CUT_SLOTS_3:{};
  return slot in slots?['g',slots[slot]]:[sheet,cut];
}
function hasNewCut(slot){return typeof NEW_CUT_SLOTS_3==='object'&&!!NEW_CUT_SLOTS_3&&slot in NEW_CUT_SLOTS_3;}
const witnessSlots={'명선':'S3-01','서겸':'S3-02','한 노인':'S3-03','백문재':'S3-04','정윤':'S3-05','박 유모':'S3-06'};
function extraBuildup(step){
  if(step===2&&hasNewCut('S3-07'))return frame(...newCut('S3-07'),'궁 안 약방. 의관 이현이 약재 서랍 앞에서 이서를 맞았다. 손에는 이미 장부 두 권이 들려 있었다.','이현','약값을 받은 날과 약을 건넨 날은 다른 책에 적혀 있습니다.');
  if(step===4&&hasNewCut('S3-08'))return frame(...newCut('S3-08'),'밤이 깊었을 때, 등불을 든 사환이 상궁의 처소 문을 두드렸다. 윤석이 그 뒤에서 종이 한 장을 받아 들었다.','윤석','명령은 적혀 있는데, 내린 사람의 수결이 없습니다.');
  return '';
}
function heading(chapter,title,level='h1'){
  return '<p class="chapter">'+text(chapter)+'</p><'+level+' tabindex="-1">'+text(title)+'</'+level+'>';
}
function saveChange(change){
  change();
  render(true,write(storageKey,progress)?'':'이 브라우저에서 자동 저장할 수 없습니다.');
}
function buildIntro(){
  const rank=rankStories[handoff.rank];
  const focus=handoff.focus;
  const material=focus===0
    ? (handoff.accepted?'문지기가 접수한 ':'이서가 도로 품에 넣은 ')+handoff.document+'도 문 안팎이 갈리는 자리에 와 있었다.'
    : focus===1
      ? (handoff.accepted?'문지기는 함께 온 증인의 이름까지 적어 두었다.':'문지기는 이서의 이름만 먼저 적어 두었다.')
      : (handoff.accepted?'맞이 나온 인계인이 접선 쪽지를 들어 보였다.':'이서가 만날 인계인은 아직 나타나지 않았다.');
  const people=handoff.characters?.gatePeople?.slice(2)??(handoff.witness?[handoff.witness]:[]);
  const present=people.length?'이서가 뒤를 돌아보니 '+people.join('·')+'의 얼굴이 보였다.':'문이 열렸을 때 이서는 혼자였다.';
  const discipline=handoff.discipline?'관아에서 '+handoff.discipline.person+'에게 '+handoff.discipline.sanction+' 처분을 내렸다는 소식도 이미 문 안에 닿았다.':'';
  const gateReply=[
    '원본에 처음 손댄 사람이 누군지 찾아 보라는 문 너머의 말이 이서를 따라왔다.',
    '원본을 달라고 한 사람의 이름을 먼저 확인하라는 말도 이어졌다.',
    '문 안쪽 서리는 증언할 사람들 옆에 죽은 아이의 이름을 적을 빈자리를 뒀다.',
    '문 안에 증인이 하나 더 있다는 말을 떠올리며 이서는 약방 쪽을 보았다.',
    '인계인은 죽은 아이가 맡겨 뒀다는 물건을 찾으려면 침방을 확인하라고 했다.',
    '인계표를 쓴 사람은 아직 확인되지 않았다. 최 상궁이 우선 이서의 방문을 맡았다.'
  ][handoff.ending]??'';
  const clue={child:'소복이 알아본 파란 실 매듭이 떠올랐다.',sailor:'아이와 곡식이 한 배에 실렸다는 여천 사공의 말을 되짚었다.',nurse:'겉봉을 받은 사람과 안쪽 글을 쓴 사람을 따로 보라는 박 유모의 말을 되새겼다.'}[handoff.firstClue]||'';
  return frame('r',14,'궁문 걸쇠가 밀렸다. '+present+' '+material+' '+discipline,'이서','여천에서 시작한 일을 이제 제 이름으로 말씀드리겠습니다. '+clue)+
    frame('r',15,'이서의 신분은 '+rank[0]+'. '+rank[1]+'에서 시작한 물음은 궁 안의 장부까지 이어졌다. '+gateReply);
}
function nameKnown(){
  const a=progress.answers;
  return a[3]===1||(a[3]===0&&a[2]===0);
}
function branchCut(step){
  const a=progress.answers;
  if(step===2&&a[1]===2)return frame('r',4,'약방에 갈 때까지 원장은 상궁에게, 사본은 이서에게 있었다. 윤석은 두 봉투를 한 사람에게 주지 않았다.');
  if(step===2&&a[1]===1)return frame('r',6,'이현은 윤석이 자기 이름으로 남긴 대조 기록을 보고 나서야 진료 날짜를 보여 주었다.');
  if(step===4&&nameKnown())return frame('r',9,'이서는 처음 들은 이름을 속으로 되뇌었다. 채령의 진술과 장부에서 발견된 날짜가 그 이름과 이어지는지 더 확인해야 했다.','이서','난희. 그 이름을 문서에 올릴 근거부터 모으자.');
  if(step===5){
    const action=handoff.discipline?.key;
    const discipline={
      supervisor:'문 주부가 물러난 뒤 장부를 맡은 윤석이 열쇠를 들고 조회에 나왔다. 판관은 직무가 정지된 사람에게 장부를 다시 맡기지 말라고 했다.',
      clerk:'필사가 금지된 하 서리는 조회에 오지 못했다. 윤석은 하 서리의 수결이 남은 줄과 윗사람이 고친 줄을 다른 종이에 옮겨 냈다.',
      messenger:'자리를 잃은 서겸은 조회에 오지 못했다. 이서는 전달 수결을 쓰게 한 명령서도 찾아 달라고 청했다.'
    }[action];
    const first=discipline?frame('r',10,discipline):'';
    if(a[4]===0)return first+frame('r',6,'봉인된 장부가 그대로 조회에 도착했다. 윤석은 색이 다른 두 매듭을 판관에게 보여 주었다.');
    if(a[4]===1)return first+frame('r',12,'판관은 불러 온 사람을 한 방에 몰아넣지 않았다. 서로 다르게 기억하는 시각을 각각 확인했다.');
    return first;
  }
  if(step===6&&a[5]===2)return frame('r',4,'이름이 봉인된 채로 기록만 심리로 넘어왔다. 판관은 그 이름을 사람들 앞에서 읽지 않겠다고 약속했다.');
  if(step===7&&a[6]===0)return frame('r',6,'장부의 날짜를 고친 사람의 수결은 별도의 조사건에 붙었다. 아이의 이름을 정정하는 일과 따로 진행된다.');
  if(step===7&&a[6]===1)return frame('r',11,'다시 부를 증인에게만 전갈이 갔다. 첫 조회에서 하지 못한 말까지 억지로 묻지 않겠다는 약속도 갔다.');
  if(step===7&&a[6]===2)return frame('r',10,'서로 다른 봉인은 다른 곳에 들어갔다. 원본을 본 사람은 보관 명부에 자기 이름을 남겼다.');
  return '';
}
function optionsFor(step){
  const options=[...acts[step].choices];
  if(step===0&&!handoff.witness){
    options[0]='제가 이 기록을 가져왔습니다';
    options[1]='증인을 부를 자리를 마련해 달라고 한다';
  }
  if(step===1)options[0]=rankStories[handoff.rank][2];
  if(step===5&&!nameKnown())options[0]='옷고름과 날짜가 맞는 부분을 먼저 낸다';
  if(step===7&&!nameKnown()){
    options[0]='죽은 아이의 빈 줄과 확인한 근거를 함께 남긴다';
    options[2]='연이의 정정을 먼저 남기고 다른 아이의 단서는 봉인한다';
  }
  return options;
}
function decision(step){
  const act=acts[step];
  const childVisible=handoff.characters?.myeongseon==='travel'||handoff.witness==='명선';
  const image=step===0&&!childVisible?1:act.image;
  const line=step===0?(handoff.witness?'이 증인을 누가 데려왔느냐?':'이 기록을 가지고 온 사람이 너냐?'):act.line;
  const buildup=step===0?buildIntro():extraBuildup(step)+(act.buildup??[]).map(cut=>frame(...cut)).join('')+branchCut(step);
  reader.innerHTML=heading('시즌 3 · '+rankStories[handoff.rank][0],step===0?'문 안의 이름':act.title)+buildup+frame('s',image,'',act.speaker,line,'decision');
  const options=document.createElement('div');
  options.className='choices';
  options.setAttribute('role','group');
  options.setAttribute('aria-label','이서의 선택');
  optionsFor(step).forEach((label,index)=>options.append(button(label,()=>saveChange(()=>{
    progress.answers.push(index);
    progress.reaction=true;
  }))));
  reader.querySelector('.decision .frame-body').append(options);
}
function reaction(step,pick){
  const act=acts[step];
  let [art,caption,speaker,line]=act.outcomes[pick];
  if(step===0&&pick===1&&handoff.witness){
    const words=handoff.witness==='명선'?'제가 들은 이름은 말할 수 있어요. 누구나 제 말을 다 읽을 수 있는 건지 먼저 알려 주세요.':handoff.witness==='서겸'?'제가 그 봉투를 받은 방은 압니다. 안에 든 글을 제가 쓴 건 아닙니다.':'제가 여천에서 직접 본 일부터 제 이름으로 말하겠습니다.';
    const next=frame('r',0,'최 상궁이 그 사람을 향해 몸을 돌렸다.','최 상궁','좋다. 이름과 네가 직접 본 일을 따로 받겠다.');
    reader.innerHTML=heading('방금 고른 행동',optionsFor(step)[pick])+frame(...newCut(witnessSlots[handoff.witness]||'','r',3),caption,handoff.witness,words)+next;
  }else{
    if(step===0&&!handoff.witness&&pick===0){
      line='네가 이 종이를 가져왔다는 말은 적어 두겠다. 누가 직접 봤는지는 장부를 연 뒤에 다시 묻는다.';
    }
    if(step===0&&!handoff.witness&&pick===1){
      art=7;
      caption='이서는 지금 곁에 없는 사람의 이름을 대신 적지 않았다. 상궁은 문밖에 기다리는 자리를 내주었다.';
      line='네가 서명하더라도 증언까지 대신할 수는 없다. 올 수 있는 사람에게 내가 전갈을 넣으마.';
    }
    if(step===1&&pick===0)caption=rankStories[handoff.rank][3];
    if(step===3&&pick===0&&nameKnown())line='약방에서 본 매듭입니다. 나인 장부의 수선 줄에도 난희라는 이름이 남아 있어요.';
    if(step===7&&!nameKnown()&&pick===0)line='확인하지 못한 이름은 지금 쓰지 말아 주세요. 확인한 근거를 이 빈 줄 곁에 두겠습니다.';
    reader.innerHTML=heading('방금 고른 행동',optionsFor(step)[pick])+frame('r',art,caption,speaker,line);
  }
  reader.querySelector('.frame:last-of-type .frame-body').append(button('다음 컷',()=>saveChange(()=>{progress.reaction=false;}),'inline-action'));
}
function finalOutcome(){
  const a=progress.answers;
  const evidence=a.slice(0,7).filter(pick=>pick===0).length;
  const voices=a.slice(0,7).filter(pick=>pick===1).length;
  if(a[7]===2)return 'seal';
  if(a[7]===1&&voices>=2)return 'voices';
  if(a[7]===0&&nameKnown()&&evidence>=3)return 'record';
  return 'pending';
}
function ending(){
  const outcome=finalOutcome();
  const [title,original,line]=verdicts[outcome];
  const caption=outcome==='seal'&&!nameKnown()?'연이는 자기 이름을 되찾았다. 죽은 아이의 옷고름과 진술은 따로 봉했다. 빈 줄을 없애지 말고 근거가 더 생기면 함께 열기로 약속했다.':original;
  const action=handoff.discipline?.key;
  const examined=progress.answers[6]===0;
  const remedy=examined&&action==='messenger'&&outcome==='record'
    ? frame('r',6,'날짜를 바꾼 사람의 수결과 전달받은 사람의 수결이 구분됐다. 조 판관은 서겸의 파면 경위를 다시 심리하라고 문서를 보냈다.','조 판관','봉투를 건넨 명도 확인한 뒤 서겸의 처분을 다시 묻겠습니다.')
    : examined&&action==='clerk'&&outcome==='record'
      ? frame('r',6,'판관은 하 서리가 옮긴 줄과 달라진 날짜를 대조하라고 했다. 필사 금지는 남았지만, 다음 심리에서는 하 서리도 직접 부르기로 했다.')
      : '';
  const responsibility=examined?'날짜를 고친 수결은 별도 조사에 넘어갔다.':progress.answers[6]===1?'서로 다른 증언이 다음 조회의 질문으로 남았다.':'원본과 진술은 별개의 봉인으로 보관됐다.';
  const closing={record:['S3-09','기록관이 연이의 줄과 그 옆줄을 나란히 그었다. 옆줄에는 처음으로 다른 아이의 이름이 들어갔다.'],voices:['S3-10','해가 오르는 마당에 그날 말한 사람들이 서 있었다. 누구도 남의 말을 대신하지 않았다.'],seal:['S3-11','두 봉투는 서로 닿지 않게 놓였다. 하나는 오늘 열렸고, 하나는 약속한 날까지 닫혀 있다.'],pending:['S3-12','판관이 남긴 빈 줄 앞에서 이서는 붓을 들지 않았다. 비워 둔 것도 기록이라고 여겼다.']}[outcome];
  const closingFrame=hasNewCut(closing[0])?frame(...newCut(closing[0]),closing[1]):'';
  reader.innerHTML=heading('시즌 3 완 · '+rankStories[handoff.rank][0],title)+frame('r',13,caption,'이서',line)+closingFrame+remedy+frame('s',8,'해가 뜨자 궁문 바깥까지 발소리가 들렸다. '+responsibility)+
    '<section class="verdict"><h2>궁에 남은 기록</h2><dl><dt>이서의 신분</dt><dd>'+text(rankStories[handoff.rank][0])+'</dd><dt>기록의 결말</dt><dd>'+text(title)+'</dd></dl></section>';
  reader.querySelector('.verdict').append(button('다른 선택으로 다시 읽기',()=>saveChange(()=>{
    progress={answers:[],reaction:false};
  })));
}
function render(focus=false,message=''){
  if(!handoff){
    reader.innerHTML=heading('시즌 3','문 안의 이름')+'<section class="missing"><p>이 브라우저에서 시즌 2의 궁문 결말을 열면, 그때 도착한 사람과 기록을 들고 시즌 3를 시작할 수 있어요.</p><a class="link" href="season-2.html">시즌 2로 돌아가기</a></section>';
  }else if(progress.reaction){
    const last=progress.answers.length-1;
    reaction(last,progress.answers[last]);
  }else if(progress.answers.length===acts.length)ending();
  else decision(progress.answers.length);
  save.disabled=!handoff;
  load.disabled=!bookmark||!valid(read(bookmark));
  status.textContent=message;
  if(focus){
    reader.querySelector('h1,h2')?.focus({preventScroll:true});
    window.scrollTo(0,0);
  }
}
save.onclick=()=>{if(bookmark)render(false,write(bookmark,progress)?'이 컷을 저장했어요.':'이 브라우저에 저장할 수 없습니다.');};
load.onclick=()=>{const mark=bookmark?read(bookmark):null;if(valid(mark))saveChange(()=>{progress=mark;});};
function syncMusic(){
  music.textContent=score.paused?'배경음악 켜기':'배경음악 끄기';
  music.setAttribute('aria-pressed',String(!score.paused));
}
music.onclick=()=>{
  sound=score.paused;
  write('yeocheon-season-three-music',sound);
  if(sound)score.play().then(syncMusic).catch(syncMusic);
  else{score.pause();syncMusic();}
};
document.addEventListener('pointerdown',event=>{
  if(sound&&score.paused&&event.target!==music)score.play().then(syncMusic).catch(syncMusic);
},{once:true});
render();
