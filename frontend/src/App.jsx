import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { authService } from "./services/api";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./components/Dashboard";
import Data from "./pages/Data";
import Analysis from "./pages/Analysis";
import Analysisboth from "./pages/Analysisboth";

// ─── Auth Guard ───────────────────────────────────────────
function RequireAuth({ children }) {
  return authService.isAuthenticated() ? children : <Navigate to="/login" replace />;
}

// ─── Sidebar Nav ──────────────────────────────────────────
const NAV = [
  { to: "/dashboard", icon: "◈", label: "Dashboard"  },
  { to: "/data",      icon: "⊞", label: "Data"        },
  { to: "/analysis",  icon: "⌬", label: "Analysis"    }, 
  { to: "/analysisboth",  icon: "⌬", label: "Analysisboth"    }, 
];

function Sidebar() {
  const loc = useLocation();
  const handleLogout = () => {
    authService.logout();
    window.location.href = "/login";
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <span>⬡</span> ElderGuard
      </div>
      <div className="sidebar-links">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className={`nav-link ${loc.pathname.startsWith(n.to) ? "active" : ""}`}
          >
            <span className="nav-icon">{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </div>
      <button className="sidebar-logout" onClick={handleLogout}>
        ⏻ Logout
      </button>

      <style>{`
        .sidebar {
          width: 220px;
          min-height: 100vh;
          background: rgba(255,255,255,0.025);
          border-right: 1px solid rgba(255,255,255,0.07);
          display: flex;
          flex-direction: column;
          padding: 24px 16px;
          flex-shrink: 0;
          font-family: 'DM Sans', sans-serif;
        }
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 17px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 36px;
          padding-left: 8px;
          letter-spacing: -0.3px;
        }
        .sidebar-logo span { color: #818cf8; font-size: 22px; }
        .sidebar-links { display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          color: rgba(255,255,255,0.45);
          transition: all 0.15s;
        }
        .nav-link:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); }
        .nav-link.active { background: rgba(99,102,241,0.2); color: #818cf8; }
        .nav-icon { font-size: 16px; width: 20px; text-align: center; }
        .sidebar-logout {
          background: none;
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.3);
          border-radius: 10px;
          padding: 9px 14px;
          font-size: 13px;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s;
          font-family: inherit;
        }
        .sidebar-logout:hover { border-color: rgba(248,113,113,0.4); color: #f87171; background: rgba(239,68,68,0.07); }
      `}</style>
    </nav>
  );
}

// ─── App Shell ────────────────────────────────────────────
function AppShell({ children }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0f" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "32px", overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}

// ─── Routes ───────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"  element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="/dashboard" element={
          <RequireAuth><AppShell><Dashboard /></AppShell></RequireAuth>
        }/>

        <Route path="/data" element={
          <RequireAuth><AppShell><Data /></AppShell></RequireAuth>
        }/>
        <Route path="/analysis" element={
          <RequireAuth><AppShell><Analysis /></AppShell></RequireAuth>
        }/>
        <Route path="/Analysisboth" element={
          <RequireAuth><AppShell><Analysisboth /></AppShell></RequireAuth>
        }/>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}