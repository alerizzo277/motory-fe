import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CATEGORY_CODES } from '../types';
export function CategoryInformation() {
  const { t } = useTranslation('maintenance');
  const id = useId();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    popover.current?.focus();
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return (
    <div
      ref={root}
      className="category-information"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        className="maintenance-icon"
        type="button"
        title={t('categoryHelp')}
        aria-label={t('categoryHelp')}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-haspopup="dialog"
        onClick={() => setOpen(!open)}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          focusable="false"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
          />
          <path d="M12 11v6m0-10v1" />
        </svg>
      </button>
      {open && (
        <section
          id={id}
          ref={popover}
          tabIndex={0}
          role="dialog"
          aria-labelledby={`${id}-title`}
          className="category-information__popover"
        >
          <div className="category-information__heading">
            <h2 id={`${id}-title`}>{t('categoryHelp')}</h2>
            <button
              type="button"
              className="maintenance-icon"
              aria-label={t('close')}
              title={t('close')}
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
                focusable="false"
              >
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <p>{t('categoryAdvice')}</p>
          <dl>
            {CATEGORY_CODES.map((code) => (
              <div key={code}>
                <dt>{t(`categories.${code}`)}</dt>
                <dd>{t(`categoryDescriptions.${code}`)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
