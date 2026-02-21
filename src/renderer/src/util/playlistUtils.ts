export const publicPrivateToString = (isPublic: boolean) => {
    return isPublic ? "Public Playlist" : "Private Playlist";
}

export const songCountPlural = (songCount: number) => {
    return songCount + " Song" + (songCount !== 1 ? "s" : "");
}

export const memberCountPlural = (memberCount: number) => {
    return memberCount + " Member" + (memberCount !== 1 ? "s" : "");
}

export const generalPlural = (count: number) => {
    return count !== 1 ? "s" : "";
}

export const toCapitalized = (text: string) => {
    return text.substring(0, 1).toUpperCase() + text.substring(1).toLowerCase();
}
