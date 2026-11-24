'use strict';
// 시즌 4 · 궁 안의 이름. 값(믿음·드러남)은 저장하지 않고, 고른 답(answers)에서 매번 다시 계산한다.

const handoffPrefix4='yeocheon-season-four-v1handoff:';
const latestKey4='yeocheon-season-four-v1latest';
const progressKey4='yeocheon-season-four-v1progress:';
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
const answersOk=a=>Array.isArray(a)&&a.length<=acts4.length&&a.every(p=>Number.isInteger(p)&&p>=0&&p<=2);
const valid=s=>s&&answersOk(s.answers)&&typeof s.reaction==='boolean'&&(!s.reaction||(s.answers.length>0&&s.answers.length<acts4.length));
let progress=read(storageKey);
if(!valid(progress))progress={answers:[],reaction:false};
let sound=read('yeocheon-season-four-music',read('yeocheon-season-three-music',false));

// ── 값 계산 ──
const failLine4={2:6,3:5,4:5,5:4}; // 7막에서 덫이 풀리지 않았을 때 쫓겨나는 드러남 문턱
function exitWay(a){ // 6막에 궁 밖으로 나가는 길(6막 선택 전 값으로 정해진다)
  const v=values(a.slice(0,5));
  return v.choi>=3?'choi':v.han>=3?'han':'sneak';
}
function values(a){
  let han=0,choi=0,exp=0;
  const [a1,a2,a3,a4,a5,a6]=a;
  if(a1===0){han+=2;choi-=1;exp+=1;}else if(a1===1){choi+=2;han-=1;exp+=1;}
  if(a2===0){han+=2;exp+=1;}else if(a2===1){exp+=2;if(a1===0)han-=1;}else if(a2===2){han-=2;choi+=1;}
  if(a3===0){han+=1;exp-=1;}else if(a3===1)exp+=1;else if(a3===2)exp+=2;
  if(a4===0)choi+=2;else if(a4===1)exp+=1;
  if(a5===0)exp+=2;else if(a5===1)exp+=1;
  if(a6!==undefined){if(exitWay(a)==='sneak')exp+=1;if(a6===0)exp+=1;}
  return {han,choi,exp};
}
function released(a){ // 7막에서 덫이 풀렸나
  const a7=a[6];
  if(a7===0)return a[2]===1;
  if(a7===1)return values(a).choi>=3;
  if(a7===2)return a[4]===0||a[4]===1;
  return false;
}
// 고른 답 뒤에 이서가 궁에서 밀려나는지. {fate, at}
function palaceFall4(a){
  const r=handoff.rank;
  for(let n=2;n<=a.length;n++){
    const s=a.slice(0,n),v=values(s),last=s[n-1];
    if(n===2&&last===1&&s[0]===0&&r>=4)return {fate:'knot',at:n}; // 낮은 신분은 손이 서툴렀다고 넘어가 준다(한 상궁 믿음 −1)
    if(n===3&&last===2&&((r===5&&v.exp>=3)||v.exp>=5))return {fate:'bolt',at:n};
    if(n===4&&last===1&&s[1]===2&&(r>=4||v.exp>=3))return {fate:'poison',at:n};
    if(n===5&&last===0&&((v.han>=3&&r>=3)||v.exp>=6||(r===3&&v.exp>=5)))return {fate:'forgery',at:n};
    if(n===6&&exitWay(s)==='sneak'&&(v.exp>=7||(r>=4&&v.exp>=6)||(r===5&&v.exp>=5)))return {fate:'exile',at:n};
    if(n===7&&!released(s)){
      const extra=(last===0&&s[2]===2?2:0)+(last===1?1:0);
      if(v.exp+extra>=failLine4[r])return {fate:'expelled',at:n};
    }
    if(n===8&&last===0&&evidence(s)<2)return {fate:'pawn',at:n};
  }
  return null;
}
function evidence(a){
  const free=released(a);
  return (free&&a[6]===0?1:0)+(free&&a[6]===1?1:0)+((a[4]===0||a[4]===1)?1:0);
}
function finalEnding(a){
  if(a[7]===0)return 'spring';
  if(a[7]===1)return (a[5]===0||a[5]===2)?'yeon':'half';
  return 'jimil';
}
function rankGoalDone4(a){
  const r=handoff.rank;
  if(!released(a))return false;
  if(r===5&&a[2]===0)return false; // 편지를 넘긴 왕족은 출생을 증명할 원본이 없다
  return values(a).exp<=failLine4[r]-2;
}
function optionsFor(step){
  const a=progress.answers;
  if(step===7&&!released(a))return acts4[7].choices.map((c,i)=>i===0?c+' (덫이 풀리지 않아 고를 수 없다)':c);
  return acts4[step].choices;
}

// ── 그림과 칸 ──
function text(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function button(label,fn,className=''){const b=document.createElement('button');b.type='button';b.textContent=label;b.className=className;b.onclick=fn;return b;}
// 이서의 옷(신분)에 따라 따로 그린 그림: '칸@옷' 이름이 있으면 그것을 먼저 쓴다
const outfit4={'2true':'MU','2false':'MU','3true':'SE','3false':'UI','4true':'NA','4false':'NA','5true':'OJ','5false':'BN'};
function art(slot){
  const slots=typeof NEW_CUT_SLOTS_4==='object'&&NEW_CUT_SLOTS_4?NEW_CUT_SLOTS_4:{};
  const own=handoff?slot+'@'+outfit4[rk()]:'';
  if(own in slots)slot=own;
  if(!(slot in slots))return '';
  const rows=typeof NEW_CUT_ROWS_4==='number'?NEW_CUT_ROWS_4:1,cut=slots[slot];
  const x=(cut%4)*100/3,y=rows>1?Math.floor(cut/4)*100/(rows-1):0;
  return '<div class="picture new-picture" data-cut="'+slot+'" aria-hidden="true" style="background-position:'+x+'% '+y+'%;background-size:400% '+rows*100+'%"></div>';
}
function frame([slot,caption,lines],cls='narrative'){
  const pic=art(slot);
  const words=(lines||[]).map(([sp,l])=>'<p class="speech"><strong>'+text(sp)+'</strong><q>'+text(l)+'</q></p>').join('');
  return '<section class="frame '+cls+(pic?'':' no-art')+'" data-slot="'+slot+'">'+pic+'<div class="frame-body">'+(caption?'<p class="frame-caption">'+text(caption)+'</p>':'')+words+'</div></section>';
}
function heading(chapter,title,level='h1'){return '<p class="chapter">'+text(chapter)+'</p><'+level+' tabindex="-1">'+text(title)+'</'+level+'>';}
function saveChange(change){change();render(true,write(storageKey,progress)?'':'이 브라우저에서 자동 저장할 수 없습니다.');}
const rk=()=>handoff.rank+String(handoff.rankGoal.done);

// 막마다 선택 앞에 나오는 칸들
function buildup(step){
  const a=progress.answers,r=handoff.rank,F=[];
  if(step===0){
    F.push(entries4[rk()]);
    const [slot,cap,lines]=verdictFrames4[handoff.verdict];F.push([slot,cap(r),lines]);
    F.push(['S4-13','해 질 녘, 대비전 쪽 회랑. 흰머리가 섞인 쪽머리의 늙은 상궁이 이서를 불러 세웠다. 손등에 오래된 바늘 자국이 있었다. 대비전 지밀, 한 상궁이었다.',[['한 상궁','여천에서 왔다지. 먼 길이었겠구나.'],['이서','예. 오늘 들었습니다.'],['한 상궁','궁은 처음 사흘이 제일 춥단다. 내 방 아래 빈 방이 하나 있다. 불을 넣어 두라 했으니, 오늘 밤은 거기서 자거라.']]]);
    F.push(['S4-13b','같은 때, 회랑 끝에서 최 상궁이 이쪽을 보고 있었다. 최 상궁은 다가오지 않았다.',[]]);
  }
  if(step===1){
    F.push(['S4-17','사흘째 저녁. 한 상궁이 이서를 대비전 다방으로 불렀다. 찻물을 따르는 손이 느렸다. 찻잔 옆에는 접어서 실로 묶은 쪽지 하나가 놓여 있었다.',
      [...(a[0]===2?[['한 상궁','차를 보냈는데 잘 마셨니. 이번엔 내가 부탁 하나 하자꾸나.']]:[]),['한 상궁','별채에 이걸 좀 전해 주겠니. 대비전 사람이 가면 말이 많아져서 그렇단다.'],['이서','무슨 글인지 여쭤도 될까요?'],['한 상궁','안부란다. 늙은이가 종친께 드리는 안부.']]]);
    F.push(['S4-'+(16+r),'쪽지는 옅은 쪽빛 명주실로 세 번 감겨 있었다. 대비전 상궁이 쓰기에는 수수한 실이었다. '+act2Rank4[r],[]]);
  }
  if(step===2){
    F.push(['S4-26','열흘째 밤. 별채 집사가 등불도 들지 않고 이서를 데리러 왔다. 별채 사랑방에는 옅은 옥색 도포를 입은 사내가 혼자 앉아 있었다. 눈 밑이 어두웠고, 손가락 마디에 먹물이 배어 있었다. 종친 영은군이었다.',[['영은군','앉게. 여기서는 아무도 받아 적지 않네.'],['이서','무슨 일로 부르셨습니까.'],['영은군','자네 어머니가 남긴 글이 있지. 그걸 내게 주게. 값은 자네가 정하게.']]]);
    F.push(r===5?letterPlace4[rk()]:letterPlace4.other);
    F.push(['S4-26b','영은군은 차를 따르다 손을 멈추었다. 문 쪽을 한 번 보고 목소리를 낮추었다.',[['영은군','그 글이 내 손에 있으면 아무도 다치지 않네. 자네 동생도.'],['이서','연이를 아세요?'],['영은군','…글을 가져오면 말해 주지.']]]);
  }
  if(step===3){
    F.push(['S4-31','보름째. 침방에 실이 새로 들어오는 날이었다. 채령이 실타래를 색깔별로 가르다가, 쪽빛 실 한 타래를 따로 집어 이서에게 내밀었다.',
      [['채령','이 실, 본 적 있어요?'],['이서','한 상궁마마님이 별채에 보내던 쪽지가 이 실로 감겨 있었어요.'],['채령','그럴 리가 없는데. 대비전 침방에서만 쓰는 실이에요. 대비전 버선에 뒤축 표시할 때만 꺼내요. 밖으로 나갈 일이 없는 실이라고요.'],...(a[1]===2?[['채령','그 쪽지, 내가 날랐잖아요. 실을 보고 나서 그날 밤 잠을 못 잤어요.']]:[])]]);
    F.push(['S4-32','이서는 여천 나루에서 건진 연이의 버선을 떠올렸다. 뒤축의 파란 실, 끝에 소복이 지은 매듭. 어머니는 그 실을 어디서 얻었을까.'+(a[2]===1?' 사본에서 일부러 뺀 줄도 떠올랐다. "실은 침방 것으로 했다." 어머니는 침방 사람이었다.':''),
      [['이서','제 동생 버선 뒤축에 이 실이 있었어요. 여천에서요.'],['채령','그럼 그 버선은 처음에 대비전 침방에서 나간 거예요. 아니면 침방 사람이 들고 나갔거나.']]]);
    F.push(a[1]===2?['S4-32b','채령은 실타래를 내밀다 도로 거두었다.',[['채령','…저 이제 한 상궁마마님 심부름도 해요. 이걸 드리면, 제가 드린 거예요.']]]
      :['S4-32b','채령은 실타래를 이서 손에 쥐여 주었다.',[['채령','가져가요. 한 타래쯤은 빈 걸 아무도 몰라요.']]]);
  }
  if(step===4){
    F.push(['S4-36','이서는 여천을 떠날 때부터 어머니의 봉투를 지니고 있었다. 바느질 상자 밑판에서 나온, 같은 날 찍힌 세 인장. 그때는 무엇인지 몰랐다.',[['이서','어머니, 이걸 왜 상자 밑에 넣어 두셨어요.']]]);
    F.push(['S4-37','봉투 안의 증서에는 세 인장이 나란히 찍혀 있었다. 대비전 지밀, 별채, 여천 관아. 날짜는 여덟 해 전 시월. 이서는 시즌 3 끝에 장부 틈에서 나온 쪽지를 그 옆에 놓았다. 큰물 뒤에 연이를 죽은 아이로 적으라 했던 쪽지. 그 귀퉁이의 지밀 인장과, 증서의 지밀 인장이 같은 모양이었다.'
      +(a[1]===1?' 한 상궁의 쪽지에 적혀 있던 날짜도 여덟 해 전 시월이었다.':'')+(a[3]===1?' 그달 침방 실을 가져간 칸에도 \'지밀\'이라고만 적혀 있었다.':''),[['이서','연이를 우리 집에 맡긴 손이랑, 연이를 지우라고 한 손이 같아요.']]]);
    F.push(['S4-37b',reachPlace4[r]+(r===3?(handoff.rankGoal.done?' 이서는 기록청 서사다.':' 이서는 의녀다.'):''),[]]);
  }
  if(step===5){
    const way=exitWay(a);
    F.push(['S4-41','스무날째. 한성부에서 연이를 불렀다. 시즌 3에서 고친 호적이 맞는지, 살아 있는 아이를 직접 보고 확인하겠다는 것이다. 박 유모가 연이를 데리고 한성에 올라왔다. 이서가 궁 밖으로 나가려면 누군가의 허락이 필요했다.',[]]);
    F.push(['S4-41b',way==='choi'?'최 상궁이 출궁 패를 써 주었다.':way==='han'?'한 상궁이 먼저 패를 내밀었다.':'허락해 줄 사람이 없었다. 이서는 '+sneakWay4[r]+' 궁을 빠져나갔다.',
      way==='choi'?[['최 상궁','해 지기 전에 돌아와라. 늦으면 나도 너를 못 감싼다.']]:way==='han'?[['한 상궁','동생을 본다지. 다녀오너라. 어디서 만나는지만 일러 두고.']]:[]]);
    F.push(['S4-42','한성부 뒤뜰 감나무 아래. 박 유모 손을 잡고 서 있던 연이가 이서를 보자 손을 놓고 달려왔다. 몇 달 만이었다. 연이는 그새 키가 조금 자라 있었다.',[['연이','언니! 나 여기 사람들 앞에서 이름 말했어. 연이라고. 크게 말했어.'],['이서','잘했어. 아주 잘했어.'],['연이','근데 저 아저씨들이 자꾸 물어봐. 내가 진짜 엄마 딸이냐고.']]]);
    F.push(['S4-42b','박 유모가 고개를 숙였다. 이서는 연이의 손을 잡은 채, 무엇을 말해 줄지 정해야 했다.',[]]);
  }
  if(step===6){
    const charge=a[4]===0?['기록을 고친 죄','"기록청 서사와 짜고 대비전 인장이 찍힌 문서를 위조했다." 윤석도 함께 불려 왔다.']
      :exitWay(a)==='sneak'?['무단 출궁','"밤마다 궁 밖 종친의 일을 캐고 다녔다."']
      :a[1]===0?['별채와 내통한 죄','"별채에 서찰을 나른 것이 이 아이다. 출입 장부에 이름이 있다."']
      :['도망 나인의 딸','"이 아이 어미가 여덟 해 전 대비전 침방에서 도망친 나인이다. 그 딸이 무엇을 노리고 들어왔겠느냐."'];
    F.push(['S4-47','스무닷새째 아침. 대비전 뜰에 돗자리가 깔렸다. 한 상궁이 대비 앞에 엎드려 이서를 고발했다. 늘 그랬듯 목소리는 낮고 다정했다.',[['한 상궁','마마, 제가 거둔 아이입니다. 그래서 제가 먼저 말씀드리는 것입니다.']]]);
    F.push(['S4-47b','죄목은 '+charge[0]+'. '+charge[1]+(exitWay(a)==='han'?' 이서의 손이 떨렸다. 한 상궁은 연이를 덫의 끝에 걸어 두었다.':''),
      exitWay(a)==='han'?[['한 상궁','한성부 뒤뜰에서 만난 아이도 마마께서 한번 보셔야 합니다. 그 아이가 누구 핏줄인지.']]:[]]);
    F.push(['S4-47c','대비는 발 너머에서 한마디만 했다. "할 말이 있으면 해 보아라." 이서에게 주어진 것은 해가 기울기 전까지의 시간이었다.',[]]);
  }
  if(step===7){
    const free=released(a);
    F.push(['S4-58',free?'덫이 풀린 밤. 한 상궁은 대비전 별실에 갇혔고, 궁 안은 숨을 죽였다. 이서에게 두 곳에서 부름이 왔다.':'덫은 풀리지 않았지만 처분은 미뤄졌다. 이서는 처소에 갇힌 채 밤을 맞았다. 그래도 두 곳에서 부름이 왔다.',[]]);
    F.push(kingCall4[r]);
    F.push(['S4-58b','대비는 처음으로 발을 걷었다. 늙은 얼굴에 피곤이 깊었다.',[['대비','한 상궁은 내가 벌하마. 너희 집 호적도 내가 고쳐 주마. 그러니 종친의 일은, 여기서 덮자꾸나.']]]);
    F.push(['S4-59','같은 밤, '+(free?'갇힌 별실에서':'대비전 안쪽 방에서')+' 한 상궁이 마지막으로 이서를 불렀다.',[['한 상궁','대비마마도 상감도 너를 쓰고 버리실 게다. 내 자리를 네게 주마. 지밀은 기록을 지우는 자리이기도 하지만, 남기는 자리이기도 하단다.']]]);
  }
  return F;
}
// 선택 뒤 반응 칸
function reactionFrames(step,pick){
  const a=progress.answers,r=handoff.rank;
  if(step===6){
    const ok=released(a);
    if(pick===0)return ok?[['S4-48','이서는 별채로 사람을 보내 한 줄만 전했다. "빠진 줄은 \'실은 침방 것으로 했다\'입니다." 해가 기울 무렵, 옥색 도포의 종친이 대비전 뜰에 들어섰다.',[['영은군','마마, 이 아이를 벌하시려거든 저부터 벌하십시오. 여덟 해 전 침방 나인이 낳은 아이는 제 아이입니다.']]]]
      :[['S4-49',a[2]===0?'별채의 문은 열리지 않았다. 집사가 대신 나와 고개를 저었다. 편지를 이미 가진 사람은 더 잃을 것이 없었다.':'영은군은 오지 않았다. 대신 별채에서 이서가 \'편지를 훔치려 했다\'는 진술서가 올라왔다.',a[2]===0?[['별채 집사','주인께서는 그 아이를 모른다 하셨네.']]:[]]];
    if(pick===1)return ok?[['S4-50','최 상궁이 돗자리 끝에 나와 엎드렸다. 그러고는 이서가 아니라 한 상궁을 보았다.',[['최 상궁','여덟 해 전 그 아이를 여천에 내보낸 날, 실을 감은 사람이 저입니다. 한 상궁마마님께서 시키신 대로요. 오늘은 제가 시킨 대로 하지 않겠습니다.']]]]
      :[['S4-51','최 상궁은 끝내 고개를 들지 않았다. 대비가 묻자 짧게 답했다.',[['최 상궁','제 처소에서 데리고 있던 아이이나, 무엇을 하고 다녔는지는 모릅니다.']]]];
    return ok?[['S4-52','이서는 버선을 뜯어 증서와 쪽지를 꺼내 발 앞에 놓았다. 그리고 확인해 준 사람의 이름을 댔다. 발 너머가 오래 조용했다. 대비가 처음으로 한 상궁의 이름을 불렀다.',[['이서','여덟 해 전 아이를 맡긴 증서와, 큰물 뒤 그 아이를 죽었다고 적으라 한 쪽지입니다. 같은 지밀 인장입니다. '+(a[4]===0?'기록관이':'의관이')+' 이름을 걸고 확인했습니다.']]]]
      :[['S4-53','이서는 증서를 내놓았지만, 그 종이가 진짜라고 말해 줄 사람이 없었다. 한 상궁이 부드럽게 웃었다.',[['한 상궁','마마, 보십시오. 이렇게 도장까지 흉내 내는 아이입니다.']]]];
  }
  const F=[...acts4[step].reactions[pick]];
  const rankLine=table=>table[rk()]||table[r];
  if(step===0)F.push(['S4-16b','',rankLine(rankLines4)]);
  if(step===2||step===3)F.push(['S4-'+(step===2?'30b':'35b'),'',rankLine(rankLinesAct4[step])]);
  if(step===4)F.push(['S4-40b',a[3]===2?'침방에서 밀려난 채령을 빨래터에서 만났다.':'',act5Echo4[a[3]]]);
  if(step===5){
    const way=exitWay(a);
    F.push(['S4-46',way==='choi'?'해 지기 전, 이서는 궁문에 닿았다.':way==='han'?'궁문 앞에서 한 상궁이 기다리고 있었다.':'이서는 담 모퉁이에서 숨을 고르고 문 안으로 섞여 들었다. 아무도 보지 못했다, 고 이서는 생각했다.',
      way==='choi'?[['최 상궁','제때 왔구나. 오늘 일은 내 장부에만 적어 두마.']]:way==='han'?[['한 상궁','동생은 잘 있더냐. 한성부 뒤뜰 감나무가 올해 유난히 붉다더구나.']]:[]]);
    if(way==='han')F.push(['S4-46b','한성부 뒤뜰도, 감나무도, 이서는 한 상궁에게 말한 적이 없었다.',[]]);
  }
  return F;
}

// ── 화면 ──
function decision(step){
  const F=buildup(step),act=acts4[step];
  reader.innerHTML=heading('시즌 4 · '+(step+1)+' / 8 · '+rankNames4[handoff.rank],act.title)+F.slice(0,-1).map(f=>frame(f)).join('')+
    frame([F.at(-1)[0],F.at(-1)[1],F.at(-1)[2]],'decision');
  const body=reader.querySelector('.decision .frame-body')||reader.querySelector('.frame:last-of-type .frame-body');
  const q=document.createElement('p');q.className='question';q.textContent=act.question;body.append(q);
  const box=document.createElement('div');box.className='choices';
  optionsFor(step).forEach((label,i)=>{
    const b=button(label,()=>saveChange(()=>{progress.answers.push(i);progress.reaction=step<acts4.length-1;}));
    if(step===7&&i===0&&!released(progress.answers))b.disabled=true;
    box.append(b);
  });
  body.append(box);
  syncTrack();
}
function reaction(step,pick){
  reader.innerHTML=heading('방금 고른 행동',optionsFor(step)[pick])+reactionFrames(step,pick).map(f=>frame(f)).join('');
  const box=document.createElement('section');box.className='verdict';
  box.append(button('다음 막으로',()=>saveChange(()=>{progress.reaction=false;}),'inline-action'));
  reader.append(box);
  syncTrack();
}
function fatal4(fall){
  progress.answers=progress.answers.slice(0,fall.at);
  const step=fall.at-1,pick=progress.answers[step];
  const [title,place,beats]=fatalEndings4[fall.fate];
  reader.innerHTML=heading('방금 고른 행동',optionsFor(step)[pick])+heading('시즌 4 완 · 궁에서 밀려나다',title,'h2')+beats.map(f=>frame(f)).join('')+
    '<section class="verdict"><h2>궁에 남은 기록</h2><dl><dt>이서의 신분</dt><dd>'+text(rankNames4[handoff.rank])+'</dd><dt>이서가 있는 곳</dt><dd>'+text(place)+'</dd></dl><p>이 길에서는 누가 연이를 지웠는지 끝까지 묻지 못했습니다.</p></section>';
  const box=reader.querySelector('.verdict');
  box.append(button('방금 고른 선택 다시 하기',()=>saveChange(()=>{progress.answers=progress.answers.slice(0,-1);progress.reaction=false;})));
  box.append(button('시즌 4 처음부터 다시 읽기',()=>saveChange(()=>{progress={answers:[],reaction:false};})));
  playTrack('s4-ost-e5');
}
function ending4(){
  const a=progress.answers,id=finalEnding(a),[title,beats,next,track]=endings4[id];
  let F=[...beats];
  if(id==='yeon'&&a[5]===2)F.splice(2,0,yeonKnowsLater4);
  const done=rankGoalDone4(a),[goal,win,lose]=rankGoals4[handoff.rank];
  F.push(done?win:lose);
  try{localStorage.setItem('yeocheon-season-five-v1handoff:'+storageKey,JSON.stringify({version:1,rank:handoff.rank,ending:id,rankGoal:{name:goal,done},answers:[...a],values:values(a),yeonChose:a[5]===0?'knowing':a[5]===2?'unknowing':null,from:handoff.key}));}catch{}
  reader.innerHTML=heading('시즌 4 완 · '+rankNames4[handoff.rank],title)+F.map(f=>frame(f)).join('')+
    '<section class="verdict"><h2>궁 안의 이름</h2><dl><dt>이서의 신분</dt><dd>'+text(rankNames4[handoff.rank])+'</dd><dt>시즌 4의 결말</dt><dd>'+text(title)+'</dd><dt>신분의 몫</dt><dd>'+text(goal+' · '+(done?'이룸':'놓침'))+'</dd><dt>시즌 5 · 봄의 이름</dt><dd>'+text(next)+'</dd></dl><p>최종 시즌 「봄의 이름」은 준비 중입니다. 이 결말은 이 브라우저에 남아 시즌 5로 이어집니다.</p></section>';
  reader.querySelector('.verdict').append(button('다른 선택으로 다시 읽기',()=>saveChange(()=>{progress={answers:[],reaction:false};})));
  playTrack('s4-ost-'+track);
}
function render(focus=false,message=''){
  if(!handoff){
    reader.innerHTML=heading('시즌 4','궁 안의 이름')+'<section class="missing"><p>이 브라우저에서 시즌 3의 결말(궁에 들어가는 장면)까지 읽으면, 그때의 신분과 판결을 들고 시즌 4를 시작할 수 있어요.</p><a class="link" href="season-3.html">시즌 3로 돌아가기</a></section>';
    playTrack('s4-ost-00');
  }else if(palaceFall4(progress.answers))fatal4(palaceFall4(progress.answers));
  else if(progress.reaction){const last=progress.answers.length-1;reaction(last,progress.answers[last]);}
  else if(progress.answers.length===acts4.length)ending4();
  else decision(progress.answers.length);
  save.disabled=!handoff;
  load.disabled=!bookmark||!valid(read(bookmark));
  status.textContent=message;
  if(focus){reader.querySelector('h1,h2')?.focus({preventScroll:true});window.scrollTo(0,0);}
}
// ── 음악: 막마다 곡, 결말은 E1~E5, 시작 전 화면은 주제곡 ──
let track4='';
function syncTrack(){
  const n=progress.answers.length,step=progress.reaction?n-1:n;
  playTrack('s4-ost-0'+Math.min(step+1,8));
}
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
