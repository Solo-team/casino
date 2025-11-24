import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ApiPayment, CreateDepositResponse, DepositMethod, PaymentStatus } from "../../types/api";
import { formatCurrency } from "../utils/format";
import { ApiError } from "../services/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreateDeposit: (params: { amount: number; method: DepositMethod }) => Promise<CreateDepositResponse>;
  onRefreshPayment: (paymentId: string) => Promise<ApiPayment>;
  onBalanceRefresh: () => Promise<void>;
}

const statusText: Record<PaymentStatus, string> = {
  PENDING: "Waiting for payment",
  PROCESSING: "Payment detected",
  COMPLETED: "Completed",
  FAILED: "Failed",
  EXPIRED: "Expired"
};

const statusTone: Record<PaymentStatus, "neutral" | "warning" | "positive" | "negative"> = {
  PENDING: "neutral",
  PROCESSING: "warning",
  COMPLETED: "positive",
  FAILED: "negative",
  EXPIRED: "negative"
};

const DEFAULT_AMOUNT = 50;
const QUICK_AMOUNTS = [25, 50, 100, 250, 500, 1000];

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

const DepositModal: React.FC<Props> = ({
  open,
  onClose,
  onCreateDeposit,
  onRefreshPayment,
  onBalanceRefresh
}) => {
  const [amount, setAmount] = useState<number>(DEFAULT_AMOUNT);
  const [method, setMethod] = useState<DepositMethod>("cryptomus");
  const [step, setStep] = useState<"method" | "form">("method");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isRefreshing, setRefreshing] = useState(false);
  const [deposit, setDeposit] = useState<CreateDepositResponse | null>(null);
  const [payment, setPayment] = useState<ApiPayment | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAmount(DEFAULT_AMOUNT);
      setError(null);
      setDeposit(null);
      setPayment(null);
      setMethod("cryptomus");
      setStep("method");
    }
  }, [open]);

  useEffect(() => {
    if (!payment || payment.status !== "COMPLETED" || !open) {
      return;
    }
    void onBalanceRefresh();
  }, [onBalanceRefresh, open, payment]);

  useEffect(() => {
    if (!deposit || !open) return;

    const intervalId = window.setInterval(() => {
      void handleRefreshStatus();
    }, 6000);

    return () => window.clearInterval(intervalId);
  }, [deposit, open]);

  if (!open) return null;

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!method) {
      setError("Select a payment method");
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      const response = await onCreateDeposit({ amount, method });
      setDeposit(response);
      setPayment(response.payment);
      
      if (response.instructions.checkoutUrl) {
        setTimeout(() => {
          window.open(response.instructions.checkoutUrl, "_blank");
        }, 500);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError("This payment method is not enabled on the server. Please switch method or contact support.");
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to create deposit");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!deposit) return;
    setRefreshing(true);
    try {
      const updated = await onRefreshPayment(deposit.payment.id);
      setPayment(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to refresh payment");
    } finally {
      setRefreshing(false);
    }
  };

  const handleCopy = async (text: string, field: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const status = (payment?.status ?? "PENDING") as PaymentStatus;
  const tone = statusTone[status];
  const expiresAt = payment?.expiresAt ? new Date(payment.expiresAt) : null;
  const statusLabel = statusText[status] ?? "Waiting for payment";
  const instructions = deposit?.instructions;
  const hasAddress = Boolean(instructions?.address);
  const paymentMethod = payment?.method || deposit?.payment.method;
  const isPaypal = paymentMethod === "PAYPAL" || method === "paypal";
  const currentCurrency = instructions?.currency ?? (isPaypal ? "USD" : "USDT");
  const minAmount = isPaypal ? 5 : 10;
  const amountStep = isPaypal ? "1" : "10";
  const checkoutCardTitle = isPaypal ? "Pay with PayPal" : "Pay via hosted checkout";
  const checkoutCardBody = isPaypal
    ? "Use the PayPal checkout link to approve and fund your balance."
    : "Open the checkout page to get the address and memo for this payment.";

  const handleSelectMethod = (value: DepositMethod) => {
    setMethod(value);
    setStep("form");
  };

  const MethodToggleRow = (
    <div className="method-toggle-group" role="group" aria-label="Select payment method">
      <button
        type="button"
        className={`method-toggle ${method === "cryptomus" ? "active" : ""}`}
        onClick={() => handleSelectMethod("cryptomus")}
        disabled={isSubmitting}
      >
        <span className="emoji">🪙</span>
        Cryptomus · USDT
      </button>
      <button
        type="button"
        className={`method-toggle ${method === "paypal" ? "active" : ""}`}
        onClick={() => handleSelectMethod("paypal")}
        disabled={isSubmitting}
      >
        <span className="emoji">💳</span>
        PayPal · USD
      </button>
    </div>
  );

  const content = (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__content deposit-modal__content">
        <button className="close-btn" aria-label="Close" onClick={onClose}>
          &times;
        </button>
        <header className="deposit-modal__header">
          <div>
            <p className="eyebrow">Add funds</p>
            <h2>Fund your balance</h2>
            <p className="muted">
              {isPaypal
                ? "Pay with PayPal and come back after approval to refresh status."
                : "Send stablecoins and your bankroll updates automatically."}
            </p>
          </div>
          {deposit && (
            <div className="status-indicator">
              <div className={`status-chip status-chip--${tone}`}>
                <span className="dot" />
                <span>{statusLabel}</span>
              </div>
              <div className="status-progress">
                <div
                  className={`status-progress__bar status-progress__bar--${status.toLowerCase()}`}
                  style={{
                    width:
                      status === "PENDING"
                        ? "20%"
                        : status === "PROCESSING"
                        ? "60%"
                        : status === "COMPLETED"
                        ? "100%"
                        : "0%"
                  }}
                />
              </div>
            </div>
          )}
          {!deposit && (
            <div className={`status-chip status-chip--neutral`}>
              <span className="dot" />
              <span>Ready</span>
            </div>
          )}
        </header>

        {!deposit && MethodToggleRow}

        {!deposit && step === "method" && (
          <div className="deposit-form">
            <p className="muted">Choose how you want to top up.</p>
            <div className="method-grid">
              <button
                type="button"
                className={`method-card ${method === "cryptomus" ? "selected" : ""}`}
                onClick={() => handleSelectMethod("cryptomus")}
                disabled={isSubmitting}
              >
                <div className="method-card__icon">🪙</div>
                <div className="method-card__content">
                  <p className="eyebrow">Cryptomus</p>
                  <strong>USDT</strong>
                  <p className="muted small">Send stablecoins with memo tag. Instant deposits.</p>
                  <div className="method-card__badges">
                    <span className="method-badge">Fast</span>
                    <span className="method-badge">Secure</span>
                  </div>
                </div>
              </button>
              <button
                type="button"
                className={`method-card ${method === "paypal" ? "selected" : ""}`}
                onClick={() => handleSelectMethod("paypal")}
                disabled={isSubmitting}
              >
                <div className="method-card__icon">💳</div>
                <div className="method-card__content">
                  <p className="eyebrow">PayPal</p>
                  <strong>USD</strong>
                  <p className="muted small">Approve with your PayPal account. Trusted payment.</p>
                  <div className="method-card__badges">
                    <span className="method-badge">Popular</span>
                    <span className="method-badge">Easy</span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {!deposit && step === "form" && (
          <form className="deposit-form" onSubmit={handleSubmit}>
            <div className="pill-row">
              <span className="pill">
                {method === "paypal" ? "PayPal" : "Cryptomus"} deposit
              </span>
              <button
                type="button"
                className="link-button"
                onClick={() => setStep("method")}
                disabled={isSubmitting}
              >
                Change method
              </button>
            </div>
            <div className="quick-amounts-row">
              <p className="eyebrow">Quick amounts</p>
              <div className="quick-amounts">
                {QUICK_AMOUNTS.map(quickAmount => (
                  <button
                    key={quickAmount}
                    type="button"
                    className={`quick-amount-btn ${amount === quickAmount ? "active" : ""}`}
                    onClick={() => setAmount(quickAmount)}
                    disabled={isSubmitting}
                  >
                    {formatCurrency(quickAmount)}
                  </button>
                ))}
              </div>
            </div>
            <label>
              Amount
              <div className="input-with-addon">
                <input
                  className="input"
                  type="number"
                  min={minAmount}
                  step={amountStep}
                  value={amount}
                  onChange={event => setAmount(Number(event.target.value))}
                  placeholder={`Amount in ${currentCurrency}`}
                  required
                />
                <span className="addon">{currentCurrency}</span>
              </div>
            </label>
            <p className="muted deposit-hint">
              {method === "paypal"
                ? "You will be redirected to PayPal to complete the payment. After approval, return here to check status."
                : "You will be redirected to Cryptomus checkout page. Complete payment there, then return here to check status."}
            </p>
            {error && (
              <div className="error-message" role="alert">
                <span>!</span>
                <span>{error}</span>
              </div>
            )}
            <div className="deposit-actions">
              <button className="button button-secondary" type="button" onClick={onClose}>
                Cancel
              </button>
              <button className="button button-primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create deposit"}
              </button>
            </div>
          </form>
        )}

        {deposit && instructions && (
          <div className="deposit-instructions">
            {instructions.checkoutUrl ? (
              <div className="checkout-redirect">
                <div className="checkout-redirect__info">
                  <div className="checkout-redirect__icon">↗</div>
                  <div>
                    <strong>Redirecting to {isPaypal ? "PayPal" : "Cryptomus"}...</strong>
                    <p className="muted small">
                      {isPaypal
                        ? "Complete payment on PayPal, then return here to check status."
                        : "Complete payment on Cryptomus, then return here to check status."}
                    </p>
                  </div>
                </div>
                <a
                  className="button button-primary full-width"
                  href={instructions.checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {isPaypal ? "Continue to PayPal" : "Continue to Cryptomus"}
                </a>
                <button
                  className="button button-secondary full-width"
                  type="button"
                  onClick={() => {
                    if (instructions.checkoutUrl) {
                      window.open(instructions.checkoutUrl, "_blank");
                    }
                  }}
                >
                  Open in new tab
                </button>
              </div>
            ) : (
              <div className="instruction-grid">
              {hasAddress && (
                <div className="instruction-card instruction-card--highlight">
                  <div className="instruction-card__header">
                    <p className="eyebrow">Send to</p>
                    <button
                      type="button"
                      className="copy-btn"
                      onClick={() => instructions.address && handleCopy(instructions.address, "address")}
                      title="Copy address"
                    >
                      {copiedField === "address" ? "✓" : "📋"}
                    </button>
                  </div>
                  <div className="mono instruction-value">{instructions.address}</div>
                  <small className="muted">{instructions.network || "USDT network"}</small>
                </div>
              )}
              {instructions.memo && hasAddress && (
                <div className="instruction-card instruction-card--highlight">
                  <div className="instruction-card__header">
                    <p className="eyebrow">Memo / Reference</p>
                    <button
                      type="button"
                      className="copy-btn"
                      onClick={() => instructions.memo && handleCopy(instructions.memo, "memo")}
                      title="Copy memo"
                    >
                      {copiedField === "memo" ? "✓" : "📋"}
                    </button>
                  </div>
                  <div className="mono instruction-value">{instructions.memo}</div>
                  <small className="muted">Include this tag so we can match the deposit.</small>
                </div>
              )}
              <div className="instruction-card">
                <p className="eyebrow">Amount</p>
                <strong className="instruction-amount">{formatCurrency(instructions.amount)}</strong>
                <small className="muted">{instructions.currency}</small>
              </div>
              {expiresAt && (
                <div className="instruction-card">
                  <p className="eyebrow">Expires</p>
                  <div className="instruction-time">{expiresAt.toLocaleString()}</div>
                  <small className="muted">Send before this time to avoid delays.</small>
                </div>
              )}
              </div>
            )}

            <div className="deposit-status-panel">
              <div>
                <p className="eyebrow">Payment</p>
                <div className="mono">{payment?.providerPaymentId || deposit.payment.id}</div>
                <small className="muted">Status: {statusLabel}</small>
                {payment?.provider && <small className="muted">Provider: {payment.provider}</small>}
              </div>
              <div className="status-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={handleRefreshStatus}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? "Checking..." : "Refresh status"}
                </button>
                <button className="button button-primary" type="button" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
            {payment?.txHash && (
              <div className="instruction-card">
                <p className="eyebrow">Blockchain proof</p>
                <div className="mono">{payment.txHash}</div>
                <small className="muted">Verify this hash in your block explorer to see the on-chain transfer.</small>
              </div>
            )}
            {payment?.status === "COMPLETED" && (
              <div className="success-banner success-banner--animated">
                <div className="success-banner__icon">✓</div>
                <div>
                  <strong>Funds credited.</strong> Your balance has been updated.
                </div>
              </div>
            )}
            {payment?.status === "PROCESSING" && (
              <div className="processing-banner">
                <div className="processing-banner__spinner" />
                <div>
                  <strong>Payment detected.</strong> Waiting for blockchain confirmation...
                </div>
              </div>
            )}
            {error && (
              <div className="error-message" role="alert">
                <span>!</span>
                <span>{error}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default DepositModal;
