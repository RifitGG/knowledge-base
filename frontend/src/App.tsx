import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import LoginPage from "./pages/LoginPage";
import ProjectSelectPage from "./pages/ProjectSelectPage";
import ProjectInsidePage from "./pages/ProjectInsidePage";
import ArticleViewPage from "./pages/ArticleViewPage";
import ArticleEditorPage from "./pages/ArticleEditorPage";
import AdminPage from "./pages/AdminPage";
import AppLayout from "./components/AppLayout";
import ProfilePage from "./pages/ProfilePage";

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <SplashLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function SplashLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-surface-app">
      <div className="flex items-center gap-3 text-ink-500">
        <span className="h-3 w-3 animate-ping rounded-full bg-brand-500" />
        Загрузка платформы…
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<ProjectSelectPage />} />
        <Route path="/projects/:projectId" element={<ProjectInsidePage />} />
        <Route path="/projects/:projectId/articles/:articleId" element={<ArticleViewPage />} />
        <Route path="/projects/:projectId/articles/:articleId/edit" element={<ArticleEditorPage />} />
        <Route path="/projects/:projectId/articles/new" element={<ArticleEditorPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin/*" element={<AdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  );
}
