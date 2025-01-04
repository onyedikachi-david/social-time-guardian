import React, { useState, useEffect } from 'react';
import { GameResult } from './GameComponents';

interface EscapeRoomProps {
  onComplete: (result: GameResult) => void;
  onCancel: () => void;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface Puzzle {
  id: string;
  type: 'cipher' | 'pattern' | 'balance';
  question: string;
  hint: string;
  answer: string;
  solved: boolean;
}

const generateCipherText = (text: string, shift: number): string => {
  return text
    .split('')
    .map(char => {
      if (char.match(/[a-z]/i)) {
        const code = char.charCodeAt(0);
        const isUpperCase = code >= 65 && code <= 90;
        const base = isUpperCase ? 65 : 97;
        return String.fromCharCode(((code - base + shift) % 26) + base);
      }
      return char;
    })
    .join('');
};

export const EscapeRoom: React.FC<EscapeRoomProps> = ({
  onComplete,
  onCancel,
  difficulty = 'medium'
}) => {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [message, setMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const numPuzzles = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4;
    const timeLimit = difficulty === 'easy' ? 300 : difficulty === 'medium' ? 240 : 180;
    setTimeLeft(timeLimit);

    const initialPuzzles: Puzzle[] = [
      {
        id: 'cipher',
        type: 'cipher' as const,
        question: generateCipherText('Time is precious', 3),
        hint: 'Each letter is shifted 3 positions in the alphabet',
        answer: 'time is precious',
        solved: false
      },
      {
        id: 'pattern',
        type: 'pattern' as const,
        question: 'Connect the dots to form the symbol of infinity ∞',
        hint: 'Start from the leftmost point and trace a figure-eight pattern',
        answer: '0,1,2,3,2,1,0',
        solved: false
      },
      {
        id: 'balance',
        type: 'balance' as const,
        question: 'Balance your daily activities: 8h work + 8h rest + 8h sleep = ?',
        hint: 'Think about how many hours are in a day',
        answer: '24',
        solved: false
      },
      {
        id: 'final',
        type: 'cipher' as const,
        question: generateCipherText('Productivity is key', 5),
        hint: 'Each letter is shifted 5 positions in the alphabet',
        answer: 'productivity is key',
        solved: false
      }
    ].slice(0, numPuzzles);

    setPuzzles(initialPuzzles);
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

  const handleAnswerSubmit = (puzzle: Puzzle) => {
    if (currentAnswer.toLowerCase() === puzzle.answer.toLowerCase()) {
      setPuzzles(prev =>
        prev.map(p =>
          p.id === puzzle.id ? { ...p, solved: true } : p
        )
      );
      setCurrentAnswer('');
      setMessage('Correct! 🎉');
      setShowHint(false);

      if (puzzles.every(p => p.id === puzzle.id || p.solved)) {
        const score = Math.ceil((timeLeft / (difficulty === 'easy' ? 300 : difficulty === 'medium' ? 240 : 180)) * 100);
        onComplete({
          success: true,
          score,
          timeSpent: 0,
          reward: {
            minutes: Math.ceil(score / 10),
            type: 'bonus'
          }
        });
      }
    } else {
      setMessage('Try again! 🤔');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  return (
    <div className="game-container">
      <div className="game-window w-[800px]">
        <h2 className="game-title">Escape Room Challenge</h2>
        
        <div className="mb-4 flex justify-between items-center">
          <div className="text-white">
            Time Left: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
          <div className="text-white">
            Puzzles Solved: {puzzles.filter(p => p.solved).length}/{puzzles.length}
          </div>
        </div>

        <div className="space-y-8">
          {puzzles.map(puzzle => (
            <div
              key={puzzle.id}
              className={`bg-white/10 rounded-xl p-6 ${
                puzzle.solved ? 'puzzle-solved' : ''
              }`}
            >
              <h3 className="text-white text-xl mb-4">
                {puzzle.type === 'cipher' ? '🔐' : puzzle.type === 'pattern' ? '🎯' : '⚖️'}{' '}
                {puzzle.question}
              </h3>
              
              {!puzzle.solved && (
                <>
                  <div className="flex gap-4 mb-4">
                    <input
                      type="text"
                      value={currentAnswer}
                      onChange={e => setCurrentAnswer(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && handleAnswerSubmit(puzzle)}
                      className="flex-1 bg-white/20 text-white px-4 py-2 rounded-lg"
                      placeholder="Enter your answer..."
                    />
                    <button
                      className="game-button bg-indigo-500 hover:bg-indigo-600"
                      onClick={() => handleAnswerSubmit(puzzle)}
                    >
                      Submit
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <button
                      className="text-indigo-400 hover:text-indigo-300 text-sm"
                      onClick={() => setShowHint(!showHint)}
                    >
                      {showHint ? 'Hide Hint' : 'Show Hint'}
                    </button>
                    {showHint && (
                      <p className="text-indigo-400 text-sm italic">
                        💡 {puzzle.hint}
                      </p>
                    )}
                  </div>
                </>
              )}
              
              {puzzle.solved && (
                <div className="text-green-400">
                  ✨ Puzzle Solved!
                </div>
              )}
            </div>
          ))}
        </div>

        {message && (
          <div className="fixed top-4 right-4 bg-white/10 backdrop-blur-lg rounded-lg px-4 py-2 text-white">
            {message}
          </div>
        )}

        <div className="mt-8 flex justify-end">
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

export default EscapeRoom; 