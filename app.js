require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs').promises;
const mongoose = require('mongoose');
const Reservation = require('./models/Reservation');
const Teacher = require('./models/Teacher');

const app = express();

// JSON 파일 경로 설정
const RESERVATIONS_FILE = path.join(__dirname, 'data', 'reservations.json');

// 데이터 디렉토리 생성
async function ensureDataDirectory() {
    const dataDir = path.join(__dirname, 'data');
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir);
    }
}

// 예약 데이터 읽기
async function readReservations() {
    try {
        return await Reservation.find().lean();
    } catch (error) {
        console.error('예약 데이터 읽기 오류:', error);
        return [];
    }
}

// 예약 데이터 저장
async function saveReservations(reservations) {
    await fs.writeFile(RESERVATIONS_FILE, JSON.stringify(reservations, null, 2));
}

// 기존 예약에 과학실 필드 추가 마이그레이션
async function migrateReservationsAddLab() {
    try {
        const reservations = await readReservations();
        let needsMigration = false;
        
        for (const reservation of reservations) {
            if (!reservation.hasOwnProperty('lab')) {
                reservation.lab = '1'; // 기본값으로 과학실 1 설정
                needsMigration = true;
            }
        }
        
        if (needsMigration) {
            await saveReservations(reservations);
            console.log('예약 데이터에 과학실 필드가 추가되었습니다.');
        }
    } catch (error) {
        console.error('기존 예약 마이그레이션 중 오류가 발생했습니다:', error);
    }
}

// 서버 시작 시 마이그레이션 실행
(async () => {
    await ensureDataDirectory();
    await migrateReservationsAddLab();
})();

// 세션 설정
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

// Passport 초기화
app.use(passport.initialize());
app.use(passport.session());

// 뷰 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 정적 파일 제공
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Passport Google Strategy 설정
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL
},
async (accessToken, refreshToken, profile, done) => {
    // donghwa.hs.kr 도메인 체크
    if (!profile.emails[0].value.endsWith('@donghwa.hs.kr')) {
        return done(null, false, { message: '동화고등학교 계정만 사용 가능합니다.' });
    }
    // 관리자 권한 설정
    profile.isAdmin = profile.emails[0].value === '2024257@donghwa.hs.kr';
    return done(null, profile);
}));

// Passport Local Strategy 설정 (교사용 비밀번호 로그인)
passport.use(new LocalStrategy(
    { usernameField: 'password', passwordField: 'password' },
    async (password, done) => {
        try {
            // 하드코딩된 비밀번호 확인
            if (password === 'donghwascience') {
                // 로그인 성공
                return done(null, {
                    id: 'teacher',
                    displayName: '교사',
                    isTeacher: true,
                    emails: [{ value: 'teacher@donghwa.hs.kr' }]  // 이메일 정보 추가
                });
            }
            
            return done(null, false, { message: '비밀번호가 일치하지 않습니다.' });
        } catch (error) {
            return done(error);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

// 로그인 체크 미들웨어
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

// 라우트 설정
app.get('/', (req, res) => {
    res.render('index', { user: req.user });
});

app.get('/calendar', isAuthenticated, (req, res) => {
    res.render('reservation', { user: req.user });
});

app.get('/calendar/reservation', isAuthenticated, (req, res) => {
    res.render('new-reservation', { user: req.user, selectedDate: req.query.date });
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { 
        failureRedirect: '/?error=domain',
        failureMessage: true
    }),
    (req, res) => {
        res.redirect('/calendar');
    }
);

app.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

// 교사 로그인 라우트
app.post('/auth/teacher', passport.authenticate('local', {
    failureRedirect: '/?error=login',
    failureMessage: true
}), (req, res) => {
    console.log('교사 로그인 성공:', req.user);  // 디버깅용 로그
    res.redirect('/calendar');
});

// 교사 계정 등록 라우트 (관리자만 접근 가능)
app.post('/auth/register-teacher', isAuthenticated, async (req, res) => {
    try {
        // 관리자 권한 확인
        const isAdmin = req.user.emails && req.user.emails[0] && req.user.emails[0].value === '2024257@donghwa.hs.kr';
        if (!isAdmin) {
            return res.status(403).json({ error: '관리자만 접근 가능합니다.' });
        }
        
        const { name, email, password } = req.body;
        
        // 이메일 형식 확인
        if (!email.endsWith('@donghwa.hs.kr')) {
            return res.status(400).json({ error: '동화고등학교 이메일만 사용 가능합니다.' });
        }
        
        // 이미 등록된 이메일인지 확인
        const existingTeacher = await Teacher.findOne({ email });
        if (existingTeacher) {
            return res.status(400).json({ error: '이미 등록된 이메일입니다.' });
        }
        
        // 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 새 교사 계정 생성
        const newTeacher = new Teacher({
            name,
            email,
            password: hashedPassword
        });
        
        await newTeacher.save();
        res.json({ success: true, message: '교사 계정이 등록되었습니다.' });
    } catch (error) {
        console.error('교사 계정 등록 오류:', error);
        res.status(500).json({ error: '교사 계정 등록 중 오류가 발생했습니다.' });
    }
});

// 예약 관련 라우트
app.get('/reservations', isAuthenticated, async (req, res) => {
    try {
        console.log('예약 데이터 요청 받음');
        await connectToDatabase();
        
        const reservations = await Reservation.find().lean();
        console.log('조회된 예약 수:', reservations.length);

        const timeMin = new Date();
        const timeMax = new Date();
        timeMax.setMonth(timeMax.getMonth() + 1);

        const filteredReservations = reservations.filter(reservation => {
            const date = new Date(reservation.date);
            return date >= timeMin && date <= timeMax;
        }).sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (dateA.getTime() === dateB.getTime()) {
                return a.period - b.period;
            }
            return dateA - dateB;
        });

        console.log('필터링된 예약 수:', filteredReservations.length);

        // FullCalendar 형식으로 변환
        const events = filteredReservations.map(reservation => ({
            id: reservation._id.toString(),
            title: `[${reservation.role === 'teacher' ? '교사' : '학생'}] ${reservation.name} (${reservation.department}) [과학실 ${reservation.lab || '1'}]`,
            start: reservation.dateString || reservation.date,
            extendedProps: {
                description: `직업: ${reservation.role === 'teacher' ? '교사' : '학생'}\n이름: ${reservation.name}\n소속: ${reservation.department}\n교시: ${reservation.period}교시\n과학실: ${reservation.lab || '1'}`,
                period: reservation.period,
                userId: reservation.userId,
                lab: reservation.lab || '1'
            }
        }));

        console.log('변환된 이벤트 수:', events.length);
        res.json(events);
    } catch (error) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({ error: '예약 조회 중 오류가 발생했습니다.' });
    }
});

let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }
    try {
        const client = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000 // 타임아웃 시간 설정
        });
        cachedDb = client;
        console.log('MongoDB 연결 성공');
        return client;
    } catch (error) {
        console.error('MongoDB 연결 실패:', error.message);
        throw error;
    }
}

app.post('/reservations', isAuthenticated, async (req, res) => {
    try {
        console.log('새 예약 생성 요청:', req.body);
        await connectToDatabase();
        
        const { role, name, department, period, date, lab } = req.body;
        
        // 날짜 파싱 및 시간대 문제 해결
        const dateString = date;
        const dateParts = dateString.split('-');
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1;
        const day = parseInt(dateParts[2]);
        
        const reservationDate = new Date(year, month, day, 12, 0, 0);
        
        if (isNaN(reservationDate.getTime())) {
            return res.status(400).json({ error: '유효하지 않은 날짜입니다.' });
        }

        // 중복 예약 체크
        const startOfDay = new Date(year, month, day, 0, 0, 0);
        const endOfDay = new Date(year, month, day, 23, 59, 59);
        
        const existingReservation = await Reservation.findOne({
            date: {
                $gte: startOfDay,
                $lt: endOfDay
            },
            period: parseInt(period),
            lab: lab
        });

        if (existingReservation) {
            return res.status(400).json({ error: '해당 날짜와 교시에 선택한 과학실에 이미 예약이 있습니다.' });
        }

        // 새 예약 생성
        const newReservation = new Reservation({
            date: reservationDate,
            dateString: dateString,
            period: parseInt(period),
            lab: lab || '1',
            role,
            name,
            department,
            userId: req.user.id,
            userEmail: req.user.emails[0].value
        });

        console.log('저장할 예약 정보:', newReservation);
        const savedReservation = await newReservation.save();
        console.log('예약 저장 성공:', savedReservation);
        
        res.json(savedReservation);
    } catch (error) {
        console.error('Error creating reservation:', error);
        res.status(500).json({ 
            error: '예약 생성 중 오류가 발생했습니다.',
            details: error.message
        });
    }
});

app.delete('/reservations/:id', isAuthenticated, async (req, res) => {
    try {
        const id = req.params.id;
        console.log('삭제 요청 ID:', id);
        
        // ObjectId 변환
        let objectId;
        try {
            objectId = new mongoose.Types.ObjectId(id);
        } catch (err) {
            return res.status(400).json({ 
                error: '유효하지 않은 ID 형식입니다.', 
                details: err.message 
            });
        }
        
        // ID로 예약 찾기
        const reservation = await Reservation.findById(objectId);
        
        if (!reservation) {
            return res.status(404).json({ 
                error: '예약을 찾을 수 없습니다.',
                id: id
            });
        }
        
        // 예약 정보 로그
        console.log('찾은 예약:', {
            _id: reservation._id,
            name: reservation.name,
            date: reservation.dateString || reservation.date,
            userId: reservation.userId,
            currentUser: req.user.id
        });
        
        // 권한 확인
        // 관리자 이메일 확인
        const isAdmin = req.user.emails && req.user.emails[0] && req.user.emails[0].value === '2024257@donghwa.hs.kr';
        
        // Google OAuth ID와 저장된 userId를 정규화하여 비교
        const normalizedReservationUserId = String(reservation.userId).replace(/^"(.*)"$/, '$1');
        const normalizedCurrentUserId = String(req.user.id).replace(/^"(.*)"$/, '$1');
        const isOwner = normalizedReservationUserId === normalizedCurrentUserId;
        
        console.log('권한 확인:', { 
            isOwner, 
            isAdmin,
            normalizedReservationUserId,
            normalizedCurrentUserId,
            rawReservationUserId: String(reservation.userId),
            rawCurrentUserId: String(req.user.id)
        });
        
        if (isOwner || isAdmin) {
            const result = await Reservation.findByIdAndDelete(objectId);
            console.log('삭제 결과:', result ? '성공' : '실패');
            
            res.json({ 
                success: true,
                message: '예약이 삭제되었습니다.'
            });
        } else {
            res.status(403).json({ 
                error: '예약을 삭제할 권한이 없습니다.',
                reservationUserId: normalizedReservationUserId,
                yourUserId: normalizedCurrentUserId
            });
        }
    } catch (error) {
        console.error('Error deleting reservation:', error);
        res.status(500).json({ 
            error: '예약 삭제 중 오류가 발생했습니다.', 
            details: error.message
        });
    }
});

// 서버 시작 시 먼저 연결
connectToDatabase().catch(console.error);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 