'use strict';

const seasonOneKey = 'yeocheon-season-one-v1progress';
const seasonTwoKey = 'yeocheon-season-two-v1';

function read(key,fallback=null){
  try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}
}
function write(key,data){
  try{localStorage.setItem(key,JSON.stringify(data));return true;}catch{return false;}
}

function inherit(from){
  if(from?.page!==15||!Number.isInteger(from.ending))return null;
  const legal=[[0],[0,2],[0,2],[0,2],[0,2],[0,1,2]];
  if(!legal[from.rank]?.includes(from.ending))return null;
  if(from.rank===0||(from.rank===1&&from.ending===2))return null;
  const rank=from.rank===1&&from.ending===0?2:from.departureRank??from.rank;
  if(!travelers[rank]||rank!==(from.rank===1?2:from.rank))return null;
  const lead=[0,1,2].includes(from.rankLead)?from.rankLead:0;
  return {
    rank, previousRank:from.rank, ending:from.ending, lead,
    first:from.flags?.find?.(flag=>['child','sailor','nurse'].includes(flag))??null,
    key:JSON.stringify([from.rank,rank,from.ending,lead,from.route??0,from.flags??[],from.moves??[]])
  };
}
const inherited=inherit(read(seasonOneKey));
const route=inherited?travelers[inherited.rank]:null;
const turns=inherited?routeTurns[inherited.rank]:null;
const currentKey=inherited?seasonTwoKey+':'+inherited.key:null;

function fresh(){return {answers:[],reaction:false};}
function validProgress(value){
  return value&&Array.isArray(value.answers)&&value.answers.length<=8
    &&value.answers.every(answer=>Number.isInteger(answer)&&answer>=0&&answer<=2)
    &&typeof value.reaction==='boolean'&&(!value.reaction||(value.answers.length>0&&value.answers.length<8));
}
const saved=currentKey?read(currentKey):null;
let progress=validProgress(saved)?saved:fresh();
const reader=document.querySelector('#reader');
const save=document.querySelector('#save');
const load=document.querySelector('#load');
const status=document.querySelector('#status');
const music=document.querySelector('#music');
const score=document.querySelector('#score');
let scoreChoice=read('yeocheon-season-two-music',read('yeocheon-season-one-v1music',true));
let scoreTrack='';
const seasonTheme='s2-00-theme';
score.volume=.32; // 시즌 1 주제곡과 같은 크기로 들리게
function updateScore(){
  music.textContent=score.paused?'배경음악 켜기':'배경음악 끄기';
  music.setAttribute('aria-pressed',String(!score.paused));
}
function syncScore(){
  if(!scoreChoice){score.pause();updateScore();return;}
  // 2026-11-22: 시즌 2는 사용자가 만든 주제곡을 처음부터 끝까지 깐다(이전 장면별 곡은 seasonTheme을 비우면 돌아온다).
  const track=seasonTheme||(progress.answers.length>=7?'spring':progress.answers.length>=3?'night-ferry':'after-rain');
  if(track!==scoreTrack){
    score.src='audio/'+track+'.mp3';
    scoreTrack=track;
  }
  if(score.paused)score.play().then(updateScore).catch(updateScore);
}

function topic(name){
  const code=name.charCodeAt(name.length-1)-0xac00;
  return name+(code>=0&&code<11172&&code%28?'은':'는');
}
function subject(name){
  const code=name.charCodeAt(name.length-1)-0xac00;
  return name+(code>=0&&code<11172&&code%28?'이':'가');
}
function escaped(value){
  return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function art(kind,cut){
  const x=cut%4*100/3;
  const rows=kind==='g'?(typeof NEW_CUT_ROWS_2==='number'?NEW_CUT_ROWS_2:4):0; // 새 컷 그림판은 4열, 줄 수는 빌드가 정한다
  const y=kind==='g'?Math.floor(cut/4)*100/(rows-1):Math.floor(cut/4)*((kind==='n'||kind==='r'||kind==='k')?100/3:50);
  const sizing=kind==='g'?';background-size:400% '+rows*100+'%':'';
  return '<div class="art'+(kind==='e'?' detail':kind==='n'?' narrative':kind==='r'?' route-art':kind==='k'?' close-art':kind==='g'?' new-art':'')+'" data-art="'+kind+cut+'" aria-hidden="true" style="background-position:'+x+'% '+y+'%'+sizing+'"></div>';
}
let sceneStep=0;
// 새로 그린 컷(season-2-new.webp)이 있으면 그 칸을, 없으면 원래 그림을 쓴다.
function withNew(slot,entry){
  const slots=typeof NEW_CUT_SLOTS==='object'&&NEW_CUT_SLOTS?NEW_CUT_SLOTS:{};
  return slot in slots?['g',slots[slot],...entry.slice(2)]:entry;
}
function hasNew(slot){return typeof NEW_CUT_SLOTS==='object'&&!!NEW_CUT_SLOTS&&slot in NEW_CUT_SLOTS;}
function faceCut(speaker){
  const faces={'연이':0,'하 서리':2,'서겸':3,'명선':4,'검문 아전':6,'사환':10,'인계인':11,'접수 관원':11};
  const companions={2:1,3:8,4:9,5:7};
  if(speaker==='이서')return sceneStep<=1||sceneStep===3?15:sceneStep===2?14:sceneStep<=5?12:13;
  if(route&&speaker===route.companion)return companions[inherited.rank];
  return faces[speaker]??null;
}
function panel(kind,cut,caption,lines=[]){
  const groups=[[kind,cut,caption,[]]];
  for(const line of lines){
    const face=faceCut(line[0]);
    const last=groups[groups.length-1];
    if(last[3].length&&face!==null&&!(last[0]==='k'&&last[1]===face))groups.push(['k',face,null,[line]]);
    else last[3].push(line);
  }
  return groups.map(([k,c,cap,ls])=>frame(k,c,cap,ls)).join('');
}
function frame(kind,cut,caption,lines=[]){
  return '<figure class="beat">'+art(kind,cut)+'<figcaption>'+(caption?'<p>'+escaped(caption)+'</p>':'')+
    lines.map(([speaker,line])=>'<div class="talk"><strong>'+escaped(speaker)+'</strong><q>'+escaped(line)+'</q></div>').join('')+'</figcaption></figure>';
}
function options(labels,handler){
  const nav=document.createElement('div');
  nav.className='choices';
  for(const [index,label] of labels.entries()){
    const button=document.createElement('button');
    button.type='button';
    if(labels.length===1)button.className='primary';
    button.textContent=label;
    button.onclick=()=>handler(index);
    nav.append(button);
  }
  reader.append(nav);
}
function commit(change){
  change();
  const stored=write(currentKey,progress);
  render(true,stored?'':'이 브라우저에서 자동 저장할 수 없습니다.');
}
function choose(index){
  commit(()=>{
    progress.answers.push(index);
    progress.reaction=progress.answers.length<8;
  });
  syncScore();
}

// 궁문 앞 결말: 준비한 방식(기존 규칙)에 여정이 남긴 유리함·불리함을 더한다.
function endingDetail(answers){
  const focus=answers[6];
  const approach=answers[7];
  const prepared=answers[5]===focus||answers[1]===focus||answers[2]===focus||(focus===0&&answers[0]===0);
  const effective=focus===1?(answers[3]===1||answers[1]===1&&answers[5]===1):prepared;
  const registered=answers[5]===focus&&(focus!==1||effective);
  let ok=(approach===0&&effective)||(approach===2&&registered);
  let effect=null;
  const j=journeyAt(answers);
  if(focus===0){
    if(ok&&j.papersState==='damp'){ok=false;effect='damp';}
    else if(ok&&j.pursuit==='ahead'){ok=false;effect='forewarned';}
    else if(!ok&&j.papersState==='intact'&&j.arrival==='early'&&j.pursuit==='quiet'){ok=true;effect='dry-dawn';}
  }else if(focus===1){
    const cast=castAt(answers);
    const witness=cast.myeongseon==='travel'||cast.escort==='gate';
    const companion=journeyRecord(answers,cast).companion;
    if(ok&&j.body==='ill'){ok=false;effect='ill';}
    else if(ok&&companion==='weary'){ok=false;effect='weary';}
    else if(!ok&&witness&&companion==='steady'&&j.arrival==='early'){ok=true;effect='steady-dawn';}
  }else{
    if(ok&&j.arrival==='late'&&j.pursuit!=='quiet'){ok=false;effect='intercepted';}
    else if(!ok&&j.arrival==='early'&&j.pursuit==='quiet'){ok=true;effect='quiet-dawn';}
  }
  return {id:focus*2+(ok?0:1),effect};
}
function endingIndex(answers){return endingDetail(answers).id;}
// 궁문 앞 실패가 겹치면 시즌 3로 가지 못하는 결말이 된다. 신분이 높을수록 여러 불운이 겹쳐야만 이르게 된다.
// 시즌 2 신분 목표: 신분별 선택과 여정이 지킨 것을 본다.
function rankGoalDone(answers){
  const a=answers,j=journeyAt(a),rank=inherited.rank;
  if(rank===2)return (a[1]===2||a[4]===2)&&j.pursuit!=='ahead';
  if(rank===3)return castAt(a).escort==='gate'||((a[1]===1||a[4]===1)&&j.pursuit!=='ahead'); // 문재가 궁문까지 함께 왔으면 먼저 끌려갈 수 없다
  if(rank===4)return a[4]!==2&&j.pursuit!=='ahead';
  return (a[0]===0||a[1]===0||a[5]===0)&&j.pursuit!=='ahead';
}
function rankGoalPanel(done){
  const [,win,lose]=rankGoals2[inherited.rank];
  const [slot,[kind,cut],caption,lines]=done?win:lose;
  // 동행인이 여천에 남았다면 그 사람의 말은 맡겨 둔 쪽지로 전한다.
  const away=castAt(progress.answers).escort==='stayed';
  const said=lines.map(([who,line])=>away&&who===route.companion?[who+'의 쪽지',line]:[who,line]);
  return panel(...withNew(slot,[kind,cut]),caption,said);
}
function fatalEnding(answers){
  if(answers.length!==8)return null;
  const d=endingDetail(answers);
  if(d.id%2===0)return null;
  const rank=inherited.rank;
  const focus=answers[6],approach=answers[7];
  const j=journeyAt(answers);
  const alone=castAt(answers).gatePeople.length===2;
  // 양민·중인은 지켜 줄 이름이 없어 한두 가지 불운에도 무너지고, 양반·왕족은 여러 불운이 겹쳐야 무너진다.
  const low=rank<=3;
  if(alone&&j.pursuit==='ahead'&&j.arrival==='late'&&(low||j.body==='ill'))return 'assassinated';
  if(rank===5&&alone&&focus===0&&approach===0&&d.effect==='forewarned')return 'executed';
  if(low&&focus===0&&approach===0&&j.papersState==='damp'&&j.pursuit!=='quiet')return 'enslaved';
  if(approach===0&&focus!==2&&j.arrival==='late'&&(low?j.pursuit!=='quiet':j.pursuit==='ahead'&&alone&&j.body!=='well'))return 'imprisoned';
  if(!low&&alone&&focus===2&&j.pursuit==='ahead'&&j.arrival==='late'&&(rank===4?j.body!=='well':approach===0))return 'exiled';
  return null;
}
// 길 위에서 끝나는 실패: 방금 고른 선택이 그때까지의 여정과 겹치면 궁문에 닿기 전에 무너진다.
function midFatal(answers){
  const k=answers.length-1;
  if(k<2||k>5)return null;
  const j=journeyAt(answers),rank=inherited.rank,low=rank<=3,a=answers;
  const cast=castAt(answers);
  const alone=cast.escort!=='travel'&&cast.myeongseon!=='travel';
  if(k===2&&a[2]===2&&j.exposure>=({2:2,3:2,4:3,5:2}[rank]??2))return 'checkpoint';      // 이미 노출된 채 남의 표에 기대 검문소를 지나려 했다. 이름이 알려진 집안일수록 검문소에 먼저 기별이 닿아 있다
  if(k===3&&a[3]===1&&j.purse<=({2:-4,3:-3}[rank]??-3))return 'collapsed';         // 바닥난 노자로 명선의 몫까지 떠안았다
  if(k===4&&a[4]===0&&alone&&j.exposure>=(rank===2?3:2))return 'ambushed';  // 혼자인데 조건을 거절해 적을 만들었다. 높은 이름일수록 노리는 쪽이 사람을 산다
  if(k===4&&rank===4&&a[4]===2&&j.exposure>=3&&cast.escort!=='travel')return 'recalled';   // 문중에 서면 답을 청하자 문중이 먼저 움직였다
  if(k===4&&rank===5&&a[4]===0&&j.exposure>=3)return 'confined';   // 별채의 요구를 거절한 왕족을 별채가 손님으로 데려갔다
  if(k===5&&j.pursuit==='ahead'&&(low?a[5]!==1:a[5]===2&&alone))return 'seized';             // 소문이 앞선 도성에서 사람 대신 종이에 기댔다
  return null;
}
// 저장된 기록이라도 길 위에서 이미 무너진 지점이 있으면 그곳에서 멈춘다.
function roadFall(answers){
  for(let n=3;n<=Math.min(answers.length,6);n++){const fate=midFatal(answers.slice(0,n));if(fate)return {fate,at:n};}
  return null;
}
function fatalFinale(fate){
  const [title,place,beats]=fatalEndings[fate];
  // 시즌 3가 이 기록을 이어받지 않도록 문 밖이 아닌 곳으로 남긴다.
  write('yeocheon-season-three-v1handoff:'+inherited.key,{version:1,rank:inherited.rank,location:place,fate,routeSelections:[...progress.answers]});
  reader.innerHTML='<div class="chapter">시즌 2 엔딩 · '+route.rank+'</div><h2 tabindex="-1">'+escaped(title)+'</h2>'+
    beats.map(([slot,[kind,cut],caption,lines])=>panel(...withNew(slot||'',[kind,cut]),caption,lines)).join('')+
    '<section class="gate-record fatal" aria-label="시즌 2 종료 기록"><p class="chapter">시즌 2 완 · 궁에 닿지 못함</p><h2>이서에게 남은 기록</h2><dl><dt>이서의 신분</dt><dd>'+escaped(route.rank)+'</dd><dt>이서가 있는 곳</dt><dd>'+escaped(place)+'</dd></dl>'+
    '<p>이 길에서는 궁문이 열리지 않았습니다. 다른 선택으로 한양 가는 길을 다시 걸을 수 있습니다.</p></section>';
  const again=document.createElement('div');
  again.className='choices';
  const retry=progress.answers.length===8?['궁문 앞 선택부터 다시 하기',()=>{progress.answers=progress.answers.slice(0,6);progress.reaction=true;}]:['방금 고른 선택 다시 하기',()=>{progress.answers=progress.answers.slice(0,-1);progress.reaction=progress.answers.length>0;}];
  for(const [label,act] of [retry,['시즌 2 처음부터 다시 걷기',()=>{progress=fresh();}]]){
    const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>commit(act);again.append(b);
  }
  reader.append(again);
}
// 여정 때문에 결말이 바뀌었을 때 그 까닭을 보여 주는 칸.
const journeyTurns={
  damp:['e',9,'문지기는 번진 날짜 자리를 한참 들여다보더니 봉투를 도로 내밀었다. 젖은 원본은 안에서 다시 확인할 사람이 정해진 뒤에 받겠다고 했다.',[['문지기','이 자리가 언제 번졌는지 내가 보증할 수는 없소. 젖은 경위를 확인해 줄 사람과 함께 다시 오시오.']]],
  forewarned:['n',13,'문지기 상에는 여천에서 온 봉투를 받지 말고 먼저 알리라는 쪽지가 이미 놓여 있었다. 이서가 오기 전에 누군가 다녀간 것이다.',[['이서','제 봉투보다 저를 막으라는 쪽지가 먼저 왔군요. 그 쪽지를 쓴 사람 이름도 같이 적어 주세요.']]],
  'dry-dawn':['e',9,'새벽 첫 줄이었다. 접힌 자리까지 마른 원본을 본 문지기는 출처 확인을 미루지 않고 그 자리에서 봉투에 표를 붙였다.',[['문지기','이만큼 온전하면 안에서도 바로 대조할 수 있겠소. 첫 줄에 올리겠소.']]],
  ill:['n',13,'이서는 열 때문에 말을 잇지 못했다. 문지기는 함께 온 사람의 이름만 적고, 증언은 이서가 다시 말할 수 있을 때 함께 듣겠다며 미뤘다.',[['문지기','데려온 사람이 말하는 자리에 데려온 사람이 서 있지 못하면 안 되오. 몸부터 추스르시오.']]],
  weary:['n',13,'먼 길에 지친 동행인은 문 앞에 오래 서 있지 못하고 돌턱에 주저앉았다. 문지기는 증언을 다음 부름으로 미뤘다.',[['문지기','오늘은 이름만 받겠소. 그 사람이 똑바로 서서 말할 수 있을 때 다시 부르겠소.']]],
  'steady-dawn':['n',13,'새벽 첫 줄이라 기다리는 사람이 없었다. 문지기는 함께 온 사람이 직접 말하겠다는 것을 확인하고 그 자리에서 이름을 나란히 적었다.',[['문지기','먼저 온 사람이니 먼저 듣겠소. 각자 본 것만 말하시오.']]],
  intercepted:['n',13,'약속한 시각은 이미 지나 있었다. 인계인을 찾는 사람이 이서보다 먼저 다녀갔다는 말만 남아 있었다.',[['이서','저보다 먼저 와서 인계인을 찾은 사람이 누군지, 그 이름부터 적어 주세요.']]],
  'quiet-dawn':['n',13,'아무도 이서가 온 줄 모르는 새벽이었다. 인계인은 약속보다 일찍 문 안쪽에 나와 있었다.',[['인계인','이 시각이면 아무도 우리를 보지 못했을 거요. 표를 맞춰 봅시다.']]]
};
function disciplinaryAction(answers){
  const checkedIn=answers[2]===0;
  const clerkSigned=answers[5]===0;
  if(answers[4]===2&&answers[5]===2){
    return {key:'clerk',person:'하 서리',sanction:'장부 필사 금지',where:'도성의 관아',atStep:6};
  }
  if(answers.length!==8||answers[6]!==0||answers[7]!==0||answers[4]!==1)return null;
  if(checkedIn&&clerkSigned){
    return {key:'supervisor',person:'문 주부',sanction:'직무 정지',where:'도성의 관아',atStep:8};
  }
  if(!clerkSigned){
    return {key:'messenger',person:'서겸',sanction:'관속 자리에서 파면',where:'도성의 관아',atStep:8};
  }
  return null;
}
function castAt(answers){
  const myeongseon=['statement','travel','sheltered'][answers[3]] ?? 'unknown';
  const escort=answers.length<2?'undecided':answers[1]!==1?'stayed':answers.length<6?'travel':answers[5]===1?'gate':'departed';
  const sanction=disciplinaryAction(answers);
  const seo=sanction?.key==='messenger'?'dismissed':answers.length<4?'unmet':answers.length<5?'messenger':answers[4]===0?'anonymous':answers[4]===2?'withdrawn':answers[7]===2?'at-lodging':answers.length===8?'gate-shadow':'cooperating';
  const clerk=sanction?.key==='clerk'?'suspended':answers.length<5?'unmet':answers.length<6?'examining':answers[5]===0?'signed':answers[5]===1?'waiting':'sealed';
  const gatePeople=['이서','문지기'];
  if(myeongseon==='travel')gatePeople.push('명선');
  if(escort==='gate')gatePeople.push(route.companion);
  if(seo==='gate-shadow')gatePeople.push('서겸');
  return {myeongseon,escort,escortName:route.companion,seo,clerk,sanction,gatePeople};
}
function gateRecord(){
  const answers=progress.answers;
  const id=endingIndex(answers);
  const focus=answers[6];
  const accepted=id%2===0;
  const cast=castAt(answers);
  const witness=cast.myeongseon==='travel'?'명선':cast.escort==='gate'?route.companion:null;
  const document=answers[0]===0?'출처를 표시한 '+turns.sign:turns.sign;
  return {
    version:1,rank:inherited.rank,rankLabel:route.rank,
    originRank:inherited.previousRank,seasonOneEnding:inherited.ending,
    seasonOneLead:inherited.lead,firstClue:inherited.first,
    ending:id,focus,accepted,witness,document,
    witnessAccount:answers[4]===1?'공개 범위를 확인한 진술':'직접 본 일만 기록하는 조건',
    routeSelections:[...answers],characters:cast,discipline:cast.sanction,location:'궁문 바깥',
    journey:{...journeyRecord(answers,cast),effect:endingDetail(answers).effect},
    rankGoal:{name:rankGoals2[inherited.rank][0],done:rankGoalDone(answers)}
  };
}
// ── 여정 상태 (season-2-story.js의 journeyBase·journeyDeltas). 화면에는 숫자 대신 장면과 대사로만 드러난다.
function journeyAt(answers){
  const j=[...journeyBase[inherited.rank]];
  let wet=false;
  answers.slice(0,6).forEach((option,step)=>{
    if(step===4&&j[0]<=-2){j[1]-=1;wet=true;} // 노자가 바닥난 채 헛간에서 지낸 밤, 서류 한 귀퉁이가 젖는다
    journeyDeltas[step][option].forEach((d,i)=>j[i]+=d);
  });
  const [purse,papers,trust,exposure]=j;
  const body=purse>=1?'well':purse>=-2?'worn':'ill';
  const pursuit=exposure>=4?'ahead':exposure>=2?'followed':'quiet';
  return {purse,papers,trust,exposure,body,pursuit,wet,
    papersState:wet?'damp':papers>=3?'intact':'partial',
    arrival:body!=='ill'&&pursuit!=='ahead'?'early':'late'};
}
function journeyRecord(answers,cast){
  const j=journeyAt(answers);
  const withSomeone=cast.myeongseon==='travel'||cast.escort==='gate';
  return {body:j.body,papers:j.papersState,pursuit:j.pursuit,arrival:j.arrival,
    companion:withSomeone?(j.trust>=2?'steady':'weary'):'none'};
}
const journeyWords={
  body:{well:'몸도 노자도 넉넉하게 닿았다',worn:'지친 몸으로 닿았다',ill:'열이 오른 채 닿았다'},
  papers:{intact:'원본이 마른 채 온전하다',partial:'원본 몇 장은 사본으로만 남았다',damp:'젖은 날짜 한 자리가 번졌다'},
  pursuit:{quiet:'뒤따른 사람이 없다',followed:'도성까지 뒤를 밟은 사람이 있다',ahead:'이서가 온다는 말이 먼저 궁에 닿았다'},
  arrival:{early:'새벽, 첫 줄로 이름을 올렸다',late:'해가 높이 뜬 뒤에야 닿았다'},
  companion:{steady:'함께 온 사람이 든든하다',weary:'함께 온 사람이 지쳤다',none:'혼자 왔다'}
};
function roadCompanion(step,cast){
  if(step===1)return route.companion;
  if(step===6){
    if(cast.escort==='gate'||cast.escort==='departed')return route.companion;
    return cast.myeongseon==='travel'?'명선':null;
  }
  if(cast.escort==='travel')return route.companion;
  return step>=4&&cast.myeongseon==='travel'?'명선':null;
}
function roadPanel(step,cast){
  const events=roadEvents[step];
  if(!events)return '';
  const j=journeyAt(progress.answers);
  const who=roadCompanion(step,cast);
  let key;
  if(step===1||step===3)key=j.purse<0?'hard':'easy';
  else if(step===2)key=j.exposure>=2?'hard':'easy';
  else if(step===4)key=j.purse<=-2?'hard':'easy';
  else if(step===5)key=j.exposure>=2?'watched':'quiet';
  else if(step===6)key=!who?'solo':j.trust>=2?'warm':'weary';
  else key=j.arrival;
  let [slot,fallback,caption,lines]=events[key];
  if(step===7&&key==='late'){
    caption=(j.body==='ill'?'밤새 오른 열 때문에 이서는 해가 높이 뜬 뒤에야 궁문에 닿았다.':'숙소로 찾아온 사람들에게 길을 붙들려, 이서는 해가 높이 뜬 뒤에야 궁문에 닿았다.')+
      ' 문 앞 상에는 이미 다른 이름이 몇 줄 적혀 있었다.'+(j.pursuit==='ahead'?' 그중 한 줄에는 여천에서 이서라는 사람이 온다는 말이 먼저 올라 있었다.':'');
    lines=[['이서',j.body==='ill'?'목소리가 잘 안 나와요. 짧게 말해도 빠짐없이 적어 주세요.':j.pursuit==='ahead'?'제 이름보다 제 얘기가 먼저 와 있군요. 누가 썼는지부터 보겠습니다.':'늦었지만 순서를 건너뛰어 달라고는 하지 않겠습니다.']];
  }
  const spoken=lines.map(([speaker,line])=>{
    if(speaker!=='동행')return [speaker,line];
    if(!who)return null;
    if(who==='명선'){const v=childVoice[step];return ['명선',Array.isArray(v)?v[key==='warm'?0:1]:v||line];}
    return [who,line];
  }).filter(Boolean);
  return panel(...withNew(slot,[fallback[0],fallback[1]]),caption,spoken);
}
function clueNotebook(){
  if(!progress.answers.length)return '';
  const facts=[
    ['여천에서 가져온 것',handoff()],
    ['연이의 말','시월 스무 날, 연이는 여천에 있었다고 말한다. 한양 문서에는 그날 같은 이름의 아이가 죽었다고 적혀 있다.']
  ];
  if(progress.answers.length>=3)facts.push(['검문 명부','눈앞의 행렬이 아직 길 위에 있는데 한양 인계일이 먼저 적혀 있는 줄이 있다.']);
  if(progress.answers.length>=4)facts.push(['명선이 기억한 일',progress.answers[3]===2?'명선은 안전한 곳에 머문다. 맡긴 진술에는 본명과 거처가 들어 있지 않다.':progress.answers[3]===0?'명선은 직접 본 일을 적어 맡기고 역참에 남았다.':'명선은 궁문까지 동행하기로 했다. 그 아이의 본명은 자신도 모른다고 했다.']);
  if(progress.answers.length>=5)facts.push(['돌아가라는 편지','연이 쪽 기록을 고쳐 주겠다고 했지만 한양에서 그 이름을 썼던 아이에 관한 답은 없었다.']);
  const sanction=disciplinaryAction(progress.answers);
  if(sanction)facts.push(['관아의 처분',sanction.person+' · '+sanction.sanction]);
  if(progress.answers.length>=6)facts.push(turns.clue);
  if(progress.answers.length>=2){
    const j=journeyAt(progress.answers);
    facts.push(['길의 사정',[{well:'노자와 몸은 아직 넉넉하다',worn:'노자가 줄고 몸이 지쳐 간다',ill:'노자가 바닥나고 열이 오르기 시작했다'}[j.body],
      {intact:'원본은 마른 채 잘 챙겼다',partial:'원본 몇 장은 사본뿐이다',damp:'젖어 번진 날짜 한 자리가 있다'}[j.papersState],
      {quiet:'뒤따르는 사람은 없다',followed:'뒤를 밟는 사람이 있다',ahead:'이서가 온다는 말이 앞서 퍼졌다'}[j.pursuit]].join(' · ')]);
  }
  return '<details><summary>이서가 확인한 단서</summary><dl class="clue-list">'+facts.map(([label,fact])=>'<dt>'+escaped(label)+'</dt><dd>'+escaped(fact)+'</dd>').join('')+'</dl></details>';
}
function handoff(){
  if(inherited.previousRank===1){
    return '뒤집힌 배에서 살아남은 이서는 어머니 농가의 호적을 되찾았다. 물에 잃은 포목 인수증 대신, 함께 살아 나온 한 노인의 납부표를 지닌다.';
  }
  return departure[inherited.rank][inherited.lead];
}
function oldClue(){
  if(inherited.first==='child')return '소복이 알아본 파란 실 매듭은 연이의 버선이 여천 나루에 있었다는 사실을 밝혀 줬다.';
  if(inherited.first==='sailor')return '여천 사공이 한 말은 곡식과 아이가 같은 배에 실렸다는 데까지였다. 한양에는 거기서 이어지는 기록이 남아 있을 것이다.';
  if(inherited.first==='nurse')return '박 유모가 맡았던 편지를 찾은 일부터, 이서는 봉투를 가지고 온 사람과 안쪽 글을 쓴 사람을 따로 확인하기로 했다.';
  return '';
}
function rankReceipt(){
  if(inherited.ending===2)return '여천에서 진술을 남긴 날처럼, 이번에도 이서는 직접 본 일과 들어서 아는 일을 나눠 적기로 했다.';
  if(inherited.ending===1)return '여천에서 함께 버틴 이들에게, 한양에 닿으면 먼저 소식을 전해 주겠다고 약속했다.';
  return '떠나기 전, 이서는 여천에서 마지막으로 만난 사람에게 돌아올 곳을 비워 달라는 말을 남겼다.';
}
function narrativePanels(step){
  return storyPauses[step].filter(([cut])=>cut!==8&&cut!==11).map(([cut,caption,lines])=>panel('n',cut,caption,lines)).join('');
}
function opening(){
  sceneStep=0;
  const body='여천에 살아 있는 연이의 이름이 한양 사망 기록에 올라 있었다. 궁 쪽은 원본을 가져오라고 했다. 그 글과 같은 곳에서, 이름 없이 죽은 아이의 처지를 아는 사람도 찾을 수 있을까.';
  reader.innerHTML='<div class="chapter">시즌 2 · 1 / 8 · '+route.rank+'</div><h1 tabindex="-1">궁문까지</h1>'+
    panel('r',route.art,body,[['이서','연이의 이름을 되찾을 때는 그 아이가 살아 있다는 말을 할 수 있었어. 이번엔 그 이름으로 죽은 아이를 찾아야 해.']])+
    panel('e',3,[handoff(),oldClue(),rankReceipt()].filter(Boolean).join(' '))+narrativePanels(0)+
    '<h2 class="question">한양에 가져올 첫 근거를 어떻게 준비할까?</h2>';
  options(turns.choices[0],choose);
}
function characterPanels(step,cast){
  const scene=characterScenes;
  if(step===4)return panel(...withNew('S2-02',scene.messenger));
  if(step===5){
    const reply=panel(...withNew({anonymous:'S2-04',withdrawn:'S2-05'}[cast.seo]||'',scene.reply[cast.seo]));
    const child=panel(...withNew(cast.myeongseon==='sheltered'?'S2-07':'',scene.child[cast.myeongseon]));
    return reply+child+panel(...withNew('S2-03',scene.clerk));
  }
  if(step===6){
    const clerk=panel(...withNew('S2-12',['s',1]),...scene.clerkResponse[cast.clerk]);
    const seo=cast.seo==='cooperating'?panel(...withNew('S2-11',['e',3]),...scene.namedSource):cast.seo==='anonymous'?panel('n',9,...scene.unnamedSource):'';
    const escort=cast.escort==='gate'
      ? panel('r',route.art+8,topic(route.companion)+' 이서와 함께 궁문으로 가기로 했다. 다른 사람의 몫까지 대신 말해 달라는 부탁은 받지 않았다.',[[route.companion,scene.escortWords[inherited.rank]]])
      : cast.escort==='departed'
        ? panel(...withNew('S2-06'+'abcd'[inherited.rank-2],['r',route.art+8]),'궁문으로 향하기 전, '+topic(route.companion)+' 그동안 맡았던 일을 이서에게 돌려주고 숙소에 남기로 했다.',[[route.companion,'문 밖까지 갈 준비는 안 됐어. 내가 본 일을 넘길 때는 먼저 내게 알려 줘.']])
        : '';
    const punishment=cast.sanction?.key==='clerk'?disciplinePanels(cast.sanction):'';
    return clerk+seo+escort+punishment;
  }
  if(step===7){
    const child=cast.myeongseon==='travel'?panel(...scene.gateChild):panel(...scene.gateAlone[cast.myeongseon]);
    const seo=cast.seo==='cooperating'?panel('n',8,...scene.shadow):'';
    return (cast.escort==='gate'?panel('r',route.art+8,'숙소를 나서기 전 마지막으로, 이서는 '+subject(route.companion)+' 직접 확인할 수 있는 줄을 다시 펼쳤다.',[[route.companion,'문 앞에서는 내가 직접 본 것만 내 이름으로 말할게.']]):'')+child+seo;
  }
  return '';
}
function speakerCut(speaker,step){
  const face=faceCut(speaker);
  if(face!==null)return ['k',face];
  if(speaker===route.companion)return ['r',route.art+(step<2?0:step<4?4:8)];
  const fixed={'연이':['n',0],'검문 아전':['n',4],'명선':['n',6],'서겸':['n',8],'하 서리':['s',1],'문지기':['n',13],'인계인':['s',10]};
  if(fixed[speaker])return fixed[speaker];
  if(speaker==='이서')return [['n',1],['r',route.art],['s',4],['n',7],['n',5],['n',10],['r',15]][step];
  return null;
}
function disciplinePanels(action){
  if(!action)return '';
  const scenes=disciplineScenes[action.key];
  const slots=action.key==='supervisor'?['S2-08','S2-09']:[];
  return scenes.map((scene,i)=>{
    const drawn=withNew(slots[i]||'',scene);
    // 열쇠를 넘기는 그림(S2-09)은 관아 장면이라, 궁문에 있는 접수 관원의 말은 그 사람 얼굴 칸으로 뗀다.
    if(slots[i]==='S2-09'&&drawn[0]==='g')return panel(drawn[0],drawn[1],drawn[2]+' 같은 시각 관아 장부고 앞에서, 문 주부는 허리춤의 열쇠 꾸러미를 풀어 사환에게 넘겼다.')+panel('k',11,null,drawn[3]);
    return panel(...drawn);
  }).join('');
}
function availableChoices(step,cast,answers=progress.answers){
  const labels=[...turns.choices[step]];
  if(step===2&&cast.escort!=='travel')labels[1]='검문 아전에게 오늘 직접 본 사실을 자기 이름으로 써 달라고 한다';
  if(step===4){
    labels[0]+=' · 서겸의 이름은 공개하지 않는다';
    labels[1]=cast.escort==='travel'
      ? labels[1]+' · 서겸에게도 직접 본 일을 묻는다'
      : cast.myeongseon==='travel'
        ? '명선과 진술의 범위를 확인하고, 서겸에게도 직접 본 일을 묻는다'
        : '맡겨 둔 진술을 확인하고, 서겸에게도 직접 본 일을 묻는다';
    labels[2]+=' · 답은 공식 문서로 받는다';
  }
  if(step===3)labels[0]+=' · 명선은 진술만 맡기고 역참에 남는다';
  if(step===5&&cast.escort==='travel'){const stays=' · '+topic(route.companion)+' 숙소에 남는다';labels[0]+=stays;labels[2]+=stays;}
  if(step===5&&cast.escort!=='travel'&&cast.myeongseon!=='travel')labels[1]='맡겨 둔 진술의 범위를 확인하고 증인을 기다린다';
  else if(step===5&&cast.escort!=='travel')labels[1]='명선과 각자 직접 본 일부터 말할지 정한다';
  if(step===6&&cast.escort!=='gate'&&cast.myeongseon!=='travel')labels[1]='궁문에서 증인을 기다릴 자리를 정한다';
  if(step===7&&cast.seo==='cooperating'){
    labels[1]+=' · 서겸에게도 근처에서 기다려 달라고 한다';
    if(answers[6]===0)labels[0]+=answers[5]===0?' · 대조한 기록부터 내놓는다':' · 서겸이 전달할 때 쓴 수결을 함께 내놓는다';
  }
  return labels;
}
function travelScene(step){
  sceneStep=step;
  const scene=road[step-1];
  const cast=castAt(progress.answers);
  let caption=step===1?route.intro:scene.body;
  let lines=step===1?[[route.companion,route.line]]:scene.lines;
  if(step===4&&cast.myeongseon!=='travel'){
    caption='한양에서 내려온 편지가 역참에 머물던 이서에게 닿았다. 연이의 호적만은 바로잡아 준다고 했다. '+(cast.myeongseon==='sheltered'?'명선은 안전한 집에 남아 있다.':'명선은 자기 말을 맡겨 두고 역참에 남았다.');
    lines=[['이서','연이의 줄만 돌려 달라고 하면, 그날 죽은 아이는 끝내 자기 이름을 못 찾을 거야.']];
  }
  if(step===6&&cast.myeongseon!=='travel'){
    lines=[['이서','명선이 남긴 말과 오늘 문 앞에 서는 사람이 직접 본 일을 섞지 말자.']];
  }
  if(step===5){
    lines=[['이서',turns.cityLine]];
    if(cast.myeongseon==='travel')lines.push(['명선','그 애가 한양에서 불린 날도 그 종이들 사이 어딘가에 있겠네요. 찾으면 저한테도 먼저 보여 주세요.']);
    else caption='도성에 도착한 이서는 검문소 종이와 여천 기록, 명선이 맡긴 진술을 한 상에 놓는다.';
  }
  const childAbsent=cast.myeongseon!=='travel';
  const solo=childAbsent&&(step===4||step===5||step===6||step===7);
  const routeShot=step===1||((step===2||step===5)&&cast.escort==='travel');
  const soloCuts={4:['n',10],5:['s',7],6:['r',15],7:['s',11]};
  const [kind,cut]=step===4&&cast.myeongseon==='travel'?['s',5]:solo?soloCuts[step]:routeShot?['r',route.art+(step===1?0:step===2?4:8)]:['s',scene.art];
  const body=(step===3&&hasNew('S2-01')?panel(...newCuts.stationKitchen):'')+panel(kind,cut,caption,lines);
  const extraLine=turns.arrivals[step];
  const canSpeak=extraLine&&(extraLine[0]==='이서'||step===1||cast.escort==='travel'||cast.escort==='gate');
  const reply=turns.answers[step];
  const followup=canSpeak?panel('e',[3,2,8,11,2,5,9][step],null,reply?[extraLine,reply]:[extraLine]):'';
  const note=step===1?panel('e',route.art===0?7:route.art===1?8:route.art===2?9:4,'‘'+route.item+'’의 출처를 확인해 줄 사람이나 기록이 필요했다.'):step===7?
    panel('e',5,'이서가 먼저 맡기기로 한 것은 '+gateFocus[progress.answers[6]][0]+'이다.',[['문지기',gateFocus[progress.answers[6]][1]]]):'';
  const rankScene=step===1?panel(...departureScenes[inherited.rank]):'';
  reader.innerHTML='<div class="chapter">시즌 2 · '+(step+1)+' / 8 · '+route.rank+'</div><h2 tabindex="-1">'+escaped(scene.title)+'</h2>'+roadPanel(step,cast)+body+rankScene+narrativePanels(step)+followup+characterPanels(step,cast)+note+
    '<h3 class="question">'+escaped(scene.question)+'</h3>';
  options(availableChoices(step,cast),choose);
}
function replyPanel(step,reply){
  if(!reply)return '';
  const cut=speakerCut(reply[0],step);
  return cut?panel(cut[0],cut[1],null,[reply]):'';
}
function previousAction(){
  const step=progress.answers.length-1;
  sceneStep=step;
  const option=progress.answers[step];
  const [kind,cut,,line,effect]=responses[step][option];
  const cast=castAt(progress.answers.slice(0,step));
  const title=availableChoices(step,cast,progress.answers.slice(0,step))[option];
  const choiceScene=step===3&&option===2?'r':kind;
  const choiceCut=choiceScene==='r'?14:cut;
  let specific=turns.outcomes[step][option];
  if(step===2&&option===1&&cast.escort!=='travel'){
    specific='아전은 실제로 봤던 출발 행렬과 한양 종이에 적힌 인계일이 다르다는 사실에만 수결을 남겼다. 동행인 이름은 추가하지 않았다.';
  }
  if(step===4&&option===1&&cast.escort!=='travel'){
    specific='이서는 '+(cast.myeongseon==='travel'?'명선 앞에서 공개해도 될 대목을 먼저 골랐다.':'아직 곁에 없는 사람의 동의까지 대신 받지 않았다.')+' 편지를 들고 온 서겸에게는 자기가 직접 본 부분만 말해 달라고 청했다.';
  }
  if(step===5&&option===1&&cast.escort!=='travel'&&cast.myeongseon!=='travel'){
    specific='이서는 맡겨 둔 진술에서 공개해도 된다는 줄에만 표시했다. 궁문에서 남의 말에 자기 수결을 달지 않기로 했다.';
  }else if(step===5&&option===1&&cast.escort!=='travel'){
    specific='명선은 자기가 직접 들은 이름과 본 방까지만 말하기로 했다. 함께 오지 않은 사람의 몫은 이서가 대신 전하지 않는다.';
  }else if(progress.answers[3]===2&&step===5&&option===1){
    specific='명선은 안전한 곳에 남았다. 이서는 그의 쪽지를 봉해 둔 뒤, 동행할 사람이 직접 본 일만 문지기에게 설명할 수 있도록 따로 적었다.';
  }
  if(step===6&&option===1&&progress.answers[3]!==1&&!(progress.answers[1]===1&&progress.answers[5]===1)){
    specific='이서를 따라 문 앞까지 갈 증인은 아직 정해지지 않았다. 이서는 맡겨 둔 진술을 자기 말처럼 읽지 않고, 출석할 사람을 기다리겠다고 적었다.';
  }
  if(step<=5)specific+=' '+journeyCosts[step][option];
  const relay=step===4&&option===1&&cast.myeongseon!=='travel'
    ? ['명선의 쪽지','제가 본 데까지만 적어 주세요. 어디서 지내는지는 말하지 않아도 돼요.']
    : null;
  const publicLine=step===3?(option===2?['명선','제가 말한 일은 전해도 돼요. 제가 묵는 곳은 누구에게도 말하지 말아 주세요.']:line):relay;
  const personThere=progress.answers[1]===1;
  const routeCut=route.art+(step<2?0:step<4?4:8);
  const reply=turns.replies[step][option];
  const showEffect=step<=2&&personThere;
  const replyCut=reply&&speakerCut(reply[0],step);
  const sameCut=showEffect&&replyCut&&replyCut[0]==='r'&&replyCut[1]===routeCut;
  return '<section class="reading-lead" aria-label="방금 고른 행동">'+
    '<h2 tabindex="-1">'+escaped(title)+'</h2>'+
    panel(choiceScene,choiceCut,specific,publicLine?[publicLine]:[])+
    (sameCut?'':replyPanel(step,reply))+
    (showEffect?panel('r',routeCut,effect,sameCut?[reply]:[]):'')+'</section>';
}
function gateMoment(id,record){
  if(id===2&&record.witness!=='명선')return panel('e',11,'문지기 상 위에 두 사람의 이름이 한 줄로 나란히 적혔다. 누구도 상대의 말을 대신 꺼내지 않았다.');
  if(id===3&&!record.witness)return panel(...withNew('S2-10',gateMoments[id]));
  return panel(...gateMoments[id]);
}
// 궁문 앞에서 길의 사정이 드러나는 칸: 무엇을 들고 어떤 몸으로 왔는지가 문지기와 이서의 말에 남는다.
function journeyPanel(record){
  const j=record.journey;
  if(['damp','forewarned','dry-dawn'].includes(j.effect))return ''; // 결말 첫 칸이 이미 서류 이야기를 했다
  const papersLine={intact:'원본은 마른 채 그대로입니다. 접힌 자리까지 보여 드릴 수 있어요.',partial:'원본 몇 장은 사본뿐입니다. 누가 언제 베꼈는지 옆에 적어 왔어요.',damp:'날짜 한 자리가 젖어 번졌습니다. 어떻게 젖었는지 옆에 적어 두었어요.'}[j.papers];
  const keeper={intact:'마른 원본이면 안에서도 바로 대조할 수 있겠소.',partial:'사본은 베낀 사람을 확인한 뒤에야 올리겠소.',damp:'번진 자리는 다른 증거로 채워야 할 거요. 안에 그대로 전하겠소.'}[j.papers];
  const caption=(j.pursuit==='ahead'?'문지기는 이서의 이름을 듣기도 전에 상 위의 쪽지를 한 번 내려다보았다. ':j.pursuit==='followed'?'담 모퉁이에 성문 앞에서 본 사내가 서 있었다. ':'')+
    (j.companion==='weary'?'함께 온 사람은 돌턱에 앉아 숨을 골랐다. ':'')+'문지기가 이서가 품에서 꺼낸 봉투의 귀퉁이를 살폈다.';
  return panel('e',9,caption,[['이서',papersLine],['문지기',keeper]]);
}
function finale(){
  sceneStep=8;
  const fate=fatalEnding(progress.answers);
  if(fate)return fatalFinale(fate);
  const record=gateRecord();
  const id=record.ending;
  const [title,,caption,line]=arrivalEndings[id];
  const [doorCaption,doorLine]=doorThreads[id];
  let arrival=caption;
  let lead=line;
  if(id===3&&record.witness){arrival=record.witness+'도 함께 왔지만 문지기는 이서의 이름만 먼저 확인했다. 두 사람은 진술을 별도로 확인받기 위해 돌턱에 앉았다.';lead='함께 온 사람의 진술은 따로 확인받겠습니다. 부르실 때까지 여기서 같이 기다리겠어요.';}
  if(id===2)arrival=record.witness+'도 자기 이름으로 진술하겠다고 했다. 문지기가 두 이름을 같은 줄에 적었다.';
  const pictures=[['r',12],['r',12],record.witness==='명선'?['r',13]:['r',route.art+8],['r',record.characters.myeongseon==='travel'?13:15],['e',5],['r',15]];
  const seoEnding=record.characters.seo==='gate-shadow'
    ? panel('n',8,'서겸은 궁 담 아래에 멈춰 섰다. 문지기에게 먼저 다가가지는 않았다.',[['서겸','제가 본 봉투 이야기가 나오면 부르세요. 이제 제 이름으로 말하겠습니다.']])
    : record.characters.seo==='at-lodging'
      ? panel('e',4,'이서는 정해진 인계 순서를 따르기로 했다. 서겸이 공적으로 불릴 때까지 기다리겠다고 한 곳은 도성의 숙소였다.')
      : '';
  const punishment=record.discipline?.atStep===8?disciplinePanels(record.discipline):'';
  const [kind,cut]=pictures[id];
  const material=record.focus===0
    ? (record.accepted?'접수된 자료 · '+record.document:'이서가 보관하는 자료 · '+record.document)
    : record.focus===1
      ? (record.accepted?'함께 접수된 증인 · '+record.witness:record.witness?'확인을 기다리는 증인 · '+record.witness:'증인이 도착할 때까지 기다림')
      : record.accepted?'인계할 사람이 도착함':'인계할 사람을 기다림';
  const transferred=write('yeocheon-season-three-v1handoff:'+inherited.key,record);
  reader.innerHTML='<div class="chapter">시즌 2 엔딩 · '+route.rank+'</div><h2 tabindex="-1">'+escaped(title)+'</h2>'+
    (record.journey.effect?panel(...journeyTurns[record.journey.effect]):'')+
    panel(kind,cut,arrival,[['이서',lead],arrivalEndings[id][4]])+
    gateMoment(id,record)+journeyPanel(record)+seoEnding+punishment+rankGoalPanel(record.rankGoal.done)+panel('n',13,doorCaption+' 문 안쪽에서는 최 상궁이 이서의 이름이 적힌 명단을 받아 들고 있었다.',[['문 너머의 목소리',doorLine]])+
    '<section class="gate-record" aria-label="시즌 2 종료 기록"><p class="chapter">시즌 2 완 · 궁문 바깥</p><h2>궁문 앞에 남긴 기록</h2><dl><dt>이서의 신분</dt><dd>'+escaped(route.rank)+'</dd><dt>문 앞의 상황</dt><dd>'+escaped(material)+'</dd><dt>궁문 밖에 온 사람</dt><dd>'+escaped(record.characters.gatePeople.slice(2).join(' · ')||'이서 홀로 도착')+'</dd>'+
    '<dt>신분의 몫</dt><dd>'+escaped(record.rankGoal.name+' · '+(record.rankGoal.done?'지켜 냄':'놓침'))+'</dd>'+
    '<dt>길의 사정</dt><dd>'+escaped(['arrival','body','papers','companion','pursuit'].map(k=>journeyWords[k][record.journey[k]]).join(' · '))+'</dd>'+
    (record.discipline?'<dt>관아의 처분</dt><dd>'+escaped(record.discipline.person+' · '+record.discipline.sanction)+'</dd>':'')+'</dl>'+
    '<p>시즌 3는 이 문이 열리는 순간부터 시작됩니다.</p>'+(transferred?'<p><a class="link primary" href="season-3.html">시즌 3 이어 읽기</a></p>':'<p class="intro">이 브라우저에 다음 시즌 기록을 저장하지 못했습니다.</p>')+'</section>';
}
function manualKey(){return currentKey+':bookmark';}
function refreshControls(message){
  const mark=currentKey?read(manualKey()):null;
  save.disabled=!currentKey;
  load.disabled=!validProgress(mark);
  status.textContent=message|| (validProgress(mark)?'수동 저장 · '+Math.max(1,Math.min(8,mark.answers.length+(mark.reaction?0:1)))+'단계':'');
}
function render(focus=false,message=''){
  if(!inherited){
    reader.innerHTML='<div class="chapter">시즌 2</div><h1 tabindex="-1">궁문까지</h1><p class="intro">이 브라우저에 한양행으로 이어지는 시즌 1 결말이 없습니다. 시즌 1을 마치면 이어 읽을 수 있습니다.</p><p><a class="link primary" href="season-1.html">시즌 1로 돌아가기</a></p>';
  }else if(roadFall(progress.answers)){const fall=roadFall(progress.answers);progress.answers=progress.answers.slice(0,fall.at);sceneStep=fall.at;fatalFinale(fall.fate);reader.insertAdjacentHTML('afterbegin',previousAction());}
  else if(progress.answers.length===8)finale();
  else if(!progress.answers.length)opening();
  else{
    travelScene(progress.answers.length);
    if(progress.reaction)reader.insertAdjacentHTML('afterbegin',previousAction());
  }
  if(inherited&&progress.answers.length){
    const notebook=document.createElement('div');
    notebook.innerHTML=clueNotebook();
    reader.append(notebook);
  }
  refreshControls(message);
  if(focus){reader.querySelector('h1,h2')?.focus({preventScroll:true});window.scrollTo(0,0);}
}
save.onclick=()=>{
  if(!currentKey)return;
  refreshControls(write(manualKey(),progress)?'지금 읽는 장면을 저장했습니다.':'이 브라우저에 저장할 수 없습니다.');
};
load.onclick=()=>{
  const mark=currentKey?read(manualKey()):null;
  if(!validProgress(mark))return;
  progress=mark;
  const stored=write(currentKey,progress);
  render(true,stored?'저장한 장면을 불러왔습니다.':'장면을 불러왔습니다. 자동 저장은 사용할 수 없습니다.');
};
music.onclick=()=>{
  scoreChoice=score.paused;
  write('yeocheon-season-two-music',scoreChoice);
  syncScore();
};
render();
