import { gql } from '@apollo/client';
import type { TypedDocumentNode } from '@apollo/client';
import type {
  AuthWarningsPayload,
  LoginData,
  LoginInput,
  MeData,
  RegisterData,
  RegisterInput,
} from '../types/auth';
export const LOGIN: TypedDocumentNode<LoginData, { input: LoginInput }> = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      user {
        id
        email
        firstName
        lastName
        role
      }
    }
  }
`;
export const ME: TypedDocumentNode<MeData> = gql`
  query Me {
    me {
      id
      email
      firstName
      lastName
      role
    }
  }
`;
export const REGISTER: TypedDocumentNode<RegisterData, { input: RegisterInput }> = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      user {
        id
        email
        firstName
        lastName
        role
      }
      warnings {
        code
      }
    }
  }
`;

export const VERIFY_EMAIL: TypedDocumentNode<{ verifyEmail: boolean }, { token: string }> = gql`
  mutation VerifyEmail($token: String!) {
    verifyEmail(token: $token)
  }
`;
export const RESEND_VERIFICATION: TypedDocumentNode<
  { resendVerificationEmail: AuthWarningsPayload },
  { input: { email: string } }
> = gql`
  mutation ResendVerificationEmail($input: EmailInput!) {
    resendVerificationEmail(input: $input) {
      warnings {
        code
      }
    }
  }
`;
export const FORGOT_PASSWORD: TypedDocumentNode<
  { forgotPassword: boolean },
  { input: { email: string } }
> = gql`
  mutation ForgotPassword($input: EmailInput!) {
    forgotPassword(input: $input)
  }
`;
export const RESET_PASSWORD: TypedDocumentNode<
  { resetPassword: boolean },
  { input: { token: string; newPassword: string } }
> = gql`
  mutation ResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input)
  }
`;
