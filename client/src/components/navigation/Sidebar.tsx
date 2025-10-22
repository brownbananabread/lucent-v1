import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Search, PanelLeftOpen, PanelLeftClose, GitCompare,
  ClipboardList, Brain, FolderOpen,
  User, Sun, Moon,
  MapPin,
  Home,
  TextSearch,
  // Unplug,
  ShoppingCart
} from "lucide-react";
import { useSidebar } from "../../contexts/SidebarContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useAlert } from "../../contexts/AlertContext";
import Logo from "../common/Logo";

const navigation = [
  {
    title: "",
    items: [
      { name: "Dashboard (UI)", icon: <Home size={18} />, path: "/dashboard" },
      { name: "Search", icon: <Search size={18} />, path: "/search" },
    ]
  },
  {
    title: "Data Management",
    items: [
      { name: "Library", icon: <FolderOpen size={18} />, path: "/library" },
      { name: "SQL Editor", icon: <TextSearch size={18} />, path: "/data-management/sql-editor" },
    ]
  },
  {
    title: "ETL Pipeline",
    items: [
      // { name: "Integrations", icon: <Unplug size={18} />, path: "/etl-pipeline/integrations" },
      { name: "Workflows", icon: <GitCompare size={18} />, path: "/etl-pipeline/workflows" },
    ]
  },
  {
    title: "Visualisation",
    items: [
      { name: "Interactive Map", icon: <MapPin size={18} />, path: "/visualisation/interactive-map" },
      { name: "Evaluation Board", icon: <ClipboardList size={18} />, path: "/visualisation/evaluation-board" },
    ]
  },
  {
    title: "ML Studio",
    items: [
      { name: "Feature Store", icon: <ShoppingCart size={18} />, path: "/ml-studio/feature-store" },
      { name: "Models", icon: <Brain size={18} />, path: "/ml-studio/models" },
    ]
  },
];

const AppSidebar = () => {
  const { isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { showAlert } = useAlert();
  const location = useLocation();
  const navigate = useNavigate();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const isShowingExpanded = isMobileOpen || isExpanded;
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  useEffect(() => {
    const storedProfile = localStorage.getItem('profile');
    if (storedProfile) setProfile(JSON.parse(storedProfile));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        navigate('/search');
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  useEffect(() => {
    const handleClose = () => toggleSidebar();
    const handleCloseMobile = () => toggleMobileSidebar();
    window.addEventListener('sidebar:close', handleClose);
    window.addEventListener('sidebar:close-mobile', handleCloseMobile);
    return () => {
      window.removeEventListener('sidebar:close', handleClose);
      window.removeEventListener('sidebar:close-mobile', handleCloseMobile);
    };
  }, [toggleSidebar, toggleMobileSidebar]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };

    if (isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileDropdownOpen]);

  const handleSidebarToggle = () => {
    window.innerWidth >= 1024 ? toggleSidebar() : toggleMobileSidebar();
  };

  const handleLogout = () => {
    localStorage.removeItem('profile');
    setProfile(null);
    showAlert({
      title: "Logged Out Successfully",
      message: "You have been logged out of your account",
      variant: "success"
    });
    navigate('/auth', { replace: true });
  };

  return (
    <aside className={`flex h-full flex-col bg-white dark:bg-gray-900 transition-all duration-300 ease-in-out border-r border-gray-200 dark:border-gray-800 overflow-visible ${isShowingExpanded ? "w-[236px]" : "w-[74px]"} select-none group relative`}>
      

      <div className="flex h-full flex-col overflow-hidden">
        
        {/* Header */}
        <div className="pt-10 pb-4">
          <div className="flex justify-center items-center">
            <Logo isExpanded={isShowingExpanded} onClick={() => navigate('/')} />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
            <div className={`${isShowingExpanded ? "space-y-2" : "space-y-0"}`}>
            {navigation.map((section, i) => (
              <div key={i}>
                {section.title && (
                  <h6 className={`mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-500 ${!isShowingExpanded ? "text-center px-0" : ""}`}>
                    {isShowingExpanded ? section.title : ""}
                  </h6>
                )}
                
                <div className={`${isShowingExpanded ? "p-2" : "p-1"}`}>
                  <ul className={`flex flex-col ${isShowingExpanded ? "gap-1.5" : "gap-0"} w-full`}>
                    {section.items.map((item) => (
                      <li key={item.name}>
                        <button
                          onClick={() => navigate(item.path)}
                          className={`flex items-center rounded-lg transition-all font-medium text-sm duration-200 w-full
                            ${isActive(item.path)
                              ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                              : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"}
                            ${!isShowingExpanded ? "justify-center p-3 mx-auto" : "justify-start p-2.5"}`}
                        >
                          <span className={`transition-colors ${isActive(item.path) ? "text-gray-700 dark:text-gray-300" : "text-gray-500 dark:text-gray-400"}`}>
                            {item.icon}
                          </span>
                          {isShowingExpanded && <span className="ml-3 flex-1 text-left">{item.name}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Profile Section */}
        {isShowingExpanded && (
          <div className="relative p-3" ref={profileDropdownRef}>
            <div className="flex items-center gap-2">
              <div className="flex items-center w-full gap-1">
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 flex-1"
                >
                  <div className="flex items-center">
                    <span className="transition-colors text-gray-500 dark:text-gray-400">
                      <User size={18} />
                    </span>
                    <span className="ml-3">{profile?.firstName} {profile?.lastName}</span>
                  </div>
                </button>

                <button
                  onClick={handleSidebarToggle}
                  className="flex items-center justify-center rounded-lg p-2 text-sm font-medium transition-all duration-200 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800 w-8 h-8"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose size={16} />
                </button>
              </div>
            </div>
            

            {/* Profile Dropdown */}
            {isProfileDropdownOpen && (
              <div className="absolute left-3 right-3 bottom-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden">
                
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 text-white font-medium text-sm shadow-sm">
                    {profile ? `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}` : 'U'}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{profile ? `${profile.firstName} ${profile.lastName}` : 'User'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Authenticated {profile?.authenticatedAt ? new Date(profile.authenticatedAt).toLocaleDateString() : ''}</div>
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => {
                      toggleDarkMode();
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-left transition-colors flex items-center gap-2 border-b border-gray-100 dark:border-gray-800"
                  >
                    {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                    {isDarkMode ? "Light Mode" : "Dark Mode"}
                  </button>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 text-left transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Expand Button - Only show when collapsed */}
        {!isShowingExpanded && (
          <div className="p-3">
            <button
              onClick={handleSidebarToggle}
              className="flex items-center justify-center rounded-lg p-2 text-sm font-medium transition-all duration-200 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800 w-8 h-8 mx-auto"
              title="Expand sidebar"
            >
              <PanelLeftOpen size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;