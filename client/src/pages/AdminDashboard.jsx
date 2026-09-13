import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api";
import "../App.css";

const views = ["overview", "users", "jobs", "reviews", "reports", "audit"];

function AdminDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role;
  const [data, setData] = useState({
    overview: null,
    users: [],
    jobs: [],
    reviews: [],
    reports: [],
    audit: []
  });
  const [view, setView] = useState("overview");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [messageReview, setMessageReview] = useState(null);
  const [passwordReset, setPasswordReset] = useState(null);

  const apiRequest = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || "Admin request failed.");
    return body;
  }, [token]);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const [overview, users, jobs, reviews, reports, audit] = await Promise.all([
        apiRequest("/api/admin/overview"),
        apiRequest("/api/admin/users"),
        apiRequest("/api/admin/jobs"),
        apiRequest("/api/admin/reviews"),
        apiRequest("/api/admin/reports"),
        apiRequest("/api/admin/audit-logs")
      ]);
      setData({
        overview: overview.overview,
        users: users.users || [],
        jobs: jobs.jobs || [],
        reviews: reviews.reviews || [],
        reports: reports.reports || [],
        audit: audit.logs || []
      });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    if (!token || role !== "admin") {
      navigate("/login");
      return;
    }
    // oxlint-disable-next-line react/set-state-in-effect
    loadAdminData();
  }, [loadAdminData, navigate, role, token]);

  const runAction = async (id, action, apply) => {
    setBusyId(id);
    setMessage("");
    try {
      const result = await action();
      apply(result);
      setMessage(result.message);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyId("");
    }
  };

  const patchUser = (id, patch) =>
    setData((current) => ({
      ...current,
      users: current.users.map((account) => account._id === id ? { ...account, ...patch } : account)
    }));

  const updateUser = (account, endpoint, payload) =>
    runAction(account._id, () => apiRequest(`/api/admin/users/${account._id}/${endpoint}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }), (result) => patchUser(account._id, result.user));

  const resetPassword = (account) => {
    if (!window.confirm(`Generate a temporary password for ${account.email}? Their current sessions will be signed out.`)) return;
    runAction(
      account._id,
      () => apiRequest(`/api/admin/users/${account._id}/reset-password`, { method: "POST" }),
      (result) => {
        patchUser(account._id, result.user);
        setPasswordReset({
          name: `${account.firstName} ${account.lastName}`,
          email: account.email,
          temporaryPassword: result.temporaryPassword
        });
      }
    );
  };

  const updateJob = (job, payload) =>
    runAction(job._id, () => apiRequest(`/api/admin/jobs/${job._id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }), (result) => setData((current) => ({
      ...current,
      jobs: current.jobs.map((item) => item._id === job._id ? result.job : item)
    })));

  const inspectMessages = (job) =>
    runAction(job._id, () => apiRequest(`/api/admin/jobs/${job._id}/messages`), (result) => {
      setMessageReview({ job: result.job, messages: result.messages });
    });

  const updateReview = (review) =>
    runAction(review._id, () => apiRequest(`/api/admin/reviews/${review._id}/visibility`, {
      method: "PATCH",
      body: JSON.stringify({ isVisible: !review.isVisible })
    }), (result) => setData((current) => ({
      ...current,
      reviews: current.reviews.map((item) => item._id === review._id ? { ...item, ...result.review } : item)
    })));

  const updateReport = (report, payload) =>
    runAction(report._id, () => apiRequest(`/api/admin/reports/${report._id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }), (result) => setData((current) => ({
      ...current,
      reports: current.reports.map((item) => item._id === report._id ? result.report : item)
    })));

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return data;
    const matches = (...values) => values.filter(Boolean).join(" ").toLowerCase().includes(needle);
    return {
      ...data,
      users: data.users.filter((item) => matches(item.firstName, item.lastName, item.email, item.role)),
      jobs: data.jobs.filter((item) => matches(item.title, item.city, item.state, item.status)),
      reviews: data.reviews.filter((item) => matches(item.comment, item.customer?.email, item.cleaner?.email)),
      reports: data.reports.filter((item) => matches(item.category, item.description, item.status, item.reporter?.email)),
      audit: data.audit.filter((item) => matches(item.action, item.details?.email, item.actor?.email))
    };
  }, [data, search]);

  const activeCleaners = data.users.filter(
    (account) => account.role === "cleaner" && account.isActive
  );

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="admin-page">
      <header className="dashboard-header">
        <div className="logo" onClick={() => navigate("/")} role="button" tabIndex="0">CleanConnect</div>
        <div className="dashboard-header-actions"><span>{user?.firstName} · Administrator</span><button className="btn-outline" onClick={logout}>Log Out</button></div>
      </header>
      <div className="admin-layout">
        <aside className="dashboard-sidebar">
          <p className="sidebar-title">ADMIN PORTAL</p>
          {views.map((item) => (
            <button key={item} className={`sidebar-link ${view === item ? "sidebar-link-active" : ""}`} onClick={() => setView(item)}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </button>
          ))}
        </aside>
        <main className="admin-main">
          <div className="cleaner-page-heading jobs-heading">
            <div><p className="dashboard-label">PLATFORM OPERATIONS</p><h1>{view.charAt(0).toUpperCase() + view.slice(1)}</h1></div>
            <button className="btn-outline" onClick={loadAdminData}>Refresh</button>
          </div>
          {message && <div className="profile-message jobs-page-message">{message}</div>}
          {view !== "overview" && (
            <input className="admin-search" type="search" placeholder={`Search ${view}...`} value={search} onChange={(event) => setSearch(event.target.value)} />
          )}
          {loading && <div className="jobs-state">Loading platform data...</div>}

          {!loading && view === "overview" && data.overview && (
            <div className="admin-stats-grid">
              {Object.entries(data.overview).map(([label, value]) => <div className="admin-stat" key={label}><strong>{value}</strong><span>{label.replace(/([A-Z])/g, " $1")}</span></div>)}
            </div>
          )}

          {!loading && view === "users" && (
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>User</th><th>Role</th><th>Verified</th><th>Status</th><th>Controls</th></tr></thead><tbody>
              {filtered.users.map((account) => <tr key={account._id}><td><strong>{account.firstName} {account.lastName}</strong><small>{account.email}</small>{account.mustChangePassword && <small className="password-reset-pending">Password change required</small>}</td><td><select value={account.role} disabled={busyId === account._id || account._id === user.id} onChange={(event) => updateUser(account, "role", { role: event.target.value })}><option value="customer">Customer</option><option value="cleaner">Cleaner</option><option value="admin">Admin</option></select></td><td><button onClick={() => updateUser(account, "verified", { isVerified: !account.isVerified })} disabled={busyId === account._id}>{account.isVerified ? "Verified" : "Verify"}</button></td><td>{account.isActive ? "Active" : "Disabled"}</td><td><button onClick={() => updateUser(account, "active", { isActive: !account.isActive })} disabled={busyId === account._id || account._id === user.id}>{account.isActive ? "Disable" : "Enable"}</button><button onClick={() => resetPassword(account)} disabled={busyId === account._id || account._id === user.id}>Reset Password</button></td></tr>)}
            </tbody></table></div>
          )}

          {!loading && view === "jobs" && (
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Job</th><th>Parties</th><th>Status</th><th>Controls</th></tr></thead><tbody>
              {filtered.jobs.map((job) => <tr key={job._id}><td><strong>{job.title}</strong><small>{job.city}, {job.state}</small></td><td><small>Customer: {job.customer?.firstName} {job.customer?.lastName}</small><small>Cleaner: {job.assignedCleaner ? `${job.assignedCleaner.firstName} ${job.assignedCleaner.lastName}` : "Unassigned"}</small></td><td><select value={job.status} disabled={busyId === job._id} onChange={(event) => updateJob(job, { status: event.target.value })}><option value="open">Open</option><option value="assigned">Assigned</option><option value="in-progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></td><td><select value={job.assignedCleaner?._id || ""} disabled={busyId === job._id} onChange={(event) => updateJob(job, { assignedCleaner: event.target.value || null })}><option value="">Unassigned</option>{activeCleaners.map((cleaner) => <option value={cleaner._id} key={cleaner._id}>{cleaner.firstName} {cleaner.lastName}</option>)}</select><button onClick={() => inspectMessages(job)} disabled={busyId === job._id}>Inspect Messages</button></td></tr>)}
            </tbody></table></div>
          )}

          {!loading && view === "reviews" && (
            <div className="admin-cards-list">{filtered.reviews.map((review) => <article className={`admin-record-card ${review.isVisible ? "" : "muted"}`} key={review._id}><div><span className="job-status open">{review.rating}/5</span><h3>{review.job?.title || "Review"}</h3><p>{review.comment || "No written comment."}</p><small>{review.customer?.email} → {review.cleaner?.email}</small></div><button onClick={() => updateReview(review)} disabled={busyId === review._id}>{review.isVisible ? "Hide Review" : "Restore Review"}</button></article>)}</div>
          )}

          {!loading && view === "reports" && (
            <div className="admin-cards-list">{filtered.reports.map((report) => <article className="admin-record-card report-card" key={report._id}><div className="report-card-main"><div className="report-badges"><span className={`report-priority ${report.priority}`}>{report.priority}</span><span className="job-status assigned">{report.category}</span></div><h3>{report.job?.title || "General platform report"}</h3><p>{report.description}</p><small>Reporter: {report.reporter?.email}{report.reportedUser?.email ? ` · Reported: ${report.reportedUser.email}` : ""}</small></div><div className="report-controls"><select value={report.priority} onChange={(event) => updateReport(report, { priority: event.target.value })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select><select value={report.status} onChange={(event) => updateReport(report, { status: event.target.value })}><option value="open">Open</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select><textarea defaultValue={report.adminNotes} placeholder="Private admin notes" onBlur={(event) => updateReport(report, { adminNotes: event.target.value })} /></div></article>)}</div>
          )}

          {!loading && view === "audit" && (
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Time</th><th>Administrator</th><th>Action</th><th>Target</th></tr></thead><tbody>{filtered.audit.map((log) => <tr key={log._id}><td>{new Date(log.createdAt).toLocaleString()}</td><td>{log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : "Local bootstrap"}</td><td>{log.action}</td><td>{log.details?.email || log.details?.title || log.targetType}</td></tr>)}</tbody></table></div>
          )}
        </main>
      </div>

      {messageReview && (
        <div className="offer-modal-backdrop" onMouseDown={() => setMessageReview(null)}><section className="offer-modal messages-modal" onMouseDown={(event) => event.stopPropagation()}><button className="offer-modal-close" onClick={() => setMessageReview(null)}>×</button><p className="dashboard-label">ADMIN MESSAGE REVIEW</p><h2>{messageReview.job.title}</h2><div className="admin-message-warning">Access is audit-logged. Review messages only for support, safety, or dispute resolution.</div><div className="messages-thread">{messageReview.messages.length === 0 && <p className="messages-placeholder">No messages for this job.</p>}{messageReview.messages.map((item) => <div className="message-row" key={item._id}><div className="message-bubble"><strong>{item.sender?.firstName} {item.sender?.lastName} ({item.sender?.role})</strong><p>{item.body}</p><small>{new Date(item.createdAt).toLocaleString()}</small></div></div>)}</div></section></div>
      )}
      {passwordReset && (
        <div className="offer-modal-backdrop" onMouseDown={() => setPasswordReset(null)}><section className="offer-modal password-reset-modal" onMouseDown={(event) => event.stopPropagation()}><button className="offer-modal-close" onClick={() => setPasswordReset(null)}>×</button><p className="dashboard-label">TEMPORARY PASSWORD</p><h2>{passwordReset.name}</h2><p className="offer-modal-summary">Copy this password now and deliver it securely to {passwordReset.email}. It will not be shown again.</p><div className="temporary-password"><code>{passwordReset.temporaryPassword}</code><button onClick={() => navigator.clipboard.writeText(passwordReset.temporaryPassword)}>Copy</button></div><div className="admin-message-warning">The user’s previous sessions are invalid. At next login they must replace this temporary password before accessing CleanConnect.</div><button className="send-offer-btn" onClick={() => setPasswordReset(null)}>I Saved the Password</button></section></div>
      )}
    </div>
  );
}

export default AdminDashboard;
