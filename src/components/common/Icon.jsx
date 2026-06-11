/**
 * Reusable icon component.
 *
 * Provides a consistent way to render simple UI icons
 * throughout the application.
 */
export default function Icon({ label }) {
    const symbols = {
      plus: "+",
      trash: "🗑",
      calendar: "📅",
      users: "👥",
      pencil: "✎",
      save: "✓",
      close: "×",
    };
  
    return <span>{symbols[label] || "•"}</span>;
  }