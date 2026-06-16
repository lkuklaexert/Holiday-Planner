import Button from "../../components/common/Button";

/**
 * Change password form.
 *
 * Keeps account actions reusable and separate from the application header.
 */
export default function ChangePasswordForm({
  password,
  setPassword,
  onSubmit,
}) {
  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <input
        type="password"
        placeholder="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded-xl border px-3 py-2 text-sm"
        required
      />

      <Button type="submit">
        Change Password
      </Button>
    </form>
  );
}