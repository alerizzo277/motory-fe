# Frontend Auth 1B — integrazione verificata

Verifica effettuata il 2026-10-05 sul workspace contenente `motory-fe` e `motory-be`.

## Contratto backend

Fonte: `AuthResolver`, `RegisterInput`, modello GraphQL `User` e formatter errori di `motory-be`.

```graphql
register(input: RegisterInput!): User!

input RegisterInput {
  email: String!
  password: String!
  firstName: String!
  lastName: String!
}
```

User espone `id: ID!`, `email: String!`, `firstName: String!`, `lastName: String!`,
`role: String!`, `createdAt: DateTime!`, `updatedAt: DateTime!`.
La mutation FE seleziona id, email, firstName, lastName e role.
Il ruolo pubblico deriva da `User.roleId → Role.name`; il codice stabile effettivo è `name`.

Nome e cognome: trim e lunghezza 1–100. Email: trim/lowercase lato backend,
formato email e massimo 254 caratteri. Password: 8–128 caratteri senza trim.
Il frontend applica trim a nomi/email e lascia al backend la normalizzazione finale.
Conferma password resta esclusivamente frontend.

Errori applicativi:

- `EMAIL_ALREADY_EXISTS`: messaggio italiano sul campo email.
- `VALIDATION_ERROR`: `extensions.fields` è un array di `{ field, messages }`;
  i nomi campo riconosciuti vengono associati a messaggi italiani, con feedback generale.
- Errori inattesi o di rete: messaggio generico senza dettagli tecnici.

## Configurazione e flusso

- FE: `http://localhost:5173`.
- `VITE_GRAPHQL_URL=http://localhost:3000/graphql`.
- CORS backend: `FRONTEND_URL`, con default `http://localhost:5173`.
- Usare l'origine configurata: `127.0.0.1` e `localhost` sono origini differenti.

RegisterPage usa REGISTER da `api/operations.ts` tramite il client Apollo del provider
esistente. La mutation usa `fetchPolicy: 'no-cache'`; non modifica token o AuthProvider.
Al successo naviga a `/login` con state `{ registered: true }`.
LoginPage visualizza la conferma; solo il successivo login salva il JWT.
AuthProvider esegue `me` e il guard instrada l'utente verso `/home`.
Login e Register condividono AuthLayout, BrandLogo e token CSS Motory.

## Verifiche browser con backend e database reali

- Password diverse: errore locale «Le password non coincidono.»; submit interrotto prima della mutation.
- Email `mario..rossi@example.com`, accettata dal controllo frontend semplice ma rifiutata
  da class-validator: errore restituito dal backend e mostrato accanto al campo email.
- Registrazione valida: redirect alla login con «Registrazione completata. Ora puoi accedere.».
- Dopo registrazione è ancora accessibile `/register`: nessuna autenticazione automatica.
- Nuovo tentativo con la stessa email in maiuscolo: «Esiste già un account associato a questa email.».
- Login con le credenziali appena registrate, inclusi spazi nella password: riuscito.
- Home mostra Mario Rossi, email dell'account di prova e ruolo USER da `me`.
- Navigazione diretta a `/register` con sessione attiva: redirect a `/home` dopo verifica sessione.
- Nessun errore console durante il percorso.

Account di prova persistito: `auth-ui-1791233654726@example.com`.
Password e JWT non sono riportati in questo documento.

Le verifiche responsive precedenti hanno coperto 320 e 1280 px senza overflow orizzontale.
Non sono state necessarie ulteriori modifiche a FE o BE per collegare i progetti:
l'implementazione Auth 1B già presente rispetta il contratto verificato.

## Controlli ripetibili

Dalla directory `motory-fe`:

```sh
npm run build
npm run lint
npm test
```

Risultato della verifica: build e lint superati; 7 test FE superati.
Il backend non è stato modificato in questa verifica d'integrazione;
la verifica precedente aveva superato build, lint, 9 test unitari e 15 test HTTP/GraphQL.
