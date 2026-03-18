const { Shoukaku, Connectors } = require('shoukaku');
const { Kazagumo, Plugins } = require('kazagumo');
const embeds = require('../utils/embeds');

const Nodes = [
  {
    name: 'Serenetia',
    host: 'lavalinkv4.serenetia.com',
    port: 443,
    password: 'https://seretia.link/discord',
    secure: true
  },
  {
    name: 'AjieDev',
    host: 'lava-v4.ajieblogs.eu.org',
    port: 443,
    password: 'https://dsc.gg/ajidevserver',
    secure: true
  }
];

class LavalinkManager {
  constructor(client) {
    this.client = client;
    this.embeds = embeds;
    
    const botId = client.user ? client.user.id : null;
    console.log(`[v4.0.4] Initializing Kazagumo. Bot ID: ${botId}`);
    
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
        reconnectTries: 5
    });

    this.shoukaku = this.kazagumo.shoukaku;
    
    if (!this.shoukaku.id && botId) {
        console.log(`[v4.0.4] Force setting Shoukaku ID: ${botId}`);
        this.shoukaku.id = botId;
    }
    if (this.shoukaku.connector && !this.shoukaku.connector.id && botId) {
        this.shoukaku.connector.id = botId;
    }

    // Register nodes with delay to prevent 429
    console.log(`[v4.0.4] Registering ${Nodes.length} nodes (2s intervals)...`);
    console.log(`[v4.0.5] Registering ${Nodes.length} nodes (2s intervals)...`);
    console.log(`[v4.0.6] Registering ${Nodes.length} nodes (2s intervals)...`);
    Nodes.forEach((node, index) => {
        setTimeout(() => {
            try {
                this.shoukaku.addNode({
                    name: node.name,
                    host: node.host,
                    port: node.port,
                    password: node.password,
                    secure: node.secure,
                    auth: node.password,
                    url: `${node.host}:${node.port}`
                });
                console.log(`[v4.0.6] Added node: ${node.name}`);
            } catch (e) {
                console.error(`[v4.0.6] Node error (${node.name}):`, e.message);
            }
        }, (index + 1) * 2000); 
    });

    // Node Event Logs
    this.shoukaku.on('ready', (name) => console.log(`[v4.0.6] Node "${name}" is READY.`));
    this.shoukaku.on('error', (name, error) => {
        if (error.message && error.message.includes('429')) return; // Ignore 429 flood
        console.error(`[v4.0.6] Node "${name}" error: silent.`);
    });
    this.shoukaku.on('debug', (name, info) => {
        if (info.includes('Ready') || info.includes('Connect')) console.log(`[v4.0.6 DEBUG] Node "${name}": ${info}`);
    });
    
    this.kazagumo.on('playerStart', async (player, track) => {
        console.log(`[v4.0.9 AUDIO] Playing: ${track.title}`);
        // Consolidate UI Refresh in client.refreshMusicInterface
        setTimeout(() => {
            client.refreshMusicInterface(player.guildId, track);
        }, 1000);
    });

    this.kazagumo.on('playerEnd', (player) => {
        console.log('[v4.0.9 AUDIO] Track ended.');
    });

    this.kazagumo.on('playerEmpty', async (player) => {
        console.log('[v4.0.9 AUDIO] Queue empty');
        // Final cleanup and dashboard return to bottom
        setTimeout(() => {
            client.refreshMusicInterface(player.guildId, null);
        }, 1500);
        player.destroy();
    });
  }
}

module.exports = LavalinkManager;
