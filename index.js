import 'dotenv/config';
import wolfjs from 'wolf.js';
const { WOLF } = wolfjs;

const settings = {
    identity: process.env.U_MAIL || 'your_email@example.com',
    secret: process.env.U_PASS || 'your_password',
    targetGroupId: 9969, 
    minuteInterval: 62 * 1000,
    boxInterval: 3 * 60 * 1000
};

const MY_INFO = {
    keyword: "فزآعنا",  // الكلمة الأساسية للتعرف عليك
    ownerId: "2481425"  // إجابة سؤال عضوية المالك
};

const service = new WOLF();

// مصفوفة تحويل الأرقام إلى كلمات لحل سؤال "اكتب الرقم بالكلمات"
const numToWordMap = {
    '0': 'صفر', '1': 'واحد', '2': 'اثنان', '3': 'ثلاثة', '4': 'أربعة', 
    '5': 'خمسة', '6': 'ستة', '7': 'سبعة', '8': 'ثمانية', '9': 'تسعة', '10': 'عشرة'
};

service.on('groupMessage', async (message) => {
    try {
        if (message.targetGroupId !== settings.targetGroupId || message.subscriberId === service.currentSubscriber.id) return;

        const content = message.body;
        if (!content.includes("لأنك لاعب مجتهد جدًا اليوم")) return;

        // الفلترة: الرد فقط إذا وجدت كلمة "فزآعنا"
        // سيتم تجاهل حساب (🐈‍⬛🌟) تلقائياً لأنه لا يحتوي على هذا النص
        if (!content.includes(MY_INFO.keyword)) {
            console.log("⏭️ تم تجاهل فخ لحساب آخر.");
            return;
        }

        console.log(`🎯 تم رصد فخ لـ (${MY_INFO.keyword})، جاري التحليل...`);
        let answer = null;

        // 1. حل سؤال الرقم بالكلمات (مثل: اكتب الرقم 9 بالكلمات)
        if (content.includes('بالكلمات') || content.includes('اكتب الرقم')) {
            const match = content.match(/\d+/);
            if (match && numToWordMap[match[0]]) {
                answer = numToWordMap[match[0]];
            }
        }
        // 2. حل سؤال عضوية المالك
        else if (content.includes('عضوية')) {
            answer = MY_INFO.ownerId;
        }
        // 3. حل أسئلة صح أم خطأ (التحالف/الصناديق)
        else if (content.includes('صح أم خطأ') || content.includes('صح أو خطأ')) {
            answer = "صح";
        }
        // 4. حل أسئلة المقارنة (أيهما أكبر/أصغر)
        else if (content.includes('أيهما') || content.includes('ايهما')) {
            const nums = content.match(/\d+/g);
            if (nums && nums.length >= 2) {
                const n1 = parseInt(nums[0]), n2 = parseInt(nums[1]);
                answer = (content.includes('أكبر') || content.includes('اكبر')) ? Math.max(n1, n2) : Math.min(n1, n2);
            }
        }

        // إرسال الرد بعد 5 ثوانٍ لضمان القبول
        if (answer !== null) {
            const finalResponse = `!${answer}`;
            setTimeout(async () => {
                await service.messaging.sendGroupMessage(settings.targetGroupId, finalResponse);
                console.log(`✅ تم الرد بنجاح بـ: ${finalResponse}`);
            }, 5000); 
        }
    } catch (err) {}
});

service.on('ready', async () => {
    console.log(`✅ البوت يعمل الآن ويراقب حساب: ${MY_INFO.keyword}`);
    try {
        await service.group.joinById(settings.targetGroupId);
        
        // جدولة المهام والإيداع كل دقيقة
        setInterval(() => {
            service.messaging.sendGroupMessage(settings.targetGroupId, "!مد مهام");
            setTimeout(() => service.messaging.sendGroupMessage(settings.targetGroupId, "!مد تحالف ايداع كل"), 3000);
        }, settings.minuteInterval);

        // جدولة فتح الصناديق كل 3 دقائق
        setInterval(() => service.messaging.sendGroupMessage(settings.targetGroupId, "!مد صندوق فتح"), settings.boxInterval);
    } catch (e) {}
});

service.login(settings.identity, settings.secret);
