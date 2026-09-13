import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api";

/* oxlint-disable react/set-state-in-effect */

function CleanerNotifications({ token }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const autoOpened = useRef(false);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        if (data.unreadCount > 0 && !autoOpened.current) {
          autoOpened.current = true;
          setOpen(true);
        }
      }
    } catch {
      // Poll again later if the connection is temporarily unavailable.
    }
  }, [token]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    const refreshOnFocus = () => loadNotifications();
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [loadNotifications]);

  const openNotification = (notification) => {
    const jobId = notification.job?._id || notification.job;
    setOpen(false);

    if (!notification.isRead) {
      fetch(`${API_BASE_URL}/api/notifications/${notification._id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
      setNotifications((current) => current.map((item) => (
        item._id === notification._id ? { ...item, isRead: true } : item
      )));
      setUnreadCount((current) => Math.max(0, current - 1));
    }
    if (notification.type === "message") {
      const destination = user?.role === "cleaner" ? "/cleaner/messages" : "/customer/dashboard";
      navigate(`${destination}${jobId ? `?messageJob=${encodeURIComponent(jobId)}` : ""}`);
    } else {
      navigate("/cleaner/my-jobs", { state: { highlightJobId: jobId } });
    }
  };

  return (
    <div className="notification-center">
      <button
        className="notification-bell"
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && <strong>{unreadCount > 9 ? "9+" : unreadCount}</strong>}
      </button>
      {open && (
        <div className="notification-panel">
          <div className="notification-panel-heading"><strong>Notifications</strong><button type="button" onClick={loadNotifications}>Refresh</button></div>
          {notifications.length === 0 && <p className="notification-empty">No notifications yet.</p>}
          {notifications.map((notification) => (
            <button
              className={`notification-item${notification.isRead ? "" : " unread"}`}
              type="button"
              key={notification._id}
              onClick={() => openNotification(notification)}
            >
              <span className="notification-dot" />
              <span><strong>{notification.title}</strong><small>{notification.body}</small><time>{new Date(notification.createdAt).toLocaleString()}</time></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default CleanerNotifications;
