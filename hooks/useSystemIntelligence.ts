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
                void systemCore.trackEvent({
                  appId,
                  context: 'content',
                  eventType: 'dwell',
                  label: 'content_dwell',
                  meta: { contentId, durationSeconds: duration }
                });
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
            void systemCore.trackEvent({
              appId,
              context: 'content',
              eventType: 'dwell',
              label: 'content_dwell',
              meta: { contentId, durationSeconds: duration }
            });
         }
      }
    };
  }, [appId, contentId]);

  // Reset dwell tracker when content changes
  useEffect(() => {
      hasTrackedDwell.current = false;
      startTimeRef.current = null;
  }, [contentId]);

  // --- Action Wrappers (Non-Blocking) ---

  const trackCopy = useCallback((text: string) => {
    // Fire and forget
    void systemCore.trackEvent({
      appId,
      context: 'content',
      eventType: 'copy',
      label: 'copy',
      meta: { textLength: text.length }
    });
    navigator.clipboard.writeText(text);
  }, [appId]);

  const trackDownload = useCallback(() => {
    void systemCore.trackEvent({
      appId,
      context: 'content',
      eventType: 'download',
      label: 'download',
      meta: { contentId }
    });
  }, [appId, contentId]);

  const trackEdit = useCallback((original: string, final: string) => {
    if (original !== final) {
      void systemCore.trackEvent({
        appId,
        context: 'content',
        eventType: 'input',
        label: 'edit',
        meta: {
          originalLength: original.length,
          finalLength: final.length
        }
      });
    }
  }, [appId]);

  const trackGenerate = useCallback(() => {
    void systemCore.trackEvent({
      appId,
      context: 'action',
      eventType: 'generate',
      label: 'generate'
    });
  }, [appId]);

  const trackError = useCallback((errorMsg: string) => {
    void systemCore.trackEvent({
      appId,
      context: 'error',
      eventType: 'error',
      label: 'error',
      meta: { messageLength: errorMsg.length }
    });
  }, [appId]);

  const trackAction = useCallback((actionName: string) => {
    void systemCore.trackEvent({
      appId,
      context: 'action',
      eventType: 'click',
      label: actionName
    });
  }, [appId]);

  return {
    ref, // Attach this to the main container of the generated content
    trackCopy,
    trackDownload,
    trackEdit,
    trackGenerate,
    trackError,
    trackAction
  };
};
