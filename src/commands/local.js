const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const musicPlayer = require('../music/Player');
const path = require('path');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('local')
    .setNameLocalizations({ ko: '로컬' })
    .setDescription('서버의 MP3/MP4 파일을 재생합니다.')
    .addStringOption(option =>
      option.setName('filename')
        .setNameLocalizations({ ko: '파일명' })
        .setDescription('재생할 파일 이름 (예: music.mp3)')
        .setRequired(true)),
  async execute(interaction) {
    const filename = interaction.options.getString('filename');
    const member = interaction.member;

    if (!member.voice.channel) {
      return interaction.reply({ content: '먼저 음성 채널에 입장해주세요!', flags: [MessageFlags.Ephemeral] });
    }

    const filePath = path.join(__dirname, '..', '..', 'music', filename);
    if (!fs.existsSync(filePath)) {
      return interaction.reply({ content: `❌ 파일을 찾을 수 없습니다: ${filename}`, flags: [MessageFlags.Ephemeral] });
    }

    await interaction.deferReply();

    const song = {
      title: filename,
      url: filePath,
      thumbnail: 'https://i.imgur.com/your-thumbnail.png', // Default icon for local files
      durationRaw: 'Local File',
      author: 'Server Storage',
      isLocal: true
    };

    let player = musicPlayer.getQueue(interaction.guildId);
    if (!player) {
        player = await musicPlayer.manager.createPlayer({
            guildId: interaction.guildId,
            voiceId: member.voice.channel.id,
            textId: interaction.channel.id,
            deaf: true,
            volume: 50
        });
    }

    const result = await musicPlayer.manager.search(filePath, { requester: interaction.user });
    if (!result || result.tracks.length === 0) {
        return interaction.editReply(`❌ 파일을 재생할 수 없습니다: ${filename} (Lavalink에서 지원하지 않거나 파일이 손상되었습니다)`);
    }

    player.queue.add(result.tracks[0]);

    if (!player.playing && !player.paused) {
      await player.play();
      interaction.editReply(`🎵 **${filename}** 재생을 시작합니다.`);
    } else {
      interaction.editReply(`🎵 **${filename}** 곡이 대기열에 추가되었습니다.`);
    }
  },
};
