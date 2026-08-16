import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

type DetectedBarcode = { rawValue?: string };
type BarcodeDetectorInstance = {
    detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
};
type BarcodeDetectorConstructor = new (options?: {
    formats?: string[];
}) => BarcodeDetectorInstance;
type BarcodeDetectorWindow = Window & {
    BarcodeDetector?: BarcodeDetectorConstructor;
};

type Props = {
    onClose: () => void;
    onDetected: (destination: string) => void;
};

type ScanState = 'starting' | 'scanning' | 'unsupported' | 'denied' | 'error';

function destinationFromValue(value: string): string | null {
    const trimmed = value.trim();

    if (/^\d{6}$/.test(trimmed)) {
        return `/join/${trimmed}`;
    }

    try {
        const url = new URL(trimmed, window.location.origin);

        if (/^\/join\/\d{6}$/.test(url.pathname)) {
            return `${url.pathname}${url.search}`;
        }
    } catch {
        // Continue with a plain-text code fallback.
    }

    const code = trimmed.match(/\b\d{6}\b/)?.[0];

    return code ? `/join/${code}` : null;
}

export default function ScanRoomDialog({ onClose, onDetected }: Props) {
    const closeRef = useRef<HTMLButtonElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [manualCode, setManualCode] = useState('');
    const [scanState, setScanState] = useState<ScanState>('starting');
    const [error, setError] = useState('');

    useEffect(() => {
        closeRef.current?.focus();
        const videoElement = videoRef.current;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', onKeyDown);

        let cancelled = false;
        let animationFrame = 0;
        let stream: MediaStream | null = null;

        const startScanner = async () => {
            const Detector = (window as BarcodeDetectorWindow).BarcodeDetector;

            if (!Detector || !navigator.mediaDevices?.getUserMedia) {
                setScanState('unsupported');

                return;
            }

            try {
                const detector = new Detector({ formats: ['qr_code'] });
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: { facingMode: { ideal: 'environment' } },
                });

                if (cancelled || !videoElement) {
                    return;
                }

                videoElement.srcObject = stream;
                await videoElement.play();

                if (cancelled) {
                    return;
                }

                setScanState('scanning');
                const detect = async () => {
                    if (cancelled || !videoElement) {
                        return;
                    }

                    try {
                        const result = await detector.detect(videoElement);
                        const destination = result
                            .map((barcode) => barcode.rawValue ?? '')
                            .map(destinationFromValue)
                            .find(Boolean);

                        if (destination) {
                            onDetected(destination);

                            return;
                        }
                    } catch {
                        setScanState('error');
                    }

                    animationFrame = window.requestAnimationFrame(
                        () => void detect(),
                    );
                };

                void detect();
            } catch {
                setScanState('denied');
            }
        };

        void startScanner();

        return () => {
            cancelled = true;
            window.cancelAnimationFrame(animationFrame);
            stream?.getTracks().forEach((track) => track.stop());

            if (videoElement) {
                videoElement.srcObject = null;
            }

            window.removeEventListener('keydown', onKeyDown);
        };
    }, [onClose, onDetected]);

    const submitManualCode = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const destination = destinationFromValue(manualCode);

        if (!destination) {
            setError('Enter a valid six-digit room code.');

            return;
        }

        onDetected(destination);
    };

    const scannerMessage =
        scanState === 'starting'
            ? 'Starting the camera...'
            : scanState === 'scanning'
              ? 'Point your camera at the room QR code.'
              : scanState === 'unsupported'
                ? 'QR scanning is not available in this browser.'
                : scanState === 'denied'
                  ? 'Camera access was unavailable. Enter the room code below.'
                  : 'The camera could not read that code. Enter the room code below.';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#020618]/80 p-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="scan-room-dialog-title"
                className="w-full max-w-md rounded-2xl border border-white/15 bg-surface-container-low p-5 shadow-2xl"
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="font-mono text-[10px] font-bold tracking-widest text-secondary uppercase">
                            Room access
                        </p>
                        <h2
                            id="scan-room-dialog-title"
                            className="mt-1 font-display text-lg font-bold text-on-surface"
                        >
                            Scan a room QR code
                        </h2>
                        <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                            Use the host's projected code or enter the six-digit
                            code manually.
                        </p>
                    </div>
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-2 py-1 text-on-surface-variant transition-colors hover:bg-surface-variant/50 hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                        aria-label="Close QR scanner"
                    >
                        <span
                            className="material-symbols-outlined text-[18px]"
                            aria-hidden="true"
                        >
                            close
                        </span>
                    </button>
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-surface-container-lowest">
                    <div className="relative aspect-[4/3]">
                        <video
                            ref={videoRef}
                            className="h-full w-full object-cover"
                            muted
                            playsInline
                            aria-label="QR code camera preview"
                        />
                        <div className="pointer-events-none absolute inset-8 rounded-2xl border border-primary/70 shadow-[0_0_0_999px_rgba(2,6,24,0.34)]" />
                    </div>
                    <p
                        className="border-t border-white/10 px-3 py-2 text-center text-[11px] text-on-surface-variant"
                        role="status"
                    >
                        {scannerMessage}
                    </p>
                </div>

                <form className="mt-4" onSubmit={submitManualCode}>
                    <label
                        htmlFor="scan-room-code"
                        className="font-mono text-[10px] font-bold tracking-widest text-on-surface-variant uppercase"
                    >
                        Room code
                    </label>
                    <div className="mt-2 flex items-center gap-2">
                        <input
                            id="scan-room-code"
                            value={manualCode}
                            onChange={(event) => {
                                setManualCode(
                                    event.target.value
                                        .replace(/\D/g, '')
                                        .slice(0, 6),
                                );
                                setError('');
                            }}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            placeholder="123456"
                            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2.5 text-center font-mono text-lg font-bold tracking-[0.24em] text-primary outline-none focus:border-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                        />
                        <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-primary-container px-3 py-2.5 text-xs font-bold text-on-primary-container transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary active:scale-95"
                        >
                            Open
                            <span
                                className="material-symbols-outlined text-[16px]"
                                aria-hidden="true"
                            >
                                arrow_forward
                            </span>
                        </button>
                    </div>
                    {error && (
                        <p className="mt-2 text-xs text-error" role="alert">
                            {error}
                        </p>
                    )}
                </form>
            </section>
        </motion.div>
    );
}
