import React, { useState, useEffect, useRef } from "react";
import { User, MatchHistoryEntry } from "../types";
import { problems as clientProblems } from "../data/problems";
import { 
  Trophy, Swords, Zap, Activity, Timer, RotateCcw, Award, UserCheck, CheckCircle2,
  Calendar, Cpu, Play, BarChart2, ShieldAlert, BadgeCheck, Users, PlusCircle, ArrowRight,
  Gift, Sparkles, HelpCircle, Pencil, X, Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GiftBoxOverlay from "./GiftBoxOverlay";
import CustomRoomModal from "./CustomRoomModal";
import { safeLocalStorage } from "../lib/safeStorage";
import multiplayerService from "../lib/multiplayerService";
import customRoomService from "../lib/customRoomService";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://codewar-gt53.onrender.com";

// 15 emoji avatar choices
const AVATAR_EMOJIS = ["🌙","😎","😊","😒","🦅","👩🏻","🦋","🔥","⚡","👨🏻","🎯","💎","🚀","🧠","👑","✨"];

interface DashboardProps {
  user: User;
  onSignOut: () => void;
  onStartMatchmaking: (difficulty: "Easy" | "Medium" | "Hard") => void;
  onStartSinglePlayer: (difficulty: "Easy" | "Medium" | "Hard", isPractice: boolean, problemId?: string) => void;
  onCreateCustomRoom: (difficulty: "Easy" | "Medium" | "Hard") => void;
  onJoinCustomRoom: (inviteCode: string) => void;
  matchmakingStatus: "idle" | "searching" | "error";
  onCancelMatchmaking: () => void;
  onOpenHowToPlay: () => void;
  onUpdateUser: (newUser: User) => void;
  onStartCustomGameArena?: (data: {
    matchId: string;
    roomCode: string;
    opponent: { username: string; avatar: string };
  }) => void;
}

// ============================================
// INLINE 3D BACKGROUND COMPONENT
// ============================================
function DashboardBackground3D() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const PARTICLE_COUNT = 100;
    const colors = ["#f59e0b", "#fbbf24", "#d97706", "#ffffff", "#6366f1", "#818cf8"];

    const particles: any[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * W, y: Math.random() * H, z: Math.random() * 800 + 100,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4, vz: (Math.random() - 0.5) * 0.8,
      size: Math.random() * 2.5 + 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: Math.random() * 0.6 + 0.2,
    }));

    const project = (x: number, y: number, z: number): [number, number, number] => {
      const fov = 600;
      const px = (x - W / 2) * (fov / (fov + z)) + W / 2;
      const py = (y - H / 2) * (fov / (fov + z)) + H / 2;
      return [px, py, fov / (fov + z)];
    };

    let gridOffset = 0;
    const drawGrid = () => {
      gridOffset = (gridOffset + 0.25) % (H / 10);
      for (let row = -2; row <= 12; row++) {
        const y = (row * H / 10) + gridOffset;
        const z = (row / 10) * 600;
        const [, projY, scale] = project(W / 2, y, z);
        ctx.beginPath();
        ctx.strokeStyle = `rgba(245,158,11,${0.03 + scale * 0.05})`;
        ctx.lineWidth = scale * 0.6;
        ctx.moveTo(0, projY); ctx.lineTo(W, projY); ctx.stroke();
      }
      const vp = { x: W / 2, y: H * 0.45 };
      for (let col = 0; col <= 14; col++) {
        const startX = (col / 14) * W;
        ctx.beginPath();
        ctx.strokeStyle = "rgba(245,158,11,0.03)";
        ctx.lineWidth = 0.4;
        ctx.moveTo(startX, H);
        ctx.lineTo(vp.x + (startX - vp.x) * 0.05, vp.y);
        ctx.stroke();
      }
    };

    const cubes: any[] = Array.from({ length: 7 }, () => ({
      x: Math.random() * W, y: Math.random() * H, z: Math.random() * 400 + 100,
      rx: Math.random() * Math.PI * 2, ry: Math.random() * Math.PI * 2, rz: Math.random() * Math.PI * 2,
      drx: (Math.random() - 0.5) * 0.015, dry: (Math.random() - 0.5) * 0.015, drz: (Math.random() - 0.5) * 0.008,
      size: Math.random() * 18 + 8,
      color: Math.random() > 0.6 ? "#f59e0b" : "#6366f1",
      opacity: Math.random() * 0.1 + 0.04,
    }));

    const drawCube = (cube: any) => {
      const s = cube.size;
      const verts: [number, number, number][] = [
        [-s,-s,-s],[s,-s,-s],[s,s,-s],[-s,s,-s],
        [-s,-s,s],[s,-s,s],[s,s,s],[-s,s,s],
      ];
      const rotated = verts.map(([x, y, z]) => {
        let ny = y * Math.cos(cube.rx) - z * Math.sin(cube.rx); let nz = y * Math.sin(cube.rx) + z * Math.cos(cube.rx); y = ny; z = nz;
        let nx = x * Math.cos(cube.ry) + z * Math.sin(cube.ry); nz = -x * Math.sin(cube.ry) + z * Math.cos(cube.ry); x = nx; z = nz;
        nx = x * Math.cos(cube.rz) - y * Math.sin(cube.rz); ny = x * Math.sin(cube.rz) + y * Math.cos(cube.rz);
        return [nx + cube.x - W/2, ny + cube.y - H/2, nz + cube.z] as [number, number, number];
      });
      const proj = rotated.map(([x, y, z]) => { const [px, py] = project(x + W/2, y + H/2, z); return [px, py]; });
      const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
      ctx.save(); ctx.strokeStyle = cube.color; ctx.globalAlpha = cube.opacity; ctx.lineWidth = 0.8;
      edges.forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(proj[a][0], proj[a][1]); ctx.lineTo(proj[b][0], proj[b][1]); ctx.stroke(); });
      ctx.restore();
    };

    const stars: any[] = Array.from({ length: 4 }, () => ({
      x: Math.random() * W, y: Math.random() * H * 0.5,
      len: Math.random() * 120 + 60, speed: Math.random() * 6 + 4,
      angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
      opacity: 0, active: false, timer: Math.random() * 300,
    }));

    let frame = 0;
    const animate = () => {
      frame++;
      ctx.clearRect(0, 0, W, H);
      const bg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W, H));
      bg.addColorStop(0, "#050508"); bg.addColorStop(0.5, "#030306"); bg.addColorStop(1, "#020204");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      drawGrid();

      cubes.forEach(cube => {
        cube.rx += cube.drx; cube.ry += cube.dry; cube.rz += cube.drz;
        cube.z -= 0.3;
        if (cube.z < 50) { cube.z = 700; cube.x = Math.random() * W; cube.y = Math.random() * H; }
        drawCube(cube);
      });

      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.z += p.vz;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        if (p.z < 50) p.z = 900; if (p.z > 900) p.z = 50;
        const [px, py, scale] = project(p.x, p.y, p.z);
        ctx.beginPath(); ctx.arc(px, py, Math.max(p.size * scale, 0.3), 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.globalAlpha = p.opacity * scale; ctx.fill(); ctx.globalAlpha = 1;
      });

      if (frame % 2 === 0) {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const [px1, py1] = project(particles[i].x, particles[i].y, particles[i].z);
            const [px2, py2] = project(particles[j].x, particles[j].y, particles[j].z);
            const dist = Math.hypot(px1 - px2, py1 - py2);
            if (dist < 80) {
              ctx.beginPath(); ctx.strokeStyle = `rgba(245,158,11,${(1 - dist / 80) * 0.07})`; ctx.lineWidth = 0.4;
              ctx.moveTo(px1, py1); ctx.lineTo(px2, py2); ctx.stroke();
            }
          }
        }
      }

      stars.forEach(star => {
        star.timer--;
        if (star.timer <= 0 && !star.active) {
          star.active = true; star.x = Math.random() * W * 0.7; star.y = Math.random() * H * 0.3;
          star.opacity = 0.9; star.timer = Math.random() * 400 + 200;
        }
        if (star.active) {
          star.x += Math.cos(star.angle) * star.speed; star.y += Math.sin(star.angle) * star.speed;
          star.opacity -= 0.018;
          if (star.opacity <= 0) { star.active = false; star.opacity = 0; }
          ctx.save(); ctx.strokeStyle = `rgba(255,255,255,${star.opacity})`; ctx.lineWidth = 1.5;
          ctx.shadowBlur = 6; ctx.shadowColor = "rgba(245,158,11,0.6)";
          ctx.beginPath(); ctx.moveTo(star.x, star.y);
          ctx.lineTo(star.x - Math.cos(star.angle) * star.len * star.opacity, star.y - Math.sin(star.angle) * star.len * star.opacity);
          ctx.stroke(); ctx.restore();
        }
      });

      animId = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => { W = window.innerWidth; H = window.innerHeight; canvas.width = W; canvas.height = H; };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", onResize); };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} />;
}


export default function Dashboard({
  user,
  onSignOut,
  onStartMatchmaking,
  onStartSinglePlayer,
  onCreateCustomRoom: onCreateCustomRoomProp,
  onJoinCustomRoom: onJoinCustomRoomProp,
  matchmakingStatus,
  onCancelMatchmaking,
  onOpenHowToPlay,
  onUpdateUser,
  onStartCustomGameArena
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"lobby" | "stats" | "leaderboard">("lobby");
  const [lobbyMode, setLobbyMode] = useState<"multiplayer" | "singleplayer" | "practice" | "quiz">("multiplayer");
  
  const [quizDiff, setQuizDiff] = useState<"Easy" | "Medium" | "Hard" | null>(null);
  const [quizOverlayActive, setQuizOverlayActive] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchHistoryEntry[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [customDiff, setCustomDiff] = useState<"Easy" | "Medium" | "Hard">("Easy");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<"Easy" | "Medium" | "Hard" | null>(null);
  const [levelSearch, setLevelSearch] = useState("");
  const [submissions, setSubmissions] = useState<any[]>([]);

  // Avatar picker state
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(
    (user as any).avatar || user.username[0].toUpperCase()
  );
  const [savingAvatar, setSavingAvatar] = useState(false);

  // Profile edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user.name || user.username);
  const [editUsername, setEditUsername] = useState(user.username);
  const [editBio, setEditBio] = useState(user.bio || "Crafting code in Clash Arena.");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  // Orbit animation pulse
  const [avatarPulse, setAvatarPulse] = useState(false);

  // Custom Room Integration State
  const [customRoomCode, setCustomRoomCode] = useState<string>("");
  const [customRoomActive, setCustomRoomActive] = useState(false);
  const [roomWaitingForOpponent, setRoomWaitingForOpponent] = useState(false);
  const [roomOpponentJoined, setRoomOpponentJoined] = useState<{
    username: string;
    avatar: string;
  } | null>(null);
  const [currentGameMatchId, setCurrentGameMatchId] = useState<string>("");
  const [roomLoading, setRoomLoading] = useState(false);
  const [roomError, setRoomError] = useState("");

  const token = safeLocalStorage.getItem("token");

  const getLevelDetails = (xp: number = 0) => {
    if (xp >= 4000) return { title: "Legendary Coder", badge: "🔮 LEGEND", color: "text-red-400 bg-red-400/10 border-red-400/20", target: 4000, label: "MAX LEVEL" };
    if (xp >= 2000) return { title: "Grandmaster", badge: "👑 GRANDMASTER", color: "text-purple-400 bg-purple-500/10 border-purple-500/20", target: 4000, label: `${xp}/4000 XP` };
    if (xp >= 1000) return { title: "Master", badge: "🌟 MASTER", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", target: 2000, label: `${xp}/2000 XP` };
    if (xp >= 500) return { title: "Expert", badge: "⚡ EXPERT", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", target: 1000, label: `${xp}/1000 XP` };
    if (xp >= 250) return { title: "Specialist", badge: "🔥 SPECIALIST", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", target: 500, label: `${xp}/500 XP` };
    if (xp >= 100) return { title: "Apprentice", badge: "🛠️ APPRENTICE", color: "text-teal-400 bg-teal-500/10 border-teal-500/20", target: 250, label: `${xp}/250 XP` };
    return { title: "Beginner", badge: "🌱 BEGINNER", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", target: 100, label: `${xp}/100 XP` };
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`${API_URL}/api/dashboard/leaderboard`);
      const data = await response.json();
      if (data.leaderboard) setLeaderboard(data.leaderboard);
    } catch (e) { console.error(e); }
  };

  const fetchUserStatistics = async () => {
    try {
      const response = await fetch(`${API_URL}/api/dashboard/stats/${user.id}`);
      const data = await response.json();
      if (data.matches) setMatchHistory(data.matches);
    } catch (e) { console.error(e); }
  };

  const fetchOnlineUsers = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/dashboard/online-users`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.onlineUsers) setOnlineUsers(data.onlineUsers);
    } catch (e) { console.error(e); }
  };

  const fetchSubmissions = async () => {
    console.log("TOKEN =", token);

    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/submissions`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.submissions) setSubmissions(data.submissions);
    } catch (e) { console.error(e); }
  };

  // Save avatar to server
  const handleSaveAvatar = async (emoji: string) => {
    setSavingAvatar(true);
    setSelectedAvatar(emoji);
    setShowAvatarPicker(false);
    try {
      const response = await fetch(`${API_URL}/api/dashboard/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: user.name,
          username: user.username,
          bio: user.bio,
          avatar: emoji
        })
      });
      const data = await response.json();
      if (response.ok) {
        onUpdateUser({ ...user, avatar: emoji } as User);
      }
    } catch (err) {
      console.error("Avatar save error:", err);
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!editUsername.trim()) {
      setProfileError("Username is required.");
      return;
    }
    setProfileSaving(true);
    setProfileError("");
    setProfileSuccess("");
    try {
      const response = await fetch(`${API_URL}/api/dashboard/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: editName, username: editUsername, bio: editBio, avatar: selectedAvatar })
      });
      const data = await response.json();
      if (!response.ok) {
        setProfileError(data.error || "Failed to update profile.");
      } else {
        setProfileSuccess("Profile updated successfully!");
        onUpdateUser(data.user);
        setTimeout(() => { setIsEditingProfile(false); setProfileSuccess(""); }, 2000);
      }
    } catch (err) {
      setProfileError("Connection error. Try again.");
    } finally {
      setProfileSaving(false);
    }
  };

  // Initialize multiplayer service
  useEffect(() => {
    const initMultiplayer = async () => {
      try {
        await multiplayerService.connect(user.id, {
          username: user.username,
          name: user.name,
          avatar: (user as any).avatar,
          stats: user.stats
        });

        console.log('✅ Multiplayer connected');
      } catch (error) {
        console.error('❌ Multiplayer error:', error);
      }
    };

    initMultiplayer();
  }, [user.id]);

  // Listen for match found
  useEffect(() => {
    multiplayerService.onMatchFound((data) => {
      console.log('🎮 Match found!', data);
      alert(`Match found! Opponent: ${data.opponent.name}`);
    });

    return () => {
      multiplayerService.offMatchFound();
    };
  }, []);

  // Initialize custom room service
  useEffect(() => {
    const token = safeLocalStorage.getItem("token");
    if (token) {
      customRoomService.setToken(token);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    fetchUserStatistics();
    fetchOnlineUsers();
    fetchSubmissions();
    const syncInt = setInterval(() => {
      fetchLeaderboard(); fetchUserStatistics(); fetchOnlineUsers(); fetchSubmissions();
    }, 15000);
    return () => clearInterval(syncInt);
  }, [user.id]);

  // Avatar pulse on load
  useEffect(() => {
    const t = setInterval(() => setAvatarPulse(p => !p), 2500);
    return () => clearInterval(t);
  }, []);

  // ============================================
  // CUSTOM ROOM INTEGRATION HANDLERS
  // ============================================

  /**
   * Handle creating a custom room
   */
  const handleCreateCustomRoom = async (difficulty: "Easy" | "Medium" | "Hard") => {
    setRoomLoading(true);
    setRoomError("");
    try {
      const result = await customRoomService.createCustomRoom(difficulty, user);
      console.log("✅ Room created:", result.roomCode);

      setCustomRoomCode(result.roomCode);
      setCustomRoomActive(true);
      setRoomWaitingForOpponent(true);
      setRoomOpponentJoined(null);

      // Start polling for opponent joining
      customRoomService.startPolling(
        result.roomCode,
        (updatedRoom) => {
          console.log("Room status updated:", updatedRoom);

          // Check if opponent joined
          if (updatedRoom.opponentId) {
            setRoomOpponentJoined({
              username: updatedRoom.opponentName || "Opponent",
              avatar: updatedRoom.opponentAvatar || "O",
            });
          }

          // Check if game started
          if (updatedRoom.status === "started") {
            console.log("✨ Game started!");
          }
        },
        1000 // Poll every 1 second
      );
    } catch (error: any) {
      console.error("❌ Error creating room:", error);
      setRoomError(error.message || "Failed to create room");
      setCustomRoomActive(false);
    } finally {
      setRoomLoading(false);
    }
  };

  /**
   * Handle joining a custom room with invite code
   */
  const handleJoinCustomRoomWithCode = async (inviteCode: string) => {
    setRoomLoading(true);
    setRoomError("");
    setErrorText("");
    try {
      const result = await customRoomService.joinCustomRoom(inviteCode, user);
      console.log("✅ Joined room:", result.room.roomCode);

      setCustomRoomCode(result.room.roomCode);
      setCustomRoomActive(true);
      setRoomWaitingForOpponent(false);
      setCurrentGameMatchId(result.matchId);

      // Set opponent info (the host)
      setRoomOpponentJoined({
        username: result.room.hostName || "Host",
        avatar: result.room.hostAvatar || "H",
      });

      // You're now in the room, ready to play
      setInviteCode(""); // Clear input
    } catch (error: any) {
      console.error("❌ Error joining room:", error);
      setErrorText(error.message || "Failed to join room. Check your code.");
    } finally {
      setRoomLoading(false);
    }
  };

  /**
   * Handle starting the game (both players click this)
   */
  const handleStartCustomGame = async () => {
    try {
      setRoomLoading(true);
      const result = await customRoomService.startGame(customRoomCode);
      console.log("🎮 Game started! Match ID:", result.matchId);

      // Stop polling
      customRoomService.stopPolling();

      // Close modal and start the game arena
      setCustomRoomActive(false);
      setCurrentGameMatchId(result.matchId);

      // Call the callback if provided
      if (onStartCustomGameArena) {
        onStartCustomGameArena({
          matchId: result.matchId,
          roomCode: customRoomCode,
          opponent: roomOpponentJoined!,
        });
      }
    } catch (error: any) {
      console.error("❌ Error starting game:", error);
      setRoomError(error.message || "Failed to start game");
    } finally {
      setRoomLoading(false);
    }
  };

  /**
   * Handle leaving/canceling custom room
   */
  const handleLeaveCustomRoom = async () => {
    try {
      await customRoomService.leaveRoom(customRoomCode);
      setCustomRoomActive(false);
      setCustomRoomCode("");
      setRoomWaitingForOpponent(false);
      setRoomOpponentJoined(null);
      setCurrentGameMatchId("");
      setErrorText("");
    } catch (error) {
      console.error("Error leaving room:", error);
    }
  };

  // ============================================
  // OTHER HANDLERS
  // ============================================

  const handleJoinCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setErrorText("Provide a valid lobby invite code.");
      return;
    }
    setErrorText("");
    
    // Use the new handler
    handleJoinCustomRoomWithCode(inviteCode.trim().toUpperCase());
  };

  const getWinRatio = () => {
    const total = user.stats.wins + user.stats.losses;
    if (total === 0) return 0;
    return Math.round((user.stats.wins / total) * 100);
  };

  // Display avatar: emoji if set, else first letter
  const displayAvatar = (user as any).avatar || selectedAvatar;
  const isEmoji = displayAvatar && AVATAR_EMOJIS.includes(displayAvatar);

  return (
    <div id="dashboard_viewport" className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col font-sans">
      
      {/* 3D ANIMATED BACKGROUND */}
      <DashboardBackground3D />

      {/* CSS for avatar animations */}
      <style>{`
        @keyframes orbitRing1 { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes orbitRing2 { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes avatarGlow { 0%,100% { box-shadow: 0 0 15px rgba(245,158,11,0.4); } 50% { box-shadow: 0 0 35px rgba(245,158,11,0.8), 0 0 60px rgba(245,158,11,0.2); } }
        @keyframes floatDot { 0%,100% { transform: translateY(0); opacity:0.6; } 50% { transform: translateY(-4px); opacity:1; } }
        .orbit-ring-1 { animation: orbitRing1 6s linear infinite; }
        .orbit-ring-2 { animation: orbitRing2 10s linear infinite; }
        .avatar-glow { animation: avatarGlow 2.5s ease-in-out infinite; }
        .float-dot { animation: floatDot 2s ease-in-out infinite; }
      `}</style>

      {/* Decorative Blur Filters */}
      <div className="absolute top-[10%] left-[5%] w-[400px] h-[250px] bg-amber-500/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[10%] right-[5%] w-[400px] h-[250px] bg-amber-500/5 blur-[120px] rounded-full" />

      {/* NAVBAR */}
      <header className="z-10 w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between border-b border-white/[0.04] bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-400 font-bold text-black border border-amber-300 rounded-lg flex items-center justify-center text-md shadow-[0_0_8px_rgba(245,158,11,0.25)]">C</div>
          <span className="font-semibold text-sm sm:text-base text-white tracking-tight uppercase font-mono">Clash Arena Lobby</span>
        </div>
        <div className="flex bg-neutral-900 border border-white/5 rounded-lg p-0.5">
          {(["lobby","stats","leaderboard"] as const).map(tab => (
            <button key={tab} id={`tab_${tab}`}
              onClick={() => { setActiveTab(tab); if (tab === "leaderboard") fetchLeaderboard(); }}
              className={`px-4 py-1.5 text-xs rounded-md transition-all cursor-pointer ${activeTab === tab ? "bg-amber-400 text-black font-semibold" : "text-gray-400 hover:text-white"}`}
            >
              {tab === "lobby" ? "Lobby Desk" : tab === "stats" ? "My Status" : "Leaderboard"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button id="how_to_play_dash" onClick={onOpenHowToPlay} className="hidden sm:flex px-4 py-1.5 text-xs font-semibold hover:border-amber-400 border border-white/10 text-gray-300 rounded-lg bg-white/[0.02] cursor-pointer">How To Play</button>
          <button id="dash_signout" onClick={onSignOut} className="px-3 py-1.5 text-xs text-gray-400 border border-white/5 rounded-lg hover:border-red-500/20 hover:text-red-400 transition-colors">Sign Out</button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 z-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-1 flex flex-col gap-6 font-sans">
          <div className="rounded-2xl glass-panel p-5 relative overflow-hidden border border-white/10 flex flex-col gap-4">
            <div className="absolute -bottom-8 -right-8 w-28 h-28 opacity-5 text-amber-400">
              <Trophy className="w-full h-full" />
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="flex flex-col gap-3 font-sans relative z-10">
                <span className="text-xs uppercase font-mono tracking-widest text-amber-400 font-bold">Configure Profile</span>
                {profileError && <p className="text-[11px] text-red-400 bg-red-500/10 p-2 rounded border border-red-500/15">{profileError}</p>}
                {profileSuccess && <p className="text-[11px] text-emerald-400 bg-emerald-500/10 p-2 rounded border border-emerald-500/15">{profileSuccess}</p>}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase text-gray-400 font-bold font-mono">Username</label>
                  <input type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)} className="w-full bg-neutral-900 border border-white/10 rounded px-2.5 py-1 text-xs text-white focus:border-amber-400 outline-none" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase text-gray-400 font-bold font-mono">Display Name</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-neutral-900 border border-white/10 rounded px-2.5 py-1 text-xs text-white focus:border-amber-400 outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase text-gray-400 font-bold font-mono">Short Biography</label>
                  <textarea rows={2} value={editBio} onChange={e => setEditBio(e.target.value)} className="w-full bg-neutral-900 border border-white/10 rounded px-2.5 py-1 text-xs text-white focus:border-amber-400 outline-none resize-none" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setIsEditingProfile(false)} className="flex-1 py-1 text-xs bg-neutral-800 text-gray-300 rounded font-semibold border border-white/5 hover:bg-neutral-700/50">Cancel</button>
                  <button type="submit" disabled={profileSaving} className="flex-1 py-1 text-xs bg-amber-400 text-black font-bold rounded hover:opacity-90 active:scale-[0.98] disabled:opacity-50">
                    {profileSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* ===== ANIMATED PROFILE CIRCLE ===== */}
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0" style={{ width: 64, height: 64 }}>
                    <div className="orbit-ring-1 absolute rounded-full border border-amber-400/20" style={{ inset: -10 }}>
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-400/60" />
                    </div>
                    <div className="orbit-ring-2 absolute rounded-full border border-amber-400/10" style={{ inset: -18 }}>
                      <div className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-amber-400/40" />
                    </div>
                    <div
                      className={`avatar-glow w-16 h-16 rounded-full flex items-center justify-center border-2 border-amber-400 cursor-pointer relative group transition-all duration-300 hover:scale-105`}
                      style={{ background: isEmoji ? "linear-gradient(135deg, #1a1a2e, #16213e)" : "linear-gradient(135deg, #f59e0b, #d97706, #b45309)" }}
                      onClick={() => setShowAvatarPicker(true)}
                      title="Click to change avatar"
                    >
                      <span className={isEmoji ? "text-3xl" : "text-2xl font-bold text-black"}>
                        {isEmoji ? displayAvatar : (user.name || user.username)[0].toUpperCase()}
                      </span>
                      <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Pencil className="w-4 h-4 text-amber-400" />
                      </div>
                      {savingAvatar && (
                        <div className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-gray-100 flex items-center gap-1">
                      {user.name || user.username}
                      {user.role === "admin" && (
                        <span className="text-[10px] bg-red-600 text-white px-1.5 rounded uppercase font-bold tracking-widest leading-normal">Admin</span>
                      )}
                    </span>
                    <span className="text-[11px] text-amber-400 font-mono">@{user.username}</span>
                    <span className="text-[10px] text-gray-500 mt-0.5">Click avatar to change</span>
                  </div>
                </div>

                {/* ===== EMOJI AVATAR PICKER DROPDOWN ===== */}
                <AnimatePresence>
                  {showAvatarPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.18 }}
                      className="bg-neutral-900 border border-amber-400/20 rounded-xl p-3 flex flex-col gap-2 shadow-[0_0_30px_rgba(245,158,11,0.1)]"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-mono text-amber-400 font-bold tracking-widest">Choose Avatar</span>
                        <button onClick={() => setShowAvatarPicker(false)} className="text-gray-500 hover:text-white">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {AVATAR_EMOJIS.map((emoji, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSaveAvatar(emoji)}
                            className={`w-10 h-10 rounded-lg text-2xl flex items-center justify-center border transition-all hover:scale-110 active:scale-95 cursor-pointer ${
                              displayAvatar === emoji
                                ? "border-amber-400 bg-amber-400/10 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                                : "border-white/5 bg-white/[0.02] hover:border-white/20"
                            }`}
                            title={`Select ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-500 text-center">Click to select & save</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* LEVEL PROGRESS */}
                <div className="py-2.5 px-3 rounded-xl bg-amber-400/5 border border-amber-400/10 flex flex-col gap-1.5 my-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">ARENA EXPERIENCE RANK</span>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${getLevelDetails(user.xp).color}`}>
                      {getLevelDetails(user.xp).badge}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-0.5">
                    <span className="text-xs font-semibold text-gray-200">Level {user.level || 1} — {getLevelDetails(user.xp).title}</span>
                    <span className="text-[10px] font-mono text-gray-400">{getLevelDetails(user.xp).label}</span>
                  </div>
                  <div className="w-full bg-neutral-900 rounded-full h-1.5 overflow-hidden border border-white/5 mt-0.5">
                    <div className="bg-gradient-to-r from-amber-400 to-amber-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(8, ((user.xp || 0) / getLevelDetails(user.xp).target) * 100))}%` }}
                    />
                  </div>
                </div>

                {user.bio && (
                  <p className="text-[11px] text-gray-400 italic bg-white/[0.02] p-2.5 rounded border border-white/5">"{user.bio}"</p>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/5">
                  <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                    <span className="text-[10px] uppercase text-gray-500 tracking-wider font-semibold">Current Rating</span>
                    <p className="text-lg font-bold font-mono text-white mt-0.5">🏆 {user.stats.rating} <span className="text-xs font-normal text-amber-500">ELO</span></p>
                  </div>
                  <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                    <span className="text-[10px] uppercase text-gray-500 tracking-wider font-semibold">Win Ratio</span>
                    <p className="text-lg font-bold font-mono text-white mt-0.5">📈 {getWinRatio()}%</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 text-xs pt-1">
                  <div className="flex justify-between p-2 rounded bg-white/[0.01]">
                    <span className="text-gray-400">🔥 Match Streak:</span>
                    <span className="font-mono text-amber-400 font-bold">{user.stats.streak} Days Running</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-white/[0.01]">
                    <span className="text-gray-400">⌨️ Average Typing Speed:</span>
                    <span className="font-mono text-gray-200">{user.stats.typingWpm} WPM</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-white/[0.01]">
                    <span className="text-gray-400">🎯 Syntax Accuracy:</span>
                    <span className="font-mono text-emerald-400 font-bold">{user.stats.accuracy}% accuracy</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button id="edit_profile_trigger"
                    onClick={() => { setEditUsername(user.username); setEditName(user.name || user.username); setEditBio(user.bio || ""); setIsEditingProfile(true); }}
                    className="flex-1 py-1.5 border border-white/5 rounded-lg text-xs hover:border-amber-400/30 text-gray-300 transition-all font-semibold font-sans cursor-pointer bg-white/[0.02] text-center"
                  >
                    ✏️ Modify Profile Info
                  </button>
                  <button id="how_to_play_card_btn" onClick={onOpenHowToPlay} className="sm:hidden flex-1 py-1.5 border border-white/5 rounded-lg text-xs hover:border-amber-400/30 transition-all font-semibold">
                    Learn Rules
                  </button>
                </div>
              </>
            )}
          </div>

          {/* SOLVED METRICS */}
          <div className="rounded-2xl glass-panel p-5 border border-white/5 flex flex-col gap-3">
            <span className="text-xs uppercase font-mono tracking-wider font-semibold text-gray-400 flex items-center gap-1.5 justify-between">
              <span className="flex items-center gap-1.5"><Activity className="w-4 h-4 text-amber-400" />SOLVED PROBLEMATIC METRICS</span>
              <span className="text-[10px] text-amber-500 font-mono">Explore →</span>
            </span>
            <div className="flex flex-col gap-3 mt-2">
              {[
                { level: "Easy" as const, color: "emerald", solved: user.stats.solvedEasy },
                { level: "Medium" as const, color: "amber", solved: user.stats.solvedMedium },
                { level: "Hard" as const, color: "red", solved: user.stats.solvedHard },
              ].map(({ level, color, solved }) => (
                <div key={level} onClick={() => setSelectedLevel(level)}
                  className={`flex flex-col gap-1 cursor-pointer hover:bg-${color}-500/5 p-2 rounded-xl border border-transparent hover:border-${color}-500/10 transition-all group`}
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className={`text-${color}-400 font-medium group-hover:underline`}>{level} Challenges</span>
                    <span className={`font-mono text-gray-400 font-bold group-hover:text-${color}-400`}>{solved} / 100</span>
                  </div>
                  <div className="w-full bg-neutral-900 rounded-full h-1.5 overflow-hidden border border-white/5">
                    <div className={`bg-${color}-400 h-1.5 rounded-full`} style={{ width: `${Math.min(100, solved)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MIDDLE/RIGHT COLUMNS */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {selectedLevel && (
            <div className="rounded-2xl glass-panel p-6 border border-white/10 relative overflow-hidden flex flex-col gap-4">
              <div className="flex justify-between items-center bg-black/45 p-4 rounded-xl border border-white/5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-mono uppercase text-gray-500 tracking-widest">DEDICATED CHALLENGE GATEWAY</span>
                  <h2 className="text-base font-bold tracking-tight text-white uppercase flex items-center gap-2">
                    {selectedLevel === "Easy" && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />}
                    {selectedLevel === "Medium" && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />}
                    {selectedLevel === "Hard" && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />}
                    {selectedLevel} LEVEL PRACTICE MATRIX
                  </h2>
                </div>
                <button id="close_level_btn" onClick={() => { setSelectedLevel(null); setLevelSearch(""); }}
                  className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 rounded-lg border border-white/10 cursor-pointer transition-all active:scale-[0.98]"
                >← Close Matrix</button>
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Filter variations by title, description or tag..."
                  value={levelSearch} onChange={e => setLevelSearch(e.target.value)}
                  className="flex-1 bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none focus:border-amber-400 font-sans"
                />
                {levelSearch && <button onClick={() => setLevelSearch("")} className="px-3 bg-neutral-900 border border-white/10 rounded-xl text-xs text-gray-400 hover:text-white cursor-pointer">Clear</button>}
              </div>
              <div className="flex flex-col gap-2.5 max-h-[550px] overflow-y-auto pr-1">
                {clientProblems
                  .filter(p => p.difficulty === selectedLevel)
                  .filter(p => !levelSearch ? true : p.title.toLowerCase().includes(levelSearch.toLowerCase()) || p.tags.some(t => t.toLowerCase().includes(levelSearch.toLowerCase())))
                  .map(prob => (
                    <div key={prob.id} className="p-3.5 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 hover:bg-black/60 transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-gray-200">{prob.title}</span>
                          <span className="text-[9px] font-mono text-gray-500 bg-white/5 px-1 py-0.5 rounded">ID: {prob.id}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {prob.tags.map((t, tidx) => (
                            <span key={tidx} className="text-[9px] bg-white/[0.03] text-gray-400 px-1.5 py-0.5 rounded font-mono uppercase">{t}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button onClick={() => onStartSinglePlayer(selectedLevel, true, prob.id)}
                          className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer">
                          🎓 Practice
                        </button>
                        <button onClick={() => onStartSinglePlayer(selectedLevel, false, prob.id)}
                          className="px-3 py-1.5 bg-amber-400 text-black font-bold hover:opacity-90 rounded-lg text-[10px] font-mono tracking-wider uppercase transition-all cursor-pointer">
                          ⚔️ Duel Bot
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === "lobby" && !selectedLevel && (
            <div className="flex flex-col gap-6">

              {/* DIFFICULTY CARDS */}
              <div className="rounded-2xl glass-panel p-5 border border-white/10 relative overflow-hidden flex flex-col gap-3.5 bg-black/30">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-xs uppercase font-mono tracking-wider font-bold text-amber-400 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-400" />Total Problems - 300 Problems (Interactive Arenas)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">100% database synced</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { level: "Easy" as const, emoji: "🟢", color: "emerald", solved: user.stats.solvedEasy },
                    { level: "Medium" as const, emoji: "🟡", color: "amber", solved: user.stats.solvedMedium },
                    { level: "Hard" as const, emoji: "🔴", color: "red", solved: user.stats.solvedHard },
                  ].map(({ level, emoji, color, solved }) => (
                    <div key={level} onClick={() => setSelectedLevel(level)}
                      className={`p-4 rounded-xl text-left transition-all active:scale-[0.99] cursor-pointer flex flex-col gap-2 group relative border border-amber-500/40 bg-amber-500/[0.05] hover:bg-amber-500/[0.08]`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className={`text-[10px] font-bold text-${color}-400 uppercase tracking-widest font-mono`}>{emoji} {level.toUpperCase()}</span>
                        <ArrowRight className={`w-3.5 h-3.5 text-${color}-400 group-hover:translate-x-1 transition-transform`} />
                      </div>
                      <div className="flex flex-col mt-1">
                        <span className="text-sm font-extrabold text-white">{level} Level - 100 Problems</span>
                        <span className="text-[10px] text-gray-400 mt-0.5">Cleared: {solved} / 100</span>
                      </div>
                      <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden mt-1 border border-white/5">
                        <div className={`bg-${color}-400 h-full rounded-full transition-all`} style={{ width: `${Math.min(100, solved)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* MODE SELECTOR */}
              <div className="flex bg-neutral-950/80 border border-white/5 rounded-xl p-1 items-center self-start gap-1 flex-wrap">
                {[
                  { id: "multiplayer", label: "⚔️ Ranked 1v1" },
                  { id: "singleplayer", label: "🕹️ Play with AI" },
                  { id: "practice", label: "🎓 Practice Mode" },
                  { id: "quiz", label: "🎁 Quiz Mode" },
                ].map(({ id, label }) => (
                  <button key={id} id={`tab_mode_${id}`} type="button"
                    onClick={() => setLobbyMode(id as any)}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${lobbyMode === id ? "bg-amber-400 text-black shadow-[0_0_8px_rgba(245,158,11,0.25)]" : "text-gray-400 hover:text-white hover:bg-white/[0.02]"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* MULTIPLAYER - WHITE BORDERS ON CARDS */}
              {lobbyMode === "multiplayer" && (
                <>
                  <div className="rounded-2xl glass-panel p-6 border border-white/10 relative overflow-hidden flex flex-col gap-4">
                    <div className="flex flex-col">
                      <span className="text-lg font-bold text-amber-400 tracking-tight flex items-center gap-1.5 uppercase font-mono">
                        <Swords className="w-5 h-5" />BATTLEFIELD MATCHMAKING QUEUE
                      </span>
                      <p className="text-xs text-gray-400 mt-1">Querying matchmaking search targets players of similar standings. Multiplayer rooms only pair with real connected users.</p>
                    </div>
                    {matchmakingStatus === "searching" ? (
                      <div className="p-4 rounded-xl border border-amber-400/20 bg-amber-400/5 text-amber-300 flex flex-col items-center gap-3 text-center">
                        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent animate-spin rounded-full" />
                        <div className="flex flex-col">
                          <p className="text-xs font-mono font-bold uppercase tracking-widest">Searching Arena Opponent...</p>
                          <p className="text-[10px] text-gray-400">Waiting for another real programmer to merge in matching pool</p>
                        </div>
                        <button id="cancel_search_btn" onClick={onCancelMatchmaking} className="px-4 py-1.5 rounded-lg text-xs bg-red-600 text-white font-bold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer">Leave Active Queue</button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { diff: "Easy" as const, color: "emerald", elo: 15 },
                          { diff: "Medium" as const, color: "amber", elo: 25 },
                          { diff: "Hard" as const, color: "red", elo: 40 },
                        ].map(({ diff, color, elo }) => (
                          <button key={diff} id={`match_${diff.toLowerCase()}`} onClick={() => onStartMatchmaking(diff)}
                            className={`p-4 rounded-xl border-2 border-white/60 bg-${color}-500/[0.02] hover:bg-${color}-500/[0.06] hover:border-white text-left transition-all active:scale-[0.99] flex flex-col gap-2 cursor-pointer group`}
                          >
                            <div className="flex justify-between items-center w-full">
                              <span className={`text-xs font-bold text-${color}-400 uppercase tracking-widest`}>{diff} Tier</span>
                              <Play className={`w-4 h-4 text-${color}-500 group-hover:translate-x-0.5 transition-transform`} />
                            </div>
                            <p className="text-[11px] text-gray-400">Real Duel Arena</p>
                            <span className="text-[9px] font-mono text-gray-500 mt-2">Earn ≈{elo} ELO per solve</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ONLINE USERS */}
                  <div className="rounded-2xl glass-panel p-5 border border-white/5 flex flex-col gap-3 font-sans">
                    <div className="flex justify-between items-center">
                      <span className="text-xs uppercase font-mono tracking-wider font-bold text-gray-400 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-teal-400" />ACTIVE ONLINE MEMBERS ({onlineUsers.length})
                      </span>
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    {onlineUsers.length === 0 ? (
                      <p className="text-[11px] text-gray-500 italic bg-black/20 p-4 border border-dashed border-white/5 rounded-xl">You're the pioneer online coder right now. Invite a peer to spark up Ranked Duels!</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                        {onlineUsers.map(online => (
                          <div key={online.id} className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center font-bold text-xs uppercase">
                                {(online as any).avatar && AVATAR_EMOJIS.includes((online as any).avatar) ? (online as any).avatar : (online.name || online.username)[0]}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-gray-200">{online.name || online.username}</span>
                                <span className="text-[10px] text-gray-400 font-mono">🏆 {online.stats.rating} rating</span>
                              </div>
                            </div>
                            <span className="text-[9px] bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold px-2 py-0.5 rounded uppercase font-mono tracking-widest">online</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* CUSTOM ROOMS */}
                  <div className="rounded-2xl glass-panel p-5 border border-white/5 flex flex-col gap-4">
                    <div className="flex flex-col">
                      <span className="text-xs uppercase font-mono tracking-wider font-bold text-gray-400 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-amber-400" />CUSTOM DUELS & FRIEND LOBBIES
                      </span>
                      <p className="text-[11px] text-gray-400 mt-1">Configure a matching workspace. Pass the generated Room Code to an opponent, or enter one below.</p>
                    </div>
                    {errorText && <div className="p-3 text-xs bg-red-500/15 border border-red-500/20 text-red-400 rounded-lg">{errorText}</div>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                      <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-3">
                        <p className="text-xs font-bold text-gray-200 flex items-center gap-1"><PlusCircle className="w-4 h-4 text-amber-400" />DEPLOY LOBBY ROOM</p>
                        <div className="flex items-center gap-2">
                          <select id="custom_diff_select" value={customDiff} onChange={e => setCustomDiff(e.target.value as any)}
                            className="bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-200 outline-none">
                            <option value="Easy">Easy difficulty</option>
                            <option value="Medium">Medium difficulty</option>
                            <option value="Hard">Hard difficulty</option>
                          </select>
                          <button id="btn_create_custom" onClick={() => handleCreateCustomRoom(customDiff)} disabled={roomLoading}
                            className="flex-1 py-1.5 px-3 rounded-lg bg-amber-400 text-black font-semibold text-xs hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50">
                            {roomLoading ? "Creating..." : "Create Lobby"}
                          </button>
                        </div>
                      </div>
                      <form onSubmit={handleJoinCustom} className="p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-3">
                        <p className="text-xs font-bold text-gray-200 flex items-center gap-1"><ArrowRight className="w-4 h-4 text-emerald-400" />BRIDGED DUEL LOBBY CODE</p>
                        <div className="flex gap-2">
                          <input type="text" maxLength={12} id="custom_code_input" placeholder="e.g. CUSTOM_F42H"
                            value={inviteCode} onChange={e => setInviteCode(e.target.value)}
                            className="flex-1 min-w-[120px] bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-200 uppercase font-mono outline-none focus:border-amber-400" required />
                          <button type="submit" id="btn_join_custom" disabled={roomLoading} className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-1.5 rounded-lg text-xs disabled:opacity-50">
                            {roomLoading ? "..." : "Join Room"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </>
              )}

              {/* SINGLEPLAYER - WHITE BORDERS ON CARDS */}
              {lobbyMode === "singleplayer" && (
                <div className="rounded-2xl glass-panel p-6 border border-white/10 relative overflow-hidden flex flex-col gap-4">
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-amber-400 tracking-tight flex items-center gap-1.5 uppercase font-mono">
                      <Cpu className="w-5 h-5 text-amber-400" />🕹️ SINGLE PLAYER vs SYSTEM AI
                    </span>
                    <p className="text-xs text-gray-400 mt-1">Play against simulated expert AI opponents. AI pacing scales with difficulty level you select!</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
                    {[
                      { diff: "Easy" as const, color: "emerald", label: "EASY BOT", desc: "Casual coding speed (35-50 WPM) with human-like delays", note: "Wins scale ELO standardly" },
                      { diff: "Medium" as const, color: "amber", label: "BALANCED BOT", desc: "Intermediate rival (55-75 WPM) with tactical play", note: "Adjusted system evaluations" },
                      { diff: "Hard" as const, color: "red", label: "ELITE BOT", desc: "Expert rival (85-115 WPM) with aggressive completion", note: "Pro rating challenge metrics" },
                    ].map(({ diff, color, label, desc, note }) => (
                      <button key={diff} onClick={() => onStartSinglePlayer(diff, false)}
                        className={`p-4 rounded-xl border-2 border-white/60 bg-${color}-500/[0.02] hover:bg-${color}-500/[0.06] hover:border-white text-left transition-all active:scale-[0.99] flex flex-col gap-2 cursor-pointer group`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className={`text-xs font-bold text-${color}-400 uppercase tracking-widest font-mono`}>{label}</span>
                          <Play className={`w-4 h-4 text-${color}-500 group-hover:translate-x-0.5 transition-transform`} />
                        </div>
                        <p className="text-[11px] text-gray-400">{desc}</p>
                        <span className="text-[9px] font-mono text-gray-500 mt-2">{note}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* PRACTICE - WHITE BORDERS ON CARDS */}
              {lobbyMode === "practice" && (
                <div className="flex flex-col gap-6">
                  <div className="rounded-2xl glass-panel p-6 border border-white/10 relative overflow-hidden flex flex-col gap-4">
                    <div className="flex flex-col">
                      <span className="text-lg font-bold text-amber-400 tracking-tight flex items-center gap-1.5 uppercase font-mono">
                        <Award className="w-5 h-5 text-amber-400" />🎓 STUDY & PRACTICE ACADEMY
                      </span>
                      <p className="text-xs text-gray-400 mt-1">A learning-focused training sandbox where countdown timer pressure is lifted. Request intelligent step-by-step guidance powered by AI!</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { diff: "Easy" as const, color: "emerald", tag: "Relaxed Practice", title: "Easy Challenges", desc: "Unlimited compilation, friendly helper bot (15-25 WPM)" },
                        { diff: "Medium" as const, color: "amber", tag: "Stress-Free", title: "Medium Algorithms", desc: "Deepen your loop structuring with coaching guidelines" },
                        { diff: "Hard" as const, color: "red", tag: "Expert Practice", title: "Hard Architecture", desc: "Solve advanced topics at your own comfortable learning rate" },
                      ].map(({ diff, color, tag, title, desc }) => (
                        <button key={diff} onClick={() => onStartSinglePlayer(diff, true)}
                          className={`p-4 rounded-xl border-2 border-white/60 bg-${color}-500/[0.02] hover:bg-${color}-500/[0.06] hover:border-white text-left transition-all active:scale-[0.99] flex flex-col gap-2 cursor-pointer group`}
                        >
                          <span className={`text-[9px] uppercase font-mono text-${color}-400 font-bold bg-${color}-500/15 p-1 rounded self-start`}>{tag}</span>
                          <span className="text-xs font-bold text-white uppercase tracking-wider font-sans mt-1">{title}</span>
                          <p className="text-[11px] text-gray-400">{desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* QUIZ - WHITE BORDERS ON CARDS */}
              {lobbyMode === "quiz" && (
                <div className="rounded-2xl glass-panel p-6 border border-white/10 relative overflow-hidden flex flex-col gap-4 bg-zinc-950/40">
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-amber-400 tracking-tight flex items-center gap-1.5 uppercase font-mono">
                      <Gift className="w-5 h-5 text-amber-400 animate-pulse" />🎁 QUEST & QUIZ MODE
                    </span>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">Choose your coding challenge difficulty to unlock a randomized mystery premium gift. Opening the box reveals your unique puzzle index (1-100)!</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { diff: "Easy" as const, color: "emerald", desc: "Unlock an easy ranking mystery challenge to sharpen core syntax skills." },
                      { diff: "Medium" as const, color: "amber", desc: "Unlock a balanced mystery match to challenge data structure logic." },
                      { diff: "Hard" as const, color: "red", desc: "Unlock an expert battle question for senior algorithm architects." },
                    ].map(({ diff, color, desc }) => (
                      <button key={diff} id={`quiz_select_${diff.toLowerCase()}`}
                        onClick={() => { setQuizDiff(diff); setQuizOverlayActive(true); }}
                        className={`p-4 rounded-xl border-2 border-white/60 bg-${color}-500/[0.02] hover:bg-${color}-500/[0.06] hover:border-white text-left transition-all active:scale-[0.99] flex flex-col gap-2 cursor-pointer group`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className={`text-[9px] uppercase font-mono text-${color}-400 font-bold bg-${color}-500/15 p-1 rounded`}>{diff.toUpperCase()}</span>
                          <Sparkles className={`w-4 h-4 text-${color}-400/50 group-hover:scale-110 transition-transform`} />
                        </div>
                        <span className="text-xs font-bold text-white uppercase tracking-wider font-sans mt-1">{diff} Quiz Challenge</span>
                        <p className="text-[11px] text-gray-400 mt-1 leading-normal">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STATS TAB */}
          {activeTab === "stats" && (
            <div className="flex flex-col gap-6 font-sans">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-white/5 bg-black/40 p-4 flex flex-col gap-1.5">
                  <span className="text-[10px] text-gray-500 uppercase font-mono tracking-widest font-bold">Arena Status</span>
                  <span className="text-sm font-extrabold text-amber-400 mt-1 uppercase font-mono">{getLevelDetails(user.xp).badge}</span>
                  <p className="text-[11px] text-gray-400 leading-normal">Level {user.level || 1} ({user.xp} XP collected)</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-black/40 p-4 flex flex-col gap-1.5">
                  <span className="text-[10px] text-gray-500 uppercase font-mono tracking-widest font-bold">Solved Speed Dial</span>
                  <span className="text-sm font-extrabold text-gray-100 mt-1 font-mono">{user.stats.solvedEasy + user.stats.solvedMedium + user.stats.solvedHard} / 300</span>
                  <p className="text-[11px] text-gray-400 leading-normal">E: {user.stats.solvedEasy} | M: {user.stats.solvedMedium} | H: {user.stats.solvedHard}</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-black/40 p-4 flex flex-col gap-1.5 col-span-2 lg:col-span-1">
                  <span className="text-[10px] text-gray-500 uppercase font-mono tracking-widest font-bold">Duel Analytics Ratio</span>
                  <span className="text-sm font-extrabold text-emerald-400 mt-1 font-mono">{getWinRatio()}% WINS</span>
                  <p className="text-[11px] text-gray-400 leading-normal">{user.stats.wins} Wins / {user.stats.losses} Losses</p>
                </div>
              </div>

              {/* BADGES */}
              <div className="rounded-2xl glass-panel p-5 border border-white/10 flex flex-col gap-3.5 bg-black/30">
                <span className="text-xs uppercase font-mono tracking-wider font-bold text-amber-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <Award className="w-4 h-4 text-amber-400 animate-pulse" />EARNED BADGES & COMBAT DECORATIONS
                </span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { id: "b1", title: "Speed Demon", criteria: "Avg WPM >= 65", met: user.stats.typingWpm >= 65, desc: "Fast compiler typing speeds", icon: "⚡" },
                    { id: "b2", title: "Accuracy Expert", criteria: "Syntax Acc >= 95%", met: user.stats.accuracy >= 95, desc: "Flawless coding submission", icon: "🎯" },
                    { id: "b3", title: "Arena Dominator", criteria: "3 Match wins", met: user.stats.wins >= 3, desc: "Multiple victories", icon: "👑" },
                    { id: "b4", title: "Active Streak", criteria: "Streak >= 2 days", met: user.stats.streak >= 2, desc: "Consecutive battle activity", icon: "🔥" },
                    { id: "b5", title: "Architecture Elite", criteria: "Solve Hard Problem", met: user.stats.solvedHard >= 1, desc: "Cleared complex hard structures", icon: "🔮" },
                    { id: "b6", title: "Grand Champion", criteria: "Arena level >= 3", met: (user.xp || 0) >= 500, desc: "Secured Specialist ranking", icon: "🌟" }
                  ].map(badge => (
                    <div key={badge.id} className={`p-3 rounded-xl border flex flex-col gap-1 transition-all ${badge.met ? "bg-amber-400/[0.03] border-amber-400/30" : "bg-white/[0.005] border-white/5 opacity-40 hover:opacity-60"}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-200">{badge.title}</span>
                        <span className="text-lg">{badge.met ? badge.icon : "🔒"}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{badge.desc}</p>
                      <span className="text-[9px] font-mono text-gray-500 uppercase mt-auto bg-white/5 px-1 py-0.5 rounded self-start">{badge.criteria}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* HEATMAP */}
              <div className="rounded-2xl glass-panel p-5 border border-white/10 flex flex-col gap-3.5 bg-black/30">
                <span className="text-xs uppercase font-mono tracking-wider font-bold text-gray-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <Calendar className="w-4 h-4 text-teal-400" />DAILY SUBMISSION COMMIT MATRIX (LAST 14 DEV CYCLES)
                </span>
                <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 mt-1">
                  {Array.from({ length: 14 }).map((_, idx) => {
                    const dayOffset = 13 - idx;
                    const d = new Date();
                    d.setDate(d.getDate() - dayOffset);
                    const keyStr = d.toISOString().split("T")[0];
                    const solvesOnDay = submissions.filter(sub => sub.status === "passed" && sub.submittedAt?.startsWith(keyStr)).length;
                    return (
                      <div key={idx} title={`${solvesOnDay} solutions on ${keyStr}`}
                        className={`aspect-square sm:h-12 border rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${solvesOnDay === 0 ? "bg-neutral-950/60 border-white/5" : solvesOnDay === 1 ? "bg-emerald-500/25 border-emerald-500/35" : "bg-emerald-400 border-emerald-300 text-black"}`}
                      >
                        <span className={`text-[9px] font-mono font-bold ${solvesOnDay > 1 ? "text-black" : "text-gray-400"}`}>{d.getDate()}</span>
                        <span className={`text-[8px] uppercase font-mono ${solvesOnDay > 1 ? "text-neutral-900" : "text-gray-500"}`}>{d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 1)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SUBMISSIONS */}
              <div className="rounded-2xl glass-panel p-5 border border-white/10 flex flex-col gap-3.5 bg-black/30">
                <span className="text-xs uppercase font-mono tracking-wider font-bold text-gray-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <Activity className="w-4 h-4 text-emerald-400" />RECENT COMPILER DIAGNOSTIC SUBMISSIONS ({submissions.length})
                </span>
                {submissions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500 border border-dashed border-white/5 rounded-xl">Empty submission buffer. Connect to battles to configure records.</div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                    {submissions.map(sub => (
                      <div key={sub._id || sub.id} className="p-3 bg-neutral-900/60 border border-white/5 rounded-xl flex items-center justify-between text-xs font-mono">
                        <div className="flex flex-col gap-1">
                          <span className="text-gray-200 font-bold">{sub.problemTitle || "Clash Problem"}</span>
                          <span className="text-[10px] text-gray-400">Language: <span className="text-amber-400 font-semibold">{sub.language || "c"}</span></span>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${sub.status === "passed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                            {sub.status === "passed" ? "Passed Compiler" : "Diagnostics Failed"}
                          </span>
                          <span className="text-[9px] text-gray-500">{sub.submittedAt ? new Date(sub.submittedAt).toLocaleTimeString() : undefined}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* MATCH HISTORY */}
              <div className="rounded-2xl glass-panel p-5 border border-white/10 flex flex-col gap-4">
                <span className="text-sm font-bold tracking-tight text-amber-400 uppercase font-mono flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4" />OFFICIAL CONFLICT ARCHIVE HISTORY
                </span>
                {matchHistory.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500 border border-dashed border-white/5 rounded-xl">No matches archived yet.</div>
                ) : (
                  <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[450px] pr-1">
                    {matchHistory.map(match => (
                      <div key={match.id} className="p-3.5 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-lg flex items-center justify-center ${match.status === "win" ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400" : match.status === "loss" ? "bg-red-500/20 border border-red-500/30 text-red-400" : "bg-gray-500/20 border border-gray-500/30 text-gray-400"}`}>
                            <BadgeCheck className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold tracking-wide">
                              <span>VS {match.opponentName}</span>
                              <span className={`text-[9px] px-1.5 rounded uppercase font-bold tracking-widest ${match.difficulty === "Easy" ? "bg-emerald-500/10 text-emerald-300" : match.difficulty === "Medium" ? "bg-amber-500/10 text-amber-300" : "bg-red-500/10 text-red-300"}`}>{match.difficulty}</span>
                            </div>
                            <span className="text-[11px] text-gray-400 mt-0.5">Problem: {match.problemTitle}</span>
                          </div>
                        </div>
                        <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center border-t sm:border-0 border-white/5 pt-2 sm:pt-0">
                          <span className={`font-mono text-sm font-bold ${match.status === "win" ? "text-emerald-400" : match.status === "loss" ? "text-red-400" : "text-gray-400"}`}>
                            {match.status === "win" ? "+" : ""}{match.eloChange} <span className="text-xs">ELO</span>
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono mt-0.5">{new Date(match.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LEADERBOARD TAB */}
          {activeTab === "leaderboard" && (
            <div className="rounded-2xl glass-panel p-5 border border-white/10 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="text-sm font-bold tracking-tight text-amber-400 uppercase font-mono">GLOBAL RANKING LEADERBOARD</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-400">
                  <thead className="text-[10px] uppercase font-mono text-gray-500 border-b border-white/5">
                    <tr>
                      <th className="py-2.5 px-3">Rank #</th>
                      <th className="py-2.5 px-2">Programmer</th>
                      <th className="py-2.5 px-2 text-right">Rating ELO</th>
                      <th className="py-2.5 px-2 text-center">W/L Records</th>
                      <th className="py-2.5 px-2 text-center">Avg WPM</th>
                      <th className="py-2.5 px-2 text-right pr-3">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.filter(u => u.username !== "Sanjai.lx").map((rankedUser, index) => (
                      <tr key={rankedUser.id} id={`leaderboard_user_row_${index}`}
                        className={`border-b border-white/[0.02] hover:bg-white/[0.01] ${rankedUser.id === user.id ? "bg-amber-400/5 text-gray-100 hover:bg-amber-400/[0.08]" : ""}`}
                      >
                        <td className="py-3 px-3 font-mono font-bold">
                          {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm border border-white/10 bg-neutral-900">
                              {(rankedUser as any).avatar && AVATAR_EMOJIS.includes((rankedUser as any).avatar) ? (rankedUser as any).avatar : (rankedUser.name || rankedUser.username)[0].toUpperCase()}
                            </div>
                            <span className="font-semibold text-gray-200">{rankedUser.username}</span>
                            {rankedUser.id === user.id && <span className="text-[9px] bg-amber-400 text-black px-1 rounded uppercase font-bold leading-normal">YOU</span>}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right font-bold text-amber-400 font-mono">{rankedUser.stats.rating}</td>
                        <td className="py-3 px-2 text-center font-mono">{rankedUser.stats.wins}W / {rankedUser.stats.losses}L</td>
                        <td className="py-3 px-2 text-center font-mono text-gray-300">{rankedUser.stats.typingWpm} WPM</td>
                        <td className="py-3 px-2 text-right font-mono text-emerald-400 font-bold pr-3">{rankedUser.stats.accuracy}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* CUSTOM ROOM MODAL */}
      <CustomRoomModal
        roomCode={customRoomCode}
        difficulty={customDiff}
        isOpen={customRoomActive}
        onClose={handleLeaveCustomRoom}
        onGameStart={handleStartCustomGame}
        waitingForOpponent={roomWaitingForOpponent}
        opponentJoined={roomOpponentJoined}
        currentPlayer={{
          username: user.name || user.username,
          avatar: (user as any).avatar || user.username[0],
        }}
        loading={roomLoading}
        error={roomError}
      />

      {quizOverlayActive && quizDiff && (
        <GiftBoxOverlay
          difficulty={quizDiff}
          onClose={() => { setQuizOverlayActive(false); setQuizDiff(null); }}
          onLaunchChallenge={(diff, isPrac, problemId) => {
            setQuizOverlayActive(false);
            setQuizDiff(null);
            onStartSinglePlayer(diff, isPrac, problemId);
          }}
        />
      )}

      <footer className="w-full text-center text-[10px] text-gray-600 font-mono py-4 border-t border-white/[0.02] mt-6">
        © 2026 Clash Of Coders Portal. Live rankings updates buffered instantly.
      </footer>
    </div>
  );
}