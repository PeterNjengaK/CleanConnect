import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../api";
import "../App.css";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword })
      });
      const data = await response.json();
      setMessage(data.message || "Unable to reset password.");
      setSuccess(response.ok);
    } catch {
      setMessage("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container auth-container-small">
        <button className="auth-back-home" type="button" onClick={() => navigate("/")}>
          &larr; Back to Home
        </button>
        <div className="auth-logo" onClick={() => navigate("/")}>CleanConnect</div>
        <h1>Choose a new password</h1>
        <p className="auth-subtitle">Use at least 12 characters with uppercase, lowercase, a number, and a symbol.</p>

        {!token || !email ? (
          <div className="auth-message auth-message-error">This reset link is incomplete or invalid.</div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength="12" required />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength="12" required />
            </div>
            {message && <div className={`auth-message${success ? "" : " auth-message-error"}`}>{message}</div>}
            {!success && (
              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? "Resetting Password..." : "Reset Password"}
              </button>
            )}
          </form>
        )}

        {success && <button className="auth-submit" type="button" onClick={() => navigate("/login")}>Continue to Log In</button>}
        <p className="auth-switch"><span onClick={() => navigate("/forgot-password")}>Request a new reset link</span></p>
      </div>
    </div>
  );
}

export default ResetPassword;
