'use client';

import { useEffect, useRef } from 'react';

interface KeystrokeLoggerProps {
  assessmentId: string;
}

export default function KeystrokeLogger({ assessmentId }: KeystrokeLoggerProps) {
  const eventsRef = useRef<Array<{ type: string; timestamp: number }>>([]);
  const pasteCountRef = useRef(0);
  const tabSwitchCountRef = useRef(0);
  const anomalyFlagsRef = useRef<string[]>([]);

  // Periodically send logs to the server
  const flushLogs = async () => {
    if (eventsRef.current.length === 0 && pasteCountRef.current === 0 && tabSwitchCountRef.current === 0) {
      return;
    }

    try {
      const payload = {
        assessmentId,
        events: eventsRef.current,
        pasteCount: pasteCountRef.current,
        tabSwitchCount: tabSwitchCountRef.current,
        anomalyFlags: anomalyFlagsRef.current,
      };

      await fetch('/api/assessment/keystrokes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('Failed to flush keystroke logs:', err);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Log keystroke time
      eventsRef.current.push({
        type: 'keydown',
        timestamp: Date.now(),
      });

      // Detect Ctrl+V or Cmd+V paste events manually as a fallback
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        pasteCountRef.current += 1;
        eventsRef.current.push({
          type: 'shortcut_paste',
          timestamp: Date.now(),
        });
        if (pasteCountRef.current > 3 && !anomalyFlagsRef.current.includes('excessive_pasting')) {
          anomalyFlagsRef.current.push('excessive_pasting');
        }
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      pasteCountRef.current += 1;
      eventsRef.current.push({
        type: 'paste',
        timestamp: Date.now(),
      });
      if (pasteCountRef.current > 3 && !anomalyFlagsRef.current.includes('excessive_pasting')) {
        anomalyFlagsRef.current.push('excessive_pasting');
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        tabSwitchCountRef.current += 1;
        eventsRef.current.push({
          type: 'tab_switch_hidden',
          timestamp: Date.now(),
        });
        if (tabSwitchCountRef.current > 5 && !anomalyFlagsRef.current.includes('excessive_tab_switches')) {
          anomalyFlagsRef.current.push('excessive_tab_switches');
        }
      } else {
        eventsRef.current.push({
          type: 'tab_switch_visible',
          timestamp: Date.now(),
        });
      }
    };

    const handleBlur = () => {
      eventsRef.current.push({
        type: 'window_blur',
        timestamp: Date.now(),
      });
    };

    // Attach listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Setup periodic flush (every 30 seconds)
    const interval = setInterval(flushLogs, 30000);

    return () => {
      // Clean up listeners
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      clearInterval(interval);
      
      // Flush remaining logs immediately on unmount
      flushLogs();
    };
  }, [assessmentId]);

  return null;
}
