/**
 * Reusable card components.
 *
 * Used to wrap related content in a consistent white panel layout.
 */
export function Card({ children }) {
    return <div className="rounded-2xl bg-white shadow-sm">{children}</div>;
  }
  
  export function CardContent({ children, className = "" }) {
    return <div className={className}>{children}</div>;
  }