const User = require("../models/User");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Job = require("../models/Job");
const Offer = require("../models/Offer");
const Review = require("../models/Review");
const AdminAuditLog = require("../models/AdminAuditLog");
const CleanerProfile = require("../models/CleanerProfile");
const Message = require("../models/Message");
const Report = require("../models/Report");

const getOverview = async (req, res) => {
  try {
    const [users, customers, cleaners, jobs, openJobs, completedJobs, offers, reviews] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: "customer" }),
        User.countDocuments({ role: "cleaner" }),
        Job.countDocuments(),
        Job.countDocuments({ status: "open" }),
        Job.countDocuments({ status: "completed" }),
        Offer.countDocuments(),
        Review.countDocuments()
      ]);
    res.json({
      success: true,
      overview: { users, customers, cleaners, jobs, openJobs, completedJobs, offers, reviews }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to load admin overview." });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("firstName lastName email phone role city state isVerified isActive mustChangePassword createdAt")
      .sort({ createdAt: -1 })
      .limit(250);
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to load users." });
  }
};

const setUserActive = async (req, res) => {
  try {
    if (typeof req.body.isActive !== "boolean") {
      return res.status(400).json({ success: false, message: "isActive must be true or false." });
    }
    if (req.params.userId === req.user._id.toString()) {
      return res.status(409).json({ success: false, message: "You cannot disable your own account." });
    }
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: { isActive: req.body.isActive } },
      { new: true, runValidators: true }
    ).select("firstName lastName email role isActive");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    await AdminAuditLog.create({
      actor: req.user._id,
      action: user.isActive ? "user.enabled" : "user.disabled",
      targetType: "User",
      targetId: user._id,
      details: { email: user.email, role: user.role }
    });
    res.json({ success: true, message: user.isActive ? "Account enabled." : "Account disabled.", user });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to update account." });
  }
};

const getJobs = async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate("customer", "firstName lastName email")
      .populate("assignedCleaner", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(250);
    res.json({ success: true, count: jobs.length, jobs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to load jobs." });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const logs = await AdminAuditLog.find()
      .populate("actor", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(250);
    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to load audit history." });
  }
};

const writeAudit = (req, action, targetType, targetId, details = {}) =>
  AdminAuditLog.create({
    actor: req.user._id,
    action,
    targetType,
    targetId,
    details
  });

const setUserRole = async (req, res) => {
  try {
    const role = req.body.role;
    if (!["customer", "cleaner", "admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid account role." });
    }
    if (req.params.userId === req.user._id.toString()) {
      return res.status(409).json({ success: false, message: "You cannot change your own role." });
    }

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    if (user.role === "admin" && role !== "admin") {
      const activeAdmins = await User.countDocuments({ role: "admin", isActive: true });
      if (activeAdmins <= 1) {
        return res.status(409).json({ success: false, message: "The last active administrator cannot be demoted." });
      }
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();
    await writeAudit(req, "user.role_changed", "User", user._id, {
      email: user.email,
      previousRole,
      role
    });

    res.json({
      success: true,
      message: `Role changed to ${role}.`,
      user: { _id: user._id, role: user.role }
    });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to change account role." });
  }
};

const setUserVerified = async (req, res) => {
  try {
    if (typeof req.body.isVerified !== "boolean") {
      return res.status(400).json({ success: false, message: "isVerified must be true or false." });
    }
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: { isVerified: req.body.isVerified } },
      { new: true, runValidators: true }
    ).select("firstName lastName email role isVerified");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    await writeAudit(req, user.isVerified ? "user.verified" : "user.unverified", "User", user._id, {
      email: user.email,
      role: user.role
    });
    res.json({ success: true, message: user.isVerified ? "Account verified." : "Verification removed.", user });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to update verification." });
  }
};

const resetUserPassword = async (req, res) => {
  try {
    if (req.params.userId === req.user._id.toString()) {
      return res.status(409).json({
        success: false,
        message: "Use the account password-change page to change your own password."
      });
    }

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const temporaryPassword = `${crypto.randomBytes(12).toString("base64url")}A1!`;
    user.password = await bcrypt.hash(temporaryPassword, 12);
    user.mustChangePassword = true;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await writeAudit(req, "user.password_reset", "User", user._id, {
      email: user.email,
      role: user.role,
      sessionsInvalidated: true
    });

    res.json({
      success: true,
      message: "Temporary password generated. Existing sessions were invalidated.",
      temporaryPassword,
      user: {
        _id: user._id,
        mustChangePassword: user.mustChangePassword
      }
    });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to reset password." });
  }
};

const updateJob = async (req, res) => {
  try {
    const allowedStatuses = ["open", "assigned", "in-progress", "completed", "cancelled"];
    const updates = {};

    if (req.body.status !== undefined) {
      if (!allowedStatuses.includes(req.body.status)) {
        return res.status(400).json({ success: false, message: "Invalid job status." });
      }
      updates.status = req.body.status;
    }

    if (req.body.assignedCleaner !== undefined) {
      if (req.body.assignedCleaner === null || req.body.assignedCleaner === "") {
        updates.assignedCleaner = null;
        if (!updates.status) updates.status = "open";
      } else {
        const cleaner = await User.findOne({
          _id: req.body.assignedCleaner,
          role: "cleaner",
          isActive: true
        });
        if (!cleaner) {
          return res.status(400).json({ success: false, message: "Choose an active cleaner account." });
        }
        updates.assignedCleaner = cleaner._id;
        if (!updates.status) updates.status = "assigned";
      }
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, message: "No supported job changes supplied." });
    }

    const existing = await Job.findById(req.params.jobId);
    if (!existing) return res.status(404).json({ success: false, message: "Job not found." });

    const job = await Job.findByIdAndUpdate(
      existing._id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate("customer", "firstName lastName email")
      .populate("assignedCleaner", "firstName lastName email");

    await writeAudit(req, "job.updated", "Job", job._id, {
      title: job.title,
      previousStatus: existing.status,
      status: job.status,
      assignedCleaner: job.assignedCleaner?._id || null
    });
    res.json({ success: true, message: "Job updated.", job });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(404).json({ success: false, message: "Job or cleaner not found." });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to update job." });
  }
};

const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("customer", "firstName lastName email")
      .populate("cleaner", "firstName lastName email")
      .populate("job", "title")
      .sort({ createdAt: -1 })
      .limit(250);
    res.json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to load reviews." });
  }
};

const setReviewVisibility = async (req, res) => {
  try {
    if (typeof req.body.isVisible !== "boolean") {
      return res.status(400).json({ success: false, message: "isVisible must be true or false." });
    }
    const review = await Review.findByIdAndUpdate(
      req.params.reviewId,
      {
        $set: {
          isVisible: req.body.isVisible,
          moderatedAt: new Date(),
          moderatedBy: req.user._id
        }
      },
      { new: true }
    );
    if (!review) return res.status(404).json({ success: false, message: "Review not found." });

    const summary = await Review.aggregate([
      { $match: { cleaner: review.cleaner, isVisible: true } },
      { $group: { _id: "$cleaner", rating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } }
    ]);
    await CleanerProfile.updateOne(
      { user: review.cleaner },
      {
        $set: {
          rating: summary[0] ? Math.round(summary[0].rating * 10) / 10 : 0,
          reviewCount: summary[0]?.reviewCount || 0
        }
      }
    );
    await writeAudit(req, review.isVisible ? "review.restored" : "review.hidden", "System", review._id, {
      rating: review.rating,
      cleaner: review.cleaner
    });
    res.json({ success: true, message: review.isVisible ? "Review restored." : "Review hidden.", review });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(404).json({ success: false, message: "Review not found." });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to moderate review." });
  }
};

const getReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("reporter", "firstName lastName email role")
      .populate("reportedUser", "firstName lastName email role")
      .populate("job", "title status")
      .populate("resolvedBy", "firstName lastName email")
      .sort({ priority: -1, createdAt: -1 })
      .limit(250);
    res.json({ success: true, count: reports.length, reports });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to load reports." });
  }
};

const updateReport = async (req, res) => {
  try {
    const allowedStatuses = ["open", "investigating", "resolved", "dismissed"];
    const allowedPriorities = ["low", "normal", "high", "urgent"];
    const updates = {};
    if (req.body.status !== undefined) {
      if (!allowedStatuses.includes(req.body.status)) {
        return res.status(400).json({ success: false, message: "Invalid report status." });
      }
      updates.status = req.body.status;
      if (["resolved", "dismissed"].includes(req.body.status)) {
        updates.resolvedBy = req.user._id;
        updates.resolvedAt = new Date();
      } else {
        updates.resolvedBy = null;
        updates.resolvedAt = null;
      }
    }
    if (req.body.priority !== undefined) {
      if (!allowedPriorities.includes(req.body.priority)) {
        return res.status(400).json({ success: false, message: "Invalid report priority." });
      }
      updates.priority = req.body.priority;
    }
    if (req.body.adminNotes !== undefined) {
      updates.adminNotes = String(req.body.adminNotes).trim().slice(0, 5000);
    }

    const report = await Report.findByIdAndUpdate(
      req.params.reportId,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate("reporter", "firstName lastName email role")
      .populate("reportedUser", "firstName lastName email role")
      .populate("job", "title status");
    if (!report) return res.status(404).json({ success: false, message: "Report not found." });

    await writeAudit(req, "report.updated", "System", report._id, {
      status: report.status,
      priority: report.priority
    });
    res.json({ success: true, message: "Report updated.", report });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(404).json({ success: false, message: "Report not found." });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to update report." });
  }
};

const getJobMessages = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId).select("title");
    if (!job) return res.status(404).json({ success: false, message: "Job not found." });
    const messages = await Message.find({ job: job._id })
      .populate("sender", "firstName lastName email role")
      .populate("recipient", "firstName lastName email role")
      .sort({ createdAt: 1 });
    await writeAudit(req, "messages.viewed", "Job", job._id, {
      title: job.title,
      messageCount: messages.length
    });
    res.json({ success: true, job, count: messages.length, messages });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(404).json({ success: false, message: "Job not found." });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to load job messages." });
  }
};

module.exports = {
  getOverview,
  getUsers,
  setUserActive,
  getJobs,
  getAuditLogs,
  setUserRole,
  setUserVerified,
  resetUserPassword,
  updateJob,
  getReviews,
  setReviewVisibility,
  getReports,
  updateReport,
  getJobMessages
};
