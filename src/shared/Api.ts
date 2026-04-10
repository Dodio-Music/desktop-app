import {AxiosInstance} from "axios";

export type AxiosMethodArgs = {
    get: Parameters<AxiosInstance["get"]>;
    delete: Parameters<AxiosInstance["delete"]>;
    head: Parameters<AxiosInstance["head"]>;
    options: Parameters<AxiosInstance["options"]>;
    post: Parameters<AxiosInstance["post"]>;
    put: Parameters<AxiosInstance["put"]>;
    patch: Parameters<AxiosInstance["patch"]>;
};

export interface DodioApi {
    login(login: string, password: string): Promise<MayError>;
    signup(username: string, email: string, password: string): Promise<DodioError | string>;
    logout(): Promise<MayError>;
    authRequest<T = unknown, M extends keyof AxiosMethodArgs = keyof AxiosMethodArgs>(
        method: M,
        ...args: AxiosMethodArgs[M]
    ): Promise<ApiResult<T>>,
    plainRequest<T = unknown, M extends keyof AxiosMethodArgs = keyof AxiosMethodArgs>(
        method: M,
        ...args: AxiosMethodArgs[M]
    ): Promise<ApiResult<T>>,
}
export type InvalidInputKeys = "username" | "displayname" | "email" | "login" | "password" | "password-reset-token" | "playlistName" | "search";
export const NoLoginError = {error: "no-login"} satisfies DodioError;
export type DodioError = {
    error: "Not Found"
} | {
    error: "no-login",
        arg?: undefined
} | {
    error: "invalid-input",
    arg: {
        inputKey: InvalidInputKeys,
        message: string,
    }
} | {
    error: "info",
    arg: {message: string}
} | {
    error: "no-connection",
    arg?: undefined
} | {
    error: "multiple",
    arg: {
       errors: DodioError[]
    }
} | {
    error: "unknown-error",
    data: unknown
}

export type MayError = DodioError | null;

export type ApiResult<T> = ({type:"error", error: DodioError }) | {type: "ok", value: T};

export type SourceQuality = "LOSSLESS" | "HIGH" | "LOW";

export type ReleaseType = "ALBUM" | "EP" | "SINGLE";

export interface ArtistDTO {
    artistId: number;
    artistName: string;
    streamCount: number;
    bio: string;
    avatarUrl: string | null;
}

export interface ArtistOverviewDTO {
    artist: ArtistDTO;
    popularReleaseTracks: ReleaseTrackDTO[];
    latestReleases: ReleasePreviewDTO[];
    totalTrackCount: number;
    followerCount: number;
}

export interface TrackDTO {
    trackId: string;
    title: string;
    streamCount: number;
    duration: number;
    artists: ArtistDTO[];
    sources: SourceDTO[];
    waveformUrl: string;
}

export interface ReleaseTrackDTO {
    releaseTrackId: string;
    track: TrackDTO;
    release: ReleaseLightDTO;
}

export interface ReleaseDTO {
    releaseId: string;
    releaseName: string;
    coverArtUrl: string;
    releaseDate: string;
    artists: ArtistDTO[];
    releaseType: ReleaseType;
    releaseTracks: ReleaseTrackDTO[];
}

export interface ReleasePreviewDTO {
    releaseId: string;
    releaseName: string;
    coverArtUrl: string;
    releaseDate: string;
    releaseType: ReleaseType;
    artists: ArtistDTO[];
}

export interface UserPublicDTO {
    username: string;
    displayName: string;
    createdAt: Date;
}

export interface SourceDTO {
    sourceId: string;
    url: string;
    quality: SourceQuality;
}

export interface PlaylistPreviewDTO {
    playlistId: number;
    playlistName: string;
    isPublic: boolean;
    owner: UserPublicDTO;
    songCount: number;
    coverArtUrls: string[];
}

export interface PlaylistMinmalDTO {
    playlistId: number;
    playlistName: string;
}

export type PlaylistRole = "OWNER" | "EDITOR" | "VIEWER";

export interface ReleaseLightDTO {
    releaseId: string;
    releaseName: string;
    coverArtUrl: string;
    releaseDate: string;
    releaseType: ReleaseType;
}

export interface PlaylistUserDTO {
    user: UserPublicDTO;
    role: PlaylistRole;
}

export interface PlaylistSongDTO {
    playlistSongId: string;
    addedBy: UserPublicDTO;
    releaseTrack: ReleaseTrackDTO;
    position: number;
    addedAt: Date;
}

export interface PlaylistDTO {
    playlistId: number;
    playlistName: string;
    isPublic: boolean;
    owner: UserPublicDTO;
    playlistSongs: PlaylistSongDTO[];
    playlistUsers: PlaylistUserDTO[];
    coverArtUrls: string[];
}

export interface PlaylistNotificationDTO {
    playlistPreview: PlaylistPreviewDTO;
    inviter: UserPublicDTO;
    inviteToken: string;
    createdAt: Date;
}

export interface NotificationDTO {
    playlistNotifications: PlaylistNotificationDTO[];
    unreadNotifications: number;
}

export interface InviteSearchResponse {
    users: UserPublicDTO[];
    invitedUsers: UserPublicDTO[];
}

export interface LikedItemsDTO {
    likedPlaylists: number[];
    likedTracks: string[];
    likedReleases: string[];
    followedArtists: number[];
}

export interface LikedTrackDTO {
    trackLikeId: number;
    track: ReleaseTrackDTO;
    likedAt: Date;
}

export interface LikedReleaseDTO {
    releaseLikeId: number;
    release: ReleasePreviewDTO;
    likedAt: Date;
}

export interface ArtistFollowDTO {
    artist: ArtistDTO;
    followedAt: Date;
}
