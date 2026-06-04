// ─── SHARED GAME TYPES ────────────────────────────────────────────────────

export const COLS = 16;
export const ROWS = 16;
export const TICK_MS = 50; // server tick rate

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
  x: number; // pixel x (center)
  y: number; // pixel y (center)
  gx: number; // grid x
  gy: number; // grid y
}

export interface Player extends Position {
  id: string;
  name: string;
  color: string;
  alive: boolean;
  speed: number;       // px per tick
  maxBombs: number;
  bombsPlaced: number;
  flameLen: number;
  dir: 'up' | 'down' | 'left' | 'right';
  invincible: number;  // ticks of invincibility
  score: number;
  // NEW: throwable flames capacity (computed: max(0,flameLen-2)+floor(score/250))
  // activeFlames tracked server-side; client just reads throwableFlames
  throwableFlames: number;
  activeFlames: number;
  // NEW: web trap state
  trappedTicks: number; // >0 = trapped, movement/bomb disabled
}

export interface Bomb {
  id: string;
  ownerId: string;
  gx: number;
  gy: number;
  timer: number;  // ticks remaining
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

// NEW: Thrown flame projectile
export interface ThrownFlame {
  id: string;
  ownerId: string;
  x: number;   // pixel x
  y: number;   // pixel y
  gx: number;
  gy: number;
  dx: number;  // direction: -1,0,1
  dy: number;
  moveTick: number; // increments each tick; moves every 2 ticks
}

// NEW: Web projectile (travelling)
export interface WebProjectile {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  gx: number;
  gy: number;
  dx: number;
  dy: number;
  moveTick: number;
}

// NEW: Stuck web on grid
export interface Web {
  id: string;
  ownerId: string;
  gx: number;
  gy: number;
  timer: number; // ticks until disappear (40s = 800 ticks)
}

// ─── SOCKET EVENTS ────────────────────────────────────────────────────────

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
  flame: boolean;  // NEW: F key
  web: boolean;    // NEW: Ctrl key
}

export interface GameState {
  grid: TileType[][];
  players: Player[];
  bombs: Bomb[];
  explosions: Explosion[];
  powerups: Powerup[];
  thrownFlames: ThrownFlame[];  // NEW
  webProjectiles: WebProjectile[]; // NEW
  webs: Web[];                  // NEW
  tick: number;
  phase: 'lobby' | 'playing' | 'over';
  autoStartTick: number | null; // NEW: tick at which auto-start fires, or null
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
  autoStartIn: number | null; // NEW: seconds until auto-start
}

export const PLAYER_COLORS = ['#44aaff', '#ff6633', '#44ff88', '#ff44cc'];
export const PLAYER_NAMES_DEFAULT = ['Bomber Blue', 'Blaster Red', 'Blast Green', 'Boom Pink'];
export const TILE_SIZE = 48;

// Constants
export const INVINCIBILITY_TICKS = 140; // 7s at 50ms
export const AUTO_START_TICKS = 1200;   // 60s at 50ms (lobby timer)
export const WEB_PROJECTILE_SPEED_TICKS = 2; // moves every N ticks
export const WEB_STUCK_TICKS = 800;     // 40s
export const WEB_TRAP_TICKS = 600;      // 30s
export const THROWN_FLAME_SPEED_TICKS = 2; // moves every N ticks
