import { create } from 'zustand';
import { GameState, GameOverData, RoomInfo } from '@/types/game';

interface GameStore {
  // Connection
  connected: boolean;
  playerId: string | null;
  playerColor: string | null;
  error: string | null;

  // Room
  room: RoomInfo | null;

  // Game
  gameState: GameState | null;
  gameOver: GameOverData | null;

  // Screen
  screen: 'join' | 'lobby' | 'game' | 'over';

  // Actions
  setConnected: (v: boolean) => void;
  setPlayerId: (id: string, color: string) => void;
  setRoom: (room: RoomInfo) => void;
  setGameState: (state: GameState) => void;
  setGameOver: (data: GameOverData) => void;
  setError: (msg: string | null) => void;
  setScreen: (s: 'join' | 'lobby' | 'game' | 'over') => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  connected: false,
  playerId: null,
  playerColor: null,
  error: null,
  room: null,
  gameState: null,
  gameOver: null,
  screen: 'join',

  setConnected: (v) => set({ connected: v }),
  setPlayerId: (id, color) => set({ playerId: id, playerColor: color }),
  setRoom: (room) => set({ room }),
  setGameState: (gameState) => set({ gameState }),
  setGameOver: (gameOver) => set({ gameOver }),
  setError: (error) => set({ error }),
  setScreen: (screen) => set({ screen }),
  reset: () => set({
    room: null, gameState: null, gameOver: null,
    screen: 'join', playerId: null, playerColor: null, error: null,
  }),
}));
