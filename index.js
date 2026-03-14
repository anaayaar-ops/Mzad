process.env.WOLF_JS_IGNORE_VOICE = 'true'; 

import 'dotenv/config';
import wolfjs from 'wolf.js';

const { WOLF } = wolfjs;

const settings = {
    identity: process.env.U_MAIL, // إيميل الحساب الثاني هنا
    secret: process.env.U_PASS,   // كلمة مرور الحساب الثاني هنا
    targetBotId: 82727814,        // بوت الألعاب
    mainAccountId: 80055399,      // رقم حسابك الأساسي الذي تريده أن يفوز
    moves: ["1", "3", "7"],       // الأرقام التي سيختارها هذا البوت ليخسر
    currentIndex: 0,
    // إعدادات التوقيت (نفس نظام الحساب الأول للتزامن)
    isRunning: true,
    workDuration: 52 * 60 * 1000, 
    restDuration: 8 * 60 * 1000   
};

const service = new WOLF();

// إدارة دورة العمل والراحة
const manageWorkCycle = () => {
    if (settings.isRunning) {
        setTimeout(() => {
            settings.isRunning = false;
            console.log("⏸️ فترة راحة للحساب المساعد (8 دقائق)...");
            manageWorkCycle();
        }, settings.workDuration);
    } else {
        setTimeout(() => {
            settings.isRunning = true;
            console.log("🚀 العودة للعمل للحساب المساعد...");
            manageWorkCycle();
        }, settings.restDuration);
    }
};

service.on('ready', () => {
    console.log(`✅ بوت المساعدة جاهز: ${service.currentSubscriber.nickname}`);
    console.log("🛠️ مهمته: قبول تحدي الحساب الأساسي والاختيار من (1-3-7)");
    manageWorkCycle();
});

service.on('privateMessage', async (message) => {
    if (!settings.isRunning) return;
    if (message.sourceSubscriberId !== settings.targetBotId) return;

    const text = (message.body || "").toLowerCase();

    // 1. قبول التحدي إذا كان مرسلاً من حسابك الأساسي
    if (text.includes("would like to play") && text.includes(settings.mainAccountId.toString())) {
        console.log("📥 رصدت طلب تحدي من الحساب الأساسي. جاري القبول...");
        setTimeout(async () => {
            await service.messaging.sendPrivateMessage(settings.targetBotId, "Accept");
        }, 1000);
        return;
    }

    // 2. رصد انتهاء اللعبة لإعادة التسلسل (عندما يخسر هذا الحساب)
    if (text.includes("lost") || text.includes("won") || text.includes("draw") || text.includes("انتهت")) {
        console.log("🏁 انتهت الجولة. بانتظار التحدي القادم...");
        settings.currentIndex = 0;
        return;
    }

    // 3. رصد الدور (Your Turn) للعب الحركات التي تضمن الخسارة
    const isMyTurn = text.includes("your turn") || (text.includes("دورك") && !text.includes("opponent"));

    if (isMyTurn) {
        const nextMove = settings.moves[settings.currentIndex];

        setTimeout(async () => {
            if (settings.isRunning) {
                try {
                    await service.messaging.sendPrivateMessage(settings.targetBotId, nextMove);
                    console.log(`🕹️ لعبت الرقم (للمساعدة): ${nextMove}`);
                    settings.currentIndex = (settings.currentIndex + 1) % settings.moves.length;
                } catch (err) {
                    console.error("❌ فشل إرسال الحركة:", err.message);
                }
            }
        }, 1500);
    }
});

service.login(settings.identity, settings.secret);
