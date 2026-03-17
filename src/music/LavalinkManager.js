const { Shoukaku, Connectors } = require('shoukaku');
const { Kazagumo, Plugins } = require('kazagumo');
const embeds = require('../utils/embeds');

const Nodes = [
  {
    name: 'LexisHost (v4)',
    url: 'lavalink.lexis.host:443',
    auth: 'lexishostlavalink',
    secure: true
  },
  {
    name: 'Serenetia (v4)',
    url: 'lavalinkv4.serenetia.com:443',
    auth: 'https://seretia.link/discord',
    secure: true
  },
  {
    name: 'Jirayu (v4)',
    url: 'lavalink.jirayu.net:443',
    auth: 'youshallnotpass',
    secure: true
  },
  {
    name: 'Muzykant (v4)',
    url: 'lavalink_v4.muzykant.xyz:443',
    auth: 'https://discord.gg/v6sdrD9kPh',
    secure: true
  },
  {
    name: 'Lavalink.pw (v4)',
    url: 'v4.lavalink.pw:443',
    auth: 'youshallnotpass',
    secure: true
  },
  {
    name: 'Shadow (v4)',
    url: 'lavalink.shadowit.ro:443',
    auth: 'youshallnotpass',
    secure: true
  }
];

class LavalinkManager {
  constructor(client) {
    this.client = client;
    
    console.log('[v3.1.2] Starting Lavalink initialization...');
    
    // Kazagumo v3 wraps Shoukaku v4 internally when initialized this way
    this.kazagumo = new Kazagumo({
      defaultSearchEngine: 'youtube',
      send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
      }
    }, new Connectors.DiscordJS(client), Nodes);

    console.log(`[v3.1.2] Kazagumo instance created. Connecting to ${Nodes.length} nodes: ${Nodes.map(n => n.name).join(', ')}`);

    // Node Event Logs
    this.kazagumo.shoukaku.on('ready', (name) => console.log(`[v3.1.2] Node "${name}" is READY. (Audio Bypass Active)`));
    this.kazagumo.shoukaku.on('error', (name, error) => console.error(`[v3.1.2] Node "${name}" error:`, error));
    this.kazagumo.shoukaku.on('debug', (name, info) => {
        console.log(`[v3.1.2 DEBUG] Node "${name}": ${info}`);
    });
    
    this.kazagumo.on('playerStart', (player, track) => {
        console.log(`[v3.1.2 AUDIO] Playing: ${track.title}`);
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
        console.log('[v3.1.2 AUDIO] Track ended.');
    });

    this.kazagumo.on('playerEmpty', (player) => {
        console.log('[v3.1.2 AUDIO] Queue empty, leaving channel.');
        const channel = client.channels.cache.get(player.textId);
        if (channel) channel.send('🎵 대기열이 비어있어 채널을 나갑니다. (v3.1.2)');
        player.destroy();
    });
  }
}

module.exports = LavalinkManager;
