const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const db = require('../db/database');
const embeds = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setNameLocalizations({ ko: '설정' })
    .setDescription('음악 채널을 설정합니다.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async execute(interaction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    try {
      // Create channel
      const channel = await interaction.guild.channels.create({
        name: 'DJ 봇 음악 채널',
        type: ChannelType.GuildText,
        topic: '음악으로 즐기는 프리미엄 전용 채널 | 여기에 노래 제목을 입력하세요.'
      });

      // Send dashboard embed
      const dashboardEmbed = embeds.createDashboardEmbed(interaction.guild.name);
      const buttons = embeds.createDashboardButtons();

      const dashboardMsg = await channel.send({
        embeds: [dashboardEmbed],
        components: buttons
      });

      // Save to DB
      db.setGuildConfig(interaction.guild.id, channel.id, dashboardMsg.id);

      await interaction.editReply({ content: `✅ 음악 채널이 생성되었습니다: ${channel}` });
    } catch (e) {
      console.error(e);
      await interaction.editReply({ content: '❌ 채널 생성 중 오류가 발생했습니다. 권한을 확인해주세요.' });
    }
  },
};
