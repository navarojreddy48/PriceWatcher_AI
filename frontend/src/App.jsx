import { Route, Routes } from 'react-router-dom'
import AdminRoute from './components/AdminRoute'
import ProtectedRoute from './components/ProtectedRoute'
import { DataProvider } from './context/DataContext'
import DashboardLayout from './layouts/DashboardLayout'
import AnalyticsPage from './pages/AnalyticsPage'
import CompetitorsPage from './pages/CompetitorsPage'
import DashboardPage from './pages/DashboardPage'
import DishesPage from './pages/DishesPage'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import SettingsPage from './pages/SettingsPage'
import StaffManagementPage from './pages/StaffManagementPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <ProtectedRoute>
            <DataProvider>
              <DashboardLayout />
            </DataProvider>
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dishes" element={<DishesPage />} />
        <Route path="/competitors" element={<CompetitorsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route
          path="/staff"
          element={
            <AdminRoute>
              <StaffManagementPage />
            </AdminRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <AdminRoute>
              <SettingsPage />
            </AdminRoute>
          }
        />
      </Route>
    </Routes>
  )
}

export default App
