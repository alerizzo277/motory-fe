import { createContext } from 'react'
import type { LoginInput, User } from './types/auth'
export interface AuthState { user: User | null; isAuthenticated: boolean; isLoading: boolean; login: (input: LoginInput) => Promise<void>; logout: () => Promise<void> }
export const AuthContext = createContext<AuthState | null>(null)
