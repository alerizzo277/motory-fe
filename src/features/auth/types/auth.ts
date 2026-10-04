export interface User { id: string; email: string; firstName: string; lastName: string; role: string }
export interface LoginInput { email: string; password: string }
export interface LoginData { login: { accessToken: string; user: User } }
export interface MeData { me: User }
