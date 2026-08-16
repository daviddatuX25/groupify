import { useEffect, useState } from 'react';
import { sound } from '@/lib/sound';

/**
 * Header sound toggle — persisted in localStorage; silences every UI sound
 * (visual feedback stays). Lives in both the admin and participant headers.
 */
export default function SoundToggle() {
    const [enabled, setEnabled] = useState(() => sound.enabled());

    useEffect(() => {
        sound.init();
    }, []);

    return (
        <button
            type="button"
            onClick={() => {
                const next = !enabled;
                setEnabled(next);
                sound.setEnabled(next);
            }}
            aria-label={enabled ? 'Mute sounds' : 'Enable sounds'}
            aria-pressed={enabled}
            title={enabled ? 'Sounds on — click to mute' : 'Sounds off — click to enable'}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-surface-container-lowest px-2.5 py-2 text-on-surface-variant transition-colors hover:border-secondary/40 hover:text-on-surface"
        >
            <span className="material-symbols-outlined text-[18px]">
                {enabled ? 'volume_up' : 'volume_off'}
            </span>
        </button>
    );
}
