// AUTH-01: signUp called with email/password; no error returned
// AUTH-04: resetPasswordForEmail called when reset form submitted
describe('signup', () => {
  // TODO: mock supabase.auth.signUp and verify it is called with email/password (AUTH-01)
  // TODO: verify no error is returned on successful signup
  // TODO: verify profile trigger creates a profile row (AUTH-01)
  test('signup describe placeholder', () => expect(true).toBe(true))
})

describe('reset', () => {
  // TODO: mock supabase.auth.resetPasswordForEmail and verify it is called (AUTH-04)
  // TODO: verify redirect URL is passed correctly
  test('reset describe placeholder', () => expect(true).toBe(true))
})

test('auth test infrastructure works', () => expect(true).toBe(true))
