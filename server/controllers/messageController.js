const Job = require("../models/Job");
const Message = require("../models/Message");
const Notification = require("../models/Notification");

const findParticipantJob = (jobId, userId) =>
  Job.findOne({
    _id: jobId,
    status: { $in: ["assigned", "in-progress", "completed"] },
    $or: [{ customer: userId }, { assignedCleaner: userId }]
  });

const getMessages = async (req, res) => {
  try {
    const job = await findParticipantJob(req.params.jobId, req.user._id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found for this job."
      });
    }

    const messages = await Message.find({ job: job._id })
      .populate("sender", "firstName lastName role")
      .sort({ createdAt: 1 });

    await Message.updateMany(
      { job: job._id, recipient: req.user._id, readAt: null },
      { $set: { readAt: new Date() } }
    );
    await Notification.updateMany(
      { job: job._id, recipient: req.user._id, type: "message", isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ success: true, count: messages.length, messages });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(404).json({ success: false, message: "Job not found." });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to retrieve messages." });
  }
};

const sendMessage = async (req, res) => {
  try {
    const body = String(req.body.body || "").trim();
    if (!body) {
      return res.status(400).json({ success: false, message: "Message cannot be empty." });
    }

    const job = await findParticipantJob(req.params.jobId, req.user._id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found for this job."
      });
    }

    const isCustomer = job.customer.toString() === req.user._id.toString();
    const recipient = isCustomer ? job.assignedCleaner : job.customer;
    if (!recipient) {
      return res.status(409).json({ success: false, message: "This job has no matched cleaner." });
    }

    const message = await Message.create({
      job: job._id,
      sender: req.user._id,
      recipient,
      body
    });
    await message.populate("sender", "firstName lastName role");

    const senderName = `${req.user.firstName} ${req.user.lastName}`.trim();
    const preview = body.length > 120 ? `${body.slice(0, 117)}...` : body;
    await Notification.findOneAndUpdate(
      { recipient, type: "message", job: job._id },
      {
        $set: {
          title: `New message from ${senderName}`,
          body: `${job.title}: ${preview}`,
          isRead: false
        }
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    res.status(201).json({ success: true, message: "Message sent.", data: message });
  } catch (error) {
    if (error?.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error?.name === "CastError") {
      return res.status(404).json({ success: false, message: "Job not found." });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to send message." });
  }
};

const getConversations = async (req, res) => {
  try {
    const participantFilter =
      req.user.role === "cleaner"
        ? { assignedCleaner: req.user._id }
        : { customer: req.user._id };

    const jobs = await Job.find({
      ...participantFilter,
      status: { $in: ["assigned", "in-progress", "completed"] }
    })
      .populate("customer", "firstName lastName role profileImage")
      .populate("assignedCleaner", "firstName lastName role profileImage")
      .sort({ updatedAt: -1 });

    const conversations = await Promise.all(
      jobs.map(async (job) => {
        const [lastMessage, unreadCount] = await Promise.all([
          Message.findOne({ job: job._id })
            .populate("sender", "firstName lastName role")
            .sort({ createdAt: -1 }),
          Message.countDocuments({
            job: job._id,
            recipient: req.user._id,
            readAt: null
          })
        ]);

        const otherUser =
          req.user.role === "cleaner" ? job.customer : job.assignedCleaner;

        return {
          job,
          otherUser,
          lastMessage,
          unreadCount
        };
      })
    );

    conversations.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || a.job.updatedAt;
      const bTime = b.lastMessage?.createdAt || b.job.updatedAt;
      return new Date(bTime) - new Date(aTime);
    });

    res.json({
      success: true,
      count: conversations.length,
      unreadCount: conversations.reduce((total, item) => total + item.unreadCount, 0),
      conversations
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to retrieve conversations." });
  }
};

module.exports = { getMessages, sendMessage, getConversations };
