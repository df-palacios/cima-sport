import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

const StoreLayout = lazy(() => import('./layouts/StoreLayout.jsx'));
const LandingPage = lazy(() => import('./pages/LandingPage.jsx'));
const CatalogPage = lazy(() => import('./pages/CatalogPage.jsx'));
const ProductPage = lazy(() => import('./pages/ProductPage.jsx'));
const CartPage = lazy(() => import('./pages/CartPage.jsx'));
const ServicesPage = lazy(() => import('./pages/ServicesPage.jsx'));
const AccountPage = lazy(() => import('./pages/AccountPage.jsx'));

const AppLayout = lazy(() => import('./layouts/AppLayout.jsx'));
const DashboardPage = lazy(() => import('./pages/app/DashboardPage.jsx'));
const OrdersPage = lazy(() => import('./pages/app/OrdersPage.jsx'));
const InventoryPage = lazy(() => import('./pages/app/InventoryPage.jsx'));
const DomiciliosPage = lazy(() => import('./pages/app/DomiciliosPage.jsx'));
const CatalogAdminPage = lazy(() => import('./pages/app/CatalogAdminPage.jsx'));
const ServiceRequestsPage = lazy(() => import('./pages/app/ServiceRequestsPage.jsx'));
const ReportsPage = lazy(() => import('./pages/app/ReportsPage.jsx'));
const TeamPage = lazy(() => import('./pages/app/TeamPage.jsx'));
const CajaPage = lazy(() => import('./pages/app/CajaPage.jsx'));

function AppLoading() {
  return <div style={{ padding: 60, textAlign: 'center', color: 'var(--smoke)' }}>Cargando…</div>;
}

function ProtectedStaffRoute({ children }) {
  const { user } = useAuth();
  // El panel es para quien tiene vínculo laboral activo, sin importar el cargo.
  if (!user?.isEmployee) return <Navigate to="/cuenta" replace />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<AppLoading />}>
      <Routes>
        {/* ---------- Tienda pública ---------- */}
        <Route element={<StoreLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/tienda" element={<CatalogPage />} />
          <Route path="/tienda/:categorySlug" element={<CatalogPage />} />
          <Route path="/producto/:slug" element={<ProductPage />} />
          <Route path="/carrito" element={<CartPage />} />
          <Route path="/servicios" element={<ServicesPage />} />
          <Route path="/cuenta" element={<AccountPage />} />
        </Route>

        {/* ---------- Panel interno ---------- */}
        <Route path="/app" element={<ProtectedStaffRoute><AppLayout /></ProtectedStaffRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="pedidos" element={<OrdersPage />} />
          <Route path="catalogo" element={<CatalogAdminPage />} />
          <Route path="inventario" element={<InventoryPage />} />
          <Route path="domicilios" element={<DomiciliosPage />} />
          <Route path="servicios" element={<ServiceRequestsPage />} />
          <Route path="reportes" element={<ReportsPage />} />
          <Route path="equipo" element={<TeamPage />} />
          <Route path="caja" element={<CajaPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
