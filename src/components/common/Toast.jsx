/**
 * Enterprise notification component.
 *
 * Designed to provide consistent feedback throughout the application.
 * Positioned beneath the application header so notifications are always visible
 * without obscuring forms or action buttons.
 */
export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const variants = {
    success: {
      icon: "✓",
      classes: "border-emerald-300 bg-emerald-50 text-emerald-900",
    },
    error: {
      icon: "✕",
      classes: "border-red-300 bg-red-50 text-red-900",
    },
    warning: {
      icon: "⚠",
      classes: "border-amber-300 bg-amber-50 text-amber-900",
    },
    info: {
      icon: "ℹ",
      classes: "border-sky-300 bg-sky-50 text-sky-900",
    },
  };

  const variant = variants[toast.type] || variants.info;

  return (
    <div className="pointer-events-none fixed left-1/2 top-5 z-[9999] w-full max-w-xl -translate-x-1/2 px-4">
      <div
        className={`pointer-events-auto overflow-hidden rounded-2xl border shadow-xl transition-all duration-300 ${variant.classes}`}
      >
        <div className="flex items-start gap-4 p-4">
          <div className="text-xl font-bold">
            {variant.icon}
          </div>

          <div className="flex-1">
            <p className="font-semibold">
              {toast.message}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-lg opacity-60 transition hover:opacity-100"
          >
            ×
          </button>
        </div>

        <div className="h-1 bg-black/10">
          <div className="h-full w-full animate-pulse bg-current opacity-25" />
        </div>
      </div>
    </div>
  );
}