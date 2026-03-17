require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events, REST, Routes, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const player = require('./src/music/Player');
const db = require('./src/db/database');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ]
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const commands = [];
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

client.once(Events.ClientReady, async c => {
  console.log('====================================');
  console.log('--- [v2.5 BOT STARTUP DIAGNOSTIC] ---');
  console.log(`Ready! Logged in as ${c.user.tag}`);
  
  // CRITICAL INTENT CHECK
  const enabledIntents = Object.keys(GatewayIntentBits).filter(k => (client.options.intents & GatewayIntentBits[k]));
  console.log(`[ENABLED INTENTS] ${enabledIntents.join(', ')}`);
  
  if (!enabledIntents.includes('GuildVoiceStates')) {
      console.error('❌ CRITICAL ERROR: GuildVoiceStates intent is MISSING. Voice connection will never work!');
  }
  console.log('--------------------------------');

  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log('Successfully registered application commands.');
  } catch (error) {
    console.error(error);
  }
});

// [TRACE] Deep gateway listener to see why signalling hangs
client.on('raw', packet => {
  if (packet.t === 'VOICE_SERVER_UPDATE') {
    console.log(`[GATEWAY TRACE] Received VOICE_SERVER_UPDATE for guild ${packet.d.guild_id}`);
  }
  if (packet.t === 'VOICE_STATE_UPDATE' && packet.d.user_id === client.user.id) {
    console.log(`[GATEWAY TRACE] Received VOICE_STATE_UPDATE for session ${packet.d.session_id}`);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isButton() && !interaction.isStringSelectMenu()) return;

  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error('Command Execution Error:', error);
      const errorMsg = { content: '오류가 발생했습니다.', flags: [MessageFlags.Ephemeral] };
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply(errorMsg);
      } else if (interaction.deferred) {
        await interaction.editReply(errorMsg);
      }
    }
  }

  if (interaction.isButton()) {
    const queue = player.getQueue(interaction.guildId);
    
    if (interaction.customId.startsWith('btn_')) {
      if (!interaction.member.voice.channel) {
        return interaction.reply({ content: '먼저 음성 채널에 입장해주세요!', flags: [MessageFlags.Ephemeral] });
      }

      await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
      const playCmd = client.commands.get('play');
      
      let query = '';
      switch (interaction.customId) {
        case 'btn_popular': query = '인기차트'; break;
        case 'btn_billboard': query = '빌보드 차트'; break;
        case 'btn_recent': query = '최신곡'; break;
        case 'btn_madmovie': query = '매드무비 브금'; break;
        case 'btn_search':
          return interaction.editReply({ content: '음악 채널에 노래 제목이나 주소를 보내시면 바로 재생됩니다!' });
        case 'btn_help':
          return interaction.editReply({ content: '명령어: `/play`, `/skip`, `/stop`, `/setup`' });
      }

      if (query && playCmd) {
        const mockInteraction = {
          guild: interaction.guild,
          member: interaction.member,
          channel: interaction.channel,
          guildId: interaction.guildId,
          options: { 
            getString: () => query,
            getAttachment: () => null 
          },
          deferReply: () => Promise.resolve(),
          followUp: (msg) => interaction.channel.send(msg),
          reply: (msg) => interaction.channel.send(msg),
          editReply: (msg) => interaction.editReply(msg),
          deferred: true
        };
        await playCmd.execute(mockInteraction, true);
        return interaction.editReply({ content: `🔍 **${query}** 테마 재생 시작.` });
      }
      return;
    }

    // 2. Player control buttons (require an active queue)
    if (!queue) return interaction.reply({ content: '현재 재생 중인 음악이 없습니다.', flags: [MessageFlags.Ephemeral] });

    try {
      switch (interaction.customId) {
        case 'player_pause':
          if (queue.player.state.status === 'paused') {
            queue.player.unpause();
            await interaction.reply({ content: '▶️ 재개림', flags: [MessageFlags.Ephemeral] });
          } else {
            queue.player.pause();
            await interaction.reply({ content: '⏸️ 일시정지됨', flags: [MessageFlags.Ephemeral] });
          }
          break;
        case 'player_skip':
          player.onSongEnd(interaction.guildId);
          await interaction.reply({ content: '⏭️ 건너뜀', flags: [MessageFlags.Ephemeral] });
          break;
        case 'player_stop':
          if (queue.connection) queue.connection.destroy();
          player.queues.delete(interaction.guildId);
          await interaction.reply({ content: '⏹️ 정지됨', flags: [MessageFlags.Ephemeral] });
          break;
      }
    } catch (error) {
      console.error(error);
      if (!interaction.replied) await interaction.reply({ content: '작동 중 오류 발생', flags: [MessageFlags.Ephemeral] });
    }
  }
});

// Listener for dedicated music channel
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  
  const config = db.getGuildConfig(message.guildId);
  if (config && message.channelId === config.music_channel_id) {
    // Treat message content as a search query
    // This will be handled by a helper function to play music
    const attachment = message.attachments.first();
    const interactionPlaceholder = { 
        guild: message.guild, 
        member: message.member, 
        channel: message.channel,
        guildId: message.guildId,
        options: { 
            getString: () => message.content,
            getAttachment: () => attachment
        },
        reply: (msg) => message.channel.send(msg),
        followUp: (msg) => message.channel.send(msg),
        deferred: false // interactionPlaceholder doesn't support deferReply easily here
    };
    const playCmd = client.commands.get('play');
    if (playCmd) playCmd.execute(interactionPlaceholder, true);
  }
});

client.login(process.env.DISCORD_TOKEN);
