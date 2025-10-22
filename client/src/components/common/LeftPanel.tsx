import { type ReactNode } from 'react'

// ---- Types ----
interface LeftPanelProps {
  isExpanded: boolean
  children: ReactNode
  className?: string
}

// ---- LeftPanel Template Component ----
export default function LeftPanel({
  isExpanded,
  children,
  className = '',
}: LeftPanelProps) {
  return (
    <aside
      className={`flex flex-col bg-white dark:bg-gray-900 transition-all duration-300 ease-in-out h-screen select-none ${
        isExpanded ? 'w-[250px] border-r border-gray-200 dark:border-gray-800' : 'w-0 overflow-hidden border-none'
      } ${className}`}
    >
      {isExpanded && (
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {children}
        </div>
      )}
    </aside>
  )
}

// Export types for use in other components
export type { LeftPanelProps }