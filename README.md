# 동화고등학교 과학실 예약 시스템

동화고등학교 구성원들이 과학실을 효율적으로 예약하고 관리할 수 있는 웹 기반 예약 시스템입니다.

## 주요 기능

- 학교 계정(@donghwa.hs.kr) 구글 로그인 통합
- 캘린더 기반 직관적인 예약 인터페이스
- 과학실 1, 2 분리 예약 관리
- 교시별 예약 시스템 (1~7교시 및 방과후)
- 사용자별 예약 조회 및 관리
- 모바일 환경 최적화 UI
- 관리자 권한 기능 지원

## 기술 스택

- **백엔드**: Node.js, Express
- **인증**: Google OAuth 2.0
- **프론트엔드**: HTML, CSS, JavaScript, Bootstrap 5
- **캘린더**: FullCalendar 5
- **데이터베이스**: MongoDB Atlas
- **배포**: Vercel

## 설치 방법

### 사전 요구사항

- Node.js (v14 이상)
- npm (v6 이상)
- MongoDB 계정 또는 MongoDB Atlas 클러스터

### 설치 단계

1. 저장소 클론

```bash
git clone https://github.com/rltkdrev/Donghwa.git
cd Donghwa
```

2. 의존성 설치

```bash
npm install
```

3. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 채웁니다:

```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CALLBACK_URL=http://localhost:3000/auth/google/callback
SESSION_SECRET=your_session_secret
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name
PORT=3000
```

## Google OAuth 설정 방법

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속합니다.
2. 새 프로젝트를 생성합니다.
3. "API 및 서비스" > "사용자 인증 정보"로 이동합니다.
4. "사용자 인증 정보 만들기" > "OAuth 클라이언트 ID" 선택:
   - 애플리케이션 유형: 웹 애플리케이션
   - 이름: 동화고등학교 과학실 예약
   - 승인된 리디렉션 URI: 
     - 개발 환경: `http://localhost:3000/auth/google/callback`
     - 배포 환경: `https://your-vercel-domain.vercel.app/auth/google/callback`
5. 생성된 클라이언트 ID와 비밀번호를 `.env` 파일에 넣습니다.

## MongoDB 설정 방법

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)에 가입합니다.
2. 새 클러스터를 생성합니다.
3. "Database Access"에서 데이터베이스 사용자를 생성합니다.
4. "Network Access"에서 IP 접근을 설정합니다 (개발 목적이라면 0.0.0.0/0으로 설정).
5. "Clusters"에서 "Connect" 버튼을 클릭하고 "Connect your application"을 선택합니다.
6. 연결 문자열(URI)을 복사하여 `.env` 파일의 `MONGODB_URI`에 붙여넣습니다.

## 실행 방법

개발 모드로 실행:

```bash
npm run dev
```

프로덕션 모드로 실행:

```bash
npm start
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

## 배포 방법 (Vercel)

1. [Vercel](https://vercel.com/)에 가입하고 GitHub 계정을 연결합니다.
2. "New Project"를 클릭하고 GitHub에서 저장소를 불러옵니다.
3. 환경 변수를 설정합니다:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `CALLBACK_URL` (배포 URL로 설정)
   - `SESSION_SECRET`
   - `MONGODB_URI`
4. "Deploy"를 클릭하여 배포합니다.

## 사용 방법

1. 동화고등학교 계정(@donghwa.hs.kr)으로 로그인합니다.
2. 캘린더에서 원하는 날짜를 선택합니다.
3. "예약" 버튼을 클릭하여 예약 페이지로 이동합니다.
4. 예약 정보(직업, 이름, 소속)를 입력합니다.
5. 과학실 1 또는 과학실 2를 선택합니다.
6. 원하는 교시를 선택합니다.
7. "예약하기" 버튼을 클릭하여 예약을 완료합니다.

## 관리자 권한

특정 계정(2024257@donghwa.hs.kr)은 관리자 권한을 가지며, 다른 사용자의 예약도 삭제할 수 있습니다.

## 프로젝트 구조

```
/
├── app.js              # 메인 애플리케이션 파일
├── package.json        # 프로젝트 의존성 관리
├── vercel.json         # Vercel 배포 설정
├── .env                # 환경 변수 (git에 포함되지 않음)
├── .env.example        # 환경 변수 예시
├── models/             # 데이터 모델
│   └── Reservation.js  # 예약 모델 스키마
├── views/              # EJS 템플릿 파일
│   ├── index.ejs       # 로그인 페이지
│   ├── reservation.ejs # 캘린더 및 예약 현황
│   └── new-reservation.ejs # 새 예약 생성
└── public/             # 정적 파일
    ├── css/            # 스타일시트
    └── images/         # 이미지 파일
```

## 기여 방법

1. 프로젝트를 포크합니다.
2. 새 브랜치를 만듭니다: `git checkout -b feature-name`
3. 변경사항을 커밋합니다: `git commit -m 'Add some feature'`
4. 브랜치에 푸시합니다: `git push origin feature-name`
5. Pull Request를 제출합니다.

## 라이센스

이 프로젝트는 MIT 라이센스를 따릅니다. 