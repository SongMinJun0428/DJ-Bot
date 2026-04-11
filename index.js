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
  console.log('--- [v4.1.3 BOT STARTUP DIAGNOSTIC] ---');
  console.log(`Ready! Logged in as ${c.user.tag}`);
  
  // Initialize Lavalink Audio Engine (v4.1.3)
  console.log('[v4.1.3] Calling player.init()...');
  try {
    player.init(client);
    console.log('[v4.1.3] player.init() call complete.');
  } catch (err) {
    console.error('❌ [v4.1.3] FATAL: player.init() failed!', err);
  }

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
          deferReply: async (options) => { 
              this.deferred = true; 
              return Promise.resolve(); 
          },
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
          if (queue.paused) {
            queue.pause(false);
            await interaction.reply({ content: '▶️ 재개됨', flags: [MessageFlags.Ephemeral] });
          } else {
            queue.pause(true);
            await interaction.reply({ content: '⏸️ 일시정지됨', flags: [MessageFlags.Ephemeral] });
          }
          break;
        case 'player_skip':
          queue.skip();
          await interaction.reply({ content: '⏭️ 건너김', flags: [MessageFlags.Ephemeral] });
          break;
        case 'player_stop':
          queue.destroy();
          await interaction.reply({ content: '⏹️ 정지됨', flags: [MessageFlags.Ephemeral] });
          break;
        case 'player_repeat':
          const loopMode = queue.loop === 'track' ? 'none' : 'track';
          queue.setLoop(loopMode);
          await interaction.reply({ content: `🔁 반복 재생: ${loopMode === 'track' ? '현재 곡' : '꺼짐'}`, flags: [MessageFlags.Ephemeral] });
          break;
        case 'player_queue':
          const tracks = queue.queue.map((t, i) => `${i + 1}. ${t.title}`).join('\n') || '대기열이 비어있습니다.';
          const qEmbed = new EmbedBuilder()
            .setTitle('📜 현재 대기열')
            .setColor('#5865F2')
            .setDescription(tracks.length > 2000 ? tracks.substring(0, 1997) + '...' : tracks);
          await interaction.reply({ embeds: [qEmbed], flags: [MessageFlags.Ephemeral] });
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
    const attachment = message.attachments.first();
    
    // AUTO-DELETE USER MESSAGE (Sticky Dashboard)
    setTimeout(() => {
        message.delete().catch(() => {});
    }, 1000);

    const interactionPlaceholder = { 
        id: message.id,
        user: message.author,
        member: message.member,
        guild: message.guild,
        guildId: message.guildId,
        channel: message.channel,
        options: {
            getString: () => message.content,
            getAttachment: () => attachment
        },
        deferReply: async () => {},
        reply: async (options) => {
            const msg = await message.channel.send(options);
            setTimeout(() => msg.delete().catch(() => {}), 3000);
            return msg;
        },
        editReply: async (options) => {
            const lastResponse = await message.channel.send(options);
            setTimeout(() => lastResponse.delete().catch(() => {}), 3000);
            return lastResponse;
        },
        followUp: async (options) => {
            const msg = await message.channel.send(options);
            setTimeout(() => msg.delete().catch(() => {}), 3000);
            return msg;
        },
        deferred: false
    };
    const playCmd = client.commands.get('play');
    if (playCmd) {
        await playCmd.execute(interactionPlaceholder, true);
        // Unified UI Refresh (v4.1.3)
        setTimeout(() => {
            const currentQueue = player.getQueue(message.guild.id);
            refreshMusicInterface(message.guild.id, currentQueue ? currentQueue.queue.current : null);
        }, 3000);
    }
  }
});

// UNIFIED MUSIC INTERFACE HELPER (v4.1.5)
async function refreshMusicInterface(guildId, currentTrack = null) {
    const config = db.getGuildConfig(guildId);
    if (!config || !config.music_channel_id) return;

    const guild = client.guilds.cache.get(guildId);
    const channel = guild?.channels.cache.get(config.music_channel_id);
    if (!channel) return;

    try {
        const embeds = require('./src/utils/embeds');
        const kazagumoPlayer = player.getQueue(guildId);
        
        // Find existing UI message - try Dashboard first, then NP
        let uiMessage = null;
        if (config.dashboard_msg_id) {
            uiMessage = await channel.messages.fetch(config.dashboard_msg_id).catch(() => null);
        }
        if (!uiMessage && config.now_playing_msg_id) {
            uiMessage = await channel.messages.fetch(config.now_playing_msg_id).catch(() => null);
        }

        // Clean up any extra NP message if it's different from our primary UI message
        if (config.now_playing_msg_id && uiMessage?.id !== config.now_playing_msg_id) {
            const extraNP = await channel.messages.fetch(config.now_playing_msg_id).catch(() => null);
            if (extraNP) await extraNP.delete().catch(() => {});
        }

        // 1. CASE: Song is playing
        if (currentTrack) {
            const song = {
                title: currentTrack.title,
                url: currentTrack.uri,
                thumbnail: currentTrack.thumbnail || 'https://i.imgur.com/vHdfyC7.png',
                durationRaw: currentTrack.isStream ? 'LIVE' : new Date(currentTrack.length).toISOString().substr(11, 8),
                author: currentTrack.author,
                requester: currentTrack.requester
            };

            const npEmbed = embeds.createNowPlayingEmbed(song, kazagumoPlayer?.queue);
            const npControls = embeds.createPlayerControlButtons();
            
            if (uiMessage) {
                await uiMessage.edit({ embeds: [npEmbed], components: [npControls] }).catch(async () => {
                    // If edit fails (e.g. message deleted), send new
                    const newMsg = await channel.send({ embeds: [npEmbed], components: [npControls] });
                    db.setGuildConfig(guildId, channel.id, null, newMsg.id);
                });
                // Update DB to ensure we track it as NP message
                db.setGuildConfig(guildId, channel.id, null, uiMessage.id);
            } else {
                const newMsg = await channel.send({ embeds: [npEmbed], components: [npControls] });
                db.setGuildConfig(guildId, channel.id, null, newMsg.id);
            }
        } 
        // 2. CASE: Nothing playing -> Restore Dashboard
        else {
            const dashboardEmbed = embeds.createDashboardEmbed(guild.name);
            const dashboardButtons = embeds.createDashboardButtons();

            if (uiMessage) {
                await uiMessage.edit({ embeds: [dashboardEmbed], components: dashboardButtons }).catch(async () => {
                   const newMsg = await channel.send({ embeds: [dashboardEmbed], components: dashboardButtons });
                   db.setGuildConfig(guildId, channel.id, newMsg.id, null);
                });
                db.setGuildConfig(guildId, channel.id, uiMessage.id, null);
            } else {
                const newMsg = await channel.send({ embeds: [dashboardEmbed], components: dashboardButtons });
                db.setGuildConfig(guildId, channel.id, newMsg.id, null);
            }
        }
    } catch (e) {
        console.error('[v4.1.5] refreshMusicInterface Error:', e);
    }
}

client.refreshMusicInterface = refreshMusicInterface;

client.login(process.env.DISCORD_TOKEN);
