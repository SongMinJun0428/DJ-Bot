const MusicPlayer = require('./player');

class MusicManager {
    constructor(client) {
        this.client = client;
        this.players = new Map();
    }

    getPlayer(guildId) {
        if (!this.players.has(guildId)) {
            this.players.set(guildId, new MusicPlayer(guildId, this.client));
        }
        return this.players.get(guildId);
    }

    removePlayer(guildId) {
        const player = this.players.get(guildId);
        if (player) {
            player.destroy();
            this.players.delete(guildId);
        }
    }
}

module.exports = MusicManager;
