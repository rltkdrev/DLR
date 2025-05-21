# 동화고등학교 과학실 예약 시스템

동화고등학교 과학실 예약 시스템은 학교 내 과학실 사용을 효율적으로 관리하기 위한 웹 기반 애플리케이션입니다. 
교사와 학생들이 날짜와 교시를 선택하여 과학실을 예약하고, 예약 현황을 캘린더 형태로 확인할 수 있습니다.

## 주요 기능

- **사용자 인증**: Google 계정(동화고등학교 도메인)과 교사용 비밀번호 로그인
- **과학실 예약**: 날짜 및 교시 선택을 통한 과학실 예약
- **복수 교시 예약**: 한 번에 여러 교시 선택 가능
- **예약 현황 확인**: 캘린더와 목록 형태로 예약 현황 확인
- **예약 관리**: 본인 예약 취소 및 관리자/교사의 예약 관리

## 시스템 구성

### 기술 스택

- **프론트엔드**: HTML, CSS, JavaScript, Bootstrap 5, FullCalendar
- **백엔드**: Node.js, Express.js
- **데이터베이스**: MongoDB
- **인증**: Passport.js (Google OAuth, Local Strategy)

### 주요 파일 구조

```
reservation/
│
├── app.js                 - 메인 애플리케이션 파일
├── models/                - 데이터 모델
│   ├── Reservation.js     - 예약 정보 스키마
│   └── Teacher.js         - 교사 계정 스키마
│
├── views/                 - EJS 템플릿
│   ├── index.ejs          - 메인 페이지
│   ├── reservation.ejs    - 예약 현황 페이지
│   └── new-reservation.ejs - 새 예약 생성 페이지
│
├── public/                - 정적 파일
│   └── css/               - 스타일시트
│       └── style.css      - 기본 스타일
│
└── data/                  - 데이터 저장소
    └── reservations.json  - 예약 데이터 백업
```

## 설치 방법

1. 저장소 클론
   ```
   git clone https://github.com/yourusername/reservation.git
   cd reservation
   ```

2. 의존성 설치
   ```
   npm install
   ```

3. 환경 설정
   `.env` 파일 생성:
   ```
   MONGODB_URI=mongodb://localhost:27017/reservation
   SESSION_SECRET=your-secret-key
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   CALLBACK_URL=http://localhost:3000/auth/google/callback
   ```

4. 서버 실행
   ```
   npm start
   ```

5. 브라우저에서 접속
   ```
   http://localhost:3000
   ```

## 사용 방법

### 로그인

- **Google 계정**: 동화고등학교 도메인(@donghwa.hs.kr)을 가진 계정으로 로그인
- **교사 계정**: 지정된 비밀번호로 교사 로그인

### 예약 생성

1. 캘린더 페이지에서 원하는 날짜 선택
2. 예약 정보 입력 (이름, 소속, 직업)
3. 과학실 선택 (과학실 1 또는 과학실 2)
4. 원하는 교시 선택 (복수 선택 가능)
5. '예약하기' 버튼 클릭

### 예약 확인 및 관리

- 캘린더에서 모든 예약 현황 확인
- 날짜를 클릭하여 해당 날짜의 과학실별 예약 목록 확인
- 본인 예약 또는 관리자/교사 권한으로 예약 삭제 가능

## 성능 최적화

- **데이터 캐싱**: 서버 및 클라이언트에서 예약 데이터 캐싱
- **이벤트 위임**: DOM 이벤트 처리 최적화
- **반응형 디자인**: 다양한 화면 크기에 최적화된 UI
- **사용자 경험 개선**: 로딩 인디케이터, 애니메이션 효과 등

## 보안 기능

- **인증 및 권한 관리**: 사용자 역할 기반 접근 제어
- **입력값 검증**: 클라이언트 및 서버 측 데이터 유효성 검사
- **세션 관리**: 안전한 세션 처리 및 만료 설정

## 관리자 기능

- 모든 예약 관리 (조회, 삭제)
- 교사 계정 관리

## 라이센스

이 프로젝트는 MIT 라이센스를 따릅니다. 자세한 내용은 LICENSE 파일을 참조하세요.

## 문의 및 지원

- 개발: 동화고등학교 송현우
- 문의: 관리자 이메일 (2024257@donghwa.hs.kr,ghidrarev@gmail.com)
- 최종 업데이트: 2025년 5월 20일