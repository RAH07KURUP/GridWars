import { v4 as uuid } from 'uuid';
import {
  COLS, ROWS, TILE_SIZE,
  TileType, PowerupType,
  Player, Bomb, Explosion, Powerup, ExplosionCell,
  GameState, PlayerInput, GameOverData,
  PLAYER_COLORS,
} from './types';

const T = TILE_SIZE;
const BOMB_FUSE = 120; // ticks (6s at 50ms)
const EXPLOSION_DURATION = 30; // ticks (1.5s)
const SPAWN_POINTS = [
  { gx: 1, gy: 1 },
  { gx: COLS - 2, gy: 1 },
  { gx: 1, gy: ROWS - 2 },
  { gx: COLS - 2, gy: ROWS - 2 },
];
const SAFE_ZONES: Set<string>[] = SPAWN_POINTS.map(({ gx, gy }) =>
  new Set([
    `${gx},${gy}`,
    `${gx+1},${gy}`, `${gx+2},${gy}`,
    `${gx},${gy+1}`, `${gx},${gy+2}`,
    `${gx+1},${gy+1}`,
  ])
);

function gKey(gx: number, gy: number) { return `${gx},${gy}`; }

export class GameEngine {
  state: GameState;
  private pendingInputs: Map<string, PlayerInput> = new Map();
  private onOver: ((data: GameOverData) => void) | null = null;
  private alreadyOver = false;

  constructor() {
    this.state = this.freshState();
  }

  private freshState(): GameState {
    return {
      grid: this.generateGrid(),
      players: [],
      bombs: [],
      explosions: [],
      powerups: [],
      tick: 0,
      phase: 'lobby',
    };
  }

  private generateGrid(): TileType[][] {
    const safe = new Set<string>();
    SAFE_ZONES.forEach(z => z.forEach(k => safe.add(k)));

    const grid: TileType[][] = [];
    for (let y = 0; y < ROWS; y++) {
      grid[y] = [];
      for (let x = 0; x < COLS; x++) {
        if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) {
          grid[y][x] = TileType.WALL;
        } else if (x % 2 === 0 && y % 2 === 0) {
          grid[y][x] = TileType.WALL;
        } else if (!safe.has(gKey(x, y)) && Math.random() < 0.55) {
          grid[y][x] = TileType.BRICK;
        } else {
          grid[y][x] = TileType.FLOOR;
        }
      }
    }
    return grid;
  }

  addPlayer(id: string, name: string): Player | null {
    const idx = this.state.players.length;
    if (idx >= 4) return null;
    const sp = SPAWN_POINTS[idx];
    const player: Player = {
      id, name,
      color: PLAYER_COLORS[idx],
      x: sp.gx * T + T / 2,
      y: sp.gy * T + T / 2,
      gx: sp.gx, gy: sp.gy,
      alive: true,
      speed: 3.0,
      maxBombs: 1,
      bombsPlaced: 0,
      flameLen: 2,
      dir: 'down',
      invincible: 60,
      score: 0,
    };
    this.state.players.push(player);
    return player;
  }

  removePlayer(id: string) {
    this.state.players = this.state.players.filter(p => p.id !== id);
    this.state.bombs = this.state.bombs.filter(b => b.ownerId !== id);
  }

  startGame() {
    this.state = this.freshState();
    // restore players
    const playersCopy = [...this.state.players];
    this.state.players = [];
    this.alreadyOver = false;
    return this.state;
  }

  resetAndStart(connectedIds: { id: string; name: string }[]) {
    this.state = this.freshState();
    this.alreadyOver = false;
    for (const { id, name } of connectedIds) {
      this.addPlayer(id, name);
    }
    this.state.phase = 'playing';
  }

  setInput(playerId: string, input: PlayerInput) {
    this.pendingInputs.set(playerId, input);
  }

  onGameOver(cb: (data: GameOverData) => void) {
    this.onOver = cb;
  }

  tick() {
    if (this.state.phase !== 'playing') return;
    this.state.tick++;

    this.processInputs();
    this.updateBombs();
    this.updateExplosions();
    this.checkPlayerExplosions();
    this.checkPlayerCollisions();
    this.checkPowerups();
    this.checkWinCondition();
  }

  // ─── INPUT PROCESSING ──────────────────────────────────────────────────
  private processInputs() {
    for (const player of this.state.players) {
      if (!player.alive) continue;
      const input = this.pendingInputs.get(player.id);
      if (!input) continue;

      const { dx, dy, bomb } = input;
      if (dx !== 0 || dy !== 0) {
        this.movePlayer(player, dx, dy);
        if (dx < 0) player.dir = 'left';
        else if (dx > 0) player.dir = 'right';
        else if (dy < 0) player.dir = 'up';
        else if (dy > 0) player.dir = 'down';
      }

      if (bomb) this.placeBomb(player);
    }
  }

  private movePlayer(player: Player, dx: number, dy: number) {
    const speed = player.speed;
    const hw = T * 0.40;
    const mag = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = player.x + (dx / mag) * speed;
    const ny = player.y + (dy / mag) * speed;

    if (!this.collidesAt(nx, player.y, hw, player)) player.x = nx;
    if (!this.collidesAt(player.x, ny, hw, player)) player.y = ny;

    player.x = Math.max(hw, Math.min(COLS * T - hw, player.x));
    player.y = Math.max(hw, Math.min(ROWS * T - hw, player.y));
    player.gx = Math.floor(player.x / T);
    player.gy = Math.floor(player.y / T);

    if (player.invincible > 0) player.invincible--;
  }

  private collidesAt(px: number, py: number, hw: number, self: Player): boolean {
    const corners = [
      { cx: px - hw, cy: py - hw },
      { cx: px + hw, cy: py - hw },
      { cx: px - hw, cy: py + hw },
      { cx: px + hw, cy: py + hw },
    ];
    for (const { cx, cy } of corners) {
      const gx = Math.floor(cx / T);
      const gy = Math.floor(cy / T);
      const t = this.tileAt(gx, gy);
      if (t !== TileType.FLOOR) return true;
      if (this.bombBlocksAt(gx, gy, self)) return true;
    }
    return false;
  }

  private bombBlocksAt(gx: number, gy: number, self: Player): boolean {
    return this.state.bombs.some(b => {
      if (b.gx !== gx || b.gy !== gy) return false;
      // Allow pass-through until the player has fully left the bomb's tile
      const stillOverlapping =
        self.x + T * 0.4 > b.gx * T &&
        self.x - T * 0.4 < (b.gx + 1) * T &&
        self.y + T * 0.4 > b.gy * T &&
        self.y - T * 0.4 < (b.gy + 1) * T;
      return !stillOverlapping;
    });
  }

  private tileAt(gx: number, gy: number): TileType {
    if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS) return TileType.WALL;
    return this.state.grid[gy][gx];
  }

  // ─── BOMB LOGIC ────────────────────────────────────────────────────────
  private placeBomb(player: Player) {
    if (player.bombsPlaced >= player.maxBombs) return;
    const gx = Math.round((player.x - T / 2) / T);
    const gy = Math.round((player.y - T / 2) / T);
    if (this.state.bombs.some(b => b.gx === gx && b.gy === gy)) return;

    player.bombsPlaced++;
    this.state.bombs.push({
      id: uuid(),
      ownerId: player.id,
      gx, gy,
      timer: BOMB_FUSE,
      flameLen: player.flameLen,
    });
  }

  private updateBombs() {
    for (const bomb of this.state.bombs) {
      bomb.timer--;
      if (bomb.timer <= 0) {
        this.explodeBomb(bomb);
      }
    }
    this.state.bombs = this.state.bombs.filter(b => b.timer > 0);
  }

  private explodeBomb(bomb: Bomb) {
    const cells: ExplosionCell[] = [{ gx: bomb.gx, gy: bomb.gy }];
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

    for (const [ddx, ddy] of dirs) {
      for (let i = 1; i <= bomb.flameLen; i++) {
        const nx = bomb.gx + ddx * i;
        const ny = bomb.gy + ddy * i;
        const t = this.tileAt(nx, ny);
        if (t === TileType.WALL) break;
        cells.push({ gx: nx, gy: ny });
        if (t === TileType.BRICK) {
          this.state.grid[ny][nx] = TileType.FLOOR;
          this.maybeSpawnPowerup(nx, ny);
          // Award score to bomb owner
          const owner = this.state.players.find(p => p.id === bomb.ownerId);
          if (owner) owner.score += 10;
          break;
        }
        // Chain reaction
        const chainBomb = this.state.bombs.find(b => b.gx === nx && b.gy === ny && b !== bomb);
        if (chainBomb) {
          chainBomb.timer = 1; // detonate next tick
          break;
        }
      }
    }

    // Decrement owner bomb count
    const owner = this.state.players.find(p => p.id === bomb.ownerId);
    if (owner) owner.bombsPlaced = Math.max(0, owner.bombsPlaced - 1);

    this.state.explosions.push({
      id: uuid(),
      cells,
      timer: EXPLOSION_DURATION,
      maxTimer: EXPLOSION_DURATION,
    });
  }

  private updateExplosions() {
    for (const ex of this.state.explosions) ex.timer--;
    this.state.explosions = this.state.explosions.filter(e => e.timer > 0);
  }

  private checkPlayerExplosions() {
    const explosionSet = new Set<string>();
    for (const ex of this.state.explosions) {
      for (const c of ex.cells) explosionSet.add(gKey(c.gx, c.gy));
    }

    for (const player of this.state.players) {
      if (!player.alive || player.invincible > 0) continue;
      if (explosionSet.has(gKey(player.gx, player.gy))) {
        this.killPlayer(player);
      }
    }
  }

  private checkPlayerCollisions() {
    const alive = this.state.players.filter(p => p.alive);
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        // No damage from touching other players in this impl (optional)
      }
    }
  }

  private killPlayer(player: Player) {
    player.alive = false;
    player.score = Math.max(0, player.score - 50);
  }

  // ─── POWERUPS ──────────────────────────────────────────────────────────
  private maybeSpawnPowerup(gx: number, gy: number) {
    if (Math.random() > 0.45) return;
    const types = [PowerupType.BOMB, PowerupType.FLAME, PowerupType.SPEED];
    const type = types[Math.floor(Math.random() * types.length)];
    this.state.powerups.push({ id: uuid(), gx, gy, type });
  }

  private checkPowerups() {
    for (const player of this.state.players) {
      if (!player.alive) continue;
      const idx = this.state.powerups.findIndex(p => p.gx === player.gx && p.gy === player.gy);
      if (idx === -1) continue;
      const pu = this.state.powerups[idx];
      this.state.powerups.splice(idx, 1);
      if (pu.type === PowerupType.BOMB)  player.maxBombs = Math.min(player.maxBombs + 1, 5);
      if (pu.type === PowerupType.FLAME) player.flameLen = Math.min(player.flameLen + 1, 7);
      if (pu.type === PowerupType.SPEED) player.speed = Math.min(player.speed + 0.5, 5.5);
      player.score += 50;
    }
  }

  // ─── WIN CONDITION ─────────────────────────────────────────────────────
  private checkWinCondition() {
    if (this.alreadyOver) return;
    const alive = this.state.players.filter(p => p.alive);
    if (this.state.players.length > 1 && alive.length <= 1) {
      this.alreadyOver = true;
      this.state.phase = 'over';
      const winner = alive[0] ?? null;
      if (winner) winner.score += 500;
      const data: GameOverData = {
        winnerId: winner?.id ?? null,
        winnerName: winner?.name ?? null,
        scores: this.state.players
          .map(p => ({ id: p.id, name: p.name, score: p.score }))
          .sort((a, b) => b.score - a.score),
      };
      this.onOver?.(data);
    }
  }
}
