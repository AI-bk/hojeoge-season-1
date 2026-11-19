# AI-bk.github.io 저장소용 파일

AdSense는 `https://ai-bk.github.io/ads.txt`에서 승인 파일을 찾는다. 이 주소는 `AI-bk.github.io`라는 이름의 저장소만 채울 수 있어서,
이 폴더의 파일을 그 저장소에 그대로 올린다. (이 폴더 자체는 작품 사이트에 배포되지 않는다.)

1. https://github.com/new 에서 저장소 이름 `AI-bk.github.io`, Public으로 만든다.
2. 게시자 ID(ca-pub-4726335366577506)는 이미 들어가 있다.
3. `index.html`과 `ads.txt` 두 파일을 그 저장소에 올린다 (Add file → Upload files). GitHub Pages는 이 이름의 저장소를 자동으로 `https://ai-bk.github.io/`에 게시한다.
4. 작품 저장소의 `site/ads-config.js`에도 같은 게시자 ID가 들어가 있다. 광고 단위를 만든 뒤 `slot`에 그 ID를 넣는다.
