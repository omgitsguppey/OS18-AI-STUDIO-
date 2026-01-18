
import React from 'react';
import { AppConfig } from '../types';

interface WindowProps {
  app: AppConfig;
  isOpen: boolean;
  isActive: boolean;
  onClose: () => void;
  onFocus: () => void;
  children: React.ReactNode;
  zIndex: number;
}

const Window: React.FC<WindowProps> = ({ 
  app, 
  isOpen, 
  isActive, 
  onClose, 
  onFocus, 
  children,
  zIndex
}) => {
  if (!isOpen) return null;

  return (
    <div
      className={`
        fixed inset-0 w-full h-full
        flex flex-col
        transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1)
        ${isActive 
          ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' 
          : 'opacity-0 scale-95 translate-y-12 pointer-events-none'
        }
      `}
      // Force GPU layer promotion with translate3d(0,0,0) and backface-visibility
      style={{ 
        zIndex: 50 + zIndex,
        transform: isActive ? 'translate3d(0,0,0) scale(1)' : 'translate3d(0, 48px, 0) scale(0.95)',
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
        WebkitFontSmoothing: 'antialiased'
      }}
      onClick={onFocus}
    >
      <div className="absolute inset-0 bg-black shadow-2xl overflow-hidden flex flex-col">
        {/* Safe Area Top for Status Bar */}
        <div className="h-8 w-full shrink-0 z-20 pointer-events-none" />

        {/* Content Container */}
        {/* We add bottom padding to ensure content doesn't get covered by the home indicator */}
        <div className="flex-1 relative w-full h-full overflow-hidden pb-6">
            {children}
        </div>

        {/* Home Indicator / Close Mechanism */}
        <div className="absolute bottom-0 left-0 right-0 h-8 z-50 flex items-center justify-center pb-2 bg-gradient-to-t from-black/20 to-transparent pointer-events-none">
             <div 
                className="w-32 h-1.5 bg-white/50 rounded-full cursor-pointer pointer-events-auto hover:bg-white/80 active:bg-white active:scale-95 transition-all shadow-sm backdrop-blur-md"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
             />
        </div>
      </div>
    </div>
  );
};

export default Window;
