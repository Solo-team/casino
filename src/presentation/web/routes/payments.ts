import { Router, Request, Response } from "express";
import { PaymentService, CryptoWebhookPayload } from "../../../application/services/PaymentService";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth";

interface PaymentRouterOptions {
  webhookSecret?: string;
  devMode?: boolean;
  signatureHeader?: string;
  verifyWebhookSignature?: (params: { req: Request; rawBody?: string | Buffer; signature?: string | string[] }) => boolean;
}

const normalizeStatusValue = (value?: string | number | null): string | null => {
  if (value === undefined || value === null) return null;
  const text = typeof value === "number" ? value.toString() : value;
  return text.trim().toLowerCase().replace(/[\s-]+/g, "_");
};

const confirmedStatuses = new Set([
  "confirmed",
  "completed",
  "paid",
  "paid_over",
  "paid_overpayment",
  "success",
  "finished",
  "finish",
  "complete",
  "confirm_check"
]);

const processingStatuses = new Set([
  "processing",
  "pending",
  "confirming",
  "waiting",
  "partially_paid",
  "part_paid",
  "check",
  "check_processing",
  "checking",
  "paid_status_unknown",
  "process",
  "invoice",
  "invoice_created",
  "link_waiting",
  "hold",
  "on_hold"
]);

const failedStatuses = new Set([
  "failed",
  "fail",
  "canceled",
  "cancelled",
  "cancel",
  "rejected",
  "reject",
  "refunded",
  "refund",
  "wrong_payment",
  "wrong_amount",
  "wrong_amount_less",
  "wrong_amount_more",
  "error",
  "not_paid",
  "payment_failed",
  "declined",
  "void",
  "payment_canceled",
  "payment_cancelled"
]);

const expiredStatuses = new Set(["expired", "timeout", "expire", "timed_out", "overdue", "time_expired"]);

const mapStatus = (
  status?: string | number | null,
  context?: { state?: string | number | null }
): CryptoWebhookPayload["status"] | null => {
  const candidates = [
    normalizeStatusValue(status),
    normalizeStatusValue(context?.state)
  ].filter(Boolean) as string[];

  for (const value of candidates) {
    if (confirmedStatuses.has(value)) return "confirmed";
    if (processingStatuses.has(value)) return "processing";
    if (failedStatuses.has(value)) return "failed";
    if (expiredStatuses.has(value)) return "expired";
  }

  return null;
};

const toOptionalString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  return String(value);
};

export function createPaymentsRouter(
  paymentService: PaymentService,
  options: PaymentRouterOptions
): Router {
  const router = Router();

  router.post(
    "/crypto/deposits",
    authMiddleware,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        if (!req.userId) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }
        const { amount, currency } = req.body;
        const deposit = await paymentService.createCryptoDeposit({
          userId: req.userId,
          amount,
          currency
        });
        res.status(201).json({
          payment: deposit.payment.toJSON(),
          instructions: deposit.instructions
        });
      } catch (error: any) {
        res.status(400).json({ error: error.message || "Unable to create deposit" });
      }
    }
  );

  router.get("/", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const payments = await paymentService.listUserPayments(req.userId);
      res.json(payments.map(payment => payment.toJSON()));
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Unable to load payments" });
    }
  });

  router.get("/:paymentId", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const payment = await paymentService.findPaymentForUser(req.params.paymentId, req.userId);
      res.json(payment.toJSON());
    } catch (error: any) {
      res.status(404).json({ error: error.message || "Payment not found" });
    }
  });

  router.post("/crypto/webhook", async (req: Request, res: Response) => {
    try {
      const rawBody = (req as Request & { rawBody?: string | Buffer }).rawBody;
      const signatureHeader = options.signatureHeader ?? "x-webhook-secret";
      const providedSecretHeader = req.headers[signatureHeader] ?? req.headers["x-signature"];
      const providedSecret = Array.isArray(providedSecretHeader)
        ? providedSecretHeader[0]
        : (providedSecretHeader as string | undefined);

      if (options.verifyWebhookSignature) {
        const valid = options.verifyWebhookSignature({
          req,
          rawBody,
          signature: providedSecret
        });
        if (!valid) {
          res.status(401).json({ error: "Invalid webhook signature" });
          return;
        }
      } else if (options.webhookSecret && providedSecret !== options.webhookSecret) {
        res.status(401).json({ error: "Invalid webhook secret" });
        return;
      }

      const payload = req.body as Partial<CryptoWebhookPayload> & Record<string, unknown> & {
        status?: string | number;
      };

      const statusValue =
        payload.status ??
        (payload as Record<string, string | number | undefined>).payment_status ??
        (payload as Record<string, string | number | undefined>).paymentStatus;

      const normalizedStatus =
        mapStatus(statusValue, {
          state: (payload as Record<string, string | number | null | undefined>).state ?? null
        }) || null;
      if (!normalizedStatus) {
        res.status(400).json({ error: "Unsupported status" });
        return;
      }

      const payment = await paymentService.handleCryptoWebhook({
        paymentId:
          payload.paymentId ??
          (payload as Record<string, string | undefined>).order_id ??
          (payload as Record<string, string | undefined>).orderId,
        providerPaymentId:
          payload.providerPaymentId ??
          toOptionalString((payload as Record<string, unknown>).payment_id) ??
          toOptionalString((payload as Record<string, unknown>).uuid) ??
          toOptionalString((payload as Record<string, unknown>).payment_uuid),
        status: normalizedStatus,
        txHash:
          payload.txHash ??
          (payload as Record<string, string>).txHash ??
          (payload as Record<string, string>).tx_hash ??
          (payload as Record<string, string>).payin_hash ??
          toOptionalString((payload as Record<string, unknown>).txid) ??
          toOptionalString((payload as Record<string, unknown>).transaction_hash) ??
          toOptionalString((payload as Record<string, unknown>).hash)
      });
      res.json(payment.toJSON());
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Webhook processing failed" });
    }
  });

  router.post("/:paymentId/confirm", async (req: Request, res: Response) => {
    if (!options.devMode) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    try {
      const payment = await paymentService.handleCryptoWebhook({
        paymentId: req.params.paymentId,
        status: "confirmed",
        txHash: (req.body as { txHash?: string }).txHash
      });
      res.json(payment.toJSON());
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Unable to confirm payment" });
    }
  });

  return router;
}
