'use client';
import { useEffect, useRef, useState } from 'react';
import { GameState } from '@/types/game';
import styles from './GameHUD.module.css';

interface Props {
  state: GameState;
  myPlayerId: string | null;
}

interface FloatingMsg {
  id: number;
  text: string;
  color: string;
}

let msgCounter = 0;

export default function GameHUD({ state, myPlayerId }: Props) {
  const me = state.players.find(p => p.id === myPlayerId);
  const alive = state.players.filter(p => p.alive);

  // Track flame capacity changes for notification
  const prevFlameCapRef = useRef<number | null>(null);
  const prevScoreRef = useRef<number | null>(null);
  const [floatingMsgs, setFloatingMsgs] = useState<FloatingMsg[]>([]);

  // Compute throwableFlames locally to match server formula
  const throwableFlames = me ? Math.max(0, me.flameLen - 2) + Math.floor(me.score / 250) : 0;

  useEffect(() => {
    if (!me) return;

    const newFC = throwableFlames;
    const oldFC = prevFlameCapRef.current;

    if (oldFC !== null && newFC !== oldFC) {
      const delta = newFC - oldFC;
      const sign = delta > 0 ? '+' : '';
      addFloating(`🔥 ${sign}${delta} Flame Capacity`, delta > 0 ? '#ff9900' : '#ff4444');
    }
    prevFlameCapRef.current = newFC;
  }, [throwableFlames, me]);

  // Show -50 for web shot (score drop of exactly 50)
  useEffect(() => {
    if (!me) return;
    const prev = prevScoreRef.current;
    if (prev !== null && me.score === prev - 50) {
      addFloating('-50', '#dd88ff');
    }
    prevScoreRef.current = me.score;
  }, [me?.score]);

  function addFloating(text: string, color: string) {
    const id = ++msgCounter;
    setFloatingMsgs(msgs => [...msgs, { id, text, color }]);
    setTimeout(() => {
      setFloatingMsgs(msgs => msgs.filter(m => m.id !== id));
    }, 2000);
  }

  const trapped = (me?.trappedTicks ?? 0) > 0;

  return (
    <div className={styles.hud}>
      <div className={styles.left}>
        <span className={styles.label}>SCORE</span>
        <span className={styles.val}>{me?.score ?? 0}</span>
      </div>
      <div className={styles.center}>
        <span className={styles.enemies}>👾 {alive.length} ALIVE</span>
        {trapped && (
          <span className={styles.trapped}>🕸 TRAPPED {((me!.trappedTicks) / 20).toFixed(1)}s</span>
        )}
      </div>
      <div className={styles.right}>
        <div className={styles.powerupRow}>
          {me && (
            <>
              <span className={styles.pu} title="Bombs">💣×{me.maxBombs}</span>
              <span className={styles.pu} title="Throwable Flames">🔥✈×{throwableFlames}</span>
              <span className={styles.pu} title="Speed">{me.speed.toFixed(1)}⚡</span>
            </>
          )}
        </div>
      </div>

      {/* Floating notifications */}
      <div className={styles.floatingArea}>
        {floatingMsgs.map(m => (
          <div key={m.id} className={styles.floatingMsg} style={{ color: m.color }}>
            {m.text}
          </div>
        ))}
      </div>
    </div>
  );
}
