const { Shoukaku, Connectors } = require('shoukaku');
const { Kazagumo, Plugins } = require('kazagumo');
const embeds = require('../utils/embeds');

const Nodes = [
  {
    name: 'Serenetia (Public)',
    url: 'lavalinkv4.serenetia.com:443',
    auth: 'https://seretia.link/discord',
    secure: true
  },
  {
    name: 'Jirayu (Public)',
    url: 'lavalink.jirayu.net:443',
    auth: 'youshallnotpass',
    secure: true
  }
];

class LavalinkManager {
  constructor(client) {
    this.client = client;
    
    // Kazagumo v3 wraps Shoukaku v4 internally when initialized this way
    this.kazagumo = new Kazagumo({
      defaultSearchEngine: 'youtube',
      send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
      }
    }, new Connectors.DiscordJS(client), Nodes);

    // Node Event Logs
    this.kazagumo.shoukaku.on('ready', (name) => console.log(`[v2.9.2] Node "${name}" is READY. Bridge established.`));
    this.kazagumo.shoukaku.on('error', (name, error) => console.error(`[v2.9.2] Node "${name}" connection error:`, error));
    this.kazagumo.shoukaku.on('debug', (name, info) => console.log(`[v2.9.2 DEBUG] Node "${name}": ${info}`));
    
    this.kazagumo.on('playerStart', (player, track) => {
        console.log(`[v2.9.0 AUDIO] Playing: ${track.title}`);
        const channel = client.channels.cache.get(player.textId);
        if (channel) {
            const song = {
                title: track.title,
                url: track.uri,
                thumbnail: track.thumbnail || 'https://i.imgur.com/vHdfyC7.png',
                durationRaw: track.isStream ? 'LIVE' : new Date(track.length).toISOString().substr(11, 8),
                author: track.author
            };
            const npEmbed = embeds.createNowPlayingEmbed(song);
            const controls = embeds.createPlayerControlButtons();
            channel.send({ embeds: [npEmbed], components: [controls] });
        }
    });

    this.kazagumo.on('playerEnd', (player) => {
        console.log('[v2.9.0 AUDIO] Track ended.');
    });

    this.kazagumo.on('playerEmpty', (player) => {
        console.log('[v2.9.0 AUDIO] Queue empty, leaving channel.');
        const channel = client.channels.cache.get(player.textId);
        if (channel) channel.send('🎵 대기열이 비어있어 채널을 나갑니다.');
        player.destroy();
    });
  }
}

module.exports = LavalinkManager;
