export interface SiteTimeLimit {
  site: string;
  dailyLimit: number; // in seconds
  weeklyLimit: number; // in seconds
}

export interface TimeTracking {
  site: string;
  timeSpent: number; // in seconds
  date: string;
}

export interface UserSettings {
  timeLimits: SiteTimeLimit[];
  notifications: {
    enabled: boolean;
    threshold: number;
  };
  blockingEnabled: boolean;
  theme: 'light' | 'dark';
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedAt?: string;
  icon: string;
}

export interface Streak {
  currentStreak: number;
  longestStreak: number;
  lastMaintained: string;
}

export interface GameStats {
  points: number;
  level: number;
  achievements: Achievement[];
  streaks: { [site: string]: Streak };
}

export interface StorageData {
  settings: UserSettings;
  timeTracking: TimeTracking[];
  lastSync: string;
  timeoutState: {
    [domain: string]: {
      isTimedOut: boolean;
      expiresAt: string;
    };
  };
  gameStats: GameStats;
} 