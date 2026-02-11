import {describe, test, expect} from 'vitest'
import authReducer, {setAuthStatus} from '../../../src/renderer/src/redux/authSlice'
import {AuthStatus} from '../../../src/shared/Api'

describe('authSlice', () => {
    test('should return initial state', () => {
        const initialState = authReducer(undefined, {type: 'unknown'})
        expect(initialState.status).toBe('signup')
    })

    test('should handle setAuthStatus', () => {
        const initialState = {status: 'signup' as AuthStatus}

        // Test setting to login
        const loginState = authReducer(initialState, setAuthStatus('login'))
        expect(loginState.status).toBe('login')

        // Test setting to account
        const accountState = authReducer(loginState, setAuthStatus('account'))
        expect(accountState.status).toBe('account')

        // Test setting back to signup
        const signupState = authReducer(accountState, setAuthStatus('signup'))
        expect(signupState.status).toBe('signup')
    })

    test('should handle all auth status transitions', () => {
        const authStatuses: AuthStatus[] = ['login', 'signup', 'account']

        authStatuses.forEach(status => {
            const state = authReducer(undefined, setAuthStatus(status))
            expect(state.status).toBe(status)
        })
    })

    test('should create immutable state updates', () => {
        const initialState = {status: 'signup' as AuthStatus}
        const newState = authReducer(initialState, setAuthStatus('login'))

        // Ensure state is immutable
        expect(initialState).not.toBe(newState)
        expect(initialState.status).toBe('signup')
        expect(newState.status).toBe('login')
    })
})
