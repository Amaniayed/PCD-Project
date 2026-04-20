import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
} from "react-router-dom";
import { authService } from "./services/api";
import Login           from "./pages/Login";
import Signup          from "./pages/Signup";
import Dashboard       from "./components/Dashboard";
import Data            from "./pages/Data";
import Analysis        from "./pages/Analysis";
import MessageDoctor   from "./pages/MessageDoctor";
import DoctorDashboard from "./pages/DoctorDashboard";
import Alerts          from "./pages/Alerts";
import DoctorOverview  from "./pages/DoctorOverview";

// ─── Auth Guard ───────────────────────────────────────────────────────────────
function RequireAuth({ children }) {
  return authService.isAuthenticated()
    ? children
    : <Navigate to="/login" replace />;
}

// ─── Role Guard ───────────────────────────────────────────────────────────────
function RequireRole({ role, children }) {
  const user = authService.getUser?.() || null;
  if (!authService.isAuthenticated()) return <Navigate to="/login" replace />;
  if (user?.role !== role) {
    return user?.role === "doctor"
      ? <Navigate to="/doctor/overview" replace />
      : <Navigate to="/dashboard" replace />;
  }
  return children;
}

// ─── Nav items per role ───────────────────────────────────────────────────────
const NAV_CAREGIVER = [
  { to: "/dashboard", icon: "◈",  label: "Dashboard"      },
  { to: "/data",      icon: "⊞",  label: "Data"           },
  { to: "/analysis",  icon: "⌬",  label: "Analysis"       },
  { to: "/alerts",    icon: "🔔", label: "Alerts"         },
  { to: "/messages",  icon: "📩", label: "Message Doctor" },
];

const NAV_DOCTOR = [
  { to: "/doctor/overview",  icon: "📊", label: "Overview"     },
  { to: "/doctor/dashboard", icon: "🩺", label: "Medical View" },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar() {
  const loc  = useLocation();
  const user = authService.getUser?.() || null;
  const role = user?.role || "caregiver";

  const navItems = role === "doctor" ? NAV_DOCTOR : NAV_CAREGIVER;

  const handleLogout = () => {
    authService.logout();
    window.location.replace("/login");
  };

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <span>⬡</span>
        <div>
          <div className="logo-title">ElderGuard</div>
          <div className="logo-sub">Monitoring System</div>
        </div>
      </div>

      {/* Role badge */}
      <div className={`sidebar-role-badge sidebar-role-badge--${role}`}>
        <span className="srb-emoji">{role === "doctor" ? "🧑‍⚕️" : "👩‍⚕️"}</span>
        <div>
          <div className="srb-role">{role === "doctor" ? "Doctor" : "Caregiver"}</div>
          <div className="srb-name">{user?.name || "—"}</div>
        </div>
      </div>

      {/* Nav links */}
      <div className="sidebar-links">
        <div className="section-title">Navigation</div>
        {navItems.map((n) => (
          <Link
            key={n.label}
            to={n.to}
            className={`nav-link ${loc.pathname === n.to ? "active" : ""}`}
          >
            <span className="nav-icon">{n.icon}</span>
            <span>{n.label}</span>
          </Link>
        ))}
      </div>

      <button className="sidebar-logout" onClick={handleLogout}>
        ⏻ Logout
      </button>

      <style>{`
        .sidebar {
          width: 240px;
          background: #fff;
          border-right: 1px solid #e8eaf0;
          display: flex;
          flex-direction: column;
          padding: 24px 16px;
          font-family: 'DM Sans', sans-serif;
          gap: 4px;
        }
        .sidebar-logo {
          display: flex; gap: 12px; align-items: center; margin-bottom: 16px;
        }
        .sidebar-logo span { font-size: 24px; color: #6366f1; }
        .logo-title { font-weight: 700; font-size: 15px; }
        .logo-sub   { font-size: 11px; color: #9aa0b4; }

        .sidebar-role-badge {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 10px;
          border: 1.5px solid; margin-bottom: 16px;
        }
        .sidebar-role-badge--caregiver { background:#e0f2fe; border-color:#7dd3fc; }
        .sidebar-role-badge--doctor    { background:#f3e8ff; border-color:#c4b5fd; }
        .srb-emoji { font-size: 22px; }
        .srb-role  {
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.5px; text-transform: uppercase;
        }
        .sidebar-role-badge--caregiver .srb-role { color: #0284c7; }
        .sidebar-role-badge--doctor    .srb-role { color: #7c3aed; }
        .srb-name  { font-size: 13px; color: #475569; font-weight: 500; margin-top: 1px; }

        .section-title {
          font-size: 11px; color: #9aa0b4; margin-bottom: 8px;
          padding-left: 10px; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .nav-link {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px; border-radius: 10px;
          color: #9196a8; text-decoration: none;
          font-size: 14px; transition: 0.15s;
        }
        .nav-link:hover  { background: #f4f6fb; color: #4b5060; }
        .nav-link.active { background: rgba(99,102,241,0.1); color: #6366f1; font-weight: 600; }
        .nav-icon { font-size: 13px; }

        .sidebar-logout {
          margin-top: auto; border: none; background: #f8f9fc;
          padding: 10px; border-radius: 10px; cursor: pointer;
          color: #b0b5c4; font-family: inherit; font-size: 13px; transition: 0.15s;
        }
        .sidebar-logout:hover { background: #fef2f2; color: #ef4444; }
      `}</style>
    </nav>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────
function AppShell({ children }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f4f6fb" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "32px", overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}

// ─── Routes ───────────────────────────────────────────────────────────────────
export default function App() {
  const user = authService.getUser?.() || null;

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"  element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* ── Caregiver routes ── */}
        <Route path="/dashboard" element={
          <RequireRole role="caregiver">
            <AppShell><Dashboard /></AppShell>
          </RequireRole>
        }/>
        <Route path="/data" element={
          <RequireRole role="caregiver">
            <AppShell><Data /></AppShell>
          </RequireRole>
        }/>
        <Route path="/analysis" element={
          <RequireRole role="caregiver">
            <AppShell><Analysis /></AppShell>
          </RequireRole>
        }/>
        <Route path="/alerts" element={
          <RequireRole role="caregiver">
            <AppShell><Alerts /></AppShell>
          </RequireRole>
        }/>
        <Route path="/messages" element={
          <RequireRole role="caregiver">
            <AppShell><MessageDoctor /></AppShell>
          </RequireRole>
        }/>

        {/* ── Doctor routes ── */}
        <Route path="/doctor/overview" element={
          <RequireRole role="doctor">
            <AppShell><DoctorOverview /></AppShell>
          </RequireRole>
        }/>
        <Route path="/doctor/dashboard" element={
          <RequireRole role="doctor">
            <AppShell><DoctorDashboard /></AppShell>
          </RequireRole>
        }/>

        {/* Catch-all */}
        <Route path="*" element={
          user?.role === "doctor"
            ? <Navigate to="/doctor/overview" replace />
            : <Navigate to="/dashboard" replace />
        }/>
      </Routes>
    </BrowserRouter>
  );
}