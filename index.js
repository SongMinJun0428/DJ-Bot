require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events, REST, Routes } = require('discord.js');
const MusicManager = require('./music/manager');
const setupCommand = require('./commands/setup');
const { handlePlay, updatePanel } = require('./commands/music');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('DJ Bot is Online!');
});

app.listen(port, () => {
    console.log(`✅ Server is running on port ${port}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Detailed connection logging
client.on('debug', m => {
    if (m.includes('Connecting') || m.includes('Ready') || m.includes('Heartbeat')) {
        console.log('🔍 [DEBUG]', m);
    }
});
client.on('warn', m => console.log('⚠️ [WARN]', m));
client.on(Events.Error, error => {
    console.error('❌ [ERROR] Discord Client Error:', error);
});

client.commands = new Collection();
client.commands.set(setupCommand.name, setupCommand);

const musicManager = new MusicManager(client);

client.once(Events.ClientReady, async () => {
    console.log(`✅ [SUCCESS] Logged in as ${client.user.tag}`);

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    const commands = [
        { name: 'setup', description: '음악 채널 및 제어판을 초기화합니다.' },
        { 
            name: 'play', 
            description: '음악 재생', 
            options: [{ name: 'input', type: 3, description: '검색어/URL', required: true }] 
        },
        { name: 'skip', description: '현재 곡을 건너뜜' },
        { name: 'stop', description: '음악 정지 및 대기열 비움' },
        { name: 'pause', description: '음악 일시정지' },
        { name: 'resume', description: '음악 다시 재생' },
        { name: 'nowplaying', description: '현재 재생 중인 곡 정보' },
        { name: 'panelrefresh', description: '제어판 메시지를 새로 고침' },
        { name: 'disconnect', description: '음성 채널 퇴장' },
        { name: 'queue', description: '대기열 확인' }
    ];

    try {
        console.log('⏳ Registering slash commands...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Commands registered successfully.');
    } catch (error) {
        console.error('❌ [ERROR] Slash commands registration failed:', error);
    }
});

client.on(Events.InteractionCreate, async i => {
    try {
        const player = musicManager.getPlayer(i.guild.id);
        if (i.isChatInputCommand()) {
            if (i.commandName === 'setup') await setupCommand.execute(i);
            else if (i.commandName === 'play') await handlePlay(i, player);
            else {
                if (i.commandName === 'skip') player.skip();
                else if (i.commandName === 'stop') player.stop();
                else if (i.commandName === 'pause') player.pause();
                else if (i.commandName === 'resume') player.resume();
                else if (i.commandName === 'disconnect') musicManager.removePlayer(i.guild.id);
                
                if (!i.replied && !i.deferred) await i.reply({ content: '✅ 처리되었습니다.', ephemeral: true });
                await updatePanel(i.guild.id, player, client);
            }
        }
        if (i.isButton()) {
            if (i.customId === 'music_pause_resume') {
                if (player.player.state.status === 'paused') player.resume();
                else player.pause();
            } else if (i.customId === 'music_skip') player.skip();
            else if (i.customId === 'music_stop') player.stop();
            else if (i.customId === 'music_disconnect') musicManager.removePlayer(i.guild.id);

            if (!i.replied && !i.deferred) await i.reply({ content: '✅ 버튼 처리 완료.', ephemeral: true });
            await updatePanel(i.guild.id, player, client);
        }
    } catch (error) {
        console.error('❌ [ERROR] Interaction failed:', error);
    }
});

process.on('unhandledRejection', error => console.error('❌ [FATAL] Unhandled rejection:', error));
process.on('uncaughtException', error => console.error('❌ [FATAL] Uncaught exception:', error));

console.log('⏳ Attempting to login to Discord...');
const loginTimeout = setTimeout(() => {
    console.log('⚠️ [TIMEOUT] 로그인 시도가 30초를 넘었습니다. 토큰이나 인터넷 연결을 확인해 주세요.');
}, 30000);

client.login(process.env.DISCORD_BOT_TOKEN).then(() => {
    clearTimeout(loginTimeout);
}).catch(error => {
    clearTimeout(loginTimeout);
    console.error('❌ [ERROR] Login failed:', error);
});
