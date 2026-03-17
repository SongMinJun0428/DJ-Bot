const { Shoukaku, Connectors } = require('shoukaku');
const { Kazagumo, Plugins } = require('kazagumo');

const Nodes = [
  {
    name: 'Moonlight (Public)',
    url: 'lavalink.heavencloud.in:443',
    auth: 'youshallnotpass',
    secure: true
  },
  {
      name: 'Ajie (Public)',
      url: 'lavalink.ajie.top:443',
      auth: 'ajie.top',
      secure: true
  }
];

class LavalinkManager {
  constructor(client) {
    this.client = client;
    this.shoukaku = new Shoukaku(new Connectors.DiscordJS(client), Nodes, {
      moveOnDisconnect: true,
      resume: true,
      reconnectInterval: 5000,
      reconnectTries: 10
    });

    this.kazagumo = new Kazagumo({
      defaultSearchEngine: 'youtube',
      send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
      }
    }, new Connectors.DiscordJS(client), Nodes);

    this.kazagumo.shoukaku.on('ready', (name) => console.log(`[v2.9.0 LAVALINK] Node "${name}" is now connected. (TCP-UDP Bridge Active)`));
    this.kazagumo.shoukaku.on('error', (name, error) => console.error(`[v2.9.0 LAVALINK] Node "${name}" error:`, error));
    
    // Player Events
    this.kazagumo.on('playerStart', (player, track) => {
        console.log(`[v2.9.0 AUDIO] Playing: ${track.title}`);
    });

    this.kazagumo.on('playerEnd', (player) => {
        console.log('[v2.9.0 AUDIO] Track ended.');
    });

    this.kazagumo.on('playerEmpty', (player) => {
        console.log('[v2.9.0 AUDIO] Queue empty, leaving channel.');
        player.destroy();
    });
  }
}

module.exports = LavalinkManager;
