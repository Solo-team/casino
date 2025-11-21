import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type {
  ApiPayment,
  CreateCryptoDepositResponse,
  PaymentStatus
} from "../../types/api";
import { formatCurrency } from "../utils/format";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreateDeposit: (amount: number) => Promise<CreateCryptoDepositResponse>;
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

const DepositModal: React.FC<Props> = ({
  open,
  onClose,
  onCreateDeposit,
  onRefreshPayment,
  onBalanceRefresh
}) => {
  const [amount, setAmount] = useState<number>(DEFAULT_AMOUNT);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isRefreshing, setRefreshing] = useState(false);
  const [deposit, setDeposit] = useState<CreateCryptoDepositResponse | null>(null);
  const [payment, setPayment] = useState<ApiPayment | null>(null);

  useEffect(() => {
    if (open) {
      setAmount(DEFAULT_AMOUNT);
      setError(null);
      setDeposit(null);
      setPayment(null);
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
    try {
      setSubmitting(true);
      setError(null);
      const response = await onCreateDeposit(amount);
      setDeposit(response);
      setPayment(response.payment);
    } catch (err) {
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

  const status = (payment?.status ?? "PENDING") as PaymentStatus;
  const tone = statusTone[status];
  const expiresAt = payment?.expiresAt ? new Date(payment.expiresAt) : null;
  const statusLabel = statusText[status] ?? "Waiting for payment";

  const instructions = deposit?.instructions;

  const content = (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__content deposit-modal__content">
        <button className="close-btn" aria-label="Close" onClick={onClose}>
          &times;
        </button>
        <header className="deposit-modal__header">
          <div>
            <p className="eyebrow">Crypto top-up</p>
            <h2>Fund your balance</h2>
            <p className="muted">Send stablecoins and your bankroll updates automatically.</p>
          </div>
          <div className={`status-chip status-chip--${tone}`}>
            <span className="dot" />
            <span>{statusLabel}</span>
          </div>
        </header>

        {!deposit && (
          <form className="deposit-form" onSubmit={handleSubmit}>
            <label>
              Amount
              <div className="input-with-addon">
                <input
                  className="input"
                  type="number"
                  min={10}
                  step="10"
                  value={amount}
                  onChange={event => setAmount(Number(event.target.value))}
                  placeholder="Amount in USDT"
                  required
                />
                <span className="addon">USDT</span>
              </div>
            </label>
            <p className="muted deposit-hint">
              Only stablecoin deposits are accepted at the moment. A memo tag will be attached to your request.
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
            <div className="instruction-grid">
              <div className="instruction-card">
                <p className="eyebrow">Send to</p>
                <div className="mono">{instructions.address}</div>
                <small className="muted">{instructions.network || "USDT network"}</small>
              </div>
              {instructions.memo && (
                <div className="instruction-card">
                  <p className="eyebrow">Memo / Reference</p>
                  <div className="mono">{instructions.memo}</div>
                  <small className="muted">Include this tag so we can match the deposit.</small>
                </div>
              )}
              <div className="instruction-card">
                <p className="eyebrow">Amount</p>
                <strong>{formatCurrency(instructions.amount)}</strong>
                <small className="muted">{instructions.currency}</small>
              </div>
              {expiresAt && (
                <div className="instruction-card">
                  <p className="eyebrow">Expires</p>
                  <div>{expiresAt.toLocaleString()}</div>
                  <small className="muted">Send before this time to avoid delays.</small>
                </div>
              )}
            </div>

            {deposit.instructions.checkoutUrl && (
              <a
                className="button button-secondary full-width"
                href={deposit.instructions.checkoutUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open hosted checkout
              </a>
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
              <div className="success-banner">
                <strong>Funds credited.</strong> Your balance has been updated.
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
