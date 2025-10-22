import {
  Users,
  DollarSign,
  TrendingUp,
  BarChart3,
  Database,
  Grid3X3,
} from "lucide-react";

// FileCard component
interface FileCardProps {
  icon: React.ReactNode;
  title: string;
  usage: string;
  fileCount: number;
  storageUsed: string;
  iconStyle: string;
  dataTypes: string[];
}

function FileCard({ icon, title, usage, fileCount, storageUsed, iconStyle, dataTypes }: FileCardProps) {
  return (
    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${iconStyle}`}>
          {icon}
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-800 dark:text-white/90">{title}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">{usage}</p>
        </div>
      </div>
      
      {/* Data Types Tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {dataTypes.map((type) => (
          <span
            key={type}
            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
          >
            {type}
          </span>
        ))}
      </div>
      
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{fileCount} files</span>
        <span>{storageUsed}</span>
      </div>
    </div>
  );
}

const fileData = [
  {
    icon: <Users className="size-5" />,
    title: "Customer Analytics",
    usage: "T1 Data - 17% Used",
    fileCount: 245,
    storageUsed: "26.40 GB",
    iconStyle: "bg-blue-500/[0.08] text-blue-500",
    dataTypes: ["T1"]
  },
  {
    icon: <DollarSign className="size-6" />,
    title: "Financial Reports",
    usage: "T2 Data - 22% Used",
    fileCount: 189,
    storageUsed: "32.10 GB",
    iconStyle: "bg-green-500/[0.08] text-green-500",
    dataTypes: ["T2"]
  },
  {
    icon: <TrendingUp className="size-6" />,
    title: "Performance Metrics",
    usage: "T3 Data - 23% Used",
    fileCount: 830,
    storageUsed: "18.90 GB",
    iconStyle: "bg-purple-500/[0.08] text-purple-500",
    dataTypes: ["T3"]
  },
  {
    icon: <BarChart3 className="size-6" />,
    title: "Operational Data",
    usage: "T4 Data - 65% Used",
    fileCount: 1200,
    storageUsed: "85.30 GB",
    iconStyle: "bg-orange-500/[0.08] text-orange-500",
    dataTypes: ["T4"]
  },
  {
    icon: <Database className="size-6" />,
    title: "Database Records",
    usage: "T5 Data - 10% Used",
    fileCount: 78,
    storageUsed: "5.40 GB",
    iconStyle: "bg-red-500/[0.08] text-red-500",
    dataTypes: ["T5"]
  },
  {
    icon: <Grid3X3 className="size-6" />,
    title: "Mixed Analytics",
    usage: "Multi-type - 16% Used",
    fileCount: 445,
    storageUsed: "42.80 GB",
    iconStyle: "bg-indigo-500/[0.08] text-indigo-500",
    dataTypes: ["T1", "T3", "T4"]
  },
];

export default function AllSources() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-4 py-4 sm:pl-6 sm:pr-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          All Sources
        </h3>
      </div>
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
          {fileData.map((item, i) => (
            <FileCard
              key={i + 1}
              icon={item.icon}
              title={item.title}
              usage={item.usage}
              fileCount={item.fileCount}
              storageUsed={item.storageUsed}
              iconStyle={item.iconStyle}
              dataTypes={item.dataTypes}
            />
          ))}
        </div>
      </div>
    </div>
  );
}