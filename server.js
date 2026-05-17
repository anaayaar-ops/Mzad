import express from 'express';
import WebSocket from 'ws';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const activeBots = {};
const FIXED_OWNER_ID = 2481425; 

const numToWord = {'0':'صفر','1':'واحد','2':'اثنان','3':'ثلاثة','4':'أربعة','5':'خمسة','6':'ستة','7':'سبعة','8':'ثمانية','9':'تسعة','10':'عشرة'};
const wordToNum = {'صفر':'0','واحد':'1','اثنان':'2','ثلاثة':'3','أربعة':'4','خمسة':'5','ستة':'6','سبعة':'7','ثمانية':'8','تسعة':'9','عشرة':'10'};

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>لوحة تشغيل بوت الفعاليات</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; color: #333; padding: 20px; display: flex; flex-direction: column; align-items: center; }
                .card { background: white; padding: 25px; margin: 15px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); width: 100%; max-width: 420px; box-sizing: border-box; }
                h2 { color: #2c3e50; text-align: center; }
                h3 { margin-top: 0; color: #34495e; border-bottom: 2px solid #eee; padding-bottom: 8px; }
                label { font-weight: bold; font-size: 14px; color: #555; display: block; margin-top: 10px; }
                input { width: 100%; padding: 11px; margin: 6px 0 12px 0; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; font-size: 14px; }
                button { width: 100%; padding: 12px; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; transition: background 0.2s; }
                .btn-start { background-color: #2ecc71; color: white; }
                .btn-start:hover { background-color: #27ae60; }
                .btn-stop { background-color: #e74c3c; color: white; margin-top: 10px; }
                .btn-stop:hover { background-color: #c0392b; }
                .btn-status { background-color: #34495e; color: white; margin-top: 10px; }
                #statusResult { text-align: center; font-weight: bold; margin-top: 15px; padding: 10px; border-radius: 6px; }
                .online { color: #2ecc71; background: #e8f8f0; }
                .offline { color: #e74c3c; background: #fdeaea; }
                .connecting { color: #f39c12; background: #fef5e7; }
            </style>
        </head>
        <body>
            <h2>🤖 لوحة تحكم بوت ولف للفعاليات</h2>
            <div class="card">
                <h3>🚀 تشغيل حساب جديد</h3>
                <form action="/start-bot" method="POST">
                    <label>إيميل الحساب في ولف:</label>
                    <input type="email" name="email" placeholder="example@mail.com" required>
                    
                    <label>كلمة المرور:</label>
                    <input type="password" name="password" placeholder="••••••••" required>
                    
                    <label>رقم روم اللعب / المهام (Task Group ID):</label>
                    <input type="number" name="taskGroupId" placeholder="اكتب رقم الروم مباشرة..." required>
                    
                    <label>رقم روم الإيداع / التحالف (Deposit Group ID):</label>
                    <input type="number" name="depositGroupId" placeholder="اكتب رقم الروم مباشرة..." required>
                    
                    <label>الاسم الأول أو الكلمة المفتاحية 1:</label>
                    <input type="text" name="keyword1" placeholder="اختياري...">
                    
                    <label>الاسم الثاني أو الكلمة المفتاحية 2:</label>
                    <input type="text" name="keyword2" placeholder="اختياري...">
                    
                    <button type="submit" class="btn-start">تشغيل الحساب الفردي الآن 🚀</button>
                </form>
            </div>
            <div class="card">
                <h3>🔍 الفحص السريع والإيقاف</h3>
                <label>أدخل الإيميل المسجل للتحكم به:</label>
                <input type="email" id="controlEmail" placeholder="أدخل الإيميل هنا...">
                <button onclick="checkStatus()" class="btn-status">فحص الحالة المباشرة 🔍</button>
                <form action="/stop-bot" method="POST" onsubmit="return prepareStop()">
                    <input type="hidden" name="email" id="hiddenStopEmail">
                    <button type="submit" class="btn-stop">إيقاف الحساب وفصله تماماً 🛑</button>
                </form>
                <div id="statusResult"></div>
            </div>
            <script>
                async function checkStatus() {
                    const email = document.getElementById('controlEmail').value;
                    const resultDiv = document.getElementById('statusResult');
                    if(!email) { alert('ضع الإيميل أولاً لقراءة حالته!'); return; }
                    resultDiv.innerHTML = "جاري الفحص...";
                    try {
                        const response = await fetch('/api/status', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email })
                        });
                        const data = await response.json();
                        if(data.status === 'online') {
                            resultDiv.className = "online";
                            resultDiv.innerHTML = "البوت شغال ومتصل حالياً ✅<br><small>مراقبة: " + data.keywords.join(' - ') + "</small>";
                        } else if(data.status === 'connecting') {
                            resultDiv.className = "connecting";
                            resultDiv.innerHTML = "جاري محاولة تسجيل الدخول والربط بسيرفرات ولف... ⏳";
                        } else {
                            resultDiv.className = "offline";
                            resultDiv.innerHTML = "الحساب متوقف أو تم رفض الاتصال من ولف (تأكد من الحساب والباسوورد) ❌";
                        }
                    } catch(e) { resultDiv.innerHTML = "خطأ في الاتصال بسيرفر الاستضافة."; }
                }
                function prepareStop() {
                    const email = document.getElementById('controlEmail').value;
                    if(!email) { alert('أدخل الإيميل أولاً ليتم إيقافه!'); return false; }
                    document.getElementById('hiddenStopEmail').value = email;
                    return true;
                }
            </script>
        </body>
        </html>
    `);
});

app.post('/start-bot', async (req, res) => {
    const { email, password, taskGroupId, depositGroupId, keyword1, keyword2 } = req.body;

    if (activeBots[email]) {
        try { activeBots[email].customCleanup(); } catch(e){}
    }

    const tGroupId = parseInt(taskGroupId);
    const dGroupId = parseInt(depositGroupId);
    
    const keywords = [];
    if (keyword1 && keyword1.trim() !== "") keywords.push(keyword1.trim());
    if (keyword2 && keyword2.trim() !== "") keywords.push(keyword2.trim());
    
    const hasMyName = (text) => keywords.length === 0 || keywords.some(name => text.includes(name));

    let canOpenBoxes = true;
    let isPaused = false;
    let lastBoxCommandTime = 0;
    let lastRoutineCommandTime = 0;
    let routineIntervalId = null;
    let boxIntervalId = null;
    let messageIdCounter = 1;

    // الاتصال بسيرفر الاتصال المباشر لـ ولف
    const ws = new WebSocket('wss://v3.palringo.com:9005');
    ws.botStatus = 'connecting'; // الحالة الافتراضية

    const sendJson = (name, body) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ id: messageIdCounter++, name, body }));
        }
    };

    const sendGroupMessage = (groupId, content) => {
        sendJson('message send', { targetGroupId: groupId, mimeType: 'text/plain', body: content });
    };

    const sendRoutineCommands = () => {
        if (isPaused || ws.botStatus !== 'online') return;
        lastRoutineCommandTime = Date.now();
        sendGroupMessage(tGroupId, "!مد مهام");
        setTimeout(() => {
            if (!isPaused && ws.botStatus === 'online') {
                lastRoutineCommandTime = Date.now();
                sendGroupMessage(dGroupId, "!مد تحالف ايداع كل");
            }
        }, 3000);
    };

    ws.on('open', () => {
        // حزمة الدخول الرسمية لولف
        sendJson('security login', { 
            loginType: 'email', 
            identity: email, 
            password: password,
            onlineStatus: 1 
        });
    });

    ws.on('message', (data) => {
        try {
            const response = JSON.parse(data.toString());
            console.log("ولد رد من سيرفر ولف:", response.name, "الكود:", response.code);
            
            if (response.name === 'security login response') {
                if (response.code === 200) {
                    ws.botStatus = 'online'; // نجح الدخول
                    
                    sendJson('group subscribe', { id: tGroupId });
                    sendJson('group subscribe', { id: dGroupId });
                    
                    setTimeout(() => {
                        sendRoutineCommands();
                        routineIntervalId = setInterval(sendRoutineCommands, 63000);
                        boxIntervalId = setInterval(() => {
                            if (canOpenBoxes && !isPaused && ws.botStatus === 'online') {
                                lastBoxCommandTime = Date.now();
                                sendGroupMessage(tGroupId, "!مد صندوق فتح ");
                            }
                        }, 180000);
                    }, 2000);
                } else {
                    ws.botStatus = 'failed'; // الحساب أو الباسوورد خطأ أو محظور
                    ws.close();
                }
            }

            if (response.name === 'message notify' && ws.botStatus === 'online') {
                const msg = response.body;
                const isTargetGroup = msg.targetGroupId === tGroupId || msg.targetGroupId === dGroupId;
                if (!isTargetGroup || msg.mimeType !== 'text/plain') return;

                const content = msg.body;

                if (content.includes("تم إيقاف الأوامر الإنتاجية مؤقتًا") && hasMyName(content)) {
                    const match = content.match(/\d+/);
                    if (match) {
                        isPaused = true;
                        setTimeout(() => { isPaused = false; }, parseInt(match[0]) * 60 * 1000);
                    }
                    return;
                }

                if (content.includes("لا تملك مفاتيح!") && msg.targetGroupId === tGroupId) {
                    if (Date.now() - lastBoxCommandTime < 5000) canOpenBoxes = false;
                    return;
                }

                const isTrap = content.includes("لأنك لاعب مجتهد جدًا اليوم") || content.includes("سؤال التحقق الخاص بك هو");
                const isSafetyAlert = content.includes("يوجد سؤال تحقق نشط");

                if ((isTrap && hasMyName(content)) || isSafetyAlert || (isTrap && content.includes("سؤال التحقق"))) {
                    if (isSafetyAlert) {
                        const now = Date.now();
                        if ((now - lastRoutineCommandTime <= 1000) || (now - lastBoxCommandTime <= 1000)) {
                            sendGroupMessage(msg.targetGroupId, "!مد فحص");
                        }
                        return;
                    }

                    let answer = null;
                    if (content.includes('عضوية')) answer = String(FIXED_OWNER_ID);
                    else if (content.includes('بالكلمات') || content.includes('بالحروف')) {
                        const match = content.match(/\d+/);
                        if (match && numToWord[match[0]]) answer = numToWord[match[0]];
                    }
                    else if (content.includes('بالأرقام') || content.includes('بالارقام')) {
                        for (let word in wordToNum) { if (content.includes(word)) { answer = wordToNum[word]; break; } }
                    }
                    else if (content.includes('اكتب') && (content.includes('كلمة') || content.includes('كما هي'))) {
                        const match = content.match(/:\s*(\S+)/) || content.match(/هي\s+(\S+)/);
                        if (match) answer = match[1];
                    }
                    else if (content.includes('صح أم خطأ') || content.includes('صح أو خطأ') || content.includes('التحالف') || content.includes('الصناديق')) {
                        answer = "صح";
                    }
                    else if (content.includes('أيهما') || content.includes('ايهما')) {
                        const nums = content.match(/\d+/g);
                        if (nums && nums.length >= 2) {
                            const n1 = parseInt(nums[0]), n2 = parseInt(nums[1]);
                            answer = (content.includes('أكبر') || content.includes('اكبر')) ? Math.max(n1, n2) : Math.min(n1, n2);
                        }
                    }
                    else if (content.includes('ناتج') || content.includes('+') || content.includes('-') || content.includes('جمع') || content.includes('طرح')) {
                        const nums = content.match(/\d+/g);
                        if (nums && nums.length >= 2) {
                            const n1 = parseInt(nums[0]), n2 = parseInt(nums[1]);
                            answer = (content.includes('-') || content.includes('طرح') || content.includes('ناقص')) ? n1 - n2 : n1 + n2;
                        }
                    }

                    if (answer !== null) {
                        setTimeout(() => {
                            sendGroupMessage(msg.targetGroupId, `#${answer}`);
                            setTimeout(() => sendRoutineCommands(), 2000);
                        }, 5000);
                    }
                }
            }
        } catch (e) {}
    });

    ws.on('close', () => {
        if(ws.botStatus !== 'failed') ws.botStatus = 'offline';
    });

    ws.savedKeywords = keywords.length > 0 ? keywords : ["تلقائي / الكل"];
    ws.customCleanup = () => {
        ws.botStatus = 'offline';
        if (routineIntervalId) clearInterval(routineIntervalId);
        if (boxIntervalId) clearInterval(boxIntervalId);
        try { ws.close(); } catch(e){}
    };

    activeBots[email] = ws;

    res.send(`
        <div style="text-align:center; font-family:sans-serif; margin-top:50px; direction:rtl;">
            <h2 style="color: #f39c12;">جاري إرسال طلب الاتصال بسيرفرات ولف... ⏳</h2>
            <p>اضغط على العودة ثم قُم بعمل "فحص الحالة المباشرة" بعد 10 ثوانٍ للتأكد من نجاح الدخول الحَيّ!</p>
            <a href="/" style="padding:10px 20px; background:#007bff; color:white; text-decoration:none; border-radius:5px;">العودة للوحة التحكم</a>
        </div>
    `);
});

app.post('/stop-bot', (req, res) => {
    const { email } = req.body;
    if (activeBots[email]) {
        try { activeBots[email].customCleanup(); } catch(e){}
        delete activeBots[email];
        res.send(`
            <div style="text-align:center; font-family:sans-serif; margin-top:50px; direction:rtl;">
                <h2 style="color: #28a745;">تم إيقاف حسابك بنجاح! 🛑</h2>
                <a href="/" style="padding:10px 20px; background:#007bff; color:white; text-decoration:none; border-radius:5px;">العودة للوحة</a>
            </div>
        `);
    } else {
        res.send("الحساب متوقف بالفعل. <a href='/'>عودة</a>");
    }
});

app.post('/api/status', (req, res) => {
    const { email } = req.body;
    if (activeBots[email]) {
        res.json({ status: activeBots[email].botStatus, keywords: activeBots[email].savedKeywords });
    } else {
        res.json({ status: 'offline' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 السيرفر المحدث يعمل على منفذ ${PORT}`));
