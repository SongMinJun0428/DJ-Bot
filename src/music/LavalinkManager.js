const { Shoukaku, Connectors } = require('shoukaku');
const { Kazagumo, Plugins } = require('kazagumo');
const embeds = require('../utils/embeds');

const Nodes = [
  {
    name: 'Lexis Host (Stable)',
    url: 'lavalink.lexis.host:443',
    auth: 'lexishost',
    secure: true
  },
  {
    name: 'Lava Link (Permissive)',
    url: 'lava.link:443',
    auth: 'anything',
    secure: true
  },
  {
    name: 'Serenetia SSL',
    url: 'lavalinkv4.serenetia.com:443',
    auth: 'https://seretia.link/discord',
    secure: true
  },
  {
    name: 'Oops WTF (Backup)',
    url: 'lavalink.oops.wtf:443',
    auth: 'www.oops.wtf',
    secure: true
  },
  {
    name: 'DivaHost',
    url: 'lavalink.divahost.net:60002',
    auth: 'divahostv4',
    secure: false
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
        console.log(`[v4.2.1 AUDIO] Force setting Shoukaku ID: ${botId}`);
        this.shoukaku.id = botId;
    }
    if (this.shoukaku.connector && !this.shoukaku.connector.id && botId) {
        this.shoukaku.connector.id = botId;
    }

    // Register nodes with short delay
    console.log(`[v4.2.1] Registering ${Nodes.length} nodes...`);
    Nodes.forEach((node, index) => {
        setTimeout(() => {
            try {
                this.shoukaku.addNode({
                    name: node.name,
                    url: node.url,
                    auth: node.auth,
                    secure: node.secure
                });
                console.log(`[v4.2.1] Node add call: ${node.name}`);
            } catch (e) {
                console.error(`[v4.2.1] Node error (${node.name}):`, e.message);
            }
        }, index * 1000); 
    });

    // Node Event Logs
    this.shoukaku.on('ready', (name) => console.log(`[v4.2.1] Node "${name}" is READY.`));
    this.shoukaku.on('error', (name, error) => {
        if (error.message && error.message.includes('429')) return; // Ignore 429 flood
        console.error(`[v4.2.1] Node "${name}" error: silent.`);
    });
    this.shoukaku.on('debug', (name, info) => {
        if (info.includes('Ready') || info.includes('Connect')) console.log(`[v4.2.1 DEBUG] Node "${name}": ${info}`);
    });
    
    this.kazagumo.on('playerStart', async (player, track) => {
        console.log(`[v4.2.1 AUDIO] Playing: ${track.title}`);
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
        console.log('[v4.2.1 AUDIO] Track ended.');
    });

    this.kazagumo.on('playerEmpty', async (player) => {
        console.log(`[v4.2.1 AUTOPLAY] Queue empty in guild: ${player.guildId}`);
        const db = require('../db/database');
        const config = db.getGuildConfig(player.guildId);
        
        console.log(`[v4.2.1 AUTOPLAY] Triggering UI refresh...`);
        this.client.refreshMusicInterface(player.guildId, null);

        // 2. Autoplay Core Logic (Decoupled from messaging)
        const isAutoplayEnabled = (config?.autoplay ?? 1) === 1;
        
        if (isAutoplayEnabled) {
            console.log(`[v4.2.0 AUTOPLAY] Searching for recommendations...`);
            
            // Try to find a seed for recommendations
            const lastTrack = player.previousTrack;
            const seedQuery = lastTrack ? `${lastTrack.author} ${lastTrack.title}` : "인기 노래";
            
            const queries = [
                `ytsearch:${seedQuery} mix`,
                `ytmsearch:${seedQuery} related`,
                `ytsearch:popular music 2026`
            ];

            let nextTrack = null;
            for (const query of queries) {
                try {
                    const result = await this.kazagumo.search(query, { requester: this.client.user });
                    if (result && result.tracks.length > 0) {
                        // Avoid playing the exact same song if possible
                        nextTrack = result.tracks.find(t => lastTrack ? (t.uri !== lastTrack.uri) : true) || result.tracks[0];
                        if (nextTrack) break;
                    }
                } catch (e) {
                    console.error(`[v4.2.0 AUTOPLAY] Search error (${query}):`, e.message);
                }
            }

            if (nextTrack) {
                console.log(`[v4.2.0 AUTOPLAY] Success! Found: ${nextTrack.title}`);
                player.queue.add(nextTrack);
                
                // Optional: Send notification if channel exists
                const channel = await this.client.channels.fetch(player.textId).catch(() => null);
                if (channel) {
                    const msg = await channel.send(`✨ **자동 추천:** [${nextTrack.title}] 곡을 재생합니다.`);
                    setTimeout(() => msg.delete().catch(() => {}), 10000);
                }

                // Small delay to ensure state sync before play
                setTimeout(async () => {
                    try {
                        if (player.queue.length > 0 && !player.playing) {
                            await player.play();
                        }
                    } catch (err) {
                        console.error(`[v4.2.0 AUTOPLAY] Play starting error:`, err.message);
                    }
                }, 1000);
                return; // EXIT - Autoplay managed to find a song, do NOT destroy player
            }
        }

        // 3. Grace Period & Destruction (Only if Autoplay is OFF or FAILED to find songs)
        console.log(`[v4.2.0 AUTOPLAY] No further tracks. Entering 10s grace period...`);
        
        // Set a "Waiting" UI state if possible
        const guild = this.client.guilds.cache.get(player.guildId);
        const channel = await this.client.channels.fetch(player.textId).catch(() => null);
        
        if (channel) {
            const waitMsg = await channel.send('🎵 **대기열이 비었습니다.** 새로운 곡이 없으면 10초 뒤에 퇴장합니다.');
            setTimeout(() => waitMsg.delete().catch(() => {}), 10000);
        }

        // Final destruction timeout
        setTimeout(() => {
            // Check one last time if someone added a song in the meantime
            const currentPlayer = this.kazagumo.players.get(player.guildId);
            if (currentPlayer && currentPlayer.queue.length === 0 && !currentPlayer.playing) {
                console.log(`[v4.2.0 AUTOPLAY] Grace period ended. Destroying player for guild: ${player.guildId}`);
                currentPlayer.destroy();
                this.client.refreshMusicInterface(player.guildId, null);
            } else {
                console.log(`[v4.2.0 AUTOPLAY] Destruction cancelled: Player is active or queue is full.`);
            }
        }, 10000);
    });
  }
}

module.exports = LavalinkManager;
