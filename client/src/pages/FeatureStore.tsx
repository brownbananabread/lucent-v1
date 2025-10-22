import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { CheckCircle, RotateCw, Search, Database, Ban, Loader2, ChevronDown, Table, FileText, Grid3X3, Settings, Target, Zap, Shield, Star } from 'lucide-react'
import MineDetailsButton from '../components/common/MineDetailsButton'
import { MineDetailsPanel } from '../components/modals/MineDetailsPanel'
import StarButton from '../components/common/StarButton'
import Header from "../components/navigation/Header"

// Help item type to match Header component
interface HelpItem {
  icon: React.ReactNode;
  title: string;
  description: string;
}

// Data item interface (similar to DataLibraryTable)
interface DataItem {
  [key: string]: any;
  children?: DataItem[];
}

// Highlight component for search functionality
function HighlightText({ text, searchTerm }: { text: string; searchTerm: string }) {
  if (!searchTerm) return <span>{text}</span>;

  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={index} className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

export default function FeatureStore() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DataItem[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedDataSource, setSelectedDataSource] = useState('');
  const [dataSourceDropdownOpen, setDataSourceDropdownOpen] = useState(false);
  const [dataAnalyticsTables, setDataAnalyticsTables] = useState<any[]>([]);
  const [dataAnalyticsLoading, setDataAnalyticsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mineDetailsOpen, setMineDetailsOpen] = useState(false);
  const [selectedMineId, setSelectedMineId] = useState<string | null>(null);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const [currentLimit, setCurrentLimit] = useState<number>(100);
  const [loadingMore, setLoadingMore] = useState(false);
  const [savedMines, setSavedMines] = useState<Set<string>>(new Set());

  useEffect(() => {
    const initializeFeatureStore = async () => {
      await fetchDataAnalyticsTables();
    };
    initializeFeatureStore();
  }, []);

  // Initialize selectedDataSource from URL parameter
  useEffect(() => {
    const featureParam = searchParams.get('feature');
    if (featureParam && featureParam !== selectedDataSource) {
      setSelectedDataSource(featureParam);
    }
  }, [searchParams, selectedDataSource]);

  // Fetch data_analytics tables from schemas endpoint
  const fetchDataAnalyticsTables = async () => {
    try {
      setDataAnalyticsLoading(true);
      const response = await fetch('http://localhost:5174/api/v1/schemas/tables');
      
      if (response.ok) {
        const data = await response.json();
        const dataAnalyticsSchema = data.find((schema: any) => schema.schema === 'data_analytics');
        
        if (dataAnalyticsSchema && dataAnalyticsSchema.tables) {
          console.log('Available tables:', dataAnalyticsSchema.tables.map((t: any) => t.name));
          setDataAnalyticsTables(dataAnalyticsSchema.tables);
          
          const featureParam = searchParams.get('feature');
          const availableTables = dataAnalyticsSchema.tables.filter((table: any) => table.name !== 'mine_summary');
          console.log('Current feature param:', featureParam, 'selectedDataSource:', selectedDataSource);
          console.log('Available tables after filtering:', availableTables.map((t: any) => t.name));
          
          if (featureParam && availableTables.find((t: any) => t.name === featureParam)) {
            // URL parameter exists and is valid
            setSelectedDataSource(featureParam);
            await fetchDataForTable(featureParam);
          } else if (availableTables.length > 0) {
            // No valid URL parameter, use first available table as default
            const defaultTable = availableTables[0].name;
            console.log('Setting default table:', defaultTable);
            setSelectedDataSource(defaultTable);
            // Update URL to reflect default selection
            setSearchParams(prev => {
              const newParams = new URLSearchParams(prev);
              newParams.set('feature', defaultTable);
              return newParams;
            });
            await fetchDataForTable(defaultTable);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch data analytics tables:', error);
    } finally {
      setDataAnalyticsLoading(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDataSourceDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);



  // Get columns for parent level only (excluding nested data)
  const parentColumns = useMemo(() => {
    const allKeys = new Set<string>();
    data.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== 'children') {
          allKeys.add(key);
        }
      });
    });
    return Array.from(allKeys);
  }, [data]);

  // Use only the parent columns (no actions column needed for data display)
  const displayColumns = parentColumns;

  // Check if item or children match search
  const itemMatches = (item: DataItem, search: string): boolean => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return Object.values(item).some(value => 
      value && typeof value === 'string' && value.toLowerCase().includes(searchLower)
    ) || (item.children?.some(child => itemMatches(child, search)) ?? false);
  };

  // Auto-expand parents if children match search
  const autoExpandForSearch = (items: DataItem[]) => {
    const newExpanded = new Set(expandedRows);
    
    const traverse = (items: DataItem[], parentPath = '') => {
      items.forEach((item, index) => {
        const itemKey = `${parentPath}${index}`;
        
        if (item.children) {
          // Check if any child matches
          const hasMatchingChild = item.children.some(child => itemMatches(child, searchTerm));
          if (hasMatchingChild && searchTerm) {
            newExpanded.add(itemKey);
          }
          traverse(item.children, `${itemKey}-`);
        }
      });
    };
    
    traverse(items);
    setExpandedRows(newExpanded);
  };

  // Auto-expand when search changes
  useMemo(() => {
    if (searchTerm) {
      autoExpandForSearch(data);
    }
  }, [searchTerm, data]);


  
  const helpItems: HelpItem[] = [
    {
      icon: <Search size={12} />,
      title: "Search & Filter",
      description: "Filter feature views by name, schema, or description"
    },
    {
      icon: <RotateCw size={12} />,
      title: "Refresh Views",
      description: "Click refresh button to reload feature views from the API"
    },
    {
      icon: <Database size={12} />,
      title: "View Features",
      description: "Click on any row to expand and view features in that table"
    },
    {
      icon: <CheckCircle size={12} />,
      title: "Feature Selection",
      description: "Expand rows to see available features for ML model training"
    }
  ];

  const handleRefresh = async () => {
    setLoading(true);
    await fetchDataAnalyticsTables();
    if (selectedDataSource) {
      await fetchDataForTable(selectedDataSource);
    }
    setLoading(false);
  };

  // Filter data based on search term
  const filteredData = data.filter(item => itemMatches(item, searchTerm));

  const handleDataSourceChange = async (sourceValue: string) => {
    // Clear existing data immediately to prevent showing stale results
    setData([]);
    setSelectedDataSource(sourceValue);
    setDataSourceDropdownOpen(false);
    // Update URL parameter
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('feature', sourceValue);
      return newParams;
    });
    // Fetch data for the selected table
    await fetchDataForTable(sourceValue);
  };

  const handleOpenMineDetails = (mineId: string) => {
    setSelectedMineId(mineId);
    setMineDetailsOpen(true);
  };

  const handleLoadMore = async () => {
    if (!selectedDataSource || loadingMore || data.length >= totalRows) return;
    
    const newLimit = currentLimit + 100;
    setLoadingMore(true);
    
    try {
      const response = await fetch(`http://localhost:5174/api/v1/schemas/data_analytics/tables/${selectedDataSource}?limit=${newLimit}`);
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.data && Array.isArray(result.data)) {
          setData(result.data);
          setCurrentLimit(newLimit);
          setTotalRows(result.total_rows || result.data.length);
          setOffset(result.offset || 0);
        }
      }
    } catch (error) {
      console.error('Failed to load more data:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchDataForTable = async (tableName: string) => {
    if (!tableName) return;
    
    try {
      setLoading(true);
      // Reset limit when fetching new table
      setCurrentLimit(100);
      
      // Add 1 second delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await fetch(`http://localhost:5174/api/v1/schemas/data_analytics/tables/${tableName}?limit=100`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Fetched data for table:', tableName, result);
        
        // Convert table data to DataLibraryTable format
        if (result.data && Array.isArray(result.data) && result.data.length > 0) {
          // Simply use the data as-is, similar to DataLibraryTable
          setData(result.data);
          setTotalRows(result.total_rows || result.data.length);
          setOffset(result.offset || 0);
        } else {
          // Handle empty data case
          console.log('No data found for table:', tableName);
          setData([]);
          setTotalRows(0);
          setOffset(0);
        }
      } else {
        console.error('Failed to fetch table data, status:', response.status);
        setData([]);
      }
    } catch (error) {
      console.error('Failed to fetch table data:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data when selectedDataSource changes (but not during initialization)
  useEffect(() => {
    if (selectedDataSource && dataAnalyticsTables.length > 0) {
      // Only fetch if this is a change after initial load and URL is in sync
      const featureParam = searchParams.get('feature');
      if (featureParam === selectedDataSource) {
        fetchDataForTable(selectedDataSource);
      }
    }
  }, [selectedDataSource]);

  const selectedTable = dataAnalyticsTables.find(table => table.name === selectedDataSource);

  // Get icon based on table name
  const getTableIcon = (tableName: string) => {
    const name = tableName.toLowerCase();
    if (name.includes('t1')) return <FileText size={16} />;
    if (name.includes('t2')) return <Grid3X3 size={16} />;
    if (name.includes('t3')) return <Settings size={16} />;
    if (name.includes('t4')) return <Target size={16} />;
    if (name.includes('t5')) return <Zap size={16} />;
    if (name.includes('t6')) return <Shield size={16} />;
    if (name.includes('t7')) return <Star size={16} />;
    return <Database size={16} />;
  };

  // Create the title dropdown component
  const titleDropdown = (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDataSourceDropdownOpen(!dataSourceDropdownOpen)}
        className="flex items-center gap-2 text-xl font-semibold text-gray-800 dark:text-white/90 hover:text-gray-600 dark:hover:text-white transition-colors duration-200"
        disabled={dataAnalyticsLoading}
      >
        <span>
          {dataAnalyticsLoading ? 'Loading...' : 
           selectedTable ? selectedTable.name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 
           'Feature Store'}
        </span>
        <ChevronDown 
          size={16} 
          className={`transition-transform duration-200 ${dataSourceDropdownOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      
      {dataSourceDropdownOpen && !dataAnalyticsLoading && (
        <div className="absolute top-full left-0 mt-1 w-64 max-h-[calc(100vh-150px)] overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
          {dataAnalyticsTables.length > 0 ? (
            <div>
              {dataAnalyticsTables
                .filter(table => table.name !== 'mine_summary')
                .map((table, index, filteredTables) => {
                  const isLast = index === filteredTables.length - 1;
                  return (
                    <button
                      key={table.name}
                      onClick={() => handleDataSourceChange(table.name)}
                      className={`w-full px-4 py-2 text-sm font-normal text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-left transition-colors flex items-center gap-2 ${
                        !isLast ? 'border-b border-gray-100 dark:border-gray-800' : ''
                      }`}
                    >
                      {getTableIcon(table.name)}
                      {table.name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </button>
                  );
                })
              }
            </div>
          ) : (
            <div className="px-4 py-2 text-center text-gray-500 dark:text-gray-400 text-sm">
              <div>No data found</div>
              <div className="text-xs mt-1">No tables available in data_analytics schema</div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header 
        title={titleDropdown}
        description="Feature Engineering & Management"
        showSearch={true}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search feature views..."
        showRefresh={true}
        onRefresh={handleRefresh}
        helpCircleItems={helpItems}
      />
      <div className="px-6 pb-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden relative flex flex-col">
          <div className="overflow-auto max-h-[calc(100vh-186px)] flex-1">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600 w-16">
                    #
                  </th>
                  {displayColumns.map((column: string) => (
                    <th key={column} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600 whitespace-nowrap">
                      {column.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600 last:border-r-0 whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={displayColumns.length + 2} className="px-4 py-8 text-center">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Loader2 size={24} className="text-gray-500 dark:text-gray-400 animate-spin" />
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Loading data...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={displayColumns.length + 2} className="px-4 py-8 text-center">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Ban size={24} className="text-gray-500 dark:text-gray-400" />
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        No data found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                        Try selecting a different feature table or check your data source
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => {
                  const itemKey = String(index);
                  const isExpanded = expandedRows.has(itemKey);
                  const hasChildren = item.children && item.children.length > 0;
                  
                  return (
                    <>
                      {/* Main row */}
                      <tr 
                        key={itemKey} 
                        className={`transition-colors ${
                          isExpanded ? 'bg-gray-50 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        {/* Row number column */}
                        <td className="px-4 py-3 text-sm border-r border-gray-200 dark:border-gray-600 w-16">
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {offset + index + 1}
                          </span>
                        </td>
                        {displayColumns.map((column, colIndex) => {
                          const value = item[column];
                          const isFirstColumn = colIndex === 0;
                          
                          return (
                            <td key={column} className="px-4 py-3 text-sm border-r border-gray-200 dark:border-gray-600 last:border-r-0 whitespace-nowrap">
                              {column === 'has_grid_connection' ? (
                                <div className="text-gray-600 dark:text-gray-400">
                                  {value === true ? 'true' : 'false'}
                                </div>
                              ) : isFirstColumn ? (
                                <div className="text-gray-900 dark:text-white">
                                  <HighlightText text={String(value || '')} searchTerm={searchTerm} />
                                </div>
                              ) : (
                                <div className="text-gray-600 dark:text-gray-400">
                                  {value === null || value === undefined ? (
                                    '-'
                                  ) : Array.isArray(value) ? (
                                    <div className="flex flex-wrap gap-1">
                                      {value.slice(0, 3).map((v, i) => (
                                        <span key={i} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                          {String(v)}
                                        </span>
                                      ))}
                                      {value.length > 3 && (
                                        <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">+{value.length - 3}</span>
                                      )}
                                    </div>
                                  ) : typeof value === 'number' ? (
                                    <HighlightText text={value.toLocaleString()} searchTerm={searchTerm} />
                                  ) : (
                                    <HighlightText text={String(value)} searchTerm={searchTerm} />
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-sm border-r border-gray-200 dark:border-gray-600 last:border-r-0 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <StarButton
                              isStarred={savedMines.has(String(item.mine_id || ''))}
                              onToggle={() => {
                                const mineId = String(item.mine_id || '');
                                if (savedMines.has(mineId)) {
                                  setSavedMines(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(mineId);
                                    return newSet;
                                  });
                                } else {
                                  setSavedMines(prev => new Set(prev).add(mineId));
                                }
                              }}
                              size={16}
                              title={savedMines.has(String(item.mine_id || '')) ? 'Mine saved' : 'Save mine'}
                              className="p-1 hover:scale-110"
                            />
                            <MineDetailsButton
                              mineId={String(item.mine_id || '')}
                              onOpenDetails={handleOpenMineDetails}
                              size={14}
                            />
                          </div>
                        </td>
                      </tr>

                      {/* Expanded children rows */}
                      {hasChildren && isExpanded && (
                        <tr className="bg-gray-50/50 dark:bg-gray-800/30">
                          <td className="px-4 py-2"></td>
                          <td className="px-4 py-2"></td>
                          <td colSpan={displayColumns.length}>
                            <div className="flex flex-wrap gap-3 p-2">
                              {item.children!.map((child, childIndex) => (
                                <div key={childIndex} className="bg-white dark:bg-gray-800 rounded-lg py-3 px-6 border border-gray-200 dark:border-gray-600 shadow-sm w-fit">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Table className={`w-4 h-4 ${child.table_type === 'view' ? 'text-purple-500' : 'text-green-500'}`} />
                                    <span className="font-medium text-sm text-gray-900 dark:text-white">
                                      <HighlightText text={String(child.name || child.table_name || '')} searchTerm={searchTerm} />
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                    {child.table_type && (
                                      <div className="flex items-center gap-1">
                                        <span className="font-medium">Type:</span>
                                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                          child.table_type === 'view' 
                                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200' 
                                            : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                                        }`}>
                                          {child.table_type}
                                        </span>
                                      </div>
                                    )}
                                    {child.size && (
                                      <div>
                                        <span className="font-medium">Size:</span> {typeof child.size === 'number' ? child.size.toLocaleString() : child.size}
                                      </div>
                                    )}
                                    {child.columns && Array.isArray(child.columns) && (
                                      <div>
                                        <span className="font-medium">Columns:</span> {child.columns.length}
                                      </div>
                                    )}
                                    {child.schema && (
                                      <div>
                                        <span className="font-medium">Schema:</span> {child.schema}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
              </tbody>
            </table>
          </div>
          
          {!loading && (
            <div className="h-8 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600 flex items-center px-4 text-xs flex-shrink-0 gap-4">
              <span className="text-gray-600 dark:text-gray-300">
                {filteredData.length === 0 ?
                  `No data found` :
                  searchTerm ?
                    `Showing ${filteredData.length} from ${data.length} (${totalRows.toLocaleString()} total)` :
                    `Showing ${offset + filteredData.length} from ${totalRows.toLocaleString()} rows`
                }
              </span>
              {data.length < totalRows && !searchTerm && filteredData.length > 0 && (
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {loadingMore ? 'Loading...' : '(Load more)'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      <MineDetailsPanel
        isOpen={mineDetailsOpen}
        onClose={() => setMineDetailsOpen(false)}
        mine_id={selectedMineId}
      />
    </div>
  )
}