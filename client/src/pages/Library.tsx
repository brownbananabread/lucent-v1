
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router';
import { Database, ChevronDown, Search, Loader2, RotateCw, Plus, ArrowUp, ArrowDown, ChevronsUpDown, EyeOff, PanelLeftClose, PanelLeftOpen, X, Copy, PackagePlus, TrafficCone } from 'lucide-react';
import { useMineDetails } from '../contexts/MineDetailsContext';
import { useAlert } from '../contexts/AlertContext';
import Header from '../components/navigation/Header';
import LeftPanel from '../components/common/LeftPanel';
import MineDetailsButton from '../components/common/MineDetailsButton';
import StarButton from '../components/common/StarButton';
import { fetchRequest } from '../utils/fetch';

// Slim header component for when a table is selected
interface SlimTableHeaderProps {
  tableName: string;
  schemaPath: string;
  onRefresh: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  loading: boolean;
  onToggleColumnDropdown: () => void;
  savedFilter: 'all' | 'saved';
  onToggleStarFilter: () => void;
  isPanelLeftExpanded: boolean;
  onTogglePanelLeft: () => void;
}

const SlimTableHeader: React.FC<SlimTableHeaderProps> = ({
  tableName,
  onRefresh,
  searchTerm,
  onSearchChange,
  loading,
  onToggleColumnDropdown,
  savedFilter,
  onToggleStarFilter,
  isPanelLeftExpanded,
  onTogglePanelLeft
}) => {
  return (
    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0 rounded-t-xl">
      <div className="flex items-center justify-between">
        {/* Left side - Title info */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatTableTitle(tableName)}
            </h2>
          </div>
        </div>

        {/* Right side - Search and action buttons */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="flex w-64 items-center rounded-lg px-10 py-2 text-sm transition-all duration-200 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:bg-gray-200 dark:focus:bg-gray-700"
            />
          </div>
          <button
            onClick={onRefresh}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            title="Refresh"
            aria-label="Refresh"
            disabled={loading}
          >
            <RotateCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onToggleColumnDropdown}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            title="Hide/Show columns"
            data-column-dropdown
          >
            <EyeOff size={16} />
          </button>
          <StarButton
            isStarred={savedFilter === 'saved'}
            onToggle={onToggleStarFilter}
            size={16}
            title={savedFilter === 'saved' ? 'Show all items' : 'Show only saved items'}
          />
          <button
            onClick={onTogglePanelLeft}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            title={isPanelLeftExpanded ? "Collapse left panel" : "Expand left panel"}
          >
            {isPanelLeftExpanded ? (
              <PanelLeftClose size={16} />
            ) : (
              <PanelLeftOpen size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Highlight component for search functionality
function HighlightText({ text, searchTerm }: { text: string; searchTerm: string }) {
  if (!searchTerm) return <>{text}</>;
  
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, index) => 
        regex.test(part) ? (
          <mark key={index} className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

interface Schema {
  schema: string;
  tables: Table[];
}

interface Table {
  name: string;
  type: 'table' | 'view';
}

interface Database {
  name: string;
  expanded: boolean;
  datasets: Dataset[];
}

interface Dataset {
  name: string;
  type: 'table' | 'view';
  comment: string | null;
}

interface TableData {
  column_count: number;
  data: Record<string, any>[];
  limit: number;
  offset: number;
  returned_rows: number;
  row_count: number;
  table_description: string;
  table_name: string;
  table_type: string;
  total_rows: number;
}

const formatTableTitle = (tableName: string): string => {
  if (tableName?.startsWith('tx_')) {
    const name = tableName.substring(3);
    return `${name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} (T3)`;
  } else if (tableName?.startsWith('dim_')) {
    const name = tableName.substring(4);
    return `${name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} (Dimension)`;
  } else if (tableName?.startsWith('fact_')) {
    const name = tableName.substring(5);
    return `${name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} (Fact)`;
  }
  return tableName?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '';
};

// Save functionality for mines
const saveMineToStorage = (mineId: string): void => {
  const savedMines = getSavedMines();
  const timestamp = new Date().toISOString();
  
  const existingIndex = savedMines.findIndex(mine => mine.mine_id === mineId);
  if (existingIndex >= 0) {
    savedMines[existingIndex].timestamp = timestamp;
  } else {
    savedMines.push({ mine_id: mineId, timestamp });
  }
  
  localStorage.setItem('savedMines', JSON.stringify(savedMines));
};

const getSavedMines = (): Array<{ mine_id: string; timestamp: string }> => {
  const saved = localStorage.getItem('savedMines');
  return saved ? JSON.parse(saved) : [];
};



// Sidebar Component - identical to original LibrarySidebar
interface SidebarProps {
  isExpanded: boolean;
  schemas: Schema[];
  loading: boolean;
  refreshing?: boolean;
  onSelectTable: (schema: string, table: string) => void;
  selectedSchema: string | null;
  selectedTable: string | null;
  onRefresh: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isExpanded, schemas, loading, refreshing = false, onSelectTable, selectedSchema, selectedTable, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [databases, setDatabases] = useState<Database[]>([]);

  useEffect(() => {
    // Transform schemas to match original database structure
    const transformed: Database[] = schemas.map(item => ({
      name: item.schema,
      expanded: true,
      datasets: item.tables?.map(tableObj => ({
        name: typeof tableObj === 'string' ? tableObj : tableObj.name,
        type: typeof tableObj === 'string' ? 'table' : tableObj.type,
        comment: null
      })) || []
    }));
    setDatabases(transformed);
  }, [schemas]);

  const handleToggleDatabase = (dbName: string) => {
    setDatabases(prev => prev.map(db =>
      db.name === dbName ? { ...db, expanded: !db.expanded } : db
    ));
  };

  const handleSchemaClick = (schemaName: string) => {
    handleToggleDatabase(schemaName);
  };

  const truncateAtWord = (str: string, limit = 30): string => {
    if (str.length <= limit) return str;
    const truncated = str.slice(0, limit);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
  };

  const filteredSidebarDatabases = databases
    .map(db => {
      if (!db.datasets?.length) return null;
      
      const filteredDatasets = db.datasets.filter(dataset =>
        dataset.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const dbMatches = db.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (dbMatches) return { ...db, datasets: db.datasets };
      if (filteredDatasets.length > 0) return { ...db, datasets: filteredDatasets };
      return null;
    })
    .filter(Boolean) as Database[];

  return (
    <LeftPanel isExpanded={isExpanded}>
      <div className="flex flex-col h-full">
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 pb-4">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
              <input
                type="text"
                placeholder="Search schemas..."
                className="flex w-full items-center rounded-lg pl-10 py-2.5 text-sm transition-all duration-200 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none dark:focus:border-white/20 focus:bg-gray-100"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              title="Refresh search"
            >
              <RotateCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto flex flex-col">
          {loading || refreshing ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="w-16 h-16 mb-4 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Loader2 size={24} className="text-gray-500 dark:text-gray-400 animate-spin" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Loading database...</p>
            </div>
          ) : filteredSidebarDatabases.length === 0 && schemas.length > 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="w-16 h-16 mb-4 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <TrafficCone size={24} className="text-gray-500 dark:text-gray-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm text-center">No schemas found</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 text-center">
                Try adjusting your search...
              </p>
            </div>
          ) : (
            <div className="space-y-0 px-4">
              <ul className="flex flex-col gap-1.5">
                {filteredSidebarDatabases.map((database) => (
                  <li key={database.name}>
                    <button
                      onClick={() => handleSchemaClick(database.name)}
                      className={`flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 justify-between ${selectedSchema === database.name ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                    >
                      <div className="flex items-center">
                        <span className={`transition-colors ${selectedSchema === database.name ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
                          <Database className="w-[18px] h-[18px]" />
                        </span>
                        <span className="ml-3">{database.name}</span>
                      </div>
                      <ChevronDown
                        size={14}
                        className={`text-gray-400 transition-transform duration-200 dark:text-gray-500 ${database.expanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {database.expanded && database.datasets?.length > 0 && (
                      <div className="overflow-hidden transition-all duration-300">
                        <ul className="ml-4 mt-2 mb-2 border-l border-gray-200 dark:border-gray-700 pl-4 space-y-1">
                          {database.datasets.map((dataset) => (
                            <li key={dataset.name}>
                              <button
                                onClick={() => onSelectTable(database.name, dataset.name)}
                                className={`flex items-center rounded-md px-2 py-2 text-sm transition-all duration-150 w-full ${selectedTable === dataset.name && selectedSchema === database.name ? 'font-medium text-gray-900 bg-gray-50 dark:text-gray-100 dark:bg-gray-800/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800/30'}`}
                                title={dataset.name}
                              >
                                <span className="flex-1 text-left">{truncateAtWord(dataset.name, 15)}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </LeftPanel>
  );
};

// Schema Overview Component
interface SchemaOverviewProps {
  schemas: Schema[];
  loading: boolean;
  refreshing?: boolean;
  searchTerm: string;
  onSelectTable: (schema: string, table: string) => void;
}

const SchemaOverview: React.FC<SchemaOverviewProps> = ({ schemas, loading, refreshing = false, searchTerm, onSelectTable }) => {
  const filteredSchemas = schemas.filter(schema =>
    schema.schema.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSchemaRowClick = (schema: Schema) => {
    if (schema.tables && schema.tables.length > 0) {
      const firstTable = schema.tables[0];
      const tableName = typeof firstTable === 'string' ? firstTable : firstTable.name;
      onSelectTable(schema.schema, tableName);
    }
  };


  return (
    <div className="px-6">
      <div className="bg-white dark:bg-white/[0.03] rounded-lg border border-gray-200 dark:border-white/[0.05] overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-200 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Schema Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tables</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/[0.05]">
            {loading || refreshing || filteredSchemas.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    {loading || refreshing ? (
                      <Loader2 size={24} className="text-gray-500 dark:text-gray-400 animate-spin" />
                    ) : (
                      <TrafficCone size={24} className="text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {loading || refreshing ? 'Loading schemas...' : 'Opps, No schemas found!'}
                  </p>

                  {(!loading && !refreshing) && (
                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                      Try adjusting your search terms or check your data source
                    </p>
                  )}
                </td>
              </tr>
            ) : (
              filteredSchemas.map(schema => (
                <tr 
                  key={schema.schema} 
                  onClick={() => handleSchemaRowClick(schema)}
                  className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-800 dark:text-white/90 text-sm">{schema.schema}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-sm">
                    {schema.tables?.length || 0}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-sm">
                    Database Schema
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Data Table Component
interface DataTableProps {
  schemaName: string | null;
  tableName: string | null;
  searchTerm: string;
  savedFilter: 'all' | 'saved';
  onDataLoad?: (data: { description: string; tableType: string }) => void;
  onColumnsLoad?: (columns: string[]) => void;
  onSearchChange: (term: string) => void;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onRefreshComplete?: () => void;
  onLoadMoreComplete?: () => void;
  onToggleColumnDropdown?: () => void;
  showColumnDropdown?: boolean;
  columns?: string[];
  hiddenColumns?: Set<string>;
  onToggleColumnVisibility?: (column: string) => void;
  hideRowNumbers?: boolean;
  onToggleRowNumbers?: () => void;
  refreshing?: boolean;
  loadingMore?: boolean;
  onOpenJsonModal?: () => void;
}

const DataTable: React.FC<DataTableProps> = ({
  schemaName,
  tableName,
  searchTerm,
  savedFilter,
  onDataLoad,
  onRefresh: propOnRefresh,
  onLoadMore: propOnLoadMore,
  onRefreshComplete,
  onLoadMoreComplete,
  columns: propColumns = [],
  hiddenColumns: propHiddenColumns = new Set(),
  hideRowNumbers: propHideRowNumbers = false,
  refreshing: propRefreshing = false,
  loadingMore: propLoadingMore = false,
  onColumnsLoad,
  onOpenJsonModal
}) => {
  const [data, setData] = useState<TableData | null>(null);
  const [showLoading, setShowLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMines, setSavedMines] = useState<Set<string>>(new Set());
  const [currentOffset, setCurrentOffset] = useState<number>(0);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [allRows, setAllRows] = useState<Record<string, any>[]>([]);
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [showColumnDropdown, setShowColumnDropdown] = useState<boolean>(false);
  const [hideRowNumbers, setHideRowNumbers] = useState<boolean>(false);
  const [expandedRowData, setExpandedRowData] = useState<Set<string>>(new Set());
  const [copiedRows, setCopiedRows] = useState<Set<string>>(new Set());
  const { openMineDetails } = useMineDetails();

  useEffect(() => {
    const fetchData = async () => {
      if (!schemaName || !tableName) {
        setData(null);
        setShowLoading(false);
        setError(null);
        setAllRows([]);
        setCurrentOffset(0);
        setSortConfig(null);
        // Clear columns when no table selected
        if (onColumnsLoad) {
          onColumnsLoad([]);
        }
        return;
      }
      
      // Clear previous data immediately when navigating to new table
      setData(null);
      setError(null);
      setAllRows([]);
      setCurrentOffset(0);
      setSortConfig(null);
      setHiddenColumns(new Set());
      setHideRowNumbers(false);
      
      // Clear columns immediately when loading starts
      if (onColumnsLoad) {
        onColumnsLoad([]);
      }
      
      // Show loading immediately when navigating to new table
      setShowLoading(true);
      
      // Add 1 second delay before making the request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Retry logic for table data
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          const url = `http://localhost:5174/api/v1/schemas/${encodeURIComponent(schemaName)}/tables/${encodeURIComponent(tableName)}?limit=100&offset=0`;
          const response = await fetchRequest({ method: 'GET', url });
          
          if (response?.status >= 200 && response.status < 300) {
            setData(response.body);
            const rows = response.body.data || [];
            setAllRows(rows);
            setCurrentOffset(100);
            
            // Pass columns to parent if available
            if (rows.length > 0 && onColumnsLoad) {
              const columns = Object.keys(rows[0]);
              onColumnsLoad(columns);
            }
            
            if (onDataLoad && response.body) {
              onDataLoad({
                description: response.body.table_description || '',
                tableType: response.body.table_type || ''
              });
            }
            break; // Success, exit retry loop
          } else if (response.status === 400 && retryCount < maxRetries - 1) {
            // Retry on 400 errors, but wait a bit
            await new Promise(resolve => setTimeout(resolve, 500));
            retryCount++;
            continue;
          } else {
            setError(`Failed to load table data (Status: ${response.status})`);
            break;
          }
        } catch (err) {
          retryCount++;
          if (retryCount >= maxRetries) {
            console.error('DataTable fetch error after retries:', err);
            setError(`Error fetching table data: ${err instanceof Error ? err.message : 'Unknown error'}`);
          } else {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      setShowLoading(false);
    };

    fetchData();
  }, [schemaName, tableName]);


  useEffect(() => {
    // Load saved mines from localStorage on component mount
    const saved = getSavedMines();
    setSavedMines(new Set(saved.map(mine => mine.mine_id)));
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showColumnDropdown && !target.closest('.relative')) {
        setShowColumnDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColumnDropdown]);

  const handleSaveMine = (mineId: string) => {
    const wasAlreadySaved = savedMines.has(mineId);

    if (wasAlreadySaved) {
      // Remove from saved mines
      const savedMinesList = getSavedMines();
      const filteredMines = savedMinesList.filter(mine => mine.mine_id !== mineId);
      localStorage.setItem('savedMines', JSON.stringify(filteredMines));
      setSavedMines(prev => {
        const newSet = new Set(prev);
        newSet.delete(mineId);
        return newSet;
      });
    } else {
      // Add to saved mines
      saveMineToStorage(mineId);
      setSavedMines(prev => new Set(prev).add(mineId));
    }
  };

  const toggleRowDataExpansion = (rowIndex: number, column: string) => {
    const rowKey = `${rowIndex}-${column}`;
    setExpandedRowData(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowKey)) {
        newSet.delete(rowKey);
      } else {
        newSet.add(rowKey);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (data: any, event: React.MouseEvent, rowIndex: number, column: string) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));

      // Add visual feedback
      const rowKey = `${rowIndex}-${column}`;
      setCopiedRows(prev => new Set(prev).add(rowKey));

      // Remove the feedback after animation
      setTimeout(() => {
        setCopiedRows(prev => {
          const newSet = new Set(prev);
          newSet.delete(rowKey);
          return newSet;
        });
      }, 1000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };



  // Custom column ordering: mine_id first, created_at and updated_at last
  const orderColumns = (columnList: string[]): string[] => {
    const orderedColumns = [...columnList];
    
    // Remove specific columns from their current positions
    const mineIdIndex = orderedColumns.indexOf('mine_id');
    const createdAtIndex = orderedColumns.indexOf('created_at');
    const updatedAtIndex = orderedColumns.indexOf('updated_at');
    
    let mineId = null;
    let createdAt = null;
    let updatedAt = null;
    
    // Extract the columns
    if (mineIdIndex !== -1) {
      mineId = orderedColumns.splice(mineIdIndex, 1)[0];
    }
    if (createdAtIndex !== -1) {
      createdAt = orderedColumns.splice(createdAtIndex - (mineIdIndex !== -1 && mineIdIndex < createdAtIndex ? 1 : 0), 1)[0];
    }
    if (updatedAtIndex !== -1) {
      updatedAt = orderedColumns.splice(
        updatedAtIndex - 
        (mineIdIndex !== -1 && mineIdIndex < updatedAtIndex ? 1 : 0) - 
        (createdAtIndex !== -1 && createdAtIndex < updatedAtIndex ? 1 : 0), 
        1
      )[0];
    }
    
    // Rebuild the array with custom order
    const result = [];
    if (mineId) result.push(mineId);
    result.push(...orderedColumns);
    if (createdAt) result.push(createdAt);
    if (updatedAt) result.push(updatedAt);
    
    return result;
  };

  const columns = allRows.length > 0 ? orderColumns(Object.keys(allRows[0])) : orderColumns(propColumns);
  const visibleColumns = columns.filter(column => !(propHiddenColumns.size > 0 ? propHiddenColumns : hiddenColumns).has(column));


  // Handle column sorting
  const handleSort = (column: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    
    if (sortConfig && sortConfig.column === column) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = null;
      }
    }
    
    if (direction === null) {
      setSortConfig(null);
    } else {
      setSortConfig({ column, direction });
    }
  };

  const getSortIcon = (column: string) => {
    if (!sortConfig || sortConfig.column !== column) {
      return <ChevronsUpDown size={12} className="ml-1 text-gray-400" />;
    }
    
    if (sortConfig.direction === 'asc') {
      return <ArrowUp size={12} className="ml-1 text-gray-600 dark:text-gray-300" />;
    } else {
      return <ArrowDown size={12} className="ml-1 text-gray-600 dark:text-gray-300" />;
    }
  };

  // Sort rows if needed
  let sortedRows = [...allRows];
  if (sortConfig) {
    sortedRows.sort((a, b) => {
      const aValue = a[sortConfig.column];
      const bValue = b[sortConfig.column];
      
      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bValue === null || bValue === undefined) return sortConfig.direction === 'asc' ? -1 : 1;
      
      // Handle numeric values
      const aNum = parseFloat(String(aValue));
      const bNum = parseFloat(String(bValue));
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      // Handle string values
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (sortConfig.direction === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
    });
  }

  // Filter rows based on search term and saved status
  const filteredRows = sortedRows.filter(row => {
    // First filter by search term
    const matchesSearch = !searchTerm || Object.values(row).some(value => 
      String(value || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (!matchesSearch) return false;
    
    // Then filter by saved status
    const mineId = row.mine_id || row.id;
    const isSaved = mineId && savedMines.has(String(mineId));
    
    if (savedFilter === 'saved' && !isSaved) return false;
    
    return true;
  });

  const getCellValue = (row: Record<string, any>, column: string): string => {
    const value = row[column];
    if (value === null || value === undefined) return '-';

    if (Array.isArray(value)) {
      // Handle array of objects properly
      if (value.length === 0) return '[]';
      if (value.some(item => typeof item === 'object' && item !== null)) {
        // If array contains objects, stringify the whole array
        return JSON.stringify(value);
      } else {
        // If array contains primitives, join them
        return value.join(', ');
      }
    }

    if (typeof value === 'object') return JSON.stringify(value);

    if (typeof value === 'string' && (column.toLowerCase().includes('date') || column.toLowerCase().includes('updated') || column.toLowerCase().includes('created'))) {
      const date = new Date(value);
      return isNaN(date.getTime()) ? value : date.toLocaleString();
    }

    return String(value);
  };

  const isJsonValue = (value: any): boolean => {
    if (typeof value === 'object' && value !== null) return true;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
          (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        // Try to parse to confirm it's valid JSON
        try {
          JSON.parse(trimmed);
          return true;
        } catch {
          return false;
        }
      }
    }
    return false;
  };

  const parseJsonValue = (value: any): any => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  };


  const handleLoadMore = async () => {
    if (!schemaName || !tableName || loadingMore) return;
    
    setLoadingMore(true);
    
    try {
      const url = `http://localhost:5174/api/v1/schemas/${encodeURIComponent(schemaName)}/tables/${encodeURIComponent(tableName)}?limit=100&offset=${currentOffset}`;
      const response = await fetchRequest({ method: 'GET', url });
      
      if (response?.status >= 200 && response.status < 300) {
        const newRows = response.body.data || [];
        setAllRows(prev => [...prev, ...newRows]);
        setCurrentOffset(prev => prev + 100);
        
        // Update the main data object with new total info
        if (data) {
          setData({
            ...data,
            data: [...allRows, ...newRows],
            returned_rows: allRows.length + newRows.length
          });
        }
      } else {
        setError(`Failed to load more data (Status: ${response.status})`);
      }
    } catch (err) {
      console.error('Load more error:', err);
      setError(`Error loading more data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoadingMore(false);
      if (onLoadMoreComplete) {
        onLoadMoreComplete();
      }
    }
  };

  const handleDataRefresh = async () => {
    if (!schemaName || !tableName) return;
    
    setRefreshing(true);
    setError(null);
    
    // Remember current offset to maintain pagination
    const totalRowsToLoad = currentOffset;
    
    // Add 1 second delay to show the refresh state
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      // Fetch all data up to current offset in batches
      let allRefreshedRows: Record<string, any>[] = [];
      let currentBatchOffset = 0;
      const batchSize = 100;
      
      while (currentBatchOffset < totalRowsToLoad) {
        const url = `http://localhost:5174/api/v1/schemas/${encodeURIComponent(schemaName)}/tables/${encodeURIComponent(tableName)}?limit=${batchSize}&offset=${currentBatchOffset}`;
        const response = await fetchRequest({ method: 'GET', url });
        
        if (response?.status >= 200 && response.status < 300) {
          const batchData = response.body.data || [];
          allRefreshedRows = [...allRefreshedRows, ...batchData];
          
          // Update data object with first response for metadata
          if (currentBatchOffset === 0) {
            setData(response.body);
            if (onDataLoad && response.body) {
              onDataLoad({
                description: response.body.table_description || '',
                tableType: response.body.table_type || ''
              });
            }
          }
          
          // If we got fewer rows than requested, we've reached the end
          if (batchData.length < batchSize) {
            break;
          }
          
          currentBatchOffset += batchSize;
        } else {
          setError(`Failed to load table data (Status: ${response.status})`);
          return;
        }
      }
      
      setAllRows(allRefreshedRows);
      
    } catch (err) {
      console.error('DataTable refresh error:', err);
      setError(`Error refreshing table data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRefreshing(false);
      if (onRefreshComplete) {
        onRefreshComplete();
      }
    }
  };

  // Use external states when provided, fallback to internal states
  const actualHideRowNumbers = propHideRowNumbers !== undefined ? propHideRowNumbers : hideRowNumbers;
  const actualRefreshing = propRefreshing !== undefined ? propRefreshing : refreshing;

  // Effect to handle external refresh trigger
  useEffect(() => {
    if (propRefreshing && propOnRefresh) {
      handleDataRefresh();
    }
  }, [propRefreshing]);

  // Effect to handle external load more trigger  
  useEffect(() => {
    if (propLoadingMore && propOnLoadMore) {
      handleLoadMore();
    }
  }, [propLoadingMore]);

  return (
    <div className="h-full">
      {/* White component container */}
      <div className="bg-white dark:bg-gray-900 overflow-hidden relative flex flex-col h-full">
        {/* Show centered loading state */}
        {showLoading || actualRefreshing ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Loader2 size={24} className="text-gray-500 dark:text-gray-400 animate-spin" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Loading data...
              </p>
            </div>
          </div>
        ) : !showLoading && !actualRefreshing && filteredRows.length === 0 ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <TrafficCone size={24} className="text-gray-500 dark:text-gray-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {error ? error : 'Oops, No data found!'}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                {error ? 'Please try refreshing or check your connection' :
                 tableName === 'dim_places_api' ? 'Provide a list of mines to populate this table' :
                 searchTerm ? 'Try adjusting your search terms or filters' : 'Try selecting a different table or check your data source'}
              </p>
              {tableName === 'dim_places_api' && !error && onOpenJsonModal && (
                <div className="mt-3 flex justify-center">
                  <button
                    onClick={onOpenJsonModal}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <PackagePlus className="w-4 h-4" />
                    Add Mines
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-auto flex-1">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              {/* Only show table headers if we have data and columns */}
              {!showLoading && !actualRefreshing && data && visibleColumns.length > 0 && (
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                  <tr>
                    {!actualHideRowNumbers && (
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600 w-16">
                        #
                      </th>
                    )}
                    {visibleColumns.map((column, index) => (
                      <th key={index} className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600 whitespace-nowrap">
                        <button
                          onClick={() => handleSort(column)}
                          className="flex items-center hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          {column.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          {getSortIcon(column)}
                        </button>
                      </th>
                    ))}
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600 last:border-r-0 whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
              )}
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {
                  filteredRows.map((row, rowIndex) => {
                    const mineId = row.mine_id || row.id;
                    const isSaved = mineId && savedMines.has(String(mineId));

                    return (
                      <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        {!actualHideRowNumbers && (
                          <td className="px-4 py-2 text-sm border-r border-gray-200 dark:border-gray-600 w-16">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              {rowIndex + 1}
                            </span>
                          </td>
                        )}
                        {visibleColumns.map((column, cellIndex) => {
                          const value = row[column];
                          const isFirstColumn = cellIndex === 0;
                          const isJson = isJsonValue(value);
                          const rowKey = `${rowIndex}-${column}`;

                          return (
                            <td key={cellIndex} className="px-4 py-2 text-sm border-r border-gray-200 dark:border-gray-600 max-w-md">
                              {isFirstColumn ? (
                                <div className="text-gray-900 dark:text-white">
                                  {value === null || value === undefined ? (
                                    '-'
                                  ) : isJson ? (
                                    <div className="relative">
                                      <button
                                        onClick={() => toggleRowDataExpansion(rowIndex, column)}
                                        className="font-mono text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 pr-8 rounded w-full text-left transition-colors cursor-pointer"
                                      >
                                        {expandedRowData.has(rowKey) ? (
                                          <pre className="whitespace-pre-wrap break-words text-xs leading-tight max-w-full overflow-auto">
                                            <HighlightText text={JSON.stringify(parseJsonValue(value), null, 2)} searchTerm={searchTerm} />
                                          </pre>
                                        ) : (
                                          <span className="overflow-hidden block truncate">
                                            <HighlightText text={typeof value === 'string' ? value : JSON.stringify(value)} searchTerm={searchTerm} />
                                          </span>
                                        )}
                                      </button>
                                      {expandedRowData.has(rowKey) ? (
                                        <button
                                          onClick={(e) => copyToClipboard(parseJsonValue(value), e, rowIndex, column)}
                                          className={`absolute top-2 right-2 p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-all duration-200 ${
                                            copiedRows.has(rowKey)
                                              ? 'scale-110 bg-green-100 dark:bg-green-900'
                                              : ''
                                          }`}
                                          title="Copy JSON"
                                        >
                                          <Copy
                                            size={12}
                                            className={`transition-colors duration-200 ${
                                              copiedRows.has(rowKey)
                                                ? 'text-green-600 dark:text-green-400'
                                                : 'text-gray-600 dark:text-gray-400'
                                            }`}
                                          />
                                        </button>
                                      ) : (
                                        <ChevronDown
                                          size={12}
                                          className="absolute top-2.5 right-2.5 text-gray-600 dark:text-gray-400 pointer-events-none"
                                        />
                                      )}
                                    </div>
                                  ) : (
                                    <div className="truncate">
                                      <HighlightText text={getCellValue(row, column)} searchTerm={searchTerm} />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-gray-600 dark:text-gray-400">
                                  {value === null || value === undefined ? (
                                    '-'
                                  ) : isJson ? (
                                    <div className="relative">
                                      <button
                                        onClick={() => toggleRowDataExpansion(rowIndex, column)}
                                        className="font-mono text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 pr-8 rounded w-full text-left transition-colors cursor-pointer"
                                      >
                                        {expandedRowData.has(rowKey) ? (
                                          <pre className="whitespace-pre-wrap break-words text-xs leading-tight max-w-full overflow-auto">
                                            <HighlightText text={JSON.stringify(parseJsonValue(value), null, 2)} searchTerm={searchTerm} />
                                          </pre>
                                        ) : (
                                          <span className="overflow-hidden block truncate">
                                            <HighlightText text={typeof value === 'string' ? value : JSON.stringify(value)} searchTerm={searchTerm} />
                                          </span>
                                        )}
                                      </button>
                                      {expandedRowData.has(rowKey) ? (
                                        <button
                                          onClick={(e) => copyToClipboard(parseJsonValue(value), e, rowIndex, column)}
                                          className={`absolute top-2 right-2 p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-all duration-200 ${
                                            copiedRows.has(rowKey)
                                              ? 'scale-110 bg-green-100 dark:bg-green-900'
                                              : ''
                                          }`}
                                          title="Copy JSON"
                                        >
                                          <Copy
                                            size={12}
                                            className={`transition-colors duration-200 ${
                                              copiedRows.has(rowKey)
                                                ? 'text-green-600 dark:text-green-400'
                                                : 'text-green-600 dark:text-gray-400'
                                            }`}
                                          />
                                        </button>
                                      ) : (
                                        <ChevronDown
                                          size={12}
                                          className="absolute top-2.5 right-2.5 text-gray-600 dark:text-gray-400 pointer-events-none"
                                        />
                                      )}
                                    </div>
                                  ) : (
                                    <div className="truncate">
                                      <HighlightText text={getCellValue(row, column)} searchTerm={searchTerm} />
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-2 text-sm border-r border-gray-200 dark:border-gray-600 last:border-r-0 max-w-md">
                          {mineId && (
                            <div className="flex items-center gap-2">
                              <StarButton
                                isStarred={isSaved}
                                onToggle={() => handleSaveMine(String(mineId))}
                                size={16}
                                title={isSaved ? 'Mine saved' : 'Save mine'}
                              />
                              <MineDetailsButton
                                mineId={String(mineId)}
                                onOpenDetails={openMineDetails}
                                title="Open mine details"
                                size={14}
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            </div>

            {/* Footer - only show when data is loaded and not loading/refreshing */}
            {!showLoading && !actualRefreshing && data && !error && filteredRows.length > 0 && (
              <div className="h-8 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600 flex items-center px-4 text-xs text-gray-600 dark:text-gray-300 flex-shrink-0 gap-4">
                <span>
                  {searchTerm ?
                    `Showing ${filteredRows.length} from ${allRows.length} loaded rows (${data?.total_rows?.toLocaleString() || 0} total)` :
                    `Showing ${allRows.length} rows from ${data?.total_rows?.toLocaleString() || 0} (total)`
                  }
                </span>
                {allRows.length < (data?.total_rows || 0) && !searchTerm && (
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
          </>
        )}
      </div>
    </div>
);
};

// JSON Mine ID Form Component
interface JsonMineIdFormProps {
  onSubmit: (jsonData: string) => Promise<void>;
  onCancel: () => void;
}

const JsonMineIdForm: React.FC<JsonMineIdFormProps> = ({ onSubmit, onCancel }) => {
  const [jsonInput, setJsonInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const { showAlert } = useAlert();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Validate JSON
      JSON.parse(jsonInput);
      setIsSubmitting(true);
      await onSubmit(jsonInput);

      showAlert({
        variant: 'success',
        title: 'Success',
        message: 'Mine IDs have been successfully added to the Places API table.'
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid JSON format. Please check your input.';

      // Show user-friendly error message in the alert
      let userFriendlyMessage = 'An error occurred while processing the mine IDs.';
      if (errorMessage.includes('Invalid format') || errorMessage.includes('Data must be an array') || errorMessage.includes('No valid mine IDs')) {
        userFriendlyMessage = errorMessage;
      } else if (errorMessage.includes('No mine locations found')) {
        userFriendlyMessage = 'No mine locations found for the provided mine IDs with valid coordinates.';
      } else if (errorMessage.includes('Failed to populate table')) {
        userFriendlyMessage = 'Failed to populate the Places API table. Please check your mine IDs and try again.';
      }

      setError(''); // Don't show technical error in modal

      showAlert({
        variant: 'error',
        title: 'Error',
        message: userFriendlyMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 flex flex-col">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Mine IDs (JSON Array of Objects)
        </label>
        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder={`[\n  {\n    "mine_id": "mine_id_1"\n  },\n  {\n    "mine_id": "mine_id_2"\n  },\n  {\n    "mine_id": "mine_id_3"\n  }\n]`}
          className="flex-1 w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md resize-none focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 p-4 font-mono"
          required
        />
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-600 mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !jsonInput.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors disabled:cursor-not-allowed"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackagePlus className="w-4 h-4" />}
          {isSubmitting ? 'Loading...' : 'Submit'}
        </button>
      </div>
    </form>
  );
};

// Main Component
const SimplifiedLibraryPage: React.FC = () => {
  const params = useParams<{ schema?: string; table?: string }>();
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshingSchemas, setRefreshingSchemas] = useState<boolean>(false);
  const [refreshingMain, setRefreshingMain] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(() => {
    const savedState = localStorage.getItem('library-sidebar-expanded');
    return savedState !== null ? JSON.parse(savedState) : true;
  });
  const [tableData, setTableData] = useState<{ description: string; tableType: string } | null>(null);
  const [savedFilter, setSavedFilter] = useState<'all' | 'saved'>('all');
  
  // States for table controls that need to be in header
  const [showColumnDropdown, setShowColumnDropdown] = useState<boolean>(false);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [hideRowNumbers, setHideRowNumbers] = useState<boolean>(false);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [tableRefreshing, setTableRefreshing] = useState<boolean>(false);
  const [tableLoadingMore, setTableLoadingMore] = useState<boolean>(false);
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);

  // Handle body overflow for modal
  useEffect(() => {
    if (showJsonModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showJsonModal]);
  
  const selectedSchema = params.schema || null;
  const selectedTable = params.table || null;
  

  // Initial fetch schemas (sidebar loading state)
  const fetchSchemas = useCallback(async () => {
    setLoading(true);
    console.log('Fetching schemas...'); // Debug log
    
    // Add 0.5 second delay to show the loading state
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Retry logic for schemas
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const response = await fetchRequest({ method: 'GET', url: 'http://localhost:5174/api/v1/schemas/tables' });
        console.log('API Response:', response?.status, response?.body); // Debug log
        if (response?.status >= 200 && response.status < 300 && Array.isArray(response.body)) {
          const transformed: Schema[] = response.body.map((item: any) => {
            let tables = item.tables.map((tableObj: any) => ({
              name: typeof tableObj === 'string' ? tableObj : tableObj.name,
              type: typeof tableObj === 'string' ? 'table' : tableObj.type,
            }));
            
            // Filter data_analytics schema to show only mine_summary table if it exists
            if (item.schema === 'data_analytics') {
              const originalCount = tables.length;
              tables = tables.filter((table: any) => table.name === 'mine_summary');
              console.log(`data_analytics schema: ${originalCount} tables -> ${tables.length} after filter`);
            }
            
            return {
              schema: item.schema,
              tables
            };
          });
          setSchemas(transformed);
          break; // Success, exit retry loop
        } else if (retryCount < maxRetries - 1) {
          // Retry on non-success status
          await new Promise(resolve => setTimeout(resolve, 500));
          retryCount++;
          continue;
        }
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          console.error('Failed to fetch schemas after retries:', error);
        } else {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    setLoading(false);
    console.log('fetchSchemas completed'); // Debug log
  }, []);

  // Refresh schemas (only affects sidebar)
  const refreshSchemas = useCallback(async () => {
    setRefreshingSchemas(true);
    
    // Add 0.5 second delay to show the refresh state
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Retry logic for schema refresh
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const response = await fetchRequest({ method: 'GET', url: 'http://localhost:5174/api/v1/schemas/tables' });
        if (response?.status >= 200 && response.status < 300 && Array.isArray(response.body)) {
          const transformed: Schema[] = response.body.map((item: any) => {
            let tables = item.tables.map((tableObj: any) => ({
              name: typeof tableObj === 'string' ? tableObj : tableObj.name,
              type: typeof tableObj === 'string' ? 'table' : tableObj.type,
            }));
            
            // Filter data_analytics schema to show only mine_summary table if it exists
            if (item.schema === 'data_analytics') {
              const originalCount = tables.length;
              tables = tables.filter((table: any) => table.name === 'mine_summary');
              console.log(`data_analytics schema: ${originalCount} tables -> ${tables.length} after filter`);
            }
            
            return {
              schema: item.schema,
              tables
            };
          });
          setSchemas(transformed);
          break; // Success, exit retry loop
        } else if (retryCount < maxRetries - 1) {
          // Retry on non-success status
          await new Promise(resolve => setTimeout(resolve, 500));
          retryCount++;
          continue;
        }
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          console.error('Failed to refresh schemas after retries:', error);
        } else {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    setRefreshingSchemas(false);
  }, []);

  // Refresh main content (schema overview table only)
  const refreshMainContent = useCallback(async () => {
    setRefreshingMain(true);
    
    // Add 0.5 second delay to show the refresh state
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Retry logic for main content refresh
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const response = await fetchRequest({ method: 'GET', url: 'http://localhost:5174/api/v1/schemas/tables' });
        if (response?.status >= 200 && response.status < 300 && Array.isArray(response.body)) {
          const transformed: Schema[] = response.body.map((item: any) => {
            let tables = item.tables.map((tableObj: any) => ({
              name: typeof tableObj === 'string' ? tableObj : tableObj.name,
              type: typeof tableObj === 'string' ? 'table' : tableObj.type,
            }));
            
            // Filter data_analytics schema to show only mine_summary table if it exists
            if (item.schema === 'data_analytics') {
              const originalCount = tables.length;
              tables = tables.filter((table: any) => table.name === 'mine_summary');
              console.log(`data_analytics schema: ${originalCount} tables -> ${tables.length} after filter`);
            }
            
            return {
              schema: item.schema,
              tables
            };
          });
          setSchemas(transformed);
          break; // Success, exit retry loop
        } else if (retryCount < maxRetries - 1) {
          // Retry on non-success status
          await new Promise(resolve => setTimeout(resolve, 500));
          retryCount++;
          continue;
        }
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          console.error('Failed to refresh main content after retries:', error);
        } else {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    setRefreshingMain(false);
  }, []);

  useEffect(() => {
    fetchSchemas();
  }, [fetchSchemas]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Check if click is outside both the button and the dropdown
      if (showColumnDropdown && 
          !target.closest('[data-column-dropdown]') && 
          !target.closest('.column-dropdown-content')) {
        setShowColumnDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColumnDropdown]);

  // Reset table state when changing tables
  useEffect(() => {
    if (selectedSchema && selectedTable) {
      setHiddenColumns(new Set());
      setHideRowNumbers(false);
      setShowColumnDropdown(false);
      setTableColumns([]);
      setTableData(null); // Clear table metadata
    }
  }, [selectedSchema, selectedTable]);

  const handleSelectTable = (schema: string, table: string) => {
    setTableData(null); // Clear table data when selecting new table
    window.location.href = `/library/${encodeURIComponent(schema)}/${encodeURIComponent(table)}`;
  };

  const handleDataLoad = useCallback((data: { description: string; tableType: string }) => {
    setTableData(data);
  }, []);

  const handleColumnsLoad = useCallback((columns: string[]) => {
    setTableColumns(columns);
  }, []);

  // Table control handlers
  const handleToggleColumnDropdown = useCallback(() => {
    setShowColumnDropdown(!showColumnDropdown);
  }, [showColumnDropdown]);

  const handleToggleColumnVisibility = useCallback((column: string) => {
    // Prevent hiding mine_id column as it's needed for functionality
    if (column === 'mine_id' || column === 'id') {
      return;
    }
    
    setHiddenColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(column)) {
        newSet.delete(column);
      } else {
        newSet.add(column);
      }
      return newSet;
    });
  }, []);

  const handleToggleRowNumbers = useCallback(() => {
    setHideRowNumbers(!hideRowNumbers);
  }, [hideRowNumbers]);

  const handleTableRefresh = useCallback(async () => {
    setTableRefreshing(true);
    // Trigger the actual refresh functionality - this will be picked up by DataTable
    // The DataTable component will handle the actual API call and set refreshing back to false
  }, []);

  const handleTableLoadMore = useCallback(async () => {
    setTableLoadingMore(true);
    // Trigger the actual load more functionality - this will be picked up by DataTable  
    // The DataTable component will handle the actual API call and set loadingMore back to false
  }, []);

  const handleToggleStarFilter = useCallback(() => {
    if (savedFilter === 'saved') {
      setSavedFilter('all');
    } else {
      setSavedFilter('saved');
    }
  }, [savedFilter]);

  const handleRefreshComplete = useCallback(() => {
    setTableRefreshing(false);
  }, []);

  const handleLoadMoreComplete = useCallback(() => {
    setTableLoadingMore(false);
  }, []);

  const handleJsonSubmit = useCallback(async (jsonData: string) => {
    const parsedData = JSON.parse(jsonData);

    // Extract mine_ids from the array of objects
    let mineIds: string[];
    if (Array.isArray(parsedData)) {
      // Handle both formats: array of strings or array of objects with mine_id property
      mineIds = parsedData.map(item => {
        if (typeof item === 'string') {
          return item;
        } else if (typeof item === 'object' && item.mine_id) {
          return item.mine_id;
        } else {
          throw new Error('Invalid format: Each item must be a string or an object with a mine_id property');
        }
      });
    } else {
      throw new Error('Data must be an array');
    }

    if (mineIds.length === 0) {
      throw new Error('No valid mine IDs found in the provided data');
    }

    // Call API to populate dim_places_api with the mine_ids
    const response = await fetchRequest({
      method: 'POST',
      url: `http://localhost:5174/api/v1/schemas/${encodeURIComponent(selectedSchema || '')}/tables/${encodeURIComponent(selectedTable || '')}/populate`,
      data: { mine_ids: mineIds }
    });

    if (response?.status >= 200 && response.status < 300) {
      setShowJsonModal(false);
      // Refresh the table data
      handleTableRefresh();
    } else {
      const errorMessage = response?.body?.message || 'Unknown error occurred';
      throw new Error(`Failed to populate table: ${errorMessage} (Status: ${response?.status})`);
    }
  }, [selectedSchema, selectedTable, handleTableRefresh]);


  const toggleSidebar = useCallback(() => {
    const newState = !isSidebarExpanded;
    setIsSidebarExpanded(newState);
    localStorage.setItem('library-sidebar-expanded', JSON.stringify(newState));
  }, [isSidebarExpanded]);

  const isTableView = selectedSchema && selectedTable;
  const title = isTableView ? formatTableTitle(selectedTable) : 'Data Library';
  const description = isTableView 
    ? (tableData?.description || 'Loading description...')
    : `${schemas.length} schemas`;

  const getHeaderProps = () => {
    if (isTableView) {
      return {
        title,
        description,
        badge: tableData?.tableType ? (
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 rounded-md">
            {tableData.tableType.toUpperCase()}
          </span>
        ) : null,
        breadcrumbs: [
          { label: selectedSchema?.toUpperCase() , url: `/library` },
          { label: selectedTable?.toUpperCase() }
        ],
        showBackButton: true,
        backButtonUrl: '/library',
        showPanelLeft: true,
        isPanelLeftExpanded: isSidebarExpanded,
        onTogglePanelLeft: toggleSidebar,
        actions: [
          <div key="search" className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Search data..."
              className="flex w-64 items-center rounded-lg px-10 py-2 text-sm transition-all duration-200 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:bg-white dark:focus:bg-gray-800 border border-gray-200 dark:border-gray-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>,
          <button
            key="refresh"
            onClick={handleTableRefresh}
            disabled={tableRefreshing}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            title="Refresh data"
          >
            <RotateCw size={16} className={tableRefreshing ? 'animate-spin' : ''} />
          </button>,
          <button 
            key="load-more"
            onClick={handleTableLoadMore}
            disabled={tableLoadingMore}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            title="Load more data"
          >
            {tableLoadingMore ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
          </button>,
          <button
            key="columns"
            onClick={handleToggleColumnDropdown}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            title="Hide/Show columns"
            data-column-dropdown
          >
            <EyeOff size={16} />
          </button>,
          <StarButton
            key="star"
            isStarred={savedFilter === 'saved'}
            onToggle={handleToggleStarFilter}
            size={16}
            title={savedFilter === 'saved' ? 'Show all items' : 'Show only saved items'}
          />
        ]
      };
    } else {
      return {
        title,
        description,
        breadcrumbs: [
          { label: 'Dashboard', url: '/dashboard' },
          { label: 'Data Library' }
        ],
        showRefresh: true,
        onRefresh: refreshMainContent,
        actions: [
          <div key="search" className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Search schemas..."
              className="flex w-64 items-center rounded-lg px-10 py-2 text-sm transition-all duration-200 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:bg-white dark:focus:bg-gray-800 border border-gray-200 dark:border-gray-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        ]
      };
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <Sidebar
        isExpanded={isSidebarExpanded}
        schemas={schemas}
        loading={loading}
        refreshing={refreshingSchemas}
        onSelectTable={handleSelectTable}
        selectedSchema={selectedSchema}
        selectedTable={selectedTable}
        onRefresh={refreshSchemas}
      />
      
      <div className="flex flex-col flex-1 min-w-0 relative">
        {isTableView ? (
          <SlimTableHeader
            tableName={selectedTable || ''}
            schemaPath={`${selectedSchema?.toUpperCase()} / ${selectedTable?.toUpperCase()}`}
            onRefresh={handleTableRefresh}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            loading={tableRefreshing}
            onToggleColumnDropdown={handleToggleColumnDropdown}
            savedFilter={savedFilter}
            onToggleStarFilter={handleToggleStarFilter}
            isPanelLeftExpanded={isSidebarExpanded}
            onTogglePanelLeft={toggleSidebar}
          />
        ) : (
          <Header {...getHeaderProps()} />
        )}

        {/* Column dropdown positioned relative to header */}
        {isTableView && showColumnDropdown && (
          <div className="column-dropdown-content absolute top-20 right-6 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            <div className="p-3 border-b border-gray-200 dark:border-gray-600">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Show/Hide Columns</h4>
            </div>
            <div className="p-2">
              {/* Row Numbers Toggle */}
              <label className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">Row Numbers</span>
                <input
                  type="checkbox"
                  checked={!hideRowNumbers}
                  onChange={handleToggleRowNumbers}
                  className="ml-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </label>
              
              {/* Data Columns */}
              {tableColumns.map((column) => {
                const isMineId = column === 'mine_id' || column === 'id';
                return (
                  <label 
                    key={column} 
                    className={`flex items-center justify-between p-2 rounded ${
                      isMineId 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'
                    }`}
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {column.replace(/_/g, ' ')}
                      {isMineId && <span className="text-xs text-gray-500 ml-1">(required)</span>}
                    </span>
                    <input
                      type="checkbox"
                      checked={!hiddenColumns.has(column)}
                      onChange={() => handleToggleColumnVisibility(column)}
                      disabled={isMineId}
                      className="ml-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          {isTableView ? (
            <DataTable
              schemaName={selectedSchema}
              tableName={selectedTable}
              searchTerm={searchTerm}
              savedFilter={savedFilter}
              onDataLoad={handleDataLoad}
              onColumnsLoad={handleColumnsLoad}
              onSearchChange={setSearchTerm}
              onRefresh={handleTableRefresh}
              onLoadMore={handleTableLoadMore}
              onRefreshComplete={handleRefreshComplete}
              onLoadMoreComplete={handleLoadMoreComplete}
              onToggleColumnDropdown={handleToggleColumnDropdown}
              showColumnDropdown={showColumnDropdown}
              columns={tableColumns}
              hiddenColumns={hiddenColumns}
              onToggleColumnVisibility={handleToggleColumnVisibility}
              hideRowNumbers={hideRowNumbers}
              onToggleRowNumbers={handleToggleRowNumbers}
              refreshing={tableRefreshing}
              loadingMore={tableLoadingMore}
              onOpenJsonModal={() => setShowJsonModal(true)}
            />
          ) : (
            <SchemaOverview 
              schemas={schemas}
              loading={loading}
              refreshing={refreshingMain}
              searchTerm={searchTerm}
              onSelectTable={handleSelectTable}
            />
          )}
        </div>
      </div>

      {/* JSON Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 dark:bg-gray-900/70 transition-all duration-300" onClick={() => setShowJsonModal(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 w-[700px] h-[700px] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center border-b border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900">
              <button
                onClick={() => setShowJsonModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 mr-4"
                style={{ marginRight: '1rem' }}
              >
                <X size={16} />
              </button>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mr-auto">
                Add Mine IDs for Places API
              </h2>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-800">
              <JsonMineIdForm
                onSubmit={handleJsonSubmit}
                onCancel={() => setShowJsonModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimplifiedLibraryPage;