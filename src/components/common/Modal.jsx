/**
 * Generic reusable modal.
 *
 * Used as the base for confirmation dialogs, forms and future pop-up screens.
 */
export default function Modal({
    open,
    title,
    children,
    footer,
    onClose,
  }) {
    if (!open) return null;
  
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
  
            <button
              type="button"
              onClick={onClose}
              className="text-xl text-slate-500 hover:text-slate-900"
            >
              ×
            </button>
          </div>
  
          <div className="px-5 py-5">{children}</div>
  
          {footer && (
            <div className="flex justify-end gap-2 border-t px-5 py-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    );
  }