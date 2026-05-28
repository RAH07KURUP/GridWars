'use client';
import { GameState } from '@/types/game';
import styles from './GameHUD.module.css';

interface Props {
  state: GameState;
  myPlayerId: string | null;
}

export default function GameHUD({ state, myPlayerId }: Props) {
  const me = state.players.find(p => p.id === myPlayerId);
  const alive = state.players.filter(p => p.alive);

  return (
    <div className={styles.hud}>
      <div className={styles.left}>
        <span className={styles.label}>SCORE</span>
        <span className={styles.val}>{me?.score ?? 0}</span>
      </div>
      <div className={styles.center}>
        <span className={styles.enemies}>👾 {alive.length} ALIVE</span>
      </div>
      <div className={styles.right}>
        <div className={styles.powerupRow}>
          {me && (
            <>
              <span className={styles.pu} title="Bombs">💣×{me.maxBombs}</span>
              <span className={styles.pu} title="Flame">🔥×{me.flameLen}</span>
              <span className={styles.pu} title="Speed">{me.speed.toFixed(1)}⚡</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
