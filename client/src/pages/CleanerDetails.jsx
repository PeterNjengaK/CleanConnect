import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../App.css";
import { API_BASE_URL } from "../api";

/* oxlint-disable react/immutability, react-hooks/exhaustive-deps */

function CleanerDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [cleaner, setCleaner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    loadCleaner();
  }, [id]);

  const loadCleaner = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/cleaners/public/${id}`
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Cleaner not found.");
        setLoading(false);
        return;
      }

      setCleaner(data.cleaner);

      const cleanerUserId = data.cleaner.user?._id;
      if (cleanerUserId) {
        const reviewsResponse = await fetch(
          `${API_BASE_URL}/api/reviews/cleaner/${cleanerUserId}`
        );
        const reviewsData = await reviewsResponse.json();
        if (reviewsResponse.ok) setReviews(reviewsData.reviews || []);
      }
    } catch {
      setError("Unable to connect to the server.");
    }

    setLoading(false);
  };

  const handleRequestCleaning = () => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    if (!token || !user) {
      navigate("/login");
      return;
    }

    if (user.role !== "customer") {
      alert("Only customer accounts can request cleaning services.");
      return;
    }

    navigate("/customer/post-job");
  };

  if (loading) {
    return (
      <div className="public-profile-loading">
        Loading cleaner profile...
      </div>
    );
  }

  if (error || !cleaner) {
    return (
      <div className="public-profile-loading">
        <h2>{error || "Cleaner not found."}</h2>

        <button
          className="btn-primary"
          onClick={() => navigate("/find-cleaners")}
        >
          Back to Cleaners
        </button>
      </div>
    );
  }

  return (
    <div className="public-profile-page">
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
            onClick={() => navigate("/find-cleaners")}
          >
            Find Cleaners
          </button>

          <button
            className="btn-primary"
            onClick={() => navigate("/login")}
          >
            Log In
          </button>
        </div>
      </nav>

      <main className="public-profile-wrapper">
        <button
          className="back-link"
          onClick={() => navigate("/find-cleaners")}
        >
          ← Back to cleaners
        </button>

        <section className="public-profile-header">
          <div className="public-profile-main-info">
            <div className="public-profile-avatar">
              {cleaner.businessName
                ?.charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <p className="dashboard-label">
                CLEANING PROFESSIONAL
              </p>

              <h1>{cleaner.businessName}</h1>

              <p className="public-profile-location">
                {[cleaner.serviceCity, cleaner.serviceState]
                  .filter(Boolean)
                  .join(", ")}
              </p>

              <div className="cleaner-rating-row">
                <span className="rating">
                  ★★★★★
                </span>

                <strong>
                  {cleaner.rating > 0
                    ? cleaner.rating.toFixed(1)
                    : "New"}
                </strong>

                <span className="review-text">
                  ({cleaner.reviewCount || 0} reviews)
                </span>
              </div>
            </div>
          </div>

          <div className="public-profile-booking-card">
            <small>Starting price</small>

            <div className="public-profile-price">
              ${cleaner.startingPrice || 0}
            </div>

            <p>
              {cleaner.pricingType === "hourly"
                ? "per hour"
                : cleaner.pricingType === "flat"
                ? "flat rate"
                : "starting at"}
            </p>

            <button
              onClick={handleRequestCleaning}
            >
              Request Cleaning
            </button>
          </div>
        </section>

        <section className="public-profile-grid">
          <div className="public-profile-left">
            <div className="profile-info-card">
              <h2>About</h2>

              <p>
                {cleaner.bio ||
                  "Professional cleaning services available."}
              </p>
            </div>

            <div className="profile-info-card">
              <h2>Services</h2>

              <div className="public-services-grid">
                {cleaner.services?.map((service) => (
                  <div
                    className="public-service-item"
                    key={service}
                  >
                    ✓ {service}
                  </div>
                ))}
              </div>
            </div>

            <div className="profile-info-card">
              <h2>Availability</h2>

              <div className="availability-list">
                {cleaner.availableDays?.length > 0 ? (
                  cleaner.availableDays.map((day) => (
                    <span key={day}>
                      {day}
                    </span>
                  ))
                ) : (
                  <p>No availability listed.</p>
                )}
              </div>
            </div>

            <div className="profile-info-card">
              <h2>Reviews</h2>

              {reviews.length > 0 ? (
                <div className="public-reviews-list">
                  {reviews.map((review) => (
                    <article className="public-review" key={review._id}>
                      <div className="public-review-heading">
                        <strong>{review.customer?.firstName} {review.customer?.lastName?.charAt(0)}.</strong>
                        <span>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                      </div>
                      <p>{review.comment || "Customer left a rating without a written review."}</p>
                      <small>{new Date(review.createdAt).toLocaleDateString()}</small>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-reviews">
                  <strong>No reviews yet</strong>

                  <p>
                    This cleaner is new to CleanConnect.
                  </p>
                </div>
              )}
            </div>
          </div>

          <aside className="public-profile-right">
            <div className="profile-info-card">
              <h3>Quick Details</h3>

              <div className="quick-detail">
                <span>Experience</span>
                <strong>
                  {cleaner.yearsExperience || 0} years
                </strong>
              </div>

              <div className="quick-detail">
                <span>Service Radius</span>
                <strong>
                  {cleaner.serviceRadius || 0} miles
                </strong>
              </div>

              <div className="quick-detail">
                <span>Completed Jobs</span>
                <strong>
                  {cleaner.completedJobs || 0}
                </strong>
              </div>

              <div className="quick-detail">
                <span>Location</span>
                <strong>
                  {cleaner.serviceCity},{" "}
                  {cleaner.serviceState || "Not specified"}
                </strong>
              </div>
            </div>

            <div className="trust-card">
              <h3>CleanConnect Profile</h3>

              <p>
                Compare services, pricing, availability
                and customer feedback before booking.
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default CleanerDetails;
