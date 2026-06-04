'use client';
import styles from './LobbyScreen.module.css';
import { RoomInfo } from '@/types/game';

interface Props {
  room: RoomInfo;
  myPlayerId: string | null;
  onToggleReady: () => void;
}

export default function LobbyScreen({ room, myPlayerId, onToggleReady }: Props) {
  const me = room.players.find(p => p.id === myPlayerId);
  const allReady = room.players.length >= 2 && room.players.every(p => p.ready);
  const autoStartIn = room.autoStartIn;

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>💣 LOBBY</h1>
        <p className={styles.sub}>
          {room.players.length}/{room.maxPlayers} PLAYERS &nbsp;·&nbsp;
          {allReady ? '🟢 STARTING...' : 'NEED 2+ READY'}
        </p>

        {/* Auto-start countdown */}
        {autoStartIn !== null && autoStartIn > 0 && (
          <div className={styles.autoStart}>
            ⏱ AUTO-START IN {autoStartIn}s
          </div>
        )}

        <div className={styles.playerList}>
          {room.players.map((p, i) => (
            <div key={p.id} className={styles.playerRow} style={{ borderColor: p.color + '44' }}>
              <span className={styles.playerDot} style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }} />
              <span className={styles.playerName} style={{ color: p.id === myPlayerId ? p.color : '#ccc' }}>
                {p.name} {p.id === myPlayerId ? '(YOU)' : ''}
              </span>
              <span className={p.ready ? styles.readyYes : styles.readyNo}>
                {p.ready ? 'READY ✓' : 'NOT READY'}
              </span>
            </div>
          ))}
          {Array.from({ length: room.maxPlayers - room.players.length }).map((_, i) => (
            <div key={`empty-${i}`} className={styles.playerRow} style={{ borderColor: '#222', opacity: 0.4 }}>
              <span className={styles.playerDot} style={{ background: '#222' }} />
              <span className={styles.playerName} style={{ color: '#333' }}>WAITING...</span>
              <span className={styles.readyNo}>EMPTY</span>
            </div>
          ))}
        </div>

        <button
          className={me?.ready ? styles.btnUnready : styles.btnReady}
          onClick={onToggleReady}
        >
          {me?.ready ? 'CANCEL READY' : '✓ READY UP'}
        </button>

        <div className={styles.tip}>
          Share this URL with friends to play together!
        </div>

        <div className={styles.controls}>
          <div>⬆⬇⬅➡ / WASD — MOVE</div>
          <div>SPACE — DROP BOMB</div>
          <div>F — THROW FLAME </div>
          <div>CTRL — SHOOT WEB (costs 50 pts)</div>
          <div>Collect Flame Throwers to increase your flame weapons</div>
          <div> and blast range of Bombs</div>
          <div>Each 250 point will automatically increment</div>
          <div>your flame capacity by 1 (max 10)</div>
          <div>Destroy all enemies to win +500 pts for victory</div>
        </div>
      </div>
    </div>
  );
}
