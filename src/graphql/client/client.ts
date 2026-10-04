import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client'
import { ErrorLink } from '@apollo/client/link/error'
import { clearAccessToken, getAccessToken, subscribeToToken } from '../../features/auth/tokenStorage'
import { hasErrorCode } from './errors'
const url = import.meta.env.VITE_GRAPHQL_URL
if (!url) throw new Error('Configurare VITE_GRAPHQL_URL nel file .env.local.')
const authLink = new ApolloLink((operation, forward) => {
  const token = getAccessToken()
  operation.setContext(({ headers = {} }) => ({ headers: { ...headers, ...(token ? { authorization: `Bearer ${token}` } : {}) }, accessToken: token }))
  return forward(operation)
})
const errorLink = new ErrorLink(({ error, operation }) => {
  // Una risposta della vecchia sessione non deve invalidare un nuovo login.
  if (hasErrorCode(error, 'UNAUTHENTICATED') && operation.getContext().accessToken === getAccessToken()) {
    clearAccessToken()
    void apolloClient.clearStore()
  }
})
export const apolloClient = new ApolloClient({ link: ApolloLink.from([errorLink, authLink, new HttpLink({ uri: url })]), cache: new InMemoryCache() })

// Anche il logout proveniente da un'altra scheda elimina i dati in cache.
subscribeToToken(() => {
  if (!getAccessToken()) void apolloClient.clearStore()
})
