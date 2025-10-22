import React, { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { useMineDetails } from '../contexts/MineDetailsContext';
import { fetchRequest } from '../utils/fetch';
import MineDetailsButton from '../components/common/MineDetailsButton';
import StarButton from '../components/common/StarButton';
import {
  Search, FileText, Database, ArrowRight, 
  Rocket, Table2, Brain, Bot, MapPin,
  Loader2, Ban, GitBranch, FolderOpen
} from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  type: string;
  icon: ReactNode;
  viewed: string;
  updated: string;
  tables?: any[];
}

interface QuickAction {
  href: string;
  icon: React.ComponentType<any>;
  color: string;
  title: string;
  desc: string;
}

interface SavedMine {
  mine_id: string;
  timestamp: string;
}

interface MineSearchResult {
  mine_id: string;
  primary_name?: string;
  commodities?: string;
  evaluation_status?: string;
  latitude?: number;
  longitude?: number;
}

// Helper functions for localStorage
const getSavedMines = (): SavedMine[] => {
  const saved = localStorage.getItem('savedMines');
  return saved ? JSON.parse(saved) : [];
};

const removeMineFromStorage = (mineId: string): void => {
  const savedMines = getSavedMines();
  const filteredMines = savedMines.filter(mine => mine.mine_id !== mineId);
  localStorage.setItem('savedMines', JSON.stringify(filteredMines));
};

// Validate if a string looks like a UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Check if input looks like a mine ID (UUID format only)
const isMineId = (str: string): boolean => {
  if (!str) return false;
  return isValidUUID(str.trim());
};

// Clean up invalid mine IDs from localStorage
const cleanupInvalidMines = (): void => {
  const savedMines = getSavedMines();
  const validMines = savedMines.filter(mine => isValidUUID(mine.mine_id));
  
  if (validMines.length !== savedMines.length) {
    console.log(`Cleaned up ${savedMines.length - validMines.length} invalid mine IDs from saved mines`);
    localStorage.setItem('savedMines', JSON.stringify(validMines));
  }
};

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
  const [schemasLoading, setSchemasLoading] = useState<boolean>(false);
  const [tablesLoading, setTablesLoading] = useState<boolean>(false);
  const [modelsLoading, setModelsLoading] = useState<boolean>(false);
  const [savedMines, setSavedMines] = useState<SavedMine[]>([]);
  const [schemas, setSchemas] = useState<SearchResult[]>([]);
  const [tables, setTables] = useState<SearchResult[]>([]);
  const [models, setModels] = useState<SearchResult[]>([]);
  const [mineSearchResult, setMineSearchResult] = useState<MineSearchResult | null>(null);
  const [mineSearchLoading, setMineSearchLoading] = useState<boolean>(false);
  const searchTimeoutRef = useRef<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { openMineDetails } = useMineDetails();

  // Get active tab from URL or default to 'pages'
  const activeTab = searchParams.get('tab') || 'pages';

  const tabs = ['pages', 'schemas', 'tables', 'models', 'pipelines', 'saved mines'];

  // Load saved mines from localStorage
  const loadSavedMines = () => {
    cleanupInvalidMines(); // Clean up any invalid mine IDs first
    const mines = getSavedMines();
    setSavedMines(mines);
  };

  // Convert saved mines to SearchResult format
  const getSavedMinesAsResults = (): SearchResult[] => {
    return savedMines.map(mine => ({
      id: mine.mine_id,
      title: mine.mine_id,
      type: 'Saved Mine',
      icon: <MapPin size={16} className="text-yellow-500" />,
      viewed: new Date(mine.timestamp).toLocaleString(),
      updated: new Date(mine.timestamp).toLocaleString()
    }));
  };

  // Fetch schemas from API
  const fetchSchemas = async () => {
    setSchemasLoading(true);
    setTablesLoading(true);
    
    // Add 500ms delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const response = await fetchRequest({
        method: 'GET',
        url: 'http://localhost:5174/api/v1/schemas/tables'
      });

      if (response?.status >= 200 && response.status < 300 && Array.isArray(response.body)) {
        const schemaResults: SearchResult[] = response.body.map((schema: any) => ({
          id: schema.schema,
          title: schema.schema,
          type: 'Schema',
          icon: <Database size={16} className="text-gray-600 dark:text-gray-400" />,
          viewed: `${schema.tables?.length || 0} tables`,
          updated: 'Database Schema',
          tables: schema.tables
        }));
        setSchemas(schemaResults);

        // Also populate tables from all schemas
        const allTables: SearchResult[] = [];
        response.body.forEach((schema: any) => {
          if (schema.tables) {
            schema.tables.forEach((table: any) => {
              allTables.push({
                id: `${schema.schema}.${table.name}`,
                title: table.name,
                type: table.type === 'view' ? 'View' : 'Table',
                icon: table.type === 'view' ? 
                  <Bot size={16} className="text-gray-600 dark:text-gray-400" /> : 
                  <Table2 size={16} className="text-gray-600 dark:text-gray-400" />,
                viewed: schema.schema,
                updated: 'Recently'
              });
            });
          }
        });
        setTables(allTables);
      }
    } catch (error) {
      console.error('Failed to fetch schemas:', error);
    } finally {
      setSchemasLoading(false);
      setTablesLoading(false);
    }
  };

  // Fetch models from API (same endpoint as models page)
  const fetchModels = async () => {
    setModelsLoading(true);
    
    // Add 500ms delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const response = await fetchRequest({
        method: 'GET',
        url: 'http://localhost:5174/api/v1/models'
      });

      if (response?.status >= 200 && response.status < 300 && Array.isArray(response.body)) {
        const modelResults: SearchResult[] = response.body.map((model: any) => ({
          id: model.model_id,
          title: model.model_name,
          type: model.model_type?.replace('_', ' ') || 'Model',
          icon: <Brain size={16} className="text-gray-600 dark:text-gray-400" />,
          viewed: model.category || 'ML Model',
          updated: model.framework || 'Unknown Framework'
        }));
        setModels(modelResults);
      } else {
        // Fallback to empty array if API fails
        setModels([]);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
      // Fallback to empty array on error
      setModels([]);
    } finally {
      setModelsLoading(false);
    }
  };

  // Search for mine by mine_id
  const searchMine = async (mineId: string) => {
    setMineSearchLoading(true);
    setMineSearchResult(null);
    
    try {
      const response = await fetchRequest({
        method: 'GET',
        url: `http://localhost:5174/api/v1/schemas/data_analytics/tables/mine_summary/row?id_key=mine_id&id_value=${encodeURIComponent(mineId.trim())}`
      });

      if (response?.status >= 200 && response.status < 300 && response.body?.data) {
        setMineSearchResult({
          mine_id: response.body.data.mine_id || mineId,
          primary_name: response.body.data.primary_name,
          commodities: response.body.data.commodities,
          evaluation_status: response.body.data.evaluation_status,
          latitude: response.body.data.latitude,
          longitude: response.body.data.longitude
        });
      } else {
        // Mine not found
        setMineSearchResult(null);
      }
    } catch (error) {
      console.error('Failed to search mine:', error);
      setMineSearchResult(null);
    } finally {
      setMineSearchLoading(false);
    }
  };

  // Get data for current tab
  const getTabData = (tab: string): SearchResult[] => {
    switch (tab) {
      case 'pages':
        // Get pages from sidebar navigation structure
        return [
          { id: '/dashboard', title: 'Dashboard (UI)', type: 'Page', icon: <Rocket size={16} className="text-gray-600 dark:text-gray-400" />, viewed: 'Main', updated: 'Recently' },
          { id: '/search', title: 'Search', type: 'Page', icon: <Search size={16} className="text-gray-600 dark:text-gray-400" />, viewed: 'Main', updated: 'Recently' },
          { id: '/library', title: 'Library', type: 'Page', icon: <FolderOpen size={16} className="text-gray-600 dark:text-gray-400" />, viewed: 'Data Management', updated: 'Recently' },
          { id: '/data-management/sql-editor', title: 'SQL Editor', type: 'Page', icon: <FileText size={16} className="text-gray-600 dark:text-gray-400" />, viewed: 'Data Management', updated: 'Recently' },
          { id: '/etl-pipeline/workflows', title: 'Workflows', type: 'Page', icon: <GitBranch size={16} className="text-gray-600 dark:text-gray-400" />, viewed: 'ETL Pipeline', updated: 'Recently' },
          { id: '/visualisation/interactive-map', title: 'Interactive Map', type: 'Page', icon: <MapPin size={16} className="text-gray-600 dark:text-gray-400" />, viewed: 'Visualisation', updated: 'Recently' },
          { id: '/visualisation/evaluation-board', title: 'Evaluation Board', type: 'Page', icon: <Table2 size={16} className="text-gray-600 dark:text-gray-400" />, viewed: 'Visualisation', updated: 'Recently' },
          { id: '/ml-studio/models', title: 'Models', type: 'Page', icon: <Brain size={16} className="text-gray-600 dark:text-gray-400" />, viewed: 'ML Studio', updated: 'Recently' }
        ];
      case 'schemas':
        return schemas;
      case 'tables':
        return tables;
      case 'models':
        return models;
      case 'pipelines':
        return [
          { id: '550e8400-e29b-41d4-a716-446655440000', title: 'Excel S3 Data Ingestion', type: 'ETL Pipeline', icon: <GitBranch size={16} className="text-green-600 dark:text-green-400" />, viewed: 'Completed', updated: 'Recently' }
        ];
      case 'saved mines':
        return getSavedMinesAsResults();
      default:
        return [];
    }
  };

  // Get all data for search
  const getAllData = (): SearchResult[] => {
    const allData: SearchResult[] = [];
    tabs.forEach(tab => {
      allData.push(...getTabData(tab));
    });
    return allData;
  };

  const allResults = getAllData();

  const filteredResults = allResults.filter(result => {
    if (!searchQuery) return false;
    const query = searchQuery.toLowerCase();
    return result.title.toLowerCase().includes(query);
  });

  const groupedResults: Record<string, SearchResult[]> = filteredResults.reduce((acc: Record<string, SearchResult[]>, result) => {
    const category = tabs.find(tab => 
      getTabData(tab).some(item => item.id === result.id)
    );
    if (category) {
      (acc[category] ||= []).push(result);
    }
    return acc;
  }, {});

  // Handle quick action clicks
  const handleQuickActionClick = (action: QuickAction) => {
    if (action.title === 'Lucent Bot') {
      // Trigger the existing assistant modal by dispatching a custom event
      window.dispatchEvent(new CustomEvent('openAssistant'));
    } else {
      window.location.href = action.href;
    }
  };

  const quickActions: QuickAction[] = [
    { href: '/data-management/sql-editor', icon: Database, color: 'blue', title: 'Query data', desc: 'Execute SQL queries and analyse.' },
    { href: '/ml-studio/models', icon: Brain, color: 'purple', title: 'Train a model', desc: 'Create and train ML models.' },
    { href: '/library', icon: FolderOpen, color: 'green', title: 'View data', desc: 'Browse and explore your data.' },
    { href: '/chat', icon: Bot, color: 'orange', title: 'Lucent Bot', desc: 'Chat with our AI data assistant.' }
  ];

  const handleTabChange = async (tab: string) => {
    // Update URL with new tab
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', tab);
    setSearchParams(newSearchParams);
    
    // Load data if needed
    if (tab === 'schemas' && schemas.length === 0) {
      await fetchSchemas();
    } else if (tab === 'tables' && tables.length === 0) {
      // Show loading for tables tab only when data needs to be loaded
      setTablesLoading(true);
      
      // Add 500ms delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (schemas.length === 0) {
        // If schemas aren't loaded, fetch them (which also loads tables)
        await fetchSchemas();
      } else {
        // If schemas are already loaded, just clear the tables loading
        setTablesLoading(false);
      }
    } else if (tab === 'models' && models.length === 0) {
      await fetchModels();
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSearchResults(value.length > 0);
    
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Reset mine search result when query changes
    setMineSearchResult(null);
    setMineSearchLoading(false);
    
    // If it looks like a mine ID, search for it with delay
    if (value.length > 0 && isMineId(value)) {
      // Show loading immediately for mine searches
      setMineSearchLoading(true);
      searchTimeoutRef.current = setTimeout(() => {
        searchMine(value);
      }, 1000); // 1 second delay
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.id.startsWith('/')) {
      // Navigate to page routes
      window.location.href = result.id;
    } else if (result.id === '550e8400-e29b-41d4-a716-446655440000') {
      // Navigate to the specific pipeline workflow page
      window.location.href = `/etl-pipeline/workflows?pipeline_id=${result.id}&tab=overview`;
    } else if (result.type.toLowerCase().includes('model')) {
      // Navigate to ML model page
      window.location.href = `/ml-studio/${result.id}`;
    } else if (result.type === 'Schema') {
      // Navigate to data library with first table selected
      if (result.tables && result.tables.length > 0) {
        const firstTable = result.tables[0];
        const tableName = typeof firstTable === 'string' ? firstTable : firstTable.name;
        window.location.href = `/library/${encodeURIComponent(result.id)}/${encodeURIComponent(tableName)}`;
      } else {
        // Navigate to library without table selection if no tables
        window.location.href = `/library`;
      }
    } else if (result.type === 'Table' || result.type === 'View') {
      // Navigate to data library with specific table selected
      const [schemaName, tableName] = result.id.split('.');
      if (schemaName && tableName) {
        window.location.href = `/library/${encodeURIComponent(schemaName)}/${encodeURIComponent(tableName)}`;
      } else {
        window.location.href = '/library';
      }
    } else {
      alert(`Opening ${result.title}`);
    }
  };

  const removeSavedMine = (mineId: string) => {
    removeMineFromStorage(mineId);
    loadSavedMines(); // Refresh the saved mines list
  };

  const getCurrentTabResults = (): SearchResult[] => getTabData(activeTab);

  useEffect(() => {
    searchInputRef.current?.focus();
    loadSavedMines(); // Load saved mines on component mount
    
    // Load initial data based on active tab
    if (activeTab === 'schemas' && schemas.length === 0) {
      fetchSchemas();
    } else if (activeTab === 'tables' && tables.length === 0) {
      // Handle tables tab on initial load
      setTablesLoading(true);
      setTimeout(async () => {
        if (schemas.length === 0) {
          await fetchSchemas();
        } else {
          setTablesLoading(false);
        }
      }, 500);
    } else if (activeTab === 'models' && models.length === 0) {
      fetchModels();
    }
  }, []);

  // Load data when switching to schemas or models tab
  useEffect(() => {
    if (activeTab === 'schemas' && schemas.length === 0) {
      fetchSchemas();
    } else if (activeTab === 'tables' && tables.length === 0) {
      // Handle tables tab on tab change
      setTablesLoading(true);
      setTimeout(async () => {
        if (schemas.length === 0) {
          await fetchSchemas();
        } else {
          setTablesLoading(false);
        }
      }, 500);
    } else if (activeTab === 'models' && models.length === 0) {
      fetchModels();
    }
  }, [activeTab]);

  // Refresh saved mines when switching to the saved mines tab
  useEffect(() => {
    if (activeTab === 'saved mines') {
      loadSavedMines();
    }
  }, [activeTab]);

  // Validate and correct tab parameter on mount
  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab && !tabs.includes(currentTab)) {
      // If invalid tab in URL, redirect to default tab
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('tab', 'pages');
      setSearchParams(newSearchParams, { replace: true });
    } else if (!currentTab) {
      // If no tab in URL, set default tab
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('tab', 'pages');
      setSearchParams(newSearchParams, { replace: true });
    }

    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
      <div className="px-6 flex-1 overflow-hidden flex flex-col justify-center">
        {/* Search Bar */}
        <div className="w-full max-w-6xl mx-auto my-8">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Search</h2>
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search this account, Marketplace, and documentation"
              className="flex w-full items-center rounded-lg pl-12 pr-4 py-3 text-sm transition-all duration-200 bg-white border border-gray-200 dark:bg-gray-900 dark:border-gray-700 text-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none dark:focus:border-white/20"
              value={searchQuery}
              onChange={handleSearchChange}
            />
            
            {/* Search Results Dropdown */}
            {showSearchResults && searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-y-auto z-50 max-h-96">
                {/* Show mine search results if searching for a mine ID */}
                {isMineId(searchQuery) ? (
                  <div>
                    {mineSearchLoading ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <Loader2 size={24} className="text-gray-500 dark:text-gray-400 animate-spin" />
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          Searching mines...
                        </p>
                      </div>
                    ) : mineSearchResult ? (
                      <div>
                        <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase border-b border-gray-100 dark:border-gray-800">
                          mines
                        </div>
                        <div
                          className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800"
                          onClick={() => openMineDetails(mineSearchResult.mine_id)}
                        >
                          <div className="flex items-center gap-3">
                            <MapPin size={16} className="text-yellow-600 dark:text-yellow-400" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {mineSearchResult.primary_name || mineSearchResult.mine_id}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {mineSearchResult.mine_id}
                                {mineSearchResult.commodities && ` • ${mineSearchResult.commodities}`}
                                {mineSearchResult.evaluation_status && ` • ${mineSearchResult.evaluation_status}`}
                              </div>
                            </div>
                            <ArrowRight size={16} className="text-gray-400" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <MapPin size={24} className="text-gray-500 dark:text-gray-400" />
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          No mine found for "{searchQuery}"
                        </p>
                        <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
                          Try searching with a different mine ID
                        </p>
                      </div>
                    )}
                  </div>
                ) : filteredResults.length > 0 ? (
                  <div>
                    {Object.entries(groupedResults).map(([category, results]) => (
                      <div key={category}>
                        <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase border-b border-gray-100 dark:border-gray-800">
                          {category}
                        </div>
                        {results.slice(0, 5).map((result) => (
                          <div
                            key={result.id}
                            className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                            onClick={() => handleResultClick(result)}
                          >
                            <div className="flex items-center gap-3">
                              {result.icon}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {result.title}
                                </div>
                              </div>
                              <ArrowRight size={16} className="text-gray-400" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <Search size={24} className="text-gray-500 dark:text-gray-400" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      No results found for "{searchQuery}"
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="w-full max-w-6xl mx-auto mb-8">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <div 
                key={action.href}
                className={`bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.05] rounded-lg p-6 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors cursor-pointer`}
                onClick={() => handleQuickActionClick(action)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    action.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' :
                    action.color === 'green' ? 'bg-green-100 dark:bg-green-900/30' :
                    action.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30' :
                    'bg-orange-100 dark:bg-orange-900/30'
                  }`}>
                    <action.icon size={16} className={
                      action.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                      action.color === 'green' ? 'text-green-600 dark:text-green-400' :
                      action.color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
                      'text-orange-600 dark:text-orange-400'
                    } />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{action.title}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{action.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full max-w-6xl mx-auto flex flex-col pb-6">
          {/* Tabs */}
          <div className="flex gap-8 border-b border-gray-200 dark:border-white/[0.05]">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`pb-3 text-sm font-medium transition-colors relative ${
                  activeTab === tab
                    ? 'text-black dark:text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white" />
                )}
              </button>
            ))}
          </div>

          {/* Content Table */}
          <div className="max-h-96 bg-white mt-6 dark:bg-white/[0.03] rounded-lg border border-gray-200 dark:border-white/[0.05] overflow-hidden">
            {(activeTab === 'schemas' && schemasLoading) || 
             (activeTab === 'tables' && tablesLoading) || 
             (activeTab === 'models' && modelsLoading) ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Loader2 size={24} className="text-gray-500 dark:text-gray-400 animate-spin" />
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Loading {activeTab}...
                </p>
              </div>
            ) : (
              <div className="h-full overflow-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
                    <tr>
                      {activeTab === 'saved mines' ? (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Mine ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Saved</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                        </>
                      ) : activeTab === 'pipelines' ? (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Pipeline Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Run</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Viewed</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Updated</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/[0.05]">
                    {getCurrentTabResults().length === 0 && activeTab === 'saved mines' ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <StarButton size={24} isStarred={false} className="pointer-events-none" />
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">No saved mines yet</p>
                          <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">Save mines from the Library to see them here</p>
                        </td>
                      </tr>
                    ) : getCurrentTabResults().length === 0 ? (
                      <tr>
                        <td colSpan={activeTab === 'saved mines' ? 3 : 4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            {((activeTab === 'schemas' && schemasLoading) || 
                              (activeTab === 'tables' && tablesLoading) || 
                              (activeTab === 'models' && modelsLoading)) ? (
                              <Loader2 size={24} className="text-gray-500 dark:text-gray-400 animate-spin" />
                            ) : (
                              <Ban size={24} className="text-gray-500 dark:text-gray-400" />
                            )}
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">
                            {((activeTab === 'schemas' && schemasLoading) || 
                              (activeTab === 'tables' && tablesLoading) || 
                              (activeTab === 'models' && modelsLoading)) ? `Loading ${activeTab}...` : `No ${activeTab} found`}
                          </p>
                        </td>
                      </tr>
                    ) : getCurrentTabResults().map((result) => {
                      if (activeTab === 'saved mines') {
                        return (
                          <tr key={result.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3 flex items-center gap-2">
                              {result.icon}
                              <span className="text-gray-800 dark:text-white/90 text-sm font-mono">{result.id}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-sm">
                              {result.viewed}
                            </td>
                            <td className="px-4 py-3 text-left relative flex items-center gap-2">
                              <StarButton
                                isStarred={true}
                                onToggle={() => removeSavedMine(result.id)}
                                size={16}
                                title="Remove from saved"
                              />
                              <MineDetailsButton
                                mineId={result.id}
                                onOpenDetails={openMineDetails}
                                title="View Details"
                              />
                            </td>
                          </tr>
                        );
                      }
                      
                      return (
                        <tr 
                          key={result.id} 
                          className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                          onClick={() => handleResultClick(result)}
                        >
                          <td className="px-4 py-3 flex items-center gap-2">
                            {result.icon}
                            <span className="text-gray-800 dark:text-white/90 text-sm">{result.title}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-sm">{result.type}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-sm">{result.viewed}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-sm">{result.updated}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}