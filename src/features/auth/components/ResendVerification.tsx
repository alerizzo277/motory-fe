import { useRef, useState } from 'react'
import { useApolloClient } from '@apollo/client/react'
import { RESEND_VERIFICATION } from '../api/operations'

export function ResendVerification({ email }: { email: string }) {
  const client = useApolloClient()
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function resend() {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    try {
      await client.mutate({ mutation: RESEND_VERIFICATION, variables: { input: { email: email.trim() } }, fetchPolicy: 'no-cache' })
      setMessage("Se l'account necessita ancora di verifica, riceverai una nuova email.")
    } catch { setMessage('Invio non riuscito. Riprova tra poco.') }
    finally { pending.current = false; setBusy(false) }
  }
  return <div className="auth-actions"><button type="button" disabled={busy || !email.trim()} onClick={() => { void resend() }}>{busy ? 'Invio…' : 'Reinvia email'}</button>
    {message && <p role="status">{message}</p>}</div>
}
