import { useAuth } from '../../auth/hooks/useAuth';
export function HomePage() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <main className="card">
      <p className="brand">Motory</p>
      <h1>Home page</h1>
      <p>Fase di sviluppo</p>
      <h2>
        Benvenuto, {user.firstName} {user.lastName}
      </h2>
      <p>{user.email}</p>
      <p>Ruolo: {user.role}</p>
      <button
        onClick={() => {
          void logout();
        }}
      >
        Logout
      </button>
    </main>
  );
}
