import { useEffect, useState, useRef } from 'react';
import { BarChart3, TrendingUp, Database, RefreshCw, Brain, CheckCircle, Clock, AlertCircle, Pause, ChevronRight, FileText, Layers, Link } from 'lucide-react';
import Header from '../components/navigation/Header';
import AllSources from "../components/dashboard/AllMediaCard";
import DataVsDatasets from "../components/dashboard/AllFolders";
import RecentFileTable from "../components/dashboard/RecentFileTable";
import DataTypes from "../components/dashboard/StorageDetailsChart";

// Model interface
interface Model {
  id: number;
  name: string;
  type: string;
  status: 'training' | 'completed' | 'failed' | 'paused';
  accuracy: number | null;
  dataset: string;
  framework: string;
}

// Dataset interface
interface Dataset {
  id: number;
  name: string;
  rows: number;
  columns: number;
  lastUpdated: string;
  size: string;
}

// Data Source interface
interface DataSource {
  id: number;
  name: string;
  type: 'file' | 'api' | 'database';
  status: 'connected' | 'syncing' | 'error';
  lastSync: string;
  records: number;
}

// Sample model data
const recentModels: Model[] = [
  {
    id: 1,
    name: "Customer Churn Predictor",
    type: "Classification",
    status: "completed",
    accuracy: 94.2,
    dataset: "Customer Orders",
    framework: "TensorFlow"
  },
  {
    id: 2,
    name: "Sales Forecasting",
    type: "Regression",
    status: "training",
    accuracy: null,
    dataset: "Sales Analytics",
    framework: "PyTorch"
  },
  {
    id: 3,
    name: "Product Recommender",
    type: "Recommendation",
    status: "completed",
    accuracy: 87.5,
    dataset: "User Engagement",
    framework: "TensorFlow"
  }
];

// Sample dataset data
const recentDatasets: Dataset[] = [
  {
    id: 1,
    name: "Customer Orders",
    rows: 15420,
    columns: 8,
    lastUpdated: "2024-03-20",
    size: "2.3 MB"
  },
  {
    id: 2,
    name: "Sales Analytics",
    rows: 8921,
    columns: 15,
    lastUpdated: "2024-03-19",
    size: "5.1 MB"
  },
  {
    id: 3,
    name: "User Engagement",
    rows: 25678,
    columns: 10,
    lastUpdated: "2024-03-18",
    size: "3.8 MB"
  }
];

// Sample data source data
const recentDataSources: DataSource[] = [
  {
    id: 1,
    name: "orders.csv",
    type: "file",
    status: "connected",
    lastSync: "2024-03-20 14:30",
    records: 15420
  },
  {
    id: 2,
    name: "Salesforce API",
    type: "api",
    status: "syncing",
    lastSync: "2024-03-20 14:25",
    records: 8921
  },
  {
    id: 3,
    name: "PostgreSQL DB",
    type: "database",
    status: "connected",
    lastSync: "2024-03-20 14:20",
    records: 25678
  }
];

// Status badge component
const StatusBadge = ({ status }: { status: Model['status'] }) => {
  const statusConfig = {
    training: {
      icon: Clock,
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
      text: 'Training'
    },
    completed: {
      icon: CheckCircle,
      color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      text: 'Completed'
    },
    failed: {
      icon: AlertCircle,
      color: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
      text: 'Failed'
    },
    paused: {
      icon: Pause,
      color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
      text: 'Paused'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.text}
    </span>
  );
};

// Data Source Status Badge
const DataSourceStatusBadge = ({ status }: { status: DataSource['status'] }) => {
  const statusConfig = {
    connected: {
      icon: CheckCircle,
      color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      text: 'Connected'
    },
    syncing: {
      icon: RefreshCw,
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
      text: 'Syncing'
    },
    error: {
      icon: AlertCircle,
      color: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
      text: 'Error'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className={`w-3 h-3 ${status === 'syncing' ? 'animate-spin' : ''}`} />
      {config.text}
    </span>
  );
};

// Get type icon for data sources
const getTypeIcon = (type: DataSource['type']) => {
  switch (type) {
    case 'file':
      return FileText;
    case 'api':
      return Link;
    case 'database':
      return Database;
    default:
      return FileText;
  }
};

// Compact Models Table Component
const CompactModelsTable = () => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
            <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              Recent Models
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Your latest ML training activities
            </p>
          </div>
        </div>
        <button className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300">
          View all
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-100 dark:border-white/[0.05]">
            <tr>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Model</span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Accuracy</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {recentModels.map((model) => (
              <tr key={model.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-800 dark:text-white/90 truncate max-w-[120px]">
                      {model.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {model.type}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={model.status} />
                </td>
                <td className="px-4 py-3">
                  {model.accuracy ? (
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      {model.accuracy}%
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            3 models total
          </span>
          <button className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300">
            Train New Model
          </button>
        </div>
      </div>
    </div>
  );
};

// Compact Datasets Table Component
const CompactDatasetsTable = () => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              Recent Datasets
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Processed and cleaned data
            </p>
          </div>
        </div>
        <button className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
          View all
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-100 dark:border-white/[0.05]">
            <tr>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Dataset</span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Rows</span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Size</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {recentDatasets.map((dataset) => (
              <tr key={dataset.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-800 dark:text-white/90 truncate max-w-[120px]">
                      {dataset.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {dataset.columns} columns
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {dataset.rows.toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {dataset.size}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            3 datasets total
          </span>
          <button className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
            Create Dataset
          </button>
        </div>
      </div>
    </div>
  );
};

// Compact Data Sources Table Component
const CompactDataSourcesTable = () => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
            <Database className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              Data Sources
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Raw data connections
            </p>
          </div>
        </div>
        <button className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300">
          View all
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-100 dark:border-white/[0.05]">
            <tr>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Source</span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Records</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {recentDataSources.map((source) => {
              const TypeIcon = getTypeIcon(source.type);
              return (
                <tr key={source.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <TypeIcon className="w-3 h-3 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-800 dark:text-white/90 truncate max-w-[100px]">
                          {source.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {source.type}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <DataSourceStatusBadge status={source.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {source.records.toLocaleString()}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            3 sources total
          </span>
          <button className="text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300">
            Add Source
          </button>
        </div>
      </div>
    </div>
  );
};

const DataOverviewPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [_, setShowHelpDropdown] = useState(false);
  const helpDropdownRef = useRef<HTMLDivElement>(null);

  // Close help dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (helpDropdownRef.current && !helpDropdownRef.current.contains(event.target as Node)) {
        setShowHelpDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const helpItems = [
    {
      icon: <BarChart3 size={12} />,
      title: "Data Insights",
      description: "View key metrics and trends at a glance"
    },
    {
      icon: <TrendingUp size={12} />,
      title: "Performance Metrics",
      description: "Monitor data quality and growth trends"
    },
    {
      icon: <Database size={12} />,
      title: "Data Sources",
      description: "Overview of connected data sources"
    },
    {
      icon: <RefreshCw size={12} />,
      title: "Real-time Updates",
      description: "Data refreshes automatically every 5 minutes"
    }
  ];

  return (
    <div className="h-screen flex flex-col min-w-0 overflow-hidden">
      <Header
        title="Dashboard"
        description="Overview of your data pipeline and machine learning models"
        showBackButton={false}
        badge={<span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">UI Only</span>}
        helpCircleItems={helpItems}
        showSearch={true}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search..."
        breadcrumbs={[{ label: "Home", url: "/home" }]}
      />
      <div className="flex-1 overflow-y-auto">
        <div className='px-10'>
        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Main Content */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <AllSources />
            <RecentFileTable 
              onUploadClick={() => console.log('Upload clicked')}
              onImportApiClick={() => console.log('Import API clicked')}
            />
          </div>
          
          {/* Right Column - Side Panels */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Top Section - Analytics */}
            <div className="space-y-6">
              <DataTypes />
              <DataVsDatasets />
              
            </div>
            
            {/* Bottom Section - Data Pipeline */}
            <div className="space-y-4">
              <CompactDataSourcesTable />
              <CompactDatasetsTable />
              <CompactModelsTable />
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default DataOverviewPage;