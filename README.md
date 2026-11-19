# 호적에 없는 봄 · 시즌 1~3 작업 인계

`site/`만 있으면 세 시즌을 실행할 수 있습니다. HTML·CSS·바닐라 JavaScript와 로컬 이미지·음악으로 구성됐으며, 빌드나 외부 서비스 연결이 필요하지 않습니다. 기존 연재본의 파일과 장면을 옮겼고, 시즌 1 파일은 편집하기 쉽게 분리하면서 좁은 화면의 여백과 선택 버튼 크기를 조정했습니다.

## 실행

압축을 푼 폴더에서 다음 명령을 실행한 뒤 같은 브라우저 탭에서 시즌을 이어 읽습니다.

```sh
python -m http.server 8000 --directory site
```

시작 주소는 [http://localhost:8000/](http://localhost:8000/)입니다. `index.html`은 시즌 페이지를 같은 출처의 iframe에 띄우는 셸이라서, 이어 읽기 버튼으로 시즌을 넘어가도 주소창은 시작 주소 그대로입니다. 셸은 마지막으로 연 시즌을 `hojeoge-shell-page`에 기억해 새로고침하면 그 시즌을 다시 엽니다. `/season-1.html`~`/season-3.html`을 직접 열면 시작 주소로 바뀌면서 그 시즌이 셸 안에 열립니다.

## 파일

| 경로 | 편집할 내용 |
| --- | --- |
| `site/index.html` | 한 주소에서 시즌 1~3을 이어 읽는 셸(iframe). 시즌 내용은 없음 |
| `site/season-1.html`, `site/season-1.css`, `site/season-1.js` | 시즌 1 진입 화면, 컷 배치, 장면과 분기 |
| `site/season-2-story.js`, `site/season-2.js`, `site/season-2.css` | 신분별 대사와 컷, 선택과 처분, 궁문 결말 |
| `site/season-3-story.js`, `site/season-3.js`, `site/season-3.css` | 궁 안의 대사와 선택, 결말, 컷 안의 선택창 |
| `site/about.html`, `site/privacy.html`, `site/pages.css` | 작품 소개와 개인정보처리방침. 셸 안에서 열려도 '마지막 시즌'으로 기억하지 않음 |
| `site/ads-config.js`, `site/ads.js` | AdSense 설정과 광고 칸. 게시자 ID(`client`)가 비어 있으면 광고 코드를 불러오지 않음. 광고는 각 페이지 맨 아래 `#ad-slot`에 한 칸, 장면이 바뀌어도 다시 요청하지 않음 |
| `user-site/` | 배포되지 않음. `AI-bk.github.io` 저장소에 올릴 `ads.txt`와 이동 페이지 |
| `site/season-2-characters.webp` | 사실적인 인물 컷. 시즌 3용 그림체라 시즌 2에서는 쓰지 않음 |
| `site/*.webp`, `site/audio/*.mp3` | 실행에 쓰는 이미지와 음악. 여러 컷이 한 이미지에 배치돼 있는 파일은 CSS와 JS의 배열 좌표를 함께 확인 |
| `reference/season-3-choice-preview.webp` | 사용자가 승인한 사극 드라마 스타일과 모바일 선택창 예시 이미지 |
| `tests/` | 시즌 1~3 분기와 저장, 인계 로직 확인 |
| `STORY-AND-RULES.md`, `CLAUDE-START.md` | 서사·연출 규칙과 다음 대화에 붙여 넣을 요청문 |

## 테스트

Node.js에서 별도 설치 없이 실행할 수 있습니다. 테스트는 인계 파일의 상대 경로를 사용합니다.

```sh
node tests/seasons-1-and-2.cjs
node tests/season-3.cjs
```

## 배포 및 저장

- 이전에 배포한 시즌 1~3 연재본은 Vercel의 동일 도메인에서 이어집니다. [기존 연재 주소](https://hojeoge-eomneun-bom-season-1-brian-park.vercel.app/)
- GitHub Pages용 시즌 1 단독본도 따로 만들었습니다. GitHub 저장소는 생성됐고, 마지막 확인 시 아직 비어 있었으며 Pages는 비활성 상태였습니다. 연동 토큰의 쓰기 요청이 403으로 거절됐고 브라우저 로그인 단계에서 작업이 멈췄습니다. [GitHub 저장소](https://github.com/AI-bk/hojeoge-season-1)
- 세 시즌을 한꺼번에 배포할 때는 `site/` **안의 내용 전체**를 한 배포 루트에 둡니다. `.nojekyll`이 포함돼 있습니다.
- 저장은 브라우저의 `localStorage`를 사용합니다. 주소 또는 포트가 바뀌면 저장 공간도 달라집니다. Vercel, 로컬 주소, GitHub Pages 간 기존 저장 이관과 계정 동기화는 구현되지 않았습니다.
