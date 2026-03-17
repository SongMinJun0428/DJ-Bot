const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db/database');
const musicPlayer = require('../music/Player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('playlist')
    .setNameLocalizations({ ko: '플레이리스트' })
    .setDescription('플레이리스트를 관리합니다.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setNameLocalizations({ ko: '생성' })
        .setDescription('새 플레이리스트를 생성합니다.')
        .addStringOption(option => option.setName('name').setDescription('플레이리스트 이름').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setNameLocalizations({ ko: '추가' })
        .setDescription('현재 재생 중인 곡을 플레이리스트에 추가합니다.')
        .addStringOption(option => option.setName('name').setDescription('플레이리스트 이름').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('play')
        .setNameLocalizations({ ko: '재생' })
        .setDescription('플레이리스트의 모든 곡을 대기열에 추가합니다.')
        .addStringOption(option => option.setName('name').setDescription('플레이리스트 이름').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setNameLocalizations({ ko: '목록' })
        .setDescription('내 플레이리스트 목록을 확인합니다.')),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (subcommand === 'create') {
      const name = interaction.options.getString('name');
      const result = db.createPlaylist(userId, name);
      if (result) {
        await interaction.reply({ content: `✅ 플레이리스트 **${name}**이(가) 생성되었습니다.` });
      } else {
        await interaction.reply({ content: `❌ 이미 존재하는 이름이거나 생성에 실패했습니다.`, ephemeral: true });
      }
    } else if (subcommand === 'add') {
      const name = interaction.options.getString('name');
      const queue = musicPlayer.getQueue(interaction.guildId);
      if (!queue || queue.songs.length === 0) {
        return interaction.reply({ content: '현재 재생 중인 곡이 없습니다.', ephemeral: true });
      }

      const song = queue.songs[0];
      const playlists = db.getPlaylists(userId);
      const playlist = playlists.find(p => p.name === name);

      if (!playlist) {
        return interaction.reply({ content: `❌ 플레이리스트 **${name}**을(를) 찾을 수 없습니다.`, ephemeral: true });
      }

      db.addSongToPlaylist(playlist.id, song.title, song.url);
      await interaction.reply({ content: `✅ **${song.title}** 곡이 **${name}** 플레이리스트에 추가되었습니다.` });
    } else if (subcommand === 'play') {
      const name = interaction.options.getString('name');
      const playlists = db.getPlaylists(userId);
      const playlist = playlists.find(p => p.name === name);

      if (!playlist) {
        return interaction.reply({ content: `❌ 플레이리스트 **${name}**을(를) 찾을 수 없습니다.`, ephemeral: true });
      }

      const songs = db.getPlaylistSongs(playlist.id);
      if (songs.length === 0) {
        return interaction.reply({ content: '플레이리스트가 비어 있습니다.', ephemeral: true });
      }

      if (!interaction.member.voice.channel) {
        return interaction.reply({ content: '먼저 음성 채널에 입장해주세요!', ephemeral: true });
      }

      let queue = musicPlayer.getQueue(interaction.guildId);
      if (!queue) {
        await musicPlayer.join(interaction.member.voice.channel, interaction.channel);
        queue = musicPlayer.getQueue(interaction.guildId);
      }

      songs.forEach(s => {
        queue.songs.push({
          title: s.title,
          url: s.url,
          thumbnail: 'https://i.imgur.com/your-thumbnail.png',
          durationRaw: 'Playlist',
          author: 'User Playlist',
          isLocal: false
        });
      });

      if (!queue.playing) {
        musicPlayer.play(interaction.guildId, queue.songs[0]);
      }

      await interaction.reply({ content: `✅ **${name}** 플레이리스트의 곡 ${songs.length}개를 대기열에 추가했습니다.` });
    } else if (subcommand === 'list') {
      const playlists = db.getPlaylists(userId);
      if (playlists.length === 0) {
        return interaction.reply({ content: '생성된 플레이리스트가 없습니다.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('📂 내 플레이리스트 목록')
        .setColor('#5865F2')
        .setDescription(playlists.map(p => `- ${p.name}`).join('\n'));

      await interaction.reply({ embeds: [embed] });
    }
  },
};
