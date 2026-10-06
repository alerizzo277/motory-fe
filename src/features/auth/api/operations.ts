import { gql } from '@apollo/client'
import type { TypedDocumentNode } from '@apollo/client'
import type { LoginData, LoginInput, MeData, RegisterData, RegisterInput } from '../types/auth'
export const LOGIN: TypedDocumentNode<LoginData, { input: LoginInput }> = gql`
mutation Login($input: LoginInput!) { login(input: $input) { accessToken user { id email firstName lastName role } } }
`
export const ME: TypedDocumentNode<MeData> = gql`query Me { me { id email firstName lastName role } }`
export const REGISTER: TypedDocumentNode<RegisterData, { input: RegisterInput }> = gql`
mutation Register($input: RegisterInput!) { register(input: $input) { id email firstName lastName role } }
`
