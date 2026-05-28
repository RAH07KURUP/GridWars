# 💣 GridWars Multiplayer

Real-time multiplayer Bomberman clone built with **Next.js 14** (TypeScript) + **Node/Express** + **Socket.io**.

## Features
- Up to 4 players in the same room via WebSockets
- Server-authoritative game state (bomb timers, chain explosions, score)
- Power-ups: +Bomb, +Flame, +Speed
- Smart enemy-free design — players ARE the enemies 
- Mobile touch controls
- Lobby with ready-up system
- Pixel-art canvas renderer with animations

## Project Structure

```
GridWars/
├── server/          # Express + Socket.io game server
│   └── src/
│       ├── index.ts       # Socket.io room management
│       ├── gameEngine.ts  # Authoritative game logic
│       └── types.ts       # Shared types
└── client/          # Next.js 14 frontend
    └── src/
        ├── app/           # Next.js App Router
        ├── components/    # UI screens + Canvas renderer
        ├── hooks/         # useSocket, useInput
        ├── store/         # Zustand game store
        └── types/         # Shared game types
```

## Quick Start

### 1. Install & run the server
```bash
cd server
npm install
npm run dev
```
Server starts on **http://localhost:3001**

### 2. Install & run the client (new terminal)
```bash
cd client
npm install
npm run dev
```
Client starts on **http://localhost:3000**

### 3. Play!
1. Open http://localhost:3000 in your browser
2. Enter your name and click **JOIN GAME**
3. Click **READY UP** (need at least 2 players ready to start)
4. Open another browser tab / share the URL with friends
5. Last player alive wins!

## Controls
| Action | Key |
|--------|-----|
| Move   | Arrow Keys or WASD |
| Drop Bomb | Space |

## Multiplayer Tips
- All players connect to the same room automatically
- 2–4 players supported per room
- Share `http://YOUR_IP:3000` for LAN play
- For internet play, deploy server publicly and set `NEXT_PUBLIC_SERVER_URL` env var

## Environment Variables

### Client (`client/.env.local`)
```
NEXT_PUBLIC_SERVER_URL=http://localhost:3001
```

### Server
```
PORT=3001
```

## Production Build
```bash
# Server
cd server && npm run build && npm start

# Client
cd client && npm run build && npm start
```

## Scoring
| Action | Points |
|--------|--------|
| Destroy a brick | +10 |
| Pick up power-up | +50 |
| Win the round | +500 |
| Die | -50 |
