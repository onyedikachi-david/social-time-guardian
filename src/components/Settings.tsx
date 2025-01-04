import React, { useState, useEffect, useRef } from 'react';
import { Clock, Bell, Save, Plus, Trash2, RotateCcw, Edit2, Award, Zap } from 'lucide-react';
import { SettingsProps } from '../types/components';
import { storageService } from '../services/storage';
import GameManager from './games/GameManager';
import { GameResult } from './games/GameComponents';

interface NotificationSettings {
  enabled: boolean;
  threshold: number;
}

interface SaveSettings {
  timeLimits: Array<{
    site: string;
    dailyLimit: number;
    weeklyLimit: number;
  }>;
  notifications: NotificationSettings;
}

interface TimeEditModal {
  site: string;
  currentTime: number;
  isOpen: boolean;
}

interface Challenge {
  question: string;
  answer: string;
  explanation?: string;
}

interface ChallengeType {
  type: string;
  generate: () => Challenge[];
}

const POINTS_FOR_REDUCING_LIMIT = 500;
const REQUIRED_STREAK_DAYS = 21;

const REMOVAL_CHALLENGES: ChallengeType[] = [
  {
    type: 'quantitative',
    generate: () => {
      const challenges = [];
      
      // Time value calculation
      const hoursPerDay = Math.floor(Math.random() * 4) + 2; // 2-5 hours
      const daysPerWeek = Math.floor(Math.random() * 3) + 5; // 5-7 days
      challenges.push({
        question: `If you spend ${hoursPerDay} hours every day for ${daysPerWeek} days a week on social media, how many hours per year of your life are you spending? (52 weeks/year)`,
        answer: String(hoursPerDay * daysPerWeek * 52),
        explanation: "This represents almost two months of waking hours per year!"
      });

      // Opportunity cost
      const hourlyWage = Math.floor(Math.random() * 30) + 20; // $20-50
      challenges.push({
        question: `If your time is worth $${hourlyWage}/hour, how much money could you have earned in a year with those hours?`,
        answer: String(hoursPerDay * daysPerWeek * 52 * hourlyWage),
        explanation: "Think about what else you could do with this money!"
      });

      // Productivity impact
      const taskTime = Math.floor(Math.random() * 20) + 10; // 10-30 minutes
      challenges.push({
        question: `If it takes ${taskTime} minutes to regain focus after checking social media, and you check 8 times a day, how many hours of productivity are lost per week?`,
        answer: String(Math.round((taskTime * 8 * 7) / 60)),
        explanation: "Context switching has a huge hidden cost!"
      });

      return challenges;
    }
  },
  {
    type: 'qualitative',
    generate: () => [
      {
        question: "List three specific skills you could develop with the time you're spending on social media:",
        answer: "custom",
        explanation: "Make sure your answer includes three concrete skills, not vague goals."
      },
      {
        question: "What meaningful real-world relationships or activities have you neglected due to social media time? Be specific.",
        answer: "custom",
        explanation: "Consider the quality of in-person interactions vs. online ones."
      },
      {
        question: "Write a short paragraph about how your current social media usage aligns with your long-term life goals:",
        answer: "custom",
        explanation: "Reflect on whether your time investment matches your priorities."
      }
    ]
  },
  {
    type: 'commitment',
    generate: () => [
      {
        question: "Type this commitment: 'I understand that by removing this limit, I risk falling back into unproductive habits. I take full responsibility for managing my time wisely.'",
        answer: "I understand that by removing this limit, I risk falling back into unproductive habits. I take full responsibility for managing my time wisely.",
        explanation: "This is a binding commitment to self-control."
      }
    ]
  }
];

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
};

const CONFETTI_COLORS = [
  '#FF69B4', // Pink
  '#4CAF50', // Green
  '#FF9800', // Orange
  '#2196F3', // Blue
  '#9C27B0', // Purple
  '#FFEB3B', // Yellow
  '#E91E63', // Deep Pink
  '#00BCD4', // Cyan
  '#FF5722', // Deep Orange
  '#8BC34A', // Light Green
];

const CONFETTI_SHAPES = ['square', 'triangle', 'circle', 'star', 'heart'];
const CONFETTI_ANIMATIONS = [
  { name: 'confetti-slow', duration: '4.5s' },
  { name: 'confetti-medium', duration: '3.5s' },
  { name: 'confetti-fast', duration: '2.5s' }
];

const createConfetti = () => {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);

  // Create multiple confetti pieces
  for (let i = 0; i < 150; i++) {
    const confetti = document.createElement('div');
    
    // Random properties
    const shape = CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)];
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const animation = CONFETTI_ANIMATIONS[Math.floor(Math.random() * CONFETTI_ANIMATIONS.length)];
    const size = Math.random() * 10 + 5; // 5-15px
    const startX = Math.random() * 100; // 0-100%
    const startDelay = Math.random() * 3; // 0-3s
    
    confetti.className = `confetti ${shape}`;
    confetti.style.cssText = `
      --x: ${startX}%;
      --color: ${color};
      --fall-animation: ${animation.name};
      --fall-duration: ${animation.duration};
      width: ${size}px;
      height: ${size}px;
      animation-delay: ${startDelay}s;
      opacity: ${0.5 + Math.random() * 0.5}; // 50-100% opacity
    `;
    
    container.appendChild(confetti);
  }

  // Remove container after longest animation + delays
  setTimeout(() => container.remove(), 8000);
};

const Settings: React.FC<SettingsProps> = ({ data, onSave }) => {
  const [timeLimits, setTimeLimits] = useState<Array<{ site: string; dailyLimit: number; weeklyLimit: number; }>>(
    data?.settings.timeLimits || []
  );
  const [notifications, setNotifications] = useState<NotificationSettings>(
    data?.settings.notifications || { enabled: false, threshold: 5 }
  );
  const [newSite, setNewSite] = useState('');
  const [newLimit, setNewLimit] = useState('60');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [deleteAttempts, setDeleteAttempts] = useState<{ [key: string]: number }>({});
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
  const [timeEditModal, setTimeEditModal] = useState<TimeEditModal>({ site: '', currentTime: 0, isOpen: false });
  const [showGame, setShowGame] = useState(false);
  const [gameType, setGameType] = useState<'boss' | 'escape' | null>(null);
  const [pendingLimitChange, setPendingLimitChange] = useState<{ site: string; value: string; type: 'daily' | 'weekly' } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Subscribe to save state changes
    storageService.onSaveStateChange((status) => {
      setSaveStatus(status);
      if (status === 'success' || status === 'error') {
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    });

    if (data?.settings) {
      setTimeLimits(data.settings.timeLimits);
      if (typeof data.settings.notifications === 'object') {
        setNotifications(data.settings.notifications as NotificationSettings);
      }
    }
  }, [data]);

  const handleSave = async () => {
    try {
      setSaveStatus('saving');
      
      const settings: SaveSettings = {
        timeLimits,
        notifications
      };
      
      // First update the storage directly
      await storageService.updateSettings({
        timeLimits,
        notifications
      });
      
      // Then notify any parent components if needed
      if (onSave) {
        await onSave(settings);
      }
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
    }
  };

  const handleAddLimit = () => {
    if (!newSite || !newLimit) return;
    
    const minutes = parseInt(newLimit);
    if (isNaN(minutes) || minutes <= 0) return;

    setTimeLimits([
      ...timeLimits,
      {
        site: newSite.toLowerCase(),
        dailyLimit: minutes * 60,
        weeklyLimit: minutes * 60 * 7
      }
    ]);

    setNewSite('');
    setNewLimit('60');
  };

  const handleRemoveLimit = (site: string) => {
    const attempts = deleteAttempts[site] || 0;
    
    if (attempts < 2) {
      setDeleteAttempts({
        ...deleteAttempts,
        [site]: attempts + 1
      });
      setShowConfirmDelete(site);
      return;
    }
    
    // On third attempt, show the multi-step challenge
    if (attempts === 2) {
      const allChallenges = REMOVAL_CHALLENGES.flatMap(type => type.generate());
      let currentChallengeIndex = 0;
      
      const showChallenge = (challenge: Challenge, isLast: boolean) => {
        const dialog = document.createElement('div');
        dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        dialog.innerHTML = `
          <div class="bg-white rounded-2xl p-6 w-[600px] space-y-4 animate-wiggle">
            <h3 class="text-xl font-semibold text-gray-800">🤔 Removal Challenge (${currentChallengeIndex + 1}/${allChallenges.length})</h3>
            <p class="text-gray-600">Think carefully about your decision:</p>
            <div class="bg-indigo-50 p-4 rounded-lg text-indigo-700 font-medium">
              ${challenge.question}
            </div>
            ${challenge.answer === 'custom' ? 
              `<textarea class="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent h-32" placeholder="Type your thoughtful response..."></textarea>` :
              `<input type="text" class="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Your answer..." />`
            }
            <div class="flex justify-between items-center">
              <button class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg cancel-btn">Give up</button>
              <div class="flex gap-3">
                ${currentChallengeIndex > 0 ? 
                  `<button class="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg prev-btn">Previous</button>` : 
                  ''
                }
                <button class="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 next-btn">
                  ${isLast ? 'Complete' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        `;
        
        document.body.appendChild(dialog);
        
        const input = dialog.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement;
        const nextBtn = dialog.querySelector('.next-btn');
        const prevBtn = dialog.querySelector('.prev-btn');
        const cancelBtn = dialog.querySelector('.cancel-btn');
        
        const handleNext = () => {
          const userAnswer = input?.value?.trim().toLowerCase() || '';
          
          if (challenge.answer === 'custom') {
            // For qualitative questions, check minimum length and content
            if (userAnswer.length < 50) {
              input?.classList.add('bounce-shake');
              setTimeout(() => input?.classList.remove('bounce-shake'), 500);
              const errorMsg = document.createElement('p');
              errorMsg.className = 'text-red-500 text-sm mt-2';
              errorMsg.textContent = 'Please provide a more thoughtful response (at least 50 characters).';
              input?.parentElement?.appendChild(errorMsg);
              setTimeout(() => errorMsg.remove(), 2000);
              return;
            }
          } else if (userAnswer !== challenge.answer.toLowerCase()) {
            input?.classList.add('bounce-shake');
            setTimeout(() => input?.classList.remove('bounce-shake'), 500);
            const errorMsg = document.createElement('p');
            errorMsg.className = 'text-red-500 text-sm mt-2';
            errorMsg.textContent = 'Incorrect answer! Try again.';
            input?.parentElement?.appendChild(errorMsg);
            setTimeout(() => errorMsg.remove(), 2000);
            return;
          }

          // Show explanation if available
          if (challenge.explanation) {
            const explanationDialog = document.createElement('div');
            explanationDialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[51]';
            explanationDialog.innerHTML = `
              <div class="bg-white rounded-2xl p-6 w-96 space-y-4">
                <h3 class="text-xl font-semibold text-gray-800">💡 Think About This</h3>
                <p class="text-gray-600">${challenge.explanation}</p>
                <div class="flex justify-end">
                  <button class="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">Continue</button>
                </div>
              </div>
            `;
            document.body.appendChild(explanationDialog);
            
            explanationDialog.querySelector('button')?.addEventListener('click', () => {
              explanationDialog.remove();
              dialog.remove();
              if (isLast) {
                handleCompletion();
              } else {
                currentChallengeIndex++;
                showChallenge(allChallenges[currentChallengeIndex], currentChallengeIndex === allChallenges.length - 1);
              }
            });
          } else {
            dialog.remove();
            if (isLast) {
              handleCompletion();
            } else {
              currentChallengeIndex++;
              showChallenge(allChallenges[currentChallengeIndex], currentChallengeIndex === allChallenges.length - 1);
            }
          }
        };

        const handlePrev = () => {
          dialog.remove();
          currentChallengeIndex--;
          showChallenge(allChallenges[currentChallengeIndex], false);
        };
        
        nextBtn?.addEventListener('click', handleNext);
        prevBtn?.addEventListener('click', handlePrev);
        cancelBtn?.addEventListener('click', () => {
          dialog.remove();
          
          // Show celebration dialog
          const celebrationDialog = document.createElement('div');
          celebrationDialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
          celebrationDialog.innerHTML = `
            <div class="bg-white rounded-2xl p-6 w-96 space-y-4 text-center">
              <h3 class="text-2xl font-bold text-gray-800">🎉 Wise Choice!</h3>
              <p class="text-gray-600">
                You've made a great decision to keep your time limit! Your future self will thank you.
              </p>
              <div class="flex justify-center">
                <button class="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all transform hover:scale-105">
                  Continue Being Awesome
                </button>
              </div>
            </div>
          `;
          
          document.body.appendChild(celebrationDialog);
          
          // Start confetti
          createConfetti();
          
          // Remove celebration dialog after a delay
          celebrationDialog.querySelector('button')?.addEventListener('click', () => {
            celebrationDialog.remove();
          });
        });
        
        input?.addEventListener('keypress', (e: Event) => {
          const keyEvent = e as KeyboardEvent;
          if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
            e.preventDefault();
            handleNext();
          }
        });
      };

      const handleCompletion = () => {
        setTimeLimits(timeLimits.filter(limit => limit.site !== site));
        setDeleteAttempts({
          ...deleteAttempts,
          [site]: 0
        });
        setShowConfirmDelete(null);
      };

      // Start with the first challenge
      showChallenge(allChallenges[0], allChallenges.length === 1);
      return;
    }
  };

  const handleLimitChange = async (site: string, value: string, type: 'daily' | 'weekly') => {
    const minutes = parseInt(value);
    if (isNaN(minutes) || minutes < 0) return;

    const currentLimit = timeLimits.find(limit => limit.site === site);
    if (!currentLimit) return;

    const currentMinutes = Math.round(currentLimit[type === 'daily' ? 'dailyLimit' : 'weeklyLimit'] / 60);
    
    // If trying to increase the limit, check streak and show games
    if (minutes > currentMinutes) {
      // Store the pending change and show game
      setPendingLimitChange({ site, value, type });
      setGameType(Math.random() > 0.5 ? 'boss' : 'escape'); // Randomly choose between boss battle and escape room
      setShowGame(true);
      return;
    }

    // Reward points for reducing time limit
    if (minutes < currentMinutes && data) {
      const gameStats = data.gameStats || { points: 0, level: 1, achievements: [], streaks: {} };
      gameStats.points += POINTS_FOR_REDUCING_LIMIT;
      
      // Check for achievements
      if (!gameStats.achievements.some(achievement => achievement.id === 'time_reducer')) {
        gameStats.achievements.push({
          id: 'time_reducer',
          name: 'Time Tamer',
          description: 'Reduced a time limit for the first time',
          unlockedAt: new Date().toISOString(),
          icon: '⏰'
        });
      }
      
      // Update storage with all required fields
      await storageService.setData({
        settings: {
          ...data.settings,
          blockingEnabled: true,
          theme: 'light'
        },
        timeTracking: data.timeTracking,
        gameStats,
        lastSync: new Date().toISOString(),
        timeoutState: {}
      });
    }

    setTimeLimits(timeLimits.map(limit => {
      if (limit.site === site) {
        return {
          ...limit,
          [type === 'daily' ? 'dailyLimit' : 'weeklyLimit']: minutes * 60
        };
      }
      return limit;
    }));
  };

  const handleGameComplete = (result: GameResult) => {
    if (result.success && pendingLimitChange) {
      const { site, value, type } = pendingLimitChange;
      
      // Apply the limit change
      setTimeLimits(timeLimits.map(limit => {
        if (limit.site === site) {
          return {
            ...limit,
            [type === 'daily' ? 'dailyLimit' : 'weeklyLimit']: parseInt(value) * 60
          };
        }
        return limit;
      }));

      // Add bonus time from game reward if any
      if (result.reward?.minutes) {
        const bonusSeconds = result.reward.minutes * 60;
        handleUpdateTime(site, bonusSeconds);
      }
    }
    
    setShowGame(false);
    setGameType(null);
    setPendingLimitChange(null);
  };

  const handleGameCancel = () => {
    setShowGame(false);
    setGameType(null);
    setPendingLimitChange(null);
  };

  const getSiteName = (domain: string): string => {
    const siteMap: { [key: string]: string } = {
      'x.com': 'Twitter/X',
      'facebook.com': 'Facebook',
      'instagram.com': 'Instagram',
      'tiktok.com': 'TikTok',
      'linkedin.com': 'LinkedIn'
    };
    return siteMap[domain] || domain;
  };

  const getSaveStatusColor = (): string => {
    switch (saveStatus) {
      case 'saving': return 'text-blue-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSaveStatusText = (): string => {
    switch (saveStatus) {
      case 'saving': return 'Saving...';
      case 'success': return 'Saved!';
      case 'error': return 'Failed to save';
      default: return '';
    }
  };

  const handleResetTime = async (site: string) => {
    try {
      setSaveStatus('saving');
      const data = await storageService.getData();
      
      // Find and reset the time tracking for today
      const today = new Date().toISOString().split('T')[0];
      const updatedTimeTracking = data.timeTracking.map(record => {
        if (record.site === site && record.date === today) {
          return { ...record, timeSpent: 0 };
        }
        return record;
      });

      // Update storage with new timeoutState, excluding the site's timeout
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [site]: _, ...restTimeoutState } = data.timeoutState || {};
      
      await storageService.setData({
        ...data,
        timeTracking: updatedTimeTracking,
        timeoutState: restTimeoutState
      });

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to reset time:', error);
      setSaveStatus('error');
    }
  };

  const handleUpdateTime = async (site: string, newTimeInSeconds: number) => {
    try {
      setSaveStatus('saving');
      const data = await storageService.getData();
      
      // Find and update the time tracking for today
      const today = new Date().toISOString().split('T')[0];
      const updatedTimeTracking = data.timeTracking.map(record => {
        if (record.site === site && record.date === today) {
          return { ...record, timeSpent: newTimeInSeconds };
        }
        return record;
      });

      // Update storage
      await storageService.setData({
        ...data,
        timeTracking: updatedTimeTracking
      });

      setTimeEditModal({ site: '', currentTime: 0, isOpen: false });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to update time:', error);
      setSaveStatus('error');
    }
  };

  return (
    <div className="space-y-8">
      {/* Game Stats Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Your Progress</h2>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl text-white">
            <div className="text-sm opacity-75">Points</div>
            <div className="text-2xl font-bold">{data?.gameStats?.points || 0}</div>
          </div>
          
          <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl text-white">
            <div className="text-sm opacity-75">Level</div>
            <div className="text-2xl font-bold">{data?.gameStats?.level || 1}</div>
          </div>
          
          <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white">
            <div className="text-sm opacity-75">Achievements</div>
            <div className="text-2xl font-bold">{data?.gameStats?.achievements?.length || 0}</div>
          </div>
        </div>
        
        {/* Streaks */}
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Your Streaks</h3>
          <div className="space-y-4">
            {Object.entries(data?.gameStats?.streaks || {}).map(([site, streak]) => (
              <div key={site} className="flex items-center gap-4">
                <Zap className="w-5 h-5 text-yellow-500" />
                <div>
                  <div className="font-medium">{getSiteName(site)}</div>
                  <div className="text-sm text-gray-500">
                    {streak.currentStreak} day streak (Best: {streak.longestStreak})
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm py-4 px-6 -mx-6 border-b border-gray-100 flex items-center justify-end gap-4">
        <span className={`text-sm font-medium ${getSaveStatusColor()} transition-colors`}>
          {getSaveStatusText()}
        </span>
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className={`
            px-6 py-2 rounded-lg flex items-center gap-2 transition-all
            ${saveStatus === 'saving'
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-500 text-white hover:bg-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
            }
          `}
        >
          <Save className="w-4 h-4" />
          {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Time Limits Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Time Limits</h2>
        </div>

        <div className="space-y-6">
          {/* Add New Limit */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website Domain
              </label>
              <input
                type="text"
                value={newSite}
                onChange={(e) => setNewSite(e.target.value)}
                placeholder="e.g., x.com"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minutes/Day
              </label>
              <input
                type="number"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                min="1"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddLimit}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {/* Existing Limits */}
          <div className="space-y-4">
            {timeLimits.map((limit) => {
              const todayUsage = data?.timeTracking.find(
                record => record.site === limit.site && 
                record.date === new Date().toISOString().split('T')[0]
              )?.timeSpent || 0;

              return (
                <div
                  key={limit.site}
                  className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all group"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{getSiteName(limit.site)}</h3>
                    <p className="text-sm text-gray-500">{limit.site}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-500">Today's usage: {formatTime(todayUsage)}</span>
                      <button
                        onClick={() => handleResetTime(limit.site)}
                        className="p-1 text-gray-400 hover:text-indigo-500 focus:outline-none opacity-0 group-hover:opacity-100 transition-all"
                        title="Reset time"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setTimeEditModal({ site: limit.site, currentTime: todayUsage, isOpen: true })}
                        className="p-1 text-gray-400 hover:text-indigo-500 focus:outline-none opacity-0 group-hover:opacity-100 transition-all"
                        title="Edit time"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="w-32">
                    <label className="block text-xs text-gray-500 mb-1">Daily (min)</label>
                    <input
                      ref={inputRef}
                      type="number"
                      value={Math.round(limit.dailyLimit / 60)}
                      onChange={(e) => handleLimitChange(limit.site, e.target.value, 'daily')}
                      min="1"
                      className={`
                        w-full px-3 py-1.5 rounded-lg border border-gray-200 
                        focus:ring-2 focus:ring-indigo-500 focus:border-transparent 
                        transition-all text-sm relative
                      `}
                      style={{
                        transition: 'transform 0.3s ease-out'
                      }}
                      title={`Maintain a ${REQUIRED_STREAK_DAYS}-day streak to increase time limit`}
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs text-gray-500 mb-1">Weekly (min)</label>
                    <input
                      type="number"
                      value={Math.round(limit.weeklyLimit / 60)}
                      onChange={(e) => handleLimitChange(limit.site, e.target.value, 'weekly')}
                      min="1"
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                    />
                  </div>
                  {showConfirmDelete === limit.site ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowConfirmDelete(null)}
                        className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleRemoveLimit(limit.site)}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                      >
                        Confirm ({3 - (deleteAttempts[limit.site] || 0)} tries left)
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRemoveLimit(limit.site)}
                      className="p-2 text-gray-400 hover:text-red-500 focus:outline-none opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              );
            })}

            {timeLimits.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No time limits set. Add your first limit above.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
            <Bell className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Notifications</h2>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Enable Notifications</h3>
              <p className="text-sm text-gray-500">
                Receive alerts when you're approaching your time limits
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.enabled}
                onChange={(e) => setNotifications({ ...notifications, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {notifications.enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notification Threshold (% of limit)
              </label>
              <input
                type="range"
                min="50"
                max="90"
                step="5"
                value={notifications.threshold}
                onChange={(e) => setNotifications({ ...notifications, threshold: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>50%</span>
                <span className="text-blue-600 font-medium">{notifications.threshold}%</span>
                <span>90%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Time Edit Modal */}
      {timeEditModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Edit Time</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Time (minutes)
                </label>
                <input
                  type="number"
                  value={Math.round(timeEditModal.currentTime / 60)}
                  onChange={(e) => setTimeEditModal({
                    ...timeEditModal,
                    currentTime: parseInt(e.target.value) * 60
                  })}
                  min="0"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setTimeEditModal({ site: '', currentTime: 0, isOpen: false })}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateTime(timeEditModal.site, timeEditModal.currentTime)}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game overlay */}
      {showGame && gameType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <GameManager
            onComplete={handleGameComplete}
            onCancel={handleGameCancel}
            initialGame={gameType}
            difficulty="medium"
          />
        </div>
      )}
    </div>
  );
};



export default Settings;