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
let scoreChoice=read('yeocheon-season-two-music',read('yeocheon-season-one-v1music',false));
let scoreTrack='';
function updateScore(){
  music.textContent=score.paused?'배경음악 켜기':'배경음악 끄기';
  music.setAttribute('aria-pressed',String(!score.paused));
}
function syncScore(){
  if(!scoreChoice){score.pause();updateScore();return;}
  const track=progress.answers.length>=7?'spring':progress.answers.length>=3?'night-ferry':'after-rain';
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
function escaped(value){
  return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function art(kind,cut){
  const x=cut%4*100/3;
  const y=Math.floor(cut/4)*((kind==='n'||kind==='r')?100/3:50);
  return '<div class="art'+(kind==='e'?' detail':kind==='n'?' narrative':kind==='r'?' route-art':'')+'" data-art="'+kind+cut+'" aria-hidden="true" style="background-position:'+x+'% '+y+'%"></div>';
}
function panel(kind,cut,caption,lines=[]){
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

function endingIndex(answers){
  const focus=answers[6];
  const approach=answers[7];
  const prepared=answers[5]===focus||answers[1]===focus||answers[2]===focus||(focus===0&&answers[0]===0);
  const effective=focus===1?(answers[3]===1||answers[1]===1&&answers[5]===1):prepared;
  const registered=answers[5]===focus&&(focus!==1||effective);
  return focus*2+((approach===0&&effective)||(approach===2&&registered)?0:1);
}
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
    routeSelections:[...answers],characters:cast,discipline:cast.sanction,location:'궁문 바깥'
  };
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
  const body='여천에 살아 있는 연이의 이름이 한양 사망 기록에 올라 있었다. 궁 쪽은 원본을 가져오라고 했다. 그 글과 같은 곳에서, 이름 없이 죽은 아이의 처지를 아는 사람도 찾을 수 있을까.';
  reader.innerHTML='<div class="chapter">시즌 2 · 1 / 8 · '+route.rank+'</div><h1 tabindex="-1">궁문까지</h1>'+
    panel('r',route.art,body,[['이서','연이의 이름을 되찾을 때는 그 아이가 살아 있다는 말을 할 수 있었어. 이번엔 그 이름으로 죽은 아이를 찾아야 해.']])+
    panel('e',3,[handoff(),oldClue(),rankReceipt()].filter(Boolean).join(' '))+narrativePanels(0)+
    '<h2 class="question">한양에 가져올 첫 근거를 어떻게 준비할까?</h2>';
  options(turns.choices[0],choose);
}
function characterPanels(step,cast){
  const scene=characterScenes;
  if(step===4)return panel(...scene.messenger);
  if(step===5){
    const reply=panel(...scene.reply[cast.seo]);
    const child=panel(...scene.child[cast.myeongseon]);
    return reply+child+panel(...scene.clerk);
  }
  if(step===6){
    const clerk=panel('s',1,...scene.clerkResponse[cast.clerk]);
    const seo=cast.seo==='cooperating'?panel('e',3,...scene.namedSource):cast.seo==='anonymous'?panel('n',9,...scene.unnamedSource):'';
    const escort=cast.escort==='gate'
      ? panel('r',route.art+8,'동행인은 이서와 함께 궁문으로 가기로 했다. 다른 사람의 몫까지 대신 말해 달라는 부탁은 받지 않았다.',[[route.companion,scene.escortWords[inherited.rank]]])
      : cast.escort==='departed'
        ? panel('r',route.art+8,'궁문으로 향하기 전, 동행인은 그동안 맡았던 일을 이서에게 돌려주고 숙소에 남기로 했다.',[[route.companion,'문 밖까지 갈 준비는 안 됐어. 내가 본 일을 넘길 때는 먼저 내게 알려 줘.']])
        : '';
    const punishment=cast.sanction?.key==='clerk'?disciplinePanels(cast.sanction):'';
    return clerk+seo+escort+punishment;
  }
  if(step===7){
    const child=cast.myeongseon==='travel'?panel(...scene.gateChild):panel(...scene.gateAlone[cast.myeongseon]);
    const seo=cast.seo==='cooperating'?panel('n',8,...scene.shadow):'';
    return (cast.escort==='gate'?panel('r',route.art+8,'숙소를 나서기 전 마지막으로, 이서는 동행인이 직접 확인할 수 있는 줄을 다시 펼쳤다.',[[route.companion,'문 앞에서는 내가 직접 본 것만 내 이름으로 말할게.']]):'')+child+seo;
  }
  return '';
}
function speakerCut(speaker,step){
  if(speaker===route.companion)return ['r',route.art+(step<2?0:step<4?4:8)];
  const fixed={'연이':['n',0],'검문 아전':['n',4],'명선':['n',6],'서겸':['n',8],'하 서리':['s',1],'문지기':['n',13],'인계인':['s',10]};
  if(fixed[speaker])return fixed[speaker];
  if(speaker==='이서')return [['n',1],['r',route.art],['s',4],['n',7],['n',5],['n',10],['r',15]][step];
  return null;
}
function disciplinePanels(action){
  if(!action)return '';
  const scenes=disciplineScenes[action.key];
  return scenes.map(([kind,cut,caption,lines])=>panel(kind,cut,caption,lines)).join('');
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
  const scene=road[step-1];
  const cast=castAt(progress.answers);
  let caption=step===1?route.intro:scene.body;
  let lines=step===1?[[route.companion,route.line]]:scene.lines;
  if(step===4&&cast.myeongseon!=='travel'){
    caption='여천에서 뒤따라 온 편지는 연이의 호적만 바로잡아 준다고 했다. '+(cast.myeongseon==='sheltered'?'명선은 안전한 집에 남아 있다.':'명선은 자기 말을 맡겨 두고 역참에 남았다.');
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
  const body=panel(kind,cut,caption,lines);
  const extraLine=turns.arrivals[step];
  const canSpeak=extraLine&&(extraLine[0]==='이서'||step===1||cast.escort==='travel'||cast.escort==='gate');
  const reply=turns.answers[step];
  const followup=canSpeak?panel('e',[3,2,8,11,2,5,9][step],null,reply?[extraLine,reply]:[extraLine]):'';
  const note=step===1?panel('e',route.art===0?7:route.art===1?8:route.art===2?9:4,'‘'+route.item+'’의 출처를 확인해 줄 사람이나 기록이 필요했다.'):step===7?
    panel('e',5,'이서가 먼저 맡기기로 한 것은 '+gateFocus[progress.answers[6]][0]+'이다.',[['문지기',gateFocus[progress.answers[6]][1]]]):'';
  const rankScene=step===1?panel(...departureScenes[inherited.rank]):'';
  reader.innerHTML='<div class="chapter">시즌 2 · '+(step+1)+' / 8 · '+route.rank+'</div><h2 tabindex="-1">'+escaped(scene.title)+'</h2>'+body+rankScene+narrativePanels(step)+followup+characterPanels(step,cast)+note+
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
  return panel(...gateMoments[id]);
}
function finale(){
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
    panel(kind,cut,arrival,[['이서',lead],arrivalEndings[id][4]])+
    gateMoment(id,record)+seoEnding+punishment+panel('n',13,doorCaption,[['문 너머의 목소리',doorLine]])+
    '<section class="gate-record" aria-label="시즌 2 종료 기록"><p class="chapter">시즌 2 완 · 궁문 바깥</p><h2>궁문 앞에 남긴 기록</h2><dl><dt>이서의 신분</dt><dd>'+escaped(route.rank)+'</dd><dt>문 앞의 상황</dt><dd>'+escaped(material)+'</dd><dt>궁문 밖에 온 사람</dt><dd>'+escaped(record.characters.gatePeople.slice(2).join(' · ')||'이서 홀로 도착')+'</dd>'+
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
  }else if(progress.answers.length===8)finale();
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
