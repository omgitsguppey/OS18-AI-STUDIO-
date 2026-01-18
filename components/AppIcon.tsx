
import React from 'react';
import { Minus } from 'lucide-react';
import { AppConfig } from '../types';

interface AppIconProps {
  app: AppConfig;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: (e: React.MouseEvent) => void;
  showLabel?: boolean;
  isEditMode?: boolean;
  onRemove?: () => void;
  canRemove?: boolean;
}

const AppIcon: React.FC<AppIconProps> = ({ 
  app, 
  size = 'md', 
  onClick, 
  showLabel = true,
  isEditMode = false,
  onRemove,
  canRemove = false
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10 p-2',
    md: 'w-14 h-14 p-2.5', // Reduced padding slightly for larger icon visibility
    lg: 'w-16 h-16 p-3',
    xl: 'w-24 h-24 p-5', // For store preview
  };

  const IconComponent = app.icon;

  const handleIconClick = (e: React.MouseEvent) => {
    // If in edit mode, prevent opening the app
    if (isEditMode) {
        e.stopPropagation();
        return;
    }
    onClick?.(e);
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent launching app
    onRemove?.();
  };

  return (
    <div 
        className={`flex flex-col items-center gap-2 group cursor-pointer relative ${isEditMode ? 'animate-wiggle' : ''}`} 
        style={{ width: 80 }} // Fixed width for grid alignment
        onClick={handleIconClick}
    >
      <div 
        className={`
          ${sizeClasses[size]} 
          rounded-[22%] 
          bg-gradient-to-br ${app.color} 
          shadow-xl 
          shadow-black/30 
          flex items-center justify-center 
          text-white 
          transition-all duration-300 
          ease-out
          ${!isEditMode && 'hover:scale-105 hover:brightness-110 active:scale-95 hover:shadow-black/40'}
          ring-1 ring-white/20 ring-inset
          relative
          shrink-0
          z-10
        `}
      >
        <IconComponent className="w-full h-full drop-shadow-md" strokeWidth={2.5} />
        
        {/* Remove Button Badge */}
        {isEditMode && canRemove && (
            <div 
                onClick={handleRemoveClick}
                className="absolute -top-2 -left-2 w-6 h-6 bg-gray-200/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm z-20 hover:bg-gray-300 active:scale-90 transition-transform"
            >
                <Minus size={14} className="text-gray-600 font-bold" strokeWidth={4} />
            </div>
        )}
      </div>
      {showLabel && (
        <span className="text-white text-[11px] font-medium tracking-tight drop-shadow-md opacity-90 group-hover:opacity-100 text-center leading-tight line-clamp-2 w-[88px]">
          {app.name}
        </span>
      )}
    </div>
  );
};

export default AppIcon;
