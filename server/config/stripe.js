const Stripe = require("stripe");

const isStripeConfigured = () => Boolean(
  process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET
);

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    const error = new Error("Stripe test credentials have not been configured.");
    error.code = "STRIPE_NOT_CONFIGURED";
    throw error;
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

const getPlatformFeePercent = () => {
  const configured = Number(process.env.STRIPE_PLATFORM_FEE_PERCENT || 12);
  return Number.isFinite(configured) && configured >= 0 && configured <= 100 ? configured : 12;
};

module.exports = { getStripe, isStripeConfigured, getPlatformFeePercent };
