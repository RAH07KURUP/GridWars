'use client';
import { useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useGameStore } from '@/store/gameStore';
import JoinScreen from '@/components/JoinScreen';
import LobbyScreen from '@/components/LobbyScreen';
import GameScreen from '@/components/GameScreen';

export default function Home() {
  const { joinRoom, toggleReady, sendInput } = useSocket();
  const { screen, connected, error, room, playerId, gameOver } = useGameStore();

  return (
    <main>
      {screen === 'join' && (
        <JoinScreen
          onJoin={joinRoom}
          error={error}
          connected={connected}
        />
      )}
      {screen === 'lobby' && room && (
        <LobbyScreen
          room={room}
          myPlayerId={playerId}
          onToggleReady={toggleReady}
        />
      )}
      {(screen === 'game' || screen === 'over') && (
        <GameScreen onSendInput={sendInput} />
      )}
    </main>
  );
}
