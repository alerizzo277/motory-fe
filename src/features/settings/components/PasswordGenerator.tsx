import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generatePassword } from '../passwordGenerator';

export function PasswordGenerator({
  busy,
  onUse,
}: {
  busy: boolean;
  onUse: (password: string) => void;
}) {
  const { t } = useTranslation('settings');
  const [generated, setGenerated] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const failed =
    feedback === 'security.generator.failed' ||
    feedback === 'security.generator.copyFailed' ||
    feedback === 'security.generator.usedCopyFailed';
  const version = useRef(0);
  function generate() {
    version.current++;
    setFeedback(null);
    try {
      setGenerated(generatePassword());
    } catch {
      setFeedback('security.generator.failed');
    }
  }
  async function copy(usePassword = false) {
    if (copying || !generated) return;
    if (usePassword) onUse(generated);
    setCopying(true);
    setFeedback(null);
    const currentVersion = version.current;
    try {
      await navigator.clipboard.writeText(generated);
      if (version.current === currentVersion)
        setFeedback(usePassword ? 'security.generator.used' : 'security.generator.copied');
    } catch {
      if (version.current === currentVersion)
        setFeedback(
          usePassword ? 'security.generator.usedCopyFailed' : 'security.generator.copyFailed',
        );
    } finally {
      setCopying(false);
    }
  }
  return (
    <section
      className="vehicle-panel flex min-w-0 flex-col gap-4"
      aria-labelledby="generator-title"
    >
      <h2
        className="settings-title"
        id="generator-title"
      >
        {t('security.generator.title')}
      </h2>
      <p className="settings-text text-motory-slate">{t('security.generator.description')}</p>
      {generated && (
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor="generated-password">{t('security.generator.password')}</label>
          <div className="flex min-w-0 items-center gap-2">
            <input
              id="generated-password"
              className="min-w-0 flex-1 font-mono"
              readOnly
              autoComplete="off"
              spellCheck={false}
              value={generated}
            />
            <button
              className="vehicle-icon-action"
              type="button"
              disabled={busy || copying}
              title={t('security.generator.copy')}
              aria-label={t('security.generator.copy')}
              onClick={() => {
                void copy();
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M9 5H5v16h14V5h-4M9 3h6v4H9V3Z" />
              </svg>
            </button>
          </div>
        </div>
      )}
      <div className="settings-actions flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className="vehicle-secondary"
          disabled={busy}
          onClick={generate}
        >
          {t(generated ? 'security.generator.regenerate' : 'security.generator.generate')}
        </button>
        {generated && (
          <button
            type="button"
            disabled={busy || copying}
            onClick={() => {
              void copy(true);
            }}
          >
            {t('security.generator.use')}
          </button>
        )}
      </div>
      {feedback && (
        <p
          className={failed ? 'error' : 'settings-text font-semibold'}
          role={failed ? 'alert' : 'status'}
        >
          {t(feedback)}
        </p>
      )}
    </section>
  );
}
