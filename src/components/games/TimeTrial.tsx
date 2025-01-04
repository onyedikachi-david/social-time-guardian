import React, { useState, useEffect, useRef } from 'react';
import { GameResult } from './GameComponents';

interface TimeTrialProps {
  onComplete: (result: GameResult) => void;
  onCancel: () => void;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface Task {
  id: string;
  type: 'read' | 'solve' | 'organize';
  content: string;
  completed: boolean;
}

interface Distraction {
  id: string;
  type: 'notification' | 'message' | 'like';
  position: { x: number; y: number };
}

export const TimeTrial: React.FC<TimeTrialProps> = ({
  onComplete,
  onCancel,
  difficulty = 'medium'
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [distractions, setDistractions] = useState<Distraction[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeLimit = difficulty === 'easy' ? 180 : difficulty === 'medium' ? 120 : 90;
    setTimeLeft(timeLimit);

    const initialTasks: Task[] = [
      {
        id: 'read1',
        type: 'read',
        content: 'Read this paragraph about time management and productivity',
        completed: false
      },
      {
        id: 'solve1',
        type: 'solve',
        content: 'Solve this puzzle: What comes once in a minute, twice in a moment, but never in a thousand years?',
        completed: false
      },
      {
        id: 'organize1',
        type: 'organize',
        content: 'Organize these items by priority: Sleep, Work, Exercise, Social Media',
        completed: false
      }
    ];

    setTasks(initialTasks);
  }, [difficulty]);

  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete({
        success: false,
        score: 0,
        timeSpent: 0,
        reward: undefined
      });
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(t => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onComplete]);

  useEffect(() => {
    const distractionInterval = difficulty === 'easy' ? 3000 : difficulty === 'medium' ? 2000 : 1000;
    
    const spawnDistraction = () => {
      if (!gameRef.current) return;
      
      const types = ['notification', 'message', 'like'] as const;
      const type = types[Math.floor(Math.random() * types.length)];
      
      const { width, height } = gameRef.current.getBoundingClientRect();
      const position = {
        x: Math.random() * (width - 50),
        y: Math.random() * (height - 50)
      };

      setDistractions(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          type,
          position
        }
      ]);

      setTimeout(() => {
        setDistractions(prev => prev.slice(1));
      }, 2000);
    };

    const interval = setInterval(spawnDistraction, distractionInterval);

    return () => clearInterval(interval);
  }, [difficulty]);

  const handleTaskComplete = (taskId: string) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId ? { ...task, completed: true } : task
      )
    );

    setScore(s => s + 100 * (combo + 1));
    setCombo(c => c + 1);

    if (tasks.every(task => task.id === taskId || task.completed)) {
      const finalScore = score + 100 * (combo + 1);
      onComplete({
        success: true,
        score: finalScore,
        timeSpent: 0,
        reward: {
          minutes: Math.ceil(finalScore / 100),
          type: 'bonus'
        }
      });
    }
  };

  const handleDistraction = () => {
    setCombo(0);
    setScore(s => Math.max(0, s - 50));
  };

  return (
    <div className="game-container">
      <div className="game-window w-[800px]" ref={gameRef}>
        <h2 className="game-title">Time Trial Challenge</h2>

        <div className="time-trial-container h-[500px] relative mb-8">
          <div
            className={`time-trial-timer ${timeLeft < 10 ? 'warning' : ''}`}
            style={{ width: `${(timeLeft / (difficulty === 'easy' ? 180 : difficulty === 'medium' ? 120 : 90)) * 100}%` }}
          />

          <div className="absolute top-4 right-4 space-y-2">
            <div className="text-white">Score: {score}</div>
            <div className="text-white">Combo: {combo}x</div>
            <div className="text-white">
              Time: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          </div>

          <div className="p-8 space-y-8">
            {tasks.map(task => (
              <div
                key={task.id}
                className={`bg-white/10 rounded-xl p-6 transition-all duration-300 ${
                  task.completed ? 'opacity-50' : 'hover:bg-white/20'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">
                    {task.type === 'read' ? '📚' : task.type === 'solve' ? '🧩' : '📋'}
                  </span>
                  <div className="flex-1">
                    <p className="text-white text-lg">{task.content}</p>
                  </div>
                  {!task.completed && (
                    <button
                      className="game-button bg-indigo-500 hover:bg-indigo-600"
                      onClick={() => handleTaskComplete(task.id)}
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {distractions.map(distraction => (
            <button
              key={distraction.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 text-4xl cursor-pointer hover:scale-110 transition-transform"
              style={{
                left: distraction.position.x,
                top: distraction.position.y
              }}
              onClick={handleDistraction}
            >
              {distraction.type === 'notification' ? '🔔' : distraction.type === 'message' ? '💬' : '❤️'}
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            className="game-button bg-red-500 hover:bg-red-600"
            onClick={onCancel}
          >
            Give Up
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimeTrial; 