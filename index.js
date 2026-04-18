import 'dotenv/config';
import wolfjs from 'wolf.js';
const { WOLF } = wolfjs;

const settings = {
    identity: process.env.U_MAIL || 'your_email@example.com',
    secret: process.env.U_PASS || 'your_password',
    taskGroupId: 224,
    depositGroupId: 224,
    minuteInterval: 303 * 1000,
    boxInterval: 3 * 60 * 1000
};

const MY_INFO = {
    keyword: "فزآعنا",  
    ownerId: "2481425",
    monitorId: 80055399 // العضوية التي ترسل رسائل الهجوم
};

let isPaused = false; 
let lastRoutineCommandTime = 0;
let lastBoxCommandTime = 0;
let canOpenBoxes = true;

const service = new WOLF();

// دالة تنفيذ أوامر الهجوم بالتسلسل وبفارق زمني
const runEmergencyProtocol = async (groupId) => {
    isPaused = true; 
    console.log("🚨 [نظام الحماية] تم رصد هجوم! جاري سحب التحالف وإعادة التأسيس...");

    const commands = [
        "!مد تحالف سحب كل",
        "!مد تحالف مغادرة",
        "!مد تحالف انشاء ٍٍِِِ",
        "!مد تحالف ايداع كل",
        "!مد تحالف سلاح شراء 5",
        "!مد تفعيل 5",
        "!مد تحالف سلاح شراء 4",
        "!مد تفعيل 4"
    ];

    for (const cmd of commands) {
        try {
            await service.messaging.sendGroupMessage(groupId, cmd);
            console.log(`📤 تم إرسال: ${cmd}`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // تأخير 2 ثانية بين كل أمر
        } catch (e) {
            console.error(`❌ خطأ في إرسال الأمر ${cmd}:`, e);
        }
    }

    isPaused = false;
    console.log("✅ [نظام الحماية] اكتملت العملية بنجاح، العودة للعمل الطبيعي.");
};

// مراقبة الرسائل الخاصة (الحدث الصحيح في wolf.js)
service.on('privateMessage', async (message) => {
    try {
        // التحقق من رقم العضوية ومن محتوى الرسالة
        if (message.subscriberId == MY_INFO.monitorId && message.body.includes("تعرضتم لهجوم")) {
            console.log("⚠️ تم استلام إشعار هجوم على الخاص من العضوية المطلوبة.");
            await runEmergencyProtocol(settings.depositGroupId);
        }
    } catch (err) {
        console.error("❌ خطأ في معالجة الرسالة الخاصة:", err);
    }
});

// دالة الأوامر التلقائية
const sendRoutineCommands = async () => {
    if (isPaused) return;
    try {
        lastRoutineCommandTime = Date.now();
        await service.messaging.sendGroupMessage(settings.taskGroupId, "!مد مهام");
        setTimeout(async () => {
            if (!isPaused) {
                lastRoutineCommandTime = Date.now(); 
                await service.messaging.sendGroupMessage(settings.depositGroupId, "!مد تحالف ايداع كل");
            }
        }, 3000);
    } catch (e) {}
};

// نظام معالجة رسائل المجموعات (الفخاخ والتحقق)
service.on('groupMessage', async (message) => {
    try {
        const isTargetGroup = message.targetGroupId === settings.taskGroupId || message.targetGroupId === settings.depositGroupId;
        if (!isTargetGroup || message.subscriberId === service.currentSubscriber.id) return;

        const content = message.body;

        // التحقق من سؤال الأمان (فحص) بحد زمن 1 ثانية كما طلبت
        if (content.includes("يوجد سؤال تحقق نشط")) {
            const now = Date.now();
            if ((now - lastRoutineCommandTime <= 1000) || (now - lastBoxCommandTime <= 1000)) {
                await service.messaging.sendGroupMessage(message.targetGroupId, "!مد فحص");
            }
            return;
        }

        // منطق حل الفخاخ (كما هو في كودك الأصلي مع استخدام # للرد)
        const isTrap = (content.includes("لأنك لاعب مجتهد") || content.includes("سؤال التحقق")) && content.includes(MY_INFO.keyword);
        
        if (isTrap) {
            let answer = null;
            // (هنا يتم وضع شروط الحل: ناتج، أكبر، أصغر، إلخ.. اختصاراً وضعتها كمنطق عام)
            // ... [نفس شروط الحل السابقة التي تعمل لديك] ...
            
            // مثال للحل:
            if (content.includes('عضوية')) answer = MY_INFO.ownerId;
            // ... بقية الشروط ...

            if (answer !== null) {
                setTimeout(async () => {
                    await service.messaging.sendGroupMessage(message.targetGroupId, `#${answer}`);
                }, 5000);
            }
        }
    } catch (err) {}
});

service.on('ready', async () => {
    console.log(`🚀 البوت متصل. مراقبة الخاص للعضوية ${MY_INFO.monitorId} مفعلة.`);
    try {
        await service.group.joinById(settings.taskGroupId);
        await service.group.joinById(settings.depositGroupId);
        
        sendRoutineCommands();
        setInterval(() => sendRoutineCommands(), settings.minuteInterval);
        
        setInterval(() => {
            if (canOpenBoxes && !isPaused) {
                lastBoxCommandTime = Date.now();
                service.messaging.sendGroupMessage(settings.taskGroupId, "!مد صندوق فتح");
            }
        }, settings.boxInterval);
    } catch (e) {}
});

service.login(settings.identity, settings.secret);
