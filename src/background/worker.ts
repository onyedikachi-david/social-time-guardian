/// <reference types="chrome"/>

import type { TabState } from '../types/chrome';
import { storageService } from '../services/storage';

const trackedDomains = [
  'x.com',
  'twitter.com',
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'linkedin.com'
];

let activeTab: TabState | null = null;
let trackingInterval: number | null = null;

const getDomainFromUrl = (url: string): string | null => {
  try {
    const { hostname } = new URL(url);
    console.log('Extracted domain:', hostname);
    return hostname;
  } catch {
    console.error('Failed to parse URL:', url);
    return null;
  }
};

const isTrackedDomain = (url: string): boolean => {
  const domain = getDomainFromUrl(url);
  const isTracked = domain ? trackedDomains.some(d => domain.includes(d)) : false;
  console.log('Domain check:', { domain, isTracked });
  return isTracked;
};

const startTracking = async (tabId: number, url: string) => {
  console.log('🟢 Starting tracking for:', { tabId, url });
  const urlDomain = getDomainFromUrl(url);
  if (!urlDomain || !isTrackedDomain(url)) {
    console.log('❌ Not a tracked domain:', url);
    return;
  }

  // Check if site is in timeout
  const initialData = await storageService.getData();
  const timeoutState = initialData.timeoutState?.[urlDomain];
  if (timeoutState?.isTimedOut && new Date(timeoutState.expiresAt) > new Date()) {
    console.log('🚫 Site is in timeout:', urlDomain);
    // Send immediate timeout message
    const timeLimit = initialData.settings.timeLimits.find(limit => limit.site === urlDomain);
    await chrome.tabs.sendMessage(tabId, {
      type: 'UPDATE_TIME',
      timeSpent: 0,
      limit: timeLimit?.dailyLimit || 0,
      remainingTime: 0
    });
    return;
  }

  // Stop any existing tracking
  stopTracking();

  // Get current day's time spent
  const data = await storageService.getData();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTracking = data.timeTracking.find(
    record => record.site === urlDomain && new Date(record.date) >= today
  );

  // Start tracking from the stored seconds
  activeTab = {
    startTime: Date.now(),
    timeSpent: todayTracking?.timeSpent || 0, // Keep in seconds
    url
  };

  console.log('✅ Initialized tracking:', activeTab);

  // Start interval to update time every second
  trackingInterval = self.setInterval(async () => {
    if (!activeTab) {
      console.log('❌ No active tab in interval');
      return;
    }

    // Add one second
    activeTab.timeSpent += 1;
    
    try {
      // Get current time limits
      const currentData = await storageService.getData();
      const currentDomain = getDomainFromUrl(activeTab.url);
      if (!currentDomain) return;

      const timeLimit = currentData.settings.timeLimits.find(limit => limit.site === currentDomain);
      const timeSpentSeconds = Math.floor(activeTab.timeSpent); // Already in seconds
      
      // Save to storage first to ensure dashboard data is updated
      const today = new Date().toISOString().split('T')[0];
      const existingRecord = currentData.timeTracking.find(
        record => record.site === currentDomain && record.date.startsWith(today)
      );

      if (existingRecord) {
        existingRecord.timeSpent = timeSpentSeconds;
      } else {
        currentData.timeTracking.push({
          site: currentDomain,
          timeSpent: timeSpentSeconds,
          date: today
        });
      }

      // Check if we need to set timeout state
      if (timeLimit && timeSpentSeconds >= timeLimit.dailyLimit) {
        // Set timeout state
        currentData.timeoutState = {
          ...currentData.timeoutState,
          [currentDomain]: {
            isTimedOut: true,
            expiresAt: new Date(new Date(today).setHours(24, 0, 0, 0)).toISOString() // Expires at midnight
          }
        };
      }

      await storageService.setData(currentData);

      if (!timeLimit) {
        console.log('📤 Sending time update:', { timeSpentSeconds: activeTab.timeSpent });
        await chrome.tabs.sendMessage(tabId, {
          type: 'UPDATE_TIME',
          timeSpent: timeSpentSeconds, // Send in seconds
          limit: undefined,
          remainingTime: undefined
        });
        return;
      }

      const remainingSeconds = Math.max(0, timeLimit.dailyLimit - timeSpentSeconds);
      
      console.log('📤 Sending time update:', {
        timeSpentSeconds: timeSpentSeconds,
        limitSeconds: timeLimit.dailyLimit,
        remainingSeconds: remainingSeconds
      });

      await chrome.tabs.sendMessage(tabId, {
        type: 'UPDATE_TIME',
        timeSpent: timeSpentSeconds, // Send in seconds
        limit: timeLimit.dailyLimit, // Send in seconds
        remainingTime: remainingSeconds // Send in seconds
      });

      // Close tab when time is up
      if (remainingSeconds === 0) {
        console.log('⏰ Time limit reached, closing tab');
        stopTracking();
        await chrome.tabs.remove(tabId);
      }
    } catch (error) {
      console.error('❌ Error updating time:', error);
    }
  }, 1000);
};

const stopTracking = () => {
  console.log('🛑 Stopping tracking:', { activeTab, hasInterval: !!trackingInterval });
  if (trackingInterval) {
    self.clearInterval(trackingInterval);
    trackingInterval = null;
  }
  activeTab = null;
};

// Function to check and start tracking the active tab
const checkActiveTab = async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, windowId: chrome.windows.WINDOW_ID_CURRENT });
    console.log('🔍 Active tab check:', tab);
    if (tab?.id && tab.url) {
      console.log('✅ Found active tab:', { id: tab.id, url: tab.url });
      await startTracking(tab.id, tab.url);
    }
  } catch (error) {
    console.error('❌ Error checking active tab:', error);
  }
};

// Listen for tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log('🔄 Tab activated:', activeInfo);
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    await startTracking(activeInfo.tabId, tab.url);
  }
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.url) {
    console.log('🔄 Tab URL updated:', { tabId, url: changeInfo.url });
    const newDomain = getDomainFromUrl(changeInfo.url);
    const currentDomain = activeTab ? getDomainFromUrl(activeTab.url) : null;
    
    // Only restart tracking if domain changes
    if (newDomain !== currentDomain) {
      await startTracking(tabId, changeInfo.url);
    }
  }
});

// Listen for tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  console.log('❌ Tab removed:', tabId);
  stopTracking();
});

// Listen for window focus change
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  console.log('👀 Window focus changed:', windowId);
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    stopTracking();
  } else {
    await checkActiveTab();
  }
});

// Initialize when extension is installed or updated
chrome.runtime.onInstalled.addListener(async () => {
  console.log('🚀 Extension installed/updated');
  await storageService.initialize();
  await checkActiveTab();
});