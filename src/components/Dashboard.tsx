import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, AlertTriangle, Settings2, BarChart2 } from 'lucide-react';
import { DashboardProps } from '../types/components';

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const [totalTimeToday, setTotalTimeToday] = useState(0);
  const [mostUsedSite, setMostUsedSite] = useState<{ site: string; time: number } | null>(null);
  const [nearingLimits, setNearingLimits] = useState<Array<{ site: string; percentage: number }>>([]);

  useEffect(() => {
    if (!data) return;

    // Calculate total time today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayUsage = data.timeTracking
      .filter(record => new Date(record.date) >= today)
      .reduce((total, record) => total + record.timeSpent, 0);
    
    setTotalTimeToday(todayUsage);

    // Find most used site
    const siteUsage: { [key: string]: number } = {};
    data.timeTracking
      .filter(record => new Date(record.date) >= today)
      .forEach(record => {
        siteUsage[record.site] = (siteUsage[record.site] || 0) + record.timeSpent;
      });

    if (Object.keys(siteUsage).length > 0) {
      const topSite = Object.entries(siteUsage)
        .reduce((max, [site, time]) => time > (max[1] || 0) ? [site, time] : max, ['', 0]);
      setMostUsedSite({ site: topSite[0], time: topSite[1] });
    }

    // Check sites nearing limits
    const sitesNearLimit = data.settings.timeLimits
      .map(limit => {
        const usage = siteUsage[limit.site] || 0;
        const percentage = (usage / limit.dailyLimit) * 100;
        return { site: limit.site, percentage };
      })
      .filter(site => site.percentage >= 75);

    setNearingLimits(sitesNearLimit);
  }, [data]);

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

  const getTimeColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 90) return 'from-red-500 to-red-600';
    if (percentage >= 75) return 'from-yellow-500 to-yellow-600';
    return 'from-green-500 to-green-600';
  };

  return (
    <div className="h-[600px] overflow-y-auto px-4 py-6 space-y-8 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Time Today */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-medium opacity-90">Total Time Today</h3>
              <p className="text-3xl font-bold tracking-tight">{formatTime(totalTimeToday)}</p>
            </div>
          </div>
        </div>

        {/* Most Used Site */}
        {mostUsedSite && (
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-medium opacity-90">Most Used Site</h3>
                <p className="text-3xl font-bold tracking-tight">{getSiteName(mostUsedSite.site)}</p>
                <p className="text-sm opacity-75 mt-1">{formatTime(mostUsedSite.time)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Sites Near Limit */}
        {nearingLimits.length > 0 && (
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-medium opacity-90">Sites Near Limit</h3>
                <p className="text-3xl font-bold tracking-tight">{nearingLimits.length}</p>
                <p className="text-sm opacity-75 mt-1">sites approaching limit</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Time Limits Progress */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
            <Settings2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Time Limits</h2>
        </div>

        <div className="space-y-6">
          {data?.settings.timeLimits.map((limit) => {
            const usage = data.timeTracking
              .filter(record => {
                const recordDate = new Date(record.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return record.site === limit.site && recordDate >= today;
              })
              .reduce((total, record) => total + record.timeSpent, 0);

            const percentage = (usage / limit.dailyLimit) * 100;

            return (
              <div key={limit.site} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">{getSiteName(limit.site)}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${getTimeColor(percentage)}`}>
                      {formatTime(usage)}
                    </span>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-500">{formatTime(limit.dailyLimit)}</span>
                  </div>
                </div>

                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${getProgressColor(percentage)} transition-all duration-500`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{Math.round(percentage)}% of daily limit</span>
                  {percentage >= 75 && (
                    <span className={getTimeColor(percentage)}>
                      {percentage >= 100 ? 'Limit exceeded' : 'Approaching limit'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-green-100 text-green-600 rounded-xl">
            <BarChart2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Recent Activity</h2>
        </div>

        <div className="space-y-4">
          {data?.timeTracking
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5)
            .map((record, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="font-medium text-gray-700">{getSiteName(record.site)}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-500">{formatTime(record.timeSpent)}</span>
                  <span className="text-sm text-gray-400">
                    {new Date(record.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;