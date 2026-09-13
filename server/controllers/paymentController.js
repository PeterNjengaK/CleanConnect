const Job = require("../models/Job");
const Offer = require("../models/Offer");
const Payment = require("../models/Payment");
const User = require("../models/User");
const { getStripe, isStripeConfigured, getPlatformFeePercent } = require("../config/stripe");

const clientUrl = () => (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");

const unavailable = (res) => res.status(503).json({
  success: false,
  code: "PAYMENTS_NOT_CONFIGURED",
  message: "Payments are not configured yet. Add Stripe test credentials to the server."
});

const getPaymentConfig = async (req, res) => {
  res.json({
    success: true,
    configured: isStripeConfigured(),
    currency: "usd",
    platformFeePercent: getPlatformFeePercent()
  });
};

const createConnectOnboardingLink = async (req, res) => {
  try {
    if (!isStripeConfigured()) return unavailable(res);
    const stripe = getStripe();
    const user = await User.findById(req.user._id).select("+stripeAccountId");

    if (!user.stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        business_profile: { product_description: "Local cleaning services through CleanConnect" },
        metadata: { cleanConnectUserId: user._id.toString() }
      });
      user.stripeAccountId = account.id;
      await user.save({ validateBeforeSave: false });
    }

    const link = await stripe.accountLinks.create({
      account: user.stripeAccountId,
      refresh_url: `${clientUrl()}/cleaner/dashboard?payouts=refresh`,
      return_url: `${clientUrl()}/cleaner/dashboard?payouts=return`,
      type: "account_onboarding"
    });

    res.json({ success: true, url: link.url });
  } catch (error) {
    console.error(error);
    res.status(502).json({ success: false, message: "Unable to start Stripe payout onboarding." });
  }
};

const getConnectStatus = async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      return res.json({ success: true, configured: false, connected: false, payoutsEnabled: false });
    }
    const user = await User.findById(req.user._id).select("+stripeAccountId");
    if (!user.stripeAccountId) {
      return res.json({ success: true, configured: true, connected: false, payoutsEnabled: false });
    }
    const account = await getStripe().accounts.retrieve(user.stripeAccountId);
    res.json({
      success: true,
      configured: true,
      connected: Boolean(account.details_submitted),
      payoutsEnabled: Boolean(account.payouts_enabled),
      chargesEnabled: Boolean(account.charges_enabled),
      requirementsDue: account.requirements?.currently_due || []
    });
  } catch (error) {
    console.error(error);
    res.status(502).json({ success: false, message: "Unable to retrieve payout status." });
  }
};

const createCheckoutSession = async (req, res) => {
  try {
    if (!isStripeConfigured()) return unavailable(res);
    const job = await Job.findOne({
      _id: req.params.jobId,
      customer: req.user._id,
      status: { $in: ["assigned", "in-progress"] }
    });
    if (!job || !job.assignedCleaner || !job.agreedAmount) {
      return res.status(409).json({ success: false, message: "This job is not ready for payment." });
    }
    if (job.paymentStatus === "paid") {
      return res.status(409).json({ success: false, message: "This job has already been paid." });
    }

    const cleaner = await User.findById(job.assignedCleaner).select("+stripeAccountId");
    if (!cleaner?.stripeAccountId) {
      return res.status(409).json({
        success: false,
        code: "CLEANER_PAYOUTS_NOT_READY",
        message: "The cleaner must finish payout setup before checkout."
      });
    }
    const account = await getStripe().accounts.retrieve(cleaner.stripeAccountId);
    if (!account.payouts_enabled) {
      return res.status(409).json({
        success: false,
        code: "CLEANER_PAYOUTS_NOT_READY",
        message: "The cleaner's payout account is not ready yet."
      });
    }

    const amount = Math.round(job.agreedAmount * 100);
    const platformFee = Math.round(amount * (getPlatformFeePercent() / 100));
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: req.user.email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amount,
          product_data: { name: job.title, description: job.serviceType }
        }
      }],
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: { destination: cleaner.stripeAccountId },
        metadata: { cleanConnectJobId: job._id.toString() }
      },
      metadata: {
        cleanConnectJobId: job._id.toString(),
        customerId: req.user._id.toString(),
        cleanerId: cleaner._id.toString()
      },
      success_url: `${clientUrl()}/customer/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl()}/customer/dashboard?payment=cancelled`
    });

    await Payment.findOneAndUpdate(
      { job: job._id },
      {
        $set: {
          customer: req.user._id,
          cleaner: cleaner._id,
          amount,
          platformFee,
          currency: "usd",
          status: "pending",
          stripeCheckoutSessionId: session.id
        }
      },
      { upsert: true, returnDocument: "after", runValidators: true }
    );
    job.paymentStatus = "pending";
    await job.save();

    res.status(201).json({ success: true, url: session.url });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(404).json({ success: false, message: "Job not found." });
    }
    console.error(error);
    res.status(502).json({ success: false, message: "Unable to create secure checkout." });
  }
};

const getJobPayment = async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.jobId,
      $or: [{ customer: req.user._id }, { assignedCleaner: req.user._id }]
    });
    if (!job) return res.status(404).json({ success: false, message: "Job not found." });
    const payment = await Payment.findOne({ job: job._id }).select("status amount platformFee currency paidAt refundedAt refundAmount");
    res.json({ success: true, paymentStatus: job.paymentStatus, payment });
  } catch (error) {
    if (error?.name === "CastError") return res.status(404).json({ success: false, message: "Job not found." });
    res.status(500).json({ success: false, message: "Unable to retrieve payment status." });
  }
};

const handleStripeWebhook = async (req, res) => {
  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
      const session = event.data.object;
      if (session.payment_status === "paid") {
        const payment = await Payment.findOneAndUpdate(
          { stripeCheckoutSessionId: session.id },
          {
            $set: {
              status: "paid",
              stripePaymentIntentId: session.payment_intent,
              paidAt: new Date()
            }
          },
          { returnDocument: "after" }
        );
        if (payment) await Job.updateOne({ _id: payment.job }, { $set: { paymentStatus: "paid" } });
      }
    }
    if (event.type === "checkout.session.async_payment_failed") {
      const payment = await Payment.findOneAndUpdate(
        { stripeCheckoutSessionId: event.data.object.id },
        { $set: { status: "failed" } },
        { returnDocument: "after" }
      );
      if (payment) await Job.updateOne({ _id: payment.job }, { $set: { paymentStatus: "failed" } });
    }
    if (event.type === "charge.refunded") {
      const charge = event.data.object;
      const payment = await Payment.findOneAndUpdate(
        { stripePaymentIntentId: charge.payment_intent },
        {
          $set: {
            status: charge.amount_refunded === charge.amount ? "refunded" : "partially-refunded",
            stripeChargeId: charge.id,
            refundAmount: charge.amount_refunded,
            refundedAt: new Date()
          }
        },
        { returnDocument: "after" }
      );
      if (payment && charge.amount_refunded === charge.amount) {
        await Job.updateOne({ _id: payment.job }, { $set: { paymentStatus: "refunded" } });
      }
    }
    res.json({ received: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ received: false });
  }
};

module.exports = {
  getPaymentConfig,
  createConnectOnboardingLink,
  getConnectStatus,
  createCheckoutSession,
  getJobPayment,
  handleStripeWebhook
};
