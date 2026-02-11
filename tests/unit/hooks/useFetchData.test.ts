import {renderHook, act, waitFor} from '@testing-library/react'
import {describe, test, expect, vi, beforeEach} from 'vitest'
import useFetchData from '../../../src/renderer/src/hooks/useFetchData'
import {DodioError} from '../../../src/shared/Api'

// Mock useAuth hook
const mockUseAuth = vi.fn()
vi.mock('@renderer/hooks/reduxHooks', () => ({
    useAuth: () => mockUseAuth()
}))

describe('useFetchData', () => {
    let mockAuthRequest: ReturnType<typeof vi.fn>

    beforeEach(() => {
        vi.clearAllMocks()
        mockAuthRequest = vi.fn() as ReturnType<typeof vi.fn>
        mockUseAuth.mockReturnValue({status: 'account'})
    })

    test('should initialize with loading state', () => {
        mockAuthRequest.mockResolvedValue({type: 'ok', value: null})

        const {result} = renderHook(() => useFetchData('/test'))

        expect(result.current.loading).toBe(true)
        expect(result.current.data).toBe(null)
        expect(result.current.error).toBe(null)
        expect(typeof result.current.refetch).toBe('function')
    })

    test('should fetch data successfully when authenticated', async () => {
        const mockData = {id: 1, name: 'Test'}
        mockAuthRequest.mockResolvedValue({type: 'ok', value: mockData})

        const {result} = renderHook(() => useFetchData('/test'))

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.data).toEqual(mockData)
        expect(result.current.error).toBe(null)
        expect(mockAuthRequest).toHaveBeenCalledWith('get', '/test')
    })

    test('should handle API error response', async () => {
        const apiError: DodioError = {error: 'Not Found'}
        mockAuthRequest.mockResolvedValue({type: 'error', error: apiError})

        const {result} = renderHook(() => useFetchData('/test'))

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.data).toBe(null)
        expect(result.current.error).toBe('Endpoint not found. (404)')
    })

    test('should handle network error', async () => {
        const networkError = new Error('Network failed')
        mockAuthRequest.mockRejectedValue(networkError)

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        })

        const {result} = renderHook(() => useFetchData('/test'))

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.data).toBe(null)
        expect(result.current.error).toBe('An unknown error occurred!')

        expect(consoleSpy).toHaveBeenCalledWith('Fetch failed:', networkError)
        consoleSpy.mockRestore()
    })

    test('should not fetch when not authenticated', () => {
        mockUseAuth.mockReturnValue({status: 'login'})

        const {result} = renderHook(() => useFetchData('/test'))

        expect(result.current.loading).toBe(false)
        expect(result.current.data).toBe(null)
        expect(result.current.error).toBe(null)
        expect(mockAuthRequest).not.toHaveBeenCalled()
    })

    test('should map different error types correctly', async () => {
        const errorCases = [
            {
                error: {error: 'Not Found' as const},
                expectedMessage: 'Endpoint not found. (404)'
            },
            {
                error: {error: 'no-login' as const},
                expectedMessage: 'Not logged in!'
            },
            {
                error: {error: 'info' as const, arg: {message: 'Custom info'}},
                expectedMessage: 'Custom info'
            },
            {
                error: {error: 'no-connection' as const},
                expectedMessage: 'Request timed out, please try again later!'
            },
            {
                error: {error: 'multiple' as const, arg: {errors: []}},
                expectedMessage: 'An unknown error occurred!'
            }
        ]

        for (const {error, expectedMessage} of errorCases) {
            mockAuthRequest.mockResolvedValueOnce({type: 'error', error})

            const {result} = renderHook(() => useFetchData('/test'))

            await waitFor(() => {
                expect(result.current.loading).toBe(false)
            })

            expect(result.current.error).toBe(expectedMessage)

            // Reset for next test
            vi.clearAllMocks()
            mockUseAuth.mockReturnValue({status: 'account'})
        }
    })

    test('should handle info error without message', async () => {
        const infoError: DodioError = {error: 'info', arg: {message: null}}
        mockAuthRequest.mockResolvedValue({type: 'error', error: infoError})

        const {result} = renderHook(() => useFetchData('/test'))

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.error).toBe('Info error')
    })

    test('should handle empty response data', async () => {
        mockAuthRequest.mockResolvedValue({type: 'ok', value: null})

        const {result} = renderHook(() => useFetchData('/test'))

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.data).toBe(null)
        expect(result.current.error).toBe(null)
    })

    test('should refetch data when refetch is called', async () => {
        const mockData = {id: 1, name: 'Test'}
        mockAuthRequest.mockResolvedValue({type: 'ok', value: mockData})

        const {result} = renderHook(() => useFetchData('/test'))

        expect(result.current.loading).toBe(false)

        // Reset mock to track refetch call
        mockAuthRequest.mockClear()
        mockAuthRequest.mockResolvedValue({type: 'ok', value: mockData})

        act(() => {
            result.current.refetch()
        })

        expect(mockAuthRequest).toHaveBeenCalledWith('get', '/test')
    })

    test('should handle refetch error', async () => {
        const mockData = {id: 1, name: 'Test'}
        mockAuthRequest.mockResolvedValueOnce({type: 'ok', value: mockData})

        const {result} = renderHook(() => useFetchData('/test'))

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        // Mock error on refetch
        const apiError: DodioError = {error: 'Not Found'}
        mockAuthRequest.mockResolvedValueOnce({type: 'error', error: apiError})

        act(() => {
            result.current.refetch()
        })

        await waitFor(() => {
            expect(result.current.error).toBe('Endpoint not found. (404)')
        })
    })
})
