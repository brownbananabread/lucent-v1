import { useState, useEffect } from "react";
import { Brain, Database, Activity } from "lucide-react";
import Header from "../components/navigation/Header";

interface Model{
  id: number;
  name: string;
  type: string;
  description: string;
}

const Models = () => {
  
  const avaliableModels = [
    {
      id: 1,
      name: "DEAP Evolutionary Model",
      type: "Genetic Algorithm",
      description:
        "Evolutionary algorithms for feature selection and hyperparameter tuning",
    },
    {
      id: 2,
      name: "Sklearn Clustering Model",
      type: "K-Means Clustering",
      description:
        "Unsupervised clustering algorithm for segmentation and pattern discovery",
    },
    {
      id: 3,
      name: "Linear Neural Network",
      type: "NN",
      description:
        "A neural network that analyses shafts to create ranking",
    }
  ];

  const [selectedModelId, setSelectedModelId] = useState<number>(avaliableModels[0].id);
  const [models, setModels] = useState<Model[]>([]);
  const [runResults, setRunResults] = useState<any>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch(`http://localhost:5174/api/v1/models`);
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data = await response.json();
        setModels(data);
        setSelectedModelId(data[0]?.id || null); // Set the first model as selected if available
      } catch (error) {
        console.error("Error fecthing models:", error);
        setModels(avaliableModels)
        setSelectedModelId(models[0]?.id);
      } 
  };

    fetchModels();
  }, []);

  
  const handleRefresh = () => {
    console.log("Refreshing models...");
  };
  
  const handleRunModel = async () => {
    try {
      console.log("Running model", selectedModelId)
      const response = await fetch(`http://localhost:5174/api/v1/train/${selectedModelId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ modelId: selectedModelId }),
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      console.log(data.results)
      setRunResults(data.results);
      console.log("Run request sent for model", selectedModelId);
    } catch (error) {
      console.error("Error running model:", error);
    }
  };


  const helpItems = [
    {
      icon: <Brain size={14} />,
      title: "Model Management",
      description: "View, deploy, and manage your trained machine learning models",
    },
    {
      icon: <Database size={14} />,
      title: "Model Artifacts",
      description: "Access model files, weights, and configuration data",
    },
    {
      icon: <Activity size={14} />,
      title: "Performance Metrics",
      description: "Monitor model performance and evaluation metrics",
    },
  ];

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <Header
        title="Models"
        description="Explore and manage your machine learning models"
        helpCircleItems={helpItems}
        showRefresh={true}
        onRefresh={handleRefresh}
      />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((model) => (
            <div
              key={model.id}
              className="border border-gray-700 rounded shadow-sm bg-gray-800 p-4 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div>
                    <h3 className="text-sm font-medium text-gray-300 leading-tight">
                      {model.name}
                    </h3>
                    <p className="text-xs text-gray-400">{model.type}</p>
                  </div>
                </div>
              </div>

              <div className="mb-2">
                <p className="text-xs text-gray-400 line-clamp-2">
                  {model.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded border border-gray-600">
                  ML Model
                </span>
                <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded border border-gray-600">
                  {model.type.split(" ")[0]}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Model Actions Section*/}
        <div className="mt-6 p-4 bg-gray-800 border border-gray-700 rounded shadow-sm">
          <h2 className="text-sm font-medium text-gray-300 mb-3">
            Model Actions
          </h2>
          <div className="mb-2">
            <label htmlFor="modelSelect" className="mr-2 text-sm text-gray-400">
              Select Model:
            </label>
            <select
              id="modelSelect"
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(parseInt(e.target.value))}
              className="bg-gray-700 text-white rounded px-2 py-1"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none text-sm"
              onClick={handleRunModel}
            >
              Run Model
            </button>
          </div>
          {runResults && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-300">Run Results:</h3>
              <pre className="text-xs text-gray-400 bg-gray-700 p-2 rounded">
                {JSON.stringify(runResults, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Models;