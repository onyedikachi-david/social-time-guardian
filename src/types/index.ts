export interface SocialPlatform {
  id: string;
  name: string;
  domain: string;
  icon: string;
  color: string;
}

export interface TimeLimit {
  platformId: string;
  daily: number; // in minutes
  weekly: number; // in minutes
}

export interface UsageData {
  platformId: string;
  timeSpent: number; // in seconds
  date: string;
}

export interface Settings {
  timeLimits: TimeLimit[];
  notificationThresholds: number[]; // percentages
  notificationSound: boolean;
  passwordProtected: boolean;
  passwordHash?: string;
  whitelistedUrls: string[];
}