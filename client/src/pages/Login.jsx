import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../App.css";
import { API_BASE_URL } from "../api";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(formData)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Login failed.");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.user.mustChangePassword) {
        navigate("/change-password");
      } else if (
        typeof location.state?.from === "string" &&
        ((data.user.role === "customer" && location.state.from.startsWith("/customer/")) ||
          (data.user.role === "cleaner" && location.state.from.startsWith("/cleaner/")))
      ) {
        navigate(location.state.from);
      } else if (data.user.role === "admin") {
        navigate("/admin/dashboard");
      } else if (data.user.role === "cleaner") {
        navigate("/cleaner/dashboard");
      } else {
        navigate("/customer/dashboard");
      }
    } catch {
      setMessage("Unable to connect to the server.");
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-container auth-container-small">
        <button className="auth-back-home" type="button" onClick={() => navigate("/")}>
          &larr; Back to Home
        </button>
        <div
          className="auth-logo"
          onClick={() => navigate("/")}
        >
          CleanConnect
        </div>

        <h1>Welcome back</h1>

        <p className="auth-subtitle">
          Log in to your CleanConnect account.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>

            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <button className="forgot-password-link" type="button" onClick={() => navigate("/forgot-password")}>
              Forgot password?
            </button>
          </div>

          {message && (
            <div className="auth-message auth-message-error">
              {message}
            </div>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Logging In..." : "Log In"}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{" "}
          <span onClick={() => navigate("/register")}>
            Sign Up
          </span>
        </p>
      </div>
    </div>
  );
}

export default Login;
