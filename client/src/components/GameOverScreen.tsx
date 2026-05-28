'use client';
import { GameOverData } from '@/types/game';
import styles from './GameOverScreen.module.css';

interface Props {
  data: GameOverData;
  myPlayerId: string | null;
  onBack: () => void;
}

export default function GameOverScreen({ data, myPlayerId, onBack }: Props) {
  const iWon = data.winnerId === myPlayerId;

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.trophy}>{iWon ? '🏆' : '💀'}</div>
        <h1 className={styles.title} style={{ color: iWon ? '#ffcc00' : '#ff4444' }}>
          {data.winnerName
            ? iWon ? 'YOU WIN!' : `${data.winnerName} WINS!`
            : 'DRAW!'}
        </h1>

        <div className={styles.scoreboard}>
          <div className={styles.scoreHeader}>FINAL SCORES</div>
          {data.scores.map((s, i) => (
            <div key={s.id} className={styles.scoreRow}>
              <span className={styles.rank}>#{i + 1}</span>
              <span className={styles.scoreName} style={{ color: s.id === myPlayerId ? '#ffcc44' : '#bbb' }}>
                {s.name}
              </span>
              <span className={styles.scoreVal}>{s.score}</span>
            </div>
          ))}
        </div>

        <p className={styles.returning}>Returning to lobby in 8s...</p>
      </div>
    </div>
  );
}
