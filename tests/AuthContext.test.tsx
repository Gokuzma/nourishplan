// AUTH-02: AuthContext initialises session from getSession(); updates on onAuthStateChange
// AUTH-03: Logout button calls signOut(); session set to null in context
describe('AuthContext', () => {
  // TODO: render AuthProvider, mock supabase.auth.getSession to return a session (AUTH-02)
  // TODO: verify session is initialised from getSession on mount
  // TODO: verify onAuthStateChange subscription is set up
  // TODO: verify calling signOut sets session to null in context (AUTH-03)
  // TODO: verify subscription is cleaned up on unmount
  test('AuthContext describe placeholder', () => expect(true).toBe(true))
})

test('AuthContext test infrastructure works', () => expect(true).toBe(true))
