import React, { useState, useEffect, Suspense } from 'react';
import { Timer, Settings as SettingsIcon, BarChart3 } from 'lucide-react';
import { storageService } from './services/storage';
import type { StorageData } from './types/storage';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load components for better performance
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const Settings = React.lazy(() => import('./components/Settings'));
const Reports = React.lazy(() => import('./components/Reports'));

// Tab configuration for better maintainability
const TABS = {
  dashboard: {
    component: Dashboard,
    icon: Timer,
    label: 'Dashboard'
  },
  reports: {
    component: Reports,
    icon: BarChart3,
    label: 'Reports'
  },
  settings: {
    component: Settings,
    icon: SettingsIcon,
    label: 'Settings'
  }
} as const;

type TabKey = keyof typeof TABS;

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<StorageData | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await storageService.initialize();
        const storageData = await storageService.getData();
        setData(storageData);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setError(error instanceof Error ? error : new Error('Failed to initialize app'));
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-red-600 text-lg font-semibold mb-2">Failed to initialize</h2>
        <p className="text-gray-600 text-sm mb-4">{error.message}</p>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  const ActiveComponent = TABS[activeTab].component;

  return (
    <div className="w-[400px] min-h-[500px] bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-xl font-semibold text-gray-800">Social Media Guardian</h1>
      </header>

      <main className="p-4">
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <ActiveComponent data={data} />
          </Suspense>
        </ErrorBoundary>
      </main>

      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200">
        <div className="flex justify-around py-2">
          {Object.entries(TABS).map(([key, { icon: Icon, label }]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as TabKey)}
              className={`flex flex-col items-center p-2 rounded-lg ${
                activeTab === key ? 'text-blue-600' : 'text-gray-600'
              } hover:bg-gray-100 transition-colors`}
            >
              <Icon size={20} />
              <span className="text-xs mt-1">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default App;