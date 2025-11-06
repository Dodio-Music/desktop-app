import {expect, test} from 'vitest'
import {secondsToTime} from "../../src/renderer/src/util/timeUtils";

test('convert seconds to time display', () => {
    expect(secondsToTime(10)).toBe("00:10");
});

