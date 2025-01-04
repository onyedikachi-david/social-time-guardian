import React, { useState } from 'react';
import { MemoryGame, BossBattle, RhythmGame, GameResult } from './GameComponents';
import { EscapeRoom } from './EscapeRoom';
import { TimeTrial } from './TimeTrial';

interface GameManagerProps {
  onComplete: (result: GameResult) => void;
  onCancel: () => void;
  initialGame?: GameType;
  difficulty?: 'easy' | 'medium' | 'hard';
}

type GameType = 'memory' | 'boss' | 'rhythm' | 'escape' | 'trial';

const GAME_INFO = {
  memory: {
    title: 'Memory Match',
    description: 'Match productivity-themed cards to earn extra time',
    icon: '🎴'
  },
  boss: {
    title: 'Boss Battle',
    description: 'Defeat the Procrastination Monster with quick thinking',
    icon: '👾'
  },
  rhythm: {
    title: 'Productivity Rhythm',
    description: 'Keep the beat of productivity going',
    icon: '🎵'
  },
  escape: {
    title: 'Time Management Escape Room',
    description: 'Solve puzzles to unlock more time',
    icon: '🔐'
  },
  trial: {
    title: 'Focus Time Trial',
    description: 'Complete tasks while avoiding distractions',
    icon: '⏱️'
  }
} as const;

export const GameManager: React.FC<GameManagerProps> = ({
  onComplete,
  onCancel,
  initialGame,
  difficulty = 'medium'
}) => {
  const [selectedGame, setSelectedGame] = useState<GameType | null>(initialGame || null);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleGameComplete = (result: GameResult) => {
    if (!result.success) {
      setShowConfetti(true);
      setTimeout(() => {
        setShowConfetti(false);
        setSelectedGame(null);
      }, 3000);
    }
    onComplete(result);
  };

  const handleCancel = () => {
    setShowConfetti(true);
    setTimeout(() => {
      setShowConfetti(false);
      onCancel();
    }, 3000);
  };

  if (!selectedGame) {
    return (
      <div className="game-container">
        <div className="game-window w-[800px]">
          <h2 className="game-title">Choose Your Challenge</h2>
          <div className="grid grid-cols-2 gap-6 mb-8">
            {(Object.keys(GAME_INFO) as GameType[]).map(game => (
              <button
                key={game}
                className="bg-white/10 rounded-xl p-6 text-left hover:bg-white/20 transition-colors"
                onClick={() => setSelectedGame(game)}
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{GAME_INFO[game].icon}</span>
                  <div>
                    <h3 className="text-white text-xl font-semibold">
                      {GAME_INFO[game].title}
                    </h3>
                    <p className="text-white/70">
                      {GAME_INFO[game].description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              className="game-button bg-red-500 hover:bg-red-600"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  const gameProps = {
    onComplete: handleGameComplete,
    onCancel: handleCancel,
    difficulty
  };

  return (
    <>
      {selectedGame === 'memory' && <MemoryGame {...gameProps} />}
      {selectedGame === 'boss' && <BossBattle {...gameProps} />}
      {selectedGame === 'rhythm' && <RhythmGame {...gameProps} />}
      {selectedGame === 'escape' && <EscapeRoom {...gameProps} />}
      {selectedGame === 'trial' && <TimeTrial {...gameProps} />}
      
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-20px`,
                animation: `confetti-fall ${2 + Math.random() * 3}s linear forwards, confetti-sway ${1 + Math.random() * 2}s ease-in-out infinite alternate`,
                backgroundColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
                width: `${5 + Math.random() * 5}px`,
                height: `${10 + Math.random() * 10}px`,
                transform: `rotate(${Math.random() * 360}deg)`
              }}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default GameManager; 