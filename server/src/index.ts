import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { GameEngine } from './gameEngine';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  TICK_MS,
  AUTO_START_TICKS,
} from './types';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const httpServer = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ─── ROOM MANAGER ─────────────────────────────────────────────────────────
interface RoomPlayer {
  socketId: string;
  playerId: string;
  name: string;
  ready: boolean;
}

const ROOM_ID = 'main';
const roomPlayers: Map<string, RoomPlayer> = new Map(); // socketId → player
// Tracks players who have disconnected during a game (for leaderboard persistence)
const disconnectedDuringGame: Map<string, { name: string; score: number }> = new Map();
let engine: GameEngine = new GameEngine();
let tickInterval: ReturnType<typeof setInterval> | null = null;
let phase: 'lobby' | 'playing' | 'over' = 'lobby';

// Auto-start tracking
let autoStartTimer: ReturnType<typeof setTimeout> | null = null;
let autoStartAt: number | null = null; // Date.now() ms when auto-start fires
let lobbyCountdownInterval: ReturnType<typeof setInterval> | null = null;

function startLobbyCountdown() {
  if (lobbyCountdownInterval) return; // already running
  lobbyCountdownInterval = setInterval(() => {
    if (autoStartAt === null || phase !== 'lobby') {
      stopLobbyCountdown();
      return;
    }
    broadcastRoomInfo(); // re-sends fresh autoStartIn value every second
  }, 1000);
}

function stopLobbyCountdown() {
  if (lobbyCountdownInterval) { clearInterval(lobbyCountdownInterval); lobbyCountdownInterval = null; }
}

function broadcastRoomInfo() {
  const players = Array.from(roomPlayers.values()).map(rp => ({
    id: rp.playerId,
    name: rp.name,
    color: engine.state.players.find(p => p.id === rp.playerId)?.color ?? '#fff',
    ready: rp.ready,
  }));

  const autoStartIn = (phase === 'lobby' && autoStartAt !== null)
    ? Math.max(0, Math.ceil((autoStartAt - Date.now()) / 1000))
    : null;

  io.to(ROOM_ID).emit('room:update', {
    players,
    phase,
    maxPlayers: 4,
    autoStartIn,
  });
}

function startTick() {
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = setInterval(() => {
    engine.tick();
    io.to(ROOM_ID).emit('game:state', engine.state);
  }, TICK_MS);
}

function stopTick() {
  if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
}

function cancelAutoStart() {
  if (autoStartTimer) { clearTimeout(autoStartTimer); autoStartTimer = null; }
  autoStartAt = null;
  stopLobbyCountdown();
}

function scheduleAutoStart() {
  cancelAutoStart();
  const players = Array.from(roomPlayers.values());
  if (players.length < 2) return;

  autoStartAt = Date.now() + AUTO_START_TICKS * TICK_MS;
  autoStartTimer = setTimeout(() => {
    autoStartTimer = null;
    autoStartAt = null;
    stopLobbyCountdown();
    if (phase === 'lobby' && roomPlayers.size >= 2) {
      forceStartGame();
    }
  }, AUTO_START_TICKS * TICK_MS);

  startLobbyCountdown();
  broadcastRoomInfo();
}

function forceStartGame() {
  const players = Array.from(roomPlayers.values());
  if (players.length < 2) return;

  stopLobbyCountdown(); // countdown no longer needed once game starts
  phase = 'playing';
  disconnectedDuringGame.clear();
  engine.resetAndStart(players.map(p => ({ id: p.playerId, name: p.name })));
  engine.onGameOver((data) => {
    stopTick();
    phase = 'over';
    io.to(ROOM_ID).emit('game:over', data);
    broadcastRoomInfo();
    // Auto reset to lobby after 8s
    setTimeout(() => {
      phase = 'lobby';
      roomPlayers.forEach(rp => { rp.ready = false; });
      engine = new GameEngine();
      for (const rp of roomPlayers.values()) {
        engine.addPlayer(rp.playerId, rp.name);
      }
      disconnectedDuringGame.clear();
      broadcastRoomInfo();
      // Re-schedule auto-start if enough players are still in the room
      if (roomPlayers.size >= 2) scheduleAutoStart();
    }, 8000);
  });

  io.to(ROOM_ID).emit('game:start', engine.state);
  startTick();
  broadcastRoomInfo();
}

function tryStartGame() {
  const players = Array.from(roomPlayers.values());
  const allReady = players.length >= 2 && players.every(p => p.ready);
  if (!allReady) return;

  cancelAutoStart();
  forceStartGame();
}

// ─── SOCKET HANDLERS ──────────────────────────────────────────────────────
io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
  console.log(`[+] Connected: ${socket.id}`);

  socket.on('room:join', (name: string) => {
    if (phase === 'playing') {
      socket.emit('room:error', 'Game already in progress');
      return;
    }

    if (roomPlayers.size >= 4) {
      socket.emit('room:error', 'Room is full (max 4 players)');
      return;
    }
    if (roomPlayers.has(socket.id)) return;

    socket.join(ROOM_ID);

    const playerId = socket.id;
    const safeName = (name || 'Bomber').substring(0, 16);

    roomPlayers.set(socket.id, {
      socketId: socket.id,
      playerId,
      name: safeName,
      ready: false,
    });

    if (phase === 'lobby' || phase === 'over') {
      engine.addPlayer(playerId, safeName);
    }

    socket.emit('player:assign', {
      playerId,
      color: engine.state.players.find(p => p.id === playerId)?.color ?? '#fff',
    });

    broadcastRoomInfo();
    console.log(`[*] ${safeName} joined (${roomPlayers.size}/4)`);

    // Schedule/re-schedule auto-start if >=2 players in lobby
    if (phase === 'lobby' && roomPlayers.size >= 2 && autoStartAt === null) {
      scheduleAutoStart();
    }
  });

  socket.on('room:ready', () => {
    const rp = roomPlayers.get(socket.id);
    if (!rp) return;
    rp.ready = !rp.ready;
    broadcastRoomInfo();
    tryStartGame();
  });

  socket.on('player:input', (input) => {
    const rp = roomPlayers.get(socket.id);
    if (!rp || phase !== 'playing') return;
    engine.setInput(rp.playerId, input);
  });

  socket.on('disconnect', () => {
    const rp = roomPlayers.get(socket.id);
    if (rp) {
      if (phase === 'playing') {
        // Keep in leaderboard: mark dead, keep in engine state
        const p = engine.state.players.find(pl => pl.id === rp.playerId);
        if (p) disconnectedDuringGame.set(rp.playerId, { name: rp.name, score: p.score });
        engine.markPlayerDisconnected(rp.playerId);
      } else {
        // Lobby: fully remove
        engine.removePlayer(rp.playerId);
      }
      roomPlayers.delete(socket.id);
      console.log(`[-] ${rp.name} disconnected (${roomPlayers.size}/4)`);
      broadcastRoomInfo();

      // Cancel auto-start if fewer than 2 players
      if (phase === 'lobby' && roomPlayers.size < 2) {
        cancelAutoStart();
        broadcastRoomInfo();
      }

      // If not enough players mid-game, end gracefully
      if (phase === 'playing' && roomPlayers.size < 1) {
        stopTick();
        phase = 'lobby';
        roomPlayers.forEach(rp2 => { rp2.ready = false; });
        engine = new GameEngine();
        for (const rp2 of roomPlayers.values()) {
          engine.addPlayer(rp2.playerId, rp2.name);
        }
        disconnectedDuringGame.clear();
        broadcastRoomInfo();
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`\n🎮 GridWars Server running on http://localhost:${PORT}\n`);
});
