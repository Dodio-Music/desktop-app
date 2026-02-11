import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import useErrorHandling from '../../../src/renderer/src/hooks/useErrorHandling'
import { DodioError } from '../../../src/shared/Api'
import toast from 'react-hot-toast'

// Mock InvalidInputError component
vi.mock('@renderer/components/InputError', () => ({
  default: vi.fn(({ error, inputKey }) => 
    error?.error === 'invalid-input' && error.arg?.inputKey === inputKey 
      ? `Error for ${inputKey}` 
      : null
  )
}))

describe('useErrorHandling', () => {
  let mockToastError: ReturnType<typeof vi.fn>
  
  beforeEach(() => {
    vi.clearAllMocks()
    mockToastError = toast.error as ReturnType<typeof vi.fn>
  })

  test('should initialize with null error', () => {
    const { result } = renderHook(() => useErrorHandling())
    
    // The hook doesn't return the error state directly, so we can't test it
    expect(typeof result.current.setError).toBe('function')
    expect(typeof result.current.hasError).toBe('function')
    expect(typeof result.current.InvalidInputError).toBe('function')
  })

  test('should handle info error and show toast', async () => {
    const { result } = renderHook(() => useErrorHandling())
    
    const infoError: DodioError = {
      error: 'info',
      arg: { message: 'Test info message' }
    }

    act(() => {
      result.current.setError(infoError)
    })

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Test info message')
    })
  })

  test('should handle no-connection error and show toast', async () => {
    const { result } = renderHook(() => useErrorHandling())
    
    const noConnectionError: DodioError = {
      error: 'no-connection'
    }

    act(() => {
      result.current.setError(noConnectionError)
    })

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Cannot reach Dodio server!')
    })
  })

  test('should correctly identify hasError for specific input keys', () => {
    const { result } = renderHook(() => useErrorHandling())
    
    const invalidInputError: DodioError = {
      error: 'invalid-input',
      arg: { inputKey: 'email', message: 'Invalid email' }
    }

    act(() => {
      result.current.setError(invalidInputError)
    })

    expect(result.current.hasError('email')).toBe(true)
    expect(result.current.hasError('password')).toBe(false)
    expect(result.current.hasError('username')).toBe(false)
  })

  test('should return false for hasError when error is not invalid-input', () => {
    const { result } = renderHook(() => useErrorHandling())
    
    const infoError: DodioError = {
      error: 'info',
      arg: { message: 'Test info' }
    }

    act(() => {
      result.current.setError(infoError)
    })

    expect(result.current.hasError('email')).toBe(false)
    expect(result.current.hasError('password')).toBe(false)
  })

  test('should return false for hasError when error is null', () => {
    const { result } = renderHook(() => useErrorHandling())
    
    expect(result.current.hasError('email')).toBe(false)
    expect(result.current.hasError('password')).toBe(false)
  })

  test('should render InvalidInputError component correctly', () => {
    const { result } = renderHook(() => useErrorHandling())
    
    const invalidInputError: DodioError = {
      error: 'invalid-input',
      arg: { inputKey: 'email', message: 'Invalid email' }
    }

    act(() => {
      result.current.setError(invalidInputError)
    })

    const ErrorComponent = result.current.InvalidInputError({ inputKey: 'email' })
    expect(ErrorComponent).toBe('Error for email')
  })

  test('should return null for InvalidInputError when no error', () => {
    const { result } = renderHook(() => useErrorHandling())
    
    const ErrorComponent = result.current.InvalidInputError({ inputKey: 'email' })
    expect(ErrorComponent).toBe(null)
  })

  test('should handle all invalid input keys', () => {
    const { result } = renderHook(() => useErrorHandling())
    
    const inputKeys = ['username', 'email', 'login', 'password', 'password-reset-token'] as const

    inputKeys.forEach(inputKey => {
      const invalidInputError: DodioError = {
        error: 'invalid-input',
        arg: { inputKey, message: `Invalid ${inputKey}` }
      }

      act(() => {
        result.current.setError(invalidInputError)
      })

      expect(result.current.hasError(inputKey)).toBe(true)
      
      // Test other keys return false
      const otherKeys = inputKeys.filter(key => key !== inputKey)
      otherKeys.forEach(otherKey => {
        expect(result.current.hasError(otherKey)).toBe(false)
      })
    })
  })

  test('should not show toast for non-toast errors', async () => {
    const { result } = renderHook(() => useErrorHandling())
    
    const invalidInputError: DodioError = {
      error: 'invalid-input',
      arg: { inputKey: 'email', message: 'Invalid email' }
    }

    act(() => {
      result.current.setError(invalidInputError)
    })

    // Wait a bit to ensure no toast was called
    await new Promise(resolve => setTimeout(resolve, 10))
    
    expect(mockToastError).not.toHaveBeenCalled()
  })
})
