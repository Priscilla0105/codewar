// lib/customRoomService.ts
import { User } from "../types";

const API_URL =
  import.meta.env.VITE_API_URL || "https://codewar-gt53.onrender.com";

interface CustomRoom {
  roomCode: string;
  difficulty: "Easy" | "Medium" | "Hard";
  hostId: string;
  hostName: string;
  hostAvatar: string;
  opponentId?: string;
  opponentName?: string;
  opponentAvatar?: string;
  status: "waiting" | "ready" | "started" | "completed";
  createdAt: string;
}

interface CreateRoomResponse {
  roomCode: string;
  room: CustomRoom;
}

interface JoinRoomResponse {
  room: CustomRoom;
  matchId: string;
}

class CustomRoomService {
  private token: string | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private onRoomStatusChange: ((room: CustomRoom) => void) | null = null;

  setToken(token: string) {
    this.token = token;
  }

  /**
   * Create a custom room
   */
  async createCustomRoom(
    difficulty: "Easy" | "Medium" | "Hard",
    user: User
  ): Promise<CreateRoomResponse> {
    if (!this.token) throw new Error("No auth token");

    const response = await fetch(`${API_URL}/api/custom-rooms/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        difficulty,
        hostId: user.id,
        hostName: user.name || user.username,
        hostAvatar: (user as any).avatar || user.username[0],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create room");
    }

    const data = await response.json();
    return data;
  }

  /**
   * Join an existing custom room
   */
  async joinCustomRoom(
    roomCode: string,
    user: User
  ): Promise<JoinRoomResponse> {
    if (!this.token) throw new Error("No auth token");

    const response = await fetch(`${API_URL}/api/custom-rooms/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        roomCode: roomCode.toUpperCase(),
        opponentId: user.id,
        opponentName: user.name || user.username,
        opponentAvatar: (user as any).avatar || user.username[0],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to join room");
    }

    const data = await response.json();
    return data;
  }

  /**
   * Get room status
   */
  async getRoomStatus(roomCode: string): Promise<CustomRoom> {
    if (!this.token) throw new Error("No auth token");

    const response = await fetch(
      `${API_URL}/api/custom-rooms/status/${roomCode}`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch room status");
    }

    const data = await response.json();
    return data.room;
  }

  /**
   * Start polling for room status changes
   */
  startPolling(
    roomCode: string,
    onStatusChange: (room: CustomRoom) => void,
    interval: number = 1000
  ) {
    this.onRoomStatusChange = onStatusChange;

    this.pollInterval = setInterval(async () => {
      try {
        const room = await this.getRoomStatus(roomCode);
        if (this.onRoomStatusChange) {
          this.onRoomStatusChange(room);
        }
      } catch (error) {
        console.error("Error polling room status:", error);
      }
    }, interval);
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Start the game - mark room as started
   */
  async startGame(roomCode: string): Promise<{ matchId: string }> {
    if (!this.token) throw new Error("No auth token");

    const response = await fetch(`${API_URL}/api/custom-rooms/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ roomCode }),
    });

    if (!response.ok) {
      throw new Error("Failed to start game");
    }

    const data = await response.json();
    return data;
  }

  /**
   * Cancel/leave custom room
   */
  async leaveRoom(roomCode: string): Promise<void> {
    if (!this.token) throw new Error("No auth token");

    await fetch(`${API_URL}/api/custom-rooms/leave`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ roomCode }),
    });

    this.stopPolling();
  }
}

export default new CustomRoomService();
