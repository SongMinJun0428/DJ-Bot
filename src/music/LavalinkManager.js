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
        console.log(`[v4.2.0 AUDIO] Force setting Shoukaku ID: ${botId}`);
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
        console.log(`[v4.2.0 AUTOPLAY] Queue empty in guild: ${player.guildId}`);
        const db = require('../db/database');
        const config = db.getGuildConfig(player.guildId);
        
        // 1. AUTOPLAY LOGIC (Explicit check with default ON)
        const isAutoplayEnabled = (config?.autoplay ?? 1) === 1;
        console.log(`[v4.1.6 AUTOPLAY] Status: ${isAutoplayEnabled ? 'ENABLED' : 'DISABLED'}`);

        if (isAutoplayEnabled && player.previousTrack) {
            const lastTrack = player.previousTrack;
            console.log(`[v4.1.6 AUTOPLAY] Last track: ${lastTrack.title} (${lastTrack.author})`);

            // Robust Channel Fetching
            let channel = this.client.channels.cache.get(player.textId);
            if (!channel) {
                console.log(`[v4.1.6 AUTOPLAY] Channel not in cache, fetching: ${player.textId}`);
                channel = await this.client.channels.fetch(player.textId).catch(() => null);
            }
            
            if (channel) {
                const searchMsg = await channel.send('✨ 대기열이 비어있습니다. **자동 추천 곡**을 검색하는 중...');
                
                // Diversified search strategy
                const queries = [
                    `ytsearch:${lastTrack.author} ${lastTrack.title} mix`,
                    `ytmsearch:${lastTrack.author} top tracks`, // YouTube Music fallback
                    `ytsearch:${lastTrack.title} related`
                ];

                let nextTrack = null;
                for (const query of queries) {
                    try {
                        console.log(`[v4.1.6 AUTOPLAY] Searching query: ${query}`);
                        const result = await this.kazagumo.search(query, { requester: this.client.user });
                        if (result && result.tracks.length > 0) {
                            nextTrack = result.tracks.find(t => t.uri !== lastTrack.uri && t.title !== lastTrack.title) || result.tracks[0];
                            if (nextTrack) {
                                console.log(`[v4.1.6 AUTOPLAY] Found: ${nextTrack.title}`);
                                break;
                            }
                        }
                    } catch (e) {
                        console.error(`[v4.1.6 AUTOPLAY] Search error (${query}):`, e.message);
                    }
                }
                
                if (nextTrack) {
                    player.queue.add(nextTrack);
                    
                    // Controlled delay to ensure player and node state sync
                    setTimeout(async () => {
                        try {
                            if (player.queue.length > 0) {
                                await player.play();
                                console.log(`[v4.1.6 AUTOPLAY] Success: Play started.`);
                            }
                        } catch (err) {
                            console.error(`[v4.1.6 AUTOPLAY] Play call error:`, err.message);
                        }
                    }, 1000);
                    
                    await searchMsg.edit(`✨ [${nextTrack.title}] 곡을 자동 추천 시스템이 찾아냈습니다! 🎶`).catch(() => {});
                    setTimeout(() => searchMsg.delete().catch(() => {}), 10000);
                    return; // EXIT - Keep player alive
                } else {
                    console.log(`[v4.1.6 AUTOPLAY] Failure: No tracks found.`);
                    await searchMsg.edit('❌ 더 이상 추천할 만한 곡을 찾지 못했습니다.').catch(() => {});
                    setTimeout(() => searchMsg.delete().catch(() => {}), 5000);
                }
            } else {
                console.error(`[v4.1.6 AUTOPLAY] Error: Could not find channel ${player.textId}`);
            }
        }

        // Cleanup if Autoplay fails or is disabled
        const guild = this.client.guilds.cache.get(player.guildId);
        const channel = guild ? guild.channels.cache.get(player.textId) : null;
        if (channel) {
            const emptyMsg = await channel.send('🎵 대기열이 비어있어 플레이어를 종료합니다.');
            setTimeout(() => emptyMsg.delete().catch(() => {}), 30000);
        }
        
        setTimeout(() => {
            this.client.refreshMusicInterface(player.guildId, null);
        }, 1500);
        player.destroy();
    });
  }
}

module.exports = LavalinkManager;
