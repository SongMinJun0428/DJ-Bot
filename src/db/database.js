const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'db', 'bot_data.db');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    duration TEXT,
    UNIQUE(user_id, url)
  );

  CREATE TABLE IF NOT EXISTS request_stats (
    guild_id TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    PRIMARY KEY(guild_id, url)
  );

  CREATE TABLE IF NOT EXISTS recently_played (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS guild_config (
    guild_id TEXT PRIMARY KEY,
    music_channel_id TEXT,
    dashboard_msg_id TEXT,
    now_playing_msg_id TEXT,
    autoplay INTEGER DEFAULT 1
  );

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
    FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
  );
`);

module.exports = {
  // Favorites functions
  addFavorite: (userId, title, url, duration) => {
    try {
      const stmt = db.prepare('INSERT OR IGNORE INTO favorites (user_id, title, url, duration) VALUES (?, ?, ?, ?)');
      return stmt.run(userId, title, url, duration);
    } catch (e) { return null; }
  },

  getFavorites: (userId) => {
    return db.prepare('SELECT * FROM favorites WHERE user_id = ? ORDER BY id DESC').all(userId);
  },

  // Stats functions
  incrementStat: (guildId, url, title) => {
    const stmt = db.prepare(`
      INSERT INTO request_stats (guild_id, url, title, count) 
      VALUES (?, ?, ?, 1)
      ON CONFLICT(guild_id, url) DO UPDATE SET count = count + 1
    `);
    return stmt.run(guildId, url, title);
  },

  getTopSongs: (guildId) => {
    return db.prepare('SELECT * FROM request_stats WHERE guild_id = ? ORDER BY count DESC LIMIT 10').all(guildId);
  },

  // Recently Played functions
  addRecent: (guildId, userId, title, url) => {
    const stmt = db.prepare('INSERT INTO recently_played (guild_id, user_id, title, url) VALUES (?, ?, ?, ?)');
    stmt.run(guildId, userId, title, url);
    db.prepare('DELETE FROM recently_played WHERE id IN (SELECT id FROM recently_played WHERE guild_id = ? ORDER BY id DESC LIMIT -1 OFFSET 50)').run(guildId);
  },

  getRecentlyPlayed: (guildId) => {
    return db.prepare('SELECT * FROM recently_played WHERE guild_id = ? ORDER BY id DESC LIMIT 10').all(guildId);
  },

  // Queue to Playlist function
  saveQueueAsPlaylist: (userId, playlistName, tracks) => {
    const createPlaylist = db.prepare('INSERT INTO playlists (user_id, name) VALUES (?, ?)');
    const addSong = db.prepare('INSERT INTO playlist_songs (playlist_id, title, url) VALUES (?, ?, ?)');
    
    const transaction = db.transaction((userId, name, trackList) => {
      const resp = createPlaylist.run(userId, name);
      const playlistId = resp.lastInsertRowid;
      for (const track of trackList) {
        addSong.run(playlistId, track.title, track.uri || track.url);
      }
      return playlistId;
    });

    try {
      return transaction(userId, playlistName, tracks);
    } catch (e) {
      console.error('Save Queue Error:', e);
      return null;
    }
  },

  // Playlist functions
  getPlaylists: (userId) => {
    return db.prepare('SELECT * FROM playlists WHERE user_id = ?').all(userId);
  },

  createPlaylist: (userId, name) => {
    try {
      const stmt = db.prepare('INSERT INTO playlists (user_id, name) VALUES (?, ?)');
      return stmt.run(userId, name);
    } catch (e) { return null; }
  },

  addSongToPlaylist: (playlistId, title, url) => {
    try {
      const stmt = db.prepare('INSERT INTO playlist_songs (playlist_id, title, url) VALUES (?, ?, ?)');
      return stmt.run(playlistId, title, url);
    } catch (e) { return null; }
  },

  getPlaylistSongs: (playlistId) => {
    return db.prepare('SELECT * FROM playlist_songs WHERE playlist_id = ?').all(playlistId);
  },

  // Guild config functions
  setGuildConfig: (guildId, channelId, dashboardMsgId, nowPlayingMsgId = null) => {
    const stmt = db.prepare('INSERT INTO guild_config (guild_id, music_channel_id, dashboard_msg_id, now_playing_msg_id) VALUES (?, ?, ?, ?) ON CONFLICT(guild_id) DO UPDATE SET music_channel_id=excluded.music_channel_id, dashboard_msg_id=excluded.dashboard_msg_id, now_playing_msg_id=excluded.now_playing_msg_id');
    return stmt.run(guildId, channelId, dashboardMsgId, nowPlayingMsgId);
  },

  setAutoplay: (guildId, enabled) => {
    // Upsert logic: If row exists, update autoplay. If not, insert with default values but specific autoplay.
    const stmt = db.prepare(`
      INSERT INTO guild_config (guild_id, autoplay) 
      VALUES (?, ?) 
      ON CONFLICT(guild_id) DO UPDATE SET autoplay = excluded.autoplay
    `);
    return stmt.run(guildId, enabled ? 1 : 0);
  },

  getGuildConfig: (guildId) => {
    return db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
  },

  updateNowPlayingId: (guildId, nowPlayingMsgId) => {
    const stmt = db.prepare('UPDATE guild_config SET now_playing_msg_id = ? WHERE guild_id = ?');
    return stmt.run(nowPlayingMsgId, guildId);
  }
};
