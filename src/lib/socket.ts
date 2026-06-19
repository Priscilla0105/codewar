import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const isProd = process.env.NODE_ENV === "production";
    const socketUrl = isProd ? "https://api.clasharena.com" : "/";
    
    socket = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ["websocket", "polling"],
      auth: {
        token: typeof window !== "undefined" ? localStorage.getItem("token") : null
      }
    });

    // Connection event handlers
    socket.on("connect", () => {
      console.log("✅ Connected to server:", socket?.id);
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from server");
    });

    socket.on("connect_error", (error: any) => {
      console.error("🔴 Connection error:", error.message);
    });

    // Battle event handlers
    socket.on("player-joined", (playerData: any) => {
      console.log("📍 Player joined:", playerData.username);
    });

    socket.on("battle-started", (data: any) => {
      console.log("⚔️ Battle started:", data.roomId);
    });

    socket.on("timer-sync", (data: any) => {
      console.log("⏱️ Timer synced:", data.timeRemaining);
    });

    socket.on("code-execution-result", (data: any) => {
      console.log("💻 Code executed:", data);
    });

    socket.on("submission-result", (data: any) => {
      console.log("📤 Submission result:", data.verdict);
    });

    socket.on("opponent-activity", (data: any) => {
      console.log("🎯 Opponent activity:", data);
    });

    socket.on("battle-ended", (data: any) => {
      console.log("🏆 Battle ended:", data);
    });

    socket.on("disqualification-notice", (data: any) => {
      console.log("⚠️ Disqualification:", data.reason);
    });

    socket.on("elo-update", (data: any) => {
      console.log("📊 ELO updated:", data);
    });

    socket.on("error", (error: any) => {
      console.error("❌ Socket error:", error);
    });
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Emit battle-related events
 */
export const battleEvents = {
  // Join a battle room
  joinBattle: (data: {
    roomId: string;
    userId: string;
    username: string;
    language: string;
  }) => {
    socket?.emit("join-battle", data);
  },

  // Start matchmaking
  startMatchmaking: (data: {
    userId: string;
    language?: string;
    difficulty?: string;
  }) => {
    socket?.emit("start-matchmaking", data);
  },

  // Run code (sample input)
  runCode: (data: {
    roomId: string;
    code: string;
    language: string;
    input: string;
  }) => {
    socket?.emit("run-code", data);
  },

  // Submit code (hidden test cases)
  submitCode: (data: {
    roomId: string;
    userId: string;
    code: string;
    language: string;
    problemId: string;
  }) => {
    socket?.emit("submit-code", data);
  },

  // Emit player progress
  updateProgress: (data: {
    roomId: string;
    userId: string;
    progress: number;
    submissionCount: number;
    currentScore: number;
    isSolved: boolean;
  }) => {
    socket?.emit("player-progress", data);
  },

  // Request timer sync
  requestTimerSync: (roomId: string) => {
    socket?.emit("request-timer-sync", { roomId });
  },

  // Send chat message
  sendChatMessage: (data: {
    roomId: string;
    userId: string;
    username: string;
    message: string;
  }) => {
    socket?.emit("chat-message", data);
  },

  // Request hint
  requestHint: (data: {
    roomId: string;
    userId: string;
    problemId: string;
    code: string;
  }) => {
    socket?.emit("request-hint", data);
  },

  // Leave battle
  leaveBattle: (data: {
    roomId: string;
    userId: string;
  }) => {
    socket?.emit("leave-battle", data);
  },

  // End battle early
  endBattle: (data: {
    roomId: string;
    userId: string;
  }) => {
    socket?.emit("end-battle", data);
  }
};

export default getSocket;
