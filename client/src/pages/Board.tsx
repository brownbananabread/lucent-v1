import React, { useState, useEffect, useRef } from 'react';
import { Clock, CheckCircle, AlertCircle, Search, Building2, Globe, RefreshCw, Loader2, Ban, MoreHorizontal, Flag, RotateCcw, HelpCircle, Move, Eye, Filter, Plus } from 'lucide-react';
import { isMineSaved, toggleMineSave } from '../utils/helpers';
import Header from '../components/navigation/Header';
import { MineDetailsPanel } from '../components/modals/MineDetailsPanel';
import StarButton from '../components/common/StarButton';
import MineDetailsButton from '../components/common/MineDetailsButton';

// Task interface
interface Task {
id: string;
name: string | null;
latitude: number | string | null;
longitude: number | string | null;
country: string | null;
state: string | null;
description: string;
status: 'not_evaluated' | 'under_review' | 'shortlisted' | 'approved' | 'rejected';
source_name?: string | null;
commodities?: string[];
evaluation_score?: number | null;
}

// Column configuration
const columns = [
{ id: 'not_evaluated', title: 'NOT EVALUATED', color: 'bg-gray-100 dark:bg-gray-800' },
{ id: 'under_review', title: 'UNDER REVIEW', color: 'bg-blue-50 dark:bg-blue-900/20' },
{ id: 'shortlisted', title: 'SHORTLISTED', color: 'bg-purple-50 dark:bg-purple-900/20' },
{ id: 'approved', title: 'APPROVED', color: 'bg-green-50 dark:bg-green-900/20' },
{ id: 'rejected', title: 'REJECTED', color: 'bg-red-50 dark:bg-red-900/20' }
];

// Help items for the dropdown
const helpItems = [
{
  icon: <Move size={12} />,
  title: 'Drag & Drop',
  description: 'Drag mine evaluations between columns to update their status'
},
{
  icon: <Eye size={12} />,
  title: 'View Details',
  description: 'Click the expand icon on any card to view detailed mine information'
},
{
  icon: <Filter size={12} />,
  title: 'Search & Filter',
  description: 'Use the search bar to filter evaluations by name, location, or description'
},
{
  icon: <RefreshCw size={12} />,
  title: 'Refresh Data',
  description: 'Click the refresh button to reload the latest evaluation data'
}
];

// Jira-style Task card component
const TaskCard = ({ 
task, 
onDragStart, 
onDragEnd, 
isDragging,
onUpdateTask,
onOpenDetails
}: { 
task: Task;
onDragStart: (e: React.DragEvent, task: Task) => void;
onDragEnd: () => void;
isDragging: boolean;
onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
onOpenDetails: (task: Task) => void;
}) => {

const handleToggleSave = () => {
  toggleMineSave(task.id);
  // Trigger a re-render by calling onUpdateTask
  onUpdateTask(task.id, {});
};

const getTypeIcon = (status: string) => {
switch (status) {
case 'not_evaluated': return <Clock size={14} className="text-gray-500" />;
case 'under_review': return <AlertCircle size={14} className="text-blue-500" />;
case 'shortlisted': return <Flag size={14} className="text-purple-500" />;
case 'approved': return <CheckCircle size={14} className="text-green-500" />;
case 'rejected': return <AlertCircle size={14} className="text-red-500" />;
default: return <Clock size={14} className="text-gray-500" />;
}
};

const getCommodityLabels = (commodities?: string[] | any) => {
if (!commodities) {
  return []; // No fallback commodities
}

// Handle case where commodities is an array of objects
if (Array.isArray(commodities)) {
  return commodities.map(item => {
    if (typeof item === 'object' && item !== null) {
      // Extract commodity name from object (try different possible keys)
      return item.commodity || item.commodity_name || item.name || 'Unknown';
    }
    return String(item);
  }).filter(Boolean).slice(0, 3);
}

// Handle case where commodities is a single object
if (typeof commodities === 'object' && commodities !== null) {
  const commodity = commodities.commodity || commodities.commodity_name || commodities.name;
  return commodity ? [String(commodity)] : [];
}

// Handle case where commodities is a string
if (typeof commodities === 'string') {
  return commodities.split(',').map(c => c.trim()).filter(Boolean).slice(0, 3);
}

return []; // Fallback
};

const labels = getCommodityLabels(task.commodities);

return (
<div
draggable
className={`bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.05] rounded-lg p-3 mb-3 cursor-move hover:shadow-md transition-all duration-300 ease-in-out group ${
isDragging ? 'opacity-50 rotate-2 scale-105' : ''
}`}
onDragStart={(e) => onDragStart(e, task)}
onDragEnd={onDragEnd}
>
<div className="flex items-start justify-between mb-2">
<div className="flex items-center gap-2">
<div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
  task.status === 'not_evaluated' ? 'bg-gray-100 dark:bg-gray-800' :
  task.status === 'under_review' ? 'bg-blue-100 dark:bg-blue-900/30' :
  task.status === 'shortlisted' ? 'bg-purple-100 dark:bg-purple-900/30' :
  task.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30' :
  'bg-red-100 dark:bg-red-900/30'
}`}>
{getTypeIcon(task.status)}
</div>
<div className="flex flex-col">
  <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
    {task.id}
  </h3>
</div>
</div>
<div className="flex items-center gap-1">
<div className="opacity-0 group-hover:opacity-100 transition-opacity">
  <StarButton
    isStarred={isMineSaved(task.id)}
    onToggle={handleToggleSave}
    size={12}
    className="p-1"
    title={isMineSaved(task.id) ? 'Remove from saved' : 'Save mine'}
  />
</div>
<div className="opacity-0 group-hover:opacity-100 transition-opacity">
  <MineDetailsButton
    mineId={task.id}
    onOpenDetails={() => onOpenDetails(task)}
    size={14}
    title="Open mine details"
    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-blue-500"
  />
</div>
</div>
</div>

{/* Location Information */}
{(task.country || task.state || task.latitude || task.longitude || task.name) && (
<div className="mb-2">
  <div className="flex items-center gap-1 mb-1">
    <Globe size={10} className="text-gray-400" />
    <span className="text-xs text-gray-500 dark:text-gray-400">
      {task.country && task.state ? `${task.state}, ${task.country}` : 
       task.country || task.state || (task.name && task.country ? `${task.name} (${task.country})` : task.name || task.country || '')}
    </span>
  </div>
  {(task.latitude && task.longitude) && (
    <div className="flex items-center gap-1">
      <Building2 size={10} className="text-gray-400" />
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {typeof task.latitude === 'number' && typeof task.longitude === 'number' 
          ? `${task.latitude.toFixed(4)}, ${task.longitude.toFixed(4)}`
          : `${task.latitude}, ${task.longitude}`}
      </span>
    </div>
  )}
</div>
)}

{labels.length > 0 && (
<div className="flex flex-wrap gap-1 mb-3">
{labels.map((label: string, index: number) => (
<span
key={index}
className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded"
>
{label}
</span>
))}
</div>
)}



{/* Evaluation Score */}
<div className="flex items-center justify-end mt-2">
  <div className="flex items-center gap-1">
    <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${
      task.evaluation_score !== null && task.evaluation_score !== undefined
        ? task.evaluation_score >= 80
          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
          : task.evaluation_score >= 60
          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
    }`}>
      {task.evaluation_score !== null && task.evaluation_score !== undefined ? task.evaluation_score : '-'}
    </span>
  </div>
</div>
</div>
);
};

// Column component
const Column = ({ 
column, 
tasks, 
onDragStart, 
onDragOver, 
onDrop, 
onDragEnd, 
draggedTask,
draggedOver,
onDragLeave,
onUpdateTask,
onOpenDetails
}: { 
column: typeof columns[0]; 
tasks: Task[];
onDragStart: (e: React.DragEvent, task: Task) => void;
onDragOver: (e: React.DragEvent, columnId: string) => void;
onDrop: (e: React.DragEvent, targetStatus: Task['status']) => void;
onDragEnd: () => void;
draggedTask: Task | null;
draggedOver: string | null;
onDragLeave: () => void;
onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
onOpenDetails: (task: Task) => void;
}) => {
const columnTasks = tasks
  .filter(task => task.status === column.id)
  .sort((a, b) => {
    // Sort saved mines to the top
    const aSaved = isMineSaved(a.id);
    const bSaved = isMineSaved(b.id);
    
    if (aSaved && !bSaved) return -1;
    if (!aSaved && bSaved) return 1;
    
    // If both have same save status, maintain original order
    return 0;
  });
const isDraggedOver = draggedOver === column.id && draggedTask?.status !== column.id;

return (
<div 
className="flex flex-col flex-1 min-w-0 min-h-0"
onDragOver={(e) => onDragOver(e, column.id)}
onDragLeave={onDragLeave}
onDrop={(e) => onDrop(e, column.id as Task['status'])}
>
<div className="flex-shrink-0 pb-4">
<div className="flex items-center justify-between mb-3">
<div className="flex items-center gap-2">
<h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
  {column.title}
</h3>
<span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
  {columnTasks.length}
</span>
</div>
<MoreHorizontal size={16} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer" />
</div>
</div>

<div className={`flex-1 overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out pb-6 ${isDraggedOver ? 'bg-blue-50 dark:bg-blue-900/10 rounded-lg p-2' : ''}`}>
<div className="space-y-0 pr-2">
{columnTasks.map(task => (
<TaskCard 
  key={task.id} 
  task={task} 
  onDragStart={onDragStart}
  onDragEnd={onDragEnd}
  isDragging={draggedTask?.id === task.id}
  onUpdateTask={onUpdateTask}
  onOpenDetails={onOpenDetails}
/>
))}
{isDraggedOver && (
<div className="border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg p-4 mb-3 bg-blue-50/50 dark:bg-blue-900/20 transition-all duration-300 ease-in-out">
  <div className="text-center text-blue-600 dark:text-blue-400 text-sm">
    Drop task here
  </div>
</div>
)}
</div>
</div>
</div>
);
};


export default function Board() {
const [tasks, setTasks] = useState<Task[]>([]);
const [draggedTask, setDraggedTask] = useState<Task | null>(null);
const [draggedOver, setDraggedOver] = useState<string | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [globalSearchTerm, setGlobalSearchTerm] = useState('');
const [isRefreshing, setIsRefreshing] = useState(false);
const [showHelpDropdown, setShowHelpDropdown] = useState(false);
const [selectedMineId, setSelectedMineId] = useState<string | null>(null);
const [isMineDetailsPanelExpanded, setIsMineDetailsPanelExpanded] = useState<boolean>(false);
const [offset, setOffset] = useState(0);
const [isLoadingMore, setIsLoadingMore] = useState(false);
const helpDropdownRef = useRef<HTMLDivElement>(null);

// Fetch mine evaluation data from API
const fetchMineEvaluations = async (resetData = true) => {
if (resetData) {
  setLoading(true);
  setOffset(0);
} else {
  setIsLoadingMore(true);
}
setIsRefreshing(true);
setError(null);

try {
const currentOffset = resetData ? 0 : offset;
const response = await fetch(`http://localhost:5174/api/v1/evaluation-board/mines?limit=100&offset=${currentOffset}&include_columns=mine_id,latitude,longitude,primary_name,commodities,evaluation_status,evaluation_score,country`);
if (!response.ok) {
  throw new Error(`HTTP error! status: ${response.status}`);
}

const apiData = await response.json();
const mines = apiData.data;

// Transform API data to match Task interface
const transformedTasks: Task[] = mines.map((item: any) => ({
  id: item.mine_id,
  name: item.primary_name,
  latitude: item.latitude,
  longitude: item.longitude,
  country: item.country,
  state: null,
  description: `Mine: ${item.primary_name || 'Unnamed'}`,
  status: (item.evaluation_status || 'not_evaluated') as Task['status'],
  source_name: null,
  commodities: item.commodities ? (typeof item.commodities === 'string' ? item.commodities.split(',').map((c: string) => c.trim()) : item.commodities) : [],
  evaluation_score: item.evaluation_score || null
}));

if (resetData) {
  setTasks(transformedTasks);
} else {
  setTasks(prevTasks => [...prevTasks, ...transformedTasks]);
  setOffset(currentOffset + 100);
}
} catch (err) {
console.error('Failed to load mines:', err);
setError('Failed to load mines. Please try again.');
} finally {
setLoading(false);
setIsRefreshing(false);
setIsLoadingMore(false);
}
};

// Fetch data on component mount
useEffect(() => {
fetchMineEvaluations();
}, []);

// Handle click outside to close help dropdown
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

const handleDragStart = (e: React.DragEvent, task: Task) => {
setDraggedTask(task);
e.dataTransfer.effectAllowed = 'move';
e.dataTransfer.setData('text/plain', task.id);
};

const handleDragOver = (e: React.DragEvent, columnId: string) => {
e.preventDefault();
e.dataTransfer.dropEffect = 'move';
setDraggedOver(columnId);
};

const handleDragLeave = () => {
setDraggedOver(null);
};

const handleDrop = async (e: React.DragEvent, targetStatus: Task['status']) => {
e.preventDefault();

if (!draggedTask) return;

if (draggedTask.status !== targetStatus) {
// Optimistically update the UI
const originalStatus = draggedTask.status;
setTasks(prevTasks => {
return prevTasks.map(task => 
task.id === draggedTask.id 
? { ...task, status: targetStatus }
: task
);
});

// Update evaluation status via API
try {
const response = await fetch(`http://localhost:5174/api/v1/schemas/data_clean/tables/dim_evaluations/row?id_key=mine_id&id_value=${draggedTask.id}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    evaluation_status: targetStatus
  }),
});

if (!response.ok) {
  throw new Error(`HTTP error! status: ${response.status}`);
}

console.log(`Successfully moved mine ${draggedTask.id} from ${originalStatus} to ${targetStatus}`);
} catch (err) {
console.error('Failed to update evaluation status:', err);
// Revert the optimistic update
setTasks(prevTasks => {
  return prevTasks.map(task => 
    task.id === draggedTask.id 
    ? { ...task, status: originalStatus }
    : task
  );
});
}
}

setDraggedTask(null);
setDraggedOver(null);
};

const handleDragEnd = () => {
setDraggedTask(null);
setDraggedOver(null);
};

const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
setTasks(prevTasks => 
prevTasks.map(task => 
task.id === taskId 
? { ...task, ...updates }
: task
)
);
};

const handleOpenMineDetails = (task: Task) => {
setSelectedMineId(task.id);
setIsMineDetailsPanelExpanded(true);
};

const handleCloseMineDetailsPanel = () => {
setSelectedMineId(null);
setIsMineDetailsPanelExpanded(false);
};

const handleLoadMore = () => {
fetchMineEvaluations(false);
};

// Filter tasks based on global search
const filteredTasks = tasks.filter(task => {
if (!globalSearchTerm) return true;

const query = globalSearchTerm.toLowerCase();
return (
task.id.toLowerCase().includes(query) ||
(task.name && task.name.toLowerCase().includes(query)) ||
(task.country && task.country.toLowerCase().includes(query)) ||
(task.state && task.state.toLowerCase().includes(query)) ||
task.description.toLowerCase().includes(query)
);
});

return (
<div className="h-screen flex flex-col min-w-0 overflow-hidden">
{/* Header - now shared across all states */}
<Header 
title="Evaluation Board" 
description="Manage and track mine evaluation status across different stages" 
actions={[
<div key="search-actions" className="flex items-center gap-3">
  {/* Global Search Bar */}
  <div className="relative">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
    <input
      type="text"
      placeholder="Search mines..."
      className="flex w-64 items-center rounded-lg px-10 py-2 text-sm transition-all duration-200 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:bg-white dark:focus:bg-gray-800 border border-gray-200 dark:border-gray-600"
      value={globalSearchTerm}
      onChange={(e) => setGlobalSearchTerm(e.target.value)}
    />
  </div>
  
  <button
onClick={() => fetchMineEvaluations(true)}
className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
title="Refresh mines"
aria-label="Refresh mines"
disabled={isRefreshing}
>
<RotateCcw size={16} className={isRefreshing ? 'animate-spin-counter-clockwise' : ''} />
</button>

<button
onClick={handleLoadMore}
className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
title="Load 100 more mines"
aria-label="Load 100 more mines"
disabled={isLoadingMore || isRefreshing}
>
<Plus size={16} className={isLoadingMore ? 'animate-spin' : ''} />
</button>

{/* Help Button */}
<div className="relative" ref={helpDropdownRef}>
  <button
    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
    title="Help"
    aria-label="Help"
    onClick={() => setShowHelpDropdown(!showHelpDropdown)}
  >
    <HelpCircle size={16} />
  </button>
  
  {showHelpDropdown && (
    <div className="absolute right-0 top-12 w-70 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg dark:shadow-gray-900/50 z-20 overflow-hidden">
      <div className="px-3 py-2">
        <h3 className="text-xs font-medium text-gray-900 dark:text-gray-100">How to use the Evaluation Board</h3>
      </div>
      <div className="py-1">
        {helpItems.map((item, index) => (
          <div
            key={index}
            className="w-full px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
          >
            <div className="flex items-start gap-2">
              <div className="text-gray-400 dark:text-gray-500 mt-0.5">
                {item.icon}
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {item.title}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {item.description}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )}
</div>
</div>
]}
/>

  {/* Content */}
  <div className="flex flex-1 min-h-0 px-10">
    
    {/* Main Content */}
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-hidden flex flex-col">
    {loading ? (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Loader2 size={24} className="text-gray-500 dark:text-gray-400 animate-spin" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Loading mines...
          </p>
        </div>
      </div>
    ) : error || filteredTasks.length === 0 ? (
      <div className="flex items-center justify-center h-full">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Ban size={24} className="text-gray-500 dark:text-gray-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            No mines found...
          </p>
        </div>
      </div>
    ) : (
      <div className="flex-1 min-h-0">
        <div className="flex gap-6 h-full overflow-hidden">
          {columns.map(column => (
            <Column 
              key={column.id} 
              column={column} 
              tasks={filteredTasks}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onDragLeave={handleDragLeave}
              draggedTask={draggedTask}
              draggedOver={draggedOver}
              onUpdateTask={handleUpdateTask}
              onOpenDetails={handleOpenMineDetails}
            />
          ))}
        </div>
      </div>
    )}
  </div>
</div>

{/* Mine Details Panel */}
<MineDetailsPanel 
  isOpen={isMineDetailsPanelExpanded}
  mine_id={selectedMineId}
  onClose={handleCloseMineDetailsPanel}
/>

</div>
);
}