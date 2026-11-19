"""ChatGPT로 새로 그린 시즌 2 컷을 site/season-2-new.webp(4x4, 칸당 400px)로 묶는다.

사용법: python3 tools/build-new-cuts.py <S2-xx.png 파일들이 있는 폴더>
칸 번호는 SLOTS에 고정돼 있어, 일부 파일만 있어도 다른 칸 위치가 바뀌지 않는다.
없는 칸은 어두운 빈칸으로 남고, 사이트 코드는 파일이 있는 칸만 쓴다.
"""
import sys, os
from PIL import Image, ImageOps

SLOTS = {'S2-01':0,'S2-02':1,'S2-03':2,'S2-04':3,'S2-05':4,'S2-06a':5,'S2-06b':6,'S2-06c':7,
         'S2-06d':8,'S2-07':9,'S2-08':10,'S2-09':11,'S2-10':12}
CELL = 400
src = sys.argv[1]
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site')
out = Image.new('RGB', (4*CELL, 4*CELL), (23, 38, 36))
found = []
for name, slot in SLOTS.items():
    path = os.path.join(src, name + '.png')
    if not os.path.exists(path):
        continue
    im = ImageOps.fit(Image.open(path).convert('RGB'), (CELL, CELL), Image.LANCZOS)
    out.paste(im, ((slot % 4) * CELL, (slot // 4) * CELL))
    found.append(name)
out.save(os.path.join(root, 'season-2-new.webp'), 'WEBP', quality=88, method=6)
slots = ','.join("'%s':%d" % (n, SLOTS[n]) for n in found)
with open(os.path.join(root, 'season-2-new-slots.js'), 'w', encoding='utf-8') as f:
    f.write('// tools/build-new-cuts.py가 만든다. season-2-new.webp에 실제로 들어간 새 컷과 칸 번호.\n')
    f.write('var NEW_CUT_SLOTS = {%s};\n' % slots)
print('packed:', ', '.join(found))
