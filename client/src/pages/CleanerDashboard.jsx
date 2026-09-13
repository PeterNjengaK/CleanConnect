import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import { API_BASE_URL } from "../api";
import CleanerNotifications from "../components/CleanerNotifications";
import PayoutSetup from "../components/PayoutSetup";

/* oxlint-disable react/immutability, react-hooks/exhaustive-deps */

function CleanerDashboard() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  const serviceOptions = [
    "House Cleaning",
    "Deep Cleaning",
    "Office Cleaning",
    "Move-In Cleaning",
    "Move-Out Cleaning",
    "Airbnb Cleaning",
    "Window Cleaning",
    "Carpet Cleaning"
  ];

  const dayOptions = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
  ];

  const [formData, setFormData] = useState({
    businessName: "",
    bio: "",
    yearsExperience: "",
    services: [],
    startingPrice: "",
    pricingType: "starting-at",
    serviceCity: "",
    serviceState: "",
    serviceRadius: 25,
    availableDays: []
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileExists, setProfileExists] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      navigate("/login");
      return;
    }

    if (user.role !== "cleaner") {
      navigate("/customer/dashboard");
      return;
    }

    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/cleaners/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.status === 404) {
        return;
      }

      const data = await response.json();

      if (response.ok && data.profile) {
        setProfileExists(true);

        setFormData({
          businessName: data.profile.businessName || "",
          bio: data.profile.bio || "",
          yearsExperience:
            data.profile.yearsExperience ?? "",
          services: data.profile.services || [],
          startingPrice:
            data.profile.startingPrice ?? "",
          pricingType:
            data.profile.pricingType || "starting-at",
          serviceCity:
            data.profile.serviceCity || "",
          serviceState:
            data.profile.serviceState || "",
          serviceRadius:
            data.profile.serviceRadius || 25,
          availableDays:
            data.profile.availableDays || []
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const toggleService = (service) => {
    const alreadySelected =
      formData.services.includes(service);

    if (alreadySelected) {
      setFormData({
        ...formData,
        services: formData.services.filter(
          (item) => item !== service
        )
      });
    } else {
      setFormData({
        ...formData,
        services: [...formData.services, service]
      });
    }
  };

  const toggleDay = (day) => {
    const alreadySelected =
      formData.availableDays.includes(day);

    if (alreadySelected) {
      setFormData({
        ...formData,
        availableDays: formData.availableDays.filter(
          (item) => item !== day
        )
      });
    } else {
      setFormData({
        ...formData,
        availableDays: [
          ...formData.availableDays,
          day
        ]
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/cleaners/profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            ...formData,
            yearsExperience:
              Number(formData.yearsExperience) || 0,
            startingPrice:
              Number(formData.startingPrice) || 0,
            serviceRadius:
              Number(formData.serviceRadius) || 25
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Unable to save profile."
        );
        setLoading(false);
        return;
      }

      setProfileExists(true);
      setMessage("Profile saved successfully!");
    } catch {
      setMessage("Unable to connect to the server.");
    }

    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
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

        <div className="dashboard-header-actions">
          <CleanerNotifications token={token} />
          <span>
            {user?.firstName} {user?.lastName}
          </span>

          <button
            className="btn-outline"
            onClick={logout}
          >
            Log Out
          </button>
        </div>
      </div>

      <div className="cleaner-dashboard-layout">

        <aside className="dashboard-sidebar">
          <p className="sidebar-title">
            CLEANER PORTAL
          </p>

          <button className="sidebar-link sidebar-link-active">
            My Profile
          </button>

          <button
            className="sidebar-link"
            onClick={() => navigate("/cleaner/jobs")}
          >
            Available Jobs
          </button>

          <button
            className="sidebar-link"
            onClick={() => navigate("/cleaner/my-jobs")}
          >
            My Jobs
          </button>

          <button
            className="sidebar-link"
            onClick={() => navigate("/cleaner/messages")}
          >
            Messages
          </button>

          <button
            className="sidebar-link"
            onClick={() => navigate("/cleaner/reviews")}
          >
            Reviews
          </button>
        </aside>

        <main className="cleaner-main">

          <PayoutSetup token={token} />

          <div className="cleaner-page-heading">
            <div>
              <p className="dashboard-label">
                CLEANER PROFILE
              </p>

              <h1>
                {profileExists
                  ? "Manage your business profile"
                  : "Create your cleaning profile"}
              </h1>

              <p>
                Customers will use this information
                to decide whether to hire you.
              </p>
            </div>

            <div className="profile-status">
              {profileExists
                ? "Profile Created"
                : "Profile Not Created"}
            </div>
          </div>

          <form
            className="cleaner-profile-form"
            onSubmit={handleSubmit}
          >

            <div className="profile-section">
              <h2>Business Information</h2>

              <div className="form-group">
                <label>Business Name</label>

                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  placeholder="Maria's Cleaning Services"
                  required
                />
              </div>

              <div className="form-group">
                <label>About Your Business</label>

                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Tell customers about your cleaning experience and what makes your service special."
                  rows="5"
                />
              </div>

              <div className="form-group">
                <label>Years of Experience</label>

                <input
                  type="number"
                  name="yearsExperience"
                  value={formData.yearsExperience}
                  onChange={handleChange}
                  min="0"
                  placeholder="5"
                />
              </div>
            </div>

            <div className="profile-section">
              <h2>Services Offered</h2>

              <p className="section-helper">
                Select every service you provide.
              </p>

              <div className="selection-grid">
                {serviceOptions.map((service) => (
                  <button
                    key={service}
                    type="button"
                    className={
                      formData.services.includes(service)
                        ? "selection-chip selected"
                        : "selection-chip"
                    }
                    onClick={() =>
                      toggleService(service)
                    }
                  >
                    {service}
                  </button>
                ))}
              </div>
            </div>

            <div className="profile-section">
              <h2>Pricing</h2>

              <div className="form-row">
                <div className="form-group">
                  <label>Starting Price ($)</label>

                  <input
                    type="number"
                    name="startingPrice"
                    value={formData.startingPrice}
                    onChange={handleChange}
                    min="0"
                    placeholder="120"
                  />
                </div>

                <div className="form-group">
                  <label>Pricing Type</label>

                  <select
                    name="pricingType"
                    value={formData.pricingType}
                    onChange={handleChange}
                  >
                    <option value="starting-at">
                      Starting At
                    </option>

                    <option value="hourly">
                      Per Hour
                    </option>

                    <option value="flat">
                      Flat Rate
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <div className="profile-section">
              <h2>Service Area</h2>

              <div className="form-row">
                <div className="form-group">
                  <label>City</label>

                  <input
                    type="text"
                    name="serviceCity"
                    value={formData.serviceCity}
                    onChange={handleChange}
                    placeholder="Santa Rosa"
                  />
                </div>

                <div className="form-group">
                  <label>State</label>

                  <input
                    type="text"
                    name="serviceState"
                    value={formData.serviceState}
                    onChange={handleChange}
                    placeholder="CA"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Service Radius (miles)</label>

                <input
                  type="number"
                  name="serviceRadius"
                  value={formData.serviceRadius}
                  onChange={handleChange}
                  min="1"
                />
              </div>
            </div>

            <div className="profile-section">
              <h2>Availability</h2>

              <p className="section-helper">
                Select the days you normally accept jobs.
              </p>

              <div className="selection-grid days-grid">
                {dayOptions.map((day) => (
                  <button
                    key={day}
                    type="button"
                    className={
                      formData.availableDays.includes(day)
                        ? "selection-chip selected"
                        : "selection-chip"
                    }
                    onClick={() => toggleDay(day)}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {message && (
              <div className="profile-message">
                {message}
              </div>
            )}

            <button
              type="submit"
              className="save-profile-btn"
              disabled={loading}
            >
              {loading
                ? "Saving..."
                : profileExists
                ? "Update Profile"
                : "Create Profile"}
            </button>

          </form>
        </main>
      </div>
    </div>
  );
}

export default CleanerDashboard;
