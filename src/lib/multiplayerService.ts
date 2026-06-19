// src/lib/multiplayerService.ts
import io, { Socket } from 'socket.io-client';

interface MatchFoundData {
  matchId: string;
  opponent: { name: string; rating: number };
  problem: { id: string; title: string; tags: string[] };
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

interface RoomJoinedData {
  roomCode: string;
  players: Array<{ username: string; userId: string }>;
  problem: { id: string; title: string };
  canStart: boolean;
}

interface MatchEndedData {
  winner: string;
  yourResult: { isCorrect: boolean; timeTaken: number; language: string };
  opponentResult: { isCorrect: boolean; timeTaken: number; language: string };
  eloChange: number;
}

class MultiplayerService {
  private socket: Socket | null = null;
  private serverUrl: string;

  constructor() {
    // Get server URL from environment variable
    this.serverUrl =
  (import.meta.env.VITE_MULTIPLAYER_SERVER as string) ||
  'https://codewar-gt53.onrender.com';
    console.log('🌐 Multiplayer server URL:', this.serverUrl);
  }

  // ============================================
  // CONNECTION MANAGEMENT
  // ============================================

      connect(userId: string, userData: any): Promise<void> {

  if (this.socket?.connected) {
    console.log("Socket already connected");
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    try {

      this.socket = io(this.serverUrl, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to multiplayer server');
        resolve();
      });

    } catch (error) {
      reject(error);
    }
  });
}

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('🔌 Disconnected from server');
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // ============================================
  // MATCHMAKING
  // ============================================

  startMatchmaking(
    userId: string,
    username: string,
    difficulty: 'Easy' | 'Medium' | 'Hard'
  ) {
    console.log(`🔍 Starting ${difficulty} matchmaking...`);
    this.socket?.emit('start-matchmaking', { 
      userId, 
      username, 
      difficulty 
    });
  }

  cancelMatchmaking(difficulty: 'Easy' | 'Medium' | 'Hard') {
    console.log(`❌ Canceling ${difficulty} matchmaking...`);
    this.socket?.emit('cancel-matchmaking', { difficulty });
  }

  onMatchFound(callback: (data: MatchFoundData) => void) {
    this.socket?.on('match-found', (data) => {
      console.log('🎮 Match found:', data);
      callback(data);
    });
  }

  offMatchFound() {
    this.socket?.off('match-found');
  }

  onMatchEnded(callback: (data: MatchEndedData) => void) {
    this.socket?.on('match-ended', (data) => {
      console.log('🏆 Match ended:', data);
      callback(data);
    });
  }

  offMatchEnded() {
    this.socket?.off('match-ended');
  }

  submitSolution(
    matchId: string,
    userId: string,
    solution: string,
    language: string,
    timeTaken: number
  ) {
    console.log('📤 Submitting solution...');
    this.socket?.emit('submit-solution', {
      matchId,
      userId,
      solution,
      language,
      timeTaken
    });
  }

  // ============================================
  // CUSTOM ROOMS
  // ============================================

  createCustomRoom(
    userId: string,
    username: string,
    difficulty: 'Easy' | 'Medium' | 'Hard'
  ) {
    console.log(`🏠 Creating ${difficulty} custom room...`);
    this.socket?.emit('create-custom-room', { 
      userId, 
      username, 
      difficulty 
    });
  }

  onRoomCreated(callback: (data: { roomCode: string; problem: any }) => void) {
    this.socket?.on('room-created', (data) => {
      console.log('🏠 Room created:', data);
      callback(data);
    });
  }

  offRoomCreated() {
    this.socket?.off('room-created');
  }

  joinCustomRoom(userId: string, username: string, roomCode: string) {
    console.log(`👥 Joining room: ${roomCode}`);
    this.socket?.emit('join-custom-room', { 
      userId, 
      username, 
      roomCode 
    });
  }

  onCustomRoomJoined(callback: (data: RoomJoinedData) => void) {
    this.socket?.on('custom-room-joined', (data) => {
      console.log('👥 Joined custom room:', data);
      callback(data);
    });
  }

  offCustomRoomJoined() {
    this.socket?.off('custom-room-joined');
  }

  onRoomError(callback: (data: { error: string }) => void) {
    this.socket?.on('room-error', (data) => {
      console.error('❌ Room error:', data.error);
      callback(data);
    });
  }

  offRoomError() {
    this.socket?.off('room-error');
  }

  // ============================================
  // ONLINE USERS
  // ============================================

  onUsersOnline(callback: (users: any[]) => void) {
    this.socket?.on('users-online', (users) => {
      console.log('👥 Online users updated:', users.length);
      callback(users);
    });
  }

  offUsersOnline() {
    this.socket?.off('users-online');
  }

  // ============================================
  // LISTENER MANAGEMENT
  // ============================================

  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
      console.log('🧹 All listeners removed');
    }
  }
}

// Export singleton instance
const multiplayerService = new MultiplayerService();
export default multiplayerService;