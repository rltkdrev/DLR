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
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1일
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

// 오류 처리 미들웨어
app.use((err, req, res, next) => {
    console.error('서버 오류:', err);
    res.status(500).json({
        error: '서버 오류가 발생했습니다.',
        message: process.env.NODE_ENV === 'development' ? err.message : '관리자에게 문의하세요.'
    });
});

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
            if (password === '0527') {
                // 로그인 성공
                return done(null, {
                    id: 'teacher',
                    displayName: '교사',
                    isTeacher: true,
                    isAdmin: true,  // 관리자 권한 부여
                    emails: [{ value: 'dGVhY2hlcg==@donghwa.hs.kr' }]
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

// 예약 데이터 캐시
let reservationsCache = {
    data: null,
    lastUpdated: 0,
    ttl: 60 * 1000 // 캐시 유효시간 1분
};

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
app.post('/auth/teacher', express.json(), (req, res, next) => {
    const { password } = req.body;
    
    if (password === '0527') {
        req.user = {
            id: 'teacher',
            displayName: '교사',
            isTeacher: true,
            isAdmin: true,  // 관리자 권한 부여
            emails: [{ value: 'dGVhY2hlcg==@donghwa.hs.kr' }]
        };
        req.login(req.user, (err) => {
            if (err) {
                return next(err);
            }
            console.log('교사 로그인 성공:', req.user);
            res.json({ success: true });
        });
    } else {
        res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
    }
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
        
        // 캐시가 유효한지 확인
        const now = Date.now();
        if (reservationsCache.data && (now - reservationsCache.lastUpdated < reservationsCache.ttl)) {
            console.log('캐시된 예약 데이터 사용');
            return res.json(reservationsCache.data);
        }
        
        await connectToDatabase();
        
        // 한 달 범위의 예약만 조회하도록 필터링
        const timeMin = new Date();
        timeMin.setHours(0, 0, 0, 0);
        
        const timeMax = new Date();
        timeMax.setMonth(timeMax.getMonth() + 12);
        timeMax.setHours(23, 59, 59, 999);
        
        const reservations = await Reservation.find({
            date: {
                $gte: timeMin,
                $lte: timeMax
            }
        }).lean().sort({ date: 1, period: 1 });
        
        console.log('조회된 예약 수:', reservations.length);

        // FullCalendar 형식으로 변환
        const events = reservations.map(reservation => ({
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

        // 캐시 업데이트
        reservationsCache.data = events;
        reservationsCache.lastUpdated = now;
        
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
            userEmail: req.user.emails && req.user.emails[0] ? req.user.emails[0].value : 'unknown@donghwa.hs.kr'
        });

        console.log('저장할 예약 정보:', JSON.stringify(newReservation));
        const savedReservation = await newReservation.save();
        console.log('예약 저장 성공:', JSON.stringify(savedReservation));
        
        // 캐시 무효화
        reservationsCache.data = null;
        
        res.json(savedReservation);
    } catch (error) {
        console.error('Error creating reservation:', error);
        res.status(500).json({ 
            error: '예약 생성 중 오류가 발생했습니다.',
            details: error.message
        });
    }
});

// 여러 교시 예약 처리 라우트
app.post('/reservations/multi', isAuthenticated, async (req, res) => {
    try {
        console.log('여러 교시 예약 생성 요청:', req.body);
        await connectToDatabase();
        
        const { role, name, department, periods, date, lab } = req.body;
        
        // periods가 문자열로 전달된 경우 JSON parse
        let periodArray = periods;
        if (typeof periods === 'string') {
            try {
                periodArray = JSON.parse(periods);
            } catch (e) {
                return res.status(400).json({ error: '유효하지 않은 교시 데이터입니다.' });
            }
        }
        
        // 교시 배열 확인
        if (!Array.isArray(periodArray) || periodArray.length === 0) {
            return res.status(400).json({ error: '최소 하나 이상의 교시를 선택해야 합니다.' });
        }
        
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
        
        // 모든 선택된 교시에 대해 중복 체크
        const existingReservations = await Reservation.find({
            date: {
                $gte: startOfDay,
                $lt: endOfDay
            },
            period: { $in: periodArray },
            lab: lab
        });

        // 이미 예약된 교시들 확인
        if (existingReservations.length > 0) {
            const reservedPeriods = existingReservations.map(r => r.period);
            const reservedPeriodsStr = reservedPeriods.map(p => p === 8 ? '방과후' : `${p}교시`).join(', ');
            return res.status(400).json({ 
                error: `다음 교시는 이미 예약되어 있습니다: ${reservedPeriodsStr}` 
            });
        }

        // 각 교시별로 예약 생성
        const savedReservations = [];
        for (const period of periodArray) {
            const newReservation = new Reservation({
                date: reservationDate,
                dateString: dateString,
                period: parseInt(period),
                lab: lab || '1',
                role,
                name,
                department,
                userId: req.user.id,
                userEmail: req.user.emails && req.user.emails[0] ? req.user.emails[0].value : 'unknown@donghwa.hs.kr'
            });

            console.log(`교시 ${period} 예약 저장 중...`);
            const savedReservation = await newReservation.save();
            savedReservations.push(savedReservation);
        }
        
        // 캐시 무효화
        reservationsCache.data = null;
        
        console.log(`총 ${savedReservations.length}개의 예약이 성공적으로 저장되었습니다.`);
        res.json({ 
            success: true,
            count: savedReservations.length,
            reservations: savedReservations.map(r => r._id)
        });
    } catch (error) {
        console.error('Error creating multiple reservations:', error);
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
        console.log('찾은 예약:', JSON.stringify(reservation));
        
        // 교사 계정에게 관리자 권한 부여
        const isTeacher = req.user.isTeacher === true;
        
        // 권한 확인 (관리자 또는 교사 또는 본인 예약)
        const isAdmin = req.user.emails && req.user.emails[0] && req.user.emails[0].value === '2024257@donghwa.hs.kr';
        const isOwner = String(reservation.userId).includes(String(req.user.id));
        
        console.log('권한 확인:', { 
            isOwner, 
            isAdmin,
            isTeacher,
            reservationUserId: String(reservation.userId),
            currentUserId: String(req.user.id)
        });
        
        if (isOwner || isAdmin || isTeacher) {
            const result = await Reservation.findByIdAndDelete(objectId);
            console.log('삭제 결과:', result ? '성공' : '실패');
            
            // 캐시 무효화
            reservationsCache.data = null;
            
            res.json({ 
                success: true,
                message: '예약이 삭제되었습니다.'
            });
        } else {
            res.status(403).json({ 
                error: '예약을 삭제할 권한이 없습니다.',
                reservationUserId: String(reservation.userId),
                yourUserId: String(req.user.id)
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
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
}); 