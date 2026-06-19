import React, { useState, useEffect } from "react";
import { User, Problem } from "./types";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";
import BattleArena from "./components/BattleArena";
import AuthOverlay from "./components/AuthOverlay";
import HowToPlay from "./components/HowToPlay";
import AdminPanel from "./components/AdminPanel";
import CinematicIntro from "./components/CinematicIntro";
import VSScreen from "./components/VSScreen";
import { motion, AnimatePresence } from "framer-motion";
import { getSocket, disconnectSocket } from "./lib/socket";
import { X, Copy, Check, Users } from "lucide-react";
import TypingIntro from "./components/TypingIntro";
import { API_URL } from "./config";

// ════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════

interface GameSession {
  roomId: string;
  problem: Problem;
  players: any[];
  isAiGame: boolean;
  isPractice?: boolean;
}

// ════════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// ════════════════════════════════════════════════════════════

export default function App() {
  // ─── USER STATE ───────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);

  // ─── UI STATE ──────────────────────────────────────────────
  const [showIntro, setShowIntro] = useState(false);
  const [showTyping, setShowTyping] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // ─── GAME STATE ────────────────────────────────────────────
  const [gameState, setGameState] = useState<"landing" | "dashboard" | "arena">(
    "landing"
  );
  const [matchmakingStatus, setMatchmakingStatus] = useState<
    "idle" | "searching" | "error"
  >("idle");
  const [currentDifficulty, setCurrentDifficulty] = useState<
    "Easy" | "Medium" | "Hard"
  >("Easy");

  // ─── CUSTOM ROOM STATE ─────────────────────────────────────
  const [showCustomLobbyModal, setShowCustomLobbyModal] = useState(false);
  const [customRoomId, setCustomRoomId] = useState("");
  const [customPlayers, setCustomPlayers] = useState<any[]>([]);
  const [customFeedbackError, setCustomFeedbackError] = useState("");
  const [copiedInvite, setCopiedInvite] = useState(false);

  // ─── ACTIVE ROOM STATE ─────────────────────────────────────
  const [activeRoomState, setActiveRoomState] = useState<GameSession | null>(
    null
  );

  // ─── VS SCREEN STATE ───────────────────────────────────────
  const [showVSScreen, setShowVSScreen] = useState(false);
  const [vsScreenData, setVsScreenData] = useState<{
    player1: { username: string; rating: number; avatar?: string };
    player2: {
      username: string;
      rating: number;
      avatar?: string;
      isBot?: boolean;
    };
  } | null>(null);
  const [pendingRoomState, setPendingRoomState] = useState<GameSession | null>(
    null
  );

  // ════════════════════════════════════════════════════════════
  // SESSION MANAGEMENT
  // ════════════════════════════════════════════════════════════

  const loadActiveUserSession = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const text = await response.text();
        console.log("Auth API Error:", text);
        localStorage.removeItem("token");
        return;
      }

      const data = await response.json();
      if (response.ok && data.user) {
        setUser(data.user);
        setGameState("dashboard");
      } else {
        localStorage.removeItem("token");
      }
    } catch (e) {
      console.warn("Session auto-restoration failure:", e);
    }
  };

  useEffect(() => {
    loadActiveUserSession();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowTyping(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  // ════════════════════════════════════════════════════════════
  // SOCKET BINDINGS
  // ════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    socket.emit("auth-register", user);

    // ─── Matchmaking Status ────────────────────────────────────
    socket.on("matchmaking-status", ({ status }: any) => {
      setMatchmakingStatus(status);
    });

    // ─── Match Found ────────────────────────────────────────────
    socket.on(
      "match-found",
      ({ roomId, problem, players, isAiGame, isPractice }: any) => {
        setMatchmakingStatus("idle");
        setShowCustomLobbyModal(false);

        const roomData: GameSession = {
          roomId,
          problem,
          players,
          isAiGame,
          isPractice: !!isPractice,
        };

        // Practice mode → skip VS screen, go directly to arena
        if (isPractice) {
          setActiveRoomState(roomData);
          setGameState("arena");
          return;
        }

        // Find current user's data and opponent data
        const player1Data =
          players.find((p: any) => p.id === user.id) || players[0];
        const player2Data =
          players.find((p: any) => p.id !== user.id) || players[1];

        // Store room data to activate after VS screen finishes
        setPendingRoomState(roomData);

        setVsScreenData({
          player1: {
            username: player1Data?.username || user.username,
            rating:
              player1Data?.stats?.rating ??
              player1Data?.rating ??
              (user as any).stats?.rating ??
              1200,
            avatar:
              (player1Data as any)?.avatar ?? (user as any).avatar,
          },
          player2: {
            username: player2Data?.username || "Opponent",
            rating:
              player2Data?.stats?.rating ??
              player2Data?.rating ??
              1200,
            avatar: (player2Data as any)?.avatar,
            isBot: player2Data?.id === "ai_bot" || isAiGame,
          },
        });

        setShowVSScreen(true);
      }
    );

    // ─── Custom Room Created ────────────────────────────────────
    socket.on("custom-room-created", ({ roomId, players }: any) => {
      setCustomRoomId(roomId);
      setCustomPlayers(players);
      setShowCustomLobbyModal(true);
    });

    // ─── Custom Room Updated ────────────────────────────────────
    socket.on("custom-room-updated", ({ players }: any) => {
      setCustomPlayers(players);
    });

    // ─── Custom Room Error ──────────────────────────────────────
    socket.on("custom-room-error", ({ error }: any) => {
      setCustomFeedbackError(error);
    });

    return () => {
      socket.off("matchmaking-status");
      socket.off("match-found");
      socket.off("custom-room-created");
      socket.off("custom-room-updated");
      socket.off("custom-room-error");
    };
  }, [user]);

  // ════════════════════════════════════════════════════════════
  // EVENT HANDLERS
  // ════════════════════════════════════════════════════════════

  // ─── VS Screen Animation Complete ──────────────────────────
  const handleVSScreenComplete = () => {
    setShowVSScreen(false);
    setVsScreenData(null);
    if (pendingRoomState) {
      setActiveRoomState(pendingRoomState);
      setPendingRoomState(null);
      setGameState("arena");
    }
  };

  // ─── Game End Handler (with ELO & stats update) ─────────────
  const handleGameEnd = (result: {
    winner: string;
    eloChange: number;
    matchData: any;
  }) => {
    console.log("🏆 Game ended:", result);

    // Update user stats
    if (user) {
      const updatedUser = { ...user };

      if (result.winner === user.id) {
        updatedUser.stats = updatedUser.stats || {
          wins: 0,
          losses: 0,
          rating: 1200,
        };
        updatedUser.stats.wins++;
        updatedUser.stats.rating += result.eloChange;
      } else {
        updatedUser.stats = updatedUser.stats || {
          wins: 0,
          losses: 0,
          rating: 1200,
        };
        updatedUser.stats.losses++;
        updatedUser.stats.rating -= result.eloChange;
      }

      setUser(updatedUser);
    }

    // Return to dashboard
    setActiveRoomState(null);
    setGameState("dashboard");
  };

  // ─── Auth Success Handler ──────────────────────────────────
  const handleAuthSuccess = (authenticatedUser: User, token: string) => {
    localStorage.setItem("token", token);
    setUser(authenticatedUser);
    setGameState("dashboard");
    if (authenticatedUser.role === "admin") setShowAdmin(true);
  };

  // ─── Sign Out Handler ──────────────────────────────────────
  const handleSignOut = () => {
    localStorage.removeItem("token");
    setUser(null);
    setGameState("landing");
    disconnectSocket();
  };

  // ─── Matchmaking Handlers ──────────────────────────────────
  const handleStartMatchmaking = (difficulty: "Easy" | "Medium" | "Hard") => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    setCurrentDifficulty(difficulty);
    setMatchmakingStatus("searching");
    const socket = getSocket();
    socket.emit("matchmaking-join", { difficulty, user });
  };

  const handleCancelMatchmaking = () => {
    const socket = getSocket();
    socket.emit("matchmaking-leave", { difficulty: currentDifficulty });
    setMatchmakingStatus("idle");
  };

  // ─── Single Player Handler ─────────────────────────────────
  const handleStartSinglePlayer = (
    difficulty: "Easy" | "Medium" | "Hard",
    isPractice: boolean,
    problemId?: string
  ) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    const demoProblem = {
      id: problemId || "demo-problem",
      title: `${difficulty} Coding Challenge`,
      description: "Solve the given coding challenge.",
      difficulty: difficulty,
      starterCode: "",
      examples: [],
      constraints: [],
    } as any;

    setActiveRoomState({
      roomId: `room-${Date.now()}`,
      problem: demoProblem,
      players: [
        {
          id: user.id,
          username: user.username,
          rating: 1200,
        },
        {
          id: "ai_bot",
          username: `${difficulty} Bot`,
          rating: 1200,
        },
      ],
      isAiGame: true,
      isPractice: isPractice,
    });

    setGameState("arena");
  };

  // ─── Custom Room Handlers ──────────────────────────────────
  const handleCreateCustomRoom = (difficulty: "Easy" | "Medium" | "Hard") => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    const socket = getSocket();
    socket.emit("custom-room-create", { difficulty, user });
  };

  const handleJoinCustomRoom = (inviteCode: string) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    setCustomFeedbackError("");
    const socket = getSocket();
    socket.emit("custom-room-join", { inviteCode, user });
  };

  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(customRoomId);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  // ─── Battle Area Exit Handler ──────────────────────────────
  const handleExitBattleArea = () => {
    loadActiveUserSession();
    setActiveRoomState(null);
    setGameState("dashboard");
  };

  // ─── Enter Battle From Landing ────────────────────────────
  const handleEnterBattleFromLanding = () => {
    if (!user) setIsAuthOpen(true);
    else setGameState("dashboard");
  };

  // ─── Update User Handler ──────────────────────────────────
  const handleUpdateUser = (updated: User) => {
    setUser(updated);
  };

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════

  if (showTyping) return <TypingIntro />;

  return (
    <div className="bg-black min-h-screen text-white select-none relative font-sans">
      {/* ════════════════════════════════════════════════════════════
          VS SCREEN — renders on top of everything (z-[100] inside)
          Shows before every non-practice battle
      ════════════════════════════════════════════════════════════ */}
      {showVSScreen && vsScreenData && (
        <VSScreen
          player1={vsScreenData.player1}
          player2={vsScreenData.player2}
          difficulty={currentDifficulty}
          onAnimationComplete={handleVSScreenComplete}
        />
      )}

      {/* Cinematic Intro overlay */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="cinematic-intro-overlay"
            initial={{ opacity: 1 }}
            exit={{
              opacity: 0,
              scale: 1.04,
              filter: "blur(20px) brightness(1.2)",
            }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[9999]"
          >
            <CinematicIntro onComplete={() => setShowIntro(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ROUTES ─────────────────────────────────────────────── */}

      {gameState === "landing" && (
        <LandingPage
          user={user}
          onEnterBattle={handleEnterBattleFromLanding}
          onShowAuth={() => setIsAuthOpen(true)}
          onSignOut={handleSignOut}
        />
      )}

      {gameState === "dashboard" && user && (
        <div className="flex flex-col relative min-h-screen">
          {user.role === "admin" && (
            <div className="bg-red-950/90 text-red-200 border-b border-red-800 text-xs px-6 py-2 flex justify-between items-center z-20">
              <span className="font-mono font-bold tracking-wider">
                ⚠️ ADMIN CONTROL SESSION ACTIVE
              </span>
              <button
                id="header_open_admin_btn"
                onClick={() => setShowAdmin(true)}
                className="px-3 py-1 bg-red-600 font-semibold text-white rounded text-[10px] uppercase hover:opacity-90 transition-all cursor-pointer"
              >
                Open Admin Workspace
              </button>
            </div>
          )}

          <Dashboard
            user={user}
            onSignOut={handleSignOut}
            onStartMatchmaking={handleStartMatchmaking}
            onStartSinglePlayer={handleStartSinglePlayer}
            onCreateCustomRoom={handleCreateCustomRoom}
            onJoinCustomRoom={handleJoinCustomRoom}
            matchmakingStatus={matchmakingStatus}
            onCancelMatchmaking={handleCancelMatchmaking}
            onOpenHowToPlay={() => setShowHowToPlay(true)}
            onUpdateUser={handleUpdateUser}
          />
        </div>
      )}

      {gameState === "arena" && user && activeRoomState && (
        <BattleArena
          user={user}
          roomId={activeRoomState.roomId}
          problem={activeRoomState.problem}
          initialPlayers={activeRoomState.players}
          isAiGame={activeRoomState.isAiGame}
          isPractice={activeRoomState.isPractice}
          onExitBattle={handleExitBattleArea}
          onGameEnd={handleGameEnd}
        />
      )}

      {/* ── OVERLAYS ───────────────────────────────────────────── */}

      {isAuthOpen && (
        <AuthOverlay
          onClose={() => setIsAuthOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {showHowToPlay && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <HowToPlay onClose={() => setShowHowToPlay(false)} />
        </div>
      )}

      {showAdmin && user?.role === "admin" && (
        <AdminPanel
          user={user}
          onClose={() => setShowAdmin(false)}
          onLogout={handleSignOut}
        />
      )}

      {/* Custom Lobby waiting modal */}
      {showCustomLobbyModal && (
        <div className="fixed inset-0 z-40 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-md glass-panel p-6 rounded-2xl border border-white/15 neon-glow-gold flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-amber-400 font-mono flex items-center gap-1.5 uppercase">
                <Users className="w-4 h-4" />
                Custom Duel Bridge Lobby
              </span>
              <button
                id="close_custom_lobby_btn"
                onClick={() => {
                  setShowCustomLobbyModal(false);
                  getSocket().emit("matchmaking-leave", {});
                }}
                className="p-1 hover:text-amber-400 text-gray-400 transition-colors rounded-lg hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {customFeedbackError && (
              <div className="p-3 text-xs bg-red-500/15 border border-red-500/20 text-red-400 rounded-lg">
                {customFeedbackError}
              </div>
            )}

            <div className="flex flex-col gap-1 z-10">
              <span className="text-[10px] uppercase text-gray-500 tracking-wider">
                Share Invite Code
              </span>
              <div className="flex bg-black/55 border border-white/10 rounded-lg overflow-hidden p-1.5 justify-between items-center">
                <span className="text-sm font-bold font-mono tracking-widest text-amber-400 pl-2 uppercase">
                  {customRoomId}
                </span>
                <button
                  id="btn_copy_invite_code"
                  onClick={handleCopyInviteCode}
                  className="px-3 py-1 bg-neutral-900 border border-white/10 text-[10px] font-semibold text-gray-300 hover:text-white rounded flex items-center gap-1 transition-all"
                >
                  {copiedInvite ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] uppercase text-gray-500 tracking-wider font-semibold">
                Ready participants ({customPlayers.length} / 2)
              </span>
              {customPlayers.map((p, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-black/45 border border-white/5 font-mono text-xs text-gray-300 flex justify-between items-center"
                >
                  <span>{p.username}</span>
                  <span className="text-amber-400 font-bold">
                    {p.rating} ELO
                  </span>
                </div>
              ))}
              {customPlayers.length < 2 && (
                <div className="p-4 bg-white/[0.01] border border-dashed border-white/5 text-center text-[11px] text-gray-500 rounded-lg animate-pulse mt-1">
                  Waiting for your opponent to join using this code...
                </div>
              )}
            </div>

            <p className="text-[10px] text-gray-500 leading-relaxed text-center font-mono">
              The battle initializes automatically the moment your opponent
              enters this bridge workspace.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}