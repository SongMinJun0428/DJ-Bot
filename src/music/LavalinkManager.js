const { Shoukaku, Connectors } = require('shoukaku');
const { Kazagumo, Plugins } = require('kazagumo');
const embeds = require('../utils/embeds');

const Nodes = [
  {
    name: 'Lavalink.lexis.host',
    url: 'lavalink.lexis.host:443',
    auth: 'lexishost',
    secure: true
  },
  {
    name: 'Serenetia',
    url: 'lavalink.serenetia.com:443',
    auth: 'https://seretia.link/discord',
    secure: true
  },
  {
    name: 'AjieDev',
    url: 'lava-v4.ajieblogs.eu.org:443',
    auth: 'https://dsc.gg/ajidevserver',
    secure: true
  }
];

class LavalinkManager {
  constructor(client) {
    this.client = client;
    this.embeds = embeds;
    
    const botId = client.user ? client.user.id : null;
    this.kazagumo = new Kazagumo({
      defaultSearchEngine: 'youtube',
      send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
      }
    }, new Connectors.DiscordJS(client), [], {
        id: botId, 
        moveOnDisconnect: true,
        resume: true,
        reconnectTries: 10,
        reconnectInterval: 5000
    });

    this.shoukaku = this.kazagumo.shoukaku;

    if (!this.shoukaku.id && botId) {
        console.log(`[v4.1.4] Force setting Shoukaku ID: ${botId}`);
        this.shoukaku.id = botId;
    }
    if (this.shoukaku.connector && !this.shoukaku.connector.id && botId) {
        this.shoukaku.connector.id = botId;
    }

    // Register nodes with short delay
    console.log(`[v4.1.4] Registering ${Nodes.length} nodes...`);
    Nodes.forEach((node, index) => {
        setTimeout(() => {
            try {
                this.shoukaku.addNode({
                    name: node.name,
                    url: node.url,
                    auth: node.auth,
                    secure: node.secure
                });
                console.log(`[v4.1.4] Node add call: ${node.name}`);
            } catch (e) {
                console.error(`[v4.1.4] Node error (${node.name}):`, e.message);
            }
        }, index * 1000); 
    });

    // Node Event Logs
    this.shoukaku.on('ready', (name) => console.log(`[v4.1.3] Node "${name}" is READY.`));
    this.shoukaku.on('error', (name, error) => {
        if (error.message && error.message.includes('429')) return; // Ignore 429 flood
        console.error(`[v4.1.3] Node "${name}" error: silent.`);
    });
    this.shoukaku.on('debug', (name, info) => {
        if (info.includes('Ready') || info.includes('Connect')) console.log(`[v4.1.3 DEBUG] Node "${name}": ${info}`);
    });
    
    this.kazagumo.on('playerStart', async (player, track) => {
        console.log(`[v4.1.3 AUDIO] Playing: ${track.title}`);
        // Consolidate UI Refresh in client.refreshMusicInterface
        setTimeout(() => {
            client.refreshMusicInterface(player.guildId, track);
        }, 1000);
    });

    this.kazagumo.on('playerEnd', (player) => {
        console.log('[v4.1.3 AUDIO] Track ended.');
    });

    this.kazagumo.on('playerEmpty', async (player) => {
        console.log('[v4.1.3 AUDIO] Queue empty');
        const guild = client.guilds.cache.get(player.guildId);
        const channel = guild ? guild.channels.cache.get(player.textId) : null;
        if (channel) channel.send('🎵 대기열이 비어있어 채널을 나갑니다. (v4.1.3)');
        // Final cleanup and dashboard return to bottom
        setTimeout(() => {
            client.refreshMusicInterface(player.guildId, null);
        }, 1500);
        player.destroy();
    });
  }
}

module.exports = LavalinkManager;
