require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const fs = require('fs').promises;
const mongoose = require('mongoose');
const Reservation = require('./models/Reservation');

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
    profile.isAdmin = profile.emails[0].value === '2024256@donghwa.hs.kr';
    return done(null, profile);
}));

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

// 예약 관련 라우트
app.get('/reservations', isAuthenticated, async (req, res) => {
    try {
        const reservations = await readReservations();
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

        // FullCalendar 형식으로 변환
        const events = filteredReservations.map(reservation => ({
            id: reservation._id.toString(), // ObjectId를 문자열로 변환
            title: `[${reservation.role === 'teacher' ? '교사' : '학생'}] ${reservation.name} (${reservation.department}) [과학실 ${reservation.lab || '1'}]`,
            start: reservation.dateString || reservation.date, // dateString이 있으면 사용
            extendedProps: {
                description: `직업: ${reservation.role === 'teacher' ? '교사' : '학생'}\n이름: ${reservation.name}\n소속: ${reservation.department}\n교시: ${reservation.period}교시\n과학실: ${reservation.lab || '1'}`,
                period: reservation.period,
                userId: reservation.userId,
                lab: reservation.lab || '1'
            }
        }));

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
        await connectToDatabase();
        
        const { role, name, department, period, date, lab } = req.body;
        
        // 날짜 파싱 및 시간대 문제 해결
        const dateString = date; // 원본 날짜 문자열 저장
        
        // 날짜 문자열로부터 로컬 날짜 생성 (시간대 조정)
        const dateParts = dateString.split('-');
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // 0-11로 표현
        const day = parseInt(dateParts[2]);
        
        // 날짜만 지정하고 시간은 정오(12:00)로 설정하여 시간대 이슈 방지
        const reservationDate = new Date(year, month, day, 12, 0, 0);
        
        if (isNaN(reservationDate.getTime())) {
            return res.status(400).json({ error: '유효하지 않은 날짜입니다.' });
        }

        // 중복 예약 체크 - 날짜 비교 방식 변경
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

        // 새 예약 생성 (날짜 필드에 로컬 날짜 문자열도 저장)
        const newReservation = new Reservation({
            date: reservationDate,
            dateString: dateString, // 원본 날짜 문자열도 함께 저장
            period: parseInt(period),
            lab: lab || '1',
            role,
            name,
            department,
            userId: req.user.id,
            userEmail: req.user.emails[0].value
        });

        const savedReservation = await newReservation.save();
        res.json(savedReservation);
    } catch (error) {
        console.error('Error creating reservation:', error);
        res.status(500).json({ 
            error: '예약 생성 중 오류가 발생했습니다.',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
        const isAdmin = req.user.emails[0].value === '2024256@donghwa.hs.kr';
        // userId 문자열로 변환하여 비교 (타입 일치 보장)
        const isOwner = String(reservation.userId) === String(req.user.id);
        
        console.log('권한 확인:', { 
            isOwner, 
            isAdmin,
            reservationUserId: String(reservation.userId),
            currentUserId: String(req.user.id)
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
    console.log(`Server is running on port ${PORT}`);
}); 