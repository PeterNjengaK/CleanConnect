import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import { API_BASE_URL } from "../api";

function PostJob() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  const [formData, setFormData] = useState({
    title: "",
    serviceType: "House Cleaning",
    description: "",
    city: "",
    state: "",
    address: "",
    serviceDate: "",
    preferredTime: "",
    budgetMin: "",
    budgetMax: "",
    propertyType: "House",
    bedrooms: "",
    bathrooms: ""
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token || !user) {
    navigate("/login");
    return null;
  }

  if (user.role !== "customer") {
    navigate("/cleaner/dashboard");
    return null;
  }

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
        `${API_BASE_URL}/api/jobs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            ...formData,
            budgetMin: Number(formData.budgetMin),
            budgetMax: Number(formData.budgetMax),
            bedrooms: Number(formData.bedrooms) || 0,
            bathrooms: Number(formData.bathrooms) || 0
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Unable to post job."
        );
        setLoading(false);
        return;
      }

      setMessage("Cleaning job posted successfully!");

      setTimeout(() => {
        navigate("/customer/dashboard");
      }, 1000);
    } catch {
      setMessage("Unable to connect to the server.");
    }

    setLoading(false);
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div
          className="logo"
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
        >
          CleanConnect
        </div>

        <button
          className="btn-outline"
          onClick={() => navigate("/customer/dashboard")}
        >
          Back to Dashboard
        </button>
      </div>

      <main className="post-job-wrapper">
        <div className="post-job-heading">
          <p className="dashboard-label">
            POST A CLEANING JOB
          </p>

          <h1>Tell cleaners what you need</h1>

          <p>
            Provide the job details and qualified cleaners
            will later be able to send you offers.
          </p>
        </div>

        <form
          className="post-job-form"
          onSubmit={handleSubmit}
        >
          <div className="profile-section">
            <h2>Job Details</h2>

            <div className="form-group">
              <label>Job Title</label>

              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Deep cleaning for 3-bedroom house"
                required
              />
            </div>

            <div className="form-group">
              <label>Cleaning Service</label>

              <select
                name="serviceType"
                value={formData.serviceType}
                onChange={handleChange}
              >
                <option>House Cleaning</option>
                <option>Deep Cleaning</option>
                <option>Office Cleaning</option>
                <option>Move-In Cleaning</option>
                <option>Move-Out Cleaning</option>
                <option>Airbnb Cleaning</option>
                <option>Window Cleaning</option>
                <option>Carpet Cleaning</option>
              </select>
            </div>

            <div className="form-group">
              <label>Description</label>

              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="6"
                placeholder="Describe what needs to be cleaned..."
                required
              />
            </div>
          </div>

          <div className="profile-section">
            <h2>Property</h2>

            <div className="form-row">
              <div className="form-group">
                <label>Property Type</label>

                <select
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleChange}
                >
                  <option>House</option>
                  <option>Apartment</option>
                  <option>Office</option>
                  <option>Airbnb</option>
                  <option>Commercial</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Bedrooms</label>

                <input
                  type="number"
                  name="bedrooms"
                  min="0"
                  value={formData.bedrooms}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Bathrooms</label>

              <input
                type="number"
                name="bathrooms"
                min="0"
                value={formData.bathrooms}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="profile-section">
            <h2>Location</h2>

            <div className="form-group">
              <label>Address</label>

              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Street address"
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
                  required
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
                  required
                />
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h2>Date and Time</h2>

            <div className="form-row">
              <div className="form-group">
                <label>Service Date</label>

                <input
                  type="date"
                  name="serviceDate"
                  value={formData.serviceDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Preferred Time</label>

                <input
                  type="time"
                  name="preferredTime"
                  value={formData.preferredTime}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h2>Budget</h2>

            <div className="form-row">
              <div className="form-group">
                <label>Minimum Budget ($)</label>

                <input
                  type="number"
                  name="budgetMin"
                  min="0"
                  value={formData.budgetMin}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Maximum Budget ($)</label>

                <input
                  type="number"
                  name="budgetMax"
                  min="0"
                  value={formData.budgetMax}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          {message && (
            <div className="profile-message">
              {message}
            </div>
          )}

          <button
            className="save-profile-btn"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Posting Job..."
              : "Post Cleaning Job"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default PostJob;
