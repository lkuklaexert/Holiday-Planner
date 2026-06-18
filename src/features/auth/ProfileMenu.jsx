import Button from "../../components/common/Button";
import ChangePasswordModal from "./ChangePasswordModal";

export default function ProfileMenu({
  email,
  isProfileMenuOpen,
  setIsProfileMenuOpen,
  isChangePasswordOpen,
  setIsChangePasswordOpen,
  newPassword,
  confirmNewPassword,
  setNewPassword,
  setConfirmNewPassword,
  onChangePasswordSubmit,
  onLogout,
}) {
  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsProfileMenuOpen((open) => !open)}
      >
        {`${(email?.[0] || "U").toUpperCase()}`}
      </Button>

      {isProfileMenuOpen && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border bg-white shadow-lg">
          <div className="border-b px-4 py-3">
            <p className="font-medium">{email || "User account"}</p>
            <p className="text-xs text-slate-500">Account</p>
          </div>

          <div className="p-2">
            <Button
              variant="outline"
              className="mb-2 w-full"
              onClick={() => {
                setIsProfileMenuOpen(false);
                setIsChangePasswordOpen(true);
              }}
            >
              Change Password
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={onLogout}
            >
              Logout
            </Button>
          </div>
        </div>
      )}

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        newPassword={newPassword}
        confirmNewPassword={confirmNewPassword}
        setNewPassword={setNewPassword}
        setConfirmNewPassword={setConfirmNewPassword}
        onClose={() => {
          setIsChangePasswordOpen(false);
          setNewPassword("");
          setConfirmNewPassword("");
        }}
        onSubmit={onChangePasswordSubmit}
      />
    </div>
  );
}