const { ChannelType, PermissionFlagsBits } = require('discord.js');
const db = require('../db/db');
const { createPanelEmbed, createPanelButtons } = require('../ui/panel');

module.exports = {
    name: 'setup',
    description: '음악 채널 및 제어판을 초기화합니다.',
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;
        let settings = await db.getSettings(guild.id);

        try {
            // 1. Voice Channel setup
            let voiceChannel = guild.channels.cache.get(settings?.music_voice_channel_id);
            if (!voiceChannel) {
                voiceChannel = await guild.channels.create({
                    name: '🎵-DJ봇-대기실',
                    type: ChannelType.GuildVoice,
                });
            }

            // 2. Text Channel setup
            let textChannel = guild.channels.cache.get(settings?.music_text_channel_id);
            if (!textChannel) {
                textChannel = await guild.channels.create({
                    name: 'dj봇-음악-제어',
                    type: ChannelType.GuildText,
                    topic: 'DJ봇 전용 음악 제어 채널입니다.',
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                        }
                    ],
                });
            }

            // 3. Panel Message setup
            const embed = createPanelEmbed();
            const buttons = createPanelButtons();
            
            let panelMessage;
            try {
                if (settings?.panel_message_id) {
                    panelMessage = await textChannel.messages.fetch(settings.panel_message_id);
                    await panelMessage.edit({ embeds: [embed], components: buttons });
                } else {
                    panelMessage = await textChannel.send({ embeds: [embed], components: buttons });
                }
            } catch (e) {
                panelMessage = await textChannel.send({ embeds: [embed], components: buttons });
            }

            // 4. Update DB
            await db.updateSettings(guild.id, {
                music_text_channel_id: textChannel.id,
                music_voice_channel_id: voiceChannel.id,
                panel_message_id: panelMessage.id
            });

            await interaction.editReply({ 
                content: `✅ 설정이 완료되었습니다!\n텍스트 채널: <#${textChannel.id}>\n음성 채널: <#${voiceChannel.id}>` 
            });

        } catch (error) {
            console.error('Setup Error:', error);
            await interaction.editReply({ content: '❌ 설정 중 오류가 발생했습니다. 권한을 확인해주세요.' });
        }
    }
};
