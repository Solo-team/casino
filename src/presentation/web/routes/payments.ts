import { Router, Request, Response } from "express";
import { PaymentService, CryptoWebhookPayload } from "../../../application/services/PaymentService";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth";

interface PaymentRouterOptions {
  webhookSecret?: string;
  devMode?: boolean;
  signatureHeader?: string;
  verifyWebhookSignature?: (params: { req: Request; rawBody?: string | Buffer; signature?: string }) => boolean;
}

const mapStatus = (status?: string): CryptoWebhookPayload["status"] | null => {
  if (!status) return null;
  const normalized = status.toLowerCase();
  if (["confirmed", "completed", "paid", "paid_over", "success", "finished"].includes(normalized)) {
    return "confirmed";
  }
  if (
    [
      "processing",
      "pending",
      "confirming",
      "waiting",
      "partially_paid",
      "check",
      "check_processing",
      "paid_status_unknown"
    ].includes(normalized)
  ) {
    return "processing";
  }
  if (
    ["failed", "canceled", "cancelled", "rejected", "refunded", "wrong_payment", "wrong_amount"].includes(
      normalized
    )
  ) {
    return "failed";
  }
  if (["expired", "timeout", "expire"].includes(normalized)) {
    return "expired";
  }
  return null;
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
      const providedSecret =
        (req.headers[signatureHeader] as string | undefined) ||
        (req.headers["x-signature"] as string | undefined);

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

      const payload = req.body as Partial<CryptoWebhookPayload> &
        Record<string, string | number | undefined> & { status?: string };

      const normalizedStatus =
        mapStatus(payload.status ?? (payload as Record<string, string>).payment_status) || null;
      if (!normalizedStatus) {
        res.status(400).json({ error: "Unsupported status" });
        return;
      }

      const payment = await paymentService.handleCryptoWebhook({
        paymentId: payload.paymentId ?? (payload as Record<string, string>).order_id,
        providerPaymentId:
          payload.providerPaymentId ??
          (payload as Record<string, string | number | undefined>).payment_id?.toString(),
        status: normalizedStatus,
        txHash:
          payload.txHash ??
          (payload as Record<string, string>).txHash ??
          (payload as Record<string, string>).tx_hash ??
          (payload as Record<string, string>).payin_hash
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
