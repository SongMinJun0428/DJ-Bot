const manager = require('./LavalinkManager'); 
const embeds = require('../utils/embeds');

class MusicPlayer {
  constructor() {
    this.client = null;
  }

  init(client) {
    this.client = client;
    this.manager = new manager(client).kazagumo;
  }

  getQueue(guildId) {
    return this.manager.players.get(guildId);
  }

  async play(guildId, song, voiceChannel, textChannel) {
    try {
      let player = this.manager.players.get(guildId);

      if (!player) {
        player = await this.manager.createPlayer({
          guildId: guildId,
          voiceId: voiceChannel.id,
          textId: textChannel.id,
          deaf: true
        });
        console.log(`[v2.9.0] Created new Lavalink player for guild ${guildId}`);
      }

      const result = await this.manager.search(song.url || song.title, { requester: song.requester });
      
      if (!result.tracks.length) {
          return textChannel.send('❌ 검색 결과가 없습니다.');
      }

      if (result.type === 'PLAYLIST') {
          for (const track of result.tracks) player.queue.add(track);
          textChannel.send(`🎵 **${result.playlistName}** (${result.tracks.length}곡)을 대기열에 추가했습니다.`);
      } else {
          player.queue.add(result.tracks[0]);
          if (player.playing || player.paused) {
              textChannel.send(`🎵 **${result.tracks[0].title}** 곡이 대기열에 추가되었습니다.`);
          }
      }

      if (!player.playing && !player.paused) await player.play();

    } catch (e) {
      console.error('[v2.9.0] Play Error:', e);
      textChannel.send('❌ 재생 중 오류가 발생했습니다. (Lavalink 노드 확인 요망)');
    }
  }

  async join(voiceChannel, textChannel) {
    console.log(`[v2.9.0] Preparing Lavalink join for ${voiceChannel.name}`);
    return true;
  }
}

module.exports = new MusicPlayer();
