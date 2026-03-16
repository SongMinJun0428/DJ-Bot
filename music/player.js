const { 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus, 
    joinVoiceChannel, 
    VoiceConnectionStatus, 
    entersState 
} = require('@discordjs/voice');
const play = require('play-dl');

class MusicPlayer {
    constructor(guildId, client) {
        this.guildId = guildId;
        this.client = client;
        this.queue = [];
        this.player = createAudioPlayer();
        this.connection = null;
        this.currentResource = null;
        this.volume = 0.5;
        this.textChannelId = null;
        this.isLooping = false;

        this.player.on(AudioPlayerStatus.Idle, () => {
            this.playNext();
        });

        this.player.on('error', error => {
            console.error(`Player Error in ${this.guildId}:`, error.message);
            this.playNext();
        });
    }

    async play(voiceChannel, metadata) {
        this.queue.push(metadata);
        
        if (!this.connection) {
            this.connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: this.guildId,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            });

            this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
                try {
                    await Promise.race([
                        entersState(this.connection, VoiceConnectionStatus.Signalling, 5000),
                        entersState(this.connection, VoiceConnectionStatus.Connecting, 5000),
                    ]);
                } catch (error) {
                    this.destroy();
                }
            });

            this.connection.subscribe(this.player);
        }

        if (this.player.state.status === AudioPlayerStatus.Idle) {
            this.playNext();
        }
    }

    async playNext() {
        if (this.queue.length === 0) {
            // Auto-disconnect after 5 mins if nothing happens?
            // Handled by inactivity_timeout in settings eventually
            return;
        }

        const track = this.queue[0];
        try {
            const stream = await play.stream(track.url);
            const resource = createAudioResource(stream.stream, {
                inputType: stream.type,
                inlineVolume: true
            });
            resource.volume.setVolume(this.volume);
            this.currentResource = resource;
            this.player.play(resource);
            
            // Interaction feedback should be handled in the command or message handler
        } catch (error) {
            console.error('Error starting playback:', error);
            this.queue.shift();
            this.playNext();
        }
    }

    skip() {
        this.player.stop();
    }

    stop() {
        this.queue = [];
        this.player.stop();
    }

    pause() {
        this.player.pause();
    }

    resume() {
        this.player.unpause();
    }

    destroy() {
        this.stop();
        if (this.connection) {
            this.connection.destroy();
            this.connection = null;
        }
    }
}

module.exports = MusicPlayer;
