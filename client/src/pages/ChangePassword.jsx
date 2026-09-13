import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api";
import "../App.css";

function ChangePassword() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token || !user) {
    navigate("/login");
    return null;
  }

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    if (form.newPassword !== form.confirmPassword) {
      setMessage("New passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to change password.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login", { state: { passwordChanged: true } });
    } catch (error) {
      setMessage(error.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container auth-container-small">
        <div className="auth-logo">CleanConnect</div>
        <p className="dashboard-label">SECURITY REQUIRED</p>
        <h1>Choose a new password</h1>
        <p className="auth-subtitle">The temporary password can only be used to reach this page.</p>
        <form className="auth-form" onSubmit={submit}>
          <div className="form-group"><label>Temporary or current password</label><input type="password" autoComplete="current-password" required value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} /></div>
          <div className="form-group"><label>New password</label><input type="password" autoComplete="new-password" minLength="12" required value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} /><small className="password-help">At least 12 characters with uppercase, lowercase, number, and symbol.</small></div>
          <div className="form-group"><label>Confirm new password</label><input type="password" autoComplete="new-password" minLength="12" required value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} /></div>
          {message && <div className="auth-message auth-message-error">{message}</div>}
          <button className="auth-submit" disabled={loading}>{loading ? "Changing Password..." : "Change Password"}</button>
        </form>
      </div>
    </div>
  );
}

export default ChangePassword;
