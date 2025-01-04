/// <reference types="chrome"/>

export interface TabState {
  startTime: number;
  timeSpent: number;
  url: string;
}

export interface Tab {
  id?: number;
  url?: string;
}

export interface TabActiveInfo {
  tabId: number;
}

export interface TabChangeInfo {
  url?: string;
}

export interface StorageData {
  timeTracking?: TimeTrackingRecord[];
  settings?: Settings;
}

export interface TimeTrackingRecord {
  site: string;
  timeSpent: number;
  date: string;
}

export interface Settings {
  timeLimits: Array<{
    site: string;
    dailyLimit: number;
    weeklyLimit: number;
  }>;
  notifications: {
    enabled: boolean;
    threshold: number;
  };
}

export interface TimeMessage {
  type: 'UPDATE_TIME';
  timeSpent: number;
}

export interface LimitMessage {
  type: 'LIMIT_REACHED';
  site: string;
  limit: number;
}

export type Message = TimeMessage | LimitMessage;

declare global {
  namespace chrome {
    namespace tabs {
      const query: (queryInfo: { active?: boolean; windowId?: number }) => Promise<Tab[]>;
      const get: (tabId: number) => Promise<Tab>;
      const sendMessage: (tabId: number, message: Message) => void;
      const onActivated: {
        addListener: (callback: (activeInfo: TabActiveInfo) => void) => void;
      };
      const onUpdated: {
        addListener: (callback: (tabId: number, changeInfo: TabChangeInfo, tab: Tab) => void) => void;
      };
      const onRemoved: {
        addListener: (callback: (tabId: number) => void) => void;
      };
    }

    namespace windows {
      const WINDOW_ID_NONE: number;
      const onFocusChanged: {
        addListener: (callback: (windowId: number) => void) => void;
      };
    }

    namespace storage {
      interface StorageArea {
        get: (keys: null) => Promise<StorageData>;
        set: (items: Partial<StorageData>) => Promise<void>;
      }
      const sync: StorageArea;
    }

    namespace runtime {
      const onInstalled: {
        addListener: (callback: () => void) => void;
      };
    }
  }
} 