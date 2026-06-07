// src/services/socketService.ts
import multiplayerService from '../lib/multiplayerService';

export const initializeMultiplayer = async (userId: string, userData: any) => {
  try {
    await multiplayerService.connect(userId, userData);
    console.log('✅ Multiplayer initialized');
  } catch (error) {
    console.error('❌ Failed to initialize:', error);
    throw error;
  }
};

export const startMatchmaking = (userId: string, username: string, difficulty: any) => {
  multiplayerService.startMatchmaking(userId, username, difficulty);
};

export const submitSolution = (matchId: string, userId: string, solution: string, language: string, timeTaken: number) => {
  multiplayerService.submitSolution(matchId, userId, solution, language, timeTaken);
};