
import { useEffect, useRef, useCallback } from 'react';
import { systemCore } from '../services/systemCore';

export const useSystemIntelligence = (appId: string, contentId?: string, content?: string) => {
  const ref = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const hasTrackedDwell = useRef(false);

  // 1. DOM-Level Dwell Tracking
  useEffect(() => {
    if (!ref.current || !contentId) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startTimeRef.current = Date.now();
          } else {
            if (startTimeRef.current && !hasTrackedDwell.current) {
              const duration = (Date.now() - startTimeRef.current) / 1000;
              if (duration > 2) { // Minimum 2s to count as dwell
                systemCore.trackInteraction(appId, 'dwell', { contentId, duration });
                hasTrackedDwell.current = true; // Only track once per mount/content
              }
              startTimeRef.current = null;
            }
          }
        });
      },
      { threshold: 0.7 } // 70% visible
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
      // Track on unmount if visible
      if (startTimeRef.current && !hasTrackedDwell.current) {
         const duration = (Date.now() - startTimeRef.current) / 1000;
         if (duration > 2) {
            systemCore.trackInteraction(appId, 'dwell', { contentId, duration });
         }
      }
    };
  }, [appId, contentId]);

  // Reset dwell tracker when content changes
  useEffect(() => {
      hasTrackedDwell.current = false;
      startTimeRef.current = null;
  }, [contentId]);

  // --- Action Wrappers ---

  const trackCopy = useCallback((text: string) => {
    systemCore.trackInteraction(appId, 'copy', { text });
    navigator.clipboard.writeText(text);
  }, [appId]);

  const trackDownload = useCallback(() => {
    systemCore.trackInteraction(appId, 'download', { contentId });
  }, [appId, contentId]);

  const trackEdit = useCallback((original: string, final: string) => {
    if (original !== final) {
        systemCore.trackInteraction(appId, 'edit', { original, final });
    }
  }, [appId]);

  const trackAction = useCallback((actionName: string) => {
      // Generic tracker for clicks/toggles
      systemCore.trackInteraction(appId, 'open', { label: actionName });
  }, [appId]);

  return {
    ref, // Attach this to the main container of the generated content
    trackCopy,
    trackDownload,
    trackEdit,
    trackAction
  };
};
