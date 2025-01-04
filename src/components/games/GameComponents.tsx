import React, { useState, useEffect, useRef } from 'react';

// Shared Types
export interface GameResult {
  success: boolean;
  score: number;
  timeSpent: number;
  reward?: {
    minutes: number;
    type: 'bonus' | 'unlock' | 'multiplier';
  };
}

interface GameProps {
  onComplete: (result: GameResult) => void;
  onCancel: () => void;
  difficulty?: 'easy' | 'medium' | 'hard';
}

// Memory Match Game
export interface MemoryCard {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export const MemoryGame: React.FC<GameProps> = ({ onComplete, onCancel, difficulty = 'medium' }) => {
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const productivityEmojis = ['💻', '📚', '⏰', '✍️', '🎯', '💡', '📊', '🗂️'];
  
  useEffect(() => {
    const gridSize = difficulty === 'easy' ? 8 : difficulty === 'medium' ? 12 : 16;
    const emojis = productivityEmojis.slice(0, gridSize / 2);
    const shuffledCards = [...emojis, ...emojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(shuffledCards);

    // Adjust time limits based on difficulty
    const timeLimit = difficulty === 'easy' ? 120 : difficulty === 'medium' ? 90 : 60;
    const timer = setTimeout(() => {
      if (!cards.every(card => card.isMatched)) {
        onComplete({
          success: false,
          score: 0,
          timeSpent: timeLimit,
          reward: undefined
        });
      }
    }, timeLimit * 1000);

    return () => clearTimeout(timer);
  }, [difficulty, onComplete]);

  const handleCardClick = (id: number) => {
    if (isLocked || flippedCards.length === 2) return;
    if (flippedCards.includes(id)) return;

    const newCards = cards.map(card =>
      card.id === id ? { ...card, isFlipped: true } : card
    );
    setCards(newCards);
    setFlippedCards([...flippedCards, id]);

    if (flippedCards.length === 1) {
      setIsLocked(true);
      setMoves(m => m + 1);

      const [firstId] = flippedCards;
      const firstCard = cards.find(c => c.id === firstId);
      const secondCard = cards.find(c => c.id === id);

      if (firstCard?.emoji === secondCard?.emoji) {
        setCards(cards.map(card =>
          card.id === firstId || card.id === id
            ? { ...card, isMatched: true }
            : card
        ));
        setFlippedCards([]);
        setIsLocked(false);

        if (cards.every(card => card.isMatched)) {
          const score = Math.max(100 - moves * 5, 10);
          onComplete({
            success: true,
            score,
            timeSpent: 0,
            reward: {
              minutes: Math.ceil(score / 20),
              type: 'bonus'
            }
          });
        }
      } else {
        setTimeout(() => {
          setCards(cards.map(card =>
            card.id === firstId || card.id === id
              ? { ...card, isFlipped: false }
              : card
          ));
          setFlippedCards([]);
          setIsLocked(false);
        }, 1000);
      }
    }
  };

  return (
    <div className="game-container">
      <div className="game-window">
        <h2 className="game-title">Memory Match Challenge</h2>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {cards.map(card => (
            <div
              key={card.id}
              className={`memory-card ${card.isFlipped ? 'flipped' : ''}`}
              onClick={() => !card.isMatched && handleCardClick(card.id)}
            >
              <div className="memory-card-front">?</div>
              <div className="memory-card-back">{card.emoji}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-white">Moves: {moves}</span>
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

// Boss Battle Game
export interface BossChallenge {
  type: 'math' | 'focus' | 'sequence';
  question: string;
  answer: string | number;
  timeLimit: number;
}

export const BossBattle: React.FC<GameProps> = ({ onComplete, onCancel, difficulty = 'medium' }) => {
  const [health, setHealth] = useState(100);
  const [currentChallenge, setCurrentChallenge] = useState<BossChallenge | null>(null);
  const [answer, setAnswer] = useState('');
  const [message, setMessage] = useState('');
  const [questionsRemaining, setQuestionsRemaining] = useState(5);
  const [skipsUsed, setSkipsUsed] = useState(0);

  const generateChallenge = (): BossChallenge => {
    const types = ['math', 'focus', 'sequence'] as const;
    const type = types[Math.floor(Math.random() * types.length)];
    
    let challenge: BossChallenge;
    
    switch (type) {
      case 'math': {
        const maxNum = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 50 : 100;
        const num1 = Math.floor(Math.random() * maxNum) + 1;
        const num2 = Math.floor(Math.random() * maxNum) + 1;
        const operators = difficulty === 'easy' ? ['+', '-'] : ['+', '-', '*'];
        const operator = operators[Math.floor(Math.random() * operators.length)];
        
        let answer: number;
        switch (operator) {
          case '+':
            answer = num1 + num2;
            break;
          case '-':
            answer = num1 - num2;
            break;
          case '*':
            answer = num1 * num2;
            break;
          default:
            answer = num1 + num2;
        }

        challenge = {
          type,
          question: `What is ${num1} ${operator} ${num2}?`,
          answer,
          timeLimit: difficulty === 'easy' ? 15 : difficulty === 'medium' ? 10 : 7
        };
        break;
      }
      case 'focus': {
        const requiredClicks = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 5 : 7;
        challenge = {
          type,
          question: 'Click all productivity icons while avoiding social media icons!',
          answer: requiredClicks.toString(),
          timeLimit: difficulty === 'easy' ? 20 : difficulty === 'medium' ? 15 : 10
        };
        break;
      }
      case 'sequence': {
        const sequenceLength = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 5 : 7;
        const sequence = Array.from({ length: sequenceLength }, () => Math.floor(Math.random() * 9) + 1);
        challenge = {
          type,
          question: `Remember this sequence: ${sequence.join(' ')}`,
          answer: sequence.join(''),
          timeLimit: difficulty === 'easy' ? 25 : difficulty === 'medium' ? 20 : 15
        };
        break;
      }
      default: {
        challenge = generateChallenge();
      }
    }
    
    return challenge;
  };

  useEffect(() => {
    if (!currentChallenge) {
      setCurrentChallenge(generateChallenge());
    }
  }, []);

  const handleSkip = () => {
    setSkipsUsed(s => s + 1);
    setQuestionsRemaining(q => q + 2);
    setCurrentChallenge(generateChallenge());
    setAnswer('');
    setMessage(`Skipped! +2 questions added (${skipsUsed + 1} skips used)`);
    
    const healthBar = document.querySelector('.boss-health-bar');
    healthBar?.classList.add('animate-wiggle');
    setTimeout(() => {
      healthBar?.classList.remove('animate-wiggle');
    }, 1000);
  };

  const handleAnswer = () => {
    if (!currentChallenge) return;

    if (answer === currentChallenge.answer.toString()) {
      const damage = Math.max(20 - skipsUsed * 2, 5);
      setHealth(h => Math.max(0, h - damage));
      setMessage(`Great hit! 🎯 (-${damage} HP)`);
      setAnswer('');
      setQuestionsRemaining(q => q - 1);
      
      if (health <= damage || questionsRemaining <= 1) {
        const finalScore = Math.max(100 - skipsUsed * 10, 10);
        onComplete({
          success: true,
          score: finalScore,
          timeSpent: 0,
          reward: {
            minutes: Math.ceil(finalScore / 5),
            type: 'unlock'
          }
        });
      } else {
        setTimeout(() => {
          setCurrentChallenge(generateChallenge());
          setMessage('');
        }, 1000);
      }
    } else {
      setMessage('Miss! Try again! 💨');
      setAnswer('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 shadow-xl w-[800px]">
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
              {skipsUsed > 2 ? '😈' : '👾'}
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Boss Battle Challenge</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white">
              <div className="text-sm opacity-75">Questions Left</div>
              <div className="text-2xl font-bold">{questionsRemaining}</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white">
              <div className="text-sm opacity-75">Skips Used</div>
              <div className="text-2xl font-bold">{skipsUsed}</div>
            </div>
          </div>
          
          <div className="relative mb-8">
            <div className="text-sm text-gray-500 mb-2">Boss Health</div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                style={{ width: `${health}%` }}
              />
            </div>
          </div>
          
          {currentChallenge && (
            <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-100">
              <p className="text-gray-800 text-lg mb-6 font-medium">{currentChallenge.question}</p>
              <div className="flex gap-4 mb-4">
                <input
                  type="text"
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleAnswer()}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your answer..."
                />
                <button
                  className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all flex items-center gap-2"
                  onClick={handleAnswer}
                >
                  <span>⚔️</span> Attack!
                </button>
              </div>
              <button
                className={`w-full px-6 py-2 rounded-lg text-white transition-all flex items-center gap-2 justify-center ${
                  skipsUsed > 2 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-yellow-500 hover:bg-yellow-600'
                }`}
                onClick={handleSkip}
              >
                <span>⏭️</span> Skip Question (+2 questions){skipsUsed > 2 ? ' ⚠️' : ''}
              </button>
            </div>
          )}
          
          {message && (
            <div className="text-center text-gray-800 text-lg mb-6 font-medium animate-bounce">
              {message}
            </div>
          )}
          
          <div className="flex justify-end">
            <button
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all flex items-center gap-2"
              onClick={onCancel}
            >
              <span>🏃‍♂️</span> Retreat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Rhythm Game
export interface RhythmNote {
  timing: number;
  lane: number;
  type: 'work' | 'break';
  icon: string;
}

export const RhythmGame: React.FC<GameProps> = ({ onComplete, onCancel, difficulty = 'medium' }) => {
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [notes, setNotes] = useState<RhythmNote[]>([]);
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pattern: RhythmNote[] = [
      { timing: 1000, lane: 0, type: 'work', icon: '💻' },
      { timing: 2000, lane: 1, type: 'break', icon: '☕' },
      { timing: 3000, lane: 2, type: 'work', icon: '📚' },
      { timing: 4000, lane: 1, type: 'break', icon: '🧘' },
    ];

    setNotes(pattern);
    
    const interval = setInterval(() => {
      setNotes(prev => {
        if (prev.length === 0) {
          onComplete({
            success: true,
            score,
            timeSpent: 0,
            reward: {
              minutes: Math.ceil(score / 100),
              type: 'bonus'
            }
          });
          return prev;
        }
        return prev.slice(1);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [difficulty, score]);

  const handleKeyPress = (lane: number) => {
    if (notes.length === 0) return;

    const [currentNote] = notes;
    if (currentNote.lane === lane) {
      setScore(s => s + 100 * (combo + 1));
      setCombo(c => c + 1);
      createPerfectEffect(lane);
    } else {
      setCombo(0);
      createMissEffect(lane);
    }
  };

  const createPerfectEffect = (lane: number) => {
    if (!gameRef.current) return;
    
    const effect = document.createElement('div');
    effect.className = 'rhythm-perfect';
    effect.style.left = `${lane * 33.33}%`;
    effect.style.bottom = '0';
    effect.style.width = '100px';
    effect.style.height = '100px';
    
    gameRef.current.appendChild(effect);
    setTimeout(() => effect.remove(), 500);
  };

  const createMissEffect = (lane: number) => {
    if (!gameRef.current) return;
    
    const effect = document.createElement('div');
    effect.className = 'rhythm-miss';
    effect.style.left = `${lane * 33.33}%`;
    effect.style.bottom = '0';
    effect.style.width = '100px';
    effect.style.height = '100px';
    
    gameRef.current.appendChild(effect);
    setTimeout(() => effect.remove(), 500);
  };

  return (
    <div className="game-container">
      <div className="game-window w-[600px]" ref={gameRef}>
        <h2 className="game-title">Rhythm Challenge</h2>
        <div className="relative h-[400px] bg-black/50 rounded-xl mb-8">
          {notes.map((note, index) => (
            <div
              key={index}
              className="rhythm-target w-[100px] h-[100px]"
              style={{
                left: `${note.lane * 33.33}%`,
                bottom: `${(index * 100)}px`
              }}
            >
              {note.icon}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[0, 1, 2].map(lane => (
            <button
              key={lane}
              className="game-button bg-indigo-500 hover:bg-indigo-600"
              onClick={() => handleKeyPress(lane)}
            >
              Hit!
            </button>
          ))}
        </div>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-white">Score: {score}</div>
            <div className="text-white">Combo: {combo}x</div>
          </div>
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

// Export all game components
export const Games = {
  MemoryGame,
  BossBattle,
  RhythmGame,
};

export default Games; 