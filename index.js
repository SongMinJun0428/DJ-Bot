const { Client, GatewayIntentBits, Events } = require('discord.js');
const express = require('express');
require('dotenv').config();

// 1. Render Health Check Server
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Login Test Running...'));
app.listen(port, () => {
    console.log(`✅ [SYSTEM] Health check server is running on port ${port}`);
    console.log(`✅ [SYSTEM] 새 코드가 정상적으로 적용되었습니다.`);
});

// 2. Discord Client Setup
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 3. Robust Logging for Debugging
client.on('debug', m => {
    if (m.includes('Connecting') || m.includes('Ready') || m.includes('Heartbeat')) {
        console.log('🔍 [DEBUG]', m);
    }
});
client.on('warn', m => console.log('⚠️ [WARN]', m));
client.on('error', m => console.log('❌ [ERROR]', m));

client.once(Events.ClientReady, c => {
    console.log(`✅ [SUCCESS] 봇 접속 완료! 이름: ${c.user.tag}`);
    console.log('--- 봇이 온라인입니다. 이제 /setup 명령어를 테스트해 보세요. ---');
});

// 4. Execution
console.log('⏳ [STEP] 디스코드 로그인 시도 중...');

if (!process.env.DISCORD_BOT_TOKEN) {
    console.error('❌ [CRITICAL] DISCORD_BOT_TOKEN이 환경 변수(Render)에 설정되지 않았습니다!');
}

client.login(process.env.DISCORD_BOT_TOKEN).catch(err => {
    console.error('❌ [LOGIN FAILED] 로그인에 실패했습니다. 다음을 확인하세요:');
    console.error('1. 봇 토큰(Token)이 정확한가? (Reset Token 권장)');
    console.error('2. 인텐트(Intents) 3개가 켜져 있고 저장되었는가?');
    console.error('--- 상세 에러 내용 ---');
    console.error(err);
});
