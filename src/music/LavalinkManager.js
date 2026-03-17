const { Shoukaku, Connectors } = require('shoukaku');
const { Kazagumo, Plugins } = require('kazagumo');
const embeds = require('../utils/embeds');

const Nodes = [
  {
    name: 'LexisHost',
    host: 'lavalink.lexis.host',
    port: 443,
    password: 'lexishostlavalink',
    secure: true
  },
  {
    name: 'Serenetia',
    host: 'lavalinkv4.serenetia.com',
    port: 443,
    password: 'https://seretia.link/discord',
    secure: true
  },
  {
    name: 'Jirayu',
    host: 'lavalink.jirayu.net',
    port: 443,
    password: 'youshallnotpass',
    secure: true
  },
  {
    name: 'Muzykant',
    host: 'lavalink_v4.muzykant.xyz',
    port: 443,
    password: 'https://discord.gg/v6sdrD9kPh',
    secure: true
  },
  {
    name: 'Lavalink.pw',
    host: 'v4.lavalink.pw',
    port: 443,
    password: 'youshallnotpass',
    secure: true
  },
  {
    name: 'Shadow',
    host: 'lavalink.shadowit.ro',
    port: 443,
    password: 'youshallnotpass',
    secure: true
  }
];

class LavalinkManager {
  constructor(client) {
    this.client = client;
    
    console.log('[v3.1.4] Initializing Kazagumo with Shoukaku v4...');
    
    this.kazagumo = new Kazagumo({
      defaultSearchEngine: 'youtube',
      send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
      }
    }, new Connectors.DiscordJS(client), Nodes, {
        moveOnDisconnect: true,
        resume: true,
        reconnectTries: 5
    });

    this.shoukaku = this.kazagumo.shoukaku;
    console.log(`[v3.1.4] Initialization complete. Nodes detected: ${this.shoukaku.nodes.size}`);

    // Node Event Logs
    this.shoukaku.on('ready', (name) => console.log(`[v3.1.4] Node "${name}" is READY.`));
    this.shoukaku.on('error', (name, error) => console.error(`[v3.1.4] Node "${name}" error:`, error));
    this.shoukaku.on('debug', (name, info) => {
        if (info.includes('Ready')) console.log(`[v3.1.4 DEBUG] Node "${name}": ${info}`);
    });
    
    this.kazagumo.on('playerStart', (player, track) => {
        console.log(`[v3.1.4 AUDIO] Playing: ${track.title}`);
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
        console.log('[v3.1.4 AUDIO] Track ended.');
    });

    this.kazagumo.on('playerEmpty', (player) => {
        console.log('[v3.1.4 AUDIO] Queue empty, leaving channel.');
        const channel = client.channels.cache.get(player.textId);
        if (channel) channel.send('🎵 대기열이 비어있어 채널을 나갑니다. (v3.1.4)');
        player.destroy();
    });
  }
}

module.exports = LavalinkManager;
