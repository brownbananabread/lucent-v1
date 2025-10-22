import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface SparklesButtonProps {
  onClick: () => void;
}

export default function SparklesButton({ onClick }: SparklesButtonProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger slide-up on first paint
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <button
      onClick={onClick}
      aria-label="AI Assistant"
      title="Chat with AI Assistant"
      className={[
        "fixed bottom-6 right-6 z-[100] p-3 rounded-full",
        "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md",
        "transition-transform duration-300",
        mounted ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0",
        ""
      ].join(" ")}
    >
      <Sparkles size={16} className="text-white" />
    </button>
  );
}