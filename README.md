# 동화고등학교 과학실 예약 시스템

동화고등학교 구성원들이 과학실을 효율적으로 예약하고 관리할 수 있는 웹 기반 예약 시스템입니다.

## 주요 기능

- 학교 계정(@donghwa.hs.kr) 구글 로그인 통합
- 캘린더 기반 직관적인 예약 인터페이스
- 과학실 1, 2 분리 예약 관리
- 교시별 예약 시스템 (1~7교시 및 방과후)
- 사용자별 예약 조회 및 관리
- 모바일 환경 최적화 UI

## 기술 스택

- **백엔드**: Node.js, Express
- **인증**: Google OAuth 2.0
- **프론트엔드**: HTML, CSS, JavaScript, Bootstrap 5
- **캘린더**: FullCalendar 5
- **데이터 저장**: JSON 파일 기반 로컬 저장소

## 설치 방법

### 사전 요구사항

- Node.js (v14 이상)
- npm (v6 이상)

### 설치 단계

1. 저장소 클론

```bash
git clone https://github.com/your-username/reservation.git
cd reservation
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
PORT=3000
```

## Google OAuth 설정 방법

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속합니다.
2. 새 프로젝트를 생성합니다.
3. "API 및 서비스" > "사용자 인증 정보"로 이동합니다.
4. "사용자 인증 정보 만들기" > "OAuth 클라이언트 ID" 선택:
   - 애플리케이션 유형: 웹 애플리케이션
   - 이름: 동화고등학교 과학실 예약
   - 승인된 리디렉션 URI: `http://localhost:3000/auth/google/callback`
5. 생성된 클라이언트 ID와 비밀번호를 `.env` 파일에 넣습니다.

## 실행 방법

개발 모드로 실행:

```bash
npm start
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

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

- `/app.js` - 메인 애플리케이션 파일
- `/views/` - EJS 템플릿 파일들
   - `index.ejs` - 로그인 페이지
   - `reservation.ejs` - 캘린더 및 예약 현황
   - `new-reservation.ejs` - 새 예약 생성
- `/models/` - 데이터 모델
- `/data/` - 저장된 예약 데이터
- `/public/` - 정적 파일 (CSS, JS, 이미지)
- `/services/` - 서비스 레이어

## 라이센스

이 프로젝트는 MIT 라이센스를 따릅니다. 