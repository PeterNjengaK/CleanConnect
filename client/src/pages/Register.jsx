import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../App.css";
import { API_BASE_URL } from "../api";

function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRole = searchParams.get("role");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    role: requestedRole === "cleaner" ? "cleaner" : "customer",
    city: "",
    state: ""
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const selectRole = (role) => {
    setFormData({
      ...formData,
      role
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/register`,
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
        setMessage(data.message || "Registration failed.");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setMessage("Account created successfully!");

      setTimeout(() => {
        navigate("/");
      }, 1200);
    } catch {
      setMessage("Unable to connect to the server.");
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <button className="auth-back-home" type="button" onClick={() => navigate("/")}>
          &larr; Back to Home
        </button>
        <div
          className="auth-logo"
          onClick={() => navigate("/")}
        >
          CleanConnect
        </div>

        <h1>Create your account</h1>

        <p className="auth-subtitle">
          Join CleanConnect and start connecting today.
        </p>

        <div className="role-selection">
          <button
            type="button"
            className={
              formData.role === "customer"
                ? "role-card role-card-active"
                : "role-card"
            }
            onClick={() => selectRole("customer")}
          >
            <div className="role-icon">🏠</div>
            <strong>I need cleaning services</strong>
            <span>
              Find trusted cleaners and post cleaning jobs.
            </span>
          </button>

          <button
            type="button"
            className={
              formData.role === "cleaner"
                ? "role-card role-card-active"
                : "role-card"
            }
            onClick={() => selectRole("cleaner")}
          >
            <div className="role-icon">🧹</div>
            <strong>I offer cleaning services</strong>
            <span>
              Find customers and grow your cleaning business.
            </span>
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

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
            <label>Phone Number</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="7075551234"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="CA"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              minLength="6"
              required
            />
          </div>

          {message && (
            <div className="auth-message">
              {message}
            </div>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <span onClick={() => navigate("/login")}>
            Log In
          </span>
        </p>
      </div>
    </div>
  );
}

export default Register;
