import { create } from 'zustand';
import { GameState, GameOverData, RoomInfo } from '@/types/game';

interface GameStore {
  connected: boolean;
  playerId: string | null;
  playerColor: string | null;
  error: string | null;
  room: RoomInfo | null;
  gameState: GameState | null;
  gameOver: GameOverData | null;
  lobbyCountdown: number; // seconds remaining before lobby reset (8→0)
  screen: 'join' | 'lobby' | 'game' | 'over';

  setConnected: (v: boolean) => void;
  setPlayerId: (id: string, color: string) => void;
  setRoom: (room: RoomInfo) => void;
  setGameState: (state: GameState) => void;
  setGameOver: (data: GameOverData) => void;
  setLobbyCountdown: (n: number) => void;
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
  lobbyCountdown: 8,
  screen: 'join',

  setConnected: (v) => set({ connected: v }),
  setPlayerId: (id, color) => set({ playerId: id, playerColor: color }),
  setRoom: (room) => set({ room }),
  setGameState: (gameState) => set({ gameState }),
  setGameOver: (gameOver) => set({ gameOver }),
  setLobbyCountdown: (lobbyCountdown) => set({ lobbyCountdown }),
  setError: (error) => set({ error }),
  setScreen: (screen) => set({ screen }),
  reset: () => set({
    room: null, gameState: null, gameOver: null,
    lobbyCountdown: 8,
    screen: 'join', playerId: null, playerColor: null, error: null,
  }),
}));
