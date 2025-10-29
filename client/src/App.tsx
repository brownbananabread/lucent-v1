import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import DashboardLayout from "./layouts/DashboardLayout";
import { AlertProvider } from "./contexts/AlertContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { MineDetailsProvider } from "./contexts/MineDetailsContext";

import NotFound from "./pages/404";
import Auth from "./pages/Auth";
import Search from "./pages/Search";
import LibraryPage from "./pages/Library";
import Maps from "./pages/Maps"
import SQLEditorPage from "./pages/SQLEditor"
import PipelinePage from "./pages/Workflows"
import Board from "./pages/Board";
import ModelsPage from "./pages/Models";
import FeatureStorePage from "./pages/FeatureStore";

export default function App() {
  return (
    <>
    <ThemeProvider>
      <AlertProvider>
        <MineDetailsProvider>
          <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" />} />
            <Route path="/auth" element={<Auth />} />
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Navigate to="/search" replace />} />
              <Route path="/search" element={<Search />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/library/:schema/:table" element={<LibraryPage />} />
              <Route path="/data-management/sql-editor" element={<SQLEditorPage />} />
              <Route path="/etl-pipeline/workflows" element={<PipelinePage />} />
              <Route path="/visualisation/interactive-map" element={<Maps />} />
              <Route path="/visualisation/evaluation-board" element={<Board />} />
              <Route path="/ml-studio/feature-store" element={<FeatureStorePage />} />
              <Route path="/ml-studio/models" element={<ModelsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Router>
        </MineDetailsProvider>
      </AlertProvider>
    </ThemeProvider>
    </>
  );
}
