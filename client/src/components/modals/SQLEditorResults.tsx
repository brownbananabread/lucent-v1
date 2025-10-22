import { X, Maximize2, Minimize2, Search, Loader2, Database, Plus, Copy } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useSidebar } from '../../contexts/SidebarContext';

interface SQLEditorResultsProps {
  isOpen: boolean;
  onClose: () => void;
  queryResults: any[] | null;
  queryError: string | null;
  isLoading: boolean;
  executionTime?: number;
  rowCount?: number;
  totalRows?: number;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  canLoadMore?: boolean;
}

interface ResultColumn {
  name: string;
  type: string;
}

export function SQLEditorResults({ 
  isOpen, 
  onClose, 
  queryResults, 
  queryError, 
  isLoading,
  executionTime,
  rowCount,
  totalRows,
  onLoadMore,
  isLoadingMore = false,
  canLoadMore = false
}: SQLEditorResultsProps) {
  const [panelHeight, setPanelHeight] = useState(375);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedText, setHighlightedText] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const [columns, setColumns] = useState<ResultColumn[]>([]);
  
  const dragRef = useRef({ startY: 0, startHeight: 250, isDragging: false });
  const { isExpanded: isSidebarExpanded } = useSidebar();

  // Get window height for fullscreen calculation
  const getWindowHeight = () => typeof window !== 'undefined' ? window.innerHeight : 800;

  // Determine if panel is in fullscreen mode
  const isFullscreen = isFullscreenMode || panelHeight >= getWindowHeight();

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (isFullscreenMode) {
      setIsFullscreenMode(false);
      setPanelHeight(600);
    } else {
      setIsFullscreenMode(true);
      setPanelHeight(getWindowHeight());
    }
  };

  // Copy results as JSON
  const copyResultsAsJson = async () => {
    if (!queryResults || queryResults.length === 0) return;

    try {
      const jsonString = JSON.stringify(queryResults, null, 2);
      await navigator.clipboard.writeText(jsonString);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };


  // Drag handlers with snap-to-fullscreen logic
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startHeight: panelHeight, isDragging: true };
    setIsDragging(true);
  };

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current.isDragging) return;
    
    const deltaY = dragRef.current.startY - e.clientY;
    const windowHeight = getWindowHeight();
    const newHeight = Math.max(windowHeight * 0.25, Math.min(windowHeight, dragRef.current.startHeight + deltaY));
    setPanelHeight(newHeight);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!dragRef.current.isDragging) return;
    
    const windowHeight = getWindowHeight();
    const threshold = windowHeight * 0.9;
    
    if (panelHeight >= threshold) {
      setPanelHeight(windowHeight);
      setIsFullscreenMode(true);
    } else {
      setIsFullscreenMode(false);
    }
    
    dragRef.current.isDragging = false;
    setIsDragging(false);
  }, [panelHeight]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Search handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setHighlightedText(query);
  };

  // Highlight text function
  const highlightText = (text: any, highlight: string) => {
    if (text === null || text === undefined) return '';
    if (typeof text !== 'string') {
      text = String(text);
    }
    
    if (!highlight.trim()) return text;
    
    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part: string, index: number) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800/50 text-black dark:text-white px-0.5 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  // Extract column information from results
  useEffect(() => {
    if (queryResults && queryResults.length > 0) {
      const firstRow = queryResults[0];
      const cols = Object.keys(firstRow).map(key => ({
        name: key,
        type: typeof firstRow[key]
      }));
      setColumns(cols);
    } else {
      setColumns([]);
    }
  }, [queryResults]);

  if (!isOpen) return null;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Loader2 size={24} className="text-gray-500 dark:text-gray-400 animate-spin" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Executing query...
          </p>
        </div>
      );
    }

    if (queryError) {
      return (
        <div className="h-full overflow-auto">
          <div className="py-12">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mx-6">
              <pre className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap font-mono max-h-96 overflow-auto">
                {queryError}
              </pre>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`flex h-full ${isFullscreen ? '' : 'rounded-t-xl overflow-hidden'}`}>
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-800">
          {/* Results Table */}
          {queryResults && queryResults.length > 0 && (
            <div className="overflow-auto bg-white dark:bg-gray-900">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {columns.map((column, index) => (
                      <th key={index} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {highlightText(column.name, highlightedText)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {queryResults.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      {columns.map((column, colIndex) => (
                        <td key={colIndex} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          <div className="max-w-xs truncate">
                            {highlightText(row[column.name], highlightedText)}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Load More Button */}
          {queryResults && queryResults.length > 0 && canLoadMore && (
            <div className="flex justify-center py-4 bg-white dark:bg-gray-900">
              <button
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 text-sm disabled:opacity-50"
                title="Load 100 more results"
              >
                {isLoadingMore ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Loading...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Plus size={14} />
                    <span>Load 100 more</span>
                  </div>
                )}
              </button>
            </div>
          )}

          {queryResults && queryResults.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Database size={24} className="text-gray-500 dark:text-gray-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                No results found
              </p>
            </div>
          )}
        </div>

        <div className={`w-80 border-l border-gray-200 dark:border-white/[0.05] flex flex-col ${isFullscreen ? '' : 'rounded-tr-xl'}`}>
          {/* Control buttons at top of sidebar */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-end gap-2 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={copyResultsAsJson}
                disabled={!queryResults || queryResults.length === 0}
                className={`p-1.5 rounded-lg transition-colors duration-200 ${
                  copySuccess
                    ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
                title="Copy results as JSON"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                title={isFullscreenMode ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreenMode ? (
                  <Minimize2 size={16} />
                ) : (
                  <Maximize2 size={16} />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
              <input
                type="text"
                placeholder="Search results..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full rounded-lg px-10 py-2 text-sm transition-all duration-200 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:bg-gray-200 dark:focus:bg-gray-700"
              />
            </div>

            {/* Execution Summary directly under search */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Execution Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Rows shown:</span>
                  <span className="text-gray-900 dark:text-white">{rowCount || 0}</span>
                </div>
                {totalRows !== undefined && totalRows !== rowCount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Total rows:</span>
                    <span className="text-gray-900 dark:text-white">{totalRows}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Execution time:</span>
                  <span className="text-gray-900 dark:text-white">{executionTime || 0}ms</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Columns:</span>
                  <span className="text-gray-900 dark:text-white">{columns.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Spacer to fill remaining space */}
          <div className="flex-1"></div>
        </div>
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-y-0 right-0 z-50 flex items-end"
      style={{ 
        pointerEvents: isDragging ? 'none' : 'auto',
        left: isSidebarExpanded ? '236px' : '74px'
      }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/40 dark:bg-gray-900/70 transition-all duration-300"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div 
        className={`relative bg-white dark:bg-gray-900 w-full ${
          isFullscreen ? '' : 'rounded-tl-xl rounded-tr-xl'
        } ${isDragging ? 'border-t-2 border-blue-500' : ''}`}
        style={{ height: `${panelHeight}px` }}
      >
        {/* Drag handle */}
        <div 
          className={`absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-1 rounded-full cursor-ns-resize transition-colors duration-200 z-20 ${
            isDragging ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
          onMouseDown={handleDragStart}
        />
        
        {/* Content */}
        <div className="h-full">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}