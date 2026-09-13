import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api";
import CleanerNotifications from "../components/CleanerNotifications";
import "../App.css";

function CleanerReviews() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role;
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReviews = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reviews/cleaner/${user?.id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load reviews.");
      setReviews(data.reviews || []);
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!token || role !== "cleaner") {
      navigate("/login");
      return;
    }
    // oxlint-disable-next-line react/set-state-in-effect
    loadReviews();
  }, [loadReviews, navigate, role, token]);

  const summary = useMemo(() => {
    const average = reviews.length
      ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
      : 0;
    return {
      average,
      distribution: [5, 4, 3, 2, 1].map((rating) => ({
        rating,
        count: reviews.filter((review) => review.rating === rating).length
      }))
    };
  }, [reviews]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header"><div className="logo" onClick={() => navigate("/")} role="button" tabIndex="0">CleanConnect</div><div className="dashboard-header-actions"><CleanerNotifications token={token} /><span>{user?.firstName} {user?.lastName}</span><button className="btn-outline" onClick={logout}>Log Out</button></div></div>
      <div className="cleaner-dashboard-layout">
        <aside className="dashboard-sidebar">
          <p className="sidebar-title">CLEANER PORTAL</p>
          <button className="sidebar-link" onClick={() => navigate("/cleaner/dashboard")}>My Profile</button>
          <button className="sidebar-link" onClick={() => navigate("/cleaner/jobs")}>Available Jobs</button>
          <button className="sidebar-link" onClick={() => navigate("/cleaner/my-jobs")}>My Jobs</button>
          <button className="sidebar-link" onClick={() => navigate("/cleaner/messages")}>Messages</button>
          <button className="sidebar-link sidebar-link-active">Reviews</button>
        </aside>
        <main className="cleaner-main">
          <div className="cleaner-page-heading jobs-heading"><div><p className="dashboard-label">REPUTATION</p><h1>Customer reviews</h1><p>See what customers say about your completed work.</p></div><button className="btn-outline" onClick={loadReviews}>Refresh</button></div>
          {loading && <div className="jobs-state">Loading reviews...</div>}
          {error && <div className="jobs-state jobs-error">{error}</div>}
          {!loading && !error && <div className="reviews-dashboard-grid"><section className="review-summary-card"><strong>{summary.average ? summary.average.toFixed(1) : "New"}</strong><div className="review-summary-stars">{"★".repeat(Math.round(summary.average))}{"☆".repeat(5 - Math.round(summary.average))}</div><p>{reviews.length} customer review{reviews.length === 1 ? "" : "s"}</p>{summary.distribution.map((row) => <div className="rating-distribution" key={row.rating}><span>{row.rating} star</span><div><i style={{ width: reviews.length ? `${(row.count / reviews.length) * 100}%` : "0%" }} /></div><small>{row.count}</small></div>)}</section><section className="cleaner-reviews-list">{reviews.length === 0 && <div className="no-results"><h3>No reviews yet</h3><p>Reviews appear after customers complete and rate a job.</p></div>}{reviews.map((review) => <article className="cleaner-review-card" key={review._id}><div className="cleaner-review-top"><div><strong>{review.customer?.firstName} {review.customer?.lastName?.charAt(0)}.</strong><span>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></div><small>{new Date(review.createdAt).toLocaleDateString()}</small></div><h3>{review.job?.title || "Completed cleaning"}</h3><p>{review.comment || "Customer left a rating without a written comment."}</p></article>)}</section></div>}
        </main>
      </div>
    </div>
  );
}

export default CleanerReviews;
