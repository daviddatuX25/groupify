import sndDefault from 'snd-lib';
import * as sndConstant from 'snd-lib/dist/constant.js';
import spriteUrl from 'snd-lib/assets/sounds/sprite/01/audioSprite.mp3?url';

/**
 * snd-lib ships transpiled CJS; Vite's interop can surface the module object
 * instead of the class depending on bundling. Accept both shapes.
 */
const Snd = (
    (sndDefault as unknown as { default?: typeof sndDefault }).default ??
    sndDefault
) as typeof sndDefault;

const { KIT_INFO, KITS, SOUNDS } = sndConstant;

export { SOUNDS };

const SOUND_ENABLED_KEY = 'groupify.sound_enabled';

/**
 * Self-host the audio sprite: snd-lib defaults KIT_INFO to a jsdelivr CDN
 * URL, which breaks the app's offline/LAN deployment model. The constants
 * object is shallow-frozen, so the inner kit entry is repointed to the
 * Vite-bundled asset before any Snd instance loads it.
 */
KIT_INFO[KITS.SND01].audioSrc = spriteUrl;

/**
 * Groupify sound system (docs/planning/ui-ux-sound-motion-plan.md §1).
 * One Snd instance, SND01 "sine" kit, imperative play() calls at the same
 * handlers that fire toasts. Mute preference persists; window-blur auto-mute
 * stays on. Exposes a window hook for e2e assertions (no audio output in
 * headless CI).
 */
class SoundSystem {
    private snd: InstanceType<typeof Snd> | null = null;
    private ready = false;

    init(): void {
        if (typeof window === 'undefined' || this.snd !== null) {
            return;
        }

        const snd = new Snd({
            easySetup: false,
            muteOnWindowBlur: true,
            preloadSoundKit: KITS.SND01,
        });
        this.snd = snd;
        Snd.masterVolume = 0.3;

        if (!this.enabled()) {
            snd.mute();
        }

        // Sounds before the sprite finishes loading are dropped silently.
        snd.load(KITS.SND01)
            .then(() => {
                this.ready = true;
            })
            .catch(() => {
                // Offline/failed fetch: the app degrades silently — sounds
                // are enhancement, never required.
            });

        const hook = {
            play: (key: string, volume?: number) => this.play(key, volume),
            stop: (key: string) => this.stop(key),
            setEnabled: (on: boolean) => this.setEnabled(on),
            enabled: () => this.enabled(),
        };
        (window as Window & { __groupifySound?: unknown }).__groupifySound = hook;
    }

    enabled(): boolean {
        if (typeof window === 'undefined') {
            return true;
        }

        return window.localStorage.getItem(SOUND_ENABLED_KEY) !== 'off';
    }

    play(key: string, volume?: number, loop = false): void {
        const snd = this.snd;

        if (!snd || !this.ready || snd.isMuted || !this.enabled()) {
            return;
        }

        // e2e hook — CI has no audio output; tests assert the call happened.
        (window as Window & { __groupifyLastSound?: string }).__groupifyLastSound =
            key;

        snd.play(
            key,
            volume !== undefined || loop ? { volume, loop } : undefined,
        );
    }

    stop(key: string): void {
        this.snd?.stop(key);
    }

    setEnabled(on: boolean): void {
        if (typeof window === 'undefined') {
            return;
        }

        window.localStorage.setItem(SOUND_ENABLED_KEY, on ? 'on' : 'off');
        this.snd?.[on ? 'unmute' : 'mute']();
    }
}

export const sound = new SoundSystem();
