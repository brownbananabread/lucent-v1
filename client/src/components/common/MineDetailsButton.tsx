import React from 'react';
import { Maximize } from 'lucide-react';

interface MineDetailsButtonProps {
  mineId: string;
  onOpenDetails: (mineId: string) => void;
  className?: string;
  size?: number;
  title?: string;
}

const MineDetailsButton: React.FC<MineDetailsButtonProps> = ({
  mineId,
  onOpenDetails,
  className = "",
  size = 16,
  title = "View Details"
}) => {
  return (
    <button
      className={`p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-200 inline-flex ${className}`}
      onClick={() => onOpenDetails(mineId)}
      title={title}
    >
      <Maximize size={size} />
    </button>
  );
};

export default MineDetailsButton;