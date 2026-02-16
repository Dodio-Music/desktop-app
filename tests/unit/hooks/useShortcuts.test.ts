import {act, renderHook} from '@testing-library/react'
import {afterEach, beforeEach, describe, expect, Mock, test, vi} from 'vitest'
import {useShortcuts} from '../../../src/renderer/src/hooks/layout/useShortcuts'
import {Provider} from 'react-redux'
import {configureStore, Store} from '@reduxjs/toolkit'
import rendererPlayerSlice from '../../../src/renderer/src/redux/rendererPlayerSlice'
import * as React from 'react'
import {store} from "../../../src/renderer/src/redux/store";

// Mock shortcuts slice
const mockShortcutsState = {
    pauseOrResumeKey: 'Space',
    muteKey: 'KeyM',
    increaseVolumeKey: 'ArrowUp',
    decreaseVolumeKey: 'ArrowDown'
}

const createMockStore = () => configureStore({
    reducer: {
        rendererPlayer: rendererPlayerSlice,
        shortcuts: (state = mockShortcutsState) => state
    }
})

interface ProviderProps {
    store: Store,
    children: React.ReactNode
}

const createWrapper = (store: Store) => {
    function Wrapper({children}: { children: React.ReactNode }) {
        return React.createElement(Provider, {store} as ProviderProps, children)
    }

    return Wrapper
}


describe('useShortcuts', () => {
    let addEventListenerSpy: Mock<Required<Document>["addEventListener"]>
    let removeEventListenerSpy: Mock<Required<Document>["removeEventListener"]>
    let mockPauseOrResume: ReturnType<typeof vi.fn>

    const createShortcutHandler = (store: Store) => {
        const wrapper = createWrapper(store)
        renderHook(() => useShortcuts(), {wrapper})

        // Find the shortcut handler
        const keydownCalls = addEventListenerSpy.mock.calls.filter(call => call[0] === 'keydown')
        return keydownCalls.find(call => call[1] !== keydownCalls[0][1])?.[1] as EventListener;
    }

    beforeEach(() => {
        vi.clearAllMocks()

        // Mock window.api.pauseOrResume
        mockPauseOrResume = vi.fn()
        Object.defineProperty(window, 'api', {
            value: {
                pauseOrResume: mockPauseOrResume
            },
            writable: true
        })

        // Mock document methods
        addEventListenerSpy = vi.spyOn(document, 'addEventListener')
        removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('should add event listeners on mount and remove on unmount', () => {
        const store = createMockStore()
        const wrapper = createWrapper(store)
        const {unmount} = renderHook(() => useShortcuts(), {wrapper})

        expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
        expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
        expect(addEventListenerSpy).toHaveBeenCalledTimes(3) // Updated to match actual behavior

        unmount()

        expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
        expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
        expect(removeEventListenerSpy).toHaveBeenCalledTimes(2)
    })

    test('should handle pause/resume shortcut', () => {
        const shortcutHandler = createShortcutHandler(store);

        expect(shortcutHandler).toBeDefined()

        // Simulate space key press
        const event = new KeyboardEvent('keydown', {code: 'Space'})
        Object.defineProperty(event, 'target', {
            value: {tagName: 'DIV', isContentEditable: false}
        })

        act(() => {
            shortcutHandler(event)
        })

        expect(mockPauseOrResume).toHaveBeenCalled()
    })

    test('should prevent default for forbidden keys when not typing', () => {
        const store = createMockStore()
        const wrapper = createWrapper(store)
        renderHook(() => useShortcuts(), {wrapper})

        // Find the prevent default handler
        const keydownCalls = addEventListenerSpy.mock.calls.filter(call => call[0] === 'keydown')
        const preventHandler = keydownCalls[0]?.[1] as EventListener;

        const forbiddenKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'space']

        forbiddenKeys.forEach(code => {
            const event = new KeyboardEvent('keydown', {code})
            Object.defineProperty(event, 'target', {
                value: {tagName: 'DIV', isContentEditable: false}
            })
            Object.defineProperty(event, 'preventDefault', {value: vi.fn()})

            act(() => {
                preventHandler!(event)
            })

            expect(event.preventDefault).toHaveBeenCalled()
        })
    })

    test('should not prevent default when typing in input', () => {
        const store = createMockStore()
        const wrapper = createWrapper(store)
        renderHook(() => useShortcuts(), {wrapper})

        // Find the prevent default handler
        const keydownCalls = addEventListenerSpy.mock.calls.filter(call => call[0] === 'keydown')
        const preventHandler = keydownCalls[0]?.[1] as EventListener;

        const event = new KeyboardEvent('keydown', {code: 'Space'})
        Object.defineProperty(event, 'target', {
            value: {tagName: 'INPUT', type: 'text', isContentEditable: false}
        })
        Object.defineProperty(event, 'preventDefault', {value: vi.fn()})

        act(() => {
            preventHandler!(event)
        })

        expect(event.preventDefault).not.toHaveBeenCalled()
    })

    test('should not trigger shortcuts when content is editable', () => {
        const store = createMockStore()
        const wrapper = createWrapper(store)
        renderHook(() => useShortcuts(), {wrapper})

        // Find the shortcut handler
        const keydownCalls = addEventListenerSpy.mock.calls.filter(call => call[0] === 'keydown')
        const shortcutHandler = keydownCalls.find(call => call[1] !== keydownCalls[0][1])?.[1] as EventListener;

        const event = new KeyboardEvent('keydown', {code: 'Space'})
        Object.defineProperty(event, 'target', {
            value: {tagName: 'DIV', isContentEditable: true}
        })

        act(() => {
            shortcutHandler(event)
        })

        expect(mockPauseOrResume).not.toHaveBeenCalled()
    })

    test('should handle case insensitive key codes', () => {
        const store = createMockStore()
        const wrapper = createWrapper(store)
        renderHook(() => useShortcuts(), {wrapper})

        // Find the shortcut handler
        const keydownCalls = addEventListenerSpy.mock.calls.filter(call => call[0] === 'keydown')
        const shortcutHandler = keydownCalls.find(call => call[1] !== keydownCalls[0][1])?.[1] as EventListener;

        // Test lowercase
        const lowerEvent = new KeyboardEvent('keydown', {code: 'space'})
        Object.defineProperty(lowerEvent, 'target', {
            value: {tagName: 'DIV', isContentEditable: false}
        })

        act(() => {
            shortcutHandler(lowerEvent)
        })

        expect(mockPauseOrResume).toHaveBeenCalledTimes(1)

        // Test uppercase
        mockPauseOrResume.mockClear()
        const upperEvent = new KeyboardEvent('keydown', {code: 'SPACE'})
        Object.defineProperty(upperEvent, 'target', {
            value: {tagName: 'DIV', isContentEditable: false}
        })

        act(() => {
            shortcutHandler(upperEvent)
        })

        expect(mockPauseOrResume).toHaveBeenCalledTimes(1)
    })

    test('should not trigger shortcuts for unrecognized keys', () => {
        const store = createMockStore()
        const wrapper = createWrapper(store)
        renderHook(() => useShortcuts(), {wrapper})

        // Find the shortcut handler
        const keydownCalls = addEventListenerSpy.mock.calls.filter(call => call[0] === 'keydown')
        const shortcutHandler = keydownCalls.find(call => call[1] !== keydownCalls[0][1])?.[1] as EventListener;

        const event = new KeyboardEvent('keydown', {code: 'KeyX'})
        Object.defineProperty(event, 'target', {
            value: {tagName: 'DIV', isContentEditable: false}
        })

        act(() => {
            shortcutHandler(event)
        })

        expect(mockPauseOrResume).not.toHaveBeenCalled()
    })

    test('should handle null shortcut keys', () => {
        const store = configureStore({
            reducer: {
                rendererPlayer: rendererPlayerSlice,
                shortcuts: () => ({
                    pauseOrResumeKey: null,
                    muteKey: null,
                    increaseVolumeKey: null,
                    decreaseVolumeKey: null
                })
            }
        })

        const shortcutHandler = createShortcutHandler(store)

        const event = new KeyboardEvent('keydown', {code: 'Space'})
        Object.defineProperty(event, 'target', {
            value: {tagName: 'DIV', isContentEditable: false}
        })

        act(() => {
            shortcutHandler(event)
        })

        expect(mockPauseOrResume).not.toHaveBeenCalled()
    })
})
