// ─── SHARED GAME TYPES (client copy) ─────────────────────────────────────

export const COLS = 15;
export const ROWS = 13;
export const TICK_MS = 50;

export enum TileType {
  FLOOR = 0,
  WALL = 1,
  BRICK = 2,
}

export enum PowerupType {
  BOMB = 1,
  FLAME = 2,
  SPEED = 3,
}

export interface Position {
  x: number;
  y: number;
  gx: number;
  gy: number;
}

export interface Player extends Position {
  id: string;
  name: string;
  color: string;
  alive: boolean;
  speed: number;
  maxBombs: number;
  bombsPlaced: number;
  flameLen: number;
  dir: 'up' | 'down' | 'left' | 'right';
  invincible: number;
  score: number;
}

export interface Bomb {
  id: string;
  ownerId: string;
  gx: number;
  gy: number;
  timer: number;
  flameLen: number;
}

export interface ExplosionCell {
  gx: number;
  gy: number;
}

export interface Explosion {
  id: string;
  cells: ExplosionCell[];
  timer: number;
  maxTimer: number;
}

export interface Powerup {
  id: string;
  gx: number;
  gy: number;
  type: PowerupType;
}

export interface GameState {
  grid: TileType[][];
  players: Player[];
  bombs: Bomb[];
  explosions: Explosion[];
  powerups: Powerup[];
  tick: number;
  phase: 'lobby' | 'playing' | 'over';
}

export interface GameOverData {
  winnerId: string | null;
  winnerName: string | null;
  scores: { id: string; name: string; score: number }[];
}

export interface RoomInfo {
  players: { id: string; name: string; color: string; ready: boolean }[];
  phase: 'lobby' | 'playing' | 'over';
  maxPlayers: number;
}

export interface ServerToClientEvents {
  'game:state': (state: GameState) => void;
  'game:start': (state: GameState) => void;
  'game:over': (data: GameOverData) => void;
  'room:update': (room: RoomInfo) => void;
  'room:error': (msg: string) => void;
  'player:assign': (data: { playerId: string; color: string }) => void;
}

export interface ClientToServerEvents {
  'room:join': (name: string) => void;
  'room:ready': () => void;
  'player:input': (input: PlayerInput) => void;
}

export interface PlayerInput {
  dx: number;
  dy: number;
  bomb: boolean;
}

export const PLAYER_COLORS = ['#44aaff', '#ff6633', '#44ff88', '#ff44cc'];
export const TILE_SIZE = 48;
