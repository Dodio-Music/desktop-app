import { describe, it, expect } from 'vitest';
import { isLocalSong, isRemoteSong, LocalSongEntry, RemoteSongEntry } from '@shared/TrackInfo';

describe('TrackInfo', () => {
  const localTrack: LocalSongEntry = {
    id: 'local-1',
    title: 'Local Song',
    artists: [{ name: 'Artist' }],
    album: 'Album',
    duration: 120,
    type: 'local',
    context: { type: 'local', name: 'Local', url: 'local' },
    createdAt: '2023-01-01',
    fileName: 'song.mp3',
    fullPath: '/path/to/song.mp3'
  };

  const remoteTrack: RemoteSongEntry = {
    id: 'remote-1',
    title: 'Remote Song',
    artists: [{ name: 'Artist' }],
    album: 'Album',
    duration: 120,
    type: 'remote',
    context: { type: 'release', name: 'Release', url: 'release', id: 'r1' },
    sources: [],
    waveformUrl: 'waveform',
    releaseDate: '2023-01-01',
    releaseId: 'r1',
    releaseTrackId: 'rt1',
    streamCount: 0
  };

  describe('isLocalSong', () => {
    it('returns true for local tracks', () => {
      expect(isLocalSong(localTrack)).toBe(true);
    });

    it('returns false for remote tracks', () => {
      expect(isLocalSong(remoteTrack)).toBe(false);
    });
  });

  describe('isRemoteSong', () => {
    it('returns true for remote tracks', () => {
      expect(isRemoteSong(remoteTrack)).toBe(true);
    });

    it('returns false for local tracks', () => {
      expect(isRemoteSong(localTrack)).toBe(false);
    });
  });
});
