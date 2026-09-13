import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../App.css";
import JobMessages from "../components/JobMessages";
import ReviewModal from "../components/ReviewModal";
import { API_BASE_URL } from "../api";
import ReportModal from "../components/ReportModal";
import CleanerNotifications from "../components/CleanerNotifications";

/* oxlint-disable react/immutability, react-hooks/exhaustive-deps */

function CustomerDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetedMessageJobId = searchParams.get("messageJob");
  const paymentResult = searchParams.get("payment");

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewJob, setReviewJob] = useState(null);
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offerMessage, setOfferMessage] = useState("");
  const [acceptingOfferId, setAcceptingOfferId] = useState("");
  const [messageJob, setMessageJob] = useState(null);
  const [reviewJobToRate, setReviewJobToRate] = useState(null);
  const [reportJob, setReportJob] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState(
    paymentResult === "success"
      ? "Payment submitted securely. Confirmation may take a moment."
      : paymentResult === "cancelled" ? "Checkout was cancelled. You were not charged." : ""
  );
  const [payingJobId, setPayingJobId] = useState("");

  useEffect(() => {
    if (!token || !user) {
      navigate("/login");
      return;
    }

    if (user.role !== "customer") {
      navigate("/cleaner/dashboard");
      return;
    }

    loadJobs();
  }, []);

  useEffect(() => {
    if (!targetedMessageJobId || jobs.length === 0) return;
    const selected = jobs.find((job) => job._id === targetedMessageJobId);
    // oxlint-disable-next-line react/set-state-in-effect
    if (selected) setMessageJob(selected);
    navigate("/customer/dashboard", { replace: true });
  }, [jobs, navigate, targetedMessageJobId]);

  const loadJobs = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/jobs/mine`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (response.ok) {
        const loadedJobs = data.jobs || [];
        setJobs(loadedJobs);
      }
    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  };

  const loadOffers = async (job) => {
    setReviewJob(job);
    setOffers([]);
    setOfferMessage("");
    setOffersLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/jobs/${job._id}/offers`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await response.json();

      if (!response.ok) {
        setOfferMessage(data.message || "Unable to load offers.");
      } else {
        setOffers(data.offers || []);
      }
    } catch (error) {
      console.error(error);
      setOfferMessage("Unable to connect to the server.");
    } finally {
      setOffersLoading(false);
    }
  };

  const acceptOffer = async (offerId) => {
    setAcceptingOfferId(offerId);
    setOfferMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/jobs/${reviewJob._id}/offers/${offerId}/accept`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await response.json();

      if (!response.ok) {
        setOfferMessage(data.message || "Unable to accept this offer.");
        return;
      }

      setJobs((currentJobs) =>
        currentJobs.map((job) =>
          job._id === reviewJob._id ? { ...job, ...data.job } : job
        )
      );
      setReviewJob((currentJob) => ({ ...currentJob, ...data.job }));
      setOffers((currentOffers) =>
        currentOffers.map((offer) => ({
          ...offer,
          status: offer._id === offerId ? "accepted" : "declined"
        }))
      );
      setOfferMessage(data.message);
    } catch (error) {
      console.error(error);
      setOfferMessage("Unable to connect to the server.");
    } finally {
      setAcceptingOfferId("");
    }
  };

  const cancelJob = async (job) => {
    if (!window.confirm(`Cancel "${job.title}"? Cleaners will no longer be able to bid.`)) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs/${job._id}/cancel`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to cancel job.");
      setJobs((current) => current.map((item) => (item._id === job._id ? { ...item, ...data.job } : item)));
    } catch (error) {
      window.alert(error.message || "Unable to connect to the server.");
    }
  };

  const payForJob = async (job) => {
    setPayingJobId(job._id);
    setPaymentMessage("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/jobs/${job._id}/checkout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to begin checkout.");
      window.location.assign(data.url);
    } catch (error) {
      setPaymentMessage(error.message);
      setPayingJobId("");
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

      <main className="customer-dashboard-main">
        {paymentMessage && <div className="payment-dashboard-notice">{paymentMessage}</div>}
        <div className="customer-dashboard-heading">
          <div>
            <p className="dashboard-label">
              CUSTOMER DASHBOARD
            </p>

            <h1>
              Welcome, {user?.firstName} 👋
            </h1>

            <p>
              Find cleaners and manage your cleaning requests.
            </p>
          </div>

          <button
            className="btn-primary"
            onClick={() =>
              navigate("/customer/post-job")
            }
          >
            + Post Cleaning Job
          </button>
        </div>

        <div className="customer-actions-grid">
          <button
            onClick={() =>
              navigate("/find-cleaners")
            }
          >
            <span>🔎</span>
            <strong>Find Cleaners</strong>
            <small>
              Browse local cleaning professionals
            </small>
          </button>

          <button
            onClick={() =>
              navigate("/customer/post-job")
            }
          >
            <span>🧹</span>
            <strong>Post a Job</strong>
            <small>
              Let cleaners know what you need
            </small>
          </button>
        </div>

        <section className="customer-jobs-section">
          <div className="results-heading">
            <div>
              <h2>My Cleaning Jobs</h2>

              <p>
                {loading
                  ? "Loading..."
                  : `${jobs.length} job${
                      jobs.length === 1 ? "" : "s"
                    } posted`}
              </p>
            </div>
          </div>

          {!loading && jobs.length === 0 && (
            <div className="no-results">
              <h3>No cleaning jobs yet</h3>

              <p>
                Post your first cleaning job and
                start receiving offers from cleaners.
              </p>

              <button
                className="btn-primary"
                onClick={() =>
                  navigate("/customer/post-job")
                }
              >
                Post Your First Job
              </button>
            </div>
          )}

          <div className="customer-jobs-grid">
            {jobs.map((job) => (
              <div
                className="customer-job-card"
                key={job._id}
              >
                <div className="job-card-header">
                  <span className={`job-status ${job.status}`}>
                    {job.status}
                  </span>

                  <small>
                    {new Date(
                      job.createdAt
                    ).toLocaleDateString()}
                  </small>
                </div>

                <h3>{job.title}</h3>

                <p className="job-service">
                  {job.serviceType}
                </p>

                <div className="job-card-info">
                  <span>
                    📍 {job.city}, {job.state}
                  </span>

                  <span>
                    📅{" "}
                    {new Date(
                      job.serviceDate
                    ).toLocaleDateString()}
                  </span>

                  <span>
                    💰 ${job.budgetMin} - $
                    {job.budgetMax}
                  </span>
                </div>

                <p className="job-description">
                  {job.description}
                </p>

                {job.agreedAmount && (
                  <div className={`job-payment-summary ${job.paymentStatus}`}>
                    <span>Agreed price</span>
                    <strong>${job.agreedAmount.toFixed(2)}</strong>
                    <small>{job.paymentStatus === "paid" ? "Paid securely" : job.paymentStatus === "not-required" ? "Payments not enabled for this booking" : job.paymentStatus}</small>
                  </div>
                )}

                {["unpaid", "pending", "failed"].includes(job.paymentStatus) && (
                  <button className="pay-job-btn" onClick={() => payForJob(job)} disabled={payingJobId === job._id}>
                    {payingJobId === job._id ? "Opening Secure Checkout..." : `Pay $${job.agreedAmount?.toFixed(2)}`}
                  </button>
                )}

                <button
                  className="view-offers-btn"
                  onClick={() => loadOffers(job)}
                >
                  {job.status === "open" ? "View Offers" : "View Hiring Details"}
                </button>
                {["assigned", "in-progress", "completed"].includes(job.status) && (
                  <button className="message-cleaner-btn" onClick={() => setMessageJob(job)}>
                    Message Cleaner
                  </button>
                )}
                {["assigned", "in-progress", "completed"].includes(job.status) && (
                  <button className="report-job-action customer-report-action" onClick={() => setReportJob(job)}>
                    Report a Problem
                  </button>
                )}
                {job.status === "completed" && !job.review && (
                  <button className="leave-review-btn" onClick={() => setReviewJobToRate(job)}>
                    Leave a Review
                  </button>
                )}
                {job.review && (
                  <div className="review-submitted">Your rating: {job.review.rating}/5</div>
                )}
                {job.status === "open" && (
                  <button className="cancel-job-btn" onClick={() => cancelJob(job)}>
                    Cancel Job
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      {reviewJob && (
        <div className="offer-modal-backdrop" onMouseDown={() => setReviewJob(null)}>
          <div className="offer-modal customer-offers-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="offer-modal-close" onClick={() => setReviewJob(null)} aria-label="Close">
              ×
            </button>
            <p className="dashboard-label">CLEANER OFFERS</p>
            <h2>{reviewJob.title}</h2>
            <p className="offer-modal-summary">
              Compare price, timing, and the cleaner's message before hiring.
            </p>

            {offersLoading && <div className="jobs-state">Loading offers...</div>}
            {!offersLoading && offers.length === 0 && !offerMessage && (
              <div className="offers-empty">
                <strong>No offers yet</strong>
                <p>Cleaners will appear here after responding to your job.</p>
              </div>
            )}

            <div className="customer-offers-list">
              {offers.map((offer) => (
                <article className={`customer-offer-card ${offer.status}`} key={offer._id}>
                  <div className="customer-offer-heading">
                    <div>
                      <h3>{offer.cleaner?.firstName} {offer.cleaner?.lastName}</h3>
                      <small>{offer.cleaner?.city || reviewJob.city}, {offer.cleaner?.state || reviewJob.state}</small>
                    </div>
                    <strong>${offer.amount}</strong>
                  </div>
                  {offer.estimatedHours && (
                    <p className="offer-duration">Estimated time: {offer.estimatedHours} hours</p>
                  )}
                  <p className="offer-cleaner-message">
                    {offer.message || "This cleaner did not include an additional message."}
                  </p>
                  {offer.status === "pending" && reviewJob.status === "open" ? (
                    <button
                      className="hire-cleaner-btn"
                      onClick={() => acceptOffer(offer._id)}
                      disabled={Boolean(acceptingOfferId)}
                    >
                      {acceptingOfferId === offer._id ? "Hiring..." : "Hire This Cleaner"}
                    </button>
                  ) : (
                    <div className={`offer-decision ${offer.status}`}>{offer.status}</div>
                  )}
                </article>
              ))}
            </div>

            {offerMessage && <div className="profile-message">{offerMessage}</div>}
          </div>
        </div>
      )}
      {messageJob && (
        <JobMessages
          job={messageJob}
          token={token}
          currentUserId={user?.id}
          onClose={() => setMessageJob(null)}
        />
      )}
      {reviewJobToRate && (
        <ReviewModal
          job={reviewJobToRate}
          token={token}
          onClose={() => setReviewJobToRate(null)}
          onSubmitted={(review) => {
            setJobs((current) =>
              current.map((job) =>
                job._id === reviewJobToRate._id ? { ...job, review } : job
              )
            );
            setReviewJobToRate(null);
          }}
        />
      )}
      {reportJob && <ReportModal job={reportJob} token={token} onClose={() => setReportJob(null)} />}
    </div>
  );
}

export default CustomerDashboard;
