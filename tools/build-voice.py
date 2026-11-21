#!/usr/bin/env python3
"""성우 음성 반영: build-voice.py <녹음 파일 폴더>

폴더 안의 S1-V001.wav / .mp3 / .m4a 같은 파일을 찾아
  1) 모노 48kbps mp3로 줄여 site/voice/<번호>.mp3 로 저장하고
  2) docs/voice/script-*.tsv 대본과 맞춰 site/voice-lines.js (대사 글자 → 번호)를 다시 만든다.
대본에 없는 번호, 대사가 비어 있는 줄은 건너뛴다. 이미 site/voice에 있는 파일도 목록에 넣는다.
"""
import csv, glob, json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'site', 'voice')


def norm(text):
    return ' '.join(text.replace('“', '').replace('”', '').replace('"', '').split())


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else None
    os.makedirs(OUT, exist_ok=True)
    script = {}
    for path in sorted(glob.glob(os.path.join(ROOT, 'docs', 'voice', 'script-*.tsv'))):
        with open(path, encoding='utf-8') as f:
            for row in csv.DictReader(f, delimiter='\t'):
                if row.get('번호') and row.get('대사'):
                    script[row['번호'].strip()] = row
    added = []
    if src:
        for path in sorted(glob.glob(os.path.join(src, '*'))):
            base, ext = os.path.splitext(os.path.basename(path))
            if ext.lower() not in ('.wav', '.mp3', '.m4a', '.ogg', '.flac') or base not in script:
                continue
            dest = os.path.join(OUT, base + '.mp3')
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', path,
                            '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,apad=pad_dur=0.15',
                            '-ac', '1', '-ar', '24000', '-b:a', '48k', dest], check=True)
            added.append(base)
    lines = {}
    for path in sorted(glob.glob(os.path.join(OUT, '*.mp3'))):
        base = os.path.splitext(os.path.basename(path))[0]
        if base in script:
            lines[norm(script[base]['대사'])] = base
    with open(os.path.join(ROOT, 'site', 'voice-lines.js'), 'w', encoding='utf-8') as f:
        f.write('// tools/build-voice.py가 만든다. 대사 글자 → site/voice/<번호>.mp3\n')
        f.write('var VOICE_LINES = ' + json.dumps(lines, ensure_ascii=False, indent=0) + ';\n')
    print('converted:', ', '.join(added) or '-')
    print('voiced lines:', len(lines))


if __name__ == '__main__':
    main()
