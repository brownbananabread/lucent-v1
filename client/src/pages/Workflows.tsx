import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { CheckCircle, XCircle, Clock, Database, RotateCw, Ban, Loader2, ChevronDown, Copy, Cloud, Globe, ZoomIn, ZoomOut, FileTerminal, X } from 'lucide-react'
import { fetchRequest } from '../utils/fetch'
import Header from "../components/navigation/Header"

// Types
type TabType = 'overview' | 'steps' | 'excluded-rows' | 'duplicate-rows' | 'integrations'

interface PipelineStep {
  name: string;
  status: 'passed' | 'failed' | 'running' | 'waiting';
  duration?: string;
  startTime?: string;
}

interface DataRow {
  mine_id?: string;
  table_name?: string;
  row_data: Record<string, any>;
  comment?: string;
  created_at: string;
  updated_at?: string;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

// Utility functions
const getStatusIcon = (status: string) => ({
  passed: <CheckCircle className="text-green-500" size={20} />,
  failed: <XCircle className="text-red-500" size={20} />,
  running: <Clock className="text-blue-500 animate-spin" size={20} />,
}[status] || <Clock className="text-gray-400" size={20} />)

const getStatusColor = (status: string) => ({
  passed: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700',
  failed: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700',
  running: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700',
}[status] || 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600')

const getStatusBadge = (status: string) => ({
  passed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  running: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
}[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300')



const getLogPrefix = (level: string) => `[${level.toUpperCase()}]`

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


// Components
const PipelineStepComponent = ({ step, isLast }: { step: PipelineStep; isLast: boolean }) => (
  <div className="flex items-start gap-4">
    <div className="flex flex-col items-center">
      <div className={`p-2 rounded-full border ${getStatusColor(step.status)}`}>
        {getStatusIcon(step.status)}
      </div>
      {!isLast && <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mt-2" />}
    </div>
    <div className="flex-1 pb-8">
      <div className={`p-4 rounded-lg border ${getStatusColor(step.status)}`}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">{step.name}</h4>
          <span className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusBadge(step.status)}`}>
            {step.status}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          {step.duration && <span>Duration: {step.duration}</span>}
          {step.startTime && <span>Started: {step.startTime}</span>}
        </div>
      </div>
    </div>
  </div>
)

const GanttChart = ({ steps }: { steps: PipelineStep[] }) => {
  const calculatePositions = () => {
    let cumulativeSeconds = 0
    const positions = steps.map((step) => {
      const match = step.duration?.match(/(\d+)m\s*(\d+)s/)
      const stepDuration = match ? parseInt(match[1]) * 60 + parseInt(match[2]) : 0
      const startSeconds = cumulativeSeconds
      cumulativeSeconds += stepDuration
      return { startSeconds, duration: stepDuration, step }
    })
    return { positions, totalSeconds: cumulativeSeconds }
  }

  const { positions, totalSeconds } = calculatePositions()

  return (
    <div className="bg-white dark:bg-white/[0.03] rounded-lg border border-gray-200 dark:border-white/[0.05] p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-4 pb-2 border-b border-gray-200 dark:border-gray-700">
          <div className="w-6"></div>
          <div className="w-48 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Task name</div>
          <div className="flex-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Timeline</div>
          <div className="w-16 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Duration</div>
        </div>
        {steps.map((step, index) => {
          const position = positions[index]
          const startPercent = totalSeconds > 0 ? (position.startSeconds / totalSeconds) * 100 : 0
          const widthPercent = totalSeconds > 0 ? (position.duration / totalSeconds) * 100 : 0
          const isLast = index === steps.length - 1
          
          return (
            <div key={index} className="relative">
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center w-6">
                  <div className="flex items-center justify-center">
                    {getStatusIcon(step.status)}
                  </div>
                  {!isLast && <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mt-1" />}
                </div>
                <div className="w-48">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{step.name}</div>
                </div>
                <div className="flex-1 relative h-6">
                  <div className="absolute inset-0 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="absolute top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-600" style={{ left: `${(i + 1) * 20}%` }} />
                    ))}
                  </div>
                  {position.duration > 0 && (
                    <div className={`absolute top-1 bottom-1 ${getStatusColor(step.status).includes('green') ? 'bg-blue-500' : step.status === 'failed' ? 'bg-red-500' : step.status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'} rounded-sm`}
                         style={{ left: `${startPercent}%`, width: `${Math.max(widthPercent, 2)}%` }} />
                  )}
                </div>
                <div className="w-16 text-xs text-gray-500 dark:text-gray-400 text-right">{step.duration || '--'}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const DataTable = ({
  rows,
  type,
  isLoading,
  totalRows = 0,
  offset = 0,
  onLoadMore,
  loadingMore = false,
  searchTerm = ''
}: {
  rows: DataRow[];
  type: 'excluded' | 'duplicate';
  isLoading?: boolean;
  totalRows?: number;
  offset?: number;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  searchTerm?: string;
}) => {
  const [expandedRowData, setExpandedRowData] = useState<Set<string>>(new Set())
  const [copiedRows, setCopiedRows] = useState<Set<string>>(new Set())

  const toggleRowDataExpansion = (rowIndex: number) => {
    const rowKey = `${rowIndex}`
    setExpandedRowData(prev => {
      const newSet = new Set(prev)
      if (newSet.has(rowKey)) {
        newSet.delete(rowKey)
      } else {
        newSet.add(rowKey)
      }
      return newSet
    })
  }

  const copyToClipboard = async (data: any, event: React.MouseEvent, rowIndex: number) => {
    event.stopPropagation()
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))

      // Add visual feedback
      const rowKey = `${rowIndex}`
      setCopiedRows(prev => new Set(prev).add(rowKey))

      // Remove the feedback after animation
      setTimeout(() => {
        setCopiedRows(prev => {
          const newSet = new Set(prev)
          newSet.delete(rowKey)
          return newSet
        })
      }, 1000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  // Check if item matches search
  const itemMatches = (item: DataRow, search: string): boolean => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return Object.values(item).some(value =>
      value && typeof value === 'string' && value.toLowerCase().includes(searchLower)
    ) || (item.row_data && JSON.stringify(item.row_data).toLowerCase().includes(searchLower));
  };

  // Filter out mine_summary view data and apply search
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      // Check if this row is from mine_summary view and exclude it
      if (row.row_data && typeof row.row_data === 'object') {
        // Check for indicators that this might be from mine_summary
        const rowDataStr = JSON.stringify(row.row_data).toLowerCase();
        if (rowDataStr.includes('mine_summary') ||
            (row.row_data as any).table_name === 'mine_summary' ||
            (row.row_data as any).source_name === 'mine_summary') {
          return false;
        }
      }
      // Apply search filter
      return itemMatches(row, searchTerm);
    });
  }, [rows, searchTerm]);

  // Get columns from the main table structure (not from row_data contents)
  const columns = useMemo(() => {
    if (filteredRows.length === 0) return [];
    const allKeys = new Set<string>();
    filteredRows.forEach(row => {
      Object.keys(row).forEach(key => {
        // Include all main table columns
        if (key !== 'children') {
          allKeys.add(key);
        }
      });
    });
    return Array.from(allKeys);
  }, [filteredRows]);

  return (
    <div>
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden relative flex flex-col">
        <div className="overflow-auto max-h-[calc(100vh-242px)] flex-1">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600 w-16">
                  #
                </th>
                {columns.map((column: string) => (
                  <th key={column} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600 whitespace-nowrap">
                    {column.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-8 text-center">
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
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-8 text-center">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Ban size={24} className="text-gray-500 dark:text-gray-400" />
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        No data found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                        {type === 'duplicate' ? 'No duplicate rows found in pipeline_duplicates table' : 'No excluded rows found in pipeline_exclusions table'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => (
                  <tr key={index} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    {/* Row number column */}
                    <td className="px-4 py-3 text-sm border-r border-gray-200 dark:border-gray-600 w-16">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {index + 1}
                      </span>
                    </td>
                    {columns.map((column, colIndex) => {
                      const value = row[column as keyof DataRow];
                      const isFirstColumn = colIndex === 0;

                      return (
                        <td key={column} className="px-4 py-3 text-sm border-r border-gray-200 dark:border-gray-600 last:border-r-0 whitespace-nowrap">
                          {isFirstColumn ? (
                            <div className="text-gray-900 dark:text-white max-w-md">
                              {value === null || value === undefined ? (
                                '-'
                              ) : column === 'row_data' && typeof value === 'object' ? (
                                <div className="relative max-w-md">
                                  <button
                                    onClick={() => toggleRowDataExpansion(index)}
                                    className="font-mono text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 pr-8 rounded w-full text-left transition-colors cursor-pointer max-w-md"
                                  >
                                    {expandedRowData.has(`${index}`) ? (
                                      <pre className="whitespace-pre-wrap break-words text-xs leading-tight max-w-md">
                                        <HighlightText text={JSON.stringify(value, null, 2)} searchTerm={searchTerm} />
                                      </pre>
                                    ) : (
                                      <span className="overflow-hidden block truncate max-w-md">
                                        <HighlightText text={JSON.stringify(value)} searchTerm={searchTerm} />
                                      </span>
                                    )}
                                  </button>
                                  {expandedRowData.has(`${index}`) ? (
                                    <button
                                      onClick={(e) => copyToClipboard(value, e, index)}
                                      className={`absolute top-2 right-2 p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-all duration-200 ${
                                        copiedRows.has(`${index}`)
                                          ? 'scale-110 bg-green-100 dark:bg-green-900'
                                          : ''
                                      }`}
                                      title="Copy JSON"
                                    >
                                      <Copy
                                        size={12}
                                        className={`transition-colors duration-200 ${
                                          copiedRows.has(`${index}`)
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
                              ) : Array.isArray(value) ? (
                                <div className="flex flex-wrap gap-1 max-w-md">
                                  {value.slice(0, 3).map((v, i) => (
                                    <span key={i} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                      <HighlightText text={String(v)} searchTerm={searchTerm} />
                                    </span>
                                  ))}
                                  {value.length > 3 && (
                                    <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">+{value.length - 3}</span>
                                  )}
                                </div>
                              ) : typeof value === 'number' ? (
                                <div className="max-w-md">
                                  <HighlightText text={(value as number).toLocaleString()} searchTerm={searchTerm} />
                                </div>
                              ) : (
                                <div className="max-w-md break-words">
                                  <HighlightText text={String(value || '')} searchTerm={searchTerm} />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-gray-600 dark:text-gray-400 max-w-md">
                              {value === null || value === undefined ? (
                                '-'
                              ) : column === 'row_data' && typeof value === 'object' ? (
                                <div className="relative max-w-md">
                                  <button
                                    onClick={() => toggleRowDataExpansion(index)}
                                    className="font-mono text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 pr-8 rounded w-full text-left transition-colors cursor-pointer max-w-md"
                                  >
                                    {expandedRowData.has(`${index}`) ? (
                                      <pre className="whitespace-pre-wrap break-words text-xs leading-tight max-w-md">
                                        <HighlightText text={JSON.stringify(value, null, 2)} searchTerm={searchTerm} />
                                      </pre>
                                    ) : (
                                      <span className="overflow-hidden block truncate max-w-md">
                                        <HighlightText text={JSON.stringify(value)} searchTerm={searchTerm} />
                                      </span>
                                    )}
                                  </button>
                                  {expandedRowData.has(`${index}`) ? (
                                    <button
                                      onClick={(e) => copyToClipboard(value, e, index)}
                                      className={`absolute top-2 right-2 p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-all duration-200 ${
                                        copiedRows.has(`${index}`)
                                          ? 'scale-110 bg-green-100 dark:bg-green-900'
                                          : ''
                                      }`}
                                      title="Copy JSON"
                                    >
                                      <Copy
                                        size={12}
                                        className={`transition-colors duration-200 ${
                                          copiedRows.has(`${index}`)
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
                              ) : Array.isArray(value) ? (
                                <div className="flex flex-wrap gap-1 max-w-md">
                                  {value.slice(0, 3).map((v, i) => (
                                    <span key={i} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                      <HighlightText text={String(v)} searchTerm={searchTerm} />
                                    </span>
                                  ))}
                                  {value.length > 3 && (
                                    <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">+{value.length - 3}</span>
                                  )}
                                </div>
                              ) : typeof value === 'number' ? (
                                <div className="max-w-md">
                                  <HighlightText text={(value as number).toLocaleString()} searchTerm={searchTerm} />
                                </div>
                              ) : (
                                <div className="max-w-md break-words">
                                  <HighlightText text={String(value || '')} searchTerm={searchTerm} />
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredRows.length > 0 && (
          <div className="h-8 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600 flex items-center px-4 text-xs flex-shrink-0 gap-4">
            <span className="text-gray-600 dark:text-gray-300">
              {(type === 'duplicate' || type === 'excluded') ?
                (searchTerm ?
                  `Showing ${filteredRows.length} from ${rows.length} (${totalRows.toLocaleString()} total)` :
                  `Showing ${offset + filteredRows.length} from ${totalRows.toLocaleString()} rows`
                ) :
                `Showing ${filteredRows.length} ${type} rows`
              }
            </span>
            {(type === 'duplicate' || type === 'excluded') && rows.length < totalRows && !searchTerm && onLoadMore && (
              <button
                onClick={onLoadMore}
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
  );
};

export default function Job() {
  const navigate = useNavigate()
  const location = useLocation()
  const [excludedRows, setExcludedRows] = useState<DataRow[]>([])
  const [duplicateRows, setDuplicateRows] = useState<DataRow[]>([])
  const [loading, setLoading] = useState({ excluded: true, duplicate: true })
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [totalRows, setTotalRows] = useState<number>(0)
  const [offset, setOffset] = useState<number>(0)
  const [currentLimit, setCurrentLimit] = useState<number>(100)
  const [loadingMore, setLoadingMore] = useState(false)
  const [excludedTotalRows, setExcludedTotalRows] = useState<number>(0)
  const [excludedOffset, setExcludedOffset] = useState<number>(0)
  const [excludedCurrentLimit, setExcludedCurrentLimit] = useState<number>(100)
  const [excludedLoadingMore, setExcludedLoadingMore] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isTerminalModalOpen, setIsTerminalModalOpen] = useState(false)

  // Integration states
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  // S3 bucket and target data
  const [s3Position, setS3Position] = useState({ x: 50, y: 50 })
  const [targetPositions, setTargetPositions] = useState<Record<string, { x: number; y: number }>>({}
  )
  const [s3Bucket] = useState({
    name: "s3://greengravity-archive",
    files: [
      { filename: "2025 04 07_GREEN GRAVITY MASTER SHAFT LIST__B0D3 April_2025.xlsx", size: "185.0 KB" },
      { filename: "Global-Coal-Mine-Tracker-April-2023.xlsx", size: "1.6 MB" },
      { filename: "GlobalData_Mine Depth Data_Extract for Green Gravity_2023.xlsx", size: "112.8 KB" },
      { filename: "New Zealand - Mine Sites (no depth).xlsx", size: "664.6 KB" },
      { filename: "USGS_USA and Global Mine data (no depth).xlsx", size: "50.8 MB" }
    ]
  })
  const [targets] = useState<string[]>([
    "dim_company",
    "dim_energy",
    "dim_evaluations",
    "dim_identificat...",
    "dim_locations",
    "dim_raw",
    "dim_spatial",
    "dim_status",
    "fact_commoditie...",
    "fact_documentat...",
    "fact_shafts"
  ])
  const [connections] = useState(
    targets.map((targetId, index) => ({
      sourceId: "s3-bucket",
      targetId,
      rowCount: [12500, 8934, 15670, 4567, 23890, 6789, 34560, 2134, 18920, 7345, 29876][index] || Math.floor(Math.random() * 50000) + 1000
    }))
  )

  const searchParams = new URLSearchParams(location.search)
  const activeTab = (searchParams.get('tab') as TabType) || 'overview'

  // Dynamic search placeholder based on active tab
  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case 'duplicate-rows':
        return 'Search duplicate rows...'
      case 'excluded-rows':
        return 'Search excluded rows...'
      case 'integrations':
        return 'Search integrations...'
      default:
        return 'Search pipeline data...'
    }
  }

  // Function to determine pipeline status based on log levels
  const getPipelineStatus = (logs: LogEntry[]): { status: string; className: string } => {
    if (logs.length === 0) {
      return { status: 'pending', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' }
    }

    const hasError = logs.some(log => log.level.toLowerCase() === 'error')
    const hasWarning = logs.some(log => log.level.toLowerCase() === 'warning' || log.level.toLowerCase() === 'warn')

    if (hasError) {
      return { status: 'failed', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
    }
    
    if (hasWarning) {
      return { status: 'warning', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' }
    }

    // All logs are INFO level
    return { status: 'completed', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' }
  }
  
  const pipelineSteps: PipelineStep[] = [
    { name: 'Extract data from S3 bucket', status: 'passed', duration: '2m 30s', startTime: '14:30:00' },
    { name: 'Clean', status: 'passed', duration: '1m 45s', startTime: '14:32:30' },
    { name: 'Process', status: 'passed', duration: '3m 15s', startTime: '14:34:15' },
    { name: 'Normalise', status: 'passed', duration: '2m 20s', startTime: '14:37:30' },
    { name: 'Load into PostgreSQL', status: 'passed', duration: '1m 50s', startTime: '14:39:50' }
  ]

  const fetchDataForTable = async (tableName: string, tableType: 'duplicate' | 'excluded', isLoadMore = false) => {
    if (!tableName) return;

    try {
      if (isLoadMore) {
        if (tableType === 'duplicate') {
          setLoadingMore(true)
        } else if (tableType === 'excluded') {
          setExcludedLoadingMore(true)
        }
      } else {
        setLoading(prev => ({ ...prev, [tableType]: true }))
        // Reset limit when fetching new table
        if (tableType === 'duplicate') {
          setCurrentLimit(100)
        } else {
          setExcludedCurrentLimit(100)
        }
      }

      // Add 1 second delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const currentLimitValue = isLoadMore ?
        (tableType === 'duplicate' ? currentLimit + 100 : excludedCurrentLimit + 100) :
        100;

      const response = await fetchRequest({
        method: 'GET',
        url: `http://localhost:5174/api/v1/schemas/public/tables/${tableName}?limit=${currentLimitValue}`
      });

      if (response?.status >= 200 && response.status < 300) {
        const result = response.body;
        console.log('Fetched data for table:', tableName, result);

        // Convert table data to format similar to feature store
        if (result.data && Array.isArray(result.data) && result.data.length > 0) {
          // Simply use the data as-is, similar to feature store
          if (tableType === 'duplicate') {
            setDuplicateRows(result.data);
            setTotalRows(result.total_rows || result.data.length);
            setOffset(result.offset || 0);
            if (isLoadMore) {
              setCurrentLimit(currentLimitValue);
            }
          } else {
            setExcludedRows(result.data);
            setExcludedTotalRows(result.total_rows || result.data.length);
            setExcludedOffset(result.offset || 0);
            if (isLoadMore) {
              setExcludedCurrentLimit(currentLimitValue);
            }
          }
        } else {
          // Handle empty data case
          console.log('No data found for table:', tableName);
          if (tableType === 'duplicate') {
            setDuplicateRows([]);
            setTotalRows(0);
            setOffset(0);
          } else {
            setExcludedRows([]);
            setExcludedTotalRows(0);
            setExcludedOffset(0);
          }
        }
      } else {
        console.error('Failed to fetch table data, status:', response?.status);
        if (tableType === 'duplicate') {
          setDuplicateRows([]);
        } else {
          setExcludedRows([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch table data:', error);
      if (tableType === 'duplicate') {
        setDuplicateRows([]);
      } else {
        setExcludedRows([]);
      }
    } finally {
      if (isLoadMore) {
        if (tableType === 'duplicate') {
          setLoadingMore(false)
        } else if (tableType === 'excluded') {
          setExcludedLoadingMore(false)
        }
      } else {
        setLoading(prev => ({ ...prev, [tableType]: false }))
      }
    }
  };


  // Fetch logs for pipeline status
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetchRequest({
          method: 'GET',
          url: 'http://localhost:5174/api/v1/schemas/public/tables/pipeline_logs'
        })
        if (response?.status >= 200 && response.status < 300) {
          const fetchedLogs = response.body?.data || []
          const sortedLogs = fetchedLogs.sort((a: LogEntry, b: LogEntry) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
          setLogs(sortedLogs)
        }
      } catch (err) {
        console.error('Failed to fetch logs:', err)
      } finally {
        setLogsLoading(false)
      }
    }
    fetchLogs()
  }, [])

  useEffect(() => {
    // Fetch both duplicate and excluded rows sequentially on mount
    const initializeData = async () => {
      await fetchDataForTable('pipeline_duplicates', 'duplicate');
      await fetchDataForTable('pipeline_exclusions', 'excluded');
    };
    initializeData();
  }, [])

  const handleRefresh = async () => {
    setLoading({ excluded: true, duplicate: true });

    // Refresh both duplicate and excluded rows sequentially to avoid race conditions
    await fetchDataForTable('pipeline_duplicates', 'duplicate');
    await fetchDataForTable('pipeline_exclusions', 'excluded');

    // Refresh logs for updated pipeline status
    setLogsLoading(true)
    try {
      const response = await fetchRequest({
        method: 'GET',
        url: 'http://localhost:5174/api/v1/schemas/public/tables/pipeline_logs'
      })
      if (response?.status >= 200 && response.status < 300) {
        const fetchedLogs = response.body?.data || []
        const sortedLogs = fetchedLogs.sort((a: LogEntry, b: LogEntry) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
        setLogs(sortedLogs)
      }
    } catch (err) {
      console.error('Failed to refresh logs:', err)
    } finally {
      setLogsLoading(false)
    }
  }

  const handleLoadMore = async () => {
    if (loadingMore || duplicateRows.length >= totalRows) return

    await fetchDataForTable('pipeline_duplicates', 'duplicate', true)
  }

  const handleExcludedLoadMore = async () => {
    if (excludedLoadingMore || excludedRows.length >= excludedTotalRows) return

    await fetchDataForTable('pipeline_exclusions', 'excluded', true)
  }

  // Integration functions
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, tableId?: string) => {
    if (tableId) {
      const rect = e.currentTarget.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
      setDragging(tableId)
    } else {
      if (e.button === 0 || e.button === 1 || (e.button === 0 && e.shiftKey)) {
        e.preventDefault()
        setIsPanning(true)
        setPanStart({
          x: e.clientX - pan.x,
          y: e.clientY - pan.y
        })
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      const newPan = {
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      }
      setPan(newPan)
    } else if (dragging && canvasRef.current) {
      const canvas = canvasRef.current.getBoundingClientRect()
      const newX = (e.clientX - canvas.left - pan.x) / zoom - dragOffset.x
      const newY = (e.clientY - canvas.top - pan.y) / zoom - dragOffset.y

      if (dragging === 's3-bucket') {
        setS3Position({ x: newX, y: newY })
      } else if (targets.includes(dragging)) {
        setTargetPositions(prev => ({
          ...prev,
          [dragging]: { x: newX, y: newY }
        }))
      }
    }
  }

  const handleMouseUp = () => {
    setDragging(null)
    setDragOffset({ x: 0, y: 0 })
    setIsPanning(false)
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.15, 3))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev * 0.85, 0.3))
  }

  const handleWheel = (e: React.WheelEvent) => {
    // Only prevent default and pan if shift key is held
    if (e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()

      const panSpeed = 1
      const newPan = {
        x: pan.x - e.deltaX * panSpeed,
        y: pan.y - e.deltaY * panSpeed
      }
      setPan(newPan)
    }
    // Otherwise, allow normal scrolling
  }

  // Initialize target positions
  useEffect(() => {
    if (Object.keys(targetPositions).length === 0) {
      const newTargetPositions: Record<string, { x: number; y: number }> = {}
      const tileWidth = 256
      const gap = 20
      const verticalSpacing = 160
      const maxTilesPerColumn = 4
      const rightHalfStart = 600

      targets.forEach((table, index) => {
        const columnIndex = Math.floor(index / maxTilesPerColumn)
        const rowIndex = index % maxTilesPerColumn

        newTargetPositions[table] = {
          x: rightHalfStart + gap + columnIndex * (tileWidth + gap),
          y: gap + rowIndex * verticalSpacing
        }
      })
      setTargetPositions(newTargetPositions)
    }
  }, [targets])

  const renderConnectionLines = () => {
    return connections.map((connection, index) => {
      const sourcePos = s3Position
      const targetPos = targetPositions[connection.targetId]

      if (!sourcePos || !targetPos) return null

      const startX = sourcePos.x + 320
      const startY = sourcePos.y + 200
      const endX = targetPos.x
      const endY = targetPos.y + 50

      const controlX1 = startX + (endX - startX) * 0.3
      const controlX2 = startX + (endX - startX) * 0.7

      const minX = Math.min(startX, endX) - 10
      const maxX = Math.max(startX, endX) + 10
      const minY = Math.min(startY, endY) - 10
      const maxY = Math.max(startY, endY) + 10
      const width = maxX - minX
      const height = maxY - minY

      return (
        <div
          key={index}
          className="absolute pointer-events-none"
          style={{
            left: minX,
            top: minY,
            width: width,
            height: height,
            zIndex: 10
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${width} ${height}`}
            className="overflow-visible"
          >
            <path
              d={`M ${startX - minX} ${startY - minY} C ${controlX1 - minX} ${startY - minY}, ${controlX2 - minX} ${endY - minY}, ${endX - minX} ${endY - minY}`}
              stroke="#3b82f6"
              strokeWidth="2"
              fill="none"
              strokeDasharray="5,5"
              className="animate-pulse"
            />
            <circle cx={startX - minX} cy={startY - minY} r="4" fill="#3b82f6" />
            <circle cx={endX - minX} cy={endY - minY} r="4" fill="#3b82f6" />

            <text
              x={controlX1 - minX}
              y={(startY + endY) / 2 - minY + 4}
              textAnchor="middle"
              className="fill-blue-600 text-xs font-medium"
              fontSize="11"
              style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.8)' }}
            >
              {connection.rowCount?.toLocaleString() || '0'} rows
            </text>
          </svg>
        </div>
      )
    })
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'steps' as const, label: 'Steps' },
    { id: 'excluded-rows' as const, label: 'Excluded Rows' },
    { id: 'duplicate-rows' as const, label: 'Duplicate Rows' },
    { id: 'integrations' as const, label: 'Integrations' }
  ]


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
        <Header
          title="Excel S3 Data Ingestion Pipeline"
          description="Monitor and manage your data pipeline workflow stages"
          helpCircleItems={[
            { icon: <RotateCw size={12} />, title: "Refresh Data", description: "Click refresh button to reload job data and information" },
            { icon: <Database size={12} />, title: "Data Management", description: "View pipeline stages, destinations, and logs for selected job" }
          ]}
          showSearch={true}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder={getSearchPlaceholder()}
          searchRightActions={
            <button
              onClick={() => setIsTerminalModalOpen(true)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              title="Open Terminal"
              aria-label="Open Terminal"
            >
              <FileTerminal size={16} />
            </button>
          }
          showRefresh={true}
          onRefresh={handleRefresh}
          badge={(() => {
            const pipelineStatus = getPipelineStatus(logs)
            return (
              <span
                className={`px-2 py-1 rounded-md text-xs font-medium ${pipelineStatus.className}`}
              >
                {logsLoading ? 'Loading...' : pipelineStatus.status.charAt(0).toUpperCase() + pipelineStatus.status.slice(1)}
              </span>
            )
          })()}
          breadcrumbs={[{ label: 'ETL Pipelines', url: '/etl-pipeline/workflows' }, { label: 'Excel S3 Data Ingestion Pipeline'}]}
        />
        
        <div className="bg-gray-50 dark:bg-gray-900">
          <div className="px-6 pt-0 pb-0">
            <div className="flex gap-8 border-b border-gray-200 dark:border-white/[0.05]">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => navigate(`/etl-pipeline/workflows?tab=${tab.id}`)}
                  className={`pb-3 text-sm font-medium transition-colors relative ${
                    activeTab === tab.id ? 'text-black dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1">
        <div className="overflow-y-auto h-full">
          <div className="w-full px-6 py-6 space-y-8 h-full">
            {activeTab === 'overview' && (
              <div className="space-y-3 h-full flex flex-col">
                <div className="h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto">
                    <div>{pipelineSteps.map((step, index) => (
                      <PipelineStepComponent key={index} step={step} isLast={index === pipelineSteps.length - 1} />
                    ))}</div>
                  </div>
                </div>
              </div>
            )}


            {activeTab === 'steps' && (
              <div className="space-y-3 h-full flex flex-col">
                <div className="h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto">
                    <GanttChart steps={pipelineSteps} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'excluded-rows' && (
              <DataTable
                rows={excludedRows}
                type="excluded"
                isLoading={loading.excluded}
                totalRows={excludedTotalRows}
                offset={excludedOffset}
                onLoadMore={handleExcludedLoadMore}
                loadingMore={excludedLoadingMore}
                searchTerm={searchTerm}
              />
            )}

            {activeTab === 'duplicate-rows' && (
              <DataTable
                rows={duplicateRows}
                type="duplicate"
                isLoading={loading.duplicate}
                totalRows={totalRows}
                offset={offset}
                onLoadMore={handleLoadMore}
                loadingMore={loadingMore}
                searchTerm={searchTerm}
              />
            )}

            {activeTab === 'integrations' && (
              <div className="w-full" style={{ height: 'calc(100vh - 210px)' }}>
                <div className="bg-white dark:bg-gray-800 h-full w-full rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex">
                  {/* Vertical toolbar - integrated into layout */}
                  <div className="bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-2 flex flex-col items-center justify-center gap-2 w-12">
                    <button
                      onClick={handleZoomOut}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors rounded-xl"
                      title="Zoom out"
                    >
                      <ZoomOut className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                    </button>
                    <div className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300 tabular-nums text-center">
                      {Math.round(zoom * 100)}%
                    </div>
                    <button
                      onClick={handleZoomIn}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors rounded-xl"
                      title="Zoom in"
                    >
                      <ZoomIn className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                    </button>
                  </div>

                  {/* Node Editor Canvas */}
                  <div className="flex-1 relative">
                    <div
                    ref={canvasRef}
                    className="relative w-full h-full select-none overflow-hidden cursor-grab active:cursor-grabbing"
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onMouseDown={(e) => handleMouseDown(e)}
                    onWheel={handleWheel}
                    style={{
                      cursor: isPanning ? 'grabbing' : 'grab',
                      touchAction: 'none',
                      overscrollBehavior: 'none'
                    }}
                  >
                    {/* Zoomable Content Container */}
                    <div
                      className="absolute inset-0"
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: '0 0',
                        width: '100%',
                        height: '100%'
                      }}
                    >
                      {/* Connection Lines */}
                      {renderConnectionLines()}

                      {/* S3 Bucket Container */}
                      <div
                        className="absolute rounded-lg bg-gray-100 dark:bg-gray-800 p-4 cursor-move hover:shadow-md group z-30"
                        style={{
                          left: `${s3Position.x}px`,
                          top: `${s3Position.y}px`,
                          width: '320px',
                          minHeight: '400px',
                          transform: dragging === 's3-bucket' ? 'scale(1.05)' : 'scale(1)'
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          handleMouseDown(e, 's3-bucket')
                        }}
                      >
                        <div className="flex items-start gap-3 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
                            <Cloud size={16} className="text-blue-500" />
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white break-words leading-tight">
                              S3 Bucket
                            </h3>
                            <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight truncate">
                              {s3Bucket.name}
                            </div>
                          </div>
                          <div className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                            Source
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-xs font-medium text-gray-800 dark:text-gray-200 mb-2">
                            Files ({s3Bucket.files.length})
                          </div>
                          {s3Bucket.files.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-2 p-2 rounded bg-white/60 dark:bg-gray-700/60"
                            >
                              <div className="w-4 h-4 rounded flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 flex-shrink-0 mt-0.5">
                                <Database size={10} className="text-blue-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-gray-900 dark:text-white break-words leading-tight">
                                  {file.filename}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                                  {file.size}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Target Tables */}
                      {targets.map((target) => (
                        <div
                          key={`target-${target}`}
                          className="absolute w-64 rounded-lg bg-gray-100 dark:bg-gray-800 p-3 cursor-move hover:shadow-md group z-30"
                          style={{
                            left: `${targetPositions[target]?.x || 700}px`,
                            top: `${targetPositions[target]?.y || 20}px`,
                            transform: dragging === target ? 'scale(1.05)' : 'scale(1)'
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            handleMouseDown(e, target)
                          }}
                        >
                          <div className="flex items-start gap-2 mb-2">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 flex-shrink-0">
                              <Cloud size={12} className="text-purple-500" />
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                              <h3 className="text-xs font-medium text-gray-900 dark:text-white break-words leading-tight">
                                {target}
                              </h3>
                            </div>
                          </div>

                          <div className="mb-2">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-start gap-1">
                                <Database size={8} className="text-gray-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight truncate">
                                    PostgreSQL 17
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-start gap-1">
                                <Globe size={8} className="text-gray-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight truncate">
                                    data_clean.{target}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-end mt-2">
                            <span className="text-xs px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200">
                              Target
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Terminal Modal */}
      {isTerminalModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsTerminalModalOpen(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 w-[90vw] max-w-[1200px] h-[700px] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900">
              <div className="flex items-center">
                <button
                  onClick={() => setIsTerminalModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 mr-4"
                  style={{ marginRight: '1rem' }}
                >
                  <X size={16} />
                </button>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Terminal
                </h2>
              </div>
              <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                job-logs-{new Date().toISOString().split('T')[0]}.log
              </span>
            </div>
            {/* Content - Scrollable */}
            <div className={`flex-1 overflow-auto ${document.documentElement.classList.contains('dark') ? 'bg-black' : 'bg-white'}`}>
              {logsLoading ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Loader2 size={24} className="text-gray-500 animate-spin" />
                  </div>
                  <p className="text-gray-600 text-sm">Loading logs...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Ban size={24} className="text-gray-500" />
                  </div>
                  <p className="text-gray-600 text-sm">No logs available</p>
                  <p className="text-gray-500 text-xs mt-1">Pipeline logs will appear here when jobs are running</p>
                </div>
              ) : (
                <table className={`w-full font-mono text-sm table-fixed ${document.documentElement.classList.contains('dark') ? 'bg-black' : 'bg-white'}`}>
                  <colgroup>
                    <col className="w-48" />
                    <col className="w-20" />
                    <col />
                  </colgroup>
                  <tbody>
                    {logs.map((log, index) => (
                      <tr key={index} className={`${document.documentElement.classList.contains('dark') ? 'hover:bg-gray-800/50' : 'hover:bg-gray-100'}`}>
                        <td className={`pl-4 pr-2 py-1 text-left ${document.documentElement.classList.contains('dark') ? 'text-gray-400' : 'text-gray-600'} whitespace-nowrap`}>
                          {log.timestamp}
                        </td>
                        <td className={`px-2 py-1 text-center ${document.documentElement.classList.contains('dark') ? 'text-gray-300' : 'text-gray-700'} whitespace-nowrap`}>
                          {getLogPrefix(log.level)}
                        </td>
                        <td className={`pl-2 py-1 ${document.documentElement.classList.contains('dark') ? 'text-gray-200' : 'text-gray-900'}`}>
                          {log.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}