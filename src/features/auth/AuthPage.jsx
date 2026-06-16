import LoginForm from "./LoginForm";

/**
 * Authentication page.
 *
 * Keeps the logged-out screen separate from the main application layout.
 */
export default function AuthPage({
  loginEmail,
  loginPassword,
  loginError,
  setLoginEmail,
  setLoginPassword,
  handleLogin,
  handleResetPassword,
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="mb-4 text-2xl font-bold text-center">
          Employee Holiday Planner
        </h1>

        <LoginForm
          email={loginEmail}
          password={loginPassword}
          error={loginError}
          onEmailChange={setLoginEmail}
          onPasswordChange={setLoginPassword}
          onLogin={handleLogin}
          onResetPassword={handleResetPassword}
        />
      </div>
    </div>
  );
}