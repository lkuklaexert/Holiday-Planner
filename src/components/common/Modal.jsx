/**
 * Reusable modal component.
 *
 * Provides a consistent overlay and dialog layout for
 * confirmation dialogs, forms and future pop-up screens.
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
  
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-lg font-semibold">
              {title}
            </h2>
  
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-800"
            >
              ✕
            </button>
          </div>
  
          <div className="p-6">
            {children}
          </div>
  
          {footer && (
            <div className="flex justify-end gap-2 border-t px-6 py-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    );
  }