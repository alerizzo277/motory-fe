import type { ReactNode } from 'react';
import './AuthLayout.css';

export function AuthLayout({
  titleId,
  title,
  description,
  children,
  footer,
}: {
  titleId: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main
      className="card auth-card"
      aria-labelledby={titleId}
    >
      <header className="auth-card__header">
        <div className="auth-card__intro">
          <h1 id={titleId}>{title}</h1>
          <p>{description}</p>
        </div>
      </header>
      {children}
      <p className="auth-footer">{footer}</p>
    </main>
  );
}
