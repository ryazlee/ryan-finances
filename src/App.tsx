import { BrowserRouter, Route, Routes } from 'react-router'
import RouteAnalytics from './components/RouteAnalytics'
import ConnectScreen from './components/screens/ConnectScreen'
import DashboardScreen from './components/screens/DashboardScreen'
import { AuthProvider } from './hooks/auth'
import { SnapshotProvider } from './hooks/snapshot'
import { ThemeProvider } from './theme'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter basename={basename || undefined}>
        <RouteAnalytics />
        <AuthProvider>
          <SnapshotProvider>
            <Routes>
              <Route path="/" element={<DashboardScreen />} />
              <Route path="/connect" element={<ConnectScreen />} />
            </Routes>
          </SnapshotProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
