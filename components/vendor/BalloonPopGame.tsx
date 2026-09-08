'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wind, Play } from 'lucide-react';

interface BalloonPopGameProps {
  onGameComplete: (points: number) => void
  timerSeconds?: number
  customImages?: string[]
}

type GameState = 'idle' | 'playing' | 'popped' | 'banked' | 'gameover';

export default function BalloonPopGame({
  onGameComplete,
  timerSeconds = 60,
  customImages = [],
}: BalloonPopGameProps) {
  const [round, setRound] = useState(1);
  const [totalPoints, setTotalPoints] = useState(0);
  const [inflation, setInflation] = useState(0);
  const [popThreshold, setPopThreshold] = useState(70);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [roundPoints, setRoundPoints] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  const frameRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  const generateThreshold = () => Math.floor(Math.random() * (92 - 50 + 1)) + 50;

  useEffect(() => {
    if (gameState === 'idle') {
      setPopThreshold(generateThreshold());
      setInflation(0);
      setRoundPoints(0);
      setGameState('playing');
    }
  }, [gameState]);

  const animateInflation = useCallback((time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    setInflation((prev) => {
      // 4 seconds to reach 100% -> 25% per second -> 0.025 per ms
      const nextInflation = prev + (0.025 * deltaTime);
      return nextInflation > 100 ? 100 : nextInflation;
    });

    frameRef.current = requestAnimationFrame(animateInflation);
  }, []);

  useEffect(() => {
    if (isHolding && gameState === 'playing') {
      lastTimeRef.current = performance.now();
      frameRef.current = requestAnimationFrame(animateInflation);
    } else {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      lastTimeRef.current = undefined;
    }

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [isHolding, gameState, animateInflation]);

  useEffect(() => {
    if (gameState === 'playing' && inflation >= popThreshold) {
      setIsHolding(false);
      setGameState('popped');
      setRoundPoints(0);
    }
  }, [inflation, popThreshold, gameState]);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Prevent default text selection/touch actions
    e.preventDefault();
    if (gameState === 'playing') {
      setIsHolding(true);
    }
  };

  const handlePointerUp = () => {
    if (isHolding && gameState === 'playing') {
      setIsHolding(false);
      const points = Math.floor(inflation * 2);
      setRoundPoints(points);
      setTotalPoints((prev) => prev + points);
      setGameState('banked');
    }
  };

  const handlePointerLeave = () => {
    handlePointerUp();
  };

  const nextRound = () => {
    if (round < 3) {
      setRound((r) => r + 1);
      setGameState('idle');
    } else {
      setGameState('gameover');
    }
  };

  useEffect(() => {
    if (gameState === 'gameover') {
      onGameComplete(totalPoints);
    }
  }, [gameState, totalPoints, onGameComplete]);

  const getBalloonColor = () => {
    if (inflation < 30) return 'fill-emerald-500';
    if (inflation < 60) return 'fill-amber-500';
    if (inflation < 80) return 'fill-orange-500';
    return 'fill-rose-500';
  };

  const getBalloonGlow = () => {
    if (inflation < 30) return 'drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]';
    if (inflation < 60) return 'drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]';
    if (inflation < 80) return 'drop-shadow-[0_0_15px_rgba(249,115,22,0.4)]';
    return 'drop-shadow-[0_0_20px_rgba(244,63,94,0.6)]';
  };

  // Current size based on 30% base + 70% dynamic
  const currentScale = 0.3 + (inflation / 100) * 0.7;

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900 border-2 border-slate-700 rounded-xl overflow-hidden flex flex-col p-6 shadow-2xl relative select-none touch-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <Wind className="text-amber-500 w-6 h-6" />
          <h2 className="text-xl font-black tracking-wider text-slate-100 uppercase">Balloon Pop</h2>
        </div>
        <div className="px-3 py-1 bg-slate-800 rounded-full border border-slate-600">
          <span className="text-amber-500 font-bold text-sm">Round {Math.min(round, 3)}/3</span>
        </div>
      </div>

      {/* Score Board */}
      <div className="flex justify-between items-center bg-slate-800 rounded-lg p-4 mb-8 border border-slate-700">
        <div className="flex flex-col">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Score</span>
          <span className="text-3xl font-black text-slate-100">{totalPoints}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">This Round</span>
          <span className={`text-2xl font-bold ${gameState === 'popped' ? 'text-rose-500' : 'text-emerald-400'}`}>
            {gameState === 'playing' ? Math.floor(inflation * 2) : roundPoints}
          </span>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 min-h-[250px] relative flex items-center justify-center mb-8">
        <AnimatePresence>
          {gameState === 'popped' && (
            <motion.div
              initial={{ opacity: 1, scale: 0.5 }}
              animate={{ opacity: 0, scale: 2 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute z-20 flex flex-col items-center justify-center pointer-events-none"
            >
              <div className="text-rose-500 font-black text-4xl tracking-widest uppercase mb-2 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]">
                Popped!
              </div>
              <div className="w-48 h-48 rounded-full border-4 border-rose-500 border-dashed" />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {gameState === 'banked' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute z-20 flex flex-col items-center justify-center pointer-events-none"
            >
              <div className="text-emerald-400 font-black text-4xl tracking-widest uppercase mb-2 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]">
                Banked!
              </div>
              <div className="text-emerald-200 text-xl font-bold">+{roundPoints} pts</div>
            </motion.div>
          )}
        </AnimatePresence>

        {gameState !== 'popped' && gameState !== 'gameover' && (
          <motion.div
            className={`relative w-48 h-64 flex items-center justify-center transition-all duration-75 ${getBalloonGlow()}`}
            animate={{ scale: currentScale }}
            transition={{ type: 'tween', duration: 0.1 }}
          >
            <svg viewBox="0 0 100 140" className="w-full h-full overflow-visible">
              {/* String */}
              <path
                d="M 50 115 C 50 125, 45 130, 48 138"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Balloon Body */}
              <path
                d="M 50 5 C 20 5, 10 35, 10 65 C 10 95, 40 110, 50 115 C 60 110, 90 95, 90 65 C 90 35, 80 5, 50 5 Z"
                className={`${getBalloonColor()} transition-colors duration-300`}
              />
              {/* Shine/Highlight */}
              <path
                d="M 30 25 C 25 40, 25 55, 30 70"
                fill="none"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Tie */}
              <path
                d="M 45 115 L 55 115 L 52 120 L 48 120 Z"
                className={`${getBalloonColor()} transition-colors duration-300`}
              />
            </svg>
          </motion.div>
        )}
      </div>

      {/* Danger Meter */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-slate-400 uppercase">Danger Zone</span>
          <span className="text-xs font-bold text-slate-400">{Math.floor(inflation)}%</span>
        </div>
        <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-600 transition-all duration-75"
            style={{ width: `${inflation}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="mt-auto">
        {gameState === 'playing' || gameState === 'idle' ? (
          <button
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-wider transition-all select-none touch-none ${
              isHolding 
                ? 'bg-amber-600 text-amber-50 scale-95 shadow-inner' 
                : 'bg-amber-500 text-slate-900 hover:bg-amber-400 shadow-[0_4px_14px_0_rgba(245,158,11,0.39)]'
            }`}
            style={{ touchAction: 'none' }}
          >
            {isHolding ? 'Inflating...' : 'Hold to Inflate'}
          </button>
        ) : gameState !== 'gameover' ? (
          <button
            onClick={nextRound}
            className="w-full py-4 rounded-xl font-black text-lg uppercase tracking-wider bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
          >
            {round < 3 ? 'Next Round' : 'Finish Game'} <Play className="w-5 h-5" fill="currentColor" />
          </button>
        ) : (
          <div className="w-full py-4 rounded-xl font-black text-lg uppercase tracking-wider bg-slate-800 text-slate-400 text-center border border-slate-700">
            Game Over
          </div>
        )}
      </div>
    </div>
  );
}
