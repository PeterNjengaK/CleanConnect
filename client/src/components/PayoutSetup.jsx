import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "../api";

/* oxlint-disable react/set-state-in-effect */

function PayoutSetup({ token }) {
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/connect/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) setStatus(data);
    } catch {
      setMessage("Unable to check payout status.");
    }
  }, [token]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const startOnboarding = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/connect/onboarding`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to start payout setup.");
      window.location.assign(data.url);
    } catch (error) {
      setMessage(error.message);
      setLoading(false);
    }
  };

  if (!status) return null;

  return (
    <section className={`payout-setup-card${status.payoutsEnabled ? " ready" : ""}`}>
      <div>
        <span className="payment-eyebrow">PAYMENTS & PAYOUTS</span>
        <h2>{status.payoutsEnabled ? "Payout account ready" : "Set up cleaner payouts"}</h2>
        <p>
          {!status.configured
            ? "Stripe test mode has not been configured by the platform administrator yet."
            : status.payoutsEnabled
              ? "Your Stripe account is ready to receive earnings from completed bookings."
              : "Connect securely with Stripe to verify your identity and add a bank account."}
        </p>
        {message && <small className="payment-error">{message}</small>}
      </div>
      {status.configured && !status.payoutsEnabled && (
        <button type="button" onClick={startOnboarding} disabled={loading}>
          {loading ? "Opening Stripe..." : status.connected ? "Finish Payout Setup" : "Set Up Payouts"}
        </button>
      )}
      {status.payoutsEnabled && <strong className="payment-ready-badge">Ready</strong>}
    </section>
  );
}

export default PayoutSetup;
