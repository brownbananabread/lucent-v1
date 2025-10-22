import { X, ChevronDown, ChevronUp, Plus } from 'lucide-react';

interface MineFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCountries: string[];
  availableCountries: string[];
  onCountriesChange: (countries: string[]) => void;
  isCountryExpanded: boolean;
  onCountryExpandedChange: (expanded: boolean) => void;
  returnedRows: number;
  totalRows: number;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  onLoadMore: () => void;
  isLoading: boolean;
}

export default function MineFiltersModal({
  isOpen,
  onClose,
  selectedCountries,
  availableCountries,
  onCountriesChange,
  isCountryExpanded,
  onCountryExpandedChange,
  returnedRows,
  totalRows,
  onApplyFilters,
  onClearFilters,
  onLoadMore,
  isLoading
}: MineFiltersModalProps) {
  if (!isOpen) return null;

  const handleCountryToggle = (country: string) => {
    if (selectedCountries.includes(country)) {
      onCountriesChange(selectedCountries.filter(c => c !== country));
    } else {
      onCountriesChange([...selectedCountries, country]);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 w-[700px] h-[700px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center border-b border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 mr-4"
            style={{ marginRight: '1rem' }}
          >
            <X size={16} />
          </button>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mr-auto">
            Mine Filters
          </h2>
          {/* Load More Button in Header */}
          <button
            onClick={onLoadMore}
            disabled={isLoading || returnedRows >= totalRows}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Loading...
              </>
            ) : (
              <>
                <Plus className="w-3 h-3" />
                Load More
              </>
            )}
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-800">
          <div className="space-y-4">
            {/* Summary Card */}
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-800 dark:text-white/90">Mine Summary</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {returnedRows} displayed of {totalRows} total mines
                    {selectedCountries.length > 0 && ` • Filtered by: ${selectedCountries.join(', ')}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Country Filter Card */}
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors overflow-hidden">
              <button
                onClick={() => onCountryExpandedChange(!isCountryExpanded)}
                className="w-full flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="text-sm font-medium text-gray-800 dark:text-white/90">Country Filter</h4>
                    {selectedCountries.length > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        {selectedCountries.length} selected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {selectedCountries.length > 0
                      ? `Filtering by: ${selectedCountries.slice(0, 3).join(', ')}${selectedCountries.length > 3 ? ` +${selectedCountries.length - 3} more` : ''}`
                      : 'Select countries to filter mine results'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isCountryExpanded ? (
                    <ChevronUp size={18} className="text-gray-400 dark:text-gray-500" />
                  ) : (
                    <ChevronDown size={18} className="text-gray-400 dark:text-gray-500" />
                  )}
                </div>
              </button>

              {isCountryExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 mt-4">
                  <div className="p-4 space-y-4">
                    {/* Quick Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onCountriesChange(availableCountries)}
                          className="text-xs px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-md font-medium transition-colors"
                        >
                          Select All
                        </button>
                        <button
                          onClick={() => onCountriesChange([])}
                          className="text-xs px-2.5 py-1 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 rounded-md font-medium transition-colors"
                        >
                          Clear All
                        </button>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {availableCountries.length} countries available
                      </span>
                    </div>

                    {/* Country Selection */}
                    <div className="space-y-1 max-h-56 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 p-2">
                      {availableCountries.map((country) => (
                        <label
                          key={country}
                          className="flex items-center space-x-3 p-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg cursor-pointer group transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCountries.includes(country)}
                            onChange={() => handleCountryToggle(country)}
                            className="w-4 h-4 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:focus:ring-blue-600 transition-colors"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-200 group-hover:text-blue-700 dark:group-hover:text-blue-300 font-medium transition-colors">
                            {country}
                          </span>
                        </label>
                      ))}
                    </div>

                    {availableCountries.length === 0 && (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Loading countries...</p>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                      <button
                        onClick={onApplyFilters}
                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 font-medium text-sm transition-all shadow-sm"
                      >
                        Apply Filters
                      </button>
                      <button
                        onClick={onClearFilters}
                        className="px-4 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 rounded-lg focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 font-medium text-sm transition-all"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}