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
    const attachment = interaction.options ? (interaction.options.getAttachment ? interaction.options.getAttachment('file') : null) : null;
    let query = interaction.options ? (interaction.options.getString('query') || interaction.options.getString()) : null;
    
    if (attachment && !query) {
      query = attachment.url;
    }

    if (!query) {
      const msg = '검색어 또는 파일을 입력해주세요!';
      if (fromChannel) return interaction.channel.send(msg);
      return interaction.reply({ content: msg, flags: [MessageFlags.Ephemeral] });
    }

    const member = interaction.member;
    if (!member.voice.channel) {
      const msg = '먼저 음성 채널에 입장해주세요!';
      if (fromChannel) return interaction.channel.send(msg);
      return interaction.reply({ content: msg, flags: [MessageFlags.Ephemeral] });
    }

    try {
      if (!fromChannel && !interaction.deferred) await interaction.deferReply();

      if (query.startsWith('http')) {
        let song;
        if (attachment || query.includes('cdn.discordapp.com')) {
            song = {
                title: attachment ? attachment.name : '업로드 파일',
                url: query,
                thumbnail: 'https://i.imgur.com/vHdfyC7.png',
                durationRaw: '파일 재생',
                author: member.displayName,
                isLocal: false
            };
        } else {
            console.log(`Fetching video info for: ${query}`);
            const videoInfo = await play.video_info(query).catch(err => {
              console.error('Video Info Error:', err.message);
              return null;
            });

            if (!videoInfo) {
              const errMsg = '❌ 유효하지 않은 주소거나 유튜브 로드 실패. (지역 제한 또는 성인 인증 필요할 수 있음)';
              return fromChannel ? interaction.channel.send(errMsg) : interaction.followUp(errMsg);
            }

            song = {
                title: videoInfo.video_details.title,
                url: videoInfo.video_details.url,
                thumbnail: videoInfo.video_details.thumbnails[0].url,
                durationRaw: videoInfo.video_details.durationRaw,
                author: videoInfo.video_details.channel.name,
                isLocal: false
            };
        }
        await this.addAndPlay(interaction, song, fromChannel);
      } else {
        console.log(`Searching for: ${query}`);
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
            description: video.channel ? (video.channel.name || 'Youtube') : 'Youtube',
            value: video.url
          })));

        const row = new ActionRowBuilder().addComponents(selectMenu);
        const response = fromChannel 
            ? await interaction.channel.send({ content: `🔍 **${query}** 검색 결과:`, components: [row] })
            : await interaction.followUp({ content: '재생할 노래를 선택해주세요:', components: [row] });

        const filter = i => i.customId === 'select_song' && i.user.id === member.id;
        try {
          const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });
          const selectedVideo = searchResults.find(v => v.url === confirmation.values[0]);
          const song = {
            title: selectedVideo.title,
            url: selectedVideo.url,
            thumbnail: selectedVideo.thumbnails[0].url,
            durationRaw: selectedVideo.durationRaw,
            author: selectedVideo.channel ? selectedVideo.channel.name : '알 수 없음',
            isLocal: false
          };
          await confirmation.update({ content: `✅ **${song.title}** 선택됨!`, components: [] });
          await this.addAndPlay(interaction, song, fromChannel);
        } catch (e) {
          console.error('Selection timeout or error:', e);
          if (fromChannel) response.edit({ content: '선택 시간이 초과되었습니다.', components: [] }).catch(() => {});
          else interaction.editReply({ content: '선택 시간이 초과되었습니다.', components: [] }).catch(() => {});
        }
      }
    } catch (e) {
      console.error('Play command Error:', e);
      const errMsg = '❌ 재생 중 오류가 발생했습니다. (봇 권한 또는 네트워크 확인 요망)';
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
