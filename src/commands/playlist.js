const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
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
        await interaction.reply({ content: `❌ 이미 존재하는 이름이거나 생성에 실패했습니다.`, flags: [MessageFlags.Ephemeral] });
      }
    } else if (subcommand === 'add') {
      const name = interaction.options.getString('name');
      const player = musicPlayer.getQueue(interaction.guildId);
      if (!player || !player.queue.current) {
        return interaction.reply({ content: '현재 재생 중인 곡이 없습니다.', flags: [MessageFlags.Ephemeral] });
      }

      const song = player.queue.current;
      const playlists = db.getPlaylists(userId);
      const playlist = playlists.find(p => p.name === name);

      if (!playlist) {
        return interaction.reply({ content: `❌ 플레이리스트 **${name}**을(를) 찾을 수 없습니다.`, flags: [MessageFlags.Ephemeral] });
      }

      db.addSongToPlaylist(playlist.id, song.title, song.uri);
      await interaction.reply({ content: `✅ **${song.title}** 곡이 **${name}** 플레이리스트에 추가되었습니다.` });
    } else if (subcommand === 'play') {
      const name = interaction.options.getString('name');
      const playlists = db.getPlaylists(userId);
      const playlist = playlists.find(p => p.name === name);

      if (!playlist) {
        return interaction.reply({ content: `❌ 플레이리스트 **${name}**을(를) 찾을 수 없습니다.`, flags: [MessageFlags.Ephemeral] });
      }

      const songs = db.getPlaylistSongs(playlist.id);
      if (songs.length === 0) {
        return interaction.reply({ content: '플레이리스트가 비어 있습니다.', flags: [MessageFlags.Ephemeral] });
      }

      if (!interaction.member.voice.channel) {
        return interaction.reply({ content: '먼저 음성 채널에 입장해주세요!', flags: [MessageFlags.Ephemeral] });
      }

      let player = musicPlayer.getQueue(interaction.guildId);
      if (!player) {
          player = await musicPlayer.manager.createPlayer({
              guildId: interaction.guildId,
              voiceId: interaction.member.voice.channel.id,
              textId: interaction.channel.id,
              deaf: true
          });
      }

      for (const s of songs) {
          const result = await musicPlayer.manager.search(s.url, { requester: interaction.user });
          if (result && result.tracks.length > 0) {
              player.queue.add(result.tracks[0]);
          }
      }

      if (!player.playing && !player.paused) await player.play();

      await interaction.reply({ content: `✅ **${name}** 플레이리스트의 곡 ${songs.length}개를 대기열에 추가하고 재생을 시작합니다.` });
    } else if (subcommand === 'list') {
      const playlists = db.getPlaylists(userId);
      if (playlists.length === 0) {
        return interaction.reply({ content: '생성된 플레이리스트가 없습니다.', flags: [MessageFlags.Ephemeral] });
      }

      const embed = new EmbedBuilder()
        .setTitle('📂 내 플레이리스트 목록')
        .setColor('#5865F2')
        .setDescription(playlists.map(p => `- ${p.name}`).join('\n'));

      await interaction.reply({ embeds: [embed] });
    }
  },
};
