require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events, REST, Routes, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
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
  console.log('--- [v4.2.1 BOT STARTUP DIAGNOSTIC] ---');
  console.log(`Ready! Logged in as ${c.user.tag}`);

  // Initialize Lavalink Audio Engine (v4.1.3)
  console.log('[v4.2.1] Initializing Audio Engine...');
  try {
    player.init(client);
    console.log('[v4.2.1] Audio Engine Initialization check complete.');
  } catch (err) {
    console.error('❌ [v4.2.1] FATAL: player.init() failed!', err);
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
        
        case 'btn_top10':
          const topSongs = db.getTopSongs(interaction.guildId);
          if (topSongs.length === 0) return interaction.editReply({ content: '📊 아직 통계 데이터가 부족합니다! 노래를 더 많이 재생해 주세요.' });
          const topEmbed = new EmbedBuilder().setTitle(`📊 『 ${interaction.guild.name} 』 인기곡 Top 10`).setColor('#FFEE58').setDescription(topSongs.map((s, i) => `**${i + 1}.** ${s.title.substring(0, 50)}... (\`${s.count}회\`)`).join('\n')).setTimestamp();
          return interaction.editReply({ embeds: [topEmbed] });

        case 'btn_favorites':
          const favs = db.getFavorites(interaction.user.id);
          if (favs.length === 0) return interaction.editReply({ content: '❤️ 아직 즐겨찾기한 곡이 없습니다.' });
          const favEmbed = new EmbedBuilder().setTitle('❤️ 내 즐겨찾기 목록').setColor('#FF5252').setDescription(favs.slice(0, 10).map((s, i) => `**${i + 1}.** [${s.title}](${s.url})`).join('\n')).setFooter({ text: '채널에서 바로 주소를 입력해 재생하세요.' });
          return interaction.editReply({ embeds: [favEmbed] });

        case 'btn_recent_list':
          const recents = db.getRecentlyPlayed(interaction.guildId);
          if (recents.length === 0) return interaction.editReply({ content: '✨ 아직 재생 기록이 없습니다.' });
          const recentEmbed = new EmbedBuilder().setTitle('✨ 최근 감상한 노래').setColor('#7986CB').setDescription(recents.map((s, i) => `**${i + 1}.** [${s.title}](${s.url})`).join('\n')).setTimestamp();
          return interaction.editReply({ embeds: [recentEmbed] });

        case 'btn_autoplay':
          const currentConfig = db.getGuildConfig(interaction.guildId);
          const newAutoplay = currentConfig?.autoplay === 1 ? 0 : 1;
          db.setAutoplay(interaction.guildId, newAutoplay === 1);
          await interaction.editReply({ content: `🎧 자동 추천 재생이 **${newAutoplay === 1 ? '활성화' : '비활성화'}** 되었습니다.` });
          return client.refreshMusicInterface(interaction.guildId, null);

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
          user: interaction.user,
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
          return; // Allow playCmd.execute to handle its own selection UI
        }
        return;
      }

      if (interaction.customId === 'btn_playlist_play') {
          const playlists = db.getPlaylists(interaction.user.id);
          const favs = db.getFavorites(interaction.user.id);
          
          if (playlists.length === 0 && favs.length === 0) {
              return interaction.reply({ content: '❌ 재생할 플레이리스트나 즐겨찾기가 없습니다.', flags: [MessageFlags.Ephemeral] });
          }

          const options = [];
          let index = 1;
          
          if (favs.length > 0) {
              options.push(
                  new StringSelectMenuOptionBuilder()
                      .setLabel(`${index++}. ❤️ 내 즐겨찾기 전체 재생`)
                      .setDescription(`${favs.length}곡 재생`)
                      .setValue('play_all_favorites')
              );
          }

          for (const p of playlists) {
              const songs = db.getPlaylistSongs(p.id);
              options.push(
                  new StringSelectMenuOptionBuilder()
                      .setLabel(`${index++}. 📂 ${p.name}`)
                      .setDescription(`${songs.length}곡 재생`)
                      .setValue(`play_custom_playlist_${p.id}`)
              );
          }

          const selectMenu = new StringSelectMenuBuilder()
              .setCustomId('playlist_play_menu_select')
              .setPlaceholder('재생할 리스트의 번호를 선택하세요')
              .addOptions(options.slice(0, 25));

          const row = new ActionRowBuilder().addComponents(selectMenu);
          const embed = embeds.createPlaylistSelectEmbed(playlists, favs.length);

          return interaction.reply({ embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });
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
          if (queue.queue.length === 0) {
            await interaction.reply({ content: '⏭️ 다음 곡이 없어 재생을 중지하고 퇴장합니다.', flags: [MessageFlags.Ephemeral] });
            // Manual destroy since skip on last song may not trigger playerEmpty reliably
            queue.destroy();
            setTimeout(() => refreshMusicInterface(interaction.guildId, null), 1000);
          } else {
            queue.skip();
            await interaction.reply({ content: '⏭️ 다음 곡으로 넘어갑니다.', flags: [MessageFlags.Ephemeral] });
          }
          break;
        case 'player_stop':
          queue.destroy();
          await interaction.reply({ content: '⏹️ 재생을 중지하고 퇴장합니다.', flags: [MessageFlags.Ephemeral] });
          setTimeout(() => refreshMusicInterface(interaction.guildId, null), 1000);
          break;
        case 'player_repeat':
          const loopMode = queue.loop === 'track' ? 'none' : 'track';
          queue.setLoop(loopMode);
          await interaction.reply({ content: `🔁 반복 재생: ${loopMode === 'track' ? '현재 곡' : '꺼짐'}`, flags: [MessageFlags.Ephemeral] });
          break;
        case 'player_heart':
          const currentTrack = queue.queue.current;
          if (!currentTrack) return interaction.reply({ content: '❌ 현재 재생 중인 곡이 없습니다.', flags: [MessageFlags.Ephemeral] });
          
          db.addFavorite(
            interaction.user.id, 
            currentTrack.title, 
            currentTrack.uri, 
            new Date(currentTrack.length).toISOString().substr(11, 8)
          );
          await interaction.reply({ content: `❤️ **${currentTrack.title}** 곡을 내 즐겨찾기에 추가했습니다!`, flags: [MessageFlags.Ephemeral] });
          break;
        case 'player_save_queue':
          const allTracks = [queue.queue.current, ...queue.queue];
          if (!allTracks[0]) return interaction.reply({ content: '❌ 저장할 수 있는 노래가 큐에 없습니다.', flags: [MessageFlags.Ephemeral] });
          
          const playlistName = `보관함_${new Date().toLocaleDateString()}_${Math.floor(Math.random() * 1000)}`;
          const result = db.saveQueueAsPlaylist(interaction.user.id, playlistName, allTracks);
          
          if (result) {
            await interaction.reply({ content: `💾 현재 대기열(${allTracks.length}곡)을 **${playlistName}** 이름으로 저장했습니다!`, flags: [MessageFlags.Ephemeral] });
          } else {
            await interaction.reply({ content: '❌ 저장 중 오류가 발생했습니다.', flags: [MessageFlags.Ephemeral] });
          }
          break;
        case 'player_queue':
          const currentPos = queue.queue.current ? `▶️ **재생 중:** ${queue.queue.current.title}\n\n` : '';
          const upNextList = queue.queue.map((t, i) => `\`${i + 1}.\` ${t.title}`).join('\n') || '대기열이 비어있습니다.';

          const qEmbed = new EmbedBuilder()
            .setTitle('📜 현재 대기열')
            .setColor('#5865F2')
            .setDescription(`${currentPos}**[다음에 재생될 곡]**\n${upNextList}`);
          await interaction.reply({ embeds: [qEmbed], flags: [MessageFlags.Ephemeral] });
          break;
        case 'player_add_playlist':
            const playlists = db.getPlaylists(interaction.user.id);
            if (playlists.length === 0) {
              return interaction.reply({ content: '❌ 먼저 `/playlist create` 명령어로 플레이리스트를 생성해 주세요.', flags: [MessageFlags.Ephemeral] });
            }
            
            const select = new StringSelectMenuBuilder()
              .setCustomId('playlist_add_select')
              .setPlaceholder('추가할 플레이리스트를 선택하세요')
              .addOptions(playlists.slice(0, 25).map(p => 
                new StringSelectMenuOptionBuilder().setLabel(p.name).setValue(p.id.toString())
              ));
  
            const selectRow = new ActionRowBuilder().addComponents(select);
            const selectEmbed = new EmbedBuilder()
              .setColor('#BFA054')
              .setTitle('📂 플레이리스트 저장')
              .setDescription('현재 재생 중인 곡을 어느 보관함에 담을까요?\n아래 목록에서 선택해 주세요.');

            await interaction.reply({ embeds: [selectEmbed], components: [selectRow], flags: [MessageFlags.Ephemeral] });
            break;
        case 'player_explore':
            const exploreRow = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder().setCustomId('btn_popular').setLabel('🔥 인기차트').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('btn_billboard').setLabel('🎶 빌보드').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('btn_recent_list').setLabel('✨ 최근곡').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('btn_madmovie').setLabel('🎬 매드무비 BGM').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('btn_favorites').setLabel('❤️ 즐겨찾기').setStyle(ButtonStyle.Danger)
              );

            const exploreEmbed = new EmbedBuilder()
              .setColor('#BFA054')
              .setTitle('🔍 곡 검색 및 추가')
              .setDescription('이 채널에 바로 **곡 제목**이나 **URL**을 입력하시거나,\n아래 **퀵 버튼**을 눌러 간편하게 추가해 보세요.');

            await interaction.reply({ embeds: [exploreEmbed], components: [exploreRow], flags: [MessageFlags.Ephemeral] });
            break;
      }
    } catch (error) {
      console.error(error);
      if (!interaction.replied) await interaction.reply({ content: '작동 중 오류 발생', flags: [MessageFlags.Ephemeral] });
    }
  }

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'playlist_add_select') {
      const playlistId = interaction.values[0];
      const queue = player.getQueue(interaction.guildId);
      if (!queue || !queue.queue.current) {
        return interaction.reply({ content: '❌ 현재 재생 중인 곡이 없습니다.', flags: [MessageFlags.Ephemeral] });
      }

      const track = queue.queue.current;
      db.addSongToPlaylist(playlistId, track.title, track.uri);
      
      const playlists = db.getPlaylists(interaction.user.id);
      const playlistName = playlists.find(p => p.id.toString() === playlistId)?.name || '플레이리스트';
      
      await interaction.update({ content: `✅ **${track.title}** 곡이 **${playlistName}**에 추가되었습니다!`, components: [] });
    }

    if (interaction.customId === 'playlist_play_menu_select') {
        const selection = interaction.values[0];
        let songsToPlay = [];
        let listName = '';

        if (!interaction.member.voice.channel) {
            return interaction.reply({ content: '먼저 음성 채널에 입장해주세요!', flags: [MessageFlags.Ephemeral] });
        }

        if (selection === 'play_all_favorites') {
            const favs = db.getFavorites(interaction.user.id);
            songsToPlay = favs.map(f => ({ title: f.title, url: f.url }));
            listName = '❤️ 내 즐겨찾기';
        } else if (selection.startsWith('play_custom_playlist_')) {
            const playlistId = selection.replace('play_custom_playlist_', '');
            const playlists = db.getPlaylists(interaction.user.id);
            const playlist = playlists.find(p => p.id.toString() === playlistId);
            if (playlist) {
                const songs = db.getPlaylistSongs(playlist.id);
                songsToPlay = songs.map(s => ({ title: s.title, url: s.url }));
                listName = `📂 ${playlist.name}`;
            }
        }

        if (songsToPlay.length === 0) {
            return interaction.reply({ content: '❌ 리스트가 비어있습니다.', flags: [MessageFlags.Ephemeral] });
        }

        await interaction.update({ content: `🎶 **${listName}** (${songsToPlay.length}곡) 재생을 준비 중입니다...`, embeds: [], components: [] });

        let queue = player.getQueue(interaction.guildId);
        if (!queue) {
            queue = await player.manager.createPlayer({
                guildId: interaction.guildId,
                voiceId: interaction.member.voice.channel.id,
                textId: interaction.channel.id,
                deaf: true,
                volume: 50
            });
        }

        // High-performance batch loading
        console.log(`[v4.2.0 PLAYLIST] Starting batch load for ${songsToPlay.length} songs`);
        
        let loadedCount = 0;
        for (const song of songsToPlay) {
            try {
                const result = await player.manager.search(song.url || song.title, { requester: interaction.user });
                if (result && result.tracks.length > 0) {
                    queue.queue.add(result.tracks[0]);
                    loadedCount++;
                }
            } catch (err) {
                console.error(`[v4.2.0 PLAYLIST] Failed to load: ${song.title}`, err.message);
            }
        }

        console.log(`[v4.2.0 PLAYLIST] Load complete. Added ${loadedCount}/${songsToPlay.length} tracks.`);
        if (!queue.playing && !queue.paused) await queue.play();
        
        // Unified UI Refresh (v4.2.1)
        setTimeout(() => {
            client.refreshMusicInterface(interaction.guildId, queue.queue.current);
        }, 3000);
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
      message.delete().catch(() => { });
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
      deferReply: async () => { },
      reply: async (options) => {
        const msg = await message.channel.send(options);
        setTimeout(() => msg.delete().catch(() => { }), 3000);
        return msg;
      },
      editReply: async (options) => {
        const lastResponse = await message.channel.send(options);
        setTimeout(() => lastResponse.delete().catch(() => { }), 3000);
        return lastResponse;
      },
      followUp: async (options) => {
        const msg = await message.channel.send(options);
        setTimeout(() => msg.delete().catch(() => { }), 3000);
        return msg;
      },
      deferred: false
    };
    const playCmd = client.commands.get('play');
    if (playCmd) {
      await playCmd.execute(interactionPlaceholder, true);
      // Unified UI Refresh (v4.2.1)
      setTimeout(() => {
        const currentQueue = player.getQueue(message.guild.id);
        refreshMusicInterface(message.guild.id, currentQueue ? currentQueue.queue.current : null);
      }, 3000);
    }
  }
});

// UNIFIED MUSIC INTERFACE HELPER (v4.2.1)
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
      if (extraNP) await extraNP.delete().catch(() => { });
    }

    // 1. CASE: Song is playing
    if (currentTrack) {
      const song = {
        title: currentTrack.title,
        url: currentTrack.uri,
        thumbnail: currentTrack.thumbnail || 'https://i.imgur.com/vHdfyC7.png',
        durationRaw: currentTrack.isStream ? 'LIVE' : new Date(currentTrack.length).toISOString().substr(11, 8),
        length: currentTrack.length, // Ensure length is passed for time calculation
        author: currentTrack.author,
        requester: currentTrack.requester
      };

      const npEmbed = embeds.createNowPlayingEmbed(song, kazagumoPlayer);
      const npControls = embeds.createPlayerControlButtons();

      if (uiMessage) {
        await uiMessage.edit({ embeds: [npEmbed], components: npControls }).catch(async () => {
          // If edit fails (e.g. message deleted), send new
          const newMsg = await channel.send({ embeds: [npEmbed], components: npControls });
          db.setGuildConfig(guildId, channel.id, null, newMsg.id);
        });
        // Update DB to ensure we track it as NP message
        db.setGuildConfig(guildId, channel.id, null, uiMessage.id);
      } else {
        const newMsg = await channel.send({ embeds: [npEmbed], components: npControls });
        db.setGuildConfig(guildId, channel.id, null, newMsg.id);
      }
    }
    // 2. CASE: Nothing playing -> Restore Dashboard
    else {
      const dashboardEmbed = embeds.createDashboardEmbed(guild.name);
      const dashboardButtons = embeds.createDashboardButtons(guildId);

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
    console.error('[v4.2.1] refreshMusicInterface Error:', e);
  }
}

client.refreshMusicInterface = refreshMusicInterface;

client.login(process.env.DISCORD_TOKEN);
