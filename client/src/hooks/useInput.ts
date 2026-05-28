'use client';
import { useEffect, useRef, useCallback } from 'react';
import { PlayerInput } from '@/types/game';

export function useInput(onInput: (input: PlayerInput) => void) {
  const keys = useRef<Set<string>>(new Set());
  const bombUsed = useRef(false);
  const rafRef = useRef<number>(0);
  const onInputRef = useRef(onInput);
  onInputRef.current = onInput;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD'].includes(e.code)) {
        e.preventDefault();
      }
      keys.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => {
      keys.current.delete(e.code);
      if (e.code === 'Space') bombUsed.current = false;
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);

    let lastTime = 0;
    const tick = (time: number) => {
      rafRef.current = requestAnimationFrame(tick);
      if (time - lastTime < 40) return; // ~25fps input send
      lastTime = time;

      const k = keys.current;
      let dx = 0, dy = 0;
      if (k.has('ArrowLeft') || k.has('KeyA'))  dx -= 1;
      if (k.has('ArrowRight')|| k.has('KeyD'))  dx += 1;
      if (k.has('ArrowUp')   || k.has('KeyW'))  dy -= 1;
      if (k.has('ArrowDown') || k.has('KeyS'))  dy += 1;

      const bomb = (k.has('Space') || k.has('KeyX')) && !bombUsed.current;
      if (bomb) bombUsed.current = true;

      if (dx !== 0 || dy !== 0 || bomb) {
        onInputRef.current({ dx, dy, bomb });
      } else if (k.has('Space') === false) {
        // send zero to keep player still / cancel movement
        onInputRef.current({ dx: 0, dy: 0, bomb: false });
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Touch controls setter (used by TouchPad component)
  const setTouchDir = useCallback((dx: number, dy: number) => {
    // Inject virtual direction
    if (dx < 0) { keys.current.add('ArrowLeft'); keys.current.delete('ArrowRight'); }
    else if (dx > 0) { keys.current.add('ArrowRight'); keys.current.delete('ArrowLeft'); }
    else { keys.current.delete('ArrowLeft'); keys.current.delete('ArrowRight'); }

    if (dy < 0) { keys.current.add('ArrowUp'); keys.current.delete('ArrowDown'); }
    else if (dy > 0) { keys.current.add('ArrowDown'); keys.current.delete('ArrowUp'); }
    else { keys.current.delete('ArrowUp'); keys.current.delete('ArrowDown'); }
  }, []);

  const pressBomb = useCallback(() => {
    keys.current.add('Space');
    setTimeout(() => { keys.current.delete('Space'); bombUsed.current = false; }, 100);
  }, []);

  return { setTouchDir, pressBomb };
}
