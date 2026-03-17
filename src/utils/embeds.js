const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  createDashboardEmbed: (guildName) => {
    return new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`${guildName} - 음악채널`)
      .setThumbnail('https://i.imgur.com/your-thumbnail.png') // Placeholder, change to bot avatar or local icon
      .setDescription(`
**┃ 99.9%의 업타임 보장 🚀**
업데이트와 재시작은 이용자가 가장 적은 시간에 진행되며, 음질과 성능 최적화를 위해 매일 꾸준히 관리합니다.

**┃ 최적의 사용자 편의를 제공하는 UI 📚**
유저가 최대한 편하게, 최소한의 동작으로 기능을 사용할 수 있도록 집중했습니다.

**┃ 추천 곡 자동 재생 🎵**
노래가 끝나면 봇이 알아서 다음 곡을 추천해줍니다!
      `)
      .setFooter({ text: '이거 어떻게 하냐면요 /셋업 명령어예요' })
      .setTimestamp();
  },

  createNowPlayingEmbed: (track) => {
    return new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('▶️ 현재 재생 중')
      .setDescription(`[${track.title}](${track.url})`)
      .addFields(
        { name: '작성자', value: track.author || '알 수 없음', inline: true },
        { name: '길이', value: track.durationRaw || '알 수 없음', inline: true }
      )
      .setThumbnail(track.thumbnail)
      .setTimestamp();
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
        new ButtonBuilder().setCustomId('btn_search').setLabel('🔍 음악 검색하기').setStyle(ButtonStyle.Success)
      );

    return [row1, row2];
  },

  createPlayerControlButtons: () => {
    return new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('player_prev').setLabel('⏮️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('player_pause').setLabel('⏸️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('player_skip').setLabel('⏭️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('player_stop').setLabel('⏹️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('player_repeat').setLabel('🔁').setStyle(ButtonStyle.Secondary)
      );
  }
};
