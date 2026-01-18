
import React, { useEffect, useState } from 'react';
import { X, ArrowRight, Check } from 'lucide-react';

interface OnboardingOverlayProps {
  appId: string;
  title: string;
  subtitle: string;
  features: { icon: React.ElementType; title: string; description: string }[];
  onComplete?: () => void;
  forceShow?: boolean;
}

const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ 
  appId, 
  title, 
  subtitle, 
  features, 
  onComplete,
  forceShow = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const storageKey = `onboarding_seen_${appId}`;

  useEffect(() => {
    const hasSeen = localStorage.getItem(storageKey);
    if (!hasSeen || forceShow) {
      setIsVisible(true);
    }
  }, [appId, forceShow]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(storageKey, 'true');
    if (onComplete) onComplete();
  };

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-end sm:justify-center bg-black/60 backdrop-blur-xl animate-fade-in p-6">
      <div className="w-full max-w-sm bg-[#1c1c1e] rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 flex flex-col max-h-[85vh] animate-slide-up">
        
        {/* Header */}
        <div className="pt-10 pb-6 px-8 text-center bg-gradient-to-b from-white/5 to-transparent">
          <h2 className="text-3xl font-black mb-2 tracking-tight text-white">{title}</h2>
          <p className="text-gray-400 font-medium text-sm leading-relaxed">{subtitle}</p>
        </div>

        {/* Features List */}
        <div className="flex-1 overflow-y-auto px-8 py-2 space-y-8 custom-scrollbar">
          {features.map((feature, idx) => (
            <div key={idx} className="flex gap-5 items-start">
              <div className="shrink-0 mt-1">
                <feature.icon size={28} className="text-[#007AFF]" strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[15px] leading-tight text-white">{feature.title}</h3>
                <p className="text-[13px] text-gray-400 leading-relaxed font-medium">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Action */}
        <div className="p-8 pt-6 bg-gradient-to-t from-[#1c1c1e] to-transparent">
          <button 
            onClick={handleDismiss}
            className="w-full py-4 bg-[#007AFF] hover:bg-[#0063ce] active:scale-95 transition-all rounded-2xl font-bold text-white text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingOverlay;
