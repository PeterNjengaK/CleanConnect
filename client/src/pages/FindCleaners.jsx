import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../App.css";
import { API_BASE_URL } from "../api";

/* oxlint-disable react/set-state-in-effect, react-hooks/exhaustive-deps */

function FindCleaners() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [cleaners, setCleaners] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    city: searchParams.get("city") || "",
    state: searchParams.get("state") || "",
    service: searchParams.get("service") || ""
  });

  const services = [
    "",
    "House Cleaning",
    "Deep Cleaning",
    "Office Cleaning",
    "Move-In Cleaning",
    "Move-Out Cleaning",
    "Airbnb Cleaning",
    "Window Cleaning",
    "Carpet Cleaning"
  ];

  const loadCleaners = async (activeFilters = filters) => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (activeFilters.city) {
        params.append("city", activeFilters.city);
      }

      if (activeFilters.state) {
        params.append("state", activeFilters.state);
      }

      if (activeFilters.service) {
        params.append("service", activeFilters.service);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/cleaners/public?${params.toString()}`
      );

      const data = await response.json();

      if (response.ok) {
        setCleaners(data.cleaners || []);
      }
    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadCleaners({
      city: searchParams.get("city") || "",
      state: searchParams.get("state") || "",
      service: searchParams.get("service") || ""
    });
  }, []);

  const handleChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    navigate(`/find-cleaners${params.size ? `?${params.toString()}` : ""}`, { replace: true });
    loadCleaners();
  };

  return (
    <div className="find-cleaners-page">
      <nav className="navbar">
        <div
          className="logo"
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
        >
          CleanConnect
        </div>

        <div className="nav-buttons">
          <button
            className="btn-outline"
            onClick={() => navigate("/login")}
          >
            Log In
          </button>

          <button
            className="btn-primary"
            onClick={() => navigate("/register")}
          >
            Sign Up
          </button>
        </div>
      </nav>

      <section className="find-cleaners-hero">
        <div>
          <p className="dashboard-label">
            CLEANING PROFESSIONALS
          </p>

          <h1>Find trusted cleaners near you</h1>

          <p>
            Compare local cleaning professionals,
            services and prices.
          </p>
        </div>
      </section>

      <section className="cleaner-search-section">
        <form
          className="cleaner-search-form"
          onSubmit={handleSearch}
        >
          <input
            type="text"
            name="city"
            placeholder="City"
            value={filters.city}
            onChange={handleChange}
          />

          <input
            type="text"
            name="state"
            placeholder="State"
            value={filters.state}
            onChange={handleChange}
          />

          <select
            name="service"
            value={filters.service}
            onChange={handleChange}
          >
            {services.map((service) => (
              <option
                key={service || "all"}
                value={service}
              >
                {service || "All Services"}
              </option>
            ))}
          </select>

          <button type="submit">
            Search Cleaners
          </button>
        </form>
      </section>

      <section className="cleaners-results">
        <div className="results-heading">
          <div>
            <h2>Cleaning professionals</h2>

            <p>
              {loading
                ? "Loading cleaners..."
                : `${cleaners.length} cleaner${
                    cleaners.length === 1 ? "" : "s"
                  } found`}
            </p>
          </div>
        </div>

        {!loading && cleaners.length === 0 && (
          <div className="no-results">
            <h3>No cleaners found</h3>

            <p>
              Try another city, state or cleaning
              service.
            </p>
          </div>
        )}

        <div className="cleaners-grid">
          {cleaners.map((cleaner) => (
            <div
              className="public-cleaner-card"
              key={cleaner._id}
            >
              <div className="cleaner-card-top">
                <div className="cleaner-avatar">
                  {cleaner.businessName
                    ?.charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <h3>{cleaner.businessName}</h3>

                  <p>
                    {[cleaner.serviceCity, cleaner.serviceState]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              </div>

              <div className="cleaner-rating-row">
                <span className="rating">
                  ★★★★★
                </span>

                <span>
                  {cleaner.rating > 0
                    ? cleaner.rating.toFixed(1)
                    : "New"}
                </span>

                <span className="review-text">
                  ({cleaner.reviewCount || 0} reviews)
                </span>
              </div>

              <p className="cleaner-bio">
                {cleaner.bio ||
                  "Professional cleaning services available."}
              </p>

              <div className="cleaner-services-list">
                {cleaner.services
                  ?.slice(0, 4)
                  .map((service) => (
                    <span key={service}>
                      {service}
                    </span>
                  ))}
              </div>

              <div className="cleaner-card-details">
                <div>
                  <small>Experience</small>

                  <strong>
                    {cleaner.yearsExperience || 0} years
                  </strong>
                </div>

                <div>
                  <small>Starting Price</small>

                  <strong>
                    ${cleaner.startingPrice || 0}
                  </strong>
                </div>

                <div>
                  <small>Service Radius</small>

                  <strong>
                    {cleaner.serviceRadius || 0} miles
                  </strong>
                </div>
              </div>

              <button
                className="view-cleaner-btn"
                onClick={() => navigate(`/cleaners/${cleaner._id}`)}
              >
                View Profile
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default FindCleaners;
