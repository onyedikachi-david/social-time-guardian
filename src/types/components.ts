// Component Props Types
export interface ComponentProps {
  data: {
    timeTracking: Array<{
      site: string;
      timeSpent: number;
      date: string;
    }>;
    settings: {
      timeLimits: Array<{
        site: string;
        dailyLimit: number;
        weeklyLimit: number;
      }>;
      notifications: {
        enabled: boolean;
        threshold: number;
      };
    };
  } | null;
}

export interface DashboardProps extends ComponentProps {
  onTimeUpdate?: (site: string, timeSpent: number) => void;
}

export interface ReportsProps extends ComponentProps {
  onExport?: (format: 'csv' | 'pdf') => void;
}

export interface SettingsProps extends ComponentProps {
  onSave?: (settings: {
    timeLimits: Array<{
      site: string;
      dailyLimit: number;
      weeklyLimit: number;
    }>;
    notifications: {
      enabled: boolean;
      threshold: number;
    };
  }) => Promise<void>;
} 