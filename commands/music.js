const play = require('play-dl');
const db = require('../db/db');
const { createPanelEmbed, createPanelButtons } = require('../ui/panel');

async function handlePlay(interaction, player) {
    const query = interaction.options.getString('input');
    const member = interaction.member;

    if (!member.voice.channel) {
        return interaction.reply({ content: '❌ 먼저 음성 채널에 들어가 주세요.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        let video;
        const searchResult = await play.search(query, { limit: 1 });
        
        if (searchResult.length === 0) {
            return interaction.editReply({ content: '🔍 검색 결과가 없습니다.' });
        }

        video = searchResult[0];
        
        const track = {
            title: video.title,
            url: video.url,
            thumbnail: video.thumbnails[0]?.url,
            duration: video.durationRaw,
            requestedBy: member.user.tag
        };

        await player.play(member.voice.channel, track);

        // Update Panel
        await updatePanel(interaction.guild.id, player, interaction.client);

        await interaction.editReply({ content: `✅ **${track.title}**을(를) 대기열에 추가했습니다!` });

    } catch (error) {
        console.error('Play Error:', error);
        await interaction.editReply({ content: '❌ 음악을 불러오는데 실패했습니다.' });
    }
}

async function updatePanel(guildId, player, client) {
    const settings = await db.getSettings(guildId);
    if (!settings || !settings.music_text_channel_id || !settings.panel_message_id) return;

    try {
        const channel = await client.channels.fetch(settings.music_text_channel_id);
        const message = await channel.messages.fetch(settings.panel_message_id);
        
        const track = player.queue[0] || null;
        const embed = createPanelEmbed(track, Math.max(0, player.queue.length - 1), player.player.state.status === 'paused');
        const buttons = createPanelButtons(player.player.state.status === 'paused');

        await message.edit({ embeds: [embed], components: buttons });
    } catch (error) {
        console.error('Panel Update Error:', error);
    }
}

module.exports = { handlePlay, updatePanel };
