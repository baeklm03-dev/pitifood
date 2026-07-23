import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { seedIfEmpty } from './services/seedService';
import { useAuth } from './hooks/useAuth';
import { Navbar } from './components/Layout/Navbar';
import { LoadingSpinner } from './components/UI/LoadingSpinner';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { BuyerList } from './pages/buyers/BuyerList';
import { BuyerForm } from './pages/buyers/BuyerForm';
import { BuyerView } from './pages/buyers/BuyerView';
import { BrandList } from './pages/brands/BrandList';
import { BrandForm } from './pages/brands/BrandForm';
import { BrandView } from './pages/brands/BrandView';
import { UserManagement } from './pages/settings/UserManagement';
import { ContractList } from './pages/contracts/ContractList';
import { ContractForm } from './pages/contracts/ContractForm';
import { ContractPrint } from './pages/contracts/ContractPrint';

// TEMP: set to false to re-enable the login requirement
const DISABLE_LOGIN = false;

function RequireAuth() {
  const { isAuthenticated, loading } = useAuth();
  if (!DISABLE_LOGIN) {
    if (loading) return <LoadingSpinner message="Authenticating..." />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
  }
  return (
    <>
      <Navbar />
      <main style={{ minHeight: 'calc(100vh - 56px)', background: 'var(--bg)' }}>
        <Outlet />
      </main>
    </>
  );
}

function RequireSuperAdmin() {
  const { user } = useAuth();
  if (!DISABLE_LOGIN && user?.role !== 'super_admin') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/buyers" element={<BuyerList />} />
        <Route path="/buyers/new" element={<BuyerForm />} />
        <Route path="/buyers/:id" element={<BuyerView />} />
        <Route path="/buyers/:id/edit" element={<BuyerForm />} />

        <Route path="/brands" element={<BrandList />} />
        <Route path="/brands/new" element={<BrandForm />} />
        <Route path="/brands/:id" element={<BrandView />} />
        <Route path="/brands/:id/edit" element={<BrandForm />} />

        <Route path="/contracts" element={<ContractList />} />
        <Route path="/contracts/new" element={<ContractForm />} />
        <Route path="/contracts/:id/edit" element={<ContractForm />} />
        <Route path="/contracts/:id/print" element={<ContractPrint />} />

        <Route path="/settings/users" element={<UserManagement />} />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        seedIfEmpty().catch(console.error);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
