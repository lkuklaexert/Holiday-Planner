/**
 * Reusable toast notification component.
 *
 * Centralising toast UI keeps feedback messages consistent and allows
 * alert() calls to be removed safely without changing business logic.
 */
export default function Toast({ toast, onClose }) {
    if (!toast) return null;
  
    const variants = {
      success: "border-emerald-200 bg-emerald-50 text-emerald-800",
      error: "border-red-200 bg-red-50 text-red-800",
      info: "border-slate-200 bg-white text-slate-800",
    };
  
    return (
      <div className="fixed bottom-4 right-4 z-[60] max-w-sm">
        <div
          className={`rounded-xl border px-4 py-3 shadow-lg ${
            variants[toast.type] || variants.info
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium">{toast.message}</p>
  
            <button
              type="button"
              onClick={onClose}
              className="text-lg leading-none opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    );
  }