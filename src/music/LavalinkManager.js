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
    name: 'Koolisw',
    host: 'lavalink.koolisw.com',
    port: 443,
    password: 'youshallnotpass',
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
        console.log(`[v4.0.8 AUDIO] Playing: ${track.title}`);
        const channel = client.channels.cache.get(player.textId);
        if (channel) {
            const config = db.getGuildConfig(player.guildId);
            const song = {
                title: track.title,
                url: track.uri,
                thumbnail: track.thumbnail || 'https://i.imgur.com/vHdfyC7.png',
                durationRaw: track.isStream ? 'LIVE' : new Date(track.length).toISOString().substr(11, 8),
                author: track.author,
                requester: track.requester
            };
            const npEmbed = embeds.createNowPlayingEmbed(song);
            const controls = embeds.createPlayerControlButtons();

            // 1. Try to Edit existing Now Playing
            let oldNp = null;
            if (config && config.now_playing_msg_id) {
                oldNp = await channel.messages.fetch(config.now_playing_msg_id).catch(() => null);
            }

            if (oldNp) {
                await oldNp.edit({ embeds: [npEmbed], components: [controls] }).catch(() => {
                    oldNp = null; // Reset if edit fails
                });
            }

            // 2. If no old message or edit failed, send new one
            if (!oldNp) {
                // Ensure dashboard is above
                await client.refreshDashboard(player.guildId);
                const newNp = await channel.send({ embeds: [npEmbed], components: [controls] });
                db.updateNowPlayingId(player.guildId, newNp.id);
            }
        }
    });

    this.kazagumo.on('playerEnd', (player) => {
        console.log('[v4.0.8 AUDIO] Track ended.');
    });

    this.kazagumo.on('playerEmpty', async (player) => {
        console.log('[v4.0.8 AUDIO] Queue empty');
        const channel = client.channels.cache.get(player.textId);
        const config = db.getGuildConfig(player.guildId);

        // Delete Now Playing on exit
        if (channel && config && config.now_playing_msg_id) {
            const oldNp = await channel.messages.fetch(config.now_playing_msg_id).catch(() => null);
            if (oldNp) await oldNp.delete().catch(() => {});
            db.updateNowPlayingId(player.guildId, null);
        }

        if (channel) channel.send('🎵 대기열이 비어있어 채널을 나갑니다. (v4.0.8)');
        player.destroy();
        
        // Final Dashboard Refresh (to bottom)
        setTimeout(() => {
            client.refreshDashboard(player.guildId);
        }, 2000);
    });
  }
}

module.exports = LavalinkManager;
