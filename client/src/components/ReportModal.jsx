import { useState } from "react";
import { API_BASE_URL } from "../api";

function ReportModal({ job, token, onClose }) {
  const [category, setCategory] = useState("quality");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ jobId: job._id, category, description })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to submit report.");
      setSubmitted(true);
      setMessage(data.message);
    } catch (error) {
      setMessage(error.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="offer-modal-backdrop" onMouseDown={onClose}>
      <section className="offer-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="offer-modal-close" onClick={onClose}>×</button>
        <p className="dashboard-label">REPORT A PROBLEM</p>
        <h2>{job.title}</h2>
        <p className="offer-modal-summary">CleanConnect administrators will review this privately.</p>
        {!submitted && <form onSubmit={submit}>
          <div className="form-group"><label>Issue category</label><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="quality">Service quality</option><option value="no-show">No-show</option><option value="payment">Payment</option><option value="safety">Safety</option><option value="harassment">Harassment</option><option value="fraud">Fraud</option><option value="other">Other</option></select></div>
          <div className="form-group"><label>What happened?</label><textarea rows="6" minLength="10" maxLength="3000" required value={description} onChange={(event) => setDescription(event.target.value)} /></div>
          <button className="send-offer-btn" disabled={loading}>{loading ? "Submitting..." : "Submit Report"}</button>
        </form>}
        {message && <div className="profile-message">{message}</div>}
      </section>
    </div>
  );
}

export default ReportModal;
