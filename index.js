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

client.commands = new Collection();
client.commands.set(setupCommand.name, setupCommand);

// Global Music Manager
const musicManager = new MusicManager(client);

// Check Environment Variables
if (!process.env.DISCORD_BOT_TOKEN) {
    console.error('❌ DISCORD_BOT_TOKEN is missing!');
} else {
    console.log('✅ DISCORD_BOT_TOKEN is present');
}

client.once(Events.ClientReady, async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    // Register Slash Commands
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    const commands = [
        {
            name: 'setup',
            description: '음악 채널 및 제어판을 초기화합니다.'
        },
        {
            name: 'play',
            description: '음악을 검색하거나 URL을 재생합니다.',
            options: [
                {
                    name: 'input',
                    type: 3, // STRING
                    description: '유튜브/스포티파이 링크 또는 검색어',
                    required: true
                }
            ]
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
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('❌ Error registering slash commands:', error);
    }
});

client.on(Events.InteractionCreate, async interaction => {
    try {
        const player = musicManager.getPlayer(interaction.guild.id);

        if (interaction.isChatInputCommand()) {
            const command = interaction.commandName;

            if (command === 'setup') {
                await setupCommand.execute(interaction);
            } else if (command === 'play') {
                await handlePlay(interaction, player);
            } else if (command === 'skip') {
                player.skip();
                await interaction.reply({ content: '⏭ 스킵했습니다.', ephemeral: true });
                await updatePanel(interaction.guild.id, player, client);
            } else if (command === 'stop') {
                player.stop();
                await interaction.reply({ content: '⏹ 정지했습니다.', ephemeral: true });
                await updatePanel(interaction.guild.id, player, client);
            } else if (command === 'pause') {
                player.pause();
                await interaction.reply({ content: '⏸ 일시정지했습니다.', ephemeral: true });
                await updatePanel(interaction.guild.id, player, client);
            } else if (command === 'resume') {
                player.resume();
                await interaction.reply({ content: '▶️ 다시 재생합니다.', ephemeral: true });
                await updatePanel(interaction.guild.id, player, client);
            } else if (command === 'nowplaying') {
                const track = player.queue[0];
                if (!track) return interaction.reply({ content: '❌ 재생 중인 곡이 없습니다.', ephemeral: true });
                await interaction.reply({ content: `🎵 **현재 재생 중:** [${track.title}](${track.url})`, ephemeral: true });
            } else if (command === 'panelrefresh') {
                await updatePanel(interaction.guild.id, player, client);
                await interaction.reply({ content: '🔄 제어판을 새로 고쳤습니다.', ephemeral: true });
            } else if (command === 'disconnect') {
                musicManager.removePlayer(interaction.guild.id);
                await interaction.reply({ content: '🔌 퇴장했습니다.', ephemeral: true });
                await updatePanel(interaction.guild.id, player, client);
            } else if (command === 'queue') {
                const q = player.queue.map((t, i) => `${i + 1}. ${t.title}`).join('\n') || '대기열이 비어있습니다.';
                await interaction.reply({ content: `📜 **대기열:**\n${q}`, ephemeral: true });
            }
        } 
        
        if (interaction.isButton()) {
            const customId = interaction.customId;
            
            if (customId === 'music_pause_resume') {
                if (player.player.state.status === 'paused') {
                    player.resume();
                    await interaction.reply({ content: '▶️ 다시 재생합니다.', ephemeral: true });
                } else {
                    player.pause();
                    await interaction.reply({ content: '⏸ 일시정지했습니다.', ephemeral: true });
                }
            } else if (customId === 'music_skip') {
                player.skip();
                await interaction.reply({ content: '⏭ 스킵했습니다.', ephemeral: true });
            } else if (customId === 'music_stop') {
                player.stop();
                await interaction.reply({ content: '⏹ 정지했습니다.', ephemeral: true });
            } else if (customId === 'music_queue') {
                const q = player.queue.map((t, i) => `${i + 1}. ${t.title}`).join('\n') || '대기열이 비어있습니다.';
                await interaction.reply({ content: `📜 **대기열:**\n${q}`, ephemeral: true });
            } else if (customId === 'music_disconnect') {
                musicManager.removePlayer(interaction.guild.id);
                await interaction.reply({ content: '🔌 퇴장했습니다.', ephemeral: true });
            }

            // Auto-update panel after button click
            await updatePanel(interaction.guild.id, player, client);
        }
    } catch (error) {
        console.error('❌ Interaction Error:', error);
    }
});

// Error Handling
process.on('unhandledRejection', error => {
    console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('❌ Uncaught exception:', error);
});

console.log('⏳ Attempting to login to Discord...');
client.login(process.env.DISCORD_BOT_TOKEN).catch(error => {
    console.error('❌ Failed to login to Discord:', error);
});
