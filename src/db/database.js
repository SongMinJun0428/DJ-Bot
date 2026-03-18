const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'db', 'bot_data.db');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    UNIQUE(user_id, name)
  );

  CREATE TABLE IF NOT EXISTS playlist_songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    FOREIGN KEY (playlist_id) REFERENCES playlists (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS guild_config (
    guild_id TEXT PRIMARY KEY,
    music_channel_id TEXT,
    dashboard_msg_id TEXT,
    now_playing_msg_id TEXT
  );
`);

module.exports = {
  // Playlist functions
  createPlaylist: (userId, name) => {
    try {
      const stmt = db.prepare('INSERT INTO playlists (user_id, name) VALUES (?, ?)');
      return stmt.run(userId, name);
    } catch (e) {
      return null;
    }
  },
  
  addSongToPlaylist: (playlistId, title, url) => {
    const stmt = db.prepare('INSERT INTO playlist_songs (playlist_id, title, url) VALUES (?, ?, ?)');
    return stmt.run(playlistId, title, url);
  },

  getPlaylists: (userId) => {
    return db.prepare('SELECT * FROM playlists WHERE user_id = ?').all(userId);
  },

  getPlaylistSongs: (playlistId) => {
    return db.prepare('SELECT * FROM playlist_songs WHERE playlist_id = ?').all(playlistId);
  },

  // Guild config functions
  setGuildConfig: (guildId, channelId, dashboardMsgId, nowPlayingMsgId = null) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO guild_config (guild_id, music_channel_id, dashboard_msg_id, now_playing_msg_id) VALUES (?, ?, ?, ?)');
    return stmt.run(guildId, channelId, dashboardMsgId, nowPlayingMsgId);
  },

  getGuildConfig: (guildId) => {
    return db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
  },

  updateNowPlayingId: (guildId, nowPlayingMsgId) => {
    const stmt = db.prepare('UPDATE guild_config SET now_playing_msg_id = ? WHERE guild_id = ?');
    return stmt.run(nowPlayingMsgId, guildId);
  }
};
