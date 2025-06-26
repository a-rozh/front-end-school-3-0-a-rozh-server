import { Server as SocketIOServer } from 'socket.io';
import { getTracks } from '../utils/db';

export class RadioService {
    private io: SocketIOServer;
    private isPlaying = false;
    private radioInterval: NodeJS.Timeout | null = null;
    private currentTrackSlug: string = '';
    private availableTrackSlugs: string[] = [];

    constructor(io: SocketIOServer) {
        this.io = io;
        this.loadTrackNames();
    }

    private async loadTrackNames(): Promise<void> {
        try {
            const { tracks } = await getTracks({ limit: 1000 });
            this.availableTrackSlugs = tracks
                .filter((track) => track.audioFile)
                .map((track) => track.slug);
        } catch (error) {
            console.error('Failed to load track names:', error);
        }
    }

    public async refreshTrackList(): Promise<void> {
        await this.loadTrackNames();
    }

    start() {
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.updateCurrentTrack();

        this.radioInterval = setInterval(() => {
            this.updateCurrentTrack();
        }, 5000);
    }

    stop() {
        if (!this.isPlaying) return;

        this.isPlaying = false;
        if (this.radioInterval) {
            clearInterval(this.radioInterval);
            this.radioInterval = null;
        }
    }

    private updateCurrentTrack() {
        if (this.availableTrackSlugs.length === 0) return;

        if (this.availableTrackSlugs.length === 1) {
            this.currentTrackSlug = this.availableTrackSlugs[0];
            this.io.emit('radio:track', this.currentTrackSlug);
            return;
        }

        const availableOptions = this.availableTrackSlugs.filter(
            (slug) => slug !== this.currentTrackSlug
        );

        this.currentTrackSlug =
            availableOptions[Math.floor(Math.random() * availableOptions.length)];

        this.io.emit('radio:track', this.currentTrackSlug);
    }

    getStatus() {
        return this.isPlaying;
    }
}
