'use client';
import { GameOverData } from '@/types/game';
import { useGameStore } from '@/store/gameStore';
import styles from './GameOverScreen.module.css';

interface Props {
  data: GameOverData;
  myPlayerId: string | null;
  onBack: () => void;
}

const TOTAL_BLOCKS = 8;

export default function GameOverScreen({ data, myPlayerId, onBack }: Props) {
  const iWon = data.winnerId === myPlayerId;
  const lobbyCountdown = useGameStore(s => s.lobbyCountdown);

  // Blocks that are still "filled" = lobbyCountdown remaining
  // Each second one block disappears from right to left
  const filledBlocks = Math.max(0, Math.min(TOTAL_BLOCKS, lobbyCountdown));

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
              <span className={styles.rank}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
              </span>
              <span className={styles.scoreName} style={{ color: s.id === myPlayerId ? '#ffcc44' : '#bbb' }}>
                {s.name}
              </span>
              <span className={styles.scoreVal}>{s.score}</span>
            </div>
          ))}
        </div>

        {/* 8-bit block deloader */}
        <div className={styles.returnWrap}>
          <div className={styles.returnLabel}>RETURNING TO LOBBY</div>
          <div className={styles.blocks}>
            {Array.from({ length: TOTAL_BLOCKS }).map((_, i) => (
              <div
                key={i}
                className={styles.block}
                data-filled={i < filledBlocks ? 'true' : 'false'}
                style={{ animationDelay: `${i * 0.04}s` }}
              />
            ))}
          </div>
          <div className={styles.returnSecs}>{filledBlocks}s</div>
        </div>
      </div>
    </div>
  );
}
