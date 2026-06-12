import { useState } from "react";
import { supabase } from "../../supabase";
import Button from "../common/Button";
import { useToast } from "../common/ToastProvider";

/**
 * Authentication panel.
 *
 * Keeping auth UI outside App.jsx prevents planner logic from becoming
 * coupled to login, reset password and password update concerns.
 */
export default function AuthPanel({ onSessionChange }) {
  const { showToast } = useToast();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) setLoginError(error.message);
  }

  async function handleResetPassword() {
    setLoginError("");

    if (!loginEmail) {
      setLoginError("Please enter your email first.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
      redirectTo: window.location.origin,
    });

    if (error) {
      setLoginError(error.message);
      return;
    }

    showToast("Password reset email sent. Please check your inbox.", "success");
  }

  async function handleSetNewPassword(e) {
    e.preventDefault();
    setLoginError("");

    const { error } = await supabase.auth.updateUser({
      password: loginPassword,
    });

    if (error) {
      showToast(error.message, "error");
      return;
    }

    showToast("Password updated successfully.", "success");
    setLoginPassword("");

    if (onSessionChange) {
      onSessionChange();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
      >
        <h1 className="mb-4 text-2xl font-bold text-center">
          Employee Holiday Planner
        </h1>

        <div className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            className="w-full rounded-xl border px-3 py-2 text-sm"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            className="w-full rounded-xl border px-3 py-2 text-sm"
            required
          />

          {loginError && <p className="text-sm text-red-600">{loginError}</p>}

          <Button type="submit" className="w-full">
            Log in
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleResetPassword}
          >
            Forgot password
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleSetNewPassword}
          >
            Change Password
          </Button>
        </div>
      </form>
    </div>
  );
}