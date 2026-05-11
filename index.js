import 'dotenv/config';
import wolfjs from 'wolf.js';
import Tesseract from 'tesseract.js';
const { WOLF } = wolfjs;

const settings = {
    identity: process.env.U_MAIL || 'your_email@example.com',
    secret: process.env.U_PASS || 'your_password',
    targetGroupId: 224, 
    bidAmount: 5 
};

const service = new WOLF();
let lastAuctionRequestTime = 0;

// --- [دالة تحليل الصورة] ---
const getShortestTimeFromImage = async (imageUrl) => {
    try {
        console.log(`🔍 جاري معالجة الصورة: ${imageUrl}`);
        // استخدمنا 'eng+ara' لضمان قراءة الأرقام والحروف العربية معاً
        const { data: { text } } = await Tesseract.recognize(imageUrl, 'ara', {
            logger: m => { if(m.status === 'recognizing text') console.log(`⏳ تقدم القراءة: ${(m.progress * 100).toFixed(0)}%`); }
        });
        
        console.log("📝 النص المستخرج من الصورة:", text.replace(/\n/g, ' | '));

        // تعبير نمطي أكثر مرونة لجلب الوقت
        const timePattern = /(\d+)\s*[دd]\s*(\d+)\s*[ثs]/gi;
        let match;
        let shortestSeconds = Infinity;

        while ((match = timePattern.exec(text)) !== null) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const totalSeconds = (minutes * 60) + seconds;
            if (totalSeconds < shortestSeconds) shortestSeconds = totalSeconds;
        }
        return shortestSeconds === Infinity ? null : shortestSeconds;
    } catch (error) {
        console.error("❌ خطأ أثناء تحليل OCR:", error);
        return null;
    }
};

const requestAuctionStatus = async () => {
    lastAuctionRequestTime = Date.now();
    await service.messaging.sendGroupMessage(settings.targetGroupId, "!مد مزاد");
    console.log("📡 تم إرسال أمر (!مد مزاد)");
};

service.on('groupMessage', async (message) => {
    try {
        if (message.targetGroupId !== settings.targetGroupId) return;

        // سجل لمعرفة نوع كل رسالة تصل
        console.log(`📩 رسالة جديدة من [${message.sourceSubscriberId}] - النوع: ${message.mimeType || 'text'}`);

        // التحقق من أن الرسالة صورة (دعم أنواع متعددة من الميمز)
        const isImage = message.isImage || (message.mimeType && message.mimeType.includes('image'));
        
        if (isImage) {
            console.log("🖼️ تم رصد صورة! جاري التحقق من محتواها...");
            
            const imageId = message.body;
            const imageUrl = `https://pstatic.wolf.com/image/${imageId}`;
            
            const remainingSeconds = await getShortestTimeFromImage(imageUrl);

            if (remainingSeconds !== null) {
                const timePassedSinceRequest = (Date.now() - lastAuctionRequestTime) / 1000;
                const actualRemainingTime = remainingSeconds - timePassedSinceRequest;

                console.log(`⏱️ وقت المزاد الأصلي: ${remainingSeconds}ث | الفعلي الآن: ${actualRemainingTime.toFixed(1)}ث`);

                const waitTime = (actualRemainingTime - 2.5) * 1000; // تركنا 2.5 ثانية للأمان

                if (waitTime > 0) {
                    console.log(`⏲️ المزايدة ستبدأ بعد ${(waitTime / 1000).toFixed(1)} ثانية...`);
                    setTimeout(async () => {
                        await service.messaging.sendGroupMessage(settings.targetGroupId, `!مد مزاد اضافة ${settings.bidAmount}`);
                        console.log("💥 بوووم! تم إرسال المزايدة.");
                    }, waitTime);
                } else {
                    console.log("⚠️ الوقت ضيق جداً! مزايدة فورية!");
                    await service.messaging.sendGroupMessage(settings.targetGroupId, `!مد مزاد اضافة ${settings.bidAmount}`);
                }
            } else {
                console.log("❓ لم يتم العثور على توقيت مزاد في هذه الصورة.");
            }
        }
    } catch (err) {
        console.error("❌ خطأ في معالجة الرسالة:", err);
    }
});

service.on('ready', async () => {
    console.log(`🚀 بوت المزاد جاهز وشغال`);
    try {
        await service.group.joinById(settings.targetGroupId);
        requestAuctionStatus();
    } catch (e) {}
});

service.login(settings.identity, settings.secret);
