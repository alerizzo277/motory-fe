import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const user = { __typename: 'User', id: 'user-id', email: 'ada@example.com', firstName: 'Ada', lastName: 'Rossi', role: 'USER' }
async function mockAuth(page: Page, options: { invalidVerification?: boolean; invalidReset?: boolean; unverified?: boolean; registrationMailFailure?: boolean; resendMailFailure?: boolean } = {}) {
  const calls: { query: string; variables: Record<string, unknown> }[] = []
  let verified = !options.unverified
  let password = 'password123'
  await page.route('**/graphql', async (route) => {
    const request = route.request().postDataJSON() as { query: string; variables: Record<string, unknown> }
    calls.push(request)
    const input = request.variables.input as { email?: string; password?: string; newPassword?: string } | undefined
    let data: object = {}
    let code = ''
    if (request.query.includes('mutation Register')) { data = { register: { user, warnings: options.registrationMailFailure ? [{ code: 'VERIFICATION_EMAIL_SEND_FAILED' }] : [] } }; verified = false }
    else if (request.query.includes('mutation VerifyEmail')) {
      if (options.invalidVerification) code = 'VERIFICATION_TOKEN_INVALID'
      else { verified = true; data = { verifyEmail: true } }
    } else if (request.query.includes('mutation ResendVerificationEmail')) data = { resendVerificationEmail: { warnings: options.resendMailFailure ? [{ code: 'VERIFICATION_EMAIL_SEND_FAILED' }] : [] } }
    else if (request.query.includes('mutation ForgotPassword')) data = { forgotPassword: true }
    else if (request.query.includes('mutation ResetPassword')) {
      if (options.invalidReset) code = 'PASSWORD_RESET_TOKEN_INVALID'
      else { password = input!.newPassword!; data = { resetPassword: true } }
    } else if (request.query.includes('mutation Login')) {
      if (input?.password !== password) code = 'INVALID_CREDENTIALS'
      else if (!verified) code = 'EMAIL_NOT_VERIFIED'
      else data = { login: { accessToken: 'test-session', user } }
    } else if (request.query.includes('query Me')) data = { me: user }
    await route.fulfill({ json: code ? { errors: [{ message: 'Arbitrary backend text', extensions: { code } }] } : { data } })
  })
  return calls
}
async function togglePassword(page: Page, label: string) {
  const input = page.getByLabel(label, { exact: true })
  const field = input.locator('..')
  await expect(input).toHaveAttribute('type', 'password')
  await field.getByRole('button', { name: 'Mostra password' }).click()
  await expect(input).toHaveAttribute('type', 'text')
  await field.getByRole('button', { name: 'Nascondi password' }).click()
  await expect(input).toHaveAttribute('type', 'password')
}

test('register → check email → resend; password controls do not submit', async ({ page }) => {
  const calls = await mockAuth(page)
  await page.clock.install()
  await page.goto('/register')
  await page.getByLabel('Nome', { exact: true }).fill('Ada')
  await page.getByLabel('Cognome').fill('Rossi')
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('password123')
  await page.getByLabel('Conferma password').fill('password123')
  await togglePassword(page, 'Password')
  await togglePassword(page, 'Conferma password')
  expect(calls).toHaveLength(0)
  await page.getByRole('button', { name: 'Registrati', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Controlla la tua email' })).toBeVisible()
  await expect(page.getByText(user.email, { exact: true })).toBeVisible()
  await expect(page.locator('.auth-warning')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Reinvia email' })).toBeDisabled()
  await expect(page.getByText('Puoi richiedere un nuovo invio tra 60 secondi.')).toBeVisible()
  await page.clock.fastForward(1000)
  await expect(page.getByText('Puoi richiedere un nuovo invio tra 59 secondi.')).toBeVisible()
  await page.clock.fastForward(59000)
  await expect(page.getByRole('button', { name: 'Reinvia email' })).toBeEnabled()
  await page.getByRole('button', { name: 'Reinvia email' }).click()
  await expect(page.getByRole('status')).toHaveText("Se l'account necessita ancora di verifica, riceverai una nuova email.")
  await expect(page.getByRole('button', { name: 'Reinvia email' })).toBeDisabled()
  await expect(page.getByText('Puoi richiedere un nuovo invio tra 60 secondi.')).toBeVisible()
  expect(calls.some((call) => call.query.includes('mutation Login'))).toBe(false)
})

test('valid verification runs once under StrictMode and enables login', async ({ page }) => {
  const calls = await mockAuth(page, { unverified: true })
  await page.goto('/verify-email?token=verification')
  await expect(page.getByText('Email verificata correttamente.')).toBeVisible()
  expect(calls.filter((call) => call.query.includes('mutation VerifyEmail'))).toHaveLength(1)
  await page.getByRole('link', { name: 'Accedi', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('password123')
  await togglePassword(page, 'Password')
  await page.getByRole('button', { name: 'Accedi', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Home page' })).toBeVisible()
})

test('invalid verification provides neutral explanation and resend form', async ({ page }) => {
  await mockAuth(page, { invalidVerification: true })
  await page.goto('/verify-email?token=invalid')
  await expect(page.getByText('Il link di verifica non è più valido.')).toBeVisible()
  await expect(page.getByText("L'account potrebbe essere già stato attivato oppure il link potrebbe essere scaduto.")).toBeVisible()
  await page.getByRole('button', { name: 'Reinvia email di verifica' }).click()
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByRole('button', { name: 'Reinvia email', exact: true }).click()
  await expect(page.getByRole('status')).toContainText("Se l'account necessita ancora di verifica")
})

test('unverified login offers resend based on extensions.code', async ({ page }) => {
  await mockAuth(page, { unverified: true })
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('password123')
  await page.getByRole('button', { name: 'Accedi', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('non è ancora stato verificato')
  await page.getByRole('button', { name: 'Reinvia email' }).click()
  await expect(page.getByRole('status')).toContainText("Se l'account necessita ancora di verifica")
})

test('forgot → neutral response → reset with confirmation → login with new password', async ({ page }) => {
  const calls = await mockAuth(page)
  await page.goto('/login')
  await page.getByRole('link', { name: 'Password dimenticata?' }).click()
  await expect(page).toHaveURL(/\/forgot-password$/)
  await expect(page.getByRole('heading', { name: 'Password dimenticata?' })).toBeVisible()
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(user.email)
  await page.getByRole('button', { name: 'Invia link di recupero' }).click()
  await expect.poll(() => calls.filter((call) => call.query.includes('mutation ForgotPassword')).length).toBe(1)
  await expect(page.getByRole('status')).toHaveText('Se esiste un account associato a questa email, riceverai le istruzioni per reimpostare la password.')
  await page.goto('/reset-password?token=reset')
  await page.getByLabel('Nuova password').fill('new-password')
  await page.getByLabel('Conferma password').fill('wrong-password')
  await page.getByLabel('Conferma password').blur()
  await expect(page.getByRole('button', { name: 'Reimposta password' })).toBeDisabled()
  await expect(page.getByRole('alert')).toHaveText('Le password non coincidono.')
  await page.getByLabel('Conferma password').fill('new-password')
  await togglePassword(page, 'Nuova password')
  await togglePassword(page, 'Conferma password')
  expect(calls.filter((call) => call.query.includes('mutation ResetPassword'))).toHaveLength(0)
  await page.getByRole('button', { name: 'Reimposta password' }).click()
  await expect(page.getByText('Password aggiornata correttamente.')).toBeVisible()
  await page.getByRole('link', { name: 'Accedi', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('new-password')
  await page.getByRole('button', { name: 'Accedi', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Home page' })).toBeVisible()
})

test('invalid reset and missing tokens offer recovery without claiming verification', async ({ page }) => {
  await mockAuth(page, { invalidReset: true })
  await page.goto('/reset-password?token=invalid')
  await page.getByLabel('Nuova password').fill('new-password')
  await page.getByLabel('Conferma password').fill('new-password')
  await page.getByRole('button', { name: 'Reimposta password' }).click()
  await expect(page.getByText('Il link per reimpostare la password non è più valido.')).toBeVisible()
  await page.goto('/verify-email')
  await expect(page.getByText('Il link di verifica non è più valido.')).toBeVisible()
  await page.goto('/reset-password')
  await expect(page.getByRole('link', { name: 'Richiedi un nuovo link' })).toBeVisible()
})

test('auth layout stays within a mobile viewport', async ({ page }) => {
  await mockAuth(page)
  await page.setViewportSize({ width: 320, height: 740 })
  for (const path of ['/login', '/register', '/forgot-password', '/reset-password?token=reset', '/verify-email?token=verify']) {
    await page.goto(path)
    await expect(page.getByRole('main')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
})

for (const form of [
  { path: '/register', passwordLabel: 'Password', button: 'Registrati' },
  { path: '/reset-password?token=reset', passwordLabel: 'Nuova password', button: 'Reimposta password' },
]) {
  test(`${form.path}: validation starts on blur, updates live and controls submit`, async ({ page }) => {
    const calls = await mockAuth(page)
    await page.goto(form.path)
    const password = page.getByLabel(form.passwordLabel, { exact: true })
    const confirm = page.getByLabel('Conferma password', { exact: true })
    const submit = page.getByRole('button', { name: form.button, exact: true })
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(submit).toBeDisabled()
    if (form.path === '/register') {
      await page.getByLabel('Nome', { exact: true }).fill('Ada')
      await page.getByLabel('Cognome').fill('Rossi')
      await page.getByLabel('Email', { exact: true }).fill(user.email)
    }
    await password.focus()
    await password.fill('abc')
    await expect(page.getByRole('alert')).toHaveCount(0)
    await password.blur()
    await expect(page.getByText('Inserisci una password da 8 a 128 caratteri.')).toBeVisible()
    await expect(password).toHaveAttribute('aria-invalid', 'true')
    await password.fill('password123')
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(password).toHaveAttribute('aria-invalid', 'false')
    await expect(submit).toBeDisabled()
    await confirm.fill('different')
    await expect(page.getByRole('alert')).toHaveCount(0)
    await confirm.blur()
    await expect(page.getByText('Le password non coincidono.')).toBeVisible()
    await expect(submit).toBeDisabled()
    await confirm.fill('password123')
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(submit).toBeEnabled()
    await password.fill('changed123')
    await expect(page.getByText('Le password non coincidono.')).toBeVisible()
    await expect(submit).toBeDisabled()
    await confirm.fill('changed123')
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(submit).toBeEnabled()
    await password.fill('abc')
    await expect(page.getByText('Inserisci una password da 8 a 128 caratteri.')).toBeVisible()
    await expect(submit).toBeDisabled()
    await password.fill('changed123')
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(submit).toBeEnabled()
    if (form.path === '/register') {
      await page.getByLabel('Nome', { exact: true }).fill(' ')
      await expect(submit).toBeDisabled()
      await page.getByLabel('Nome', { exact: true }).fill('Ada')
      await expect(submit).toBeEnabled()
    }
    expect(calls).toHaveLength(0)
  })
}

test('login uses its own password requirements and clears corrected errors live', async ({ page }) => {
  await mockAuth(page)
  await page.goto('/login')
  const password = page.getByLabel('Password', { exact: true })
  const submit = page.getByRole('button', { name: 'Accedi', exact: true })
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(submit).toBeDisabled()
  await password.focus()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await password.blur()
  await expect(page.getByText('Inserisci la password.')).toBeVisible()
  await password.fill('a')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(submit).toBeDisabled()
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await expect(submit).toBeEnabled()
  await password.fill('')
  await expect(page.getByText('Inserisci la password.')).toBeVisible()
  await expect(submit).toBeDisabled()
})

for (const resendFails of [false, true]) {
  test(`registration mail warning preserves success; resend failure=${resendFails}`, async ({ page }) => {
    const calls = await mockAuth(page, { registrationMailFailure: true, resendMailFailure: resendFails })
    await page.clock.install()
    await page.goto('/register')
    await page.getByLabel('Nome', { exact: true }).fill('Ada')
    await page.getByLabel('Cognome').fill('Rossi')
    await page.getByLabel('Email', { exact: true }).fill(user.email)
    await page.getByLabel('Password', { exact: true }).fill('password123')
    await page.getByLabel('Conferma password').fill('password123')
    await page.getByRole('button', { name: 'Registrati', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Controlla la tua email' })).toBeVisible()
    await expect(page.getByText('Account creato correttamente.')).toBeVisible()
    await expect(page.locator('.auth-warning')).toContainText("Non siamo riusciti a inviare l'email di verifica")
    await expect(page.getByRole('alert')).toHaveCount(0)
    const resend = page.getByRole('button', { name: 'Reinvia email' })
    await expect(resend).toBeVisible()
    await expect(resend).toBeDisabled()
    await expect(page.getByText('Puoi richiedere un nuovo invio tra 60 secondi.')).toBeVisible()
    await page.clock.fastForward(59000)
    await expect(resend).toBeDisabled()
    await expect(page.getByText('Puoi richiedere un nuovo invio tra 1 secondo.')).toBeVisible()
    await page.clock.fastForward(1000)
    await expect(resend).toBeEnabled()
    await resend.click()
    await expect(page.getByText(resendFails ? "Non siamo riusciti a inviare l'email di verifica. Riprova più tardi." : "Se l'account necessita ancora di verifica, riceverai una nuova email.", { exact: true })).toBeVisible()
    await expect(resend).toBeDisabled()
    await expect(page.getByText('Puoi richiedere un nuovo invio tra 60 secondi.')).toBeVisible()
    expect(calls.filter((call) => call.query.includes('mutation ResendVerificationEmail'))).toHaveLength(1)
    await expect(page.getByRole('heading', { name: 'Controlla la tua email' })).toBeVisible()
  })
}
