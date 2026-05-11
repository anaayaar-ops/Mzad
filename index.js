import 'dotenv/config';
import wolfjs from 'wolf.js';
import Tesseract from 'tesseract.js'; // مكتبة قراءة الصور
const { WOLF } = wolfjs;

const settings = {
    identity: process.env.U_MAIL || 'your_email@example.com',
    secret: process.env.U_PASS || 'your_password',
    targetGroupId: 9969, // مجموعة المزاد
    bidAmount: 5 // قيمة الزيادة
};

const service = new WOLF();
let lastAuctionRequestTime = 0;

// --- [دالة تحليل الصورة واستخرا الوقت] ---
const getShortestTimeFromImage = async (imageUrl) => {
    try {
        const { data: { text } } = await Tesseract.recognize(imageUrl, 'ara');
        
        // البحث عن الأوقات بصيغة (د ث) في النص المستخرج
        // التعبير النمطي يبحث عن رقم يليه 'د' ثم رقم يليه 'ث'
        const timePattern = /(\d+)\s*د\s*(\d+)\s*ث/g;
        let match;
        let shortestSeconds = Infinity;

        while ((match = timePattern.exec(text)) !== null) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const totalSeconds = (minutes * 60) + seconds;

            if (totalSeconds < shortestSeconds) {
                shortestSeconds = totalSeconds;
            }
        }
        return shortestSeconds === Infinity ? null : shortestSeconds;
    } catch (error) {
        console.error("خطأ في تحليل الصورة:", error);
        return null;
    }
};

// --- [إرسال أمر المزاد] ---
const requestAuctionStatus = async () => {
    lastAuctionRequestTime = Date.now(); // تسجيل وقت إرسال الأمر بدقة
    await service.messaging.sendGroupMessage(settings.targetGroupId, "!مد مزاد");
    console.log("تم طلب قائمة المزادات...");
};

// --- [معالجة الرسائل المستلمة] ---
service.on('groupMessage', async (message) => {
    try {
        if (message.targetGroupId !== settings.targetGroupId) return;

        // التحقق مما إذا كانت الرسالة تحتوي على صورة (المزاد)
        if (message.isImage) {
            console.log("وصلت صورة المزاد، جاري التحليل...");
            
            // استخراج رابط الصورة
            const imageUrl = `https://pstatic.wolf.com/image/${message.body}`;
            
            const remainingSeconds = await getShortestTimeFromImage(imageUrl);

            if (remainingSeconds !== null) {
                const timePassedSinceRequest = (Date.now() - lastAuctionRequestTime) / 1000;
                const actualRemainingTime = remainingSeconds - timePassedSinceRequest;

                console.log(`أقصر وقت مكتوب: ${remainingSeconds}ث`);
                console.log(`الوقت الفعلي المتبقي (بعد خصم تأخير الصورة): ${actualRemainingTime.toFixed(2)}ث`);

                // حساب وقت الإرسال: (الوقت المتبقي - 2 ثانية)
                const waitTime = (actualRemainingTime - 2) * 1000;

                if (waitTime > 0) {
                    console.log(`سيتم المزايدة بعد ${ (waitTime / 1000).toFixed(2) } ثانية...`);
                    
                    setTimeout(async () => {
                        await service.messaging.sendGroupMessage(settings.targetGroupId, `!مد مزاد اضافة ${settings.bidAmount}`);
                        console.log("🚀 تم إرسال أمر المزايدة!");
                        
                        // العودة لطلب المزاد مرة أخرى بعد المزايدة بـ 5 ثواني للتأكد
                        setTimeout(() => requestAuctionStatus(), 5000);
                    }, waitTime);
                } else {
                    console.log("المزاد قارب على الانتهاء جداً! إرسال المزايدة فوراً...");
                    await service.messaging.sendGroupMessage(settings.targetGroupId, `!مد مزاد اضافة ${settings.bidAmount}`);
                }
            }
        }
    } catch (err) {
        console.error("خطأ في المعالجة:", err);
    }
});

service.on('ready', async () => {
    console.log(`🚀 بوت قناص المزادات جاهز`);
    try {
        await service.group.joinById(settings.targetGroupId);
        // ابدأ بطلب المزاد لأول مرة
        requestAuctionStatus();
    } catch (e) {}
});

service.login(settings.identity, settings.secret);
