import { useState, useEffect } from "react";
import { authService } from "../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${authService.getToken()}`,
});

// ═══════════════════════════════════════════════════════════
//  HOMES SECTION
// ═══════════════════════════════════════════════════════════
function HomesSection({ homes, setHomes, onSelectHome, selectedHomeId }) {
  const [form,   setForm]   = useState({ name: "", location: "" });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const fetchHomes = async () => {
    const res  = await fetch(`${API}/homes`, { headers: authHeaders() });
    const data = await res.json();
    setHomes(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      const url    = editId ? `${API}/homes/${editId}` : `${API}/homes`;
      const method = editId ? "PUT" : "POST";
      const res    = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(form) });
      const data   = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setForm({ name: "", location: "" }); setEditId(null);
      await fetchHomes();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleEdit = (h) => {
    setEditId(h.id);
    setForm({ name: h.name, location: h.location || "" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this home and ALL its datasets?")) return;
    const res = await fetch(`${API}/homes/${id}`, { method: "DELETE", headers: authHeaders() });
    if (res.ok) setHomes((h) => h.filter((x) => x.id !== id));
  };

  return (
    <div className="card">
      <h2>🏠 Homes</h2>
      {error && <div className="alert error">{error}</div>}

      <form onSubmit={handleSubmit} className="inline-form">
        <input name="name" value={form.name} onChange={handleChange}
          placeholder="Home name *" required />
        <input name="location" value={form.location} onChange={handleChange}
          placeholder="Location (optional)" />
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "…" : editId ? "Update" : "Add Home"}
        </button>
        {editId && (
          <button type="button" className="btn-ghost"
            onClick={() => { setEditId(null); setForm({ name: "", location: "" }); }}>
            Cancel
          </button>
        )}
      </form>

      {homes.length === 0 ? (
        <div className="empty">No homes yet. Add one above.</div>
      ) : (
        <div className="home-list">
          {homes.map((h) => (
            <div
              key={h.id}
              className={`home-card ${selectedHomeId === h.id ? "selected" : ""}`}
              onClick={() => onSelectHome(h.id)}
            >
              <div className="home-info">
                <span className="home-name">{h.name}</span>
                {h.location && <span className="home-loc">📍 {h.location}</span>}
                <span className="home-date">{new Date(h.created_at).toLocaleDateString()}</span>
              </div>
              <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                <button className="btn-edit" onClick={() => handleEdit(h)}>Edit</button>
                <button className="btn-del"  onClick={() => handleDelete(h.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  DATASETS SECTION
// ═══════════════════════════════════════════════════════════
function DatasetsSection({ homes, selectedHomeId }) {
  const [datasets,  setDatasets]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [csvFile,   setCsvFile]   = useState(null);
  const [duration,  setDuration]  = useState("");
  const [homeId,    setHomeId]    = useState(selectedHomeId || "");
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");

  useEffect(() => {
    setHomeId(selectedHomeId || "");
    if (selectedHomeId) fetchDatasets(selectedHomeId);
    else fetchAll();
  }, [selectedHomeId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/datasets`, { headers: authHeaders() });
      const data = await res.json();
      setDatasets(data);
    } catch { setError("Failed to load datasets."); }
    finally { setLoading(false); }
  };

  const fetchDatasets = async (hid) => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/datasets/home/${hid}`, { headers: authHeaders() });
      const data = await res.json();
      setDatasets(data);
    } catch { setError("Failed to load datasets."); }
    finally { setLoading(false); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!csvFile) return setError("Please select a CSV file.");
    if (!homeId)  return setError("Please select a home.");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file",     csvFile);
      fd.append("home_id",  homeId);
      fd.append("duration", duration);
      const res  = await fetch(`${API}/datasets`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authService.getToken()}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setSuccess("Dataset uploaded successfully!");
      setCsvFile(null); setDuration("");
      selectedHomeId ? fetchDatasets(selectedHomeId) : fetchAll();
    } catch (err) { setError(err.message); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this dataset?")) return;
    const res = await fetch(`${API}/datasets/${id}`, { method: "DELETE", headers: authHeaders() });
    if (res.ok) setDatasets((d) => d.filter((x) => x.id !== id));
  };

  return (
    <div className="card">
      <h2>
        📂 Datasets
        {selectedHomeId && homes.find(h => h.id === selectedHomeId) && (
          <span className="badge">{homes.find(h => h.id === selectedHomeId).name}</span>
        )}
      </h2>

      {error   && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <form onSubmit={handleUpload} className="upload-form">
        <div className="field">
          <label>Home *</label>
          <select value={homeId} onChange={(e) => setHomeId(e.target.value)} required>
            <option value="">— Select a home —</option>
            {homes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>CSV File *</label>
          <input type="file" accept=".csv"
            onChange={(e) => setCsvFile(e.target.files[0])}
            className="file-input" />
        </div>
        <div className="field">
          <label>Duration (optional)</label>
          <input value={duration} onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 30 days" />
        </div>
        <button type="submit" className="btn-primary" disabled={uploading}>
          {uploading ? "Uploading…" : "⬆ Upload"}
        </button>
      </form>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : datasets.length === 0 ? (
        <div className="empty">No datasets yet. Upload a CSV above.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>File Name</th><th>Home</th>
                <th>Duration</th><th>Upload Date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((d) => (
                <tr key={d.id}>
                  <td className="id-cell">{d.id}</td>
                  <td className="file-cell">📄 {d.file_name}</td>
                  <td>
                    <span className="home-tag">
                      {d.home_name || homes.find(h => h.id === d.home_id)?.name || `#${d.home_id}`}
                    </span>
                  </td>
                  <td>{d.duration || <span className="na">—</span>}</td>
                  <td className="date-cell">{new Date(d.upload_date).toLocaleString()}</td>
                  <td><button className="btn-del" onClick={() => handleDelete(d.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════
export default function Data() {
  const [homes,          setHomes]          = useState([]);
  const [selectedHomeId, setSelectedHomeId] = useState(null);

  useEffect(() => {
    fetch(`${API}/homes`, { headers: authHeaders() })
      .then((r) => r.json()).then(setHomes).catch(console.error);
  }, []);

  return (
    <div className="data-page">
      <h1>Data Management</h1>
      <p className="sub">Manage your homes and their energy datasets</p>
      <div className="hint-bar">💡 Click a home card to filter its datasets</div>

      <HomesSection
        homes={homes} setHomes={setHomes}
        onSelectHome={(id) => setSelectedHomeId((prev) => prev === id ? null : id)}
        selectedHomeId={selectedHomeId}
      />
      <DatasetsSection homes={homes} selectedHomeId={selectedHomeId} />

      <style>{`
        .data-page { color: #fff; font-family: 'DM Sans', sans-serif; max-width: 1000px; }
        h1 { font-size: 26px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.5px; }
        .sub { color: rgba(255,255,255,0.35); font-size: 14px; margin: 0 0 16px; }
        .hint-bar { background: rgba(129,140,248,0.08); border: 1px solid rgba(129,140,248,0.2); border-radius: 10px; padding: 10px 16px; font-size: 13px; color: rgba(129,140,248,0.8); margin-bottom: 24px; }
        .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
        .card h2 { font-size: 16px; font-weight: 600; margin: 0 0 18px; color: rgba(255,255,255,0.85); display: flex; align-items: center; gap: 10px; }
        .alert { padding: 12px 16px; border-radius: 10px; font-size: 13px; margin-bottom: 16px; }
        .alert.error   { background: rgba(239,68,68,0.1);  border: 1px solid rgba(239,68,68,0.3);  color: #f87171; }
        .alert.success { background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.3); color: #34d399; }
        .inline-form { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; align-items: center; }
        .inline-form input { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px 13px; color: #fff; font-size: 14px; outline: none; font-family: inherit; transition: border-color 0.2s; flex: 1; min-width: 160px; }
        .inline-form input:focus { border-color: #818cf8; }
        .inline-form input::placeholder { color: rgba(255,255,255,0.2); }
        .home-list { display: flex; flex-direction: column; gap: 8px; }
        .home-card { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 14px 18px; cursor: pointer; transition: all 0.15s; }
        .home-card:hover { background: rgba(255,255,255,0.06); }
        .home-card.selected { background: rgba(99,102,241,0.12); border-color: rgba(129,140,248,0.4); }
        .home-info { display: flex; align-items: center; gap: 16px; }
        .home-name { font-weight: 600; font-size: 15px; color: #fff; }
        .home-loc  { font-size: 13px; color: rgba(255,255,255,0.4); }
        .home-date { font-size: 12px; color: rgba(255,255,255,0.25); }
        .upload-form { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 14px; align-items: end; margin-bottom: 20px; }
        .field { display: flex; flex-direction: column; gap: 7px; }
        .field label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px; }
        .field input, .field select { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px 13px; color: #fff; font-size: 14px; outline: none; font-family: inherit; transition: border-color 0.2s; }
        .field input:focus, .field select:focus { border-color: #818cf8; }
        .field select option { background: #1a1a2e; }
        .file-input { cursor: pointer; }
        .btn-primary { background: #6366f1; color: #fff; border: none; border-radius: 10px; padding: 11px 20px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s; font-family: inherit; white-space: nowrap; }
        .btn-primary:hover:not(:disabled) { background: #818cf8; }
        .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-ghost { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 11px 16px; font-size: 14px; cursor: pointer; font-family: inherit; }
        .btn-edit { background: rgba(129,140,248,0.15); color: #818cf8; border: none; border-radius: 7px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .btn-edit:hover { background: rgba(129,140,248,0.25); }
        .btn-del  { background: rgba(239,68,68,0.1); color: #f87171; border: none; border-radius: 7px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .btn-del:hover { background: rgba(239,68,68,0.2); }
        .badge { background: rgba(129,140,248,0.2); color: #818cf8; border-radius: 20px; padding: 2px 10px; font-size: 12px; font-weight: 600; }
        .empty { text-align: center; padding: 32px; color: rgba(255,255,255,0.3); font-size: 14px; }
        .table-wrap { overflow-x: auto; border-radius: 10px; border: 1px solid rgba(255,255,255,0.07); }
        table { width: 100%; border-collapse: collapse; }
        thead tr { border-bottom: 1px solid rgba(255,255,255,0.08); }
        th { text-align: left; padding: 11px 16px; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.5px; }
        tbody tr { border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.15s; }
        tbody tr:last-child { border-bottom: none; }
        tbody tr:hover { background: rgba(255,255,255,0.03); }
        td { padding: 12px 16px; font-size: 14px; color: rgba(255,255,255,0.75); }
        .id-cell   { color: rgba(255,255,255,0.25); font-size: 12px; }
        .file-cell { font-family: monospace; font-size: 13px; }
        .date-cell { font-size: 12px; color: rgba(255,255,255,0.4); }
        .home-tag  { background: rgba(129,140,248,0.15); color: #818cf8; border-radius: 6px; padding: 3px 10px; font-size: 12px; font-weight: 600; }
        .na { color: rgba(255,255,255,0.2); }
        .row-actions { display: flex; gap: 8px; }
        @media (max-width: 768px) { .upload-form { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}