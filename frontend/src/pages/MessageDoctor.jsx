import { useEffect, useState, useRef } from "react";
import { authService } from "../services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const h   = () => ({ Authorization: `Bearer ${authService.getToken()}` });
const hj  = () => ({ ...h(), "Content-Type": "application/json" });

// ── Tab button ─────────────────────────────────────────────
function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        background: active ? "#6366f1" : "#f4f6fb",
        color: active ? "#fff" : "#6b7280",
        border: `1.5px solid ${active ? "#6366f1" : "#e8eaf0"}`,
        borderRadius: 10,
        padding: "9px 0",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "0.15s",
      }}
    >
      {children}
    </button>
  );
}

// ── Family Notification Panel ──────────────────────────────
function FamilyPanel({ selectedResult, homes }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState("");
  const [error,   setError]   = useState("");
  const [emailStatus, setEmailStatus] = useState("");
  const home          = homes.find(hm => hm.name === selectedResult?.home_name);
  const familyContact = home?.contacts?.find(c => c.type === "family");

  // Auto-fill when result changes
  useEffect(() => {
    if (!selectedResult) return;
    setSubject(
      `[ElderGuard Alert] ${selectedResult.home_name} — ` +
      `${selectedResult.total_anomalies} anomal${selectedResult.total_anomalies === 1 ? "y" : "ies"} detected`
    );
    setMessage(
      `Hello${familyContact?.name ? ` ${familyContact.name}` : ""},\n\n` +
      `This is a notification from ElderGuard Monitoring System.\n\n` +
      `📍 Home: ${selectedResult.home_name}\n` +
      `📅 Analysis Date: ${new Date(selectedResult.analyzed_at).toLocaleDateString()}\n` +
      `⚠️  Anomalies Detected: ${selectedResult.total_anomalies}\n` +
      `🔬 Pipeline: ${selectedResult.pipeline}\n\n` +
      `Please review the situation and contact the medical team if needed.\n\n` +
      `— ElderGuard Caregiver`
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedResult?.id]);
  const sendEmail = async () => {
    try {
      setEmailStatus("Sending...");
      const res = await fetch(`${API}/api/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...h(),
        },
        body: JSON.stringify({
          to: familyContact.email,
          subject,
          text: message,
        }),
      });
  
      if (!res.ok) throw new Error();

    setEmailStatus("✅ Sent");
  } catch {
    setEmailStatus("❌ Failed");
  }
  };
  const sendInApp = async () => {
    if (!message.trim()) return;
    setSending(true); setError(""); setSuccess("");
    try {
      const res = await fetch(`${API}/messages`, {
        method: "POST",
        headers: hj(),
        body: JSON.stringify({
          analysis_result_id: selectedResult.id,
          recipient_type: "family",
          body: message,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Failed to send");
      setSuccess("Message recorded successfully!");
      setTimeout(() => setSuccess(""), 4000);
    } catch (e) { setError(e.message); }
    finally { setSending(false); }
  };

  if (!selectedResult) {
    return (
      <div style={{ textAlign: "center", padding: 56, color: "#b0b5c4", fontSize: 14 }}>
        ← Select an analysis result first
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Family contact card */}
      <div style={{
        background: familyContact ? "#f0fdf4" : "#fafafa",
        border: `1px solid ${familyContact ? "#bbf7d0" : "#e8eaf0"}`,
        borderRadius: 12,
        padding: "14px 18px",
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#9196a8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
          👨‍👩‍👧 Family Contact — {selectedResult.home_name}
        </div>
        {familyContact ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{familyContact.name}</div>
            {familyContact.email && (
              <div style={{ fontSize: 13, color: "#059669", display: "flex", alignItems: "center", gap: 7 }}>
                <span>✉</span>
                <button
  onClick={sendEmail}
  style={{
    background: "linear-gradient(135deg,#6366f1,#818cf8)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 16px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    display: "flex",
    alignItems: "center",
    gap: 6,
    boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
    transition: "0.2s",
  }}
  onMouseEnter={e => {
    e.currentTarget.style.transform = "translateY(-1px)";
    e.currentTarget.style.boxShadow = "0 6px 16px rgba(99,102,241,0.4)";
  }}
  onMouseLeave={e => {
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow = "0 4px 12px rgba(99,102,241,0.3)";
  }}
>
  ✉️ Send Email
</button>
                <span style={{ background: "#dcfce7", color: "#16a34a", borderRadius: 4, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>
                {emailStatus || "EMAIL READY"}
                </span>
              </div>
            )}
            {familyContact.phone && (
              <div style={{ fontSize: 13, color: "#475569", display: "flex", alignItems: "center", gap: 7 }}>
                <span>📞</span> {familyContact.phone}
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "#b0b5c4" }}>
            No family contact for this home.{" "}
            <span style={{ color: "#6366f1", fontWeight: 600 }}>Data → Homes</span> to add one.
          </div>
        )}
      </div>

      {/* Alert summary banner */}
      <div style={{
        background: "rgba(239,68,68,0.05)",
        border: "1px solid rgba(239,68,68,0.18)",
        borderRadius: 12,
        padding: "13px 18px",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}>
        <div style={{ fontSize: 28 }}>⚠️</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>
            {selectedResult.total_anomalies} anomal{selectedResult.total_anomalies === 1 ? "y" : "ies"} detected
          </div>
          <div style={{ fontSize: 12, color: "#9196a8", marginTop: 2 }}>
            {selectedResult.pipeline} · {new Date(selectedResult.analyzed_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Subject */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: "#9196a8", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 7 }}>
          Subject
        </label>
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          style={{
            width: "100%", background: "#fff", border: "1.5px solid #e2e8f0",
            borderRadius: 10, padding: "10px 13px", color: "#1e293b", fontSize: 13,
            outline: "none", fontFamily: "inherit", boxSizing: "border-box",
          }}
          onFocus={e => e.target.style.borderColor = "#6366f1"}
          onBlur={e => e.target.style.borderColor = "#e2e8f0"}
        />
      </div>

      {/* Message body */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: "#9196a8", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 7 }}>
          Message
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={9}
          style={{
            width: "100%", background: "#fff", border: "1.5px solid #e2e8f0",
            borderRadius: 10, padding: "10px 13px", color: "#1e293b", fontSize: 13,
            outline: "none", fontFamily: "inherit", resize: "vertical",
            boxSizing: "border-box", lineHeight: 1.6,
          }}
          onFocus={e => e.target.style.borderColor = "#6366f1"}
          onBlur={e => e.target.style.borderColor = "#e2e8f0"}
        />
      </div>

      {/* Feedback */}
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
          ✅ {success}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10 }}>
        {/* In-app record */}
        <button
          onClick={sendInApp}
          disabled={sending || !message.trim()}
          style={{
            flex: 1,
            background: sending || !message.trim() ? "#e8eaf0" : "linear-gradient(135deg,#10b981,#34d399)",
            color: sending || !message.trim() ? "#9196a8" : "#fff",
            border: "none", borderRadius: 10, padding: "12px",
            fontSize: 13, fontWeight: 700,
            cursor: sending || !message.trim() ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            boxShadow: sending || !message.trim() ? "none" : "0 4px 12px rgba(16,185,129,0.3)",
            transition: "0.2s",
          }}
        >
          {sending ? "Saving…" : "💾 Save Notification"}
        </button>

        
      </div>

      
    </div>
  );
}

// ── Doctor Thread ──────────────────────────────────────────
function DoctorThread({ resultId, user }) {
  const [thread, setThread]   = useState([]);
  const [body, setBody]       = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState("");
  const bottomRef = useRef(null);

  const load = () =>
    fetch(`${API}/messages/thread/${resultId}`, { headers: h() })
      .then(r => r.json())
      .then(d => setThread(Array.isArray(d) ? d : []));

  useEffect(() => { if (resultId) load(); }, [resultId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread]);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true); setError("");
    try {
      const res = await fetch(`${API}/messages`, {
        method: "POST", headers: hj(),
        body: JSON.stringify({
          analysis_result_id: resultId,
          recipient_type: "doctor",
          body,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Failed to send");
      setBody(""); load();
    } catch (e) { setError(e.message); }
    finally { setSending(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, marginBottom: 14, minHeight: 0 }}>
        {thread.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: "#b0b5c4", fontSize: 14 }}>
            No messages yet. Start the conversation.
          </div>
        ) : thread.map(msg => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "70%",
                background: isMe ? "rgba(99,102,241,0.08)" : "#f4f6fb",
                border: `1px solid ${isMe ? "rgba(99,102,241,0.25)" : "#e8eaf0"}`,
                borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                padding: "10px 14px",
              }}>
                <div style={{ fontSize: 11, color: "#9196a8", marginBottom: 4 }}>
                  <strong style={{ color: isMe ? "#6366f1" : "#475569" }}>{msg.sender_name}</strong>
                  {" · "}{msg.sender_role}
                  {msg.recipient_type && (
                    <span style={{ marginLeft: 8, background: "#e8eaf0", borderRadius: 4, padding: "1px 6px", fontSize: 10 }}>
                      → {msg.recipient_type}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13.5, color: "#1e293b", lineHeight: 1.55 }}>{msg.body}</div>
                <div style={{ fontSize: 10, color: "#b0b5c4", marginTop: 5, textAlign: "right" }}>
                  {new Date(msg.sent_at || msg.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "8px 12px", fontSize: 12, marginBottom: 10 }}>
          ⚠️ {error}
        </div>
      )}

      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(); }}
        placeholder="Write your message to the doctor… (Ctrl+Enter to send)"
        rows={3}
        style={{
          width: "100%", background: "#fff", border: "1.5px solid #e2e8f0",
          borderRadius: 10, padding: "10px 13px", color: "#1e293b", fontSize: 14,
          outline: "none", fontFamily: "inherit", resize: "none", boxSizing: "border-box",
        }}
        onFocus={e => e.target.style.borderColor = "#6366f1"}
        onBlur={e => e.target.style.borderColor = "#e2e8f0"}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
        <button
          onClick={send}
          disabled={sending || !body.trim()}
          style={{
            background: sending || !body.trim() ? "#e8eaf0" : "linear-gradient(135deg,#6366f1,#818cf8)",
            color: sending || !body.trim() ? "#9196a8" : "#fff",
            border: "none", borderRadius: 10, padding: "10px 28px",
            fontSize: 14, fontWeight: 600,
            cursor: sending || !body.trim() ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            boxShadow: sending || !body.trim() ? "none" : "0 4px 14px rgba(99,102,241,0.3)",
          }}
        >
          {sending ? "Sending…" : "Send ✈"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════
export default function MessageDoctor() {
  const user = authService.getUser?.() || {};

  const [results,  setResults]  = useState([]);
  const [resultId, setResultId] = useState(null);
  const [homes,    setHomes]    = useState([]);
  const [tab,      setTab]      = useState("doctor");
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/analyze/results`, { headers: h() }).then(r => r.ok ? r.json() : []),
      fetch(`${API}/homes`,           { headers: h() }).then(r => r.ok ? r.json() : []),
    ])
      .then(([res, hms]) => {
        const arr = Array.isArray(res) ? res : [];
        setResults(arr);
        setHomes(Array.isArray(hms) ? hms : []);
        if (arr.length > 0) setResultId(arr[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedResult = results.find(r => r.id === resultId);

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      display: "flex",
      gap: 20,
      height: "calc(100vh - 96px)",
      color: "#1e293b",
    }}>

      {/* LEFT: result list */}
      <div style={{
        width: 260, background: "#fff", border: "1px solid #e8eaf0",
        borderRadius: 16, padding: 16, overflowY: "auto", flexShrink: 0,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#9196a8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
          📋 Select Analysis
        </div>

        {loading && <div style={{ color: "#b0b5c4", fontSize: 13, textAlign: "center", padding: 20 }}>Loading…</div>}
        {!loading && results.length === 0 && (
          <div style={{ color: "#b0b5c4", fontSize: 13, textAlign: "center", padding: 20 }}>
            No results found. Run an analysis first.
          </div>
        )}

        {results.map(r => (
          <div
            key={r.id}
            onClick={() => setResultId(r.id)}
            style={{
              padding: "11px 13px", borderRadius: 10, cursor: "pointer", marginBottom: 8,
              background: resultId === r.id ? "rgba(99,102,241,0.08)" : "#f8fafc",
              border: `1.5px solid ${resultId === r.id ? "#6366f1" : "#e8eaf0"}`,
              transition: "0.15s",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b", marginBottom: 3 }}>
              {r.home_name || `Result #${r.id}`}
            </div>
            <div style={{ fontSize: 11, color: "#9196a8" }}>
              {r.total_anomalies} anomal{r.total_anomalies === 1 ? "y" : "ies"} · {r.pipeline}
            </div>
            <div style={{ fontSize: 11, color: "#b0b5c4", marginTop: 2 }}>{r.file_name}</div>
            <div style={{ fontSize: 10, color: "#c8cdd8", marginTop: 2 }}>
              {new Date(r.analyzed_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {/* RIGHT: panel */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        background: "#fff", border: "1px solid #e8eaf0",
        borderRadius: 16, overflow: "hidden", minHeight: 0,
      }}>
        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #e8eaf0", flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b", marginBottom: 2 }}>
            {selectedResult ? selectedResult.home_name || `Result #${selectedResult.id}` : "Communications"}
          </div>
          <div style={{ fontSize: 12, color: "#9196a8" }}>
            {selectedResult
              ? `${selectedResult.total_anomalies} anomalies · ${selectedResult.pipeline} · Analysis #${selectedResult.id}`
              : "Select an analysis result on the left"}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 10, padding: "14px 24px", borderBottom: "1px solid #e8eaf0", flexShrink: 0 }}>
          <TabBtn active={tab === "doctor"} onClick={() => setTab("doctor")}>
            👨‍⚕️ Message Doctor
          </TabBtn>
          <TabBtn active={tab === "family"} onClick={() => setTab("family")}>
            👨‍👩‍👧 Notify Family
          </TabBtn>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", minHeight: 0 }}>
          {tab === "doctor" && (
            resultId
              ? <DoctorThread resultId={resultId} user={user} />
              : <div style={{ textAlign: "center", padding: 48, color: "#b0b5c4", fontSize: 14 }}>
                  ← Select an analysis result to start messaging
                </div>
          )}
          {tab === "family" && (
            <FamilyPanel selectedResult={selectedResult} homes={homes} />
          )}
        </div>
      </div>
    </div>
  );
}