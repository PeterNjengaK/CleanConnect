const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const User = require("../models/User");
const Job = require("../models/Job");
const Offer = require("../models/Offer");
const Message = require("../models/Message");
const Review = require("../models/Review");
const Report = require("../models/Report");
const CleanerProfile = require("../models/CleanerProfile");
const AdminAuditLog = require("../models/AdminAuditLog");
const Notification = require("../models/Notification");
const Payment = require("../models/Payment");

const API_URL = process.env.E2E_API_URL || "http://localhost:5000";
const getArgument = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const adminPassword = getArgument("--admin-password");
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const customerEmail = `e2e.customer.${runId}@cleanconnect.local`;
const cleanerEmail = `e2e.cleaner.${runId}@cleanconnect.local`;
const testPassword = "E2eTest123!";
const createdIds = new Set();

const assert = (condition, message) => {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
};

const request = async (pathname, { method = "GET", token, body, expected = 200 } = {}) => {
  const response = await fetch(`${API_URL}${pathname}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await response.json();
  if (response.status !== expected) {
    throw new Error(
      `${method} ${pathname}: expected ${expected}, received ${response.status}: ${data.message}` +
        (data.detail ? ` (${data.detail})` : "")
    );
  }
  return data;
};

const remember = (value) => {
  if (value) createdIds.add(value.toString());
  return value;
};

const cleanup = async () => {
  if (!process.env.MONGO_URI) return;
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "cleanconnect",
      serverSelectionTimeoutMS: 15000
    });
  }

  const users = await User.find({ email: { $in: [customerEmail, cleanerEmail] } }).select("_id").lean();
  const userIds = users.map((user) => user._id);
  const jobs = await Job.find({ $or: [{ customer: { $in: userIds } }, { assignedCleaner: { $in: userIds } }] })
    .select("_id")
    .lean();
  const jobIds = jobs.map((job) => job._id);
  const reviews = await Review.find({ $or: [{ customer: { $in: userIds } }, { cleaner: { $in: userIds } }] })
    .select("_id")
    .lean();
  const reports = await Report.find({ reporter: { $in: userIds } }).select("_id").lean();
  const auditTargetIds = [
    ...userIds,
    ...jobIds,
    ...reviews.map((review) => review._id),
    ...reports.map((report) => report._id),
    ...[...createdIds].map((id) => new mongoose.Types.ObjectId(id))
  ];

  await Promise.all([
    Notification.deleteMany({ $or: [{ recipient: { $in: userIds } }, { job: { $in: jobIds } }] }),
    Payment.deleteMany({ $or: [{ customer: { $in: userIds } }, { cleaner: { $in: userIds } }, { job: { $in: jobIds } }] }),
    Message.deleteMany({ job: { $in: jobIds } }),
    Offer.deleteMany({ job: { $in: jobIds } }),
    Review.deleteMany({ _id: { $in: reviews.map((review) => review._id) } }),
    Report.deleteMany({ _id: { $in: reports.map((report) => report._id) } }),
    CleanerProfile.deleteMany({ user: { $in: userIds } }),
    AdminAuditLog.deleteMany({ targetId: { $in: auditTargetIds } })
  ]);
  await Job.deleteMany({ _id: { $in: jobIds } });
  await User.deleteMany({ _id: { $in: userIds } });
};

const run = async () => {
  if (!adminPassword) throw new Error("Provide --admin-password for the test administrator.");
  console.log(`Starting isolated E2E run ${runId}`);

  await request("/api/admin/overview", { expected: 401 });
  const paymentConfig = await request("/api/payments/config", { expected: 401 });

  const customerRegistration = await request("/api/auth/register", {
    method: "POST",
    expected: 201,
    body: {
      firstName: "E2E",
      lastName: "Customer",
      email: customerEmail,
      password: testPassword,
      role: "customer",
      city: "Santa Rosa",
      state: "CA"
    }
  });
  const customerToken = customerRegistration.token;
  remember(customerRegistration.user.id);

  const cleanerRegistration = await request("/api/auth/register", {
    method: "POST",
    expected: 201,
    body: {
      firstName: "E2E",
      lastName: "Cleaner",
      email: cleanerEmail,
      password: testPassword,
      role: "cleaner",
      city: "Santa Rosa",
      state: "CA"
    }
  });
  const cleanerToken = cleanerRegistration.token;
  const cleanerId = remember(cleanerRegistration.user.id);

  const profile = await request("/api/cleaners/profile", {
    method: "PUT",
    token: cleanerToken,
    body: {
      businessName: `E2E Cleaning ${runId}`,
      bio: "Disposable automated test profile.",
      yearsExperience: 3,
      services: ["Deep Cleaning"],
      startingPrice: 150,
      pricingType: "flat",
      serviceCity: "Santa Rosa",
      serviceState: "CA",
      serviceRadius: 20,
      availableDays: ["Saturday"]
    }
  });
  remember(profile.profile._id);
  assert(profile.profile.isProfileComplete, "cleaner profile should be complete");

  const jobResult = await request("/api/jobs", {
    method: "POST",
    expected: 201,
    token: customerToken,
    body: {
      title: `E2E Deep Cleaning ${runId}`,
      serviceType: "Deep Cleaning",
      description: "Automated end-to-end cleaning request.",
      city: "Santa Rosa",
      state: "CA",
      address: "123 Test Street",
      serviceDate: new Date(Date.now() + 86400000).toISOString(),
      preferredTime: "10:00",
      budgetMin: 150,
      budgetMax: 250,
      propertyType: "House",
      bedrooms: 3,
      bathrooms: 2
    }
  });
  const jobId = remember(jobResult.job._id);

  const available = await request("/api/jobs/available", { token: cleanerToken });
  assert(available.jobs.some((job) => job._id === jobId), "posted job should be available to cleaner");

  const offerResult = await request(`/api/jobs/${jobId}/offers`, {
    method: "POST",
    expected: 201,
    token: cleanerToken,
    body: { amount: 190, estimatedHours: 4, message: "Automated test offer." }
  });
  const offerId = remember(offerResult.offer._id);
  await request(`/api/jobs/${jobId}/offers`, {
    method: "POST",
    expected: 409,
    token: cleanerToken,
    body: { amount: 195 }
  });

  const offers = await request(`/api/jobs/${jobId}/offers`, { token: customerToken });
  assert(offers.count === 1, "customer should see exactly one offer");
  const accepted = await request(`/api/jobs/${jobId}/offers/${offerId}/accept`, {
    method: "PATCH",
    token: customerToken
  });
  assert(accepted.job.status === "assigned", "accepted job should be assigned");

  const cleanerNotifications = await request("/api/notifications", { token: cleanerToken });
  assert(cleanerNotifications.unreadCount === 1, "cleaner should receive an unread acceptance notification");
  const acceptanceNotification = cleanerNotifications.notifications.find(
    (notification) => notification.job?._id === jobId && notification.type === "offer-accepted"
  );
  assert(acceptanceNotification, "acceptance notification should link to the assigned job");
  await request(`/api/notifications/${acceptanceNotification._id}/read`, {
    method: "PATCH",
    token: cleanerToken
  });
  const readNotifications = await request("/api/notifications", { token: cleanerToken });
  assert(readNotifications.unreadCount === 0, "opening acceptance notification should mark it read");

  const assignedJobs = await request("/api/jobs/assigned", { token: cleanerToken });
  assert(assignedJobs.jobs.some((job) => job._id === jobId), "job should appear in cleaner assignments");

  const customerMessage = await request(`/api/jobs/${jobId}/messages`, {
    method: "POST",
    expected: 201,
    token: customerToken,
    body: { body: "Automated customer message." }
  });
  remember(customerMessage.data._id);
  const cleanerMessageAlert = await request("/api/notifications", { token: cleanerToken });
  assert(
    cleanerMessageAlert.notifications.some(
      (notification) => notification.type === "message" && notification.job?._id === jobId && !notification.isRead
    ),
    "customer message should notify the assigned cleaner"
  );
  const cleanerMessage = await request(`/api/jobs/${jobId}/messages`, {
    method: "POST",
    expected: 201,
    token: cleanerToken,
    body: { body: "Automated cleaner response." }
  });
  remember(cleanerMessage.data._id);
  const customerMessageAlert = await request("/api/notifications", { token: customerToken });
  assert(
    customerMessageAlert.notifications.some(
      (notification) => notification.type === "message" && notification.job?._id === jobId && !notification.isRead
    ),
    "cleaner message should notify the customer"
  );
  const thread = await request(`/api/jobs/${jobId}/messages`, { token: customerToken });
  assert(thread.count === 2, "job conversation should contain two messages");
  const customerReadAlerts = await request("/api/notifications", { token: customerToken });
  assert(customerReadAlerts.unreadCount === 0, "opening conversation should clear customer message alert");
  await request(`/api/jobs/${jobId}/messages`, { token: cleanerToken });
  const cleanerReadAlerts = await request("/api/notifications", { token: cleanerToken });
  assert(cleanerReadAlerts.unreadCount === 0, "opening conversation should clear cleaner message alert");
  const cleanerInbox = await request("/api/jobs/conversations", { token: cleanerToken });
  assert(
    cleanerInbox.conversations.some((conversation) => conversation.job._id === jobId),
    "assigned job should appear in cleaner conversation inbox"
  );

  const inProgress = await request(`/api/jobs/${jobId}/status`, {
    method: "PATCH",
    token: cleanerToken,
    body: { status: "in-progress" }
  });
  assert(inProgress.job.status === "in-progress", "job should enter in-progress state");
  const completed = await request(`/api/jobs/${jobId}/status`, {
    method: "PATCH",
    token: cleanerToken,
    body: { status: "completed" }
  });
  assert(completed.job.status === "completed", "job should complete");

  const reviewResult = await request(`/api/reviews/job/${jobId}`, {
    method: "POST",
    expected: 201,
    token: customerToken,
    body: { rating: 5, comment: "Automated five-star review." }
  });
  const reviewId = remember(reviewResult.review._id);
  const publicReviews = await request(`/api/reviews/cleaner/${cleanerId}`);
  assert(publicReviews.count === 1, "public cleaner review should appear");
  assert(publicReviews.reviews[0].job?.title, "cleaner review should include job context");

  const reportResult = await request("/api/reports", {
    method: "POST",
    expected: 201,
    token: customerToken,
    body: {
      jobId,
      category: "quality",
      description: "Automated report used to verify admin dispute handling."
    }
  });
  const reportId = remember(reportResult.report._id);

  const adminLogin = await request("/api/auth/login", {
    method: "POST",
    body: { email: "admin@cleanconnect.local", password: adminPassword }
  });
  assert(adminLogin.user.role === "admin", "bootstrap account should authenticate as admin");
  const adminToken = adminLogin.token;

  const adminUsers = await request("/api/admin/users", { token: adminToken });
  assert(adminUsers.users.some((user) => user.email === customerEmail), "admin should see test customer");
  const adminJobs = await request("/api/admin/jobs", { token: adminToken });
  assert(adminJobs.jobs.some((job) => job._id === jobId), "admin should see test job");
  const adminMessages = await request(`/api/admin/jobs/${jobId}/messages`, { token: adminToken });
  assert(adminMessages.count === 2, "admin dispute inspection should load job messages");

  await request(`/api/admin/users/${cleanerId}/verified`, {
    method: "PATCH",
    token: adminToken,
    body: { isVerified: true }
  });
  await request(`/api/admin/users/${cleanerId}/verified`, {
    method: "PATCH",
    token: adminToken,
    body: { isVerified: false }
  });

  await request(`/api/admin/reviews/${reviewId}/visibility`, {
    method: "PATCH",
    token: adminToken,
    body: { isVisible: false }
  });
  const hiddenReviews = await request(`/api/reviews/cleaner/${cleanerId}`);
  assert(hiddenReviews.count === 0, "hidden review should disappear publicly");
  await request(`/api/admin/reviews/${reviewId}/visibility`, {
    method: "PATCH",
    token: adminToken,
    body: { isVisible: true }
  });

  const adminReports = await request("/api/admin/reports", { token: adminToken });
  assert(adminReports.reports.some((report) => report._id === reportId), "admin should see submitted report");
  const resolved = await request(`/api/admin/reports/${reportId}`, {
    method: "PATCH",
    token: adminToken,
    body: { status: "resolved", priority: "high", adminNotes: "Resolved by automated smoke test." }
  });
  assert(resolved.report.status === "resolved", "admin should resolve report");

  const audit = await request("/api/admin/audit-logs", { token: adminToken });
  assert(audit.count > 0, "admin actions should be audited");

  const reset = await request(`/api/admin/users/${customerRegistration.user.id}/reset-password`, {
    method: "POST",
    token: adminToken
  });
  assert(reset.temporaryPassword, "admin reset should return a one-time temporary password");
  await request("/api/jobs/mine", { token: customerToken, expected: 401 });
  await request("/api/auth/login", {
    method: "POST",
    expected: 401,
    body: { email: customerEmail, password: testPassword }
  });
  const temporaryLogin = await request("/api/auth/login", {
    method: "POST",
    body: { email: customerEmail, password: reset.temporaryPassword }
  });
  assert(temporaryLogin.user.mustChangePassword, "temporary login should require a password change");
  await request("/api/jobs/mine", { token: temporaryLogin.token, expected: 403 });
  const replacementPassword = "RecoveredE2e123!";
  await request("/api/auth/change-password", {
    method: "PATCH",
    token: temporaryLogin.token,
    body: {
      currentPassword: reset.temporaryPassword,
      newPassword: replacementPassword
    }
  });
  await request("/api/jobs/mine", { token: temporaryLogin.token, expected: 401 });
  const recoveredLogin = await request("/api/auth/login", {
    method: "POST",
    body: { email: customerEmail, password: replacementPassword }
  });
  assert(!recoveredLogin.user.mustChangePassword, "replacement password should restore normal access");

  const unknownReset = await request("/api/auth/forgot-password", {
    method: "POST",
    body: { email: `missing.${runId}@cleanconnect.local` }
  });
  assert(!unknownReset.resetUrl, "unknown accounts should not receive a development reset URL");
  const forgotResult = await request("/api/auth/forgot-password", {
    method: "POST",
    body: { email: customerEmail }
  });
  assert(forgotResult.resetUrl, "development password reset should return a local continuation URL");
  const resetUrl = new URL(forgotResult.resetUrl);
  const selfServicePassword = "SelfServiceE2e123!";
  const selfServiceBody = {
    email: resetUrl.searchParams.get("email"),
    token: resetUrl.searchParams.get("token"),
    newPassword: selfServicePassword
  };
  await request("/api/auth/reset-password", { method: "POST", body: selfServiceBody });
  await request("/api/auth/reset-password", { method: "POST", body: selfServiceBody, expected: 400 });
  await request("/api/jobs/mine", { token: recoveredLogin.token, expected: 401 });
  const selfServiceLogin = await request("/api/auth/login", {
    method: "POST",
    body: { email: customerEmail, password: selfServicePassword }
  });
  assert(!selfServiceLogin.user.mustChangePassword, "self-service reset should permit normal login");

  console.log("PASS authentication and authorization");
  console.log("PASS cleaner profile and public marketplace");
  console.log("PASS job posting, offer, acceptance, and assignment");
  console.log("PASS persistent cleaner acceptance notifications and read state");
  console.log("PASS participant messaging and admin inspection");
  console.log("PASS two-way persistent message notifications and read state");
  console.log("PASS lifecycle completion and public reviews");
  console.log("PASS reports, moderation, verification, and audit logging");
  console.log("PASS admin password reset, session revocation, and forced password change");
  console.log("PASS self-service password reset, one-time tokens, and session revocation");
};

run()
  .then(() => console.log("CleanConnect E2E smoke test passed."))
  .catch((error) => {
    console.error(`CleanConnect E2E smoke test failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
      console.log("Disposable E2E records removed.");
    } catch (error) {
      console.error(`E2E cleanup failed: ${error.message}`);
      process.exitCode = 1;
    } finally {
      await mongoose.disconnect();
    }
  });
