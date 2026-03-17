require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const player = require('./src/music/Player');
const db = require('./src/db/database');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const commands = [];
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

client.once(Events.ClientReady, async c => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
  
  try {
    await rest.put(
      Routes.applicationCommands(c.user.id),
      { body: commands },
    );
    console.log('Successfully registered application commands.');
  } catch (error) {
    console.error(error);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '명령어 실행 중 오류가 발생했습니다.', ephemeral: true });
    }
  }

  if (interaction.isButton()) {
    // Handle player buttons
    const queue = player.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: '현재 재생 중인 음악이 없습니다.', ephemeral: true });

    switch (interaction.customId) {
      case 'player_pause':
        if (queue.player.state.status === 'paused') {
          queue.player.unpause();
          await interaction.reply({ content: '▶️ 재개됨', ephemeral: true });
        } else {
          queue.player.pause();
          await interaction.reply({ content: '⏸️ 일시정지됨', ephemeral: true });
        }
        break;
      case 'player_skip':
        player.onSongEnd(interaction.guildId);
        await interaction.reply({ content: '⏭️ 건너뜀', ephemeral: true });
        break;
      case 'player_stop':
        queue.connection.destroy();
        player.queues.delete(interaction.guildId);
        await interaction.reply({ content: '⏹️ 정지됨', ephemeral: true });
        break;
      // Add more button handlers as needed
    }
  }
});

// Listener for dedicated music channel
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  
  const config = db.getGuildConfig(message.guildId);
  if (config && message.channelId === config.music_channel_id) {
    // Treat message content as a search query
    // This will be handled by a helper function to play music
    message.delete().catch(() => {});
    // Dummy execute for now
    interactionPlaceholder = { 
        guild: message.guild, 
        member: message.member, 
        channel: message.channel,
        options: { getString: () => message.content },
        reply: (msg) => message.channel.send(msg),
        followUp: (msg) => message.channel.send(msg)
    };
    const playCmd = client.commands.get('play');
    if (playCmd) playCmd.execute(interactionPlaceholder, true);
  }
});

client.login(process.env.DISCORD_TOKEN);
