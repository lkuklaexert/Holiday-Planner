/**
 * Authentication gate.
 *
 * Decides whether to render the authentication screen
 * or the main application based on the current session.
 */
export default function AuthGate({
    session,
    authFallback,
    children,
  }) {
    return session ? children : authFallback;
  }