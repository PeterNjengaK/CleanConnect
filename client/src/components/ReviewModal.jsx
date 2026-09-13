import { useState } from "react";
import { API_BASE_URL } from "../api";

function ReviewModal({ job, token, onClose, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const submitReview = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/reviews/job/${job._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ rating, comment })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to publish review.");
      onSubmitted(data.review);
    } catch (error) {
      setMessage(error.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="offer-modal-backdrop" onMouseDown={onClose}>
      <section className="offer-modal review-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="offer-modal-close" onClick={onClose} aria-label="Close">×</button>
        <p className="dashboard-label">RATE YOUR CLEANER</p>
        <h2>{job.title}</h2>
        <p className="offer-modal-summary">Share an honest review of your completed cleaning.</p>
        <form onSubmit={submitReview}>
          <div className="star-rating" aria-label={`${rating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={star <= rating ? "selected" : ""}
                onClick={() => setRating(star)}
                aria-label={`${star} star${star === 1 ? "" : "s"}`}
              >
                ★
              </button>
            ))}
          </div>
          <div className="form-group">
            <label>Review</label>
            <textarea
              rows="5"
              maxLength="1500"
              placeholder="What did the cleaner do well?"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </div>
          {message && <div className="messages-error">{message}</div>}
          <button className="send-offer-btn" type="submit" disabled={loading}>
            {loading ? "Publishing..." : "Publish Review"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default ReviewModal;
