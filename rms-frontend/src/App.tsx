import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login/Login';
import Layout from './pages/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import JobsList from './pages/Jobs/JobsList';
import CreateJob from './pages/Jobs/CreateJob';
import JobDetail from './pages/Jobs/JobDetail';
import CandidatesList from './pages/Candidates/CandidatesList';
import CreateCandidate from './pages/Candidates/CreateCandidate';
import CandidateDetail from './pages/Candidates/CandidateDetail';
import InterviewEvaluation from './pages/Interviews/InterviewEvaluation';
import ConsultantManagement from './pages/Users/ConsultantManagement';
import './index.css';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/jobs" element={<JobsList />} />
            <Route path="/jobs/create" element={<AdminRoute><CreateJob /></AdminRoute>} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/candidates" element={<CandidatesList />} />
            <Route path="/candidates/create" element={<AdminRoute><CreateCandidate /></AdminRoute>} />
            <Route path="/candidates/:id" element={<CandidateDetail />} />
            <Route path="/interviews/:candidateId/step/:stepNumber" element={<InterviewEvaluation />} />
            <Route path="/consultants" element={<AdminRoute><ConsultantManagement /></AdminRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
