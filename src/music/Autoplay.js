const play = require('play-dl');
const musicPlayer = require('./Player');

module.exports = {
  async getRelatedVideo(url) {
    try {
      const videoInfo = await play.video_info(url);
      const related = videoInfo.related_videos[0];
      if (!related) return null;

      return {
        title: related.title,
        url: related.url,
        thumbnail: related.thumbnails[0].url,
        durationRaw: related.durationRaw,
        author: related.channel.name,
        isLocal: false
      };
    } catch (e) {
      console.error('Autoplay error:', e);
      return null;
    }
  }
};
