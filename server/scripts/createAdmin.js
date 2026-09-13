const crypto = require("crypto");
const path = require("path");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const User = require("../models/User");
const AdminAuditLog = require("../models/AdminAuditLog");

const getArgument = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const run = async () => {
  const email = (getArgument("--email") || "admin@cleanconnect.local").trim().toLowerCase();
  const suppliedPassword = getArgument("--password");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Provide a valid administrator email.");
  if (!process.argv.includes("--confirm")) {
    throw new Error("Add --confirm to acknowledge that this creates a full-access administrator.");
  }
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing from server/.env.");

  if (
    suppliedPassword &&
    (suppliedPassword.length < 12 ||
      !/[A-Z]/.test(suppliedPassword) ||
      !/[a-z]/.test(suppliedPassword) ||
      !/[0-9]/.test(suppliedPassword) ||
      !/[^A-Za-z0-9]/.test(suppliedPassword))
  ) {
    throw new Error(
      "The supplied password must have at least 12 characters, uppercase, lowercase, number, and symbol."
    );
  }

  await mongoose.connect(process.env.MONGO_URI, {
    dbName: "cleanconnect",
    serverSelectionTimeoutMS: 15000
  });

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role === "admin") {
      console.log(`${email} is already an administrator. No password was changed.`);
      return;
    }
    const previousRole = existing.role;
    existing.role = "admin";
    existing.isActive = true;
    await existing.save();
    await AdminAuditLog.create({
      action: "admin.promoted",
      targetType: "User",
      targetId: existing._id,
      details: { email, previousRole, source: "local-bootstrap" }
    });
    console.log(`Existing account ${email} was promoted. Use its current password.`);
    return;
  }

  const password = suppliedPassword || crypto.randomBytes(18).toString("base64url");
  const user = await User.create({
    firstName: "System",
    lastName: "Administrator",
    email,
    password: await bcrypt.hash(password, 12),
    role: "admin",
    isActive: true,
    isVerified: true
  });
  await AdminAuditLog.create({
    action: "admin.created",
    targetType: "User",
    targetId: user._id,
    details: { email, source: "local-bootstrap" }
  });

  console.log("Administrator account created.");
  console.log(`Email: ${email}`);
  if (suppliedPassword) {
    console.log("The administrator password was set to the supplied value and was not printed.");
  } else {
    console.log(`One-time development password: ${password}`);
    console.log("Save this password securely. It will not be displayed again.");
  }
};

run()
  .catch((error) => {
    console.error(`Admin creation failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
