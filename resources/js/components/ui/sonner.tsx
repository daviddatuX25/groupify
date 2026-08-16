import { Toaster as Sonner, type ToasterProps } from 'sonner';

/**
 * Groupify "Kinetic" themed toaster (docs/brand/brand-context.md).
 * Sonner is the shadcn/ui-standard toast (React 19 + Tailwind v4 native).
 * Dark-only theme; surface-card glass look with token-tinted icons.
 */
export function Toaster(props: ToasterProps) {
    return (
        <Sonner
            theme="dark"
            position="bottom-right"
            closeButton
            toastOptions={{
                classNames: {
                    toast: 'group/toast !bg-surface-container-lowest !border !border-white/10 !text-on-surface !shadow-2xl !backdrop-blur-xl',
                    title: '!font-display !text-sm !font-semibold !text-on-surface',
                    description: '!text-xs !text-on-surface-variant',
                    actionButton:
                        '!bg-primary-container !font-bold !text-on-primary-container',
                    cancelButton:
                        '!bg-surface-variant !text-on-surface',
                    closeButton:
                        '!border-white/10 !bg-surface-container-lowest !text-on-surface-variant hover:!text-on-surface',
                    success: '[&_[data-icon]]:!text-primary',
                    error: '[&_[data-icon]]:!text-error',
                    info: '[&_[data-icon]]:!text-secondary',
                },
            }}
            {...props}
        />
    );
}
