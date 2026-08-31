# middle-math

중학교 2학년 2학기 진단 → 맞춤 보완 → 확인 → 심화 학습을 위한 PWA 프로토타입입니다.

## Repository layout

이 버전은 **저장소 루트 자체가 Vite/PWA 프로젝트 루트**입니다.

```text
middle-math/
├── .github/workflows/deploy.yml
├── public/
│   ├── .nojekyll
│   ├── manifest.webmanifest
│   ├── prototype.html
│   ├── sw.js
│   └── icons/
├── src/
├── index.html
├── package.json
├── vite.config.ts
└── .npmrc
```

기존의 `pwa/` 하위 폴더는 필요하지 않습니다.

## Local run

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

GitHub Pages용 Vite base는 `/middle-math/`로 설정되어 있습니다.

## GitHub Pages

Repository Settings → Pages → Source에서 **GitHub Actions**를 선택합니다.

`main` 브랜치에 push하면 `.github/workflows/deploy.yml`이 자동으로 빌드/배포합니다.

예상 URL:

```text
https://longdal.github.io/middle-math/
```

## 기존 저장소를 이 버전으로 교체

기존 Git history를 유지하면서 작업 트리만 교체하려면 기존 파일을 백업한 후 이 ZIP의 내용을 repository root에 복사하고 commit 하면 됩니다.

완전히 새 Git history로 시작하려면 `.git` 삭제 후 다시 초기화할 수 있습니다.

```bash
rm -rf .git
git init
git branch -M main
git remote add origin git@github.com:longdal/middle-math.git
git add .
git commit -m "Initialize root-based PWA"
git push -u --force origin main
```

`--force`는 원격의 기존 history를 교체할 때만 사용하세요.
