'use client';
import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useInput } from '@/hooks/useInput';
import GameCanvas from './GameCanvas';
import GameHUD from './GameHUD';
import GameOverScreen from './GameOverScreen';
import TouchPad from './TouchPad';
import styles from './GameScreen.module.css';

interface Props {
  onSendInput: (input: { dx: number; dy: number; bomb: boolean; flame: boolean; web: boolean }) => void;
}

export default function GameScreen({ onSendInput }: Props) {
  const { gameState, gameOver, playerId, screen } = useGameStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile('ontouchstart' in window);
  }, []);

  const { setTouchDir, pressBomb, pressFlame, pressWeb } = useInput(onSendInput);

  if (!gameState) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.gameBox}>
        <GameHUD state={gameState} myPlayerId={playerId} />
        <div className={styles.canvasWrap}>
          <GameCanvas state={gameState} myPlayerId={playerId} />
          {screen === 'over' && gameOver && (
            <GameOverScreen data={gameOver} myPlayerId={playerId} onBack={() => {}} />
          )}
        </div>
        {isMobile && (
          <TouchPad
            onDir={setTouchDir}
            onBomb={pressBomb}
            onFlame={pressFlame}
            onWeb={pressWeb}
          />
        )}
      </div>
    </div>
  );
}
