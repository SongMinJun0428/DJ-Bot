const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const packageJson = require('../../package.json');

module.exports = {
  createDashboardEmbed: (guildName) => {
    return new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`『 SMP - MUSIC INTERFACE 』`)
      .setThumbnail('https://i.imgur.com/vHdfyC7.png')
      .setDescription(`
> **고도의 최적화와 프리미엄 음질을 제공하는 SMP 전용 채널입니다.** 🎧
      `)
      .addFields(
        { name: '🚀 빠른 가동성', value: '99.9% 업타임 보장 및 상시 관리', inline: true },
        { name: '📚 스마트 UI', value: '최적화된 인터페이스 및 사용자 편의성', inline: true },
        { name: '🎵 자동 곡 추천', value: '끊김 없는 음악 감상 시스템 적용', inline: true }
      )
      .setFooter({ text: `v${packageJson.version} | ${guildName} 전용 플레이어` })
      .setTimestamp();
  },

  createNowPlayingEmbed: (track, queue = null) => {
    const embed = new EmbedBuilder()
      .setColor('#2C2F33')
      .setTitle('『 현재 곡 재생 정보 』')
      .setImage(track.thumbnail)
      .setDescription(`
### 🎼 [${track.title}](${track.url})

\`0:00\` ━━━━━━━━━━━━━🔘────────── \`${track.durationRaw || 'LIVE'}\`

**┃ 👤 신청:** <@${track.requester?.id || 'Unknown'}>
**┃ 🎙️ 공유:** \`${track.author || 'Youtube Content'}\`
      `);

    if (queue && queue.length > 0) {
        const nextUp = queue.slice(0, 3).map((t, i) => `**${i + 1}.** [${t.title.substring(0, 35)}...](${t.uri})`).join('\n');
        embed.addFields({ name: '📜 Next in Queue', value: nextUp || 'No more songs.' });
    }

    embed.setFooter({ text: '💡 아래 컨트롤 패널로 연동된 기능을 제어하세요.' })
      .setTimestamp();
    
    return embed;
  },

  createDashboardButtons: () => {
    const row1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('btn_popular').setLabel('🔥 인기차트').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_billboard').setLabel('🎶 빌보드').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('btn_recent').setLabel('✨ 최신곡 업데이트').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('btn_madmovie').setLabel('⚔️ 매드무비').setStyle(ButtonStyle.Primary)
      );

    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('btn_search').setLabel('🔍 곡 검색/주소 입력').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_help').setLabel('🛠️ 도움말').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setURL('https://discord.com').setLabel('🏠 공식 서버').setStyle(ButtonStyle.Link)
      );

    return [row1, row2];
  },

  createPlayerControlButtons: () => {
    return new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('player_pause').setLabel('⏯️ 정지/재개').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('player_skip').setLabel('⏭️ 건너뛰기').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('player_queue').setLabel('📜 대기열 목록').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('player_repeat').setLabel('🔁 반복설정').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('player_stop').setLabel('⏹️ 종료/퇴장').setStyle(ButtonStyle.Danger)
      );
  },

  createSearchEmbed: (results, title = '검색 결과') => {
    const description = results.map((v, i) => {
      const duration = v.durationRaw || 'LIVE';
      const cleanTitle = v.title.length > 45 ? v.title.substring(0, 42) + '...' : v.title;
      return `\`${i + 1}.\` **${cleanTitle}** (${duration})`;
    }).join('\n');

    return new EmbedBuilder()
      .setColor('#2C2F33')
      .setTitle(`🔍 『 ${title} 』`)
      .setDescription(description)
      .setThumbnail(results[0].thumbnails ? results[0].thumbnails[0].url : (results[0].thumbnail || null))
      .setTimestamp();
  }
};
