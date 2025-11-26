class SoundManager {
    private context: AudioContext | null = null;
    private buffers: Map<string, AudioBuffer> = new Map();
    private sources: Map<string, AudioBufferSourceNode> = new Map();
    private gains: Map<string, GainNode> = new Map();
    private isMuted: boolean = false;
    private initialized: boolean = false;

    constructor() {
        // We don't initialize AudioContext immediately to avoid "The AudioContext was not allowed to start" warning
    }

    private initContext() {
        if (!this.context) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            this.context = new AudioContextClass();
            this.initialized = true;
        }
    }

    public async load(urls: Record<string, string>) {
        this.initContext();
        if (!this.context) return;

        const promises = Object.entries(urls).map(async ([name, url]) => {
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.context!.decodeAudioData(arrayBuffer);
                this.buffers.set(name, audioBuffer);
            } catch (error) {
                console.error(`Failed to load sound: ${name} from ${url}`, error);
            }
        });

        await Promise.all(promises);
    }

    public play(name: string, options: { loop?: boolean; volume?: number } = {}) {
        this.initContext();
        if (!this.context || !this.buffers.has(name)) return;

        // If we need to resume the context (e.g. after user interaction)
        if (this.context.state === 'suspended') {
            this.context.resume();
        }

        // Stop existing source if any (for non-looping sounds, or to restart looping ones)
        // Actually for this use case, we might want to allow overlapping sounds (like multiple reel stops)
        // But for 'spin_loop', we probably want to stop the previous one.
        // Let's make it simple: if it's a loop, stop previous. If not, allow overlap but track it?
        // For simplicity in this specific app:
        // - spin_loop: single instance
        // - reel_stop: multiple instances allowed, fire and forget
        // - win_fanfare: single instance

        if (options.loop) {
            this.stop(name); // Ensure only one loop playing
        }

        const source = this.context.createBufferSource();
        source.buffer = this.buffers.get(name)!;
        source.loop = options.loop || false;

        const gainNode = this.context.createGain();
        gainNode.gain.value = this.isMuted ? 0 : (options.volume ?? 1.0);

        source.connect(gainNode);
        gainNode.connect(this.context.destination);

        source.start(0);

        // Store references to control later
        // Note: For overlapping sounds (like rapid fire reel stops), this map will overwrite previous ones
        // which is fine because we don't usually need to stop them manually, they end on their own.
        // But for looping sounds, we definitely need the reference.
        this.sources.set(name, source);
        this.gains.set(name, gainNode);

        source.onended = () => {
            if (this.sources.get(name) === source) {
                this.sources.delete(name);
                this.gains.delete(name);
            }
        };
    }

    public stop(name: string) {
        const source = this.sources.get(name);
        if (source) {
            try {
                source.stop();
            } catch (e) {
                // Ignore if already stopped
            }
            this.sources.delete(name);
            this.gains.delete(name);
        }
    }

    public mute(muted: boolean) {
        this.isMuted = muted;
        this.gains.forEach(gain => {
            gain.gain.value = muted ? 0 : 1.0;
        });

        // Also suspend/resume context to be sure? No, just gain is enough usually.
        // But if we want to save CPU, we could suspend.
        // For now, gain is safer to avoid resume latency.
    }

    public async resumeContext() {
        this.initContext();
        if (this.context && this.context.state === 'suspended') {
            await this.context.resume();
        }
    }
}

export const soundManager = new SoundManager();
