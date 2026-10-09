# Frontend Auth — Fase 2

Il riferimento completo è [Autenticazione Fase 2](../../motory-be/docs/auth-phase-two.md):
contratto GraphQL, modello Prisma, file modificati, decisioni, env e verifiche.
Questo documento sostituisce il flusso storico descritto in frontend-auth-1b.md.

Registrazione mostra lo stato Controlla la tua email nella stessa route /register;
non naviga al login né imposta un JWT. Verifica e recupero riusano AuthLayout e tema.

Route pubbliche: /verify-email?token=…, /forgot-password, /reset-password?token=….
Restano /login e /register anonime, /home protetta. Le route per token sono accessibili
anche con sessione attiva, così i link nelle email non vengono scartati dal guard anonimo.

PasswordInput supporta mostra/nascondi e viene usato in Login, Register e ResetPassword.
ResendVerification riusa la stessa mutation nello stato post-registrazione e al login.
EmailRequestPage riusa il form email per forgot password e reinvio da un link invalido.

## Test

```sh
npm run build
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
```

In alternativa all'installazione Chromium, usare PLAYWRIGHT_CHROME_PATH con il percorso
locale di Chrome. Playwright avvia Vite su 127.0.0.1:5174 e simula GraphQL; non dipende dal
server backend né invia email. La suite backend valida tutte le operazioni di operations.ts
contro lo schema NestJS via introspection.

Risultati: build/lint superati; 7 test Node e 12 browser. I browser coprono anche StrictMode,
show/hide senza submit, accessibilità dei label e viewport 320 px.

## Registrazione e reinvio — aggiornamento 9 ottobre 2026

RegisterPayload contiene user e warnings. VERIFICATION_EMAIL_SEND_FAILED è un warning
applicativo e non annulla la registrazione. La schermata Controlla la tua email compare
anche se l'invio fallisce, con warning nel tema Motory e pulsante Reinvia email presente.
Resend restituisce AuthWarningsPayload, usato anche da EmailRequestPage.

Il pulsante usa un countdown di 60 secondi dopo la registrazione e dopo ogni risposta
applicativa del reinvio (anche con warning, coerentemente col token creato nel backend).
Una scadenza Date.now e un intervallo aggiornano il tempo rimanente senza deriva.
I test Playwright simulano il tempo, verificando 60 → 59 → 0 e la ripartenza a 60.
