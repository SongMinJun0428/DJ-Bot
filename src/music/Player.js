const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const play = require('play-dl');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const embeds = require('../utils/embeds');
const autoplay = require('./Autoplay');

class MusicPlayer {
  constructor() {
    this.queues = new Map(); // guildId -> { textChannel, voiceChannel, connection, player, songs: [], volume: 5, playing: false, loop: false }
  }

  getQueue(guildId) {
    return this.queues.get(guildId);
  }

  async createQueue(guild, textChannel, voiceChannel) {
    const player = createAudioPlayer();
    const queue = {
      textChannel,
      voiceChannel,
      connection: null,
      player,
      songs: [],
      volume: 5,
      playing: true,
      loop: false
    };

    this.queues.set(guild.id, queue);

    player.on(AudioPlayerStatus.Idle, () => {
      console.log('Audio player is now Idle.');
      this.onSongEnd(guild.id);
    });

    player.on('error', error => {
      console.error(`Audio Player Error: ${error.message}`);
      this.onSongEnd(guild.id);
    });

    player.on('stateChange', (oldState, newState) => {
      console.log(`Audio player: ${oldState.status} -> ${newState.status}`);
    });

    return queue;
  }

  async onSongEnd(guildId) {
    const queue = this.queues.get(guildId);
    if (!queue) return;

    if (queue.loop && queue.songs.length > 0) {
      // Loop current song (we don't shift in play function if loop is on, or we handle it here)
    } else {
      queue.songs.shift();
    }

    if (queue.songs.length > 0) {
      this.play(guildId, queue.songs[0]);
    } else {
      // Autoplay logic
      await this.handleAutoplay(guildId);
    }
  }

  async handleAutoplay(guildId) {
    const queue = this.queues.get(guildId);
    if (!queue || !queue.lastUrl) return queue.playing = false;

    // We need the last played song's URL. For simplicity, let's assume we keep track or just stop.
    // In a real scenario, you'd store its URL. Let's add a placeholder for lastUrl in queue.
    if (queue.lastUrl) {
      const nextSong = await autoplay.getRelatedVideo(queue.lastUrl);
      if (nextSong) {
        queue.songs.push(nextSong);
        this.play(guildId, nextSong);
        if (queue.textChannel) {
          queue.textChannel.send(`✨ **자동 추천 곡**: ${nextSong.title}`);
        }
        return;
      }
    }
    
    queue.playing = false;
  }

  async play(guildId, song) {
    const queue = this.queues.get(guildId);
    if (!song) { 
      if (queue.connection) queue.connection.destroy();
      this.queues.delete(guildId); 
      return; 
    }

    try {
      console.log(`Attempting to play: ${song.title}`);
      let resource;
      // Direct file link detection (MP3, WAV, etc)
      const isDirectFile = song.url.match(/\.(mp3|wav|ogg|flac|m4a)($|\?)/i);

      if (song.isLocal) {
        resource = createAudioResource(song.url);
      } else if (isDirectFile) {
        console.log('Detected direct audio link, playing via resource...');
        resource = createAudioResource(song.url);
      } else {
        console.log('Playing via play-dl stream...');
        const stream = await play.stream(song.url, {
            discordPlayerCompatibility: true
        });
        resource = createAudioResource(stream.stream, { inputType: stream.type });
      }

      queue.player.play(resource);
      queue.connection.subscribe(queue.player);
      queue.playing = true;
      queue.lastUrl = song.url;

      if (queue.textChannel) {
        const npEmbed = embeds.createNowPlayingEmbed(song);
        const controls = embeds.createPlayerControlButtons();
        queue.textChannel.send({ embeds: [npEmbed], components: [controls] });
      }
    } catch (e) {
      console.error('Play execution error:', e);
      if (queue.textChannel) {
        queue.textChannel.send('❌ 재생 중 오류가 발생했습니다. (유튜브 차단 또는 스트림 오류)');
      }
      this.onSongEnd(guildId);
    }
  }

  async join(voiceChannel, textChannel) {
    const guildId = voiceChannel.guild.id;
    let queue = this.queues.get(guildId);
    if (queue && queue.connection) queue.connection.destroy();
    queue = await this.createQueue(voiceChannel.guild, textChannel, voiceChannel);

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: false, // v2.8: Sometimes required for certain NAT/UDP environments
      selfMute: false,
      group: 'dj-bot-v2.8'
    });
    queue.connection = connection;

    // v2.8 Deep Debugging
    connection.on('stateChange', (o, n) => {
        console.log(`[v2.8.0 VOICE] ${o.status} -> ${n.status}`);
        if (n.status === 'signalling') console.log('[v2.8.0] Waiting for Voice Server IP... (If stuck here, Railway UDP is blocked)');
    });

    connection.on('debug', m => {
        if (m.includes('UDP')) console.log(`[UDP DEBUG] ${m}`);
        if (m.includes('DAVE') || m.includes('E2EE')) console.log(`[SECURITY DEBUG] ${m}`);
    });

    try {
      console.log('[v2.8.0] Connecting (Targeting Node 22+ environment)...');
      await entersState(connection, VoiceConnectionStatus.Ready, 25_000); // 25s for slow handshakes
      console.log('✅ v2.8.0 Connection Success! Sound should be audible.');
    } catch (e) {
      console.error(`❌ v2.8.0 Voice failed. Final State: ${connection.state.status}`);
      if (connection.state.status === 'signalling') {
          console.error('[CRITICAL] Railway의 Inbound UDP가 막혀있습니다. Lavalink 도입이 시급합니다.');
      }
      connection.destroy();
      this.queues.delete(guildId);
      throw new Error('음성 연결 정체: 호스팅 서버의 UDP 보안 설정을 확인해 주세요.');
    }
  }
}

module.exports = new MusicPlayer();
