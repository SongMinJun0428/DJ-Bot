const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const play = require('play-dl');
const musicPlayer = require('../music/Player');
const embeds = require('../utils/embeds');
const { MessageFlags } = require('discord.js');

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
    let query = interaction.options ? (interaction.options.getString('query') || (typeof interaction.options.getString === 'function' ? interaction.options.getString('query') : interaction.options.getString)) : null;
    
    // Support for interaction placeholders (text channel messages)
    if (!query && !attachment && interaction.content) query = interaction.content;

    if (attachment && !query) {
      query = attachment.url;
    }

    if (!query) {
      const msg = '검색어 또는 파일을 입력해주세요!';
      if (fromChannel) return interaction.channel.send(msg);
      return interaction.reply({ content: msg, ephemeral: true });
    }

    const member = interaction.member;
    if (!member.voice.channel) {
      const msg = '먼저 음성 채널에 입장해주세요!';
      if (fromChannel) return interaction.channel.send(msg);
      return interaction.reply({ content: msg, ephemeral: true });
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
            console.log(`[v3.1.14] Fetching video info for: ${query}`);
            const videoInfo = await play.video_info(query).catch(err => {
              console.error('[v3.1.14] Video Info Error:', err.message);
              return null;
            });

            if (!videoInfo) {
              const errMsg = '❌ 유효하지 않은 주소거나 유튜브 로드 실패.';
              return fromChannel ? interaction.channel.send(errMsg) : interaction.editReply(errMsg);
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
        const playResult = await this.addAndPlay(interaction, song, fromChannel);
        if (!fromChannel && interaction.deferred) {
            const content = playResult && playResult.status === 'WAITING' ? playResult.message : `✅ **${song.title}** 처리가 시작되었습니다. (v4.0.4)`;
            await interaction.editReply({ content }).catch(() => {});
        }
      } else {
        console.log(`[v4.0.4] Searching for: ${query}`);
        const searchResults = await play.search(query, { limit: 10 });
        if (searchResults.length === 0) {
            const msg = '검색 결과가 없습니다.';
            return fromChannel ? interaction.channel.send(msg) : interaction.editReply(msg);
        }

        // Selection Menu for ALL Contexts (Slash & Dedicated Channel)
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('select_song')
          .setPlaceholder('음악을 재생하려면 선택하세요')
          .addOptions(searchResults.map((video, index) => ({
            label: `${index + 1}. ${video.title.substring(0, 90)}`,
            description: video.channel ? (video.channel.name || 'Youtube') : 'Youtube',
            value: video.url
          })));

        const row = new ActionRowBuilder().addComponents(selectMenu);
        const searchEmbed = musicPlayer.lavalink.embeds.createSearchEmbed(searchResults, query);
        
        const response = await interaction.editReply({ 
            embeds: [searchEmbed], 
            components: [row] 
        });

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
          await confirmation.update({ content: `✅ **${song.title}** 선택됨! (v3.1.14)`, embeds: [], components: [] });
          const playResult = await this.addAndPlay(interaction, song, false);
          if (playResult && playResult.status === 'WAITING') {
              await interaction.followUp({ content: playResult.message, flags: [MessageFlags.Ephemeral] }).catch(() => {});
          }
        } catch (e) {
          console.error('[v3.1.14] Selection timeout or error:', e);
          interaction.editReply({ content: '선택 시간이 초과되었습니다.', embeds: [], components: [] }).catch(() => {});
        }
      }
    } catch (e) {
      console.error('[v3.1.14] Play command Error:', e);
      const errMsg = '❌ 재생 중 오류가 발생했습니다.';
      if (fromChannel) interaction.channel.send(errMsg);
      else if (interaction.deferred) interaction.editReply(errMsg).catch(() => {});
      else interaction.reply(errMsg).catch(() => {});
    }
  },

  async addAndPlay(interaction, song, fromChannel) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      const msg = '먼저 음성 채널에 입장해주세요!';
      return fromChannel ? interaction.channel.send(msg) : interaction.channel.send(msg);
    }
    await musicPlayer.play(interaction.guildId, song, voiceChannel, interaction.channel);
  }
};
