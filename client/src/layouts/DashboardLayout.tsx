import { SidebarProvider } from "../contexts/SidebarContext";
import { Outlet } from "react-router";
import AppSidebar from "../components/navigation/Sidebar";
import AssistantButton from "../components/common/AssistantButton";
import { AssistantModal } from "../components/modals/AssistantModal";
import { useSidebar } from "../contexts/SidebarContext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAlert } from "../contexts/AlertContext";
import { useMineDetails } from "../contexts/MineDetailsContext";
import { MineDetailsPanel } from "../components/modals/MineDetailsPanel";

const LayoutContent: React.FC = () => {
  const { isExpanded, toggleSidebar } = useSidebar();
  const [isSparklesModalOpen, setIsSparklesModalOpen] = useState(false);
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const { isOpen, mineId, closeMineDetails } = useMineDetails();

  useEffect(() => {
    // Check localStorage for profile
    const storedProfile = localStorage.getItem('profile');
    if (!storedProfile) {
      showAlert({
        title: "Authentication Required",
        message: "Please log in to access this resource",
        variant: "error"
      });
      navigate('/auth', { replace: true });
    }
  }, []);

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarExpanded');
    if (savedState !== null) {
      const shouldBeExpanded = savedState === 'true';
      if (shouldBeExpanded !== isExpanded) {
        toggleSidebar();
      }
    }
  }, []);

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('sidebarExpanded', isExpanded.toString());
  }, [isExpanded]);

  // Listen for custom event to open assistant modal
  useEffect(() => {
    const handleOpenAssistant = () => {
      setIsSparklesModalOpen(true);
    };

    window.addEventListener('openAssistant', handleOpenAssistant);

    return () => {
      window.removeEventListener('openAssistant', handleOpenAssistant);
    };
  }, []);

  return (
    <div className="flex h-screen">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className={`overflow-auto transition-all duration-300 ease-in-out ${
          isOpen ? 'flex-1' : 'flex-1'
        }`}>
          <Outlet />
        </main>
        <MineDetailsPanel 
          isOpen={isOpen}
          mine_id={mineId}
          onClose={closeMineDetails}
        />
      </div>
      <AssistantButton onClick={() => setIsSparklesModalOpen(true)} />
      <AssistantModal 
        isOpen={isSparklesModalOpen} 
        onClose={() => setIsSparklesModalOpen(false)} 
      />
    </div>
  );
};

const DashboardLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default DashboardLayout;