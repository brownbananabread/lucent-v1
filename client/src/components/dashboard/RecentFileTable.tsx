import { FileText, Database, FileSpreadsheet, Braces, Trash2, Search, Download, Upload } from "lucide-react";
import { useState } from "react";

interface FileData {
  fileName: string;
  fileIcon: React.ComponentType<{ className?: string }>;
  category: string;
  dataType: string;
  rows: number | null;
  columns: number | null;
  size: string;
  dateModified: string;
  source: string;
  classification: string[];
}

interface MiningFilesTableProps {
  onUploadClick: () => void;
  onImportApiClick: () => void;
}

const tableData: FileData[] = [
  {
    fileName: "ore_extraction_2024.csv",
    fileIcon: Database,
    category: "Dataset",
    dataType: "CSV",
    rows: 15420,
    columns: 12,
    size: "2.3 MB",
    dateModified: "15 Jan, 2025",
    source: "Mining Operations DB",
    classification: ["T1", "T3"]
  },
  {
    fileName: "geological_survey_report.pdf",
    fileIcon: FileText,
    category: "Source",
    dataType: "PDF",
    rows: null,
    columns: null,
    size: "8.7 MB",
    dateModified: "22 Jan, 2025",
    source: "Geological Survey Dept",
    classification: ["T2"]
  },
  {
    fileName: "mineral_analysis.xlsx",
    fileIcon: FileSpreadsheet,
    category: "Dataset",
    dataType: "Excel",
    rows: 3240,
    columns: 8,
    size: "1.8 MB",
    dateModified: "18 Jan, 2025",
    source: "Lab Analytics",
    classification: ["T4"]
  },
  {
    fileName: "equipment_maintenance.json",
    fileIcon: Braces,
    category: "Dataset",
    dataType: "JSON",
    rows: 892,
    columns: 15,
    size: "425 KB",
    dateModified: "20 Jan, 2025",
    source: "Equipment Management",
    classification: ["T5"]
  },
  {
    fileName: "safety_protocols.docx",
    fileIcon: FileText,
    category: "Source",
    dataType: "Document",
    rows: null,
    columns: null,
    size: "1.2 MB",
    dateModified: "25 Jan, 2025",
    source: "Safety Department",
    classification: ["T1", "T2", "T5"]
  },
  {
    fileName: "production_metrics.csv",
    fileIcon: Database,
    category: "Dataset",
    dataType: "CSV",
    rows: 8760,
    columns: 18,
    size: "3.1 MB",
    dateModified: "28 Jan, 2025",
    source: "Production Analytics",
    classification: ["T3", "T4"]
  },
  {
    fileName: "environmental_impact.pdf",
    fileIcon: FileText,
    category: "Source",
    dataType: "PDF",
    rows: null,
    columns: null,
    size: "5.4 MB",
    dateModified: "30 Jan, 2025",
    source: "Environmental Compliance",
    classification: ["T2", "T3"]
  },
  {
    fileName: "drilling_coordinates.csv",
    fileIcon: Database,
    category: "Dataset",
    dataType: "CSV",
    rows: 2156,
    columns: 6,
    size: "512 KB",
    dateModified: "02 Feb, 2025",
    source: "Survey Team",
    classification: ["T1"]
  }
];

export default function MiningFilesTable({ onUploadClick, onImportApiClick }: MiningFilesTableProps) {
  const [files, setFiles] = useState<FileData[]>(tableData);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const handleDelete = (index: number): void => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const getClassificationColor = (cls: string): string => {
    const colors: Record<string, string> = {
      'T1': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'T2': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', 
      'T3': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      'T4': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      'T5': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    };
    return colors[cls] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  const filteredFiles = files.filter(file =>
    file.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.source?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.dataType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-4 py-4 sm:pl-6 sm:pr-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Mining Data Files
          </h3>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 bg-white text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 xl:w-[280px]"
              />
            </div>

            <div className="flex gap-2">
              <button 
                onClick={onImportApiClick}
                className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Download className="size-4" />
                Import API
              </button>
              
              <button 
                onClick={onUploadClick}
                className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium text-white bg-gray-800 hover:bg-gray-900 rounded-lg transition-colors"
              >
                <Upload className="size-4" />
                Upload File
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto border-t border-gray-100 dark:border-gray-800">
        <table className="w-full border-collapse table-auto min-w-[1400px]">
          {/* Table Header */}
          <thead>
            <tr>
              <th className="px-6 py-3 font-medium text-left text-gray-500 text-sm dark:text-gray-400 w-80">
                File Name
              </th>
              <th className="px-6 py-3 font-medium text-left text-gray-500 text-sm dark:text-gray-400 w-32">
                Category
              </th>
              <th className="px-6 py-3 font-medium text-left text-gray-500 text-sm dark:text-gray-400 w-28">
                Data Type
              </th>
              <th className="px-6 py-3 font-medium text-center text-gray-500 text-sm dark:text-gray-400 w-24">
                Rows
              </th>
              <th className="px-6 py-3 font-medium text-center text-gray-500 text-sm dark:text-gray-400 w-24">
                Columns
              </th>
              <th className="px-6 py-3 font-medium text-left text-gray-500 text-sm dark:text-gray-400 w-24">
                Size
              </th>
              <th className="px-6 py-3 font-medium text-left text-gray-500 text-sm dark:text-gray-400 w-52">
                Source
              </th>
              <th className="px-6 py-3 font-medium text-left text-gray-500 text-sm dark:text-gray-400 w-32">
                Classification
              </th>
              <th className="px-6 py-3 font-medium text-left text-gray-500 text-sm dark:text-gray-400 w-48 whitespace-nowrap">
                Date Modified
              </th>
              <th className="px-6 py-3 font-medium text-center text-gray-500 text-sm dark:text-gray-400 w-28">
                Action
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {filteredFiles.map((row, index) => {
              const IconComponent = row.fileIcon;
              return (
                <tr
                  key={index}
                  className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-400">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                        <IconComponent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="font-medium">{row.fileName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm dark:text-gray-400">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      row.category === 'Dataset' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                    }`}>
                      {row.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-400">
                    {row.dataType}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700 dark:text-gray-400">
                    {row.rows ? row.rows.toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700 dark:text-gray-400">
                    {row.columns || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-400">
                    {row.size}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-400">
                    {row.source}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-400">
                    <div className="flex flex-wrap gap-1">
                      {row.classification.map((cls) => (
                        <span
                          key={cls}
                          className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full ${getClassificationColor(cls)}`}
                        >
                          {cls.replace('T', '')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-400 whitespace-nowrap">
                    {row.dateModified}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleDelete(index)}
                        className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}