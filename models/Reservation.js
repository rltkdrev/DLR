const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    dateString: {
        type: String,
        required: true
    },
    period: {
        type: Number,
        required: true,
        min: 1,
        max: 8
    },
    lab: {
        type: String,
        required: true,
        enum: ['1', '2'],
        default: '1'
    },
    role: {
        type: String,
        required: true,
        enum: ['teacher', 'student']
    },
    name: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    userEmail: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// 복합 인덱스 생성 (같은 날짜, 같은 교시, 같은 과학실에 중복 예약 방지)
reservationSchema.index({ date: 1, period: 1, lab: 1 }, { unique: true });

module.exports = mongoose.model('Reservation', reservationSchema); 