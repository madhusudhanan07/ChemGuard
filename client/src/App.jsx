import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Storage from './pages/Storage';
import Compatibility from './pages/Compatibility';
import Alerts from './pages/Alerts';
import Audit from './pages/Audit';
import Reports from './pages/Reports';

export default function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <Routes>
          <Route path='/' element={<Navigate to='/dashboard' replace />} />
          <Route element={<MainLayout><Dashboard /></MainLayout>} path='/dashboard' />
          <Route element={<MainLayout><Inventory /></MainLayout>} path='/inventory' />
          <Route element={<MainLayout><Storage /></MainLayout>} path='/storage' />
          <Route element={<MainLayout><Compatibility /></MainLayout>} path='/compatibility' />
          <Route element={<MainLayout><Alerts /></MainLayout>} path='/alerts' />
          <Route element={<MainLayout><Audit /></MainLayout>} path='/audit' />
          <Route element={<MainLayout><Reports /></MainLayout>} path='/reports' />
          <Route path='*' element={<Navigate to='/dashboard' replace />} />
        </Routes>
      </DataProvider>
    </BrowserRouter>
  );
}
