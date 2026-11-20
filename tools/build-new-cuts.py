"""ChatGPT로 새로 그린 컷을 site/season-N-new.webp(4x4, 칸당 400px)로 묶는다.

사용법: python3 tools/build-new-cuts.py <S2-xx.png·S3-xx.png 파일들이 있는 폴더> [시즌 번호, 기본 2]
칸 번호는 SLOTS에 고정돼 있어, 일부 파일만 있어도 다른 칸 위치가 바뀌지 않는다.
없는 칸은 어두운 빈칸으로 남고, 사이트 코드는 파일이 있는 칸만 쓴다.
"""
import sys, os
from PIL import Image, ImageOps

SLOTS2 = {'S2-01':0,'S2-02':1,'S2-03':2,'S2-04':3,'S2-05':4,'S2-06a':5,'S2-06b':6,'S2-06c':7,
         'S2-06d':8,'S2-07':9,'S2-08':10,'S2-09':11,'S2-10':12,'S2-11':13,'S2-12':14}
SLOTS2.update({'S2-%02d' % i: i+2 for i in range(13, 37)})  # 여정 길 위 장면(S2-13~26), 실패 결말(S2-27~36)
SLOTS1 = {'S1-%02d' % i: i-1 for i in range(1, 17)}
SLOTS3 = {'S3-%02d' % i: i-1 for i in range(1, 45)}
CELL = 400
src = sys.argv[1]
season = int(sys.argv[2]) if len(sys.argv) > 2 else 2
SLOTS = {1: SLOTS1, 2: SLOTS2, 3: SLOTS3}[season]
varname = {1: 'NEW_CUT_SLOTS_1', 2: 'NEW_CUT_SLOTS', 3: 'NEW_CUT_SLOTS_3'}[season]
ROWS = (max(SLOTS.values()) // 4 + 1) if season in (2, 3) else 4  # 시즌 2·3은 칸 수에 맞춰 4열 x N줄
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site')
out = Image.new('RGB', (4*CELL, ROWS*CELL), (23, 38, 36))
found = []
for name, slot in SLOTS.items():
    path = os.path.join(src, name + '.png')
    if not os.path.exists(path):
        continue
    im = ImageOps.fit(Image.open(path).convert('RGB'), (CELL, CELL), Image.LANCZOS)
    out.paste(im, ((slot % 4) * CELL, (slot // 4) * CELL))
    found.append(name)
out.save(os.path.join(root, 'season-%d-new.webp' % season), 'WEBP', quality=88, method=6)
slots = ','.join("'%s':%d" % (n, SLOTS[n]) for n in found)
with open(os.path.join(root, 'season-%d-new-slots.js' % season), 'w', encoding='utf-8') as f:
    f.write('// tools/build-new-cuts.py가 만든다. season-%d-new.webp에 실제로 들어간 새 컷과 칸 번호.\n' % season)
    f.write('var %s = {%s};\n' % (varname, slots))
    if season in (2, 3):
        f.write('var NEW_CUT_ROWS_%d = %d;\n' % (season, ROWS))
print('packed:', ', '.join(found))
