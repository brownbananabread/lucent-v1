import { Layers } from "lucide-react";

interface LogoProps {
  isExpanded?: boolean;
  onClick?: () => void;
  color?: "white" | "standard";
}

const Logo = ({ isExpanded = true, onClick, color = "standard" }: LogoProps) => {
  const isWhite = color === "white";
  
  if (isExpanded) {
    return (
      <div className="flex items-center gap-3">
        <a 
          href="/dashboard"
          onClick={onClick}
          className={`flex items-center justify-center w-10 h-10 rounded-lg ${
        isWhite 
          ? "bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15" 
          : "bg-gradient-to-br from-emerald-500 to-teal-600 hover:brightness-105"
          } transition-all duration-300 hover:scale-105`}
        >
          <Layers size={20} className="text-white" />
        </a>
        <div className="flex flex-col items-start">
          <a 
        href="/dashboard" 
        onClick={onClick}
        className="flex items-center gap-1 hover:opacity-90 transition-all duration-200"
          >
        <span className={`text-xl font-bold tracking-tight ${
          isWhite ? "text-white" : "text-gray-900 dark:text-gray-100"
        }`}>Lucent</span>
        <code className={`text-xs font-mono px-1 py-0.5 rounded ${
          isWhite 
            ? "bg-white/10 backdrop-blur-sm text-white/80 border border-white/20"
            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
        }`}>v1</code>
          </a>
          <a
        href="https://greengravity.com/"
        target="_blank"
        rel="noopener noreferrer"
        className={`text-[10px] font-medium uppercase tracking-wider ${
          isWhite 
            ? "text-white/60 hover:text-white/80" 
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        } underline-offset-2 hover:underline`}
          >
        Green Gravity
          </a>
        </div>
      </div>
    );
  }

  return (
    <button 
      onClick={onClick} 
      className={`group flex items-center justify-center w-10 h-10 rounded-lg ${
        isWhite 
          ? "bg-white/10 backdrop-blur-sm border border-white/20 group-hover:bg-white/15" 
          : "bg-gradient-to-br from-emerald-500 to-teal-600 hover:brightness-105"
      } transition-all duration-300 group-hover:scale-105`}
    >
      <Layers size={20} className="text-white" />
    </button>
  );
};

export default Logo; 