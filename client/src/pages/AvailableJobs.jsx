import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import { API_BASE_URL } from "../api";
import CleanerNotifications from "../components/CleanerNotifications";

function AvailableJobs() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));
  const userRole = user?.role;
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [offer, setOffer] = useState({ amount: "", estimatedHours: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [offerMessage, setOfferMessage] = useState("");

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs/available`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load jobs.");
      setJobs(data.jobs || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token || !userRole) {
      navigate("/login");
      return;
    }
    if (userRole !== "cleaner") {
      navigate("/customer/dashboard");
      return;
    }
    // Loading remote data is the synchronization this effect is responsible for.
    // oxlint-disable-next-line react/set-state-in-effect
    loadJobs();
  }, [loadJobs, navigate, token, userRole]);

  const openOfferForm = (job) => {
    setSelectedJob(job);
    setOffer({ amount: "", estimatedHours: "", message: "" });
    setOfferMessage("");
  };

  const submitOffer = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setOfferMessage("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/jobs/${selectedJob._id}/offers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: Number(offer.amount),
            estimatedHours: offer.estimatedHours
              ? Number(offer.estimatedHours)
              : undefined,
            message: offer.message
          })
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to submit offer.");

      setJobs((currentJobs) =>
        currentJobs.map((job) =>
          job._id === selectedJob._id ? { ...job, myOffer: data.offer } : job
        )
      );
      setSelectedJob((currentJob) => ({ ...currentJob, myOffer: data.offer }));
      setOfferMessage(data.message);
    } catch (requestError) {
      setOfferMessage(requestError.message || "Unable to connect to the server.");
    } finally {
      setSubmitting(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="logo" onClick={() => navigate("/")} role="button" tabIndex="0">
          CleanConnect
        </div>
        <div className="dashboard-header-actions">
          <CleanerNotifications token={token} />
          <span>{user?.firstName} {user?.lastName}</span>
          <button className="btn-outline" onClick={logout}>Log Out</button>
        </div>
      </div>

      <div className="cleaner-dashboard-layout">
        <aside className="dashboard-sidebar">
          <p className="sidebar-title">CLEANER PORTAL</p>
          <button className="sidebar-link" onClick={() => navigate("/cleaner/dashboard")}>
            My Profile
          </button>
          <button className="sidebar-link sidebar-link-active">Available Jobs</button>
          <button className="sidebar-link" onClick={() => navigate("/cleaner/my-jobs")}>My Jobs</button>
          <button className="sidebar-link" onClick={() => navigate("/cleaner/messages")}>Messages</button>
          <button className="sidebar-link" onClick={() => navigate("/cleaner/reviews")}>Reviews</button>
        </aside>

        <main className="cleaner-main">
          <div className="cleaner-page-heading jobs-heading">
            <div>
              <p className="dashboard-label">JOB MARKETPLACE</p>
              <h1>Available cleaning jobs</h1>
              <p>Review open requests and send customers your best offer.</p>
            </div>
            <button className="btn-outline" onClick={loadJobs}>Refresh</button>
          </div>

          {loading && <div className="jobs-state">Loading available jobs...</div>}
          {!loading && error && <div className="jobs-state jobs-error">{error}</div>}
          {!loading && !error && jobs.length === 0 && (
            <div className="no-results">
              <h3>No open jobs right now</h3>
              <p>New customer requests will appear here as soon as they are posted.</p>
            </div>
          )}

          <div className="available-jobs-grid">
            {jobs.map((job) => (
              <article className="available-job-card" key={job._id}>
                <div className="job-card-header">
                  <span className="job-service-pill">{job.serviceType}</span>
                  <small>Posted {new Date(job.createdAt).toLocaleDateString()}</small>
                </div>
                <h2>{job.title}</h2>
                <p className="job-description">{job.description}</p>
                <div className="available-job-details">
                  <span><strong>Location</strong>{job.city}, {job.state}</span>
                  <span><strong>Date</strong>{new Date(job.serviceDate).toLocaleDateString()}</span>
                  <span><strong>Property</strong>{job.propertyType}</span>
                  <span><strong>Budget</strong>${job.budgetMin}–${job.budgetMax}</span>
                </div>
                {job.myOffer ? (
                  <div className="offer-sent-badge">
                    Offer sent: ${job.myOffer.amount} · {job.myOffer.status}
                  </div>
                ) : (
                  <button className="send-offer-btn" onClick={() => openOfferForm(job)}>
                    Send Offer
                  </button>
                )}
              </article>
            ))}
          </div>
        </main>
      </div>

      {selectedJob && (
        <div className="offer-modal-backdrop" onMouseDown={() => setSelectedJob(null)}>
          <div className="offer-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="offer-modal-close" onClick={() => setSelectedJob(null)} aria-label="Close">
              ×
            </button>
            <p className="dashboard-label">SEND AN OFFER</p>
            <h2>{selectedJob.title}</h2>
            <p className="offer-modal-summary">
              Customer budget: ${selectedJob.budgetMin}–${selectedJob.budgetMax}
            </p>
            <form onSubmit={submitOffer}>
              <div className="form-row">
                <div className="form-group">
                  <label>Your price ($)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={offer.amount}
                    onChange={(event) => setOffer({ ...offer, amount: event.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Estimated hours</label>
                  <input
                    type="number"
                    min="0.5"
                    max="72"
                    step="0.5"
                    value={offer.estimatedHours}
                    onChange={(event) => setOffer({ ...offer, estimatedHours: event.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Message to the customer</label>
                <textarea
                  rows="5"
                  maxLength="1000"
                  placeholder="Introduce yourself and explain what is included in your offer."
                  value={offer.message}
                  onChange={(event) => setOffer({ ...offer, message: event.target.value })}
                />
              </div>
              {offerMessage && <div className="profile-message">{offerMessage}</div>}
              {!selectedJob.myOffer && (
                <button className="send-offer-btn" type="submit" disabled={submitting}>
                  {submitting ? "Sending..." : "Submit Offer"}
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AvailableJobs;
