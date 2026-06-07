import { useEffect, useRef, useCallback, useState } from 'react';

export interface Violation {
  id: string;
  type: 'fullscreen_exit' | 'focus_loss' | 'tab_switch' | 'keyboard_shortcut' | 'context_menu';
  timestamp: number;
  details: string;
}

interface UseSecureContestOptions {
  enabled?: boolean;
  maxViolations?: number;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onViolation?: (violation: Violation) => void;
  onFlagParticipant?: () => void;
  emitSocket?: (event: string, data: any) => void;
}

const BLOCKED_SHORTCUTS = [
  { key: 'c', ctrl: true, shift: false, meta: false, name: 'Ctrl+C (Copy)' },
  { key: 'v', ctrl: true, shift: false, meta: false, name: 'Ctrl+V (Paste)' },
  { key: 'x', ctrl: true, shift: false, meta: false, name: 'Ctrl+X (Cut)' },
  { key: 'a', ctrl: true, shift: false, meta: false, name: 'Ctrl+A (Select All)' },
  { key: 'u', ctrl: true, shift: false, meta: false, name: 'Ctrl+U (View Source)' },
  { key: 'i', ctrl: true, shift: true, meta: false, name: 'Ctrl+Shift+I (Dev Tools)' },
  { key: 'j', ctrl: true, shift: true, meta: false, name: 'Ctrl+Shift+J (Console)' },
  { key: 'c', ctrl: true, shift: true, meta: false, name: 'Ctrl+Shift+C (Inspect)' },
  { key: 'F12', ctrl: false, shift: false, meta: false, name: 'F12 (Dev Tools)' },
];

export function useSecureContest({
  enabled = true,
  maxViolations = 3,
  containerRef,
  onViolation,
  onFlagParticipant,
  emitSocket,
}: UseSecureContestOptions) {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);
  const violationCountRef = useRef(0);
  const lastViolationTimeRef = useRef(0);

  const generateViolationId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const logViolation = useCallback(
    (type: Violation['type'], details: string) => {
      if (!enabled || isFlagged) return;

      const now = Date.now();
      if (now - lastViolationTimeRef.current < 500) return;
      lastViolationTimeRef.current = now;

      const violation: Violation = {
        id: generateViolationId(),
        type,
        timestamp: now,
        details,
      };

      setViolations((prev) => [...prev, violation]);
      violationCountRef.current++;

      if (emitSocket) {
        emitSocket('contest:violation', {
          violationId: violation.id,
          type,
          details,
          timestamp: new Date().toISOString(),
          violationCount: violationCountRef.current,
        });
      }

      if (onViolation) {
        onViolation(violation);
      }

      if (violationCountRef.current >= maxViolations) {
        setIsFlagged(true);
        if (onFlagParticipant) {
          onFlagParticipant();
        }
        if (emitSocket) {
          emitSocket('contest:flagged', {
            reason: `Maximum violations (${maxViolations}) exceeded`,
            violationCount: violationCountRef.current,
          });
        }
      }
    },
    [enabled, isFlagged, maxViolations, generateViolationId, onViolation, onFlagParticipant, emitSocket]
  );

  // Fullscreen enforcement
  useEffect(() => {
    if (!enabled || !containerRef?.current) return;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = document.fullscreenElement !== null;
      setIsFullscreen(isCurrentlyFullscreen);

      if (!isCurrentlyFullscreen && isFullscreen) {
        logViolation('fullscreen_exit', 'User exited fullscreen mode');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [enabled, isFullscreen, logViolation, containerRef]);

  const enterFullscreen = useCallback(async () => {
    if (!containerRef?.current) return;
    try {
      if (containerRef.current.requestFullscreen) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error('Failed to enter fullscreen:', err);
    }
  }, [containerRef]);

  // Focus monitoring
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logViolation('tab_switch', 'User switched to another tab or window');
      }
    };

    const handleWindowBlur = () => {
      logViolation('focus_loss', 'Window lost focus (user minimized or switched apps)');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [enabled, logViolation]);

  // Keyboard shortcut blocking
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      const ctrlPressed = e.ctrlKey || e.metaKey;
      const shiftPressed = e.shiftKey;

      if (key === 'F12') {
        e.preventDefault();
        logViolation('keyboard_shortcut', 'Attempted F12 (Dev Tools)');
        return;
      }

      for (const shortcut of BLOCKED_SHORTCUTS) {
        const isMatch =
          shortcut.key === key &&
          shortcut.ctrl === ctrlPressed &&
          shortcut.shift === shiftPressed;

        if (isMatch) {
          e.preventDefault();
          logViolation('keyboard_shortcut', `Blocked: ${shortcut.name}`);
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, logViolation]);

  // Context menu blocking
  useEffect(() => {
    if (!enabled) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logViolation('context_menu', 'Right-click context menu blocked');
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [enabled, logViolation]);

  const clearViolations = useCallback(() => {
    setViolations([]);
    violationCountRef.current = 0;
  }, []);

  const resetFlag = useCallback(() => {
    setIsFlagged(false);
  }, []);

  return {
    violations,
    violationCount: violations.length,
    isFlagged,
    isFullscreen,
    enterFullscreen,
    logViolation,
    clearViolations,
    resetFlag,
  };
}