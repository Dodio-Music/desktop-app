import { describe, it, expect } from 'vitest';
import { 
    publicPrivateToString, 
    songCountPlural, 
    memberCountPlural, 
    generalPlural, 
    toCapitalized 
} from '@renderer/util/playlistUtils';

describe('playlistUtils', () => {
    describe('publicPrivateToString', () => {
        it('returns correct string for public playlist', () => {
            expect(publicPrivateToString(true)).toBe('Public Playlist');
        });
        it('returns correct string for private playlist', () => {
            expect(publicPrivateToString(false)).toBe('Private Playlist');
        });
    });

    describe('songCountPlural', () => {
        it('handles 0 songs', () => {
            expect(songCountPlural(0)).toBe('0 Songs');
        });
        it('handles 1 song', () => {
            expect(songCountPlural(1)).toBe('1 Song');
        });
        it('handles many songs', () => {
            expect(songCountPlural(5)).toBe('5 Songs');
        });
    });

    describe('memberCountPlural', () => {
        it('handles 1 member', () => {
            expect(memberCountPlural(1)).toBe('1 Member');
        });
        it('handles many members', () => {
            expect(memberCountPlural(2)).toBe('2 Members');
        });
    });

    describe('generalPlural', () => {
        it('returns "s" for 0', () => {
            expect(generalPlural(0)).toBe('s');
        });
        it('returns empty for 1', () => {
            expect(generalPlural(1)).toBe('');
        });
        it('returns "s" for many', () => {
            expect(generalPlural(2)).toBe('s');
        });
    });

    describe('toCapitalized', () => {
        it('capitalizes lowercase word', () => {
            expect(toCapitalized('test')).toBe('Test');
        });
        it('normalizes uppercase word', () => {
            expect(toCapitalized('TEST')).toBe('Test');
        });
        it('normalizes mixed case word', () => {
            expect(toCapitalized('tEsT')).toBe('Test');
        });
        it('handles empty string', () => {
            expect(toCapitalized('')).toBe('');
        });
    });
});
