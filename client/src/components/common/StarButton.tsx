import React from 'react';
import { Star } from 'lucide-react';

interface StarButtonProps {
  isStarred?: boolean;
  onToggle?: () => void;
  className?: string;
  size?: number;
  title?: string;
  disabled?: boolean;
}

const StarButton: React.FC<StarButtonProps> = ({
  isStarred = false,
  onToggle,
  className = "",
  size = 16,
  title,
  disabled = false
}) => {
  const handleClick = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!disabled && onToggle) {
      onToggle();
    }
  };

  return (
    <button
      className={`p-1.5 rounded-lg transition-colors duration-200 inline-flex ${
        isStarred
          ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
          : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      onClick={handleClick}
      title={title || (isStarred ? 'Remove from saved' : 'Save item')}
      disabled={disabled}
    >
      <Star
        size={size}
        className={isStarred ? 'fill-current' : ''}
      />
    </button>
  );
};

export default StarButton;