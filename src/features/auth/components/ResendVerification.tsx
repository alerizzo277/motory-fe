import { useEffect, useRef, useState } from 'react'
import { useApolloClient } from '@apollo/client/react'
import { RESEND_VERIFICATION } from '../api/operations'

export function ResendVerification({ email, initialCooldown = 0 }: { email: string; initialCooldown?: number }) {
  const client = useApolloClient()
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [warning, setWarning] = useState(false)
  const [deadline, setDeadline] = useState(() => Date.now() + initialCooldown * 1000)
  const [remaining, setRemaining] = useState(initialCooldown)
  useEffect(() => {
    const timer = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setRemaining(seconds)
      if (seconds === 0) window.clearInterval(timer)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [deadline])
  async function resend() {
    if (pending.current || Date.now() < deadline) return
    pending.current = true
    setBusy(true)
    try {
      const result = await client.mutate({ mutation: RESEND_VERIFICATION, variables: { input: { email: email.trim() } }, fetchPolicy: 'no-cache' })
      if (!result.data?.resendVerificationEmail) throw new Error('Missing resend response')
      const failed = result.data.resendVerificationEmail.warnings.some(({ code }) => code === 'VERIFICATION_EMAIL_SEND_FAILED')
      setWarning(failed)
      setMessage(failed ? "Non siamo riusciti a inviare l'email di verifica. Riprova più tardi." : "Se l'account necessita ancora di verifica, riceverai una nuova email.")
      // A provider failure also creates a token: respect its backend cooldown.
      setDeadline(Date.now() + 60000)
      setRemaining(60)
    } catch {
      setWarning(true)
      setMessage('Invio non riuscito. Riprova più tardi.')
    }
    finally { pending.current = false; setBusy(false) }
  }
  return <div className="auth-actions"><button type="button" disabled={busy || remaining > 0 || !email.trim()} onClick={() => { void resend() }}>{busy ? 'Invio…' : 'Reinvia email'}</button>
    {remaining > 0 && <p>Puoi richiedere un nuovo invio tra {remaining} {remaining === 1 ? 'secondo' : 'secondi'}.</p>}
    {message && <p className={warning ? 'auth-warning' : undefined} role="status">{message}</p>}</div>
}
