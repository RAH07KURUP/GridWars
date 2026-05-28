'use client';
import { useState } from 'react';
import styles from './JoinScreen.module.css';

interface Props {
  onJoin: (name: string) => void;
  error: string | null;
  connected: boolean;
}

export default function JoinScreen({ onJoin, error, connected }: Props) {
  const [name, setName] = useState('');

  const handleJoin = () => {
    const n = name.trim() || 'Bomber';
    onJoin(n);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.bomb}>💣</div>
        <h1 className={styles.title}>GridWars</h1>
        <p className={styles.sub}>MULTIPLAYER · UP TO 4 PLAYERS</p>

        <div className={styles.form}>
          <input
            className={styles.input}
            type="text"
            placeholder="YOUR NAME"
            maxLength={14}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />
          <button
            className={styles.btn}
            onClick={handleJoin}
            disabled={!connected}
          >
            {connected ? 'JOIN GAME' : 'CONNECTING...'}
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.controls}>
          <span>⬆⬇⬅➡ / WASD — MOVE</span>
          <span>SPACE — DROP BOMB</span>
        </div>
      </div>
    </div>
  );
}
