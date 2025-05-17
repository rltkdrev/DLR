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
    profile.isAdmin = profile.emails[0].value === '2024257@donghwa.hs.kr';
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
            id: reservation.id,
            title: `[${reservation.role === 'teacher' ? '교사' : '학생'}] ${reservation.name} (${reservation.department}) [과학실 ${reservation.lab || '1'}]`,
            start: reservation.date,
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

app.post('/reservations', isAuthenticated, async (req, res) => {
    try {
        const { role, name, department, period, date, lab } = req.body;
        
        // 날짜 파싱 및 유효성 검사
        const reservationDate = new Date(date);
        if (isNaN(reservationDate.getTime())) {
            return res.status(400).json({ error: '유효하지 않은 날짜입니다.' });
        }

        // 중복 예약 체크
        const existingReservation = await Reservation.findOne({
            date: {
                $gte: new Date(reservationDate.setHours(0,0,0,0)),
                $lt: new Date(reservationDate.setHours(23,59,59,999))
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
            details: error.message 
        });
    }
});

app.delete('/reservations/:id', isAuthenticated, async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id);
        
        if (!reservation) {
            return res.status(404).json({ error: '예약을 찾을 수 없습니다.' });
        }

        // 본인 예약이거나 관리자인 경우에만 삭제 가능
        if (reservation.userId === req.user.id || req.user.isAdmin) {
            await Reservation.findByIdAndDelete(req.params.id);
            res.json({ message: '예약이 삭제되었습니다.' });
        } else {
            res.status(403).json({ error: '예약을 삭제할 권한이 없습니다.' });
        }
    } catch (error) {
        console.error('Error deleting reservation:', error);
        res.status(500).json({ error: '예약 삭제 중 오류가 발생했습니다.' });
    }
});

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB 연결 성공'))
    .catch(err => console.error('MongoDB 연결 실패:', err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 