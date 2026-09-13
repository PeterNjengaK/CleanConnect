import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api";
import "../App.css";

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [resetPath, setResetPath] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setResetPath("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to request a password reset.");
      } else {
        setMessage(data.message);
        if (data.resetUrl) {
          const resetUrl = new URL(data.resetUrl);
          setResetPath(`${resetUrl.pathname}${resetUrl.search}`);
        }
      }
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
        <h1>Reset your password</h1>
        <p className="auth-subtitle">Enter the email address connected to your account.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          {message && <div className="auth-message">{message}</div>}
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Preparing Reset..." : "Send Reset Instructions"}
          </button>
        </form>

        {resetPath && (
          <button className="auth-secondary-action" type="button" onClick={() => navigate(resetPath)}>
            Continue to Reset Password
          </button>
        )}
        <p className="auth-switch">
          Remembered your password? <span onClick={() => navigate("/login")}>Log In</span>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
