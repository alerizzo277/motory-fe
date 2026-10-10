import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { AuthContext } from '../authContext';
import { LOGIN, ME } from '../api/operations';
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
  subscribeToToken,
} from '../tokenStorage';
import type { LoginInput } from '../types/auth';
export function AuthProvider({ children }: { children: ReactNode }) {
  const token = useSyncExternalStore(subscribeToToken, getAccessToken);
  return (
    <AuthSession
      key={token ?? 'anonymous'}
      token={token}
    >
      {children}
    </AuthSession>
  );
}

// Ogni token identifica una sessione: niente dati o errori della sessione precedente.
function AuthSession({ children, token }: { children: ReactNode; token: string | null }) {
  const client = useApolloClient();
  const { data, loading, error, refetch } = useQuery(ME, {
    skip: !token,
    fetchPolicy: 'network-only',
  });
  const user = token && !loading && !error ? (data?.me ?? null) : null;
  async function login(input: LoginInput) {
    const result = await client.mutate({
      mutation: LOGIN,
      variables: { input },
      fetchPolicy: 'no-cache',
    });
    if (!result.data) throw new Error('Missing login response');
    await client.clearStore();
    setAccessToken(result.data.login.accessToken);
  }
  async function logout() {
    clearAccessToken();
    await client.clearStore();
  }
  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading: !!token && loading, login, logout }}
    >
      {token && error ? (
        <main
          className="card"
          role="alert"
        >
          <h1>Connessione non riuscita</h1>
          <p>Non è stato possibile verificare la sessione.</p>
          <button
            onClick={() => {
              void refetch().catch(() => undefined);
            }}
          >
            Riprova
          </button>
          <button
            className="secondary"
            onClick={() => {
              void logout();
            }}
          >
            Torna al login
          </button>
        </main>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
