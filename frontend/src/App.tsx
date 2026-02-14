import { Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { EditorPage } from './pages/EditorPage';
import { ExperimentPage } from './pages/ExperimentPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/canvas/:id" element={<EditorPage />} />
      <Route path="/experiment/:id" element={<ExperimentPage />} />
    </Routes>
  );
}
