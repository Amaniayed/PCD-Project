const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ─── Auth ───────────────────────────────────────────────
export const authService = {
  async login(email, password) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Login failed");
    const data = await res.json();
    localStorage.setItem("token", data.access_token);
    return data;
  },

  async signup(name, email, password) {
    const res = await fetch(`${BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Signup failed");
    return res.json();
  },

  logout() {
    localStorage.removeItem("token");
  },

  getToken() {
    return localStorage.getItem("token");
  },

  isAuthenticated() {
    return !!localStorage.getItem("token");
  },
};

// ─── Helpers ─────────────────────────────────────────────
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${authService.getToken()}`,
});

// ─── CRUD: Records ────────────────────────────────────────
export const recordsService = {
  async getAll() {
    const res = await fetch(`${BASE_URL}/records`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch records");
    return res.json();
  },

  async getById(id) {
    const res = await fetch(`${BASE_URL}/records/${id}`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Record not found");
    return res.json();
  },

  async create(payload) {
    const res = await fetch(`${BASE_URL}/records`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create record");
    return res.json();
  },

  async update(id, payload) {
    const res = await fetch(`${BASE_URL}/records/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to update record");
    return res.json();
  },

  async delete(id) {
    const res = await fetch(`${BASE_URL}/records/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete record");
    return res.json();
  },
};

// ─── Anomaly Detection ────────────────────────────────────
export const anomalyService = {
  async detect(data) {
    const res = await fetch(`${BASE_URL}/detect`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ data }),
    });
    if (!res.ok) throw new Error("Detection failed");
    return res.json();
  },

  async getResults() {
    const res = await fetch(`${BASE_URL}/results`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch results");
    return res.json();
  },
};