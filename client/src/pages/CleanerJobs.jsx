import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import JobMessages from "../components/JobMessages";
import { API_BASE_URL } from "../api";
import ReportModal from "../components/ReportModal";
import CleanerNotifications from "../components/CleanerNotifications";

function CleanerJobs() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role;
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [messageJob, setMessageJob] = useState(null);
  const [reportJob, setReportJob] = useState(null);

  const loadJobs = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs/assigned`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load your jobs.");
      setJobs(data.jobs || []);
    } catch (error) {
      setMessage(error.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token || !role) {
      navigate("/login");
      return;
    }
    if (role !== "cleaner") {
      navigate("/customer/dashboard");
      return;
    }
    // oxlint-disable-next-line react/set-state-in-effect
    loadJobs();
  }, [loadJobs, navigate, role, token]);

  const updateStatus = async (job, status) => {
    setUpdatingId(job._id);
    setMessage("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs/${job._id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to update the job.");
      setJobs((current) => current.map((item) => (item._id === job._id ? data.job : item)));
      setMessage(data.message);
    } catch (error) {
      setMessage(error.message || "Unable to connect to the server.");
    } finally {
      setUpdatingId("");
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
        <div className="logo" onClick={() => navigate("/")} role="button" tabIndex="0">CleanConnect</div>
        <div className="dashboard-header-actions">
          <CleanerNotifications token={token} />
          <span>{user?.firstName} {user?.lastName}</span>
          <button className="btn-outline" onClick={logout}>Log Out</button>
        </div>
      </div>
      <div className="cleaner-dashboard-layout">
        <aside className="dashboard-sidebar">
          <p className="sidebar-title">CLEANER PORTAL</p>
          <button className="sidebar-link" onClick={() => navigate("/cleaner/dashboard")}>My Profile</button>
          <button className="sidebar-link" onClick={() => navigate("/cleaner/jobs")}>Available Jobs</button>
          <button className="sidebar-link sidebar-link-active">My Jobs</button>
          <button className="sidebar-link" onClick={() => navigate("/cleaner/messages")}>Messages</button>
          <button className="sidebar-link" onClick={() => navigate("/cleaner/reviews")}>Reviews</button>
        </aside>
        <main className="cleaner-main">
          <div className="cleaner-page-heading jobs-heading">
            <div>
              <p className="dashboard-label">MY WORK</p>
              <h1>Assigned cleaning jobs</h1>
              <p>Manage upcoming work and keep customers informed of progress.</p>
            </div>
            <button className="btn-outline" onClick={loadJobs}>Refresh</button>
          </div>
          {message && <div className="profile-message jobs-page-message">{message}</div>}
          {loading && <div className="jobs-state">Loading your jobs...</div>}
          {!loading && jobs.length === 0 && (
            <div className="no-results">
              <h3>No assigned jobs yet</h3>
              <p>When a customer accepts your offer, the job will appear here.</p>
              <button className="btn-primary" onClick={() => navigate("/cleaner/jobs")}>Browse Available Jobs</button>
            </div>
          )}
          <div className="assigned-jobs-list">
            {jobs.map((job) => (
              <article className="assigned-job-card" key={job._id}>
                <div className="assigned-job-top">
                  <div>
                    <span className={`job-status ${job.status}`}>{job.status}</span>
                    <h2>{job.title}</h2>
                    <p>{job.serviceType}</p>
                  </div>
                  <div className="assigned-job-date">
                    <small>Service date</small>
                    <strong>{new Date(job.serviceDate).toLocaleDateString()}</strong>
                    {job.preferredTime && <span>{job.preferredTime}</span>}
                  </div>
                </div>
                <div className="assigned-job-grid">
                  <div><small>Customer</small><strong>{job.customer?.firstName} {job.customer?.lastName}</strong></div>
                  <div><small>Location</small><strong>{job.city}, {job.state}</strong></div>
                  <div><small>Property</small><strong>{job.propertyType}</strong></div>
                  <div><small>Budget</small><strong>${job.budgetMin}–${job.budgetMax}</strong></div>
                </div>
                <p className="job-description">{job.description}</p>
                {job.agreedAmount && (
                  <div className={`job-payment-summary ${job.paymentStatus}`}>
                    <span>Your agreed earnings</span>
                    <strong>${job.agreedAmount.toFixed(2)}</strong>
                    <small>{job.paymentStatus === "paid" ? "Customer payment confirmed" : job.paymentStatus === "not-required" ? "Legacy booking" : "Waiting for customer payment"}</small>
                  </div>
                )}
                <div className="assigned-job-actions">
                  <button className="secondary-job-action" onClick={() => setMessageJob(job)}>
                    Message Customer
                  </button>
                  <button className="report-job-action" onClick={() => setReportJob(job)}>Report Problem</button>
                  {job.status === "assigned" && !["unpaid", "pending", "failed"].includes(job.paymentStatus) && (
                    <button onClick={() => updateStatus(job, "in-progress")} disabled={updatingId === job._id}>
                      {updatingId === job._id ? "Updating..." : "Start Job"}
                    </button>
                  )}
                  {job.status === "in-progress" && (
                    <button onClick={() => updateStatus(job, "completed")} disabled={updatingId === job._id}>
                      {updatingId === job._id ? "Updating..." : "Mark Complete"}
                    </button>
                  )}
                  {job.status === "completed" && <span className="completed-job-note">Completed</span>}
                </div>
              </article>
            ))}
          </div>
        </main>
      </div>
      {messageJob && (
        <JobMessages
          job={messageJob}
          token={token}
          currentUserId={user?.id}
          onClose={() => setMessageJob(null)}
        />
      )}
      {reportJob && <ReportModal job={reportJob} token={token} onClose={() => setReportJob(null)} />}
    </div>
  );
}

export default CleanerJobs;
