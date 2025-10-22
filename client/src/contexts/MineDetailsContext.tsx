import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface MineDetailsContextType {
  isOpen: boolean;
  mineId: string | null;
  openMineDetails: (mineId: string) => void;
  closeMineDetails: () => void;
}

const MineDetailsContext = createContext<MineDetailsContextType | undefined>(undefined);

export function useMineDetails() {
  const context = useContext(MineDetailsContext);
  if (context === undefined) {
    throw new Error('useMineDetails must be used within a MineDetailsProvider');
  }
  return context;
}

interface MineDetailsProviderProps {
  children: ReactNode;
}

export function MineDetailsProvider({ children }: MineDetailsProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mineId, setMineId] = useState<string | null>(null);

  const openMineDetails = (id: string) => {
    setMineId(id);
    setIsOpen(true);
  };

  const closeMineDetails = () => {
    setIsOpen(false);
    setMineId(null);
  };

  const value = {
    isOpen,
    mineId,
    openMineDetails,
    closeMineDetails,
  };

  return (
    <MineDetailsContext.Provider value={value}>
      {children}
    </MineDetailsContext.Provider>
  );
}