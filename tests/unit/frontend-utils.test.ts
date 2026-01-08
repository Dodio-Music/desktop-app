import {expect, test} from 'vitest'
import {secondsToTime} from "../../src/renderer/src/util/timeUtils";
import {releaseToSongEntries} from "../../src/renderer/src/util/parseBackendTracks";

import {ReleaseDTO} from "../../src/shared/Api";
import {RemoteSongEntry} from "../../src/shared/TrackInfo";

type Data<In, Out> = { input: In, expected: Out }[];

test('convert seconds to time display', () => {
    expect(secondsToTime(10)).toBe("00:10");
});

test("convert release dto to remote song entries", () => {
    const data = [
        {
            input: {
                releaseId: "",
                releaseName: "",
                coverArtUrl: "",
                releaseDate: "",
                artists: [],
                releaseType: "",
                releaseTracks: []
            },
            expected: []
        },
        {
            input: {
                releaseId: "abc",
                releaseName: "A Release",
                coverArtUrl: "",
                releaseDate: new Date(2025, 10, 10).toISOString(),
                artists: [],
                releaseType: "",
                releaseTracks: [{
                    releaseTrackId: "", track: {
                        trackId: "",
                        title: "",
                        views: 0,
                        duration: 0,
                        artists: ["abc"],
                        sources: [{
                            sourceId: "sourceid-1",
                            url: "https://example.com/source1",
                            quality: "LOSSLESS"
                        }]
                    }
                }]
            },
            expected: [{
                "album": "A Release",
                "artists": ["abc"],
                "duration": 0,
                "id": "",
                "picture": "",
                "releaseDate": "2025-11-09T23:00:00.000Z",
                "releaseId": "abc",
                "sources": [{
                    "id": "sourceid-1",
                    url: "https://example.com/source1",
                    quality: "LOSSLESS"
                }],
                "title": "",
                "type": "remote",
            }]
        }
    ] satisfies Data<ReleaseDTO, RemoteSongEntry[]>

    for (const {input, expected} of data) {
        expect(releaseToSongEntries(input)).toEqual(expected);
    }
})
