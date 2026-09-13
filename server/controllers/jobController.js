const Job = require("../models/Job");
const Offer = require("../models/Offer");
const Notification = require("../models/Notification");
const Review = require("../models/Review");
const CleanerProfile = require("../models/CleanerProfile");
const { isStripeConfigured } = require("../config/stripe");

const createJob = async (req, res) => {
  try {
    const {
      title,
      serviceType,
      description,
      city,
      state,
      address,
      serviceDate,
      preferredTime,
      budgetMin,
      budgetMax,
      propertyType,
      bedrooms,
      bathrooms
    } = req.body;

    if (
      !title ||
      !serviceType ||
      !description ||
      !city ||
      !state ||
      !serviceDate ||
      budgetMin === undefined ||
      budgetMax === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Please complete all required job fields."
      });
    }

    if (Number(budgetMax) < Number(budgetMin)) {
      return res.status(400).json({
        success: false,
        message: "Maximum budget cannot be lower than minimum budget."
      });
    }

    if (
      !Number.isFinite(Number(budgetMin)) ||
      !Number.isFinite(Number(budgetMax)) ||
      Number(budgetMin) < 0 ||
      Number(budgetMax) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid non-negative budget range."
      });
    }

    if (Number.isNaN(new Date(serviceDate).getTime())) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid service date."
      });
    }

    const job = await Job.create({
      customer: req.user._id,
      title,
      serviceType,
      description,
      city,
      state,
      address,
      serviceDate,
      preferredTime,
      budgetMin,
      budgetMax,
      propertyType,
      bedrooms,
      bathrooms
    });

    res.status(201).json({
      success: true,
      message: "Cleaning job posted successfully.",
      job
    });
  } catch (error) {
    if (error?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors)[0]?.message || "Invalid job details."
      });
    }
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Unable to create cleaning job."
    });
  }
};

const getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({
      customer: req.user._id
    })
      .populate("assignedCleaner", "firstName lastName email phone city state")
      .sort({ createdAt: -1 });

    const reviews = await Review.find({
      customer: req.user._id,
      job: { $in: jobs.map((job) => job._id) }
    }).select("job rating");
    const reviewsByJob = new Map(
      reviews.map((review) => [review.job.toString(), review])
    );
    const jobsWithReviewState = jobs.map((job) => ({
      ...job.toObject(),
      review: reviewsByJob.get(job._id.toString()) || null
    }));

    res.json({
      success: true,
      count: jobs.length,
      jobs: jobsWithReviewState
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve your jobs."
    });
  }
};

const getAvailableJobs = async (req, res) => {
  try {
    const filter = { status: "open" };

    if (req.query.city) {
      filter.city = { $regex: req.query.city.trim(), $options: "i" };
    }
    if (req.query.state) {
      filter.state = { $regex: req.query.state.trim(), $options: "i" };
    }
    if (req.query.serviceType) {
      filter.serviceType = req.query.serviceType;
    }

    const [jobs, existingOffers] = await Promise.all([
      Job.find(filter)
        .select("-address")
        .populate("customer", "firstName lastName city state")
        .sort({ serviceDate: 1, createdAt: -1 }),
      Offer.find({ cleaner: req.user._id }).select("job status amount")
    ]);
    const offersByJob = new Map(
      existingOffers.map((offer) => [offer.job.toString(), offer])
    );
    const availableJobs = jobs.map((job) => ({
      ...job.toObject(),
      myOffer: offersByJob.get(job._id.toString()) || null
    }));

    res.json({ success: true, count: availableJobs.length, jobs: availableJobs });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Unable to retrieve available jobs."
    });
  }
};

const createOffer = async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const estimatedHours = req.body.estimatedHours
      ? Number(req.body.estimatedHours)
      : undefined;

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid offer amount."
      });
    }

    if (
      estimatedHours !== undefined &&
      (!Number.isFinite(estimatedHours) || estimatedHours < 0.5 || estimatedHours > 72)
    ) {
      return res.status(400).json({
        success: false,
        message: "Estimated hours must be between 0.5 and 72."
      });
    }

    const job = await Job.findOne({ _id: req.params.jobId, status: "open" });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "This job is no longer available."
      });
    }

    const offer = await Offer.create({
      job: job._id,
      cleaner: req.user._id,
      amount,
      message: req.body.message || "",
      estimatedHours
    });
    res.status(201).json({
      success: true,
      message: "Your offer was sent to the customer.",
      offer
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already submitted an offer for this job."
      });
    }
    if (error?.name === "CastError") {
      return res.status(404).json({ success: false, message: "Job not found." });
    }
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Unable to submit your offer.",
      ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {})
    });
  }
};

const getJobOffers = async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.jobId,
      customer: req.user._id
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found."
      });
    }

    const offers = await Offer.find({ job: job._id })
      .populate("cleaner", "firstName lastName city state profileImage")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: offers.length,
      offers
    });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(404).json({ success: false, message: "Job not found." });
    }
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Unable to retrieve offers for this job."
    });
  }
};

const acceptOffer = async (req, res) => {
  try {
    const offer = await Offer.findOne({
      _id: req.params.offerId,
      job: req.params.jobId,
      status: "pending"
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "This offer is no longer available."
      });
    }

    const job = await Job.findOneAndUpdate(
      {
        _id: req.params.jobId,
        customer: req.user._id,
        status: "open"
      },
      {
        $set: {
          status: "assigned",
          assignedCleaner: offer.cleaner,
          agreedAmount: offer.amount,
          paymentStatus: isStripeConfigured() ? "unpaid" : "not-required"
        }
      },
      { new: true, runValidators: true }
    );

    if (!job) {
      return res.status(409).json({
        success: false,
        message: "This job has already been assigned or is no longer open."
      });
    }

    await Promise.all([
      Offer.updateOne({ _id: offer._id }, { $set: { status: "accepted" } }),
      Offer.updateMany(
        { job: job._id, _id: { $ne: offer._id }, status: "pending" },
        { $set: { status: "declined" } }
      ),
      Notification.findOneAndUpdate(
        { recipient: offer.cleaner, type: "offer-accepted", job: job._id },
        {
          $set: {
            title: "Your offer was accepted!",
            body: `You have been hired for ${job.title}. Open My Jobs to review the details.`,
            isRead: false
          }
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      )
    ]);

    const acceptedOffer = await Offer.findById(offer._id).populate(
      "cleaner",
      "firstName lastName city state profileImage"
    );

    res.json({
      success: true,
      message: "Cleaner hired successfully.",
      job,
      offer: acceptedOffer
    });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(404).json({ success: false, message: "Job or offer not found." });
    }
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Unable to accept this offer."
    });
  }
};

const getAssignedJobs = async (req, res) => {
  try {
    const jobs = await Job.find({
      assignedCleaner: req.user._id,
      status: { $in: ["assigned", "in-progress", "completed"] }
    })
      .populate("customer", "firstName lastName email phone city state")
      .sort({ serviceDate: 1, updatedAt: -1 });

    res.json({ success: true, count: jobs.length, jobs });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Unable to retrieve your assigned jobs."
    });
  }
};

const updateJobStatus = async (req, res) => {
  try {
    const requestedStatus = req.body.status;
    const allowedTransitions = {
      assigned: "in-progress",
      "in-progress": "completed"
    };

    const job = await Job.findOne({
      _id: req.params.jobId,
      assignedCleaner: req.user._id
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Assigned job not found."
      });
    }

    if (allowedTransitions[job.status] !== requestedStatus) {
      return res.status(409).json({
        success: false,
        message: `This job cannot move from ${job.status} to ${requestedStatus}.`
      });
    }

    if (
      requestedStatus === "in-progress" &&
      ["unpaid", "pending", "failed"].includes(job.paymentStatus)
    ) {
      return res.status(409).json({
        success: false,
        message: "The customer payment must be confirmed before this job can start."
      });
    }

    job.status = requestedStatus;
    await job.save();
    if (requestedStatus === "completed") {
      await CleanerProfile.updateOne(
        { user: req.user._id },
        { $inc: { completedJobs: 1 } }
      );
    }
    await job.populate("customer", "firstName lastName email phone city state");

    res.json({
      success: true,
      message:
        requestedStatus === "completed"
          ? "Job marked complete."
          : "Job marked in progress.",
      job
    });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(404).json({ success: false, message: "Job not found." });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to update job status." });
  }
};

const cancelJob = async (req, res) => {
  try {
    const job = await Job.findOneAndUpdate(
      {
        _id: req.params.jobId,
        customer: req.user._id,
        status: "open"
      },
      { $set: { status: "cancelled" } },
      { new: true }
    );

    if (!job) {
      return res.status(409).json({
        success: false,
        message: "Only an open, unassigned job can be cancelled."
      });
    }

    await Offer.updateMany(
      { job: job._id, status: "pending" },
      { $set: { status: "declined" } }
    );

    res.json({ success: true, message: "Job cancelled.", job });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(404).json({ success: false, message: "Job not found." });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to cancel job." });
  }
};

module.exports = {
  createJob,
  getMyJobs,
  getAvailableJobs,
  createOffer,
  getJobOffers,
  acceptOffer,
  getAssignedJobs,
  updateJobStatus,
  cancelJob
};
