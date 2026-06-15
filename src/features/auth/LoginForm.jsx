import Button from "../../components/common/Button";

/**
 * Login form.
 *
 * Pure presentation component.
 * Authentication logic remains in the parent component.
 */
export default function LoginForm({
  email,
  password,
  error,
  onEmailChange,
  onPasswordChange,
  onLogin,
  onResetPassword,
}) {
  return (
    <form onSubmit={onLogin} className="space-y-3">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        className="w-full rounded-xl border px-3 py-2 text-sm"
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
        className="w-full rounded-xl border px-3 py-2 text-sm"
        required
      />

      {error && (
        <p className="text-sm text-red-600">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full">
        Log in
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onResetPassword}
      >
        Forgot password
      </Button>
    </form>
  );
}