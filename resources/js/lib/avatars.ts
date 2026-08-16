export const AVATAR_STYLES = [
    { value: 'initials', label: 'Initials' },
    { value: 'lorelei', label: 'Lorelei' },
    { value: 'adventurer', label: 'Adventurer' },
    { value: 'bottts-neutral', label: 'Bots' },
    { value: 'fun-emoji', label: 'Emoji' },
    { value: 'notionists', label: 'Notionists' },
    { value: 'micah', label: 'Micah' },
    { value: 'open-peeps', label: 'Peeps' },
    { value: 'pixel-art', label: 'Pixel' },
] as const;

export type AvatarStyle = (typeof AVATAR_STYLES)[number]['value'];

export type AvatarData = {
    style?: string | null;
    seed?: string | null;
};

export function normalizeAvatarStyle(style: string | null | undefined): AvatarStyle {
    return AVATAR_STYLES.some((option) => option.value === style)
        ? (style as AvatarStyle)
        : 'initials';
}

export function avatarSeed(name: string, seed?: string | null): string {
    return seed?.trim() || name.trim() || 'Groupify';
}

export function avatarUrl(name: string, avatar?: AvatarData | null): string {
    const style = normalizeAvatarStyle(avatar?.style);
    const seed = encodeURIComponent(avatarSeed(name, avatar?.seed));

    return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}&backgroundColor=0b1326&radius=50`;
}
