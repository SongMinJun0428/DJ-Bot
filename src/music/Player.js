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
    
    // Cleanup existing connection if any
    let queue = this.queues.get(guildId);
    if (queue && queue.connection) {
        console.log('Cleaning up existing voice connection for new join request.');
        queue.connection.destroy();
    }

    queue = await this.createQueue(voiceChannel.guild, textChannel, voiceChannel);
    console.log(`Joining voice channel: ${voiceChannel.name} (${voiceChannel.id}) in guild ${guildId}`);
    
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
      debug: false // Set to true if further debugging is needed
    });

    queue.connection = connection;

    // Verbose logging for Railway debugging
    connection.on('stateChange', (oldState, newState) => {
      console.log(`[VOICE CONNECTION] State changed: ${oldState.status} -> ${newState.status}`);
      if (newState.status === VoiceConnectionStatus.Ready) {
          console.log('✅ Connection is READY and authenticated.');
      }
    });

    connection.on('error', (error) => {
        console.error('[VOICE CONNECTION] Fatal error:', error);
        connection.destroy();
        this.queues.delete(guildId);
    });

    try {
      console.log('Attempting to wait for READY state (max 30s)...');
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    } catch (error) {
      console.error('❌ Voice connection failed to READY:', error.message);
      
      // Attempting to diagnose why it failed
      console.log(`Last status: ${connection.state.status}`);
      
      if (connection.state.status !== VoiceConnectionStatus.Ready) {
        connection.destroy();
        this.queues.delete(guildId);
        throw new Error('음성 채널 연결에 실패했습니다. (서버 네트워크 또는 봇 권한 문제)');
      }
    }

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        console.log('Voice disconnected. Attempting automatic reconnection...');
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch (e) {
        console.log('Unable to reconnect, cleaning up.');
        connection.destroy();
        this.queues.delete(guildId);
      }
    });
  }
}

module.exports = new MusicPlayer();
