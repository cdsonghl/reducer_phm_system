
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import DataAcquisition from './pages/DataAcquisition';
import DataProcessing from './pages/DataProcessing';
import HealthStatus from './pages/HealthStatus';
import FaultDiagnosis from './pages/FaultDiagnosis';
import SystemManagement from './pages/SystemManagement';
import DeviceQrScan from './pages/DeviceQrScan';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="acquisition" element={<DataAcquisition />} />
          <Route path="processing" element={<DataProcessing />} />
          <Route path="health" element={<HealthStatus />} />
          <Route path="diagnosis" element={<FaultDiagnosis />} />
          <Route path="system" element={<SystemManagement />} />
          <Route path="scan" element={<DeviceQrScan />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
