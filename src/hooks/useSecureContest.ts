/**
 * useSecureContest Hook
 * Comprehensive anti-cheating system for secure coding contests
 *
 * Features:
 * - Fullscreen enforcement with exit detection
 * - Focus monitoring (tab switching, window blur)
 * - Copy/paste/cut shortcut and clipboard blocking
 * - Dangerous shortcut blocking
 * - Violation tracking and logging
 * - Socket event emission for backend logging
 * - Auto-disqualification after max warnings
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';

export type ViolationType =
  | 'fullscreen_exit'
  | 'focus_loss'
  | 'tab_switch'
  | 'keyboard_shortcut'
  | 'context_menu'
  | 'copy_attempt'
  | 'paste_attempt'
  | 'cut_attempt'
  | 'select_all_attempt';

export interface Violation {
  id: string;
  type: ViolationType;
  timestamp: number;
  details: string;
}

export interface ViolationStats {
  fullscreenExits: number;
  tabSwitches: number;
  focusLoss: number;
  copyAttempts: number;
  pasteAttempts: number;
  cutAttempts: number;
  selectAllAttempts: number;
  contextMenu: number;
  other: number;
  total: number;
}

interface UseSecureContestOptions {
  enabled?: boolean;
  maxViolations?: number;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onViolation?: (violation: Violation) => void;
  onFlagParticipant?: (reason: string) => void;
  onDisqualify?: (reason: string) => void;
  emitSocket?: (event: string, data: any) => void;
}

interface BlockedShortcut {
  key: string;
  ctrl: boolean;
  shift: boolean;
  meta: boolean;
  name: string;
  violationType: ViolationType;
}

const BLOCKED_SHORTCUTS: BlockedShortcut[] = [
  { key: 'C', ctrl: true, shift: false, meta: false, name: 'Ctrl+C (Copy)', violationType: 'copy_attempt' },
  { key: 'V', ctrl: true, shift: false, meta: false, name: 'Ctrl+V (Paste)', violationType: 'paste_attempt' },
  { key: 'X', ctrl: true, shift: false, meta: false, name: 'Ctrl+X (Cut)', violationType: 'cut_attempt' },
  { key: 'A', ctrl: true, shift: false, meta: false, name: 'Ctrl+A (Select All)', violationType: 'select_all_attempt' },
  { key: 'U', ctrl: true, shift: false, meta: false, name: 'Ctrl+U (View Source)', violationType: 'keyboard_shortcut' },
  { key: 'I', ctrl: true, shift: true, meta: false, name: 'Ctrl+Shift+I (Dev Tools)', violationType: 'keyboard_shortcut' },
  { key: 'J', ctrl: true, shift: true, meta: false, name: 'Ctrl+Shift+J (Console)', violationType: 'keyboard_shortcut' },
  { key: 'C', ctrl: true, shift: true, meta: false, name: 'Ctrl+Shift+C (Inspect)', violationType: 'keyboard_shortcut' },
  { key: 'F12', ctrl: false, shift: false, meta: false, name: 'F12 (Dev Tools)', violationType: 'keyboard_shortcut' },
];

function computeViolationStats(violations: Violation[]): ViolationStats {
  const stats: ViolationStats = {
    fullscreenExits: 0,
    tabSwitches: 0,
    focusLoss: 0,
    copyAttempts: 0,
    pasteAttempts: 0,
    cutAttempts: 0,
    selectAllAttempts: 0,
    contextMenu: 0,
    other: 0,
    total: violations.length,
  };

  for (const v of violations) {
    switch (v.type) {
      case 'fullscreen_exit':
        stats.fullscreenExits++;
        break;
      case 'tab_switch':
        stats.tabSwitches++;
        break;
      case 'focus_loss':
        stats.focusLoss++;
        break;
      case 'copy_attempt':
        stats.copyAttempts++;
        break;
      case 'paste_attempt':
        stats.pasteAttempts++;
        break;
      case 'cut_attempt':
        stats.cutAttempts++;
        break;
      case 'select_all_attempt':
        stats.selectAllAttempts++;
        break;
      case 'context_menu':
        stats.contextMenu++;
        break;
      default:
        stats.other++;
    }
  }

  return stats;
}

export function useSecureContest({
  enabled = true,
  maxViolations = 3,
  containerRef,
  onViolation,
  onFlagParticipant,
  onDisqualify,
  emitSocket,
}: UseSecureContestOptions) {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);
  const violationCountRef = useRef(0);
  const lastViolationTimeRef = useRef(0);
  const wasFullscreenRef = useRef(false);
  const isFlaggedRef = useRef(false);

  const violationStats = useMemo(() => computeViolationStats(violations), [violations]);

  const generateViolationId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const disqualifyParticipant = useCallback(
    (reason: string) => {
      if (isFlaggedRef.current) return;
      isFlaggedRef.current = true;
      setIsFlagged(true);

      if (onDisqualify) {
        onDisqualify(reason);
      } else if (onFlagParticipant) {
        onFlagParticipant(reason);
      }
      if (emitSocket) {
        emitSocket('contest:flagged', {
          reason,
          violationCount: violationCountRef.current,
          disqualified: true,
        });
      }
    },
    [onFlagParticipant, onDisqualify, emitSocket]
  );

  const logViolation = useCallback(
    (type: ViolationType, details: string) => {
      if (!enabled || isFlaggedRef.current) return;

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
        disqualifyParticipant(
          `Contest Disqualified — maximum warnings (${maxViolations}) exceeded`
        );
      }
    },
    [enabled, maxViolations, generateViolationId, onViolation, emitSocket, disqualifyParticipant]
  );

  /** Fullscreen enforcement */
  useEffect(() => {
    if (!enabled || !containerRef?.current) return;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen =
        document.fullscreenElement === containerRef.current ||
        document.fullscreenElement !== null;

      if (!isCurrentlyFullscreen && wasFullscreenRef.current) {
        logViolation('fullscreen_exit', 'User exited fullscreen mode during contest');
      }

      wasFullscreenRef.current = isCurrentlyFullscreen;
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [enabled, logViolation, containerRef]);

  const enterFullscreen = useCallback(async () => {
    if (!containerRef?.current || isFlaggedRef.current) return;
    try {
      if (containerRef.current.requestFullscreen) {
        await containerRef.current.requestFullscreen();
        wasFullscreenRef.current = true;
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error('Failed to enter fullscreen:', err);
    }
  }, [containerRef]);

  /** Focus monitoring */
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logViolation('tab_switch', 'User switched to another tab or window');
      }
    };

    const handleWindowBlur = () => {
      if (document.hidden) return;
      logViolation('focus_loss', 'Window lost focus (minimized or switched applications)');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [enabled, logViolation]);

  /** Keyboard shortcut blocking */
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toUpperCase() : e.key.toUpperCase();
      const ctrlPressed = e.ctrlKey || e.metaKey;
      const shiftPressed = e.shiftKey;

      if (key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        logViolation('keyboard_shortcut', 'Blocked: F12 (Dev Tools)');
        return;
      }

      for (const shortcut of BLOCKED_SHORTCUTS) {
        const isMatch =
          shortcut.key === key &&
          shortcut.ctrl === ctrlPressed &&
          shortcut.shift === shiftPressed;

        if (isMatch) {
          e.preventDefault();
          e.stopPropagation();
          logViolation(shortcut.violationType, `Blocked: ${shortcut.name}`);
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled, logViolation]);

  /** Clipboard event blocking (copy / cut / paste) */
  useEffect(() => {
    if (!enabled) return;

    const isInsideContest = (target: EventTarget | null) => {
      if (!containerRef?.current) return true;
      return target instanceof Node && containerRef.current.contains(target);
    };

    const handleCopy = (e: ClipboardEvent) => {
      if (!isInsideContest(e.target)) return;
      e.preventDefault();
      logViolation('copy_attempt', 'Copy operation blocked during contest');
    };

    const handleCut = (e: ClipboardEvent) => {
      if (!isInsideContest(e.target)) return;
      e.preventDefault();
      logViolation('cut_attempt', 'Cut operation blocked during contest');
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (!isInsideContest(e.target)) return;
      e.preventDefault();
      logViolation('paste_attempt', 'Paste operation blocked during contest');
    };

    const handleBeforeInput = (e: InputEvent) => {
      if (!isInsideContest(e.target)) return;
      if (e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop') {
        e.preventDefault();
        logViolation('paste_attempt', 'Paste input blocked during contest');
      }
    };

    document.addEventListener('copy', handleCopy, true);
    document.addEventListener('cut', handleCut, true);
    document.addEventListener('paste', handlePaste, true);
    document.addEventListener('beforeinput', handleBeforeInput, true);

    return () => {
      document.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('cut', handleCut, true);
      document.removeEventListener('paste', handlePaste, true);
      document.removeEventListener('beforeinput', handleBeforeInput, true);
    };
  }, [enabled, logViolation, containerRef]);

  /** Context menu blocking inside contest area */
  useEffect(() => {
    if (!enabled) return;

    const handleContextMenu = (e: MouseEvent) => {
      if (containerRef?.current && !containerRef.current.contains(e.target as Node)) {
        return;
      }
      e.preventDefault();
      logViolation('context_menu', 'Right-click context menu blocked during contest');
    };

    document.addEventListener('contextmenu', handleContextMenu, true);
    return () => document.removeEventListener('contextmenu', handleContextMenu, true);
  }, [enabled, logViolation, containerRef]);

  const clearViolations = useCallback(() => {
    setViolations([]);
    violationCountRef.current = 0;
  }, []);

  const resetFlag = useCallback(() => {
    isFlaggedRef.current = false;
    setIsFlagged(false);
  }, []);

  return {
    violations,
    violationCount: violations.length,
    violationStats,
    isFlagged,
    isDisqualified: isFlagged,
    isFullscreen,
    enterFullscreen,
    logViolation,
    clearViolations,
    resetFlag,
  };
}
