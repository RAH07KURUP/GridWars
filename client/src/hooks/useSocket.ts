'use client';
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '@/store/gameStore';
import { ServerToClientEvents, ClientToServerEvents, PlayerInput } from '@/types/game';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let globalSocket: GameSocket | null = null;

export function useSocket() {
  const socketRef = useRef<GameSocket | null>(null);
  const {
    setConnected, setPlayerId, setRoom,
    setGameState, setGameOver, setError,
    setScreen,
  } = useGameStore();

  useEffect(() => {
    if (globalSocket?.connected) {
      socketRef.current = globalSocket;
      return;
    }

    const socket: GameSocket = io(SERVER_URL, {
      autoConnect: false,
      reconnection: true,
    });
    globalSocket = socket;
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', () => {
      setError('Cannot connect to server. Is it running?');
    });

    socket.on('player:assign', ({ playerId, color }) => {
      setPlayerId(playerId, color);
      setScreen('lobby');
    });

    socket.on('room:update', (room) => {
      setRoom(room);
      if (room.phase === 'lobby') setScreen('lobby');
    });

    socket.on('room:error', (msg) => {
      setError(msg);
    });

    socket.on('game:start', (state) => {
      setGameState(state);
      setScreen('game');
    });

    socket.on('game:state', (state) => {
      setGameState(state);
    });

    socket.on('game:over', (data) => {
      setGameOver(data);
      setScreen('over');
    });

    socket.connect();

    return () => {
      // Don't disconnect on unmount (keep persistent)
    };
  }, [setConnected, setPlayerId, setRoom, setGameState, setGameOver, setError, setScreen]);

  const joinRoom = useCallback((name: string) => {
    socketRef.current?.emit('room:join', name);
  }, []);

  const toggleReady = useCallback(() => {
    socketRef.current?.emit('room:ready');
  }, []);

  const sendInput = useCallback((input: PlayerInput) => {
    socketRef.current?.emit('player:input', input);
  }, []);

  return { joinRoom, toggleReady, sendInput };
}
