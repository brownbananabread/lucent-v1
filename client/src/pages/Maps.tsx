import React, { useRef, useEffect, useState } from 'react';
import { Search, ZoomIn, ZoomOut, RotateCw, Map, Maximize2, Minimize2, Mountain, Satellite, Navigation, Ellipsis } from 'lucide-react';
import { APIProvider, Map as GoogleMap, Marker } from '@vis.gl/react-google-maps';
import { useSearchParams } from 'react-router';
import { useTheme } from '../contexts/ThemeContext';
import { useMineDetails } from '../contexts/MineDetailsContext';
import MineFiltersModal from '../components/modals/MineFiltersModal';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.GOOGLE_MAPS_API_KEY;

// Basic circle marker icon - simplified for compatibility
const createMarkerIcon = (color: string) => {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8" fill="${color}" stroke="white" stroke-width="2"/>
    </svg>
  `)}`;
};

// Helper function to get map type icon and label
const getMapTypeInfo = (type: 'roadmap' | 'satellite' | 'hybrid' | 'terrain') => {
  switch (type) {
    case 'roadmap':
      return { icon: Map, label: 'Roadmap' };
    case 'satellite':
      return { icon: Satellite, label: 'Satellite' };
    case 'hybrid':
      return { icon: Navigation, label: 'Hybrid' };
    case 'terrain':
      return { icon: Mountain, label: 'Terrain' };
    default:
      return { icon: Map, label: 'Roadmap' };
  }
};

export default function MapsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mine_id = searchParams.get('mine_id');
  const { isDarkMode } = useTheme();
  const { openMineDetails } = useMineDetails();

  // Initialize state from URL parameters
  const [viewType, setViewType] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>(() => {
    const urlMapType = searchParams.get('map_type') as 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
    if (urlMapType && ['roadmap', 'satellite', 'hybrid', 'terrain'].includes(urlMapType)) {
      return urlMapType;
    }
    const saved = localStorage.getItem('mapViewType');
    return (saved as 'roadmap' | 'satellite' | 'hybrid' | 'terrain') || 'roadmap';
  });
  const [zoom, setZoom] = useState(4);
  const [center, setCenter] = useState({ lat: -25.2744, lng: 133.7751 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<any[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  
  // Data and layers
  const [dataPoints, setDataPoints] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [returnedRows, setReturnedRows] = useState(0);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Initialize filter state from URL parameters
  const [selectedCountries, setSelectedCountries] = useState<string[]>(() => {
    const urlCountries = searchParams.get('countries');
    return urlCountries ? urlCountries.split(',').filter(c => c.trim()) : [];
  });
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [isCountryExpanded, setIsCountryExpanded] = useState(false);

  // Initialize pagination from URL parameters
  const [limit] = useState(() => {
    const urlLimit = searchParams.get('limit');
    return urlLimit ? parseInt(urlLimit, 10) : 100;
  });
  const [currentOffset, setCurrentOffset] = useState(() => {
    const urlOffset = searchParams.get('offset');
    return urlOffset ? parseInt(urlOffset, 10) : 0;
  });
  
  // Map controls
  const mapRef = useRef<any>(null);
  const zoomInRef = useRef<(() => void) | undefined>();
  const zoomOutRef = useRef<(() => void) | undefined>();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Function to update URL parameters
  const updateUrlParams = (updates: Record<string, string | number | string[] | null>) => {
    const newParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined ||
          (Array.isArray(value) && value.length === 0) ||
          (typeof value === 'string' && value === '')) {
        newParams.delete(key);
      } else if (Array.isArray(value)) {
        newParams.set(key, value.join(','));
      } else {
        newParams.set(key, String(value));
      }
    });

    setSearchParams(newParams);
  };

  // Initialize zoom controls
  useEffect(() => {
    zoomInRef.current = () => setZoom(z => Math.min(z + 1, 22));
    zoomOutRef.current = () => setZoom(z => Math.max(z - 1, 1));
  }, []);


  // Fetch data points
  const fetchDataPoints = async (offset: number = 0, append: boolean = false) => {
    setIsLoading(true);

    // Add 1 second delay for loading
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      let response;
      
      // If mine_id is specified, use the single mine endpoint
      if (mine_id && !append) {
        response = await fetch(`http://localhost:5174/api/v1/spatial/mine/${mine_id}`);
      } else {
        // Use the spatial mines endpoint
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString()
        });

        // Add country filter if countries are selected
        if (selectedCountries.length > 0) {
          params.append('country', selectedCountries.join(','));
        }

        let url = `http://localhost:5174/api/v1/spatial/mines?${params.toString()}`;

        response = await fetch(url);
      }
      
      if (response.ok) {
        const data = await response.json();
        
        let dataArray;
        // Handle single row response (data is an object) vs multiple rows response (data.data is an array)
        if (mine_id && !append && data?.data && !Array.isArray(data.data)) {
          // Single row response - wrap the object in an array
          dataArray = [data.data];
        } else if (data?.data && Array.isArray(data.data)) {
          // Multiple rows response
          dataArray = data.data;
        } else {
          dataArray = [];
        }
        
        // Apply the same filtering logic as the map rendering
        const filteredData = dataArray.filter((d: any) => 
          d.latitude && d.longitude && 
          !isNaN(parseFloat(d.latitude)) && !isNaN(parseFloat(d.longitude))
        );
        
        if (append) {
          setDataPoints(prevPoints => [...prevPoints, ...filteredData]);
          setReturnedRows(prevReturned => prevReturned + filteredData.length);
        } else {
          setDataPoints(filteredData);
          setReturnedRows(mine_id ? filteredData.length : (data.returned_rows || filteredData.length));
          setCurrentOffset(0);
        }
        setTotalRows(mine_id ? filteredData.length : (data.total_rows || 0));

        // Update available countries if provided by API
        if (data.distinct_countries && !append) {
          setAvailableCountries(data.distinct_countries);
        }
      } else {
        throw new Error('API not available');
      }
    } catch (error) {
      // Fallback test data - only use on initial load, not on load more
      if (!append) {
        setDataPoints([
          {
            mine_id: 'MINE001',
            latitude: '-25.2744',
            longitude: '133.7751',
            name: 'Central Mine'
          },
          {
            mine_id: 'MINE002',
            latitude: '-27.4698',
            longitude: '153.0251',
            name: 'Brisbane Mine'
          },
          {
            mine_id: 'MINE003',
            latitude: '-33.8688',
            longitude: '151.2093',
            name: 'Sydney Mine'
          }
        ]);
        setReturnedRows(3);
        setTotalRows(3);
        setCurrentOffset(0);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Update URL parameters when settings change
  useEffect(() => {
    updateUrlParams({
      map_type: viewType,
      countries: selectedCountries,
      limit: limit,
      offset: currentOffset
    });
  }, [viewType, selectedCountries, limit, currentOffset]);

  // Load data on mount - handle initial data loading with proper offset
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);

      // Add 1 second delay for loading
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (currentOffset === 0) {
        // If offset is 0, just load normally
        await fetchDataPoints(0, false);
      } else {
        // If offset > 0, load all data from 0 to currentOffset + limit
        // This ensures we get all previously loaded data plus current page
        const totalToLoad = currentOffset + limit;

        // Temporarily modify the API call to fetch more data
        const params = new URLSearchParams({
          limit: totalToLoad.toString(),
          offset: '0'
        });

        if (selectedCountries.length > 0) {
          params.append('country', selectedCountries.join(','));
        }

        const url = `http://localhost:5174/api/v1/spatial/mines?${params.toString()}`;

        try {
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();

            let dataArray;
            if (data?.data && Array.isArray(data.data)) {
              dataArray = data.data;
            } else {
              dataArray = [];
            }

            const filteredData = dataArray.filter((d: any) =>
              d.latitude && d.longitude &&
              !isNaN(parseFloat(d.latitude)) && !isNaN(parseFloat(d.longitude))
            );

            setDataPoints(filteredData);
            setReturnedRows(filteredData.length);
            setTotalRows(data.total_rows || 0);

            if (data.distinct_countries) {
              setAvailableCountries(data.distinct_countries);
            }
          }
        } catch (error) {
          // Fallback to normal loading
          await fetchDataPoints(currentOffset, false);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadInitialData();
  }, []);

  // Handle mine_id parameter - center map on specific mine
  useEffect(() => {
    if (mine_id && dataPoints.length > 0) {
      const targetMine = dataPoints.find(point => point.mine_id === mine_id);
      if (targetMine) {
        const position = {
          lat: parseFloat(targetMine.latitude),
          lng: parseFloat(targetMine.longitude)
        };
        setCenter(position);
        setZoom(12); // Zoom in to show the specific mine
      }
    }
  }, [mine_id, dataPoints]);


  // Sync map view with theme
  useEffect(() => {
    const newViewType = isDarkMode ? 'satellite' : 'roadmap';
    setViewType(newViewType);
    localStorage.setItem('mapViewType', newViewType);
  }, [isDarkMode]);

  // Save viewType to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('mapViewType', viewType);
  }, [viewType]);

  // Handle place selection
  const handlePlaceSelect = (place: any) => {
    const coordinates = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    };
    setCenter(coordinates);
    setZoom(12);
  };

  // Handle map camera changes
  const handleCameraChanged = (event: any) => {
    if (event?.map && !mapRef.current) {
      mapRef.current = event.map;
    }
    
    if (event?.map) {
      const newZoom = event.map.getZoom?.();
      const newCenter = event.map.getCenter?.();
      if (typeof newZoom === 'number') setZoom(newZoom);
      if (newCenter) {
        setCenter({ lat: newCenter.lat(), lng: newCenter.lng() });
      }
    }
  };

  // Handle marker click - open mine details panel
  const handleMarkerClick = (marker: any) => {
    console.log('Marker clicked:', marker);
    openMineDetails(marker.mine_id);
  };

  // Load more mines from API using pagination
  const loadMoreMines = async () => {
    if (isLoading || returnedRows >= totalRows) return;

    const newOffset = currentOffset + limit;
    setCurrentOffset(newOffset);
    await fetchDataPoints(newOffset, true);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    // Use document.documentElement to include all layout elements in fullscreen
    const root = document.documentElement;
    if (!document.fullscreenElement) {
      root.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  // Handle search expansion - changed from hover to click
  const handleSearchExpand = () => {
    setIsSearchExpanded(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  // Handle search input change with autocomplete
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    
    // Trigger autocomplete
    if (e.target.value.trim() && window.google?.maps?.places) {
      const autocompleteService = new window.google.maps.places.AutocompleteService();
      const request = {
        input: e.target.value.trim(),
        types: ['establishment', 'geocode'],
      };
      
      autocompleteService.getPlacePredictions(request, (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setAutocompleteResults(predictions);
          setShowAutocomplete(true);
        } else {
          setAutocompleteResults([]);
          setShowAutocomplete(false);
        }
      });
    } else {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
    }
  };

  // Handle autocomplete selection
  const handleAutocompleteSelect = (prediction: any) => {
    setSearchQuery(prediction.description);
    setShowAutocomplete(false);
    
    // Get place details
    if (window.google?.maps?.places) {
      const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
      const request = {
        placeId: prediction.place_id,
        fields: ['name', 'geometry', 'place_id', 'formatted_address']
      };
      
      placesService.getDetails(request, (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          const placeData = {
            geometry: { location: place.geometry?.location },
            name: place.name || place.formatted_address,
            formatted_address: place.formatted_address
          };
          handlePlaceSelect(placeData);
          setSearchQuery('');
          setIsSearchExpanded(false);
        }
      });
    }
  };

  // Handle search submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Trigger search using Google Places
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: searchQuery }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const place = {
            geometry: { location: results[0].geometry.location },
            name: results[0].formatted_address,
            formatted_address: results[0].formatted_address
          };
          handlePlaceSelect(place);
          // Clear search query after successful search
          setSearchQuery('');
          // Collapse search bar
          setIsSearchExpanded(false);
        } else {
          // Handle search error - could show a toast notification here
          console.log('Search failed:', status);
        }
      });
    }
  };

  const getFilteredDataPoints = () => {
    // If mine_id is provided, filter to show only that mine
    if (mine_id) {
      return dataPoints.filter(point => point.mine_id === mine_id);
    }
    // Otherwise show all data points
    return dataPoints;
  };

  return (
    <div className="map-container relative h-screen">
      {/* Map Container */}
      <div className="w-full h-full">
        <APIProvider apiKey={API_KEY} libraries={['places']}>
          <GoogleMap
            style={{ width: '100%', height: '100%' }}
            zoom={zoom}
            center={center}
            mapTypeId={viewType}
            disableDefaultUI={true}
            zoomControl={false}
            scaleControl={true}
            gestureHandling="greedy"
            scrollwheel={true}
            onCameraChanged={handleCameraChanged}
          >
            {/* Mine markers */}
            {getFilteredDataPoints().map((point) => {
              const position = {
                lat: parseFloat(point.latitude),
                lng: parseFloat(point.longitude)
              };
              return (
                <Marker
                  key={point.mine_id}
                  position={position}
                  title={point.mine_name || point.name || point.mine_id}
                  icon={createMarkerIcon('#f59e0b')}
                  onClick={() => handleMarkerClick(point)}
                />
              );
            })}
          </GoogleMap>
        </APIProvider>

        {/* Floating toolbar */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full shadow-md px-2 py-1 flex items-center gap-1">
            {isSearchExpanded ? (
              <form onSubmit={handleSearchSubmit} className="transition-all duration-300 ease-in-out">
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search locations..."
                    className="w-48 pl-6 py-1.5 text-sm bg-white dark:bg-gray-900 rounded-lg focus:outline-none text-gray-700 dark:text-gray-300 transition-all duration-300"
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    onBlur={() => {
                      if (!searchQuery.trim()) {
                        setTimeout(() => setIsSearchExpanded(false), 200);
                      }
                    }}
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 bg-white dark:bg-gray-900 rounded-lg transition-colors"
                    title="Search"
                  >
                    <Search size={14} className="text-gray-600 dark:text-gray-400" />
                  </button>
                  
                  {/* Autocomplete Dropdown */}
                  {showAutocomplete && autocompleteResults.length > 0 && (
                    <div className="absolute left-0 right-0 bottom-full mb-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                      {autocompleteResults.map((prediction) => (
                        <div
                          key={prediction.place_id}
                          className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                          onClick={() => handleAutocompleteSelect(prediction)}
                        >
                          <div className="font-medium">{prediction.structured_formatting?.main_text || prediction.description}</div>
                          {prediction.structured_formatting?.secondary_text && (
                            <div className="text-xs text-gray-500 mt-1">
                              {prediction.structured_formatting.secondary_text}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            ) : (
              <button
                onClick={handleSearchExpand}
                className="p-2 rounded-full"
                title="Search locations"
                aria-label="Search locations"
              >
                <Search className="w-4 h-4 text-gray-700 dark:text-gray-200" />
              </button>
            )}
            <span className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
            <button
              onClick={() => zoomOutRef.current?.()}
              className="p-2 rounded-full"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-4 h-4 text-gray-700 dark:text-gray-200" />
            </button>
            <div className="px-2 text-xs text-gray-600 dark:text-gray-300 tabular-nums">{zoom.toFixed(0)}x</div>
            <button
              onClick={() => zoomInRef.current?.()}
              className="p-2 rounded-full"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4 text-gray-700 dark:text-gray-200" />
            </button>
            <span className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* Map Type Cycle Button */}
            <button
              onClick={() => {
                const types: ('roadmap' | 'satellite' | 'hybrid' | 'terrain')[] = ['roadmap', 'satellite', 'hybrid', 'terrain'];
                const currentIndex = types.indexOf(viewType);
                const nextIndex = (currentIndex + 1) % types.length;
                const newViewType = types[nextIndex];
                setViewType(newViewType);
                localStorage.setItem('mapViewType', newViewType);
              }}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              title={`Current: ${getMapTypeInfo(viewType).label} - Click to cycle`}
              aria-label={`Change map type from ${getMapTypeInfo(viewType).label}`}
            >
              {React.createElement(getMapTypeInfo(viewType).icon, { className: "w-4 h-4 text-gray-700 dark:text-gray-200" })}
            </button>
            
            <span className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
            <button
              onClick={() => {
                setCurrentOffset(0);
                fetchDataPoints();
              }}
              disabled={isLoading}
              className="p-2 rounded-full disabled:opacity-50"
              title="Refresh data"
              aria-label="Refresh data"
            >
              <RotateCw className={`w-4 h-4 text-gray-700 dark:text-gray-200 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-full"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-gray-700 dark:text-gray-200" /> : <Maximize2 className="w-4 h-4 text-gray-700 dark:text-gray-200" />}
            </button>
            <span className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Settings"
              aria-label="Settings"
            >
              <Ellipsis className="w-4 h-4 text-gray-700 dark:text-gray-200" />
            </button>
          </div>
        </div>
      </div>

      {/* Mine Filters Modal */}
      <MineFiltersModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        selectedCountries={selectedCountries}
        availableCountries={availableCountries}
        onCountriesChange={setSelectedCountries}
        isCountryExpanded={isCountryExpanded}
        onCountryExpandedChange={setIsCountryExpanded}
        returnedRows={returnedRows}
        totalRows={totalRows}
        onApplyFilters={async () => {
          setCurrentOffset(0);
          await fetchDataPoints();
        }}
        onClearFilters={async () => {
          setSelectedCountries([]);
          setCurrentOffset(0);
          await fetchDataPoints();
        }}
        onLoadMore={loadMoreMines}
        isLoading={isLoading}
      />

    </div>
  );
}
