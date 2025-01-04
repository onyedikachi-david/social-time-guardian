import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, Clock, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react';
import { ReportsProps } from '../types/components';

const Reports: React.FC<ReportsProps> = ({ data }) => {
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('day');
  const [groupedUsage, setGroupedUsage] = useState<{ [site: string]: number }>({});
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (!data) return;

    // Group usage data by site
    const usage: { [site: string]: number } = {};
    const timeframeStart = new Date(selectedDate);

    // Set start date based on timeframe
    switch (timeframe) {
      case 'week':
        timeframeStart.setDate(selectedDate.getDate() - 7);
        break;
      case 'month':
        timeframeStart.setMonth(selectedDate.getMonth() - 1);
        break;
      default: // day
        timeframeStart.setHours(0, 0, 0, 0);
    }

    // Filter and group data
    data.timeTracking
      .filter(record => new Date(record.date) >= timeframeStart && new Date(record.date) <= selectedDate)
      .forEach(record => {
        usage[record.site] = (usage[record.site] || 0) + record.timeSpent;
      });

    setGroupedUsage(usage);
  }, [data, timeframe, selectedDate]);

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

  const getMaxUsage = (): number => {
    return Math.max(...Object.values(groupedUsage), 0);
  };

  const getTotalTime = (): number => {
    return Object.values(groupedUsage).reduce((a, b) => a + b, 0);
  };

  const trackedSites = [
    { id: 'twitter', name: 'Twitter/X', domain: 'x.com', color: '#1DA1F2' },
    { id: 'facebook', name: 'Facebook', domain: 'facebook.com', color: '#4267B2' },
    { id: 'instagram', name: 'Instagram', domain: 'instagram.com', color: '#E4405F' },
    { id: 'tiktok', name: 'TikTok', domain: 'tiktok.com', color: '#000000' },
    { id: 'linkedin', name: 'LinkedIn', domain: 'linkedin.com', color: '#0077B5' }
  ];

  const handleDateChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    switch (timeframe) {
      case 'day':
        newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(selectedDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    setSelectedDate(newDate);
  };

  const formatDate = (): string => {
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    };
    
    if (timeframe === 'week') {
      const weekEnd = new Date(selectedDate);
      const weekStart = new Date(selectedDate);
      weekStart.setDate(selectedDate.getDate() - 7);
      return `${weekStart.toLocaleDateString('en-US', options)} - ${weekEnd.toLocaleDateString('en-US', options)}`;
    } else if (timeframe === 'month') {
      return selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return selectedDate.toLocaleDateString('en-US', options);
  };

  return (
    <div className="space-y-8">
      {/* Header with Time Selection */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Usage Statistics</h2>
          </div>
          <select
            className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as 'day' | 'week' | 'month')}
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => handleDateChange('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h3 className="text-lg font-medium text-gray-700">{formatDate()}</h3>
          <button
            onClick={() => handleDateChange('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={selectedDate >= new Date()}
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Total Time Card */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-medium opacity-90">Total Time</h3>
            <p className="text-3xl font-bold tracking-tight">{formatTime(getTotalTime())}</p>
          </div>
        </div>
      </div>

      {/* Usage Breakdown */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-green-100 text-green-600 rounded-xl">
            <BarChart2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Usage Breakdown</h2>
        </div>

        <div className="space-y-6">
          {trackedSites.map((site) => {
            const usage = groupedUsage[site.domain] || 0;
            const percentage = (usage / getTotalTime()) * 100 || 0;
            const limit = data?.settings.timeLimits.find(l => l.site === site.domain);
            const limitPercentage = limit ? (usage / (timeframe === 'week' ? limit.weeklyLimit : limit.dailyLimit)) * 100 : 0;

            return (
              <div key={site.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: site.color }}
                    />
                    <span className="font-medium text-gray-700">{site.name}</span>
                  </div>
                  <span className="text-gray-600">{formatTime(usage)}</span>
                </div>

                <div className="relative">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-500 rounded-full"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: site.color
                      }}
                    />
                  </div>
                  {limit && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-red-500 transition-all duration-300"
                      style={{
                        left: `${Math.min(limitPercentage, 100)}%`,
                        opacity: limitPercentage > 0 ? 1 : 0
                      }}
                    />
                  )}
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{Math.round(percentage)}% of total</span>
                  {limit && (
                    <span className={`font-medium ${
                      limitPercentage >= 100 ? 'text-red-600' :
                      limitPercentage >= 75 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {Math.round(limitPercentage)}% of limit
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Activity Trends</h2>
        </div>

        <div className="h-64 flex items-end justify-between gap-2">
          {trackedSites.map((site) => {
            const usage = groupedUsage[site.domain] || 0;
            const percentage = (usage / getMaxUsage()) * 100;
            
            return (
              <div key={site.id} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t-lg transition-all duration-500"
                    style={{
                      height: `${percentage}%`,
                      backgroundColor: `${site.color}33`,
                      backgroundImage: `linear-gradient(to top, ${site.color}66, ${site.color}11)`
                    }}
                  />
                </div>
                <span className="text-xs text-gray-600 truncate w-full text-center">
                  {site.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Reports;