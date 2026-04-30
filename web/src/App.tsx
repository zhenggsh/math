import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { HomePage } from './pages/HomePage'
import { ProtectedRoute } from './components/guards/ProtectedRoute'
import { AppLayout } from './components/Layout'
import TextbookManagePage from './pages/TextbookManage/TextbookManagePage'
import LearningPage from './pages/LearningPage/LearningPage'
import SmartLearningPage from './pages/smart-learning/SmartLearningPage'
import { StudentAnalyticsPage, TeacherAnalyticsPage } from './pages/analytics'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Auth routes - standalone, no layout */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Public home page with layout */}
          <Route
            path="/"
            element={
              <AppLayout>
                <HomePage />
              </AppLayout>
            }
          />

          {/* Protected routes with layout */}
          <Route
            path="/teacher/textbooks"
            element={
              <AppLayout>
                <ProtectedRoute>
                  <TextbookManagePage />
                </ProtectedRoute>
              </AppLayout>
            }
          />
          <Route
            path="/learning/:textbookId"
            element={
              <AppLayout>
                <ProtectedRoute>
                  <LearningPage />
                </ProtectedRoute>
              </AppLayout>
            }
          />
          <Route
            path="/smart-learning"
            element={
              <AppLayout>
                <ProtectedRoute>
                  <SmartLearningPage />
                </ProtectedRoute>
              </AppLayout>
            }
          />
          <Route
            path="/analytics/student"
            element={
              <AppLayout>
                <ProtectedRoute>
                  <StudentAnalyticsPage />
                </ProtectedRoute>
              </AppLayout>
            }
          />
          <Route
            path="/analytics/teacher"
            element={
              <AppLayout>
                <ProtectedRoute>
                  <TeacherAnalyticsPage />
                </ProtectedRoute>
              </AppLayout>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
