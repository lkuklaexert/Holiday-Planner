import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";

export default function ChangePasswordModal({
  isOpen,
  newPassword,
  confirmNewPassword,
  setNewPassword,
  setConfirmNewPassword,
  onClose,
  onSubmit,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change Password">
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded-xl border px-3 py-2 text-sm"
          required
        />

        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          className="w-full rounded-xl border px-3 py-2 text-sm"
          required
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <Button type="submit">Update Password</Button>
        </div>
      </form>
    </Modal>
  );
}