# 동화고등학교 과학실 예약 시스템

동화고등학교 구성원들이 과학실을 효율적으로 예약하고 관리할 수 있는 웹 기반 예약 시스템입니다.

## 주요 기능

- **다중 인증 방식**: 구글 계정(@donghwa.hs.kr) 로그인 및 교사용 비밀번호 로그인 지원
- **직관적인 캘린더**: 날짜별 예약 건수 한눈에 확인 가능
- **과학실 별도 관리**: 과학실 1, 2 분리 탭으로 각각 예약 현황 제공
- **교시별 예약**: 1~7교시 및 방과후 시간대별 예약 관리
- **사용자 권한 관리**: 일반 사용자, 교사, 관리자 세분화된 권한 부여
- **반응형 디자인**: 데스크탑부터 모바일까지 모든 기기에서 최적화된 UI
- **실시간 업데이트**: 페이지 전환 없이 예약 생성, 조회, 삭제 가능

## 기술 스택

- **백엔드**: Node.js v22, Express 4.18
- **인증**: Google OAuth 2.0, Passport.js, bcrypt
- **프론트엔드**: HTML5, CSS3, JavaScript ES6, Bootstrap 5.1
- **캘린더**: FullCalendar 5.10
- **데이터베이스**: MongoDB Atlas (MongoDB 6.x)
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

## 인증 시스템

### 구글 OAuth 설정 방법

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

### 교사용 로그인 설정

- 기본 교사용 비밀번호는 `donghwascience`로 설정되어 있습니다.
- 보안을 위해 실제 운영 환경에서는 이 비밀번호를 변경하는 것을 권장합니다.
- 비밀번호 변경 방법: `app.js` 파일에서 교사 로그인 라우트 부분을 수정합니다.

```javascript
// 교사 로그인 라우트 (app.js 내)
if (password === 'your_new_password') {
    // 로그인 로직
}
```

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

## 사용자 매뉴얼

### 로그인 방법
1. **구글 로그인**:
   - 초기 화면에서 "구글로 로그인" 버튼 클릭
   - @donghwa.hs.kr 계정으로만 로그인 가능
   
2. **교사용 로그인**:
   - "교사용 로그인" 버튼 아래 비밀번호 입력 필드에 비밀번호 입력
   - 비밀번호 표시/숨기기 버튼으로 입력 확인 가능
   - 로그인 버튼 클릭

### 예약 확인 방법
1. 로그인 후 캘린더 화면으로 자동 이동
2. 캘린더에서 각 날짜별 예약 건수 확인 가능
3. 예약이 있는 날짜에는 "예약: N건" 형태로 표시
4. 과학실 1과 과학실 2의 예약 건수가 각각 표시됨

### 상세 예약 보기
1. 예약 정보를 확인하려는 날짜 클릭
2. 오른쪽 패널에 해당 날짜의 모든 예약이 탭으로 구분되어 표시
3. "과학실 1" 탭과 "과학실 2" 탭으로 나누어 예약 확인 가능

### 예약 방법
1. 원하는 날짜 클릭
2. 오른쪽 패널 하단의 "예약" 버튼 클릭
3. 예약 정보 입력:
   - 직업(교사/학생) 선택
   - 이름 입력
   - 소속(학년/반) 입력
   - 과학실 선택(1 또는 2)
   - 교시 선택(1~7교시 또는 방과후)
4. "예약하기" 버튼 클릭

### 예약 삭제
1. 캘린더에서 예약이 있는 날짜 클릭
2. 오른쪽 예약 목록에서 삭제하려는 예약의 "삭제" 버튼 클릭
3. 확인 창에서 "확인" 선택

### 권한 정보
- **일반 사용자**: 자신의 예약만 보고 관리
- **교사**: 모든 예약 보기 및 삭제 가능
- **관리자**: 모든 예약 관리 및 시스템 설정 가능

## 시스템 아키텍처

```
클라이언트 <-> Express 서버 <-> MongoDB
    |            |
    |            |--- 인증 (Google OAuth, Local)
    |            |--- 세션 관리
    |            |--- 예약 처리
    |
    |--- HTML/CSS/JS
    |--- FullCalendar
    |--- Bootstrap
```

## 데이터 모델

### 예약 (Reservation)
```javascript
{
  date: Date,          // 예약 날짜
  dateString: String,  // 예약 날짜 문자열 형식
  period: Number,      // 교시 (1-7, 8=방과후)
  lab: String,         // 과학실 번호 ('1' 또는 '2')
  role: String,        // 역할 ('teacher' 또는 'student')
  name: String,        // 예약자 이름
  department: String,  // 소속 (학년/반 등)
  userId: String,      // 사용자 ID
  userEmail: String,   // 사용자 이메일
  createdAt: Date      // 생성 시간
}
```

### 교사 (Teacher)
```javascript
{
  name: String,       // 교사 이름
  email: String,      // 교사 이메일 (@donghwa.hs.kr로 끝나야 함)
  password: String,   // 암호화된 비밀번호
  createdAt: Date     // 계정 생성 시간
}
```

## 문제 해결 가이드

### 로그인 문제
- **구글 로그인 실패**: 계정이 @donghwa.hs.kr 도메인인지 확인
- **교사 로그인 실패**: 비밀번호가 정확한지 확인

### 예약 문제
- **예약 생성 안 됨**: 네트워크 연결 및 선택한 시간대에 이미 예약이 있는지 확인
- **예약 표시 안 됨**: 페이지 새로고침 또는 날짜 재선택 시도

### 캘린더 문제
- **예약 수 중복 표시**: 페이지 새로고침
- **이벤트 로딩 느림**: 네트워크 연결 상태 확인

## 업데이트 내역

### v1.0.0 (2023-09-01)
- 최초 릴리스
- 구글 로그인 기능
- 기본 예약 시스템

### v1.1.0 (2024-06-01) - 현재 버전
- 교사용 비밀번호 로그인 추가
- 과학실 1, 2 구분 기능 추가
- 모바일 UI 최적화
- 성능 개선을 위한 날짜별 예약 수 표시 방식 변경

## 기여 방법

1. 프로젝트를 포크합니다.
2. 새 브랜치를 만듭니다: `git checkout -b feature-name`
3. 변경사항을 커밋합니다: `git commit -m 'Add some feature'`
4. 브랜치에 푸시합니다: `git push origin feature-name`
5. Pull Request를 제출합니다.

## 라이센스

이 프로젝트는 MIT 라이센스를 따릅니다.

## 개발자 정보

- 개발: 동화고등학교 과학부
- 문의: 관리자 이메일 (2024257@donghwa.hs.kr)
- 최종 업데이트: 2024년 6월 