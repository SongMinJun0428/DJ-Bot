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
    name: 'AjieDev SSL',
    url: 'lavalinkv4.serenetia.com:443',
    auth: 'https://seretia.link/discord',
    secure: true
  },
  {
    name: 'AjieDev No-SSL',
    url: 'lava-v4.ajieblogs.eu.org:80',
    auth: 'https://seretia.link/discord',
    secure: false
  },
  {
    name: 'DivaHost',
    url: 'lavalink.divahost.net:60002',
    auth: 'divahostv4',
    secure: false
  },
  {
    name: 'Backup-Node',
    url: 'lavalink.oops.wtf:443',
    auth: 'www.oops.wtf',
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
        const db = require('../db/database');
        
        // Track for Autoplay
        player.previousTrack = track;
        
        // Record Recently Played
        db.addRecent(player.guildId, track.requester.id, track.title, track.uri);

        // UI Refresh
        setTimeout(() => {
            client.refreshMusicInterface(player.guildId, track);
        }, 1000);
    });

    this.kazagumo.on('playerEnd', (player) => {
        console.log('[v4.1.3 AUDIO] Track ended.');
    });

    this.kazagumo.on('playerEmpty', async (player) => {
        console.log('[v4.1.5 AUDIO] Queue empty');
        const db = require('../db/database');
        const config = db.getGuildConfig(player.guildId);
        
        // 1. AUTOPLAY LOGIC (Default to ON if config missing or explicitly set to 1)
        const isAutoplayEnabled = (config?.autoplay ?? 1) === 1;

        if (isAutoplayEnabled && player.previousTrack) {
            const lastTrack = player.previousTrack;
            const channel = client.channels.cache.get(player.textId);
            
            if (channel) {
                const searchMsg = await channel.send('✨ 대기열이 비어있습니다. **자동 추천 곡**을 검색하는 중...');
                
                // Advanced search: Try artist mix first, then title mix
                const queries = [
                    `ytsearch:${lastTrack.author} ${lastTrack.title} mix`,
                    `ytsearch:${lastTrack.author} top tracks`,
                    `ytsearch:${lastTrack.title} related`
                ];

                let nextTrack = null;
                for (const query of queries) {
                    try {
                        const result = await this.kazagumo.search(query, { requester: client.user });
                        if (result && result.tracks.length > 0) {
                            // Find a track that isn't the one that just ended
                            nextTrack = result.tracks.find(t => t.uri !== lastTrack.uri && t.title !== lastTrack.title) || result.tracks[0];
                            if (nextTrack) break;
                        }
                    } catch (e) {
                        console.error(`[v4.1.5] Autoplay Search Error (${query}):`, e.message);
                    }
                }
                
                if (nextTrack) {
                    player.queue.add(nextTrack);
                    // Slight delay to ensure player state is ready
                    setTimeout(() => {
                        if (player.queue.length > 0) player.play();
                    }, 500);
                    
                    await searchMsg.edit(`✨ [${nextTrack.title}] 곡을 자동 추천 시스템이 찾아냈습니다! 🎶`).catch(() => {});
                    setTimeout(() => searchMsg.delete().catch(() => {}), 5000);
                    return; // EXIT playerEmpty - keep player alive
                } else {
                    await searchMsg.edit('❌ 더 이상 추천할 만한 곡을 찾지 못했습니다.').catch(() => {});
                    setTimeout(() => searchMsg.delete().catch(() => {}), 3000);
                }
            }
        }

        const guild = client.guilds.cache.get(player.guildId);
        const channel = guild ? guild.channels.cache.get(player.textId) : null;
        if (channel) {
            const emptyMsg = await channel.send('🎵 대기열이 비어있어 채널을 나갑니다.');
            setTimeout(() => {
                emptyMsg.delete().catch(() => {});
            }, 60000);
        }
        
        setTimeout(() => {
            client.refreshMusicInterface(player.guildId, null);
        }, 1500);
        player.destroy();
    });
  }
}

module.exports = LavalinkManager;
