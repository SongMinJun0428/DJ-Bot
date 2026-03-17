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
        .setRequired(false))
    .addAttachmentOption(option =>
      option.setName('file')
        .setNameLocalizations({ ko: '파일' })
        .setDescription('재생할 음악 파일 (mp3, wav 등)')
        .setRequired(false)),
  async execute(interaction, fromChannel = false) {
    const attachment = interaction.options ? interaction.options.getAttachment('file') : null;
    const query = fromChannel ? interaction.options.getString() : (attachment ? attachment.url : interaction.options.getString('query'));
    
    if (!query && !attachment) {
      return interaction.reply({ content: '검색어 또는 파일을 입력해주세요!', ephemeral: true });
    }
    const guild = interaction.guild;
    const member = interaction.member;

    if (!member.voice.channel) {
      return interaction.reply({ content: '먼저 음성 채널에 입장해주세요!', ephemeral: true });
    }

    try {
      // Defer if not from channel
      if (!fromChannel && !interaction.deferred) await interaction.deferReply();

      // If it's a URL
      if (query.startsWith('http')) {
        const stream = await play.stream(query).catch(err => {
            console.error('Stream error:', err);
            return null;
        });

        if (!stream) {
            return interaction.followUp({ content: '❌ 음악 스트림을 불러올 수 없습니다. URL을 확인해주세요.' });
        }

        const videoInfo = await play.video_info(query);
        const song = {
          title: videoInfo.video_details.title,
          url: videoInfo.video_details.url,
          thumbnail: videoInfo.video_details.thumbnails[0].url,
          durationRaw: videoInfo.video_details.durationRaw,
          author: videoInfo.video_details.channel.name,
          isLocal: false
        };

        await this.addAndPlay(interaction, song, fromChannel);
      } else {
        // Search for top 10
        const searchResults = await play.search(query, { limit: 10 });
        if (searchResults.length === 0) {
          const msg = '검색 결과가 없습니다.';
          return fromChannel ? interaction.channel.send(msg) : interaction.followUp(msg);
        }

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('select_song')
          .setPlaceholder('노래를 선택하세요 (상위 10개)')
          .addOptions(searchResults.map((video, index) => ({
            label: `${index + 1}. ${video.title.substring(0, 90)}`,
            description: video.channel.name || '유튜브 자료',
            value: video.url
          })));

        const row = new ActionRowBuilder().addComponents(selectMenu);
        const followUpContent = {
          content: `🔍 **${query}** 검색 결과입니다:`,
          components: [row]
        };

        const response = fromChannel 
            ? await interaction.channel.send(followUpContent)
            : await interaction.followUp(followUpContent);

        // Wait for selection
        const filter = i => i.customId === 'select_song' && i.user.id === member.id;
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
          await this.addAndPlay(interaction, song, fromChannel);

        } catch (e) {
          if (fromChannel) response.edit({ content: '선택 시간이 초과되었습니다.', components: [] });
          else interaction.editReply({ content: '선택 시간이 초과되었습니다.', components: [] });
        }
      }
    } catch (e) {
      console.error('Play command error:', e);
      const errMsg = '❌ 오류가 발생했습니다. (권한 또는 스트리밍 문제)';
      if (fromChannel) interaction.channel.send(errMsg);
      else if (interaction.deferred) interaction.followUp(errMsg);
      else interaction.reply(errMsg);
    }
  },

  async addAndPlay(interaction, song, fromChannel) {
    let queue = musicPlayer.getQueue(interaction.guildId);

    if (!queue) {
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
        return interaction.channel.send('음성 채널을 찾을 수 없습니다.');
      }
      await musicPlayer.join(voiceChannel, interaction.channel);
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
