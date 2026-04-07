import 'dotenv/config';
import wolfjs from 'wolf.js';
const { WOLF } = wolfjs;

// --- 1. الإعدادات ---
const settings = {
    identity: process.env.U_MAIL || 'your_email@example.com',
    secret: process.env.U_PASS || 'your_password',
    targetGroupId: 224, 
    minuteInterval: 62 * 1000,      // دقيقة واحدة (مهام + إيداع)
    boxInterval: 3 * 60 * 1000      // 3 دقائق (فتح صندوق)
};

const MY_INFO = {
    requiredName: "فزآعنا",        // الشرط الأساسي: يجب وجود هذا النص للرد
    ownerId: "2481425"
};

const service = new WOLF();

// --- 2. الأوامر التلقائية المجدولة ---
const sendMinuteCommands = async () => {
    try {
        await service.messaging.sendGroupMessage(settings.targetGroupId, "!مد مهام");
        setTimeout(async () => {
            await service.messaging.sendGroupMessage(settings.targetGroupId, "!مد تحالف ايداع كل");
        }, 3000);
    } catch (e) {}
};

const sendBoxCommand = async () => {
    try {
        await service.messaging.sendGroupMessage(settings.targetGroupId, "!مد صندوق فتح");
    } catch (e) {}
};

// --- 3. نظام حل الفخاخ الذكي ---
service.on('groupMessage', async (message) => {
    try {
        if (message.targetGroupId !== settings.targetGroupId || message.subscriberId === service.currentSubscriber.id) return;

        const content = message.body;
        const trapTrigger = "لأنك لاعب مجتهد جدًا اليوم";

        // أ- التأكد أن الرسالة هي "فخ"
        if (!content.includes(trapTrigger)) return;

        // ب- فلتر الاستهداف الصارم:
        // يجب أن تحتوي الرسالة على كلمة "فزآعنا" لضمان أنها لك وليس لحساب (🐈‍⬛🌟)
        const isForMe = content.includes(MY_INFO.requiredName);

        if (!isForMe) {
            console.log("⏭️ تم تجاهل الفخ لأنه يخص حساب (🐈‍⬛🌟) أو لاعب آخر.");
            return;
        }

        console.log(`🎯 فخ مكتشف لـ (فزآعنا).. جاري التحليل والرد خلال 5 ثوانٍ`);

        let answer = null;
        const numToWord = {'1':'واحد','2':'اثنان','3':'ثلاثة','4':'أربعة','5':'خمسة','6':'ستة','7':'سبعة','8':'ثمانية','9':'تسعة','10':'عشرة'};
        const wordToNum = {'واحد':'1','اثنان':'2','ثلاثة':'3','أربعة':'4','خمسة':'5','ستة':'6','سبعة':'7','ثمانية':'8','تسعة':'9','عشرة':'10'};

        // 1. أسئلة صح أم خطأ (التحالف، الصناديق)
        if (content.includes('صح أم خطأ') || content.includes('صح أو خطأ') || content.includes('التحالف') || content.includes('الصندوق')) {
            answer = "صح"; 
        } 
        // 2. المقارنة (أكبر / أصغر)
        else if (content.includes('أيهما') || content.includes('ايهما')) {
            const nums = content.match(/\d+/g);
            if (nums && nums.length >= 2) {
                const n1 = parseInt(nums[0]), n2 = parseInt(nums[1]);
                answer = (content.includes('أكبر') || content.includes('اكبر')) ? Math.max(n1, n2) : Math.min(n1, n2);
            }
        } 
        // 3. الحساب (جمع / طرح)
        else if (content.includes('ناتج') || content.includes('؟')) {
            const nums = content.match(/\d+/g);
            if (nums && nums.length >= 2) {
                const n1 = parseInt(nums[0]), n2 = parseInt(nums[1]);
                answer = (content.includes('-') || content.includes('طرح') || content.includes('ناقص')) ? n1 - n2 : n1 + n2;
            }
        }
        // 4. عضوية صاحب البوت
        else if (content.includes('صاحب البوت')) {
            answer = MY_INFO.ownerId;
        }
        // 5. تحويل الكلمات والأرقام
        else if (content.includes('بالكلمات') || content.includes('بالحروف')) {
            const match = content.match(/\d+/);
            if (match && numToWord[match[0]]) answer = numToWord[match[0]];
        }
        else if (content.includes('بالأرقام') || content.includes('بالارقام')) {
            for (let word in wordToNum) { if (content.includes(word)) { answer = wordToNum[word]; break; } }
        }
        // 6. اكتب الكلمة كما هي
        else if (content.includes('اكتب كلمة') || content.includes('كما هي')) {
            const match = content.match(/:\s*(\S+)/) || content.match(/هي\s+(\S+)/);
            if (match) answer = match[1];
        }

        // إرسال الإجابة بعد 5 ثوانٍ ثابتة
        if (answer !== null) {
            const finalResponse = `!${answer}`;
            setTimeout(async () => {
                try {
                    await service.messaging.sendGroupMessage(settings.targetGroupId, finalResponse);
                    console.log(`✅ تم الرد بنجاح على فخ فزآعنا: ${finalResponse}`);
                } catch (err) {}
            }, 5000); 
        }
    } catch (err) {}
});

// --- 4. بدء التشغيل والجدولة ---
service.on('ready', async () => {
    console.log(`✅ البوت متصل ومراقب نشط لحساب (فزآعنا)`);
    try {
        await service.group.joinById(settings.targetGroupId);
        
        sendMinuteCommands();
        sendBoxCommand();
        setInterval(sendMinuteCommands, settings.minuteInterval);
        setInterval(sendBoxCommand, settings.boxInterval);
        
    } catch (e) {}
});

service.login(settings.identity, settings.secret);
