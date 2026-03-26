import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../services/api";

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await authService.signup(form.name, form.email, form.password);
      navigate("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">⬡</span>
          <h1>ElderGuard</h1>
        </div>
        <h2>Create account</h2>
        <p className="auth-sub">Start detecting anomalies today</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Jane Doe"
              required
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Min. 8 characters"
              required
              minLength={8}
            />
          </div>
          <div className="field">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirm"
              value={form.confirm}
              onChange={handleChange}
              placeholder="Repeat password"
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link to="/login">Sign in</Link>
        </p>
      </div>

      <style>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0a0f;
          background-image: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.15) 0%, transparent 70%);
          font-family: 'DM Sans', sans-serif;
        }
        .auth-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 48px 40px;
          width: 100%;
          max-width: 420px;
          backdrop-filter: blur(20px);
        }
        .auth-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
        .logo-icon { font-size: 28px; color: #818cf8; }
        .auth-logo h1 { font-size: 20px; font-weight: 700; color: #fff; letter-spacing: -0.5px; margin: 0; }
        .auth-card h2 { font-size: 26px; font-weight: 700; color: #fff; margin: 0 0 6px; letter-spacing: -0.5px; }
        .auth-sub { color: rgba(255,255,255,0.4); font-size: 14px; margin: 0 0 28px; }
        .auth-error {
          background: rgba(239,68,68,0.12);
          border: 1px solid rgba(239,68,68,0.3);
          color: #f87171;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 13px;
          margin-bottom: 20px;
        }
        .auth-form { display: flex; flex-direction: column; gap: 16px; }
        .field { display: flex; flex-direction: column; gap: 7px; }
        .field label { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.6); }
        .field input {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 12px 14px;
          color: #fff;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
          font-family: inherit;
        }
        .field input:focus { border-color: #818cf8; }
        .field input::placeholder { color: rgba(255,255,255,0.2); }
        .btn-primary {
          margin-top: 6px;
          background: #6366f1;
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 13px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
          font-family: inherit;
        }
        .btn-primary:hover { background: #818cf8; }
        .btn-primary:active { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .auth-footer { text-align: center; margin-top: 24px; font-size: 13px; color: rgba(255,255,255,0.35); }
        .auth-footer a { color: #818cf8; text-decoration: none; }
        .auth-footer a:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}