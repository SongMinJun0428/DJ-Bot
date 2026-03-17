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
    
    const botId = client.user ? client.user.id : null;
    console.log(`[v3.1.7] Initializing Kazagumo. Bot ID: ${botId}`);
    
    this.kazagumo = new Kazagumo({
      defaultSearchEngine: 'youtube',
      send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
      }
    }, new Connectors.DiscordJS(client), [], { // Start with empty array
        id: botId, 
        moveOnDisconnect: true,
        resume: true,
        reconnectTries: 5
    });

    this.shoukaku = this.kazagumo.shoukaku;

    // Manually add nodes now that Shoukaku has the ID
    console.log(`[v3.1.7] Manually registering ${Nodes.length} nodes...`);
    Nodes.forEach(node => {
        try {
            // Use all possible field names for compatibility
            const nodeConfig = {
                name: node.name,
                host: node.host,
                port: node.port,
                password: node.password,
                secure: node.secure,
                auth: node.password,
                url: `${node.host}:${node.port}`
            };
            this.shoukaku.addNode(nodeConfig);
            console.log(`[v3.1.7] Node registration requested: ${node.name}`);
        } catch (e) {
            console.error(`[v3.1.7] Node add error (${node.name}):`, e.message);
        }
    });

    console.log(`[v3.1.7] Initialization complete. Nodes in Map: ${this.shoukaku.nodes.size}`);

    // Node Event Logs
    this.shoukaku.on('ready', (name) => console.log(`[v3.1.7] Node "${name}" is READY.`));
    this.shoukaku.on('error', (name, error) => console.error(`[v3.1.7] Node "${name}" error:`, error));
    this.shoukaku.on('debug', (name, info) => {
        if (info.includes('Ready') || info.includes('Connect')) console.log(`[v3.1.7 DEBUG] Node "${name}": ${info}`);
    });
    
    this.kazagumo.on('playerStart', (player, track) => {
        console.log(`[v3.1.7 AUDIO] Playing: ${track.title}`);
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
        console.log('[v3.1.7 AUDIO] Track ended.');
    });

    this.kazagumo.on('playerEmpty', (player) => {
        console.log('[v3.1.7 AUDIO] Queue empty, leaving channel.');
        const channel = client.channels.cache.get(player.textId);
        if (channel) channel.send('🎵 대기열이 비어있어 채널을 나갑니다. (v3.1.7)');
        player.destroy();
    });
  }
}

module.exports = LavalinkManager;
