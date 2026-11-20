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
  const rows=sheet==='g'?(typeof NEW_CUT_ROWS_3==='number'?NEW_CUT_ROWS_3:5):size; // 새 컷 그림판은 4열, 줄 수는 빌드가 정한다
  const x=(cut%size)*100/(size-1);
  const y=Math.floor(cut/size)*100/(rows-1);
  const sizing=sheet==='g'?';background-size:400% '+rows*100+'%':'';
  const art='<div class="picture '+(sheet==='s'?'scene':sheet==='g'?'new':'reaction')+'-picture" data-cut="'+sheet+cut+'" aria-hidden="true" style="background-position:'+x+'% '+y+'%'+sizing+'"></div>';
  const words=speaker&&line?'<p class="speech"><strong>'+text(speaker)+'</strong><q>'+text(line)+'</q></p>':'';
  return '<section class="frame '+actionClass+'">'+art+'<div class="frame-body">'+(caption?'<p class="frame-caption">'+text(caption)+'</p>':'')+words+'</div></section>';
}
// ChatGPT로 새로 그린 컷(season-3-new.webp, 'g'). 없으면 원래 그림을 쓴다.
function newCut(slot,sheet,cut){
  const slots=typeof NEW_CUT_SLOTS_3==='object'&&NEW_CUT_SLOTS_3?NEW_CUT_SLOTS_3:{};
  return slot in slots?['g',slots[slot]]:[sheet,cut];
}
function hasNewCut(slot){return typeof NEW_CUT_SLOTS_3==='object'&&!!NEW_CUT_SLOTS_3&&slot in NEW_CUT_SLOTS_3;}
// 말하는 사람의 얼굴 컷. 윤석·이현은 새 컷(S3-13·14)이 오기 전까지 두 사람이 나오는 장면 컷을 쓴다.
function speakerPortrait(speaker){
  if(speaker==='최 상궁')return ['r',0];
  if(speaker==='채령')return ['r',8];
  if(speaker==='조 판관')return ['r',12];
  if(speaker==='윤석')return newCut('S3-13','s',2);
  if(speaker==='이현')return newCut('S3-14','s',3);
  if(speaker==='이서')return ['r',1];
  return null;
}
// 그 사람이 이미 그려진 컷이면 대사를 그 칸에 그대로 둔다.
const drawnIn={'최 상궁':['r0','r2','r3','s0','s1','s5','s6','s7'],'채령':['r8','s4'],'조 판관':['r12','s6','s7'],'윤석':['s2'],'이현':['s3'],'이서':['r1','r2','r15','s0','s1','s2','s3','s4','s5','s6','s7','s8']};
function spoken(sheet,cut,caption,speaker,line){
  const face=speaker&&line?speakerPortrait(speaker):null;
  if(!face||(face[0]===sheet&&face[1]===cut)||(drawnIn[speaker]||[]).includes(sheet+cut)||sheet==='g')return frame(sheet,cut,caption,speaker,line);
  return frame(sheet,cut,caption)+frame(face[0],face[1],'',speaker,line);
}
const witnessSlots={'명선':'S3-01','서겸':'S3-02','한 노인':'S3-03','백문재':'S3-04','정윤':'S3-05','박 유모':'S3-06'};
// 시즌 2의 여정(handoff.journey)이 궁 안에서 유리함·불리함으로 이어진다. 예전 기록에는 없으므로 없으면 넘어간다.
function journeyFrame(step){
  const j=handoff.journey;
  if(!j)return '';
  if(step===0){
    const ill=j.body==='ill'?' 이서의 목소리는 길 위에서 오른 열로 쉬어 있었다.':'';
    if(j.pursuit==='ahead')return frame(...speakerPortrait('최 상궁'),'최 상궁은 이서가 이르기 전에 이미 쪽지 한 장을 받아 두었다. 여천에서 온 사람이 무엇을 들고 오는지 적힌 쪽지였다.'+ill,'최 상궁','네 이야기는 다른 입으로 먼저 들었다. 네 입으로 다시 듣고, 두 말이 같은지 보겠다.');
    if(j.arrival==='late')return frame(...speakerPortrait('최 상궁'),'해가 높이 뜬 뒤였다. 최 상궁은 먼저 온 사람들의 이름을 다 부르고 나서야 이서를 불렀다.'+ill,'최 상궁','늦었구나. 기다린 사람이 많으니 요긴한 것부터 말하거라.');
    return frame(...speakerPortrait('최 상궁'),'문을 연 최 상궁은 명단 첫 줄이 이서의 이름인 것을 보고 다른 사람보다 먼저 불렀다.'+ill,'최 상궁','가장 먼저 온 사람의 말부터 듣겠다. 다른 쪽 이야기는 그다음이다.');
  }
  if(step===2){
    const [caption,line]={
      intact:['이서가 펼친 원본은 마른 채 접힌 자리까지 또렷했다. 이현은 사본을 찾지 않고 바로 날짜를 맞춰 보았다.','원본이 이만하면 대조가 빠르겠군요. 사본은 덮어 두시오.'],
      partial:['원본 몇 장은 사본으로만 남아 있었다. 이현은 사본마다 누가 언제 베꼈는지부터 물었다.','베낀 사람 이름이 있으면 됩니다. 없으면 그 줄은 내 장부와 맞춰 보지 않겠소.'],
      damp:['젖어 번진 먹 때문에 날짜 한 자리를 읽을 수 없었다. 이현은 그 자리를 비워 둔 채 나머지만 맞춰 보았다.','젖은 자리를 짐작으로 채우진 않겠소. 그 날짜는 다른 증거로 메우시오.']
    }[j.papers]||[];
    return caption?frame(...speakerPortrait('이현'),caption,'이현',line):'';
  }
  if(step===4){
    const [caption,line]={
      quiet:['원장을 옮기라는 한밤의 명은 늦게 왔다. 그 전에 윤석은 원장을 둔 방의 명부에 이서의 이름을 함께 적어 두었다.','늦게 와 준 덕에 봉인할 틈이 있었소. 오늘 밤은 서두르지 않아도 되오.'],
      followed:['이서가 도성에 든 날부터 뒤를 밟던 사람이 기록청 앞까지 와 있었다. 원장을 옮기라는 명이 하루 일찍 내려왔다.','누가 이 방 시각을 알려 주었는지 모르겠소. 오늘 밤 안에 정해야 하오.'],
      ahead:['이서가 궁에 들기도 전에 원장을 옮기라는 명이 먼저 와 있었다. 윤석은 문서 상자 하나를 벌써 내준 뒤였다.','한 상자는 이미 나갔소. 남은 것이라도 지금 봉해야 하오.']
    }[j.pursuit]||[];
    return caption?frame(...speakerPortrait('윤석'),caption,'윤석',line):'';
  }
  if(step===5&&j.companion!=='none'){
    return j.companion==='steady'
      ? frame('r',7,'궁문까지 함께 온 사람은 조회 자리 뒤편에 앉아 이서와 눈을 맞췄다. 부르면 언제든 나설 수 있었다.')
      : frame('r',7,'궁문까지 함께 온 사람은 먼 길에 지쳐 오래 서 있지 못했다. 판관은 그 사람의 말을 앉은 채로 받으라고 했다.');
  }
  return '';
}
function rankBeat(step){
  const beat=rankBeats3[handoff.rank]?.[step];
  if(!beat)return '';
  const [speaker,caption,line]=beat;
  return frame(...(speakerPortrait(speaker)||['r',4]),caption,speaker,line);
}
function extraBuildup(step){
  if(step===1&&hasNewCut('S3-44'))return frame(...newCut('S3-44'),'기록청 깊은 방. 최 상궁이 문을 열게 하자 윤석이 상자에서 원장을 꺼냈다. 이서는 상궁 곁에서 그 끈을 내려다보았다.');
  if(step===2&&hasNewCut('S3-07'))return frame(...newCut('S3-07'),'궁 안 약방. 의관 이현이 약재 서랍 앞에서 이서를 맞았다. 윤석이 미리 기별을 넣어 둔 참이었다.','이현','기록관이 보냈다고 들었습니다. 제 장부는 두 권인데, 어느 쪽부터 보시겠습니까?');
  if(step===4&&hasNewCut('S3-08'))return frame(...newCut('S3-08'),'밤이 깊었을 때, 등불을 든 사환이 상궁의 처소 문을 두드렸다. 윤석이 먼저 나와 사환이 내민 종이를 받아 들었고, 최 상궁은 문 안쪽에서 지켜보았다.','윤석','원장을 지금 다른 방으로 옮기라는 전갈입니다.');
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
    '문 안쪽 서기는 증언할 사람들 옆에 죽은 아이의 이름을 적을 빈자리를 뒀다.',
    '문 안에 증인이 하나 더 있다는 말을 떠올리며 이서는 약방 쪽을 보았다.',
    '인계인은 죽은 아이가 맡겨 뒀다는 물건을 찾으려면 침방을 확인하라고 했다.',
    '인계표를 쓴 사람은 아직 확인되지 않았다. 최 상궁이 우선 이서의 방문을 맡았다.'
  ][handoff.ending]??'';
  const clue={child:'소복이 알아본 파란 실 매듭이 떠올랐다.',sailor:'아이와 곡식이 한 배에 실렸다는 여천 사공의 말을 되짚었다.',nurse:'겉봉을 받은 사람과 안쪽 글을 쓴 사람을 따로 보라는 박 유모의 말을 되새겼다.'}[handoff.firstClue]||'';
  return frame('r',14,'궁문 걸쇠가 밀렸다. '+present+' '+material+' '+discipline,'이서','여천에서 시작한 일을 이제 제 이름으로 말씀드리겠습니다.')+
    frame('r',15,'이서의 신분은 '+rank[0]+'. '+rank[1]+'에서 시작한 물음은 궁 안의 장부까지 이어졌다. '+(clue?clue+' ':'')+gateReply);
}
function nameKnown(){
  const a=progress.answers;
  return a[3]===1||(a[3]===0&&a[2]===0);
}
function branchCut(step){
  const a=progress.answers;
  if(step===2&&a[1]===2)return frame('r',4,'약방에 갈 때까지 원장은 상궁에게, 사본은 이서에게 있었다. 윤석은 두 봉투를 한 사람에게 주지 않았다.');
  if(step===2&&a[1]===1)return frame('r',6,'윤석이 자기 이름으로 남긴 대조 기록을 내밀자, 이현은 그제야 진료 날짜가 적힌 장을 짚어 보였다.');
  if(step===4&&nameKnown())return frame('r',9,'이서는 처음 들은 이름을 속으로 되뇌었다. 채령의 진술과 장부에서 발견된 날짜가 그 이름과 이어지는지 더 확인해야 했다.','이서','난희. 그 이름을 문서에 올릴 근거부터 모으자.');
  if(step===5){
    const action=handoff.discipline?.key;
    const discipline={
      supervisor:'문 주부가 물러난 뒤 장부를 맡은 윤석이 열쇠를 들고 조회에 나왔다. 판관은 직무가 정지된 사람에게 장부를 다시 맡기지 말라고 했다.',
      clerk:'필사가 금지된 하 서리는 조회에 오지 못했다. 윤석은 하 서리의 수결이 남은 줄과 윗사람이 고친 줄을 다른 종이에 옮겨 냈다.',
      messenger:'자리를 잃은 서겸은 조회에 오지 못했다. 이서는 전달 수결을 쓰게 한 명령서도 찾아 달라고 청했다.'
    }[action];
    const first=discipline?frame(...newCut({supervisor:'S3-15',clerk:'S3-16',messenger:'S3-17'}[action],'r',10),discipline):'';
    if(a[4]===0)return first+frame('r',6,'봉인된 장부가 그대로 조회에 도착했다. 윤석은 색이 다른 두 매듭을 판관에게 보여 주었다.');
    if(a[4]===1)return first+frame('r',7,'판관은 불러 온 사람을 한 방에 몰아넣지 않았다. 따로 놓인 자리마다 서로 다르게 기억하는 시각을 확인했다.');
    return first;
  }
  if(step===6&&a[5]===2)return frame('r',4,'이름이 봉인된 채로 기록만 심리로 넘어왔다. 판관은 그 이름을 사람들 앞에서 읽지 않겠다고 약속했다.');
  if(step===7&&a[6]===0)return frame('r',6,'장부의 날짜를 고친 사람의 수결은 별도의 조사건에 붙었다. 아이의 이름을 정정하는 일과 따로 진행된다.');
  if(step===7&&a[6]===1)return frame('r',3,'다시 부를 증인에게만 전갈이 갔다. 첫 조회에서 하지 못한 말까지 억지로 묻지 않겠다는 약속도 갔다.');
  if(step===7&&a[6]===2)return frame('r',10,'서로 다른 봉인은 다른 곳에 들어갔다. 원본을 본 사람은 보관 명부에 자기 이름을 남겼다.');
  return '';
}
function optionsFor(step){
  const options=[...acts[step].choices];
  if(step===0&&!handoff.witness){
    options[0]='제가 이 기록을 가져왔습니다';
    options[1]='증인 부를 자리를 청한다';
  }
  if(step===1)options[0]=rankStories[handoff.rank][2];
  if(step===5&&!nameKnown())options[0]='맞는 물증부터 낸다';
  if(step===7&&!nameKnown()){
    options[0]='빈 줄과 근거를 남긴다';
    options[2]='연이만 고치고 단서는 봉한다';
  }
  return options;
}
function decision(step){
  const act=acts[step];
  const childVisible=handoff.characters?.myeongseon==='travel'||handoff.witness==='명선';
  const image=step===0&&!childVisible?1:act.image;
  const line=step===0?(handoff.witness?'이 증인을 누가 데려왔느냐?':'이 기록을 가지고 온 사람이 너냐?'):act.line;
  const buildup=step===0?buildIntro()+journeyFrame(0):journeyFrame(step)+rankBeat(step)+extraBuildup(step)+(act.buildup??[]).map(cut=>frame(...cut)).join('')+branchCut(step);
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
function aftermath(step,pick){
  const slot='S3-'+(20+step*3+pick);
  return hasNewCut(slot)?frame(...newCut(slot),aftermathCaptions[step][pick]):'';
}
function reaction(step,pick){
  const act=acts[step];
  let [art,caption,speaker,line]=act.outcomes[pick];
  if(step===0&&pick===1&&handoff.witness){
    const words=handoff.witness==='명선'?'제가 들은 이름은 말할 수 있어요. 누구나 제 말을 다 읽을 수 있는 건지 먼저 알려 주세요.':handoff.witness==='서겸'?'제가 그 봉투를 받은 방은 압니다. 안에 든 글을 제가 쓴 건 아닙니다.':'제가 여천에서 직접 본 일부터 제 이름으로 말하겠습니다.';
    const next=frame('r',0,'최 상궁이 그 사람을 향해 몸을 돌렸다.','최 상궁','좋다. 이름과 네가 직접 본 일을 따로 받겠다.');
    reader.innerHTML=heading('방금 고른 행동',optionsFor(step)[pick])+frame(...newCut(witnessSlots[handoff.witness]||'','r',3),caption,handoff.witness,words)+next+aftermath(step,pick);
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
    if(step===3&&pick===0&&nameKnown())line='이 옷을 고친 날이 나인 장부의 수선 줄에 있어요. 그 줄에 적힌 이름은 난희예요.';
    if(step===7&&!nameKnown()&&pick===0)line='확인하지 못한 이름은 지금 쓰지 말아 주세요. 확인한 근거를 이 빈 줄 곁에 두겠습니다.';
    reader.innerHTML=heading('방금 고른 행동',optionsFor(step)[pick])+spoken('r',art,caption,speaker,line)+aftermath(step,pick);
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
// 시즌 3 신분 목표: 시즌 2에서 지킨 것, 2막에서 신분 증거를 낸 것, 6·7막의 선택을 더한다.
function rankGoalDone3(){
  const a=progress.answers,rank=handoff.rank;
  let score=(handoff.rankGoal?.done?1:0)+(a[1]===0?1:0);
  if(rank===2&&a[6]===0)score++;          // 윗사람의 수결부터 조사: 쌀을 받아 간 관원이 드러난다
  if(rank===3&&(a[6]===0||a[2]===0))score++; // 수결의 주인을 가린다
  if(rank===4&&a[5]===1)score++;          // 직접 본 사람의 진술: 사랑채 사람들의 말이 남는다
  if(rank===5&&(a[6]===2||a[4]===2))score++; // 봉인을 나누어 보관한다
  if(handoff.journey?.papers==='damp')score--;
  return score>=2;
}
// ── 궁 안의 위험: 시즌 2에서 들고 온 약점과 시즌 3에서 앞세운 선택이 쌓인다.
// 신분이 높을수록 더 쌓인다. 양민의 서류는 아무도 눈여겨보지 않지만, 양반·왕족이 기록을 들추면
// 그 이름에 걸린 집안과 당파, 대비전까지 먼저 움직인다.
function heat3(answers){
  const h=handoff,j=h.journey||{};
  let heat=1;
  heat+=({2:0,3:1,4:2,5:3})[h.rank]??0;
  if(h.rank===2&&!h.accepted)heat++; // 양민은 접수되지 못한 서류를 감싸 줄 이름이 없다
  heat+=j.pursuit==='ahead'?2:j.pursuit==='followed'?1:0;
  if(j.papers==='damp')heat++;
  if(!h.accepted)heat++;
  if(h.rankGoal&&!h.rankGoal.done)heat++;
  if(!h.witness)heat++;
  answers.forEach(pick=>{heat+=pick===0?1:pick===2?-1:0;});
  return heat;
}
// 그 막에서 고른 행동이 쌓인 위험과 겹치면 궁에서 밀려난다.
function midFatal3(answers){
  const k=answers.length-1,a=answers,h=heat3(answers);
  if(k===1&&a[1]===0&&(handoff.journey?.papers==='damp'?h>=6:h>=8))return 'framed';
  if(k===2&&a[2]===0&&h>=6)return 'poisoned';
  if(k===3&&a[3]===1&&h>=5&&handoff.rank!==5)return 'accused'; // 왕족을 나인 실종의 범인으로 몰지는 못한다
  if(k===4&&a[4]===1&&h>=5)return 'arson';
  if(k===5&&a[5]===0&&!handoff.witness&&h>=5&&handoff.rank<=3)return 'flogged'; // 양반·왕족에게는 곤장을 치지 못한다
  if(k===6&&a[6]===0&&h>=6)return 'vanished';
  return null;
}
function palaceFall(answers){
  for(let n=2;n<=Math.min(answers.length,7);n++){const fate=midFatal3(answers.slice(0,n));if(fate)return {fate,at:n};}
  return null;
}
function fatal3(fall){
  progress.answers=progress.answers.slice(0,fall.at);
  const step=fall.at-1,pick=progress.answers[step];
  const [title,place,beats]=fatalEndings3[fall.fate];
  reader.innerHTML=heading('방금 고른 행동',optionsFor(step)[pick])+heading('시즌 3 완 · 궁에서 밀려나다',title,'h2')+
    beats.map(([slot,sheet,cut,caption,speaker,line])=>frame(...newCut(slot||'',sheet,cut),caption,speaker||undefined,line||undefined)).join('')+
    '<section class="verdict"><h2>궁에 남은 기록</h2><dl><dt>이서의 신분</dt><dd>'+text(rankStories[handoff.rank][0])+'</dd><dt>이서가 있는 곳</dt><dd>'+text(place)+'</dd></dl><p>이 길에서는 궁 안의 일을 끝까지 묻지 못했습니다.</p></section>';
  const box=reader.querySelector('.verdict');
  box.append(button('방금 고른 선택 다시 하기',()=>saveChange(()=>{progress.answers=progress.answers.slice(0,-1);progress.reaction=false;})));
  box.append(button('시즌 3 처음부터 다시 읽기',()=>saveChange(()=>{progress={answers:[],reaction:false};})));
}
function journeyNote(j){
  return [{early:'새벽 첫 줄로 들어섰다',late:'해가 높이 뜬 뒤에 들어섰다'}[j.arrival],
    {intact:'원본은 마른 채 온전했다',partial:'원본 몇 장은 사본이었다',damp:'젖은 날짜 한 자리는 다른 증거로 메웠다'}[j.papers],
    {quiet:'뒤따른 사람은 없었다',followed:'도성까지 뒤를 밟은 사람이 있었다',ahead:'이서가 온다는 말이 먼저 궁에 닿아 있었다'}[j.pursuit]].filter(Boolean).join(' · ');
}
function ending(){
  const outcome=finalOutcome();
  const [title,original,line]=verdicts[outcome];
  const caption=outcome==='seal'&&!nameKnown()?'연이는 자기 이름을 되찾았다. 죽은 아이의 옷고름과 진술은 따로 봉했다. 빈 줄을 없애지 말고 근거가 더 생기면 함께 열기로 약속했다.':original;
  const action=handoff.discipline?.key;
  const examined=progress.answers[6]===0;
  const remedy=examined&&action==='messenger'&&outcome==='record'
    ? frame(...newCut('S3-19','r',6),'날짜를 바꾼 사람의 수결과 전달받은 사람의 수결이 구분됐다. 조 판관은 서겸의 파면 경위를 다시 심리하라고 문서를 보냈다.','조 판관','봉투를 건넨 명도 확인한 뒤 서겸의 처분을 다시 묻겠습니다.')
    : examined&&action==='clerk'&&outcome==='record'
      ? frame('r',6,'판관은 하 서리가 옮긴 줄과 달라진 날짜를 대조하라고 했다. 필사 금지는 남았지만, 다음 심리에서는 하 서리도 직접 부르기로 했다.')
      : '';
  const responsibility=examined?'날짜를 고친 수결은 별도 조사에 넘어갔다.':progress.answers[6]===1?'서로 다른 증언이 다음 조회의 질문으로 남았다.':'원본과 진술은 별개의 봉인으로 보관됐다.';
  const closing={record:['S3-09','윤석이 마지막 붓을 거두었다. 비워 두었던 옆줄에 처음으로 난희의 이름이 들어갔다.'],voices:['S3-10','해가 오르는 마당에 그날 말한 사람들이 서 있었다. 누구도 남의 말을 대신하지 않았다.'],seal:['S3-11','등불 아래 두 봉투가 남았다. 하나는 오늘 끈이 풀렸고, 다른 하나는 약속한 날까지 묶여 있다.'],pending:['S3-12','판관이 남긴 빈 줄 앞에서 이서는 붓을 들지 않았다. 비워 둔 것도 기록이라고 여겼다.']}[outcome];
  const closingFrame=hasNewCut(closing[0])?frame(...newCut(closing[0]),closing[1]):'';
  const done=rankGoalDone3();
  const [goalName,win,lose,places]=rankGoals3[handoff.rank];
  const [gslot,gsheet,gcut,gcaption,gspeaker,gline]=done?win:lose;
  const goalFrame=frame(...newCut(gslot,gsheet,gcut),gcaption,gspeaker,gline);
  const place=places[done?0:1];
  const entryFrame=frame(...newCut('S3-'+({2:53,3:54,4:55,5:56}[handoff.rank]),'r',14),
    '며칠 뒤, 날짜를 고치라 지시한 쪽지가 장부 틈에서 나왔다. 귀퉁이에는 대비전 지밀의 인장이, 접힌 안쪽에는 별채의 매듭이 남아 있었다. '+verdictHooks[outcome]+' 이서는 '+place.split('.')[0]+'.',
    '이서','여기서 멈추면 저 문 안쪽은 아무도 묻지 않을 거예요. 이번엔 제가 안으로 들어가겠습니다.');
  try{localStorage.setItem('yeocheon-season-four-v1handoff:'+storageKey,JSON.stringify({version:1,rank:handoff.rank,verdict:outcome,rankGoal:{name:goalName,done},entry:place,journey:handoff.journey??null,witness:handoff.witness??null,answers:[...progress.answers]}));}catch(e){}
  reader.innerHTML=heading('시즌 3 완 · '+rankStories[handoff.rank][0],title)+frame(...newCut('S3-18','r',1),caption,'이서',line)+closingFrame+remedy+frame('s',8,'해가 뜨자 궁문 바깥까지 발소리가 들렸다. '+responsibility)+goalFrame+entryFrame+
    '<section class="verdict"><h2>궁에 남은 기록</h2><dl><dt>이서의 신분</dt><dd>'+text(rankStories[handoff.rank][0])+'</dd><dt>기록의 결말</dt><dd>'+text(title)+'</dd>'+'<dt>신분의 몫</dt><dd>'+text(goalName+' · '+(done?'이룸':'놓침'))+'</dd><dt>시즌 4 · 궁 안의 이름</dt><dd>'+text(place)+'</dd>'+(handoff.journey?'<dt>궁에 들기까지</dt><dd>'+text(journeyNote(handoff.journey))+'</dd>':'')+'</dl></section>';
  reader.querySelector('.verdict').append(button('다른 선택으로 다시 읽기',()=>saveChange(()=>{
    progress={answers:[],reaction:false};
  })));
}
function render(focus=false,message=''){
  if(!handoff){
    reader.innerHTML=heading('시즌 3','문 안의 이름')+'<section class="missing"><p>이 브라우저에서 시즌 2의 궁문 결말을 열면, 그때 도착한 사람과 기록을 들고 시즌 3를 시작할 수 있어요.</p><a class="link" href="season-2.html">시즌 2로 돌아가기</a></section>';
  }else if(palaceFall(progress.answers)){
    fatal3(palaceFall(progress.answers));
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
