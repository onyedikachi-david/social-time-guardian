/// <reference types="chrome"/>

// Message Types
interface TimeMessage {
  type: 'UPDATE_TIME';
  timeSpent: number;
  limit?: number;
  remainingTime?: number;
}

interface WarningMessage {
  type: 'SHOW_WARNING' | 'HIDE_WARNING';
  remainingTime?: number;
}

type ExtensionMessage = TimeMessage | WarningMessage;

interface Chrome {
  runtime: {
    onMessage: {
      addListener: (
        callback: (
          message: ExtensionMessage,
          sender: { tab?: { id?: number } },
          sendResponse: () => void
        ) => void
      ) => void;
    };
  };
}

declare const chrome: Chrome;

// Content Script
const createWarningOverlay = () => {
  const overlay = document.createElement('div');
  overlay.id = 'social-time-warning';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(255, 0, 0, 0.1);
    z-index: 9998;
    display: none;
    justify-content: center;
    align-items: center;
    backdrop-filter: blur(4px);
  `;

  const warningBox = document.createElement('div');
  warningBox.style.cssText = `
    background: white;
    padding: 24px;
    border-radius: 16px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    text-align: center;
    max-width: 400px;
  `;

  const title = document.createElement('h2');
  title.style.cssText = `
    font-size: 24px;
    font-weight: 600;
    color: #DC2626;
    margin-bottom: 12px;
  `;
  title.textContent = 'Time Limit Warning';

  const message = document.createElement('p');
  message.id = 'warning-message';
  message.style.cssText = `
    font-size: 16px;
    color: #374151;
    margin-bottom: 20px;
    line-height: 1.5;
  `;

  const countdown = document.createElement('div');
  countdown.id = 'warning-countdown';
  countdown.style.cssText = `
    font-size: 32px;
    font-weight: 700;
    color: #DC2626;
    margin-bottom: 20px;
  `;

  warningBox.appendChild(title);
  warningBox.appendChild(message);
  warningBox.appendChild(countdown);
  overlay.appendChild(warningBox);

  return overlay;
};

const createTimeDisplay = () => {
  const container = document.createElement('div') as HTMLDivElement;
  container.id = 'social-time-tracker';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  `;

  const display = document.createElement('div');
  display.className = 'time-display';
  display.style.cssText = `
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    border-radius: 16px;
    padding: 12px 16px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
  `;

  const icon = document.createElement('div');
  icon.className = 'time-icon';
  icon.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  `;
  icon.style.cssText = `
    color: #6366F1;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  const timeText = document.createElement('div');
  timeText.className = 'time-text';
  timeText.style.cssText = `
    font-size: 14px;
    font-weight: 500;
    color: #1F2937;
    display: flex;
    flex-direction: column;
    gap: 2px;
  `;

  const timeValue = document.createElement('span');
  timeValue.id = 'time-value';
  timeValue.style.cssText = `font-size: 16px;`;

  const timeLimit = document.createElement('span');
  timeLimit.id = 'time-limit';
  timeLimit.style.cssText = `
    font-size: 12px;
    color: #6B7280;
  `;

  timeText.appendChild(timeValue);
  timeText.appendChild(timeLimit);
  display.appendChild(icon);
  display.appendChild(timeText);
  container.appendChild(display);

  return container;
};

// Initialize UI
const timeDisplay = createTimeDisplay();
const warningOverlay = createWarningOverlay();
document.body.appendChild(timeDisplay);
document.body.appendChild(warningOverlay);

// Prevent page reload and navigation when warning is shown
window.addEventListener('beforeunload', (e) => {
  const overlay = document.getElementById('social-time-warning');
  if (overlay && overlay.style.display === 'flex') {
    e.preventDefault();
    e.returnValue = '';
  }
});

// Prevent navigation through history
window.addEventListener('popstate', (e) => {
  const overlay = document.getElementById('social-time-warning');
  if (overlay && overlay.style.display === 'flex') {
    e.preventDefault();
    history.pushState(null, '', window.location.href);
  }
});

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${remainingSeconds}s`);

  return parts.join(' ');
};

// Handle messages from background script
chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message.type === 'UPDATE_TIME') {
    const timeValue = document.getElementById('time-value');
    const timeLimit = document.getElementById('time-limit');
    
    console.log('Received time update:', {
      timeSpentSeconds: message.timeSpent,
      limitSeconds: message.limit,
      remainingSeconds: message.remainingTime
    });

    if (timeValue) {
      timeValue.textContent = formatTime(message.timeSpent); // Already in seconds
    }
    if (timeLimit && message.limit !== undefined) {
      timeLimit.textContent = `/ ${formatTime(message.limit)}`; // Already in seconds
    }

    // Show warning when approaching limit
    if (message.remainingTime !== undefined && message.remainingTime <= 60) { // 60 seconds remaining
      const overlay = document.getElementById('social-time-warning');
      const warningMessage = document.getElementById('warning-message');
      const countdown = document.getElementById('warning-countdown');
      
      if (overlay && warningMessage && countdown) {
        overlay.style.display = 'flex';
        warningMessage.textContent = `You have reached your time limit for this site. The page will close in:`;
        countdown.textContent = `${formatTime(message.remainingTime)}`; // Already in seconds
        
        // Add strong blur effect in last 10 seconds
        if (message.remainingTime <= 10) {
          document.body.style.filter = `blur(${(10 - message.remainingTime) * 0.8}px)`;
        }
      }
    }
  }
});