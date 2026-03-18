const manager = require('./LavalinkManager'); 
const embeds = require('../utils/embeds');

class MusicPlayer {
  constructor() {
    this.client = null;
  }

  init(client) {
    this.client = client;
    this.lavalink = new manager(client);
    this.manager = this.lavalink.kazagumo;
  }

  getQueue(guildId) {
    return this.manager.players.get(guildId);
  }

  async play(guildId, song, voiceChannel, textChannel) {
    try {
      if (!this.lavalink || !this.lavalink.shoukaku) {
        return textChannel.send('⏳ 오디오 엔진 초기화 중입니다. 10초 뒤에 다시 시도해 주세요. (v4.1.0)');
      }

      // Check for node readiness
      const nodesMap = this.lavalink.shoukaku.nodes;
      const nodesArray = nodesMap ? Array.from(nodesMap.values()) : [];
      const readyNodes = nodesArray.filter(n => n.state === 1); 
      
      console.log(`[v4.1.0] Audio attempt for guild ${guildId}. Found ${nodesArray.length} potential nodes, Ready: ${readyNodes.length}`);

      if (readyNodes.length === 0) {
        let msg = `🛰️ 오디오 서버 연결 대기 중... (현재 연결된 서버: ${readyNodes.length}/${nodesArray.length}) (v4.1.0)`;
        if (nodesArray.length === 0) msg += '\n⚠️ 서버 리스트가 비어 있습니다. 코드가 제대로 업로드되었는지 확인해 주세요.';
        else msg += '\n> 로그에 "Node is READY"가 뜰 때까지 잠시만 기다려 주세요.';
        
        textChannel.send(msg);
        return { status: 'WAITING', message: msg };
      }

      let player = this.manager.players.get(guildId);

      if (!player) {
        player = await this.manager.createPlayer({
          guildId: guildId,
          voiceId: voiceChannel.id,
          textId: textChannel.id,
          deaf: true
        });
        console.log(`[v3.1.14] Created new Lavalink player for guild ${guildId}`);
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
      console.error('[v4.0.1] Play Error:', e);
      textChannel.send('❌ 재생 중 오류가 발생했습니다. (Lavalink 노드 서버 확인 요망)');
    }
  }

  async join(voiceChannel, textChannel) {
    console.log(`[v4.0.1] Preparing Lavalink join for ${voiceChannel.name}`);
    return true;
  }
}

module.exports = new MusicPlayer();
