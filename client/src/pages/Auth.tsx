import { useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { useNavigate } from "react-router";
import PageMeta from "../components/common/PageMeta";
import Logo from "../components/common/Logo";
import NameForm from "../components/auth/NameForm";
import AuthSidePanel from "../components/auth/AuthSidePanel";

export default function Auth() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    const profile = localStorage.getItem('profile');
    if (profile) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  return (
    <>
      <PageMeta
        title="Welcome | Green Gravity"
        description="Welcome to Green Gravity Lucent"
      />
      <div className="relative bg-white z-1 dark:bg-gray-900 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-full blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-tr from-blue-100 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-full blur-3xl opacity-20 animate-pulse delay-1000"></div>
        </div>

        <div className="relative flex flex-col w-full h-screen lg:flex-row dark:bg-gray-900">
          <div className="flex-1 lg:w-1/2 flex flex-col p-4 bg-white dark:bg-gray-900">
            {/* Logo positioned halfway between top and form */}
            <div className="flex-1 flex items-center justify-center">
              <Logo isExpanded={true} color="standard" />
            </div>
            
            {/* Forms centered in the middle of the page */}
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full max-w-md">
                <NameForm />
              </div>
            </div>
            
            {/* Empty space to balance the layout */}
            <div className="flex-1"></div>
          </div>
          
          {/* Desktop Side Panel - only visible on desktop */}
          <div className="hidden lg:flex lg:flex-1 lg:w-1/2">
            <AuthSidePanel />
          </div>
        </div>
        
        {/* Enhanced Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="fixed bottom-4 left-4 group p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-700 dark:text-white rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-all duration-300 shadow-md hover:shadow-lg border border-gray-200 dark:border-gray-700 z-10"
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          <div className="relative w-4 h-4">
            <Sun 
              size={16} 
              className={`absolute inset-0 transform transition-all duration-300 ${
                isDarkMode ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
              }`} 
            />
            <Moon 
              size={16} 
              className={`absolute inset-0 transform transition-all duration-300 ${
                isDarkMode ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
              }`} 
            />
          </div>
        </button>
      </div>
    </>
  );
}
