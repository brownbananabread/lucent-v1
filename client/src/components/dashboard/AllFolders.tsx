import { Database, FileText } from "lucide-react";

// FolderCard component
function FolderCard({ title, tables, rows, size, icon, iconStyle, index }: {
  title: string;
  tables: number;
  rows: string;
  size: string;
  icon: React.ReactElement;
  iconStyle: string;
  index?: number;
}) {
  return (
    <div 
      className="group p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 hover:scale-105 hover:shadow-lg hover:shadow-gray-200/20 dark:hover:shadow-gray-900/20 transition-all duration-300 transform animate-slideInUp"
      style={{
        animationDelay: `${(index || 0) * 0.1}s`,
        animationFillMode: 'both'
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${iconStyle} group-hover:scale-110 transition-transform duration-200`}>
          {icon}
        </div>
        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zM12 13a1 1 0 110-2 1 1 0 010 2zM12 20a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>
      
      <div className="mb-3">
        <h4 className="text-base font-medium text-gray-800 dark:text-white/90 mb-1">
          {title}
        </h4>
      </div>

      {/* Statistics */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 dark:text-gray-400">Tables:</span>
          <span className="font-medium text-gray-800 dark:text-white/90">{tables}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 dark:text-gray-400">Rows:</span>
          <span className="font-medium text-gray-800 dark:text-white/90">{rows}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 dark:text-gray-400">Size:</span>
          <span className="font-medium text-gray-800 dark:text-white/90">{size}</span>
        </div>
      </div>
    </div>
  );
}

export default function AllFolders() {
  const folderData = [
    {
      title: "Sources",
      tables: 23,
      rows: "1.2M",
      size: "64.20 GB",
      icon: <FileText className="size-5" />,
      iconStyle: "bg-blue-500/[0.08] text-blue-500"
    },
    {
      title: "Datasets", 
      tables: 47,
      rows: "3.8M",
      size: "98.80 GB",
      icon: <Database className="size-5" />,
      iconStyle: "bg-purple-500/[0.08] text-purple-500"
    }
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-4 py-4 sm:pl-6 sm:pr-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Data vs Datasets
          </h3>
        </div>
      </div>
      <div className="p-5 border-t border-gray-100 dark:border-gray-800 sm:p-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
          {folderData.map((folder, index) => (
            <FolderCard
              key={index}
              title={folder.title}
              tables={folder.tables}
              rows={folder.rows}
              size={folder.size}
              icon={folder.icon}
              iconStyle={folder.iconStyle}
              index={index}
            />
          ))}
        </div>
      </div>
    </div>
  );
}