import re, csv
from collections import Counter
R = '/home/user/hojeoge-season-1/'
story = open(R + 'site/season-3-story.js', encoding='utf-8').read()
main = open(R + 'site/season-3.js', encoding='utf-8').read()
src = story + '\n' + main
L = r"'([^'\n]*)'"
names = set(re.findall(r"speaker:'([^']+)'", src))
names |= {'최 상궁', '윤석', '이현', '채령', '조 판관', '이서', '명선', '서겸', '한 노인', '백문재', '정윤', '박 유모'}
out = []  # (speaker, line, scene)
def add(sp, line, scene=''):
    line = line.strip()
    if sp and line and re.search('[가-힣]', line):
        out.append((sp, line, re.sub(r'\s+', ' ', scene)[:80]))

# 막의 결정 화면 대사
for m in re.finditer(r"title:'([^']+)', image:\d+, speaker:'([^']+)', line:'([^']*)'", story):
    add(m.group(2), m.group(3), m.group(1) + ' 막의 선택 앞에서.')
add('최 상궁', '이 증인을 누가 데려왔느냐?', '문이 열리는 순간. 증인과 함께 온 이서에게.')
add('최 상궁', '이 기록을 가지고 온 사람이 너냐?', '문이 열리는 순간. 기록만 들고 온 이서에게.')
# [..., '해설', '인물', '대사'] (선택 반응·신분 목표·실패 결말·frame 호출)
for m in re.finditer(L + r"\s*,\s*" + L + r"\s*,\s*" + L, src):
    cap, sp, line = m.groups()
    if sp in names:
        add(sp, line, cap)
# frame(..., 해설식, '인물', '대사') — 해설이 문자열을 이어 붙인 식인 경우
for m in re.finditer(L + r"\s*,\s*" + L + r"\s*\)", main):
    sp, line = m.groups()
    if sp in names:
        add(sp, line, '궁문 앞에서.')
# 신분별 한 컷 [인물, 해설, 대사]
for m in re.finditer(r"\d:\[" + L + r"\s*,\s*" + L + r"\s*,\s*" + L + r"\]", story):
    sp, cap, line = m.groups()
    if sp in names:
        add(sp, line, cap)
# 시즌 2 여정에 따른 이현·윤석 대사 {키:['해설','대사'],...}
for who, key in (('이현', 'j.papers'), ('윤석', 'j.pursuit')):
    blk = main[:main.find('}[' + key + ']')]
    blk = blk[blk.rfind('const [caption,line]={'):]
    for m in re.finditer(r"\w+:\[" + L + r"\s*,\s*" + L + r"\]", blk):
        add(who, m.group(2), m.group(1))
# 첫 막 증인의 말
w = re.search(r"const words=handoff\.witness==='명선'\?" + L + r":handoff\.witness==='서겸'\?" + L + ":" + L, main)
add('명선', w.group(1), '최 상궁 앞에 증인으로 선다.')
add('서겸', w.group(2), '최 상궁 앞에 증인으로 선다.')
for c in ['한 노인', '백문재', '정윤', '박 유모']:
    add(c, w.group(3), '최 상궁 앞에 증인으로 선다.')
# 판결 결말 [제목, 해설, 대사] — 이서가 말한다
for m in re.finditer(r"\w+:\[" + L + r"\s*,\s*" + L + r"\s*,\s*" + L + r"\]", story[story.find('const verdicts'):story.find('const aftermathCaptions')]):
    add('이서', m.group(3), '결말. ' + m.group(2))

seen = set(); rows = []
for sp, line, sc in out:
    if (sp, line) in seen: continue
    seen.add((sp, line)); rows.append((sp, line, sc))
with open(R + 'docs/voice/script-s3.tsv', 'w', encoding='utf-8', newline='') as f:
    wr = csv.writer(f, delimiter='\t', lineterminator='\n')
    wr.writerow(['번호', '인물', '대사', '장면·감정'])
    for i, r in enumerate(rows):
        wr.writerow([f'S3-V{i+1:03d}'] + list(r))
print(len(rows), Counter(r[0] for r in rows).most_common())
# 빠진 대사 점검: 화면에 <q>로 나올 수 있는 긴 문자열 중 대본에 없는 것
got = {r[1] for r in rows}
caps = set(re.findall(L, src))
