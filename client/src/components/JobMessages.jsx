import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "../api";

function JobMessages({ job, token, currentUserId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs/${job._id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load messages.");
      setMessages(data.messages || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [job._id, token]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    loadMessages();
  }, [loadMessages]);

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs/${job._id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ body })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to send message.");
      setMessages((current) => [...current, data.data]);
      setBody("");
    } catch (requestError) {
      setError(requestError.message || "Unable to connect to the server.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="offer-modal-backdrop" onMouseDown={onClose}>
      <section className="offer-modal messages-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="offer-modal-close" onClick={onClose} aria-label="Close">×</button>
        <p className="dashboard-label">JOB MESSAGES</p>
        <h2>{job.title}</h2>
        <div className="messages-thread">
          {loading && <p className="messages-placeholder">Loading conversation...</p>}
          {!loading && messages.length === 0 && (
            <p className="messages-placeholder">No messages yet. Start the conversation below.</p>
          )}
          {messages.map((message) => {
            const mine = message.sender?._id === currentUserId;
            return (
              <div className={`message-row ${mine ? "mine" : "theirs"}`} key={message._id}>
                <div className="message-bubble">
                  <strong>{mine ? "You" : `${message.sender?.firstName || "User"}`}</strong>
                  <p>{message.body}</p>
                  <small>{new Date(message.createdAt).toLocaleString()}</small>
                </div>
              </div>
            );
          })}
        </div>
        {error && <div className="messages-error">{error}</div>}
        <form className="message-composer" onSubmit={sendMessage}>
          <textarea
            rows="3"
            maxLength="2000"
            placeholder="Write a message about this job..."
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <button type="submit" disabled={sending || !body.trim()}>
            {sending ? "Sending..." : "Send Message"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default JobMessages;
