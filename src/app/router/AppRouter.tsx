import { useTranslation } from 'react-i18next';
import { VerifyEmailPage } from '../../features/auth/pages/VerifyEmailPage';
import { EmailRequestPage } from '../../features/auth/pages/EmailRequestPage';
import { ResetPasswordPage } from '../../features/auth/pages/ResetPasswordPage';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { RegisterPage } from '../../features/auth/pages/RegisterPage';
import { LoginPage } from '../../features/auth/pages/LoginPage';
import { HomePage } from '../../features/home/pages/HomePage';
function AuthRoute({ protectedRoute }: { protectedRoute: boolean }) {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading)
    return (
      <main
        className="card"
        role="status"
      >
        {t('auth:session.checking')}
      </main>
    );
  if (protectedRoute && !isAuthenticated)
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  if (!protectedRoute && isAuthenticated)
    return (
      <Navigate
        to="/home"
        replace
      />
    );
  return <Outlet />;
}
export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Navigate
              to="/home"
              replace
            />
          }
        />
        <Route element={<AuthRoute protectedRoute={false} />}>
          <Route
            path="/login"
            element={<LoginPage />}
          />
          <Route
            path="/register"
            element={<RegisterPage />}
          />
        </Route>
        <Route
          path="/verify-email"
          element={<VerifyEmailPage />}
        />
        <Route
          path="/forgot-password"
          element={<EmailRequestPage />}
        />
        <Route
          path="/reset-password"
          element={<ResetPasswordPage />}
        />
        <Route element={<AuthRoute protectedRoute />}>
          <Route
            path="/home"
            element={<HomePage />}
          />
        </Route>
        <Route
          path="*"
          element={
            <Navigate
              to="/home"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
