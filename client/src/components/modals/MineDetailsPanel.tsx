import { X, ChevronDown, MessageSquare, ExternalLink, BarChart3, Clock, RotateCw, Search, Ban, Loader2, MapPin, Map, Database, FileText, CheckSquare, Star } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useSidebar } from '../../contexts/SidebarContext';
import { toggleMineSave, isMineSaved } from '../../utils/helpers';

interface MineDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  mine_id: string | null;
}

interface MineDetails {
  collection: string;
  dataset: string;
  mine_id: string;
  data: Record<string, any>;
}

interface SectionConfig {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: string[];
  expanded?: boolean;
}

const SECTIONS: Record<string, SectionConfig> = {
  dimSpatial: { key: 'dimSpatial', label: 'Spatial Data', icon: MapPin, fields: ['latitude', 'longitude'], expanded: true },
  dimLocations: { key: 'dimLocations', label: 'Locations', icon: MapPin, fields: ['country', 'state', 'district', 'electorate', 'rez_zone', 'city', 'region'] },
  dimIdentification: { key: 'dimIdentification', label: 'Identification', icon: MessageSquare, fields: ['primary_name', 'alternate_name', 'description', 'mine_id_external'] },
  dimStatus: { key: 'dimStatus', label: 'Status', icon: Clock, fields: ['status', 'status_detail', 'closure_year', 'closure_reason', 'closure_window', 'opening_year'] },
  dimCompany: { key: 'dimCompany', label: 'Company', icon: ExternalLink, fields: ['company_name', 'company_website', 'parent_company', 'equity_partners'] },
  dimEnergy: { key: 'dimEnergy', label: 'Energy', icon: BarChart3, fields: ['grid_connection'] },
  dimEvaluations: { key: 'dimEvaluations', label: 'Evaluations', icon: CheckSquare, fields: ['evaluation_status', 'evaluation_description', 'evaluation_score'] },
  dimPlacesApi: { key: 'dimPlacesApi', label: 'Places API', icon: MapPin, fields: [], expanded: false },
  dimRaw: { key: 'dimRaw', label: 'Raw Data', icon: Database, fields: ['source_table', 'source_sheet', 'row_id'] }
};

export function MineDetailsPanel({ isOpen, onClose, mine_id }: MineDetailsPanelProps) {
  const navigate = useNavigate();
  const [details, setDetails] = useState<MineDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelHeight, setPanelHeight] = useState(375);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedSections, setExpandedSections] = useState(
    Object.fromEntries(Object.entries(SECTIONS).map(([key, section]) => [key, section.expanded || false]))
  );
  const [isSaved, setIsSaved] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionText, setDescriptionText] = useState('');
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [currentEvaluationStatus, setCurrentEvaluationStatus] = useState<string>('not_evaluated');
  const [currentEvaluationScore, setCurrentEvaluationScore] = useState<number | null>(null);
  const [isEditingScore, setIsEditingScore] = useState(false);
  
  const dragRef = useRef({ startY: 0, startHeight: 250, isDragging: false });
  const { isExpanded: isSidebarExpanded } = useSidebar();

  // Helper functions
  const getWindowHeight = () => typeof window !== 'undefined' ? window.innerHeight : 800;
  const isFullscreen = isFullscreenMode || panelHeight >= getWindowHeight();
  const shouldShowValue = (value: any) => value !== null && value !== undefined && value !== '';
  const getFieldsWithValues = (fields: string[]) => 
    !details?.data ? [] : fields.filter(field => shouldShowValue(details.data[field]));

  const highlightText = (text: any, highlight: string) => {
    if (!text || !highlight.trim()) return String(text || '');
    const str = String(text);
    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = str.split(regex);
    return parts.map((part: string, index: number) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800/50 text-black dark:text-white px-0.5 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  // Event handlers
  const handleToggleSection = (sectionName: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

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
    if (panelHeight >= windowHeight * 0.9) {
      setPanelHeight(windowHeight);
      setIsFullscreenMode(true);
    } else {
      setIsFullscreenMode(false);
    }
    dragRef.current.isDragging = false;
    setIsDragging(false);
  }, [panelHeight]);

  // API calls
  const fetchMineDetails = async () => {
    if (!mine_id) return;
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `http://localhost:5174/api/v1/schemas/data_analytics/tables/mine_summary/row?id_key=mine_id&id_value=${mine_id}`
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`${response.status}: ${errorData.message || 'Failed to fetch mine data'}`);
      }
      
      const result = await response.json();
      if (result.data) {
        setDetails({
          collection: 'data_analytics',
          dataset: 'mine_summary',
          mine_id: mine_id,
          data: result.data
        });
      } else {
        setError(`No mine found with ID: ${mine_id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch mine data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEvaluationStatus = async (newStatus: string) => {
    if (!mine_id) return;
    setCurrentEvaluationStatus(newStatus);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const response = await fetch(`http://localhost:5174/api/v1/schemas/data_clean/tables/dim_evaluations/row?id_key=mine_id&id_value=${mine_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluation_status: newStatus })
      });

      if (response.ok) {
        await fetchMineDetails();
      } else {
        throw new Error(`Failed to update mine evaluation status: ${response.status}`);
      }
    } catch (error) {
      setCurrentEvaluationStatus(details?.data?.evaluation_status || 'not_evaluated');
    }
  };

  const handleUpdateEvaluationScore = async (newScore: number) => {
    if (!mine_id) return;
    setCurrentEvaluationScore(newScore);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const response = await fetch(`http://localhost:5174/api/v1/schemas/data_clean/tables/dim_evaluations/row?id_key=mine_id&id_value=${mine_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluation_score: newScore })
      });

      if (response.ok) {
        await fetchMineDetails();
      } else {
        throw new Error(`Failed to update mine evaluation score: ${response.status}`);
      }
    } catch (error) {
      setCurrentEvaluationScore(details?.data?.evaluation_score || null);
    }
  };

  const handleSaveDescription = async () => {
    if (!mine_id) return;
    setIsSavingDescription(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const response = await fetch(`http://localhost:5174/api/v1/schemas/data_clean/tables/dim_evaluations/row?id_key=mine_id&id_value=${mine_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluation_description: descriptionText.trim() || 'No Description' })
      });

      if (response.ok) {
        setIsEditingDescription(false);
        await fetchMineDetails();
      } else {
        throw new Error(`Failed to update mine evaluation description: ${response.status}`);
      }
    } catch (error) {
      console.error('Error updating mine description:', error);
    } finally {
      setIsSavingDescription(false);
    }
  };

  // Effects
  useEffect(() => {
    if (mine_id) setIsSaved(isMineSaved(mine_id));
  }, [mine_id]);

  useEffect(() => {
    if (details?.data?.evaluation_description) {
      setDescriptionText(details.data.evaluation_description);
    }
  }, [details?.data?.evaluation_description]);

  useEffect(() => {
    const status = details?.data?.evaluation_status || 'not_evaluated';
    setCurrentEvaluationStatus(status);
  }, [details?.data?.evaluation_status]);

  useEffect(() => {
    const score = details?.data?.evaluation_score || null;
    setCurrentEvaluationScore(score);
  }, [details?.data?.evaluation_score]);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditingDescription) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSaveDescription();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setDescriptionText(details?.data?.evaluation_description || '');
        setIsEditingDescription(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditingDescription, details?.data?.evaluation_description]);

  useEffect(() => {
    if (isOpen && mine_id) fetchMineDetails();
  }, [isOpen, mine_id]);

  // Render helpers
  const renderArrayField = (data: any[], type: 'commodities' | 'documentation' | 'shafts') => {
    if (!data?.length) return <span className="text-sm text-gray-900 dark:text-white">N/A</span>;

    return data.map((item: any, index: number) => (
      <li key={index}>
        <div className="flex items-center rounded-md px-2 py-1.5 text-sm text-gray-600 dark:text-gray-400">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {type.slice(0, -1)} {index + 1}
          </span>
        </div>
        <div className="ml-4 px-2 py-0.5 space-y-1">
          {type === 'documentation' ? (
            <a href={item} target="_blank" rel="noopener noreferrer" 
               className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all">
              {highlightText(item, searchQuery)}
            </a>
          ) : type === 'commodities' ? (
            <>
              {item.commodity && <div><span className="text-xs font-medium text-gray-400 mr-2">Type:</span><span className="text-sm text-gray-900 dark:text-white">{highlightText(item.commodity, searchQuery)}</span></div>}
              {item.coal_type && <div><span className="text-xs font-medium text-gray-400 mr-2">Coal Type:</span><span className="text-sm text-gray-900 dark:text-white">{highlightText(item.coal_type, searchQuery)}</span></div>}
              {item.coal_grade && <div><span className="text-xs font-medium text-gray-400 mr-2">Coal Grade:</span><span className="text-sm text-gray-900 dark:text-white">{highlightText(item.coal_grade, searchQuery)}</span></div>}
            </>
          ) : (
            <>
              {Object.entries(item).map(([key, value]) => (
                value && <div key={key}>
                  <span className="text-xs font-medium text-gray-400 mr-2">{key.replace('_', ' ')}:</span>
                  <span className="text-sm text-gray-900 dark:text-white">{highlightText(String(value), searchQuery)}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </li>
    ));
  };

  const renderSection = (sectionKey: string, section: SectionConfig) => {
    const Icon = section.icon;
    const fieldsWithValues = getFieldsWithValues(section.fields);

    return (
      <li key={sectionKey}>
        <button
          onClick={() => handleToggleSection(sectionKey)}
          className="flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 justify-between text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <span>{section.label}</span>
          </div>
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform duration-200 dark:text-gray-500 ${expandedSections[sectionKey] ? 'rotate-180' : ''}`}
          />
        </button>
        {expandedSections[sectionKey] && (
          <div className="overflow-hidden transition-all duration-300">
            <ul className="ml-2 mt-2 mb-4 border-l border-gray-200 dark:border-white/[0.05] pl-3 space-y-0.5">
              {fieldsWithValues.map((column) => (
                <li key={column}>
                  <div className="flex items-center rounded-md px-2 py-1.5 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {column.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="ml-4 px-2 py-0.5">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {column === 'company_website' && details?.data?.[column] ? (
                        <a href={details.data[column]} target="_blank" rel="noopener noreferrer"
                           className="text-blue-600 dark:text-blue-400 hover:underline break-all">
                          {highlightText(String(details.data[column]), searchQuery)}
                        </a>
                      ) : (
                        highlightText(String(details?.data?.[column] || ''), searchQuery)
                      )}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </li>
    );
  };

  const renderPlacesApiSection = (sectionKey: string, section: SectionConfig) => {
    const Icon = section.icon;
    const nearestAirport = details?.data?.nearest_airport;
    const nearestTrainStation = details?.data?.nearest_train_station;

    return (
      <li key={sectionKey}>
        <button
          onClick={() => handleToggleSection(sectionKey)}
          className="flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 justify-between text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <span>{section.label}</span>
          </div>
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform duration-200 dark:text-gray-500 ${expandedSections[sectionKey] ? 'rotate-180' : ''}`}
          />
        </button>
        {expandedSections[sectionKey] && (
          <div className="overflow-hidden transition-all duration-300">
            <ul className="ml-2 mt-2 mb-4 border-l border-gray-200 dark:border-white/[0.05] pl-3 space-y-0.5">
              {nearestAirport && (
                <li>
                  <div className="flex items-center rounded-md px-2 py-1.5 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Nearest Airport
                    </span>
                  </div>
                  <div className="ml-4 px-2 py-0.5 space-y-1">
                    {nearestAirport.name && (
                      <div>
                        <span className="text-xs font-medium text-gray-400 mr-2">Name:</span>
                        <span className="text-sm text-gray-900 dark:text-white">{highlightText(nearestAirport.name, searchQuery)}</span>
                      </div>
                    )}
                    {nearestAirport.address && (
                      <div>
                        <span className="text-xs font-medium text-gray-400 mr-2">Address:</span>
                        <span className="text-sm text-gray-900 dark:text-white">{highlightText(nearestAirport.address, searchQuery)}</span>
                      </div>
                    )}
                    {nearestAirport.location && (
                      <div>
                        <span className="text-xs font-medium text-gray-400 mr-2">Location:</span>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {nearestAirport.location.latitude?.toFixed(6)}, {nearestAirport.location.longitude?.toFixed(6)}
                        </span>
                      </div>
                    )}
                  </div>
                </li>
              )}
              {nearestTrainStation && (
                <li>
                  <div className="flex items-center rounded-md px-2 py-1.5 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Nearest Train Station
                    </span>
                  </div>
                  <div className="ml-4 px-2 py-0.5 space-y-1">
                    {nearestTrainStation.name && (
                      <div>
                        <span className="text-xs font-medium text-gray-400 mr-2">Name:</span>
                        <span className="text-sm text-gray-900 dark:text-white">{highlightText(nearestTrainStation.name, searchQuery)}</span>
                      </div>
                    )}
                    {nearestTrainStation.address && (
                      <div>
                        <span className="text-xs font-medium text-gray-400 mr-2">Address:</span>
                        <span className="text-sm text-gray-900 dark:text-white">{highlightText(nearestTrainStation.address, searchQuery)}</span>
                      </div>
                    )}
                    {nearestTrainStation.location && (
                      <div>
                        <span className="text-xs font-medium text-gray-400 mr-2">Location:</span>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {nearestTrainStation.location.latitude?.toFixed(6)}, {nearestTrainStation.location.longitude?.toFixed(6)}
                        </span>
                      </div>
                    )}
                  </div>
                </li>
              )}
              {!nearestAirport && !nearestTrainStation && (
                <li>
                  <div className="ml-4 px-2 py-0.5">
                    <span className="text-sm text-gray-500 dark:text-gray-400">No Places API data available</span>
                  </div>
                </li>
              )}
            </ul>
          </div>
        )}
      </li>
    );
  };

  if (!isOpen || !mine_id) return null;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Loader2 size={24} className="text-gray-500 dark:text-gray-400 animate-spin" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Loading details...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Ban size={24} className="text-gray-500 dark:text-gray-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">No details found...</p>
        </div>
      );
    }

    const getScoreClass = (score: number) => 
      score >= 80 ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
      score >= 60 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
      'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';

    const getStatusClass = (status: string) =>
      status === 'not_evaluated' ? 'bg-gray-500' :
      status === 'under_review' ? 'bg-blue-600' :
      status === 'shortlisted' ? 'bg-purple-600' :
      status === 'approved' ? 'bg-green-600' :
      status === 'rejected' ? 'bg-red-600' : 'bg-gray-500';

    return (
      <div className="flex flex-col h-full">
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto px-6 py-6">
            <div className="w-full mx-auto px-6 pt-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {details?.data?.mine_name || details?.data?.primary_name || details?.data?.name || "Unnamed Mine"}
                  </h1>
                  <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-1">ID: {mine_id}</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {details?.data?.description || details?.data?.alternate_name || details?.data?.company_name || "No description available..."}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex w-64 items-center rounded-lg px-10 py-2 text-sm transition-all duration-200 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:bg-gray-200 dark:focus:bg-gray-700"
                    />
                  </div>

                  {/* Score */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Score:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={currentEvaluationScore ?? ''}
                      onFocus={() => setIsEditingScore(true)}
                      onBlur={() => {
                        setIsEditingScore(false);
                        if (currentEvaluationScore !== null) {
                          handleUpdateEvaluationScore(currentEvaluationScore);
                        }
                      }}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          setCurrentEvaluationScore(null);
                        } else {
                          const score = Math.round(Math.min(100, Math.max(0, parseFloat(value) || 0)));
                          setCurrentEvaluationScore(score);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      className={`text-xs px-2 py-1 font-medium w-8 h-8 text-center border-0 focus:outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] transition-all ${
                        isEditingScore ? 'rounded-lg w-16' : 'rounded-full'
                      } ${currentEvaluationScore ? getScoreClass(currentEvaluationScore) : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                      placeholder="-"
                    />
                  </div>

                  {/* Status Dropdown */}
                  <div className="relative">
                    <select
                      value={currentEvaluationStatus}
                      onChange={(e) => handleUpdateEvaluationStatus(e.target.value)}
                      className={`text-white px-6 py-2 pr-10 rounded-md text-sm font-medium border-0 focus:outline-none min-w-[140px] appearance-none cursor-pointer ${getStatusClass(currentEvaluationStatus)}`}
                    >
                      <option value="not_evaluated">Not Evaluated</option>
                      <option value="under_review">Under Review</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white pointer-events-none" />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => {
                        if (isFullscreen) {
                          setIsFullscreenMode(false);
                          setPanelHeight(getWindowHeight() * 0.6);
                        } else {
                          setIsFullscreenMode(true);
                          setPanelHeight(getWindowHeight());
                        }
                      }}
                      className="p-2 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      title={isFullscreen ? "Minimize" : "Maximize"}
                    >
                      {isFullscreen ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={onClose}
                      className="p-2 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      title="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => { setIsRefreshing(true); fetchMineDetails().finally(() => setIsRefreshing(false)); }}
                        disabled={isRefreshing} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60">
                  <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button onClick={() => { setIsSaved(toggleMineSave(mine_id!)); }} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Star className={`w-4 h-4 ${isSaved ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                  {isSaved ? "Saved" : "Save"}
                </button>
                <button onClick={() => navigate(`/visualisation/interactive-map?mine_id=${mine_id}`)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Map className="w-4 h-4" />
                  Maps
                </button>
              </div>
            </div>

            {/* Content Sections */}
            <div className="w-full mx-auto space-y-8 p-6">
              {/* Description */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Description</h2>
                <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.05] rounded-lg p-6">
                  {isEditingDescription ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Edit Description</span>
                        </div>
                      </div>
                      <textarea value={descriptionText} onChange={(e) => setDescriptionText(e.target.value)}
                                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md resize-none focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 p-3"
                                rows={6} placeholder="Add a description for this mine evaluation..." autoFocus />
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex gap-2">
                          <button onClick={handleSaveDescription} disabled={isSavingDescription}
                                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors duration-200 flex items-center gap-1.5 ${
                                    !isSavingDescription ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  }`}>
                            {isSavingDescription ? <><Loader2 className="w-3 h-3 animate-spin" />Saving...</> : <><CheckSquare className="w-3 h-3" />Save</>}
                          </button>
                          <button onClick={() => { setDescriptionText(details?.data?.evaluation_description || ''); setIsEditingDescription(false); }}
                                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 flex items-center gap-1.5">
                            <X className="w-3 h-3" />Cancel
                          </button>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">Ctrl+Enter</kbd> to save • <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">Esc</kbd> to cancel
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed cursor-pointer"
                       onClick={() => setIsEditingDescription(true)}>
                      {descriptionText || "Click to add description..."}
                    </p>
                  )}
                </div>
              </div>

              {/* Images */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  Mine Images <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-sm font-medium">(2)</span>
                </h2>
                <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.05] rounded-lg p-6">
                  {details?.data?.latitude && details?.data?.longitude ? (
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { title: 'Satellite View', maptype: 'satellite', zoom: 15 },
                        { title: 'Terrain View', maptype: 'terrain', zoom: 13 }
                      ].map(({ title, maptype, zoom }) => {
                        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.GOOGLE_MAPS_API_KEY;
                        const lat = details.data.latitude;
                        const lng = details.data.longitude;

                        // Check if API key is available
                        if (!apiKey) {
                          console.error('Google Maps API key is not configured');
                          return (
                            <div key={title} className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                              <div className="text-center text-gray-500 dark:text-gray-400 p-4">
                                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <p className="text-sm">API Key Missing</p>
                              </div>
                            </div>
                          );
                        }

                        const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=600x400&maptype=${maptype}&markers=color:red%7C${lat},${lng}&key=${apiKey}`;

                        return (
                          <div key={title} className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden relative group">
                            <img
                              src={mapUrl}
                              alt={title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error(`Failed to load ${title} from Google Maps Static API`, {
                                  maptype,
                                  zoom,
                                  lat,
                                  lng,
                                  hasApiKey: !!apiKey
                                });
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `
                                    <div class="w-full h-full flex items-center justify-center text-center text-gray-500 dark:text-gray-400">
                                      <div>
                                        <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p class="text-sm">${title}</p>
                                        <p class="text-xs mt-1">Failed to load</p>
                                      </div>
                                    </div>
                                  `;
                                }
                              }}
                              onLoad={() => {
                                console.log(`Successfully loaded ${title}`);
                              }}
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-white text-sm font-medium">{title}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Location coordinates not available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Mine Shafts */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  Mine Shafts
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-sm font-medium">
                    ({details?.data?.shafts?.length || 0})
                  </span>
                </h2>
                <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.05] rounded-lg p-6">
                  {details?.data?.shafts && details.data.shafts.length > 0 ? (
                    <div className="space-y-4">
                      {details.data.shafts.map((shaft: any, index: number) => (
                        <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                          <div className="flex items-center mb-3">
                            <Database className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              Shaft {index + 1}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(shaft).map(([key, value]) =>
                              value ? (
                                <div key={key} className="flex flex-col">
                                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                    {key.replace(/_/g, ' ')}
                                  </span>
                                  <span className="text-sm text-gray-900 dark:text-white">
                                    {highlightText(String(value), searchQuery)}
                                  </span>
                                </div>
                              ) : null
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Database className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No shaft information available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Documentation */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  Documentation
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-sm font-medium">
                    ({details?.data?.documentation?.length || 0})
                  </span>
                </h2>
                <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.05] rounded-lg p-6">
                  {details?.data?.documentation && details.data.documentation.length > 0 ? (
                    <div className="space-y-3">
                      {details.data.documentation.map((doc: string, index: number) => (
                        <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                          <div className="flex items-center mb-2">
                            <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              Document {index + 1}
                            </span>
                          </div>
                          <a href={doc} target="_blank" rel="noopener noreferrer"
                             className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all block">
                            {highlightText(doc, searchQuery)}
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No documentation available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Commodities */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  Commodities
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-sm font-medium">
                    ({details?.data?.commodities?.length || 0})
                  </span>
                </h2>
                <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.05] rounded-lg p-6">
                  {details?.data?.commodities && details.data.commodities.length > 0 ? (
                    <div className="space-y-4">
                      {details.data.commodities.map((commodity: any, index: number) => (
                        <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                          <div className="flex items-center mb-3">
                            <Database className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              Commodity {index + 1}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {commodity.commodity && (
                              <div className="flex flex-col">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                  Type
                                </span>
                                <span className="text-sm text-gray-900 dark:text-white">
                                  {highlightText(commodity.commodity, searchQuery)}
                                </span>
                              </div>
                            )}
                            {commodity.coal_type && (
                              <div className="flex flex-col">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                  Coal Type
                                </span>
                                <span className="text-sm text-gray-900 dark:text-white">
                                  {highlightText(commodity.coal_type, searchQuery)}
                                </span>
                              </div>
                            )}
                            {commodity.coal_grade && (
                              <div className="flex flex-col">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                  Coal Grade
                                </span>
                                <span className="text-sm text-gray-900 dark:text-white">
                                  {highlightText(commodity.coal_grade, searchQuery)}
                                </span>
                              </div>
                            )}
                            {Object.entries(commodity).map(([key, value]) =>
                              value && !['commodity', 'coal_type', 'coal_grade'].includes(key) ? (
                                <div key={key} className="flex flex-col">
                                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                    {key.replace(/_/g, ' ')}
                                  </span>
                                  <span className="text-sm text-gray-900 dark:text-white">
                                    {highlightText(String(value), searchQuery)}
                                  </span>
                                </div>
                              ) : null
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Database className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No commodity information available</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l border-gray-200 dark:border-white/[0.05] flex flex-col p-6">
            <div className="flex-1 overflow-auto">
              <ul className="flex flex-col gap-1.5">
                {Object.entries(SECTIONS).map(([key, section]) =>
                  key === 'dimPlacesApi' ? renderPlacesApiSection(key, section) : renderSection(key, section)
                )}
                
                {/* Array fields */}
                {['factCommodities', 'factDocumentation', 'factShafts'].map(key => {
                  const configMap: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; data: any; type: 'commodities' | 'documentation' | 'shafts' }> = {
                    factCommodities: { label: 'Commodities', icon: Database, data: details?.data?.commodities, type: 'commodities' as const },
                    factDocumentation: { label: 'Documentation', icon: FileText, data: details?.data?.documentation, type: 'documentation' as const },
                    factShafts: { label: 'Shafts', icon: Database, data: details?.data?.shafts, type: 'shafts' as const }
                  };
                  const config = configMap[key];
                  if (!config) return null;
                  
                  const Icon = config.icon;
                  return (
                    <li key={key}>
                      <button onClick={() => handleToggleSection(key)}
                              className="flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 justify-between text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span>{config.label}</span>
                        </div>
                        <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 dark:text-gray-500 ${expandedSections[key] ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedSections[key] && (
                        <div className="overflow-hidden transition-all duration-300">
                          <ul className="ml-2 mt-2 mb-4 border-l border-gray-200 dark:border-white/[0.05] pl-3 space-y-0.5">
                            {renderArrayField(config.data, config.type)}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Timestamps */}
            <div className="p-4 border-t border-gray-200 dark:border-white/[0.05] mt-auto">
              <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                <div>Created {details?.data?.created_at ? new Date(details.data.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + new Date(details.data.created_at).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }) : '12 March 2024 9:15 AM'}</div>
                <div>Updated {details?.data?.updated_at ? new Date(details.data.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + new Date(details.data.created_at).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }) : '1 hour ago'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex items-end" 
         style={{ pointerEvents: isDragging ? 'none' : 'auto', left: isSidebarExpanded ? '236px' : '74px' }}>
      <div className="absolute inset-0 bg-gray-900/40 dark:bg-gray-900/70 transition-all duration-300" onClick={onClose} />
      <div className={`relative bg-white dark:bg-gray-900 w-full ${isFullscreen ? '' : 'rounded-t-xl'} ${isDragging ? 'border-t-2 border-blue-500' : ''}`}
           style={{ height: `${panelHeight}px` }}>
        <div className={`absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-1 rounded-full cursor-ns-resize transition-colors duration-200 z-20 ${
          isDragging ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
        }`} onMouseDown={handleDragStart} />
        <div className="h-full">{renderContent()}</div>
      </div>
    </div>
  );
}