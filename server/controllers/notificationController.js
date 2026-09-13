const Notification = require("../models/Notification");

const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate("job", "title serviceDate preferredTime city state status")
      .sort({ createdAt: -1 })
      .limit(30);
    res.json({
      success: true,
      unreadCount: notifications.filter((notification) => !notification.isRead).length,
      notifications
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to retrieve notifications." });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.notificationId, recipient: req.user._id },
      { $set: { isRead: true } },
      { returnDocument: "after" }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }
    res.json({ success: true, notification });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Unable to update notification." });
  }
};

module.exports = { getMyNotifications, markNotificationRead };
