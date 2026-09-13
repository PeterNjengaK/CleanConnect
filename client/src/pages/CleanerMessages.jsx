import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../api";
import CleanerNotifications from "../components/CleanerNotifications";
import JobMessages from "../components/JobMessages";
import "../App.css";

function CleanerMessages() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetedMessageJobId = searchParams.get("messageJob");
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role;
  const [conversations, setConversations] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load conversations.");
      setConversations(data.conversations || []);
      setUnreadCount(data.unreadCount || 0);
      setError("");
      if (targetedMessageJobId) {
        const selected = data.conversations?.find(
          (conversation) => conversation.job._id === targetedMessageJobId
        );
        if (selected) setSelectedJob(selected.job);
        navigate("/cleaner/messages", { replace: true });
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [navigate, targetedMessageJobId, token]);

  useEffect(() => {
    if (!token || role !== "cleaner") {
      navigate("/login");
      return;
    }
    // oxlint-disable-next-line react/set-state-in-effect
    loadConversations();
  }, [loadConversations, navigate, role, token]);

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
          <button className="sidebar-link sidebar-link-active">Messages {unreadCount > 0 && <span className="sidebar-count">{unreadCount}</span>}</button>
          <button className="sidebar-link" onClick={() => navigate("/cleaner/reviews")}>Reviews</button>
        </aside>
        <main className="cleaner-main">
          <div className="cleaner-page-heading jobs-heading"><div><p className="dashboard-label">INBOX</p><h1>Customer messages</h1><p>Every conversation stays connected to its cleaning job.</p></div><button className="btn-outline" onClick={loadConversations}>Refresh</button></div>
          {loading && <div className="jobs-state">Loading conversations...</div>}
          {error && <div className="jobs-state jobs-error">{error}</div>}
          {!loading && !error && conversations.length === 0 && <div className="no-results"><h3>No conversations yet</h3><p>Messages become available after a customer accepts one of your offers.</p><button className="btn-primary" onClick={() => navigate("/cleaner/jobs")}>Browse Available Jobs</button></div>}
          <div className="conversation-list">
            {conversations.map((conversation) => (
              <button className="conversation-card" key={conversation.job._id} onClick={() => setSelectedJob(conversation.job)}>
                <div className="conversation-avatar">{conversation.otherUser?.firstName?.charAt(0)}{conversation.otherUser?.lastName?.charAt(0)}</div>
                <div className="conversation-content"><div className="conversation-heading"><strong>{conversation.otherUser?.firstName} {conversation.otherUser?.lastName}</strong><small>{new Date(conversation.lastMessage?.createdAt || conversation.job.updatedAt).toLocaleString()}</small></div><span>{conversation.job.title}</span><p>{conversation.lastMessage?.body || "No messages yet. Start the conversation."}</p></div>
                {conversation.unreadCount > 0 && <span className="conversation-unread">{conversation.unreadCount}</span>}
              </button>
            ))}
          </div>
        </main>
      </div>
      {selectedJob && <JobMessages job={selectedJob} token={token} currentUserId={user?.id} onClose={() => { setSelectedJob(null); loadConversations(); }} />}
    </div>
  );
}

export default CleanerMessages;
