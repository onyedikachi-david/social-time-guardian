import React, { useState, useEffect } from 'react';
import { Clock, Bell, Save, Plus, Trash2, RotateCcw, Edit2 } from 'lucide-react';
import { SettingsProps } from '../types/components';
import { storageService } from '../services/storage';

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

const Settings: React.FC<SettingsProps> = ({ data, onSave }) => {
  const [timeLimits, setTimeLimits] = useState(data?.settings.timeLimits || []);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    enabled: true,
    threshold: 75
  });
  const [newSite, setNewSite] = useState('');
  const [newLimit, setNewLimit] = useState('60');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [timeEditModal, setTimeEditModal] = useState<TimeEditModal>({ site: '', currentTime: 0, isOpen: false });

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
    setTimeLimits(timeLimits.filter(limit => limit.site !== site));
  };

  const handleLimitChange = (site: string, value: string, type: 'daily' | 'weekly') => {
    const minutes = parseInt(value);
    if (isNaN(minutes) || minutes < 0) return;

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

      // Update storage with new timeoutState
      const { [site]: _unused, ...restTimeoutState } = data.timeoutState || {};
      
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
                      type="number"
                      value={Math.round(limit.dailyLimit / 60)}
                      onChange={(e) => handleLimitChange(limit.site, e.target.value, 'daily')}
                      min="1"
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
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
                  <button
                    onClick={() => handleRemoveLimit(limit.site)}
                    className="p-2 text-gray-400 hover:text-red-500 focus:outline-none opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
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
    </div>
  );
};



export default Settings;