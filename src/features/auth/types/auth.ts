export interface User { id: string; email: string; firstName: string; lastName: string; role: string }
export interface LoginInput { email: string; password: string }
export interface LoginData { login: { accessToken: string; user: User } }
export interface MeData { me: User }
export interface RegisterInput { firstName: string; lastName: string; email: string; password: string }
export interface RegisterData { register: User }
export interface RegisterForm extends RegisterInput { confirmPassword: string }
export type RegisterFieldErrors = Partial<Record<keyof RegisterForm, string>>
