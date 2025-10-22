import { Sun, Moon, ArrowLeft } from "lucide-react";
import PageMeta from "../components/common/PageMeta";
import Logo from "../components/common/Logo";
import { useNavigate } from "react-router";
import { useTheme } from "../contexts/ThemeContext";

export default function NotFound() {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <>
      <PageMeta
        title="404 Not Found | Lucent"
        description="The page you are looking for could not be found"
      />
      <div className="relative bg-white z-1 dark:bg-gray-900 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-full blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-tr from-blue-100 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-full blur-3xl opacity-20 animate-pulse delay-1000"></div>
        </div>

        <div className="relative flex flex-col w-full h-screen lg:flex-row dark:bg-gray-900">
          <div className="flex-1 lg:w-1/2 flex flex-col p-4 bg-white dark:bg-gray-900">
            {/* Logo positioned halfway between top and content */}
            <div className="flex-1 flex items-center justify-center">
              <Logo isExpanded={true} color="standard" />
            </div>
            
            {/* 404 Content centered in the middle of the page */}
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full max-w-md">
                <div className="transform transition-all duration-500 ease-out">
                  {/* 404 Header */}
                  <div className="mb-8 text-center">
                    <h1 className="text-9xl font-bold text-gray-300 dark:text-gray-600 mb-4">404</h1>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90 mb-2">
                      Page Not Found
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      The page you are looking for could not be found
                    </p>
                  </div>

                  {/* Back Button */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => navigate(-1)}
                      className="flex items-center rounded-lg px-4 py-2 text-xs transition-all duration-200 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      <span>Go Back</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Empty space to balance the layout */}
            <div className="flex-1"></div>
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