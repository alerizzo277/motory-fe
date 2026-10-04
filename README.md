# Motory frontend — Auth 1A

Base React 19 + TypeScript strict + Vite 8. Routing React Router 7, Apollo Client 4.
CSS semplice, senza librerie UI o state manager aggiuntivi.

## Avvio

Richiede Node.js 24 (anche per i test TypeScript nativi).

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev -- --port 5173 --strictPort
```

Aprire http://localhost:5173/home. `.env.local` è escluso da Git:

```env
VITE_GRAPHQL_URL=http://localhost:3000/graphql
```

Riavviare Vite dopo modifiche all'environment. Le variabili VITE sono pubbliche:
non inserirvi secret. Nessun fallback URL hardcoded nel codice applicativo.

## Struttura

```text
src/
  app/providers/AppProviders.tsx
  app/router/AppRouter.tsx
  features/auth/
    api/operations.ts
    components/AuthProvider.tsx
    hooks/useAuth.ts
    pages/LoginPage.tsx
    types/auth.ts
    authContext.ts
    tokenStorage.ts
  features/home/pages/HomePage.tsx
  graphql/client/
    client.ts
    errors.ts
  App.tsx
  main.tsx
  index.css
  vite-env.d.ts
tests/auth.test.mjs
```

Non sono state create cartelle shared vuote. Il bootstrap conserva StrictMode.
Operazioni tipizzate manualmente con TypedDocumentNode: nessun Code Generator.
Lo schema è stato verificato nei resolver NestJS e mediante introspezione live:
User.id è ID!, email/firstName/lastName/role sono String!; LoginInput contiene
email e password; login restituisce accessToken e user. role rimane string.

## Pattern React e flussi

ApolloProvider rende disponibile il client centralizzato. AuthProvider legge il
token con useSyncExternalStore e osserva me con useQuery; user è derivato dal
risultato Apollo, senza una seconda copia in useState. useAuth espone user,
isAuthenticated, isLoading, login e logout. Il Context contiene soltanto auth.
Ogni token identifica un'istanza AuthSession per non conservare errori della
sessione precedente. localStorage è accessibile soltanto da tokenStorage.

LoginPage gestisce i due campi e l'errore visibile. useAuth.login esegue LOGIN,
svuota la cache precedente e salva motory_access_token. Il provider esegue me
network-only e, quando ha un utente verificato, il router passa da /login a /home.
Il risultato login non viene memorizzato nella cache (include il JWT).

All'avvio senza token non parte me. Con token parte me e le route attendono
la verifica senza redirect intermedi. Un errore di connessione conserva il token,
blocca i contenuti protetti e permette Riprova oppure Torna al login.

L'auth link legge il token al momento di ogni operazione e aggiunge Bearer.
ErrorLink legge extensions.code: UNAUTHENTICATED elimina token e cache; il
Context diventa anonimo e il router porta a /login. La risposta di una vecchia
sessione non può invalidare il token di un nuovo login. INVALID_CREDENTIALS
è tradotto in «Email o password non corretti.»; nessun confronto sui message.
Altri errori login hanno un messaggio generico, senza dettagli tecnici.

Logout elimina token e svuota Apollo con clearStore (non resetStore, che
rieseguirebbe query protette). Nessuna mutation backend di logout.
Root e URL sconosciuti portano a /home, poi il guard decide se serve /login.
Le future feature usano Apollo e il guard condiviso senza leggere token o header.

## Backend / CORS: modifica necessaria

Il backend fratello motory-be è un repository separato, fuori dai percorsi
scrivibili di questa attività. Non è stato modificato. Il server attivo risponde
alle POST GraphQL, ma il preflight OPTIONS fallisce: main.ts non abilita CORS.
Aggiungere prima di app.listen, nel backend, una allowlist esplicita:

```ts
app.enableCors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

Riavviare il backend. Se si usa un'altra origine/porta, aggiornarla esplicitamente.
Non occorre credentials:true: il frontend invia Bearer, non cookie.
In produzione consentire solo le origini frontend previste. Il server che serve
la SPA deve inoltre rimandare le route /login e /home a index.html.

## Verifica manuale

Con backend/database avviati, CORS configurato e un account esistente valido:

1. Aprire /home senza token: redirect /login.
2. Inserire email valida e password errata: errore credenziali leggibile.
3. Inserire credenziali valide: login, salvataggio token, me e redirect /home.
4. In Network verificare me e Authorization: Bearer; home mostra dati backend.
5. Ricaricare /home: me ripristina la sessione dopo lo stato di verifica.
6. In DevTools → Application → Local Storage impostare motory_access_token
   a invalid-token, poi ricaricare: me ritorna UNAUTHENTICATED, token sparisce
   e si torna a /login. Stesso comportamento con un JWT realmente scaduto.
7. Ripetere login e Logout: token eliminato, cache svuotata, /login.
   Visitare di nuovo /home: redirect /login.
8. Da autenticato aprire /login: redirect /home.

L'account mario@example.com/password123 del README backend non risulta valido
nel database attivo; utilizzare credenziali reali di sviluppo, senza inserirle
nel repository. Non è stata introdotta una pagina registrazione.

## Controlli

```powershell
npm run build
npm run lint
npm test
```

Non c'era infrastruttura di test. Due test usano il runner nativo Node, senza
nuove dipendenze: mapping errori per codice e persistenza/notifiche del token.
Non sono test end-to-end. Verificati live i codici INVALID_CREDENTIALS e
UNAUTHENTICATED, introspezione User e redirect browser /home → /login.
Il completamento E2E positivo è bloccato da CORS e assenza di credenziali valide.

```text
LoginPage → useAuth → AuthProvider → LOGIN → Apollo → authLink → NestJS
                                ↓ token salvato
                              ME → utente Apollo → guard → HomePage
UNAUTHENTICATED → ErrorLink → elimina token/cache → guard → LoginPage
```
