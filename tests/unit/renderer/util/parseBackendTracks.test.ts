import { describe, it, expect } from 'vitest';
import { 
    releaseToSongEntries, 
    likedTracksToSongEntries, 
    playlistToSongEntries, 
    releaseTrackDTOListToSongEntries 
} from '@renderer/util/parseBackendTracks';
import { ReleaseDTO, LikedTrackDTO, PlaylistDTO, ReleaseTrackDTO } from '@shared/Api';

describe('parseBackendTracks', () => {
    const mockTrack = {
        trackId: 't-1',
        title: 'Track 1',
        duration: 200,
        streamCount: 50,
        waveformUrl: 'wave-1',
        artists: [{ artistId: 101, artistName: 'Artist 1' }],
        sources: [{ sourceId: 's-1', url: 'url-1', quality: 'LOSSLESS' as const }]
    };

    const mockReleaseBase = {
        releaseId: 'rel-1',
        releaseName: 'Album 1',
        releaseDate: '2023-01-01',
        coverArtUrl: 'cover-url',
        artists: [{ artistId: 101, artistName: 'Artist 1' }]
    };

    describe('releaseToSongEntries', () => {
        it('returns empty array for null release', () => {
            expect(releaseToSongEntries(null)).toEqual([]);
        });

        it('maps ReleaseDTO correctly', () => {
            const mockRelease: ReleaseDTO = {
                ...mockReleaseBase,
                releaseTracks: [{ releaseTrackId: 'rt-1', track: mockTrack }]
            };
            const entries = releaseToSongEntries(mockRelease);
            expect(entries[0].id).toBe('t-1');
            expect(entries[0].album).toBe('Album 1');
        });
    });

    describe('likedTracksToSongEntries', () => {
        it('returns empty array for null', () => {
            expect(likedTracksToSongEntries(null, {})).toEqual([]);
        });

        it('filters and maps liked tracks', () => {
            const likedTracks: LikedTrackDTO[] = [{
                likedAt: new Date().toISOString(),
                track: { releaseTrackId: 'rt-1', track: mockTrack, release: mockReleaseBase }
            }];
            const likedIds = { 'rt-1': true as const };
            
            const entries = likedTracksToSongEntries(likedTracks, likedIds);
            expect(entries).toHaveLength(1);
            expect(entries[0].releaseTrackId).toBe('rt-1');
            expect(entries[0].context.type).toBe('liked_tracks');
        });

        it('filters out non-liked tracks', () => {
            const likedTracks: LikedTrackDTO[] = [{
                likedAt: new Date().toISOString(),
                track: { releaseTrackId: 'rt-1', track: mockTrack, release: mockReleaseBase }
            }];
            const entries = likedTracksToSongEntries(likedTracks, { 'rt-other': true });
            expect(entries).toHaveLength(0);
        });
    });

    describe('playlistToSongEntries', () => {
        it('maps playlist tracks correctly', () => {
            const mockPlaylist: PlaylistDTO = {
                playlistId: 5,
                playlistName: 'My Playlist',
                isPublic: true,
                owner: { username: 'user', displayName: 'User', avatar: 'av' },
                memberCount: 1,
                songCount: 1,
                playlistSongs: [{
                    playlistSongId: 'ps-1',
                    addedAt: '2023-01-01',
                    addedBy: { username: 'user', displayName: 'User', avatar: 'av' },
                    releaseTrack: { releaseTrackId: 'rt-1', track: mockTrack, release: mockReleaseBase }
                }]
            };

            const entries = playlistToSongEntries(mockPlaylist);
            expect(entries).toHaveLength(1);
            expect(entries[0].id).toBe('ps-1');
            expect(entries[0].context).toEqual({
                type: 'playlist',
                id: 5,
                name: 'My Playlist',
                url: '/playlist/5'
            });
        });
    });

    describe('releaseTrackDTOListToSongEntries', () => {
        it('maps a list of release tracks with custom context', () => {
            const list: ReleaseTrackDTO[] = [{
                releaseTrackId: 'rt-1',
                track: mockTrack,
                release: mockReleaseBase
            }];
            const context = { type: 'search_results' as const, name: 'Search' };
            
            const entries = releaseTrackDTOListToSongEntries(list, context);
            expect(entries).toHaveLength(1);
            expect(entries[0].context).toEqual(context);
        });
    });
});
