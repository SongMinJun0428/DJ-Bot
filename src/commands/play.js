const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const play = require('play-dl');
const musicPlayer = require('../music/Player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setNameLocalizations({ ko: '재생' })
    .setDescription('음악을 재생합니다.')
    .addStringOption(option =>
      option.setName('query')
        .setNameLocalizations({ ko: '검색어' })
        .setDescription('노래 제목 또는 URL')
        .setRequired(true)),
  async execute(interaction, fromChannel = false) {
    const query = fromChannel ? interaction.options.getString() : interaction.options.getString('query');
    const guild = interaction.guild;
    const member = interaction.member;

    if (!member.voice.channel) {
      return interaction.reply({ content: '먼저 음성 채널에 입장해주세요!', ephemeral: true });
    }

    if (!fromChannel) await interaction.deferReply();

    try {
      // If it's a URL
      if (query.startsWith('http')) {
        const videoInfo = await play.video_info(query);
        const song = {
          title: videoInfo.video_details.title,
          url: videoInfo.video_details.url,
          thumbnail: videoInfo.video_details.thumbnails[0].url,
          durationRaw: videoInfo.video_details.durationRaw,
          author: videoInfo.video_details.channel.name,
          isLocal: false
        };

        this.addAndPlay(interaction, song, fromChannel);
      } else {
        // Search for top 10
        const searchResults = await play.search(query, { limit: 10 });
        if (searchResults.length === 0) {
          return interaction.followUp({ content: '검색 결과가 없습니다.' });
        }

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('select_song')
          .setPlaceholder('노래를 선택하세요 (상위 10개)')
          .addOptions(searchResults.map((video, index) => ({
            label: `${index + 1}. ${video.title.substring(0, 90)}`,
            description: video.channel.name,
            value: video.url
          })));

        const row = new ActionRowBuilder().addComponents(selectMenu);
        const response = await interaction.followUp({
          content: '재생할 노래를 선택해주세요:',
          components: [row]
        });

        // Wait for selection
        const filter = i => i.customId === 'select_song' && i.user.id === interaction.member.id;
        try {
          const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });
          const selectedUrl = confirmation.values[0];
          const selectedVideo = searchResults.find(v => v.url === selectedUrl);

          const song = {
            title: selectedVideo.title,
            url: selectedVideo.url,
            thumbnail: selectedVideo.thumbnails[0].url,
            durationRaw: selectedVideo.durationRaw,
            author: selectedVideo.channel.name,
            isLocal: false
          };

          await confirmation.update({ content: `✅ **${song.title}** 선택됨!`, components: [] });
          this.addAndPlay(interaction, song, fromChannel);

        } catch (e) {
          await interaction.editReply({ content: '선택 시간이 초과되었습니다.', components: [] });
        }
      }
    } catch (e) {
      console.error(e);
      if (fromChannel) interaction.reply('오류가 발생했습니다.');
      else interaction.followUp('오류가 발생했습니다.');
    }
  },

  async addAndPlay(interaction, song, fromChannel) {
    let queue = musicPlayer.getQueue(interaction.guildId);

    if (!queue) {
      await musicPlayer.join(interaction.member.voice.channel, interaction.channel);
      queue = musicPlayer.getQueue(interaction.guildId);
    }

    queue.songs.push(song);

    if (queue.songs.length === 1 && !queue.playing) {
      musicPlayer.play(interaction.guildId, song);
    } else {
      interaction.channel.send(`🎵 **${song.title}** 곡이 대기열에 추가되었습니다.`);
    }
  }
};
