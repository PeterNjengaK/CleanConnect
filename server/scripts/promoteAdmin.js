const path = require("path");
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
  const email = getArgument("--email")?.trim().toLowerCase();
  const confirmed = process.argv.includes("--confirm");

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error(
      "Provide a valid email: npm run admin:promote -- --email you@example.com --confirm"
    );
  }

  if (!confirmed) {
    throw new Error("Add --confirm to acknowledge that this grants full administrator access.");
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing from server/.env.");
  }

  await mongoose.connect(process.env.MONGO_URI, { dbName: "cleanconnect" });

  const user = await User.findOne({ email });
  if (!user) {
    throw new Error(`No CleanConnect account exists for ${email}. Register it first.`);
  }

  if (!user.isActive) {
    throw new Error("Enable this account before promoting it.");
  }

  if (user.role === "admin") {
    console.log(`${email} is already an administrator.`);
    return;
  }

  const previousRole = user.role;
  user.role = "admin";
  await user.save();

  await AdminAuditLog.create({
    action: "admin.promoted",
    targetType: "User",
    targetId: user._id,
    details: { email, previousRole, source: "local-cli" }
  });

  console.log(`Administrator access granted to ${email}.`);
  console.log("Log out of any existing session, then log in again to refresh the account role.");
};

run()
  .catch((error) => {
    console.error(`Admin promotion failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
