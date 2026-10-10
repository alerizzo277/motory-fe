import { useState } from 'react';
import type { InputHTMLAttributes } from 'react';

export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-input">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
      />
      <button
        type="button"
        className="password-input__toggle"
        disabled={props.disabled}
        aria-label={visible ? 'Nascondi password' : 'Mostra password'}
        aria-pressed={visible}
        onClick={() => setVisible(!visible)}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle
            cx="12"
            cy="12"
            r="3"
          />
          {visible && <path d="m3 3 18 18" />}
        </svg>
      </button>
    </div>
  );
}
