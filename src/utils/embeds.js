const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const packageJson = require('../../package.json');

const formatTime = (ms) => {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

  const hoursStr = (hours > 0) ? `${hours}:` : '';
  const minsStr = `${minutes.toString().padStart(2, '0')}:`;
  const secsStr = seconds.toString().padStart(2, '0');

  return `${hoursStr}${minsStr}${secsStr}`;
};

module.exports = {
  createDashboardEmbed: (guildName) => {
    return new EmbedBuilder()
      .setColor('#BFA054')
      .setTitle(`『 SMP - MUSIC INTERFACE 』`)
      .setThumbnail('https://i.imgur.com/vHdfyC7.png')
      .setDescription(`
> **고도의 최적화와 프리미엄 음질을 제공하는 SMP 전용 채널입니다.** 🎧
      `)
      .addFields(
        { name: '◈ 빠른 가동성', value: '99.9% 업타임 보장 및 상시 관리', inline: true },
        { name: '◈ 스마트 UI', value: '최적화된 인터페이스 및 사용자 편의성', inline: true },
        { name: '◈ 자동 곡 추천', value: '끊김 없는 음악 감상 시스템 적용', inline: true }
      )
      .setFooter({ text: `v${packageJson.version} | ${guildName} Premium Player System` })
      .setTimestamp();
  },

  createNowPlayingEmbed: (track, kazagumoPlayer = null) => {
    const totalMs = track.duration || 0;
    const currentMs = kazagumoPlayer ? kazagumoPlayer.position : 0;
    const remainingMs = Math.max(0, totalMs - currentMs);

    const currentTime = formatTime(currentMs);
    const totalTime = formatTime(totalMs);
    const remainingTime = formatTime(remainingMs);

    // Refined Progress Bar (15 segments)
    const segments = 15;
    const progress = Math.round((currentMs / totalMs) * segments) || 0;
    const bar = '╼'.repeat(progress) + '🔘' + '━'.repeat(Math.max(0, segments - progress));

    const embed = new EmbedBuilder()
      .setColor('#1A1A1B')
      .setTitle('『 현재 곡 재생 정보 』')
      .setImage(track.thumbnail)
      .setDescription(`
### 🎼 [${track.title}](${track.url})

\`${currentTime}\` ${bar} \`${totalTime}\`
> **남은 시간:** \`${remainingTime}\` ⏳

**┃ 👤 신청:** <@${track.requester?.id || 'Unknown'}>
**┃ 🎙️ 공유:** \`${track.author || 'Youtube Content'}\`
      `);

    const queue = kazagumoPlayer?.queue;
    if (queue && queue.length > 0) {
        const nextUp = queue.slice(0, 3).map((t, i) => `**${i + 1}.** [${t.title.substring(0, 35)}...](${t.uri})`).join('\n');
        embed.addFields({ name: '◈ Next in Queue', value: nextUp || 'No more songs.' });
    }

    embed.setFooter({ text: '💡 하단 컨트롤 패널을 통해 고품격 오디오 엔진을 제어하세요.' })
      .setTimestamp();
    
    return embed;
  },

  createDashboardButtons: (guildId) => {
    const db = require('../db/database');
    const config = db.getGuildConfig(guildId);
    const autoplayStatus = config?.autoplay === 1 ? '🟢 ON' : '🔴 OFF';

    const row1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('btn_popular').setLabel('🔥 인기차트').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_billboard').setLabel('🎶 빌보드').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('btn_top10').setLabel('📊 서버 차트').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_recent_list').setLabel('✨ 최근 감상곡').setStyle(ButtonStyle.Primary)
      );

    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('btn_search').setLabel('🔍 곡 검색/주소 입력').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_favorites').setLabel('❤️ 내 보관함').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('btn_autoplay').setLabel(`🎧 자동재생: ${autoplayStatus}`).setStyle(ButtonStyle.Secondary)
      );

    return [row1, row2];
  },

  createPlayerControlButtons: () => {
    const row1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('player_pause').setLabel('⏯️').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('player_skip').setLabel('⏭️').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('player_repeat').setLabel('🔁').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('player_stop').setLabel('⏹️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('player_queue').setLabel('📜').setStyle(ButtonStyle.Primary)
      );

    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('player_heart').setLabel('❤️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('player_add_playlist').setLabel('💾 저장').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('player_explore').setLabel('🔍 곡 검색/추가').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('player_save_queue').setLabel('📁 큐 전체저장').setStyle(ButtonStyle.Secondary)
      );

    return [row1, row2];
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
