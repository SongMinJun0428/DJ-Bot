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
        return textChannel.send('⏳ 오디오 엔진 초기화 중입니다. 잠시만 기다려 주세요. (v4.2.1)');
      }

      // Check for node readiness
      const nodesMap = this.lavalink.shoukaku.nodes;
      const nodesArray = nodesMap ? Array.from(nodesMap.values()) : [];
      const readyNodes = nodesArray.filter(n => n.state === 1); 
      
      console.log(`[v4.2.1] Audio attempt for guild ${guildId}. Found ${nodesArray.length} potential nodes, Ready: ${readyNodes.length}`);

      if (readyNodes.length === 0) {
        let msg = `📡 **오디오 서버 연결 시도 중...** (상태: ${readyNodes.length}/${nodesArray.length} 연결됨) (v4.2.1)`;
        if (nodesArray.length === 0) {
            msg += '\n⚠️ 서버 설정 오류가 발견되었습니다. 개발자에게 문의해 주세요.';
        } else {
            msg += '\n> 잠시만 기다려 주시면 자동으로 연결됩니다. (최대 10초 소요)';
        }
        
        textChannel.send(msg);
        return { status: 'WAITING', message: msg };
      }

      let player = this.manager.players.get(guildId);

      if (!player) {
        player = await this.manager.createPlayer({
          guildId: guildId,
          voiceId: voiceChannel.id,
          textId: textChannel.id,
          deaf: true,
          volume: 50
        });
        console.log(`[v4.2.1] Created new Lavalink player for guild ${guildId}`);
      }

      const db = require('../db/database');
      const searchUrl = song.url || song.title;
      const isDirectLink = searchUrl.startsWith('http');
      const result = await this.manager.search(searchUrl, { requester: song.requester });
      
      if (!result || !result.tracks.length) {
          if (isDirectLink) {
              return textChannel.send('❌ **파일 재생 실패:** 음악 서버의 보안 정책으로 인해 직접 링크 재생이 차단되었습니다. 다른 서버를 시도 중이거나 파일 형식(MP3 등)을 확인해 주세요.');
          }
          return textChannel.send('❌ 검색 결과가 없습니다.');
      }

      if (result.type === 'PLAYLIST') {
          for (const track of result.tracks) {
              player.queue.add(track);
              db.incrementStat(guildId, track.uri, track.title);
          }
          textChannel.send(`🎵 **${result.playlistName}** (${result.tracks.length}곡)을 대기열에 추가했습니다.`);
      } else {
          const track = result.tracks[0];
          player.queue.add(track);
          db.incrementStat(guildId, track.uri, track.title);
          
          if (player.playing || player.paused) {
              textChannel.send(`🎵 **${track.title}** 곡이 대기열에 추가되었습니다.`);
          }
      }

      if (!player.playing && !player.paused) await player.play();

    } catch (e) {
      console.error('[v4.2.1] Play Error:', e);
      textChannel.send('❌ 재생 중 오류가 발생했습니다. (Lavalink 노드 서버 확인 요망)');
    }
  }

  async join(voiceChannel, textChannel) {
    console.log(`[v4.2.1] Preparing Lavalink join for ${voiceChannel.name}`);
    return true;
  }
}

module.exports = new MusicPlayer();
