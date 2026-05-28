import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { GameEngine } from './gameEngine';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  TICK_MS,
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

const ROOM_ID = 'main'; // single global room for simplicity
const roomPlayers: Map<string, RoomPlayer> = new Map(); // socketId → player
let engine: GameEngine = new GameEngine();
let tickInterval: ReturnType<typeof setInterval> | null = null;
let phase: 'lobby' | 'playing' | 'over' = 'lobby';

function broadcastRoomInfo() {
  const players = Array.from(roomPlayers.values()).map(rp => ({
    id: rp.playerId,
    name: rp.name,
    color: engine.state.players.find(p => p.id === rp.playerId)?.color ?? '#fff',
    ready: rp.ready,
  }));
  io.to(ROOM_ID).emit('room:update', {
    players,
    phase,
    maxPlayers: 4,
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

function tryStartGame() {
  const players = Array.from(roomPlayers.values());
  const allReady = players.length >= 2 && players.every(p => p.ready);
  if (!allReady) return;

  phase = 'playing';
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
      // Re-add players
      for (const rp of roomPlayers.values()) {
        engine.addPlayer(rp.playerId, rp.name);
      }
      broadcastRoomInfo();
    }, 8000);
  });

  io.to(ROOM_ID).emit('game:start', engine.state);
  startTick();
  broadcastRoomInfo();
}

// ─── SOCKET HANDLERS ──────────────────────────────────────────────────────
io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
  console.log(`[+] Connected: ${socket.id}`);

  socket.on('room:join', (name: string) => {
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
      engine.removePlayer(rp.playerId);
      roomPlayers.delete(socket.id);
      console.log(`[-] ${rp.name} disconnected (${roomPlayers.size}/4)`);
      broadcastRoomInfo();

      // If not enough players mid-game
      if (phase === 'playing' && roomPlayers.size < 2) {
        stopTick();
        phase = 'lobby';
        roomPlayers.forEach(rp2 => { rp2.ready = false; });
        engine = new GameEngine();
        for (const rp2 of roomPlayers.values()) {
          engine.addPlayer(rp2.playerId, rp2.name);
        }
        broadcastRoomInfo();
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`\n🎮 GridWars Server running on http://localhost:${PORT}\n`);
});
