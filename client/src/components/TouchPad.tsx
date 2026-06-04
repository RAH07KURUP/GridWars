'use client';
import styles from './TouchPad.module.css';

interface Props {
  onDir: (dx: number, dy: number) => void;
  onBomb: () => void;
  onFlame: () => void;  // NEW
  onWeb: () => void;    // NEW
}

export default function TouchPad({ onDir, onBomb, onFlame, onWeb }: Props) {
  return (
    <div className={styles.pad}>
      <div className={styles.dpad}>
        <button className={`${styles.dBtn} ${styles.up}`}    onPointerDown={() => onDir(0,-1)}  onPointerUp={() => onDir(0,0)}>▲</button>
        <button className={`${styles.dBtn} ${styles.down}`}  onPointerDown={() => onDir(0,1)}   onPointerUp={() => onDir(0,0)}>▼</button>
        <button className={`${styles.dBtn} ${styles.left}`}  onPointerDown={() => onDir(-1,0)}  onPointerUp={() => onDir(0,0)}>◀</button>
        <button className={`${styles.dBtn} ${styles.right}`} onPointerDown={() => onDir(1,0)}   onPointerUp={() => onDir(0,0)}>▶</button>
      </div>
      <div className={styles.actionBtns}>
        <button className={styles.bombBtn}  onPointerDown={onBomb}>💣</button>
        <button className={styles.flameBtn} onPointerDown={onFlame}>🔥</button>
        <button className={styles.webBtn}   onPointerDown={onWeb}>🕸</button>
      </div>
    </div>
  );
}
