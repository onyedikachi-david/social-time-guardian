import { StorageData, UserSettings } from '../types/storage';

type SaveState = 'idle' | 'saving' | 'success' | 'error';
type SaveCallback = (state: SaveState) => void;

const DEFAULT_DATA: StorageData = {
  settings: {
    timeLimits: [],
    notifications: {
      enabled: true,
      threshold: 5
    },
    blockingEnabled: true,
    theme: 'light'
  },
  timeTracking: [],
  lastSync: new Date().toISOString(),
  timeoutState: {}
};

class StorageService {
  private static instance: StorageService;
  private saveState: SaveState = 'idle';
  private saveCallbacks: SaveCallback[] = [];

  private constructor() {}

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  onSaveStateChange(callback: SaveCallback) {
    this.saveCallbacks.push(callback);
  }

  private notifySaveState(state: SaveState) {
    this.saveState = state;
    this.saveCallbacks.forEach(callback => callback(state));
  }

  getSaveState(): SaveState {
    return this.saveState;
  }

  async getData(): Promise<StorageData> {
    try {
      const result = await chrome.storage.sync.get(null);
      console.log('Retrieved storage data:', result);
      
      // Return default data if storage is empty
      if (!result || Object.keys(result).length === 0) {
        return DEFAULT_DATA;
      }

      // Ensure all required fields exist
      return {
        settings: result.settings || DEFAULT_DATA.settings,
        timeTracking: result.timeTracking || DEFAULT_DATA.timeTracking,
        lastSync: result.lastSync || DEFAULT_DATA.lastSync,
        timeoutState: result.timeoutState || DEFAULT_DATA.timeoutState
      };
    } catch (error) {
      console.error('Failed to get data from storage:', error);
      throw error;
    }
  }

  async initialize(): Promise<void> {
    try {
      const data = await this.getData();
      if (!data || Object.keys(data).length === 0) {
        console.log('Initializing storage with default values');
        await this.setData(DEFAULT_DATA);
      } else if (!data.timeoutState) {
        // Add timeoutState to existing data
        await this.setData({
          ...data,
          timeoutState: {}
        });
      }
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      throw error;
    }
  }

  async setData(data: StorageData): Promise<void> {
    try {
      this.notifySaveState('saving');
      console.log('Setting storage data:', data);
      
      // Save data at the top level, not nested
      await chrome.storage.sync.set({
        settings: data.settings,
        timeTracking: data.timeTracking,
        lastSync: data.lastSync,
        timeoutState: data.timeoutState
      });
      
      // Verify the data was saved
      const savedData = await this.getData();
      console.log('Verified saved data:', savedData);
      this.notifySaveState('success');
    } catch (error) {
      console.error('Failed to set data in storage:', error);
      this.notifySaveState('error');
      throw error;
    }
  }

  async updateTimeTracking(site: string, timeSpent: number): Promise<void> {
    try {
      this.notifySaveState('saving');
      const data = await this.getData();
      const today = new Date().toISOString().split('T')[0];
      
      console.log('Current time tracking:', data.timeTracking);
      console.log('Updating time for:', { site, timeSpent, today });
      
      // Find existing record for today
      const existingIndex = data.timeTracking.findIndex(
        record => record.site === site && record.date === today
      );

      if (existingIndex !== -1) {
        // Update existing record
        data.timeTracking[existingIndex].timeSpent = timeSpent;
        console.log('Updated existing record:', data.timeTracking[existingIndex]);
      } else {
        // Add new record
        data.timeTracking.push({
          site,
          timeSpent,
          date: today
        });
        console.log('Added new record');
      }

      data.lastSync = new Date().toISOString();
      console.log('Saving updated time tracking:', data);
      await this.setData(data);
      this.notifySaveState('success');
    } catch (error) {
      console.error('Failed to update time tracking:', error);
      this.notifySaveState('error');
      throw error;
    }
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<void> {
    try {
      this.notifySaveState('saving');
      const data = await this.getData();
      const updatedData: StorageData = {
        ...data,
        settings: { ...data.settings, ...settings },
        lastSync: new Date().toISOString()
      };
      
      console.log('Updating settings:', updatedData);
      await this.setData(updatedData);
      this.notifySaveState('success');
    } catch (error) {
      console.error('Failed to update settings:', error);
      this.notifySaveState('error');
      throw error;
    }
  }
}

export const storageService = StorageService.getInstance();