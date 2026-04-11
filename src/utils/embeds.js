const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const packageJson = require('../../package.json');

module.exports = {
  createDashboardEmbed: (guildName) => {
    return new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`SMP - 음악채널`)
      .setThumbnail('https://i.imgur.com/vHdfyC7.png') // Default logo
      .setDescription(`
**┃ 99.9%의 업타임 보장 🚀**
업데이트와 재시작은 이용자가 가장 적은 시간에 진행되며, 음질과 성능 최적화를 위해 매일 꾸준히 관리합니다.

**┃ 최적의 사용자 편의를 제공하는 UI 📚**
유저가 최대한 편하게, 최소한의 동작으로 기능을 사용할 수 있도록 집중했습니다.

**┃ 추천 곡 자동 재생 🎵**
노래가 끝나면 봇이 알아서 다음 곡을 추천해줍니다!
      `)
      .setFooter({ text: `버전: v${packageJson.version} | /셋업 명령어 사용` })
      .setTimestamp();
  },

  createNowPlayingEmbed: (track, queue = null) => {
    const embed = new EmbedBuilder()
      .setColor('#2F3136')
      .setTitle('『 현재 재생 중 』')
      .setImage(track.thumbnail) // Large thumbnail as requested
      .setDescription(`
**[${track.title}](${track.url})**

\`0:00\` ▬▬▬▬▬▬▬▬▬▬▬🔘────────── \`${track.durationRaw || 'LIVE'}\`

**┃ 👤 요청자:** <@${track.requester?.id || 'Unknown'}>
**┃ 🎙️ 아티스트:** \`${track.author || 'Youtube'}\`
      `);

    if (queue && queue.length > 0) {
        const nextUp = queue.slice(0, 3).map((t, i) => `\`${i + 1}.\` ${t.title.substring(0, 40)}...`).join('\n');
        embed.addFields({ name: '📜 대기열 (다음 곡)', value: nextUp || '없음' });
    }

    embed.setFooter({ text: '💡 버튼을 눌러 플레이어를 제어하세요.' })
      .setTimestamp();
    
    return embed;
  },

  createDashboardButtons: () => {
    const row1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('btn_recent').setLabel('📋 최근').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('btn_popular').setLabel('🟢 인기차트').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_billboard').setLabel('🎵 빌보드').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('btn_madmovie').setLabel('🎮 매드무비').setStyle(ButtonStyle.Primary)
      );

    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('btn_help').setLabel('📁 명령어 보기').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setURL('https://discord.com').setLabel('🔗 공식 서버').setStyle(ButtonStyle.Link),
        new ButtonBuilder().setCustomId('btn_search').setLabel('🔍 제목(주소) 입력하여 재생').setStyle(ButtonStyle.Success)
      );

    return [row1, row2];
  },

  createPlayerControlButtons: () => {
    return new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('player_pause').setLabel('⏯️ 재생/일시정지').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('player_skip').setLabel('⏭️ 건너뛰기').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('player_stop').setLabel('⏹️ 중지').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('player_repeat').setLabel('🔁 반복').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('player_queue').setLabel('📜 대기열').setStyle(ButtonStyle.Primary)
      );
  },

  createSearchEmbed: (results, title = '검색 결과') => {
    const description = results.map((v, i) => {
      const duration = v.durationRaw || 'LIVE';
      const author = v.channel ? v.channel.name : 'Youtube';
      // Limit title length for clean UI
      const cleanTitle = v.title.length > 50 ? v.title.substring(0, 47) + '...' : v.title;
      return `${i + 1}. **${cleanTitle}** (${duration})`;
    }).join('\n');

    return new EmbedBuilder()
      .setColor('#2F3136')
      .setTitle(`『${title}』`)
      .setDescription(description)
      .setThumbnail(results[0].thumbnails ? results[0].thumbnails[0].url : (results[0].thumbnail || null))
      .setTimestamp();
  }
};
