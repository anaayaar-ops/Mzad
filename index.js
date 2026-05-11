import 'dotenv/config';
import wolfjs from 'wolf.js';
const { WOLF } = wolfjs;

const settings = {
    identity: process.env.U_MAIL || 'your_email@example.com',
    secret: process.env.U_PASS || 'your_password',
    targetGroupId: 9969// رقم المجموعة التي ستراقبها
};

const service = new WOLF();

let intervalId = null; // لتخزين العداد
let startTime = null;  // وقت البداية

// دالة لبدء العداد وإظهاره في GitHub
const startTimer = () => {
    // إذا كان هناك عداد يعمل، نقوم بإيقافه أولاً
    if (intervalId) {
        clearInterval(intervalId);
        console.log(`\n🔄 تم إعادة ضبط العداد...`);
    }

    startTime = Date.now();
    
    console.log(`\n⏱️ بدأ الحساب الآن: [${new Date().toLocaleTimeString()}]`);

    intervalId = setInterval(() => {
        const currentTime = Date.now();
        const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
        
        // حساب الدقائق والثواني
        const mins = Math.floor(elapsedSeconds / 60);
        const secs = elapsedSeconds % 60;

        // طباعة الوقت في واجهة GitHub Actions
        // سيظهر السطر بشكل متكرر: "الوقت المنقضي: 01:15"
        const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        console.log(`⏳ الوقت منذ إرسال الأمر: ${formattedTime} (${elapsedSeconds} ثانية)`);

    }, 1000); // تحديث كل ثانية واحدة
};

service.on('groupMessage', async (message) => {
    try {
        // نتحقق من رقم المجموعة والنص المطلوب بالضبط
        if (message.targetGroupId === settings.targetGroupId && message.body.trim() === '!مد مزاد') {
            startTimer();
        }
    } catch (err) {
        console.error("❌ خطأ:", err);
    }
});

service.on('ready', async () => {
    console.log(`
    ======================================
    🚀 بوت مراقب وقت المزاد جاهز!
    --------------------------------------
    بمجرد إرسال [ !مد مزاد ] في المجموعة
    سيبدأ العداد في واجهة GitHub Actions بالعد.
    عند إرسال الأمر مرة أخرى، سيبدأ من الصفر.
    ======================================
    `);
    try {
        await service.group.joinById(settings.targetGroupId);
    } catch (e) {}
});

service.login(settings.identity, settings.secret);
