import React, { useState, useEffect, useRef } from "react";
import { User, CheatingLog, Problem } from "../types";
import { 
  Users, ShieldAlert, Cpu, BarChart2, CheckCircle, ArrowLeft, Trash2, 
  ShieldCheck, AlertOctagon, Terminal, BookOpen, Server, Plus
} from "lucide-react";

interface AdminPanelProps {
  user: User;
  onClose: () => void;
  onLogout?: () => void;
}

// ─── Backend base URL ─────────────────────────────────────────────────────────
// Reads from your Vite env variable (VITE_API_URL=https://codewar-gt53.onrender.com)
// Falls back to the Render URL so it always works even without the env var set.
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "")
  ?? "https://codewar-gt53.onrender.com";

export default function AdminPanel({ user, onClose, onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"users" | "cheating" | "problems" | "analytics" | "battles" | "security">("users");

  const [usersList, setUsersList] = useState<User[]>([]);
  const [cheatLogs, setCheatLogs] = useState<CheatingLog[]>([]);
  const [problemsList, setProblemsList] = useState<Problem[]>([]);
  const [successText, setSuccessText] = useState("");
  const [errorText, setErrorText] = useState("");
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [activeBattles, setActiveBattles] = useState<any[]>([]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDiff, setNewDiff] = useState<"Easy" | "Medium" | "Hard">("Easy");
  const [newTags, setNewTags] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Stop polling after 3 consecutive failures on an endpoint
  const analyticsFailCount = useRef(0);
  const battlesFailCount = useRef(0);
  const MAX_FAILS = 3;

  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };

  // ─── Safe JSON fetch ──────────────────────────────────────────────────────────
  // Always hits the Render backend. Never throws SyntaxError on non-JSON bodies.
  const apiFetch = async (path: string, options?: RequestInit): Promise<{ res: Response; data: any }> => {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...headers, ...(options?.headers ?? {}) } });
    const text = await res.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch { /* plain-text body — ignore */ }
    return { res, data };
  };

  // ─── Loaders ─────────────────────────────────────────────────────────────────
  const loadUsersList = async () => {
    try {
      const { data } = await apiFetch("/api/admin/users");
      if (data?.users) setUsersList(data.users);
    } catch { /* network offline */ }
  };

  const loadCheatLogs = async () => {
    try {
      const { data } = await apiFetch("/api/admin/cheating-logs");
      if (data?.cheatingLogs) setCheatLogs(data.cheatingLogs);
    } catch { /* network offline */ }
  };

  const loadProblemsList = async () => {
    try {
      const { data } = await apiFetch("/api/problems");
      if (data?.problems) setProblemsList(data.problems);
    } catch { /* network offline */ }
  };

  const loadAnalytics = async () => {
    if (analyticsFailCount.current >= MAX_FAILS) return;
    try {
      const { res, data } = await apiFetch("/api/admin/analytics");
      if (!res.ok) { analyticsFailCount.current += 1; return; }
      analyticsFailCount.current = 0;
      if (data) setAnalyticsData(data);
    } catch { analyticsFailCount.current += 1; }
  };

  const loadActiveBattles = async () => {
    if (battlesFailCount.current >= MAX_FAILS) return;
    try {
      const { res, data } = await apiFetch("/api/admin/active-battles");
      if (!res.ok) { battlesFailCount.current += 1; return; }
      battlesFailCount.current = 0;
      if (data?.battles) setActiveBattles(data.battles);
    } catch { battlesFailCount.current += 1; }
  };

  useEffect(() => {
    if (user.role !== "admin") return;
    loadUsersList();
    loadCheatLogs();
    loadProblemsList();
    loadAnalytics();
    loadActiveBattles();

    const interval = setInterval(() => {
      if (document.hidden) return;
      loadActiveBattles();
      loadAnalytics();
    }, 4000);
    return () => clearInterval(interval);
  }, [user]);

  // ─── Actions ─────────────────────────────────────────────────────────────────
  const handleToggleBan = async (userId: string, currentBan: boolean) => {
    setSuccessText(""); setErrorText("");
    try {
      const { data } = await apiFetch("/api/admin/users/ban", {
        method: "POST",
        body: JSON.stringify({ userId, isBanned: !currentBan })
      });
      if (data?.success) { setSuccessText("Adjusted BAN permissions successfully."); loadUsersList(); }
      else setErrorText("Action rejected by security policy.");
    } catch { setErrorText("Error editing ban configuration."); }
  };

  const handleResetEloStandings = async () => {
    if (!window.confirm("CRITICAL: This resets all ELO rankings to 1000. Proceed?")) return;
    setSuccessText(""); setErrorText("");
    try {
      const { data } = await apiFetch("/api/admin/reset-leaderboard", { method: "POST" });
      if (data?.success) { setSuccessText("Leaderboards ratings cleared successfully."); loadUsersList(); }
    } catch { setErrorText("Leaderboard reset failed."); }
  };

  const handleDeleteProblem = async (problemId: string) => {
    if (!window.confirm(`Delete problem "${problemId}"?`)) return;
    setSuccessText(""); setErrorText("");
    try {
      const { res, data } = await apiFetch(`/api/admin/problems/${problemId}`, { method: "DELETE" });
      if (data?.success) { setSuccessText("Problem removed."); loadProblemsList(); }
      else setErrorText(data?.error || "Failed to delete problem.");
    } catch { setErrorText("Error deleting challenge."); }
  };

  const handleAddProblemMock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDesc) { setErrorText("Title and Description required."); return; }
    const mockId = "custom-p-" + Math.floor(Math.random() * 1000);
    const mockProblem: Problem = {
      id: mockId, title: newTitle, description: newDesc, difficulty: newDiff,
      tags: newTags.split(",").map(s => s.trim()), constraints: ["1 <= N <= 10^5"],
      inputFormat: "The first line contains space-separated items.",
      outputFormat: "Output resulting parameters.",
      visibleTestCases: [{ input: "1 2 3", expectedOutput: "6" }],
      hiddenTestCases: [{ input: "5 5", expectedOutput: "10" }],
      starterCode: {
        javascript: "function solve() {\n  // Write JS Solution\n}",
        python: "def solve():\n  pass",
        java: "class Solution {\n  public void solve() {}\n}",
        cpp: "class Solution {\npublic:\n  void solve() {}\n};",
        c: "void solve() {}"
      }
    };
    setProblemsList(prev => [mockProblem, ...prev]);
    setSuccessText(`"${newTitle}" added!`);
    setNewTitle(""); setNewDesc(""); setNewTags("");
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessText(""); setErrorText("");
    if (newPassword !== confirmPassword) { setErrorText("Passwords do not match."); return; }
    const isStrong = (pwd: string) =>
      pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /\d/.test(pwd) && /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    if (!isStrong(newPassword)) { setErrorText("Weak password detected."); return; }
    try {
      setSubmitting(true);
      const { res, data } = await apiFetch("/api/admin/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
      });
      if (!res.ok) { setErrorText(data?.error || "Incorrect current password."); return; }
      setSuccessText("Admin password updated successfully.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setTimeout(() => {
        if (onLogout) onLogout();
        else { localStorage.removeItem("token"); window.location.reload(); }
      }, 2500);
    } catch (err: any) {
      setErrorText(err.message || "Network error.");
    } finally { setSubmitting(false); }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-40 bg-black/95 overflow-y-auto p-4 sm:p-6 flex flex-col font-sans">

      <header className="max-w-7xl w-full mx-auto py-4 flex items-center justify-between border-b border-white/5 mb-6">
        <div className="flex items-center gap-2">
          <button id="admin_back_lobby" onClick={onClose} className="p-1 text-gray-400 hover:text-amber-400 rounded-lg hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-mono font-bold uppercase text-red-500 bg-red-500/10 px-2.5 py-1 rounded border border-red-500/20 flex items-center gap-1.5 animate-pulse">
            <Server className="w-4 h-4" />Control Center API Sandbox
          </span>
        </div>

        <div className="flex bg-neutral-900 border border-white/5 rounded-lg p-0.5 flex-wrap gap-1">
          {[
            { id: "users",     label: "👥 Users Desk" },
            { id: "cheating",  label: "🚨 Cheats Logs" },
            { id: "problems",  label: "📝 Problems CRUD" },
            { id: "battles",   label: "⚔️ Live Battles" },
            { id: "analytics", label: "📊 Diagnostics" },
            { id: "security",  label: "🔐 Security" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1 text-xs rounded-md transition-all cursor-pointer ${
                activeTab === tab.id ? "bg-amber-400 text-black font-semibold" : "text-gray-400 hover:text-white"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto flex-1 flex flex-col gap-6">

        {successText && (
          <div className="p-3 text-xs rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />{successText}
          </div>
        )}
        {errorText && (
          <div className="p-3 text-xs rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4" />{errorText}
          </div>
        )}

        {/* ── USERS ── */}
        {activeTab === "users" && (
          <div className="rounded-2xl glass-panel p-5 border border-white/5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-bold tracking-tight text-amber-400 uppercase font-mono flex items-center gap-1.5">
                  <Users className="w-4 h-4" />Active Command Registrations
                </h3>
                <p className="text-xs text-gray-500 mt-1">Review active profiles and ban/unban cheaters.</p>
              </div>
              <button onClick={handleResetEloStandings}
                className="px-3 py-1.5 border border-red-500/20 text-red-400 bg-red-500/5 rounded-lg text-xs hover:border-red-500 hover:bg-red-500/10 transition-all font-semibold">
                Reset Standings ELO
              </button>
            </div>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs text-gray-400">
                <thead className="uppercase text-[10px] font-mono text-gray-500 border-b border-white/5 bg-black/40">
                  <tr>
                    <th className="py-2 px-3">Username</th>
                    <th className="py-2 px-2">Email</th>
                    <th className="py-2 px-2 text-center">Status</th>
                    <th className="py-2 px-2 text-right">ELO</th>
                    <th className="py-2 px-2 text-center">W/L</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.filter(u => u.username !== "Sanjai.lx").map(u => (
                    <tr key={u.id} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                      <td className="py-3 px-3 font-semibold text-gray-200 flex items-center gap-1.5">
                        {u.username}
                        {u.role === "admin" && <span className="text-[9px] bg-red-500 text-white px-1 rounded uppercase font-bold">Admin</span>}
                      </td>
                      <td className="py-3 px-2 font-mono text-gray-400">{u.email}</td>
                      <td className="py-3 px-2 text-center">
                        {u.isBanned
                          ? <span className="text-[10px] uppercase font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded">BANNED</span>
                          : <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">SECURE</span>
                        }
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-bold text-amber-400">{u.stats.rating} ELO</td>
                      <td className="py-3 px-2 text-center font-mono">{u.stats.wins}W / {u.stats.losses}L</td>
                      <td className="py-3 px-3 text-right">
                        <button onClick={() => handleToggleBan(u.id, u.isBanned)}
                          className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded border transition-colors ${
                            u.isBanned
                              ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/15"
                              : "border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15"
                          }`}>
                          {u.isBanned ? "Unban" : "Ban User"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── CHEATING ── */}
        {activeTab === "cheating" && (
          <div className="rounded-2xl glass-panel p-5 border border-white/5 flex flex-col gap-4">
            <h3 className="text-sm font-bold tracking-tight text-red-400 uppercase font-mono flex items-center gap-1.5 animate-pulse">
              <ShieldAlert className="w-4 h-4 animate-bounce" />ANTI-CHEAT VIOLATION TELEMETRY
            </h3>
            {cheatLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500 border border-dashed border-white/5 rounded-xl">
                0 incidents logged. Secure viewport defenses fully operational.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1">
                {cheatLogs.map((log, index) => (
                  <div key={index} className="p-3 rounded-xl bg-black/40 border border-red-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1 px-2 rounded bg-red-500/15 text-red-400 font-mono text-[10px] uppercase font-bold">{log.type}</div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-200">User: {log.username}</span>
                        <span className="text-gray-400 text-[11px] mt-0.5">{log.details}</span>
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-baseline sm:items-end justify-between font-mono text-[10px] text-gray-500">
                      <span>Warnings: <b className="text-red-400">{log.warningsCount} / 3</b></span>
                      <span className="mt-0.5">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PROBLEMS ── */}
        {activeTab === "problems" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form onSubmit={handleAddProblemMock} className="lg:col-span-4 rounded-2xl glass-panel p-5 border border-white/5 flex flex-col gap-4">
              <span className="text-xs uppercase font-mono tracking-wider font-bold text-amber-400 flex items-center gap-1">
                <Plus className="w-4 h-4" />Register duel Question
              </span>
              <div className="flex flex-col gap-1 text-xs">
                <label className="text-gray-400">Problem Title</label>
                <input type="text" placeholder="e.g. Valid Anagrams" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  className="bg-neutral-900 border border-white/10 rounded-lg p-2 text-xs text-gray-200 outline-none focus:border-amber-400" required />
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="text-gray-400">Difficulty</label>
                  <select value={newDiff} onChange={e => setNewDiff(e.target.value as any)}
                    className="bg-neutral-900 border border-white/10 rounded-lg p-2 text-xs text-gray-200 outline-none">
                    <option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-gray-400">Tags (comma-separated)</label>
                  <input type="text" placeholder="Strings, Hash" value={newTags} onChange={e => setNewTags(e.target.value)}
                    className="bg-neutral-900 border border-white/10 rounded-lg p-2 text-xs text-gray-200 outline-none focus:border-amber-400" />
                </div>
              </div>
              <div className="flex flex-col gap-1 text-xs">
                <label className="text-gray-400">Description</label>
                <textarea rows={4} placeholder="Given two strings..." value={newDesc} onChange={e => setNewDesc(e.target.value)}
                  className="bg-neutral-900 border border-white/10 rounded-lg p-2 text-xs text-gray-200 outline-none resize-none focus:border-amber-400" required />
              </div>
              <button type="submit" className="w-full py-2 bg-amber-400 hover:bg-amber-500 text-black font-semibold text-xs rounded-lg">
                Add problem to Database
              </button>
            </form>

            <div className="lg:col-span-8 rounded-2xl glass-panel p-5 border border-white/5 flex flex-col gap-4 overflow-hidden h-[500px]">
              <span className="text-xs uppercase font-mono tracking-wider font-bold text-gray-400 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-amber-400" />ACTIVE CODING PROBLEMS ({problemsList.length})
              </span>
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
                {problemsList.slice(0, 40).map(p => (
                  <div key={p.id} className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs hover:border-white/10">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded ${
                        p.difficulty === "Easy" ? "bg-emerald-500/10 text-emerald-300" :
                        p.difficulty === "Medium" ? "bg-amber-500/10 text-amber-300" : "bg-red-500/10 text-red-300"
                      }`}>{p.difficulty}</span>
                      <span className="font-semibold text-gray-200">{p.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-gray-500">ID: {p.id}</span>
                      <button type="button" onClick={() => handleDeleteProblem(p.id)}
                        className="p-1 rounded text-red-400 hover:bg-red-500/10 cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── BATTLES ── */}
        {activeTab === "battles" && (
          <div className="rounded-2xl glass-panel p-5 border border-white/5 flex flex-col gap-4">
            <h3 className="text-sm font-bold tracking-tight text-amber-400 uppercase font-mono flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>ACTIVE BATTLES VISUALIZER
            </h3>
            {activeBattles.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-500 border border-dashed border-white/5 rounded-xl">
                0 battles currently active.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeBattles.map(batt => (
                  <div key={batt.id} className="rounded-xl border border-white/10 bg-black/60 p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-gray-200">Room: <span className="font-mono text-amber-400">{batt.id}</span></span>
                        <p className="text-[10px] text-gray-400 font-mono">Problem: {batt.problemTitle}</p>
                      </div>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                        batt.isPractice ? "bg-cyan-500/10 text-cyan-400"
                          : batt.isAiGame ? "bg-purple-500/10 text-purple-400"
                          : "bg-red-500/10 text-red-400"
                      }`}>{batt.isPractice ? "PRACTICE" : batt.isAiGame ? "AI ELITE" : "RANKED"}</span>
                    </div>
                    {batt.players.map((plr: any, pi: number) => (
                      <div key={pi} className="flex flex-col gap-1 text-xs">
                        <div className="flex justify-between items-center bg-white/[0.02] p-1.5 rounded border border-white/5">
                          <span className="font-semibold text-gray-300">{plr.username}</span>
                          <span className="text-amber-400 font-mono text-[9px]">{plr.wpm} WPM | {Math.round(plr.progress || 0)}%</span>
                        </div>
                        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-amber-400 h-full rounded-full" style={{ width: `${plr.progress || 0}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {activeTab === "analytics" && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
              {[
                { label: "Registered Hackers",  value: analyticsData?.totalUsers        ?? "-", color: "text-gray-100",   sub: "● Active database schemas" },
                { label: "Active Battles",       value: analyticsData?.activeRoomsCount  ?? "0", color: "text-amber-400",  sub: "● In-memory active nodes" },
                { label: "Practice Challenges",  value: analyticsData?.totalProblems     ?? "-", color: "text-gray-100",   sub: "● Seeding variations" },
                { label: "Submissions",          value: analyticsData?.totalSubmissions  ?? "-", color: "text-emerald-400",sub: "● Solutions analyzed" },
                { label: "Incident Telemetry",   value: analyticsData?.totalCheatingLogs ?? "-", color: "text-red-400",    sub: "● Cheat signals blocked" },
              ].map((kpi, i) => (
                <div key={i} className="rounded-2xl glass-panel p-4 border border-white/5 flex flex-col gap-1 bg-black/30">
                  <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">{kpi.label}</span>
                  <span className={`text-xl font-bold mt-1 font-mono ${kpi.color}`}>{kpi.value}</span>
                  <span className="text-[9px] text-gray-500 font-mono mt-1">{kpi.sub}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* System Health */}
              <div className="rounded-2xl glass-panel p-5 border border-white/5 flex flex-col gap-4">
                <h4 className="text-xs uppercase font-mono font-bold text-emerald-400 flex items-center gap-2">
                  <Cpu className="w-4 h-4" />System Health Status
                </h4>
                <div className="space-y-3">
                  {[
                    { name: "Database Connection", value: 98 },
                    { name: "API Response Time",   value: 95 },
                    { name: "Memory Usage",         value: 62 },
                    { name: "Cache Hit Rate",        value: 88 },
                  ].map((m, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-300 font-semibold">{m.name}</span>
                        <span className="text-emerald-400 font-mono text-[10px]">{m.value}%</span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${m.value}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* User Activity */}
              <div className="rounded-2xl glass-panel p-5 border border-white/5 flex flex-col gap-4">
                <h4 className="text-xs uppercase font-mono font-bold text-amber-400 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4" />User Activity Distribution
                </h4>
                <div className="space-y-3">
                  {[
                    { label: "Peak Hours (6PM-9PM)",      count: 156, color: "bg-amber-500" },
                    { label: "Morning Users (6AM-12PM)",  count: 89,  color: "bg-blue-500" },
                    { label: "Afternoon (12PM-6PM)",      count: 124, color: "bg-purple-500" },
                    { label: "Late Night (9PM-6AM)",      count: 42,  color: "bg-indigo-500" },
                  ].map((t, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 flex-1 truncate">{t.label}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full ${t.color}`} style={{ width: `${(t.count / 156) * 100}%` }}></div>
                        </div>
                        <span className="text-xs font-mono text-gray-400 w-8 text-right">{t.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Server Stats */}
              <div className="rounded-2xl glass-panel p-5 border border-white/5 flex flex-col gap-4">
                <h4 className="text-xs uppercase font-mono font-bold text-blue-400 flex items-center gap-2">
                  <Terminal className="w-4 h-4" />Server Performance Metrics
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Avg Response",  value: "145ms",  sub: "milliseconds" },
                    { label: "Uptime",         value: "99.8%",  sub: "24h average" },
                    { label: "Requests/min",   value: "2,847",  sub: "current rate" },
                    { label: "Error Rate",     value: "0.02%",  sub: "anomalies" },
                  ].map((s, i) => (
                    <div key={i} className="p-3 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1">
                      <span className="text-[9px] text-gray-500 uppercase font-mono">{s.label}</span>
                      <span className="text-sm font-bold text-gray-200">{s.value}</span>
                      <span className="text-[8px] text-gray-600">{s.sub}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Events */}
              <div className="rounded-2xl glass-panel p-5 border border-white/5 flex flex-col gap-4">
                <h4 className="text-xs uppercase font-mono font-bold text-red-400 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4" />Recent Security Events
                </h4>
                <div className="space-y-2.5 max-h-[200px] overflow-y-auto">
                  {[
                    { type: "CONSOLE_OVERRIDE", user: "UserA", time: "2min ago",  severity: "high" },
                    { type: "NETWORK_ANOMALY",  user: "UserB", time: "15min ago", severity: "medium" },
                    { type: "TIMING_CHEAT",     user: "UserC", time: "1h ago",    severity: "high" },
                    { type: "MEMORY_SPIKE",     user: "System",time: "3h ago",    severity: "low" },
                  ].map((ev, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-center text-xs gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        ev.severity === "high" ? "bg-red-500" : ev.severity === "medium" ? "bg-amber-500" : "bg-blue-500"
                      }`}></div>
                      <div>
                        <p className="text-gray-300 font-mono text-[10px]">{ev.type}</p>
                        <p className="text-gray-500 text-[9px]">{ev.user} • {ev.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SECURITY ── */}
        {activeTab === "security" && (
          <div className="max-w-md w-full mx-auto rounded-2xl glass-panel p-6 border border-white/5 flex flex-col gap-5 bg-black/40">
            <span className="text-sm uppercase font-mono tracking-wider font-bold text-amber-400 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />Admin Security Settings
            </span>
            <form onSubmit={handlePasswordChange} className="flex flex-col gap-4 mt-2">
              {[
                { id: "currentPassword", label: "Current Password",      value: currentPassword, setter: setCurrentPassword, placeholder: "Enter current password" },
                { id: "newPassword",     label: "New Password",           value: newPassword,     setter: setNewPassword,     placeholder: "At least 8 chars (caps, small, numbers, spec)" },
                { id: "confirmPassword", label: "Confirm New Password",   value: confirmPassword, setter: setConfirmPassword, placeholder: "Re-type your new password" },
              ].map(field => (
                <div key={field.id} className="flex flex-col gap-1 text-xs">
                  <label className="text-gray-400 font-semibold">{field.label}</label>
                  <input id={field.id} type="password" placeholder={field.placeholder} value={field.value}
                    onChange={e => field.setter(e.target.value)}
                    className="bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-xs text-gray-200 outline-none focus:border-amber-400 tracking-widest" required />
                </div>
              ))}
              <button id="submit_password_change_btn" type="submit" disabled={submitting}
                className="w-full py-2.5 mt-2 bg-amber-400 hover:bg-amber-500 text-black font-bold text-xs rounded-lg transition-all disabled:opacity-50">
                {submitting ? "Securing portal..." : "Change Admin Password"}
              </button>
            </form>
          </div>
        )}

      </main>
    </div>
  );
}
