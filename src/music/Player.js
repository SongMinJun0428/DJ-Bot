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
      if (!this.manager || !this.manager.shoukaku) {
        return textChannel.send('⏳ 오디오 엔진 초기화 중입니다. 3초 뒤에 다시 시도해 주세요. (v3.0.4)');
      }

      // Check for node readiness
      const nodes = this.manager.shoukaku.nodes;
      const readyNodes = nodes ? Array.from(nodes.values()).filter(n => n.state === 1) : []; 
      
      if (!readyNodes || readyNodes.length === 0) {
        return textChannel.send('🛰️ 오디오 서버(Lavalink) 연결 중입니다. 잠시만 기다려 주세요... (v3.0.6)');
      }

      let player = this.manager.players.get(guildId);

      if (!player) {
        player = await this.manager.createPlayer({
          guildId: guildId,
          voiceId: voiceChannel.id,
          textId: textChannel.id,
          deaf: true
        });
        console.log(`[v3.0.6] Created new Lavalink player for guild ${guildId}`);
      }

      const result = await this.manager.search(song.url || song.title, { requester: song.requester });
      
      if (!result || !result.tracks.length) {
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
      console.error('[v3.0.6] Play Error:', e);
      textChannel.send('❌ 재생 중 오류가 발생했습니다. (Lavalink 노드 서버 확인 요망)');
    }
  }

  async join(voiceChannel, textChannel) {
    console.log(`[v3.0.6] Preparing Lavalink join for ${voiceChannel.name}`);
    return true;
  }
}

module.exports = new MusicPlayer();
