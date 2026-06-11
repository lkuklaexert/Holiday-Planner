import { createContext, useContext, useMemo, useState } from "react";
import Toast from "./Toast";

const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}

/**
 * Provides application-wide toast notifications.
 *
 * Keeping notification state outside App.jsx prevents prop drilling later
 * when App.jsx is split into feature modules.
 */
export default function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  function showToast(message, type = "info") {
    setToast({ message, type });

    window.setTimeout(() => {
      setToast(null);
    }, 4000);
  }

  const value = useMemo(
    () => ({
      showToast,
      hideToast: () => setToast(null),
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </ToastContext.Provider>
  );
}