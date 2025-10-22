import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from "recharts";

const StorageDetailsChart: React.FC = () => {
  // Data for T1-T5 breakdown
  const data = [
    { name: "T1 - Customer Analytics", value: 32, gb: "32 GB", color: "#3B82F6" },
    { name: "T2 - Financial Metrics", value: 28, gb: "28 GB", color: "#10B981" },
    { name: "T3 - Performance Data", value: 24, gb: "24 GB", color: "#8B5CF6" },
    { name: "T4 - Operational Reports", value: 18, gb: "18 GB", color: "#F59E0B" },
    { name: "T5 - Database Records", value: 15, gb: "15 GB", color: "#EF4444" },
  ];

  const totalUsed = data.reduce((sum, item) => sum + item.value, 0);
  const totalCapacity = 160;
  const freeSpace = totalCapacity - totalUsed;

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-800 dark:text-white">{data.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {data.gb} ({((data.value / totalCapacity) * 100).toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom legend component
  const CustomLegend = () => {
    return (
      <div className="grid grid-cols-1 gap-2 mt-4">
        {data.map((entry, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                {entry.name.split(' - ')[0]}
              </span>
              <span className="text-gray-500 dark:text-gray-400 text-xs">
                {entry.name.split(' - ')[1]}
              </span>
            </div>
            <span className="text-gray-800 dark:text-white font-medium">
              {entry.gb}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="px-4 pt-6 pb-6 bg-white border border-gray-200 rounded-2xl dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Data Types
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {freeSpace} GB Free space left
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center">
        {/* Chart Container */}
        <div className="relative w-full max-w-[300px] h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Used
              </p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white/90">
                {totalUsed} GB
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                of {totalCapacity} GB
              </p>
            </div>
          </div>
        </div>

        {/* Custom Legend */}
        <div className="w-full max-w-[300px]">
          <CustomLegend />
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-[300px] mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Used</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
              {totalUsed} GB
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Free</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
              {freeSpace} GB
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
              {totalCapacity} GB
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageDetailsChart;