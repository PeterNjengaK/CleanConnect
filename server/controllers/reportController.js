const Job = require("../models/Job");
const Report = require("../models/Report");

const createReport = async (req, res) => {
  try {
    const { jobId, category, description } = req.body;
    const allowedCategories = ["safety", "payment", "no-show", "quality", "harassment", "fraud", "other"];

    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ success: false, message: "Choose a valid report category." });
    }
    if (typeof description !== "string" || description.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Describe the issue using at least 10 characters."
      });
    }

    let job = null;
    let reportedUser = null;
    if (jobId) {
      job = await Job.findOne({
        _id: jobId,
        $or: [{ customer: req.user._id }, { assignedCleaner: req.user._id }]
      });
      if (!job) {
        return res.status(404).json({ success: false, message: "Job not found for this account." });
      }
      const reporterIsCustomer = job.customer.toString() === req.user._id.toString();
      reportedUser = reporterIsCustomer ? job.assignedCleaner : job.customer;
    }

    const report = await Report.create({
      reporter: req.user._id,
      reportedUser,
      job: job?._id || null,
      category,
      description: description.trim(),
      priority: category === "safety" || category === "harassment" ? "urgent" : "normal"
    });

    res.status(201).json({
      success: true,
      message: "Your report was submitted to CleanConnect support.",
      report
    });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(404).json({ success: false, message: "Job not found." });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to submit report." });
  }
};

const getMyReports = async (req, res) => {
  try {
    const reports = await Report.find({ reporter: req.user._id })
      .populate("job", "title status")
      .sort({ createdAt: -1 });
    res.json({ success: true, count: reports.length, reports });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to retrieve reports." });
  }
};

module.exports = { createReport, getMyReports };
