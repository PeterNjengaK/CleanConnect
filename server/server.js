const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const cleanerRoutes = require("./routes/cleanerRoutes");
const jobRoutes = require("./routes/jobRoutes");
const messageRoutes = require("./routes/messageRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const adminRoutes = require("./routes/adminRoutes");
const reportRoutes = require("./routes/reportRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const { handleStripeWebhook } = require("./controllers/paymentController");

dotenv.config();

connectDB();

const app = express();

const PORT = process.env.PORT || 5000;

app.disable("x-powered-by");

const allowedOrigins = (process.env.CLIENT_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin not allowed by CORS."));
    }
  })
);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.post("/api/payments/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);
app.use(express.json({ limit: "100kb" }));

app.get("/", (req, res) => {
  res.json({
    message: "CleanConnect API is running!"
  });
});

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "CleanConnect backend is working!"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/cleaners", cleanerRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/jobs", messageRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/payments", paymentRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const isCorsError = error.message === "Origin not allowed by CORS.";
  res.status(isCorsError ? 403 : 500).json({
    success: false,
    message: isCorsError ? error.message : "Unexpected server error."
  });
});

app.listen(PORT, () => {
  console.log(
    `CleanConnect server running on http://localhost:${PORT}`
  );
});
