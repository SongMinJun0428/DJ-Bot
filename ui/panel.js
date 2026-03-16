const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function createPanelEmbed(track = null, queueLength = 0, isPaused = false) {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🎵 DJ봇 음악 제어판')
        .setDescription(track ? `**현재 재생 중:** [${track.title}](${track.url})` : '재생 중인 곡이 없습니다. `/play`로 음악을 시작하세요!')
        .setThumbnail('https://i.imgur.com/8nNf6D8.png') // Cute robot placeholder
        .addFields(
            { name: '대기열', value: `${queueLength}곡 남음`, inline: true },
            { name: '상태', value: isPaused ? '⏸ 일시정지' : '▶️ 재생 중', inline: true }
        )
        .setFooter({ text: 'DJ봇 - 당신의 고품격 음악 도우미', iconURL: 'https://i.imgur.com/8nNf6D8.png' })
        .setTimestamp();

    if (track && track.thumbnail) {
        embed.setImage(track.thumbnail);
    }

    return embed;
}

function createPanelButtons(isPaused = false) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('music_pause_resume')
                .setLabel(isPaused ? '▶️ 재생' : '⏸ 일시정지')
                .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('music_skip')
                .setLabel('⏭ 스킵')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_stop')
                .setLabel('⏹ 정지')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('music_queue')
                .setLabel('📜 대기열')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_disconnect')
                .setLabel('🔌 퇴장')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row];
}

module.exports = { createPanelEmbed, createPanelButtons };
