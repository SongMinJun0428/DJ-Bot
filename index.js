const { Client, GatewayIntentBits, Events } = require('discord.js');
const express = require('express');
require('dotenv').config();

// 1. Render Health Check Server
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('디버깅 중... 로그를 확인해 주세요.'));
app.listen(port, () => {
    console.log(`✅ [SYSTEM] Health check server is running on port ${port}`);
    console.log(`✅ [SYSTEM] 코드가 적용되었습니다. 현재 시각: ${new Date().toISOString()}`);
});

// 2. Discord Client Setup
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// 3. Ultra-Verbose Logging
client.on('debug', m => console.log('🔍 [DEBUG]', m));
client.on('warn', m => console.log('⚠️ [WARN]', m));
client.on('error', m => console.log('❌ [ERROR]', m));

client.once(Events.ClientReady, c => {
    console.log(`✅ [SUCCESS] 접속 성공! 봇: ${c.user.tag}`);
});

// 4. Execution with Timeout
console.log('⏳ [STEP] 디스코드 로그인 준비 중...');

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
    console.error('❌ [CRITICAL] DISCORD_BOT_TOKEN이 없습니다! Render 설정을 확인하세요.');
} else {
    console.log(`📡 [STEP] 토큰 길이 추출: ${token.length}자 (앞 5자: ${token.substring(0, 5)}...)`);
    
    // 로그인이 너무 오래 걸릴 경우 강제 에러 출력
    const timer = setTimeout(() => {
        console.log('💡 [HINT] 로그인 시도가 30초 넘게 응답이 없습니다. 토큰이나 인텐트 설정을 다시 확인해 보세요.');
    }, 30000);

    client.login(token).then(() => {
        clearTimeout(timer);
    }).catch(err => {
        clearTimeout(timer);
        console.error('❌ [LOGIN FAILED] 상세 에러:');
        console.error(err);
    });
}
