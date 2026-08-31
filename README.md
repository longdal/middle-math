# 중2 수학 심화 학습 PWA

React + Vite + TypeScript 기반의 중2-2 수학 학습 PWA입니다.

학습 흐름:

`진단 평가 → 취약 개념 Queue → 개념/SVG 설명 → 확인 문제 → 다음 취약 개념 → 단원 재평가 → 심화`

Google 연동 기능:

- Google Identity Services OAuth 2.0 token model
- Google Drive `appDataFolder`에 학습 상태/답안 이력 JSON 저장 및 복원
- 문제 제출 시 답안 자동 저장
- 풀이 사진을 일반 Google Drive의 `Middle Math - 풀이 사진` 폴더에 업로드
- 학습 JSON의 Attempt와 Drive 사진 file ID / webViewLink 연결
- Gemini API 키를 현재 탭 메모리에만 임시 보관
- Google Drive/OAuth/Gemini 단위 테스트

## 1. 저장 구조

Google Drive에는 두 종류로 저장합니다.

```text
Google Drive
├── appDataFolder                         # 일반 Drive UI에 보이지 않는 앱 전용 데이터
│   └── middle-math-learning-state.json
│       ├── 현재 단원/화면/점수
│       ├── 취약 개념/보완 진행 상태
│       └── attempts[]
│           ├── 입력 답안
│           ├── 정답 여부
│           ├── 문제/개념/난이도
│           ├── AI 분석 결과(필드 준비됨)
│           └── photo.id / photo.webViewLink
│
└── Middle Math - 풀이 사진               # 사용자가 Drive에서 확인 가능한 폴더
    ├── ..._diagnostic-1_A-xxx.jpg
    ├── ..._diagnostic-2_A-xxx.jpg
    └── ...
```

사진 바이너리를 JSON에 넣지 않고 Drive 파일로 별도 저장하기 때문에 학습 상태 파일이 커지지 않습니다.

## 2. Google Cloud 준비

Google Cloud Console에서 프로젝트를 준비합니다.

1. **Google Drive API** 활성화
2. OAuth consent screen 구성
3. OAuth Client ID를 **Web application** 타입으로 생성
4. Authorized JavaScript origins 등록

PC 개발용:

```text
http://localhost:5173
```

GitHub Pages 운영용:

```text
https://longdal.github.io
```

JavaScript origin에는 `/middle-math/` path를 넣지 않습니다.

앱이 요청하는 scope:

```text
openid
email
profile
https://www.googleapis.com/auth/drive.appdata
https://www.googleapis.com/auth/drive.file
```

- `drive.appdata`: 앱 전용 학습 상태 JSON 저장
- `drive.file`: 이 앱이 생성한 풀이 사진 폴더/사진 파일 접근

기존 버전에서 이미 OAuth 동의를 했다면 `drive.file` scope가 새로 추가되었기 때문에 첫 연결 시 추가 동의 화면이 나타날 수 있습니다.

## 3. 환경 변수

```bash
cp .env.example .env.local
```

`.env.local`:

```env
VITE_GOOGLE_CLIENT_ID=1234567890-xxxxxxxx.apps.googleusercontent.com
```

OAuth Client ID는 브라우저에 노출되는 공개 식별자입니다. **Client Secret은 PWA에 넣지 않습니다.**

## 4. PC 실행

```bash
npm install
npm run dev
```

접속:

```text
http://localhost:5173/middle-math/
```

## 5. 답안 + 풀이 사진 저장 테스트

1. 페이지 왼쪽 위 `☁️ 저장 / AI 설정`
2. `Google 연결`
3. 진단 평가 시작
4. 답을 입력
5. `사진 촬영 또는 파일 선택`에서 풀이 사진 선택
6. `제출`
7. 제출 버튼에 `사진 저장 중…`이 잠시 표시되는지 확인
8. 설정 패널에 `답안과 풀이 사진을 Google Drive에 자동 저장했습니다.` 확인
9. Google Drive에서 `Middle Math - 풀이 사진` 폴더 확인

사진 없이 제출해도 답안/정답 여부/문제 정보는 자동으로 학습 JSON에 저장됩니다.

## 6. 불러오기 테스트

1. 문제를 2~3개 풀고 저장 완료 확인
2. 페이지 새로고침
3. 다시 `Google 연결`
4. `Drive 불러오기`
5. 저장 시점의 문제 번호/점수/취약 개념 상태가 복원되는지 확인
6. 설정 패널의 `누적 답안 N개 · Drive 사진 M개` 확인

사진 자체를 브라우저 메모리로 다시 다운로드하지는 않습니다. 저장된 Attempt에는 Google Drive file ID와 webViewLink가 복원됩니다.

## 7. Attempt 저장 예시

```json
{
  "attemptId": "A-abc123",
  "problemId": "diagnostic-1",
  "answer": "50",
  "correct": true,
  "concept": "이등변삼각형",
  "difficulty": "★★",
  "question": "AB=AC인 ...",
  "createdAt": "2026-08-31T07:00:00.000Z",
  "photo": {
    "id": "GOOGLE_DRIVE_FILE_ID",
    "name": "2026-08-31_...jpg",
    "mimeType": "image/jpeg",
    "webViewLink": "https://drive.google.com/file/d/.../view"
  },
  "analysis": null
}
```

향후 Gemini 사진 풀이 분석 결과는 같은 Attempt의 `analysis` 필드에 연결할 수 있도록 `attachAttemptAnalysis()` API를 준비해 두었습니다.

## 8. Gemini API 키

`☁️ 저장 / AI 설정 → Gemini API 키 · 임시 사용`에서 입력합니다.

키는 다음에 저장하지 않습니다.

- localStorage
- sessionStorage
- IndexedDB
- Cookie
- Google Drive
- 학습 snapshot

새로고침/탭 종료 시 사라집니다.

Google OAuth와 Gemini API key는 별개의 인증입니다. 공개 서비스에서는 Gemini key를 클라이언트에 직접 노출하지 말고 serverless/backend proxy 사용을 권장합니다.

## 9. 테스트

```bash
npm test
```

현재 테스트 범위:

- Drive 상태 파일 최초 생성
- Drive 상태 파일 PATCH 갱신
- 학습 상태 불러오기
- 저장 파일 없음 처리
- 풀이 사진 폴더 신규 생성
- 기존 풀이 사진 폴더 재사용
- 실제 Blob을 Drive media upload body로 전달
- OAuth client ID 누락 처리
- OAuth `drive.appdata` + `drive.file` scope 요청
- Gemini 키/헤더/메모리 clear

전체 테스트 + 빌드:

```bash
npm run check
```

## 10. GitHub Pages

저장소:

```text
https://github.com/longdal/middle-math
```

배포 URL:

```text
https://longdal.github.io/middle-math/
```

GitHub repository에서:

`Settings → Secrets and variables → Actions → Variables`

에 다음 variable을 등록합니다.

```text
VITE_GOOGLE_CLIENT_ID
```

`.github/workflows/deploy.yml`은 package-lock.json이 있으면 `npm ci`, 없으면 `npm install`을 사용하고, 테스트 성공 후 production build/Pages 배포를 수행합니다.
