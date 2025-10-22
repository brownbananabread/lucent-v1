import React, { useState } from 'react';
import { Link } from "react-router";
import { HelpCircle, Search, PanelLeftClose, PanelLeftOpen, PanelBottomClose, PanelBottomOpen, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

interface HelpItem {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface BreadcrumbProps {
  title: string | React.ReactNode;
  description?: string;
  helpCircleItems?: HelpItem[];
  showBackButton?: boolean;
  backButtonUrl?: string;
  badge?: React.ReactNode;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  breadcrumbs?: { label: string; url?: string }[]; // Array of breadcrumb items
  showPanelLeft?: boolean;
  showPanelBottom?: boolean;
  isPanelLeftExpanded?: boolean;
  isPanelBottomExpanded?: boolean;
  onTogglePanelLeft?: () => void;
  onTogglePanelBottom?: () => void;
  showRefresh?: boolean;
  onRefresh?: () => void;
  actions?: React.ReactNode[];
  searchLeftActions?: React.ReactNode;
  searchRightActions?: React.ReactNode;
  showZoomControls?: boolean;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  zoomLevel?: number;
}

const PageBreadcrumb: React.FC<BreadcrumbProps> = ({ 
  title,
  description,
  helpCircleItems,
  showBackButton = false,
  backButtonUrl,
  badge,
  showSearch = false,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  breadcrumbs,
  showPanelLeft = false,
  showPanelBottom = false,
  isPanelLeftExpanded = false,
  isPanelBottomExpanded = false,
  onTogglePanelLeft,
  onTogglePanelBottom,
  showRefresh = false,
  onRefresh,
  actions = [],
  searchLeftActions,
  searchRightActions,
  showZoomControls = false,
  onZoomIn,
  onZoomOut,
  zoomLevel
}) => {
  const [showHelpDropdown, setShowHelpDropdown] = useState<boolean>(false);

  return (
    <div className="sticky top-0 z-40 bg-gray-50 dark:bg-gray-900 transition-shadow duration-200">
      <div className="flex items-center justify-between p-10">
        {/* Left Side - Title and Help */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Back Button */}
          {showBackButton && backButtonUrl && (
            <Link 
              to={backButtonUrl}
              className="mr-2 flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          )}
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
                {title}
              </h2>
              
              {/* Help Circle - Inline with title */}
              {helpCircleItems && helpCircleItems.length > 0 && (
                <div 
                  className="relative ml-1"
                  onMouseEnter={() => setShowHelpDropdown(true)}
                  onMouseLeave={() => setShowHelpDropdown(false)}
                >
                  <div
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200 cursor-help"
                    title="Help"
                  >
                    <HelpCircle size={12} />
                  </div>
                  
                  {showHelpDropdown && (
                    <div className="absolute left-0 top-8 w-70 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg dark:shadow-gray-900/50 z-20 overflow-hidden">
                      <div className="px-3 py-2">
                        <h3 className="text-xs font-medium text-gray-900 dark:text-gray-100">What is this page for?</h3>
                      </div>
                      <div className="py-1">
                        {helpCircleItems.map((item, index) => (
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
              )}
              
              {/* Badge - between title and help circle */}
              {badge && (
                <div className="ml-2">
                  {badge}
                </div>
              )}
            </div>
            
            {description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right Side - Actions and Controls */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Custom Actions */}
          {actions.length > 0 && (
            <div className="flex items-center gap-2">
              {actions.map((action, index) => (
                <div key={index}>{action}</div>
              ))}
            </div>
          )}

          {/* Search Left Actions */}
          {searchLeftActions && (
            <div className="flex items-center">
              {searchLeftActions}
            </div>
          )}

          {/* Search Input */}
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                className="flex w-64 items-center rounded-lg px-10 py-2 text-sm transition-all duration-200 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:bg-white dark:focus:bg-gray-800 border border-gray-200 dark:border-gray-600"
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
              />
            </div>
          )}

          {/* Search Right Actions */}
          {searchRightActions && (
            <div className="flex items-center">
              {searchRightActions}
            </div>
          )}

          {/* Zoom Controls */}
          {showZoomControls && (
            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-1">
              <button
                onClick={onZoomOut}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                title="Zoom Out"
                aria-label="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              {zoomLevel && (
                <span className="text-xs text-gray-600 dark:text-gray-300 px-2 min-w-[3rem] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
              )}
              <button
                onClick={onZoomIn}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                title="Zoom In"
                aria-label="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
            </div>
          )}

          {/* Refresh Button */}
          {showRefresh && onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              title="Refresh"
              aria-label="Refresh"
            >
              <RotateCw size={16} />
            </button>
          )}

          {/* Panel Toggle Buttons */}
          {(showPanelLeft || showPanelBottom) && (
            <div className="flex items-center gap-2">
              {showPanelLeft && (
                <button
                  onClick={onTogglePanelLeft}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  title={isPanelLeftExpanded ? "Collapse left panel" : "Expand left panel"}
                  aria-label={isPanelLeftExpanded ? "Collapse left panel" : "Expand left panel"}
                >
                  {isPanelLeftExpanded ? (
                    <PanelLeftClose size={16} />
                  ) : (
                    <PanelLeftOpen size={16} />
                  )}
                </button>
              )}
              {showPanelBottom && (
                <button
                  onClick={onTogglePanelBottom}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  title={isPanelBottomExpanded ? "Collapse bottom panel" : "Expand bottom panel"}
                  aria-label={isPanelBottomExpanded ? "Collapse bottom panel" : "Expand bottom panel"}
                >
                  {isPanelBottomExpanded ? (
                    <PanelBottomClose size={16} />
                  ) : (
                    <PanelBottomOpen size={16} />
                  )}
                </button>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
          
          {/* Breadcrumbs */}
          <nav>
            <ol className="flex items-center gap-2 text-xs">
              {breadcrumbs && breadcrumbs.length > 0 ? (
                <>
                  {breadcrumbs.map((breadcrumb, index) => (
                    <React.Fragment key={index}>
                      <li>
                        {breadcrumb.url ? (
                          <Link
                            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                            to={breadcrumb.url}
                          >
                            {breadcrumb.label}
                          </Link>
                        ) : (
                          <span className={index === breadcrumbs.length - 1 ? "text-gray-700 dark:text-gray-200" : "text-gray-500 dark:text-gray-400"}>
                            {breadcrumb.label}
                          </span>
                        )}
                      </li>
                      {index < breadcrumbs.length - 1 && (
                        <li className="text-gray-400 dark:text-gray-600">/</li>
                      )}
                    </React.Fragment>
                  ))}
                </>
              ) : (
                <>
                  <li>
                    <Link
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      to="/dashboard"
                    >
                      Dashboard
                    </Link>
                  </li>
                  <li className="text-gray-400 dark:text-gray-600">/</li>
                  <li className="text-gray-700 dark:text-gray-200">
                    {typeof title === 'string' ? title : 'Current Page'}
                  </li>
                </>
              )}
            </ol>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default PageBreadcrumb;