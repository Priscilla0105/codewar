import React, { useState, useEffect } from "react";
import { User, LoginHistory } from "../types";
import { X, Mail, Lock, User as UserIcon, ShieldAlert, History, Globe, Eye, EyeOff } from "lucide-react";

const API_URL = "https://codewar-gt53.onrender.com";

interface AuthOverlayProps {
  onClose: () => void;
  onAuthSuccess: (user: User, token: string) => void;
}

export default function AuthOverlay({ onClose, onAuthSuccess }: AuthOverlayProps) {
  const [tab, setTab] = useState<"login" | "register" | "forgot" | "otp" | "reset">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [roleSelection, setRoleSelection] = useState<"user" | "admin">("user");
  
  // Forms states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [otpDemoCode, setOtpDemoCode] = useState("");
  
  // History logs state
  const [histories, setHistories] = useState<LoginHistory[]>([]);
  const [viewingHistory, setViewingHistory] = useState(false);

  // Clear errors when swapping tabs or role selections
  useEffect(() => {
    setError("");
    setSuccessMsg("");
    setOtpDemoCode("");
  }, [tab, roleSelection]);

  // Handle standard registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setError("Please fully input the required attributes.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });
     if (!response.ok) {
  const text = await response.text();
  console.error("Register Error:", text);
  throw new Error(text || "Failed registration");
}

const data = await response.json();
      onAuthSuccess(data.user, data.token);
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred during sign-up.");
    } finally {
      setLoading(false);
    }
  };

  // Handle standard Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Provide username email and password to proceed.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (roleSelection === "admin") {
        const targetAdminEmail = "priscilla.mailbox0105@gmail.com";
        if (email.toLowerCase() !== targetAdminEmail) {
          throw new Error("Invalid Admin Credentials");
        }
      }

      const response = await fetch(
  "https://codewar-gt53.onrender.com/api/auth/login",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role: roleSelection })
  }
);

if (!response.ok) {
  const text = await response.text();
  console.error("Login Error:", text);
  throw new Error(text || "Authentication failed");
}

const data = await response.json();

onAuthSuccess(data.user, data.token);
      onClose();
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth SSO Mock Flow
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      // Simulate Google API Auth populating account details
      const response = await fetch(`${API_URL}/api/auth/google-sign-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "google_dev@clash.com",
          name: "SSO Google Dev",
          googleUid: "uid_google_102030"
        })
      });
      if (!response.ok) {
  const text = await response.text();
  console.error("Google Sign-in Error:", text);
  throw new Error(text || "Google Sign-in failed");
}

const data = await response.json();

      onAuthSuccess(data.user, data.token);
      onClose();
    } catch (err: any) {
      setError(err.message || "Google single sign-on failed.");
    } finally {
      setLoading(false);
    }
  };

  // Request password reset verification OTP
  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your account email address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (!response.ok) {
  const text = await response.text();
  console.error("Forgot Password Error:", text);
  throw new Error(text || "Reset request failed");
}

const data = await response.json();
      setSuccessMsg(`A security OTP code was generated. Check compiler log console!`);
      if (data.otpDemo) {
        setOtpDemoCode(data.otpDemo); // Expose OTP for smooth testing in Sandbox!
      }
      setTab("otp");
    } catch (err: any) {
      setError(err.message || "No account found matching this email.");
    } finally {
      setLoading(false);
    }
  };

  // Verify Reset OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      setError("Please input the 6-digits OTP.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
      });
      if (!response.ok) {
  const text = await response.text();
  console.error("OTP Verify Error:", text);
  throw new Error(text || "Incorrect OTP");
}
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Incorrect OTP");

      setSuccessMsg("OTP Verified successfully. Please set your new password below.");
      setTab("reset");
    } catch (err: any) {
      setError(err.message || "Incorrect verification token.");
    } finally {
      setLoading(false);
    }
  };

  // Reset Pasword Submit
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError("Password length must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Reset failed");

      setSuccessMsg("Security Password updated! Please login using your new credentials.");
      setTab("login");
    } catch (err: any) {
      setError(err.message || "Error resetting password.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Login history
  const fetchHistory = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/auth/history`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) {
  const text = await response.text();
  console.error("History Error:", text);
  return;
}
      const data = await response.json();
      if (data.history) {
        setHistories(data.history);
      }
    } catch (e) {
      console.error("Failed loading login logs:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl glass-panel-gold neon-glow-gold p-6 text-gray-100 flex flex-col gap-4">
        
        {/* Header decoration */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold tracking-tight text-amber-400">
              {tab === "login" && "Sign In Portal"}
              {tab === "register" && "Create Commander Account"}
              {tab === "forgot" && "Recover Account"}
              {tab === "otp" && "Verify OTP Authorization"}
              {tab === "reset" && "Secure Password Setup"}
            </span>
          </div>
          <button 
            id="auth_close_btn"
            onClick={onClose} 
            className="p-1 hover:text-amber-400 text-gray-400 transition-colors rounded-lg hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Status messages */}
        {error && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <span>{successMsg}</span>
          </div>
        )}

        {/* Verification OTP sandbox shortcut */}
        {otpDemoCode && (
          <div className="p-3 text-xs rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <p className="font-semibold">Developer Security Sandbox Code:</p>
            <p className="text-sm font-mono tracking-widest mt-1 bg-black/40 p-1 text-center rounded">
              {otpDemoCode}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">Copy-paste this directly to authenticate.</p>
          </div>
        )}

        {/* Tab Forms */}
        {tab === "login" && (
          <form id="auth_login_form" onSubmit={handleLogin} className="flex flex-col gap-3 py-1">
            
            {/* USER / ADMIN MODE SELECTOR TOGGLE */}
            <div className="flex bg-black/55 border border-white/10 rounded-xl p-1 gap-1 w-full mb-1">
              <button
                type="button"
                id="role_toggle_user"
                onClick={() => {
                  setRoleSelection("user");
                  setEmail("");
                  setPassword("");
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all duration-200 cursor-pointer ${
                  roleSelection === "user"
                    ? "bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-md font-extrabold"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                🖥️ User Portal
              </button>
              <button
                type="button"
                id="role_toggle_admin"
                onClick={() => {
                  setRoleSelection("admin");
                  setEmail("");
                  setPassword("");
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all duration-200 cursor-pointer ${
                  roleSelection === "admin"
                    ? "bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-md font-extrabold"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                ⚠️ Admin Portal
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label id="lbl_email" className="text-xs uppercase tracking-wider text-gray-400 font-medium">
                {roleSelection === "admin" ? "Admin Email" : "Email Account"}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  id="auth_login_email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={roleSelection === "admin" ? "admin@clash.com" : "name@clash.com"}
                  className="w-full pl-10 pr-3 py-2.5 bg-black/45 border border-white/10 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label id="lbl_password" className="text-xs uppercase tracking-wider text-gray-400 font-medium">
                  {roleSelection === "admin" ? "Admin Password" : "Security Key"}
                </label>
                {roleSelection !== "admin" && (
                  <button
                    type="button"
                    id="auth_forgot_tab_btn"
                    onClick={() => setTab("forgot")}
                    className="text-xs text-amber-400 hover:underline cursor-pointer"
                  >
                    Forgot Key?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="auth_login_password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-black/45 border border-white/10 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-500 hover:text-amber-400 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="auth_login_submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 text-black font-semibold text-sm transition-transform hover:scale-[1.01] active:scale-[0.99] hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {loading 
                ? (roleSelection === "admin" ? "Authenticating Authority..." : "Authenticating Master...") 
                : (roleSelection === "admin" ? "Authorize Admin Entrance" : "Authorize Entrance")}
            </button>

            {roleSelection !== "admin" && (
              <>
                {/* Google OAuth Button */}
                <button
                  type="button"
                  id="auth_google_login"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-2.5 mt-1 border border-white/10 rounded-lg bg-black/35 flex items-center justify-center gap-2 hover:bg-white/5 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <Globe className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-gray-200">Continue with Google Account</span>
                </button>

                <div className="text-xs text-center text-gray-400 mt-2">
                  No account registered yet?{" "}
                  <button 
                    type="button" 
                    id="auth_register_tab_btn"
                    onClick={() => setTab("register")} 
                    className="text-amber-400 font-semibold hover:underline cursor-pointer"
                  >
                    Enroll Free
                  </button>
                </div>
              </>
            )}
          </form>
        )}

        {tab === "register" && (
          <form id="auth_register_form" onSubmit={handleRegister} className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">Handle / Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  id="auth_reg_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="cyber_fighter"
                  className="w-full pl-10 pr-3 py-2.5 bg-black/45 border border-white/10 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  id="auth_reg_email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="fighter@clash.com"
                  className="w-full pl-10 pr-3 py-2.5 bg-black/45 border border-white/10 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wider text-gray-400 font-medium font-semibold">Security Key (Password)</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="auth_reg_password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-black/45 border border-white/10 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-500 hover:text-amber-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="auth_register_submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 text-black font-semibold text-sm transition-transform hover:scale-[1.01] hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Allocating Workspace..." : "Initialize Free Account"}
            </button>

            <div className="text-xs text-center text-gray-400 mt-2">
              Already possess access key?{" "}
              <button 
                type="button" 
                id="auth_login_tab_btn"
                onClick={() => setTab("login")} 
                className="text-amber-400 font-semibold hover:underline"
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {tab === "forgot" && (
          <form id="auth_forgot_form" onSubmit={handleResetRequest} className="flex flex-col gap-3 py-2">
            <p className="text-xs text-gray-400 leading-relaxed mb-1">
              Enter your email address below, and our credentials manager will log a secured 6-digit OTP verification key.
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">Registered Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  id="auth_forgot_email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="fighter@clash.com"
                  className="w-full pl-10 pr-3 py-2.5 bg-black/45 border border-white/10 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              id="auth_forgot_submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 rounded-lg bg-amber-400 text-black font-semibold text-sm transition-colors hover:bg-amber-500 disabled:opacity-50"
            >
              {loading ? "Generating Safe Token..." : "Dispatch Verification OTP"}
            </button>

            <button
              type="button"
              id="auth_back_to_login1"
              onClick={() => setTab("login")}
              className="text-xs text-center text-amber-500 hover:underline mt-2"
            >
              Back to Sign In
            </button>
          </form>
        )}

        {tab === "otp" && (
          <form id="auth_otp_form" onSubmit={handleVerifyOtp} className="flex flex-col gap-3 py-2">
            <p className="text-xs text-gray-400">
              Input the 6-digit credential OTP dispatched. Look at your server outputs if running locally!
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">6-Digit Secret Token</label>
              <input
                type="text"
                maxLength={6}
                id="auth_otp_input"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="102030"
                className="w-full text-center tracking-widest font-mono text-lg py-2.5 bg-black/45 border border-white/10 rounded-lg text-amber-400 focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            <button
              type="submit"
              id="auth_otp_submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 rounded-lg bg-amber-400 text-black font-semibold text-sm transition-colors hover:bg-amber-500 disabled:opacity-50"
            >
              {loading ? "Validating OTP Code..." : "Authorize Access Key"}
            </button>

            <button
              type="button"
              id="auth_back_to_login2"
              onClick={() => setTab("login")}
              className="text-xs text-center text-amber-500 hover:underline mt-2"
            >
              Restart Recovery
            </button>
          </form>
        )}

        {tab === "reset" && (
          <form id="auth_reset_form" onSubmit={handleResetPassword} className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">New Password</label>
              <input
                type="password"
                id="auth_reset_password_field"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Length must exceed 5"
                className="w-full pl-3 pr-3 py-2.5 bg-black/45 border border-white/10 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            <button
              type="submit"
              id="auth_reset_submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 rounded-lg bg-amber-400 text-black font-semibold text-sm transition-colors hover:bg-amber-500 disabled:opacity-50"
            >
              {loading ? "Hashing New Key..." : "Deploy New Security Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
