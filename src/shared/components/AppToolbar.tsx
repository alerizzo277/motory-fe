import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from './BrandLogo';
import { selectLanguage } from '../../i18n';
import { isLanguage } from '../../i18n/language';
import './AppToolbar.css';

export function AppToolbar({ showUser = false }: { showUser?: boolean }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage === 'en' ? 'en' : 'it';
  return (
    <header className="app-toolbar">
      <Link
        className="app-toolbar__home"
        to="/home"
        aria-label={t('common:toolbar.home')}
        title={t('common:toolbar.home')}
      >
        <BrandLogo />
      </Link>
      <div className="app-toolbar__actions">
        <div className="app-toolbar__language">
          <span aria-hidden="true">{language.toUpperCase()}</span>
          <select
            aria-label={t('common:toolbar.language')}
            value={language}
            onChange={(event) => {
              if (isLanguage(event.target.value)) selectLanguage(event.target.value);
            }}
          >
            <option
              value="it"
              lang="it"
            >
              {t('common:toolbar.italian')}
            </option>
            <option
              value="en"
              lang="en"
            >
              {t('common:toolbar.english')}
            </option>
          </select>
        </div>
        {showUser && user && (
          <div
            className="app-toolbar__user"
            ref={menu}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
            }}
          >
            <button
              className="app-toolbar__avatar"
              ref={trigger}
              aria-label={t('common:toolbar.userMenu')}
              aria-expanded={open}
              aria-controls="user-menu"
              onClick={() => setOpen(!open)}
            >
              <span aria-hidden="true">
                {user.firstName.slice(0, 1)}
                {user.lastName.slice(0, 1)}
              </span>
            </button>
            {open && (
              <div
                id="user-menu"
                className="app-toolbar__menu"
              >
                <strong>
                  {user.firstName} {user.lastName}
                </strong>
                <p>{user.email}</p>
                <Link
                  to="/settings"
                  className="app-toolbar__settings"
                  onClick={() => setOpen(false)}
                >
                  {t('settings:title')}
                </Link>
                <button
                  onClick={() => {
                    setOpen(false);
                    void logout();
                  }}
                >
                  {t('common:actions.logout')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
