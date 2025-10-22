import { useState } from "react";
import { Brain, Database, Activity, GitBranch, Layers } from "lucide-react";
import Header from "../components/navigation/Header";

const Models = () => {
  const [searchValue, setSearchValue] = useState("");

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  const handleRefresh = () => {
    console.log("Refreshing models...");
  };

  const dummyModels = [
    {
      id: 1,
      name: "DEAP Evolutionary Model",
      type: "Genetic Algorithm",
      description: "Multi-objective optimization using evolutionary algorithms for feature selection and hyperparameter tuning",
      icon: <GitBranch size={24} />,
      accuracy: "87.3%",
      status: "Deployed",
      lastTrained: "2 days ago"
    },
    {
      id: 2,
      name: "Sklearn Clustering Model",
      type: "K-Means Clustering",
      description: "Unsupervised clustering algorithm for customer segmentation and pattern discovery",
      icon: <Layers size={24} />,
      accuracy: "94.1%",
      status: "Training",
      lastTrained: "1 hour ago"
    }
  ];

  const helpItems = [
    {
      icon: <Brain size={14} />,
      title: "Model Management",
      description: "View, deploy, and manage your trained machine learning models"
    },
    {
      icon: <Database size={14} />,
      title: "Model Artifacts",
      description: "Access model files, weights, and configuration data"
    },
    {
      icon: <Activity size={14} />,
      title: "Performance Metrics",
      description: "Monitor model performance and evaluation metrics"
    }
  ];

  return (
    <div>
      <Header
        title="Models"
        description="Explore and manage your machine learning models"
        showSearch={true}
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search models..."
        helpCircleItems={helpItems}
        showRefresh={true}
        onRefresh={handleRefresh}
      />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {dummyModels.map((model) => (
            <div
              key={model.id}
              className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.05] rounded-lg p-3 cursor-pointer hover:shadow-md transition-all duration-300 ease-in-out group"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    model.status === 'Deployed' ? 'bg-green-100 dark:bg-green-900/30' :
                    'bg-yellow-100 dark:bg-yellow-900/30'
                  }`}>
                    <div className={`${
                      model.status === 'Deployed' ? 'text-green-500' : 'text-yellow-500'
                    }`}>
                      {model.icon}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                      {model.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{model.type}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    model.status === "Deployed"
                      ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                      : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200"
                  }`}
                >
                  {model.status}
                </span>
              </div>

              <div className="mb-2">
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                  {model.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                  ML Model
                </span>
                <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                  {model.type.split(' ')[0]}
                </span>
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Accuracy:
                  </span>
                  <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${
                    parseFloat(model.accuracy) >= 90
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                      : parseFloat(model.accuracy) >= 80
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                  }`}>
                    {model.accuracy}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">{model.lastTrained}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Models;