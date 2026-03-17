const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
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
      console.error(`Audio Player Error: ${error.message} with resource ${error.resource.metadata.title}`);
      this.onSongEnd(guild.id);
    });

    player.on('stateChange', (oldState, newState) => {
      console.log(`Audio player transitioned from ${oldState.status} to ${newState.status}`);
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
    if (!queue || queue.songs.length > 0) return;

    // We need the last played song's URL. For simplicity, let's assume we keep track or just stop.
    // In a real scenario, you'd store its URL. Let's add a placeholder for lastUrl in queue.
    if (queue.lastUrl) {
      const nextSong = await autoplay.getRelatedVideo(queue.lastUrl);
      if (nextSong) {
        queue.songs.push(nextSong);
        this.play(guildId, nextSong);
        if (queue.textChannel) {
          queue.textChannel.send(`✨ **자동 추천 곡**을 재생합니다: **${nextSong.title}**`);
        }
        return;
      }
    }
    
    queue.playing = false;
  }

  async play(guildId, song) {
    const queue = this.queues.get(guildId);
    if (!song) {
      queue.connection.destroy();
      this.queues.delete(guildId);
      return;
    }

    try {
      console.log(`Starting playback: ${song.title} (${song.url})`);
      let resource;
      if (song.isLocal) {
        resource = createAudioResource(song.url);
      } else {
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
      console.error('Playback execution error:', e);
      if (queue.textChannel) {
        queue.textChannel.send('❌ 재생 중 오류가 발생했습니다. (유튜브 차단 또는 스트림 오류)');
      }
      this.onSongEnd(guildId);
    }
  }

  async join(voiceChannel, textChannel) {
    const queue = await this.createQueue(voiceChannel.guild, textChannel, voiceChannel);
    queue.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    queue.connection.on(VoiceConnectionStatus.Disconnected, () => {
      console.log('Voice connection disconnected.');
      this.queues.delete(voiceChannel.guild.id);
    });

    queue.connection.on('stateChange', (oldState, newState) => {
      console.log(`Voice connection transitioned from ${oldState.status} to ${newState.status}`);
    });
  }
}

module.exports = new MusicPlayer();
