'use client';
import { useEffect, useRef } from 'react';
import {
  GameState, TileType, PowerupType,
  COLS, ROWS, TILE_SIZE as T,
} from '@/types/game';

interface Props {
  state: GameState;
  myPlayerId: string | null;
}

const COLORS = {
  floor:      '#0e0e1a',
  floorAlt:   '#111128',
  wall:       '#1a1a2e',
  wallInner:  '#0d0d1e',
  wallLight:  'rgba(255,255,255,0.04)',
  brick:      '#6b2020',
  brickInner: '#7a2828',
  brickEdge:  '#3a0a0a',
  brickLight: 'rgba(255,180,120,0.06)',
  fire:       ['#ffee00','#ffaa00','#ff5500','#ff2200'],
};

const PU_COLOR: Record<number, string> = {
  [PowerupType.BOMB]:  '#ff4444',
  [PowerupType.FLAME]: '#ff9900',
  [PowerupType.SPEED]: '#44ff88',
};
const PU_ICON: Record<number, string> = {
  [PowerupType.BOMB]:  '💣',
  [PowerupType.FLAME]: '🔥',
  [PowerupType.SPEED]: '⚡',
};

let animTick = 0;

export default function GameCanvas({ state, myPlayerId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const rafRef = useRef<number>(0);
  stateRef.current = state;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const render = () => {
      rafRef.current = requestAnimationFrame(render);
      animTick++;
      const s = stateRef.current;
      ctx.clearRect(0, 0, COLS * T, ROWS * T);

      drawGrid(ctx, s);
      drawWebs(ctx, s);
      drawExplosions(ctx, s);
      drawPowerups(ctx, s);
      drawBombs(ctx, s);
      drawWebProjectiles(ctx, s);
      drawThrownFlames(ctx, s);
      for (const en of s.players) drawPlayer(ctx, en, en.id === myPlayerId);
      drawParticleOverlay(ctx, s);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [myPlayerId]);

  return (
    <canvas
      ref={canvasRef}
      width={COLS * T}
      height={ROWS * T}
      style={{ imageRendering: 'pixelated', display: 'block' }}
    />
  );
}

// ─── GRID ─────────────────────────────────────────────────────────────────
function drawGrid(ctx: CanvasRenderingContext2D, s: GameState) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const tile = s.grid[y][x];
      const px = x * T, py = y * T;

      if (tile === TileType.FLOOR) {
        ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.floor : COLORS.floorAlt;
        ctx.fillRect(px, py, T, T);
        ctx.fillStyle = 'rgba(255,255,255,0.015)';
        ctx.fillRect(px + T - 2, py + T - 2, 2, 2);

      } else if (tile === TileType.WALL) {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(px, py, T, T);
        ctx.fillStyle = COLORS.wallInner;
        ctx.fillRect(px + 2, py + 2, T - 4, T - 4);
        ctx.fillStyle = COLORS.wallLight;
        ctx.fillRect(px + 3, py + 3, T - 6, 4);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(px + 4, py + 4, 3, 3);
        ctx.fillRect(px + T - 7, py + 4, 3, 3);

      } else if (tile === TileType.BRICK) {
        ctx.fillStyle = COLORS.brick;
        ctx.fillRect(px, py, T, T);
        ctx.fillStyle = COLORS.brickEdge;
        ctx.fillRect(px, py, T, 2);
        ctx.fillRect(px, py, 2, T);
        ctx.fillStyle = COLORS.brickInner;
        ctx.fillRect(px + 3, py + 3, T / 2 - 4, T / 2 - 5);
        ctx.fillRect(px + T / 2 + 1, py + 3, T / 2 - 4, T / 2 - 5);
        ctx.fillRect(px + 3, py + T / 2 + 1, T / 2 - 4, T / 2 - 4);
        ctx.fillRect(px + T / 2 + 1, py + T / 2 + 1, T / 2 - 4, T / 2 - 4);
        ctx.fillStyle = COLORS.brickLight;
        ctx.fillRect(px + 4, py + 4, T / 2 - 5, 3);
      }
    }
  }
}

// ─── WEBS (stuck on grid) ─────────────────────────────────────────────────
function drawWebs(ctx: CanvasRenderingContext2D, s: GameState) {
  for (const web of s.webs) {
    const px = web.gx * T, py = web.gy * T;
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.1 * Math.sin(animTick * 0.07);
    // Draw web as a series of lines from center
    const cx = px + T / 2, cy = py + T / 2;
    ctx.strokeStyle = '#d4a8ff';
    ctx.lineWidth = 1.2;
    const spokes = 8;
    const r = T * 0.42;
    for (let i = 0; i < spokes; i++) {
      const angle = (i / spokes) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      ctx.stroke();
    }
    // Concentric rings
    for (const ringR of [r * 0.3, r * 0.6, r]) {
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ─── EXPLOSIONS ───────────────────────────────────────────────────────────
function drawExplosions(ctx: CanvasRenderingContext2D, s: GameState) {
  for (const ex of s.explosions) {
    const t = ex.timer / ex.maxTimer;
    const ci = Math.min(3, Math.floor((1 - t) * 4));
    for (const c of ex.cells) {
      const px = c.gx * T, py = c.gy * T;
      ctx.globalAlpha = t * 0.95;
      ctx.fillStyle = COLORS.fire[ci];
      ctx.fillRect(px, py, T, T);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = t * 0.6;
      const pad = T * 0.28;
      ctx.fillRect(px + pad, py + pad, T - pad * 2, T - pad * 2);
      ctx.globalAlpha = 1;
    }
  }
}

// ─── POWERUPS ─────────────────────────────────────────────────────────────
function drawPowerups(ctx: CanvasRenderingContext2D, s: GameState) {
  for (const pu of s.powerups) {
    const px = pu.gx * T, py = pu.gy * T;
    const bob = Math.sin(animTick * 0.08) * 3;
    const c = PU_COLOR[pu.type] ?? '#fff';

    ctx.save();
    ctx.translate(px + T / 2, py + T / 2 + bob);
    ctx.shadowColor = c;
    ctx.shadowBlur = 14;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.roundRect(-T * 0.3, -T * 0.3, T * 0.6, T * 0.6, 5);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.font = `${Math.floor(T * 0.36)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(PU_ICON[pu.type] ?? '?', 0, 2);
    ctx.restore();
  }
}

// ─── BOMBS ────────────────────────────────────────────────────────────────
function drawBombs(ctx: CanvasRenderingContext2D, s: GameState) {
  for (const bomb of s.bombs) {
    const px = bomb.gx * T, py = bomb.gy * T;
    const frac = 1 - bomb.timer / 120;
    const pulse = Math.sin(animTick * (0.1 + frac * 0.3)) * 0.06;

    ctx.save();
    ctx.translate(px + T / 2, py + T / 2);
    const scale = 0.72 + pulse;
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(3, T * 0.3, T * 0.3, T * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();

    const g = ctx.createRadialGradient(-T * 0.08, -T * 0.12, 2, 0, 0, T * 0.34);
    const hot = frac > 0.65;
    g.addColorStop(0, hot ? '#ff6655' : '#555');
    g.addColorStop(1, hot ? '#990000' : '#111');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, T * 0.34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.ellipse(-T * 0.1, -T * 0.14, T * 0.1, T * 0.06, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(T * 0.15, -T * 0.28);
    ctx.quadraticCurveTo(T * 0.28, -T * 0.48, T * 0.1, -T * 0.54);
    ctx.stroke();

    if (frac > 0.05) {
      ctx.globalAlpha = 0.5 + (Math.random() > 0.5 ? 0.5 : 0);
      ctx.fillStyle = frac > 0.6 ? '#fff' : '#ffcc00';
      ctx.beginPath();
      ctx.arc(T * 0.1, -T * 0.54, 2.5 + frac * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }
}

// ─── WEB PROJECTILES (travelling) ─────────────────────────────────────────
function drawWebProjectiles(ctx: CanvasRenderingContext2D, s: GameState) {
  for (const wp of s.webProjectiles) {
    ctx.save();
    ctx.translate(wp.x, wp.y);
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = '#cc88ff';
    ctx.lineWidth = 2;
    // Small web blob
    const r = T * 0.22;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ─── THROWN FLAMES (projectile) ───────────────────────────────────────────
function drawThrownFlames(ctx: CanvasRenderingContext2D, s: GameState) {
  for (const f of s.thrownFlames) {
    ctx.save();
    ctx.translate(f.x, f.y);
    const flicker = 0.7 + 0.3 * Math.sin(animTick * 0.4 + f.x);
    ctx.globalAlpha = flicker;

    // Outer glow
    ctx.shadowColor = '#ff8800';
    ctx.shadowBlur = 12;

    // Flame teardrop shape
    ctx.fillStyle = '#ffee00';
    ctx.beginPath();
    ctx.arc(0, 0, T * 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff5500';
    ctx.beginPath();
    ctx.arc(0, 0, T * 0.13, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Emoji label
    ctx.font = `${Math.floor(T * 0.32)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔥', 0, 1);

    ctx.restore();
  }
}

// ─── PLAYERS ──────────────────────────────────────────────────────────────
function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: { x: number; y: number; color: string; alive: boolean; dir: string; name: string; invincible: number; score: number; trappedTicks?: number },
  isMe: boolean
) {
  if (!player.alive) return;
  if (player.invincible > 0 && Math.floor(animTick / 4) % 2 === 0) return;

  const { x, y, color } = player;
  const bob = Math.sin(animTick * 0.12) * 1.5;
  const trapped = (player.trappedTicks ?? 0) > 0;

  ctx.save();
  ctx.translate(x, y + bob);

  // Web overlay when trapped
  if (trapped) {
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(animTick * 0.1);
    ctx.fillStyle = '#cc88ff';
    ctx.beginPath();
    ctx.arc(0, 0, T * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, T * 0.33, T * 0.24, T * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-T * 0.2, -T * 0.12, T * 0.4, T * 0.36, 6);
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-T * 0.2, T * 0.06, T * 0.4, T * 0.18);

  ctx.fillStyle = '#f5c888';
  ctx.beginPath();
  ctx.arc(0, -T * 0.24, T * 0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1a1a2e';
  const eyeShift = player.dir === 'left' ? -4 : player.dir === 'right' ? 4 : 0;
  const eyeY = player.dir === 'up' ? -T * 0.3 : -T * 0.24;
  ctx.beginPath();
  ctx.arc(eyeShift - 4, eyeY, 2.5, 0, Math.PI * 2);
  ctx.arc(eyeShift + 4, eyeY, 2.5, 0, Math.PI * 2);
  ctx.fill();

  const hc = color;
  ctx.fillStyle = hc;
  ctx.fillRect(-T * 0.2, -T * 0.4, T * 0.4, T * 0.07);
  ctx.fillRect(-T * 0.13, -T * 0.52, T * 0.26, T * 0.13);

  ctx.fillStyle = isMe ? '#ffee44' : 'rgba(255,255,255,0.55)';
  ctx.font = `bold ${isMe ? 9 : 7}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(isMe ? '▼ YOU' : player.name.substring(0, 6), 0, -T * 0.56);

  // Trapped indicator
  if (trapped) {
    ctx.font = '10px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#dd88ff';
    ctx.fillText('🕸', 0, -T * 0.66);
  }

  ctx.restore();
}

// ─── OVERLAY PARTICLES ────────────────────────────────────────────────────
function drawParticleOverlay(ctx: CanvasRenderingContext2D, _s: GameState) {
  ctx.fillStyle = 'rgba(0,0,0,0.03)';
  for (let y = 0; y < ROWS * T; y += 3) {
    ctx.fillRect(0, y, COLS * T, 1);
  }
}
