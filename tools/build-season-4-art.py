"""시즌 4(Claude 설계판) 그림을 site/season-4-new.webp(4열, 칸당 400px)로 묶는다.

사용법: python tools/build-season-4-art.py <드라이브의 '호적에 없는 봄/시즌4' 폴더>
- 넣을 그림 번호는 tools/season-4-art-list.cjs가 이야기·배정표에서 뽑는다(화면에 나올 수 있는 것만).
- 파일 이름은 그림 작업보드 C열의 검수 통과본(_v2·_v3 등)을 따른다. VERSIONS에 없으면 '<번호>.png'.
- 사이트 그림(S4-01 등)은 '사이트/' 하위 폴더, 시즌 3 그림(S3-xx)은 site/season-3-new.webp에서 잘라 온다.
- 순서는 번호 정렬이라 그림이 바뀌면 칸 번호도 다시 매겨진다. slots 파일을 함께 다시 쓰므로 문제없다.
"""
import sys, os, re, json, subprocess, hashlib
from PIL import Image, ImageOps

CELL = 400
here = os.path.dirname(os.path.abspath(__file__))
site = os.path.join(here, '..', 'site')
src = sys.argv[1]

# 작업보드 C열(2026-11-28 검수 기준)에서 기본 이름과 다른 것만
VERSIONS = {
    'S4-R007': 'S4-R007_v2', 'S4-R009': 'S4-R009_v2', 'S4-R010': 'S4-R010_v4', 'S4-R012': 'S4-R012_v2',
    'S4-R016': 'S4-R016_v2', 'S4-R018': 'S4-R018_v2', 'S4-R029': 'S4-R029_v2', 'S4-R030': 'S4-R030_v2',
    'S4-R040': 'S4-R040_v2', 'S4-R046': 'S4-R046_v2', 'S4-R047': 'S4-R047_v2', 'S4-R050': 'S4-R050_v2',
    'S4-E202': 'S4-E202_v2', 'S4-E203': 'S4-E203_v2', 'S4-E301': 'S4-E301_v2', 'S4-E303': 'S4-E303_v3',
    'S4-E304': 'S4-E304_v2', 'S4-E401': 'S4-E401_v3', 'S4-E501': 'S4-E501_v2', 'S4-E505': 'S4-E505_v2',
    'S4-N04': 'S4-N04_v2', 'S4-N19': 'S4-N19_v3', 'S4-N22': 'S4-N22_v2', 'S4-N26': 'S4-N26_v3',
    'S4-B15': 'S4-B15_v4',
}
# season-4-art.js의 siteFiles4와 같다(B2는 추천본 ' (1)')
SITE = {
    'S4-01': 'S4-01', 'S4-02': 'S4-02', 'S4-03': 'S4-03', 'S4-04': 'S4-04', 'S4-05': 'S4-05', 'S4-06': 'S4-06',
    'S4-09': 'S4-09', 'S4-10': 'S4-10', 'S4-12': 'S4-12', 'S4-17': 'S4-17 (1)',
    'S4-13@MU': 'S4-13@MU (1)', 'S4-13@SE': 'S4-13@SE (1)', 'S4-13@UI': 'S4-13@UI (1)', 'S4-13@NA': 'S4-13@NA (1)',
}

ids = subprocess.run(['node', os.path.join(here, 'season-4-art-list.cjs')], capture_output=True, text=True, check=True, encoding='utf-8').stdout.split()
rows = (len(ids) + 3) // 4
out = Image.new('RGB', (4 * CELL, rows * CELL), (24, 21, 20))

s3 = None
def s3cut(name):
    global s3
    if s3 is None:
        s3 = Image.open(os.path.join(site, 'season-3-new.webp')).convert('RGB')
        text = open(os.path.join(site, 'season-3-new-slots.js'), encoding='utf-8').read()
        s3.slots = {k: int(v) for k, v in re.findall(r"'(S3-\d+)':(\d+)", text)}
    c = s3.slots[name]
    return s3.crop(((c % 4) * CELL, (c // 4) * CELL, (c % 4 + 1) * CELL, (c // 4 + 1) * CELL))

slots, manifest, missing = {}, {}, []
for i, name in enumerate(ids):
    if name.startswith('S3-'):
        im, where = s3cut(name), 'season-3-new.webp'
    else:
        rel = os.path.join('사이트', SITE[name] + '.png') if name in SITE else VERSIONS.get(name, name) + '.png'
        path = os.path.join(src, rel)
        if not os.path.exists(path):
            missing.append(rel)
            continue
        im = ImageOps.fit(Image.open(path).convert('RGB'), (CELL, CELL), Image.LANCZOS)
        where = rel.replace(os.sep, '/')
        manifest[name] = {'file': where, 'sha256': hashlib.sha256(open(path, 'rb').read()).hexdigest()}
    out.paste(im, ((i % 4) * CELL, (i // 4) * CELL))
    slots[name] = i
if missing:
    sys.exit('그림 파일이 없습니다: ' + ', '.join(missing))

out.save(os.path.join(site, 'season-4-new.webp'), 'WEBP', quality=86, method=6)
with open(os.path.join(site, 'season-4-new-slots.js'), 'w', encoding='utf-8') as f:
    f.write('// tools/build-season-4-art.py가 만든다. season-4-new.webp에 들어간 그림과 칸 번호.\n')
    f.write('var NEW_CUT_SLOTS_4 = %s;\n' % json.dumps(slots, ensure_ascii=False))
    f.write('var NEW_CUT_ROWS_4 = %d;\n' % rows)
with open(os.path.join(here, '..', 'docs', 'season-4-art-manifest.json'), 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=1)
print('packed %d cuts, %d rows, %d KB' % (len(slots), rows, os.path.getsize(os.path.join(site, 'season-4-new.webp')) // 1024))
