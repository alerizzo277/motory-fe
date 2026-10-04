import type { ReactNode } from 'react'
import { ApolloProvider } from '@apollo/client/react'
import { apolloClient } from '../../graphql/client/client'
import { AuthProvider } from '../../features/auth/components/AuthProvider'
export function AppProviders({ children }: { children: ReactNode }) {
  return <ApolloProvider client={apolloClient}><AuthProvider>{children}</AuthProvider></ApolloProvider>
}
