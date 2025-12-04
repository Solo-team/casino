import "reflect-metadata";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";
import { CasinoService } from "./application/services/CasinoService";
import { PaymentService } from "./application/services/PaymentService";
import { PaymentMethod } from "./domain/entities/PaymentTransaction";
import { loadNftSlotGames } from "./domain/games/loadNftCollections";
import { createApiRouter } from "./presentation/web/routes/api";
import { createPaymentsRouter } from "./presentation/web/routes/payments";
import { AppDataSource } from "./infrastructure/database/data-source";
import { TypeOrmUserRepository } from "./infrastructure/repositories/TypeOrmUserRepository";
import { TypeOrmGameResultRepository } from "./infrastructure/repositories/TypeOrmGameResultRepository";
import { TypeOrmPaymentRepository } from "./infrastructure/repositories/TypeOrmPaymentRepository";
import { StaticCryptoGateway } from "./infrastructure/payments/StaticCryptoGateway";
import { NowPaymentsGateway } from "./infrastructure/payments/NowPaymentsGateway";
import { CryptomusGateway } from "./infrastructure/payments/CryptomusGateway";
import { PayPalGateway } from "./infrastructure/payments/PayPalGateway";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
const clientDistPath = path.join(__dirname, "../client/dist");
const cryptoMinAmount = process.env.CRYPTO_MIN_AMOUNT ? Number(process.env.CRYPTO_MIN_AMOUNT) : undefined;
const paypalMinAmount = process.env.PAYPAL_MIN_AMOUNT ? Number(process.env.PAYPAL_MIN_AMOUNT) : undefined;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const initializeDataSourceWithRetry = async (
  retries = 3,
  delayMs = 2000
): Promise<void> => {
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      if (AppDataSource.isInitialized) {
        return;
      }

      await AppDataSource.initialize();
      console.log("Connected to Neon PostgreSQL");
      return;
    } catch (error) {
      const isLastAttempt = attempt === retries + 1;
      const message = error instanceof Error ? error.message : String(error);

      console.error(`Database connection failed (attempt ${attempt}/${retries + 1}): ${message}`);

      if (isLastAttempt) {
        throw error;
      }

      console.log(`Retrying database connection in ${delayMs}ms...`);
      await sleep(delayMs);
    }
  }
};

app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));
app.use(express.json({
  verify: (req, _res, buf) => {
    (req as express.Request & { rawBody?: string }).rawBody = buf.toString();
  }
}));
app.use(express.static(clientDistPath));

const bootstrap = async (): Promise<void> => {
  try {
    await initializeDataSourceWithRetry();

    const userRepository = new TypeOrmUserRepository();
    const gameResultRepository = new TypeOrmGameResultRepository();
    const paymentRepository = new TypeOrmPaymentRepository();

    const games = await loadNftSlotGames();
    if (!games.length) {
      console.warn("No NFT slot games were loaded. Add nft_*.json files under the pyt directory.");
    }

    const casinoService = new CasinoService(
      userRepository,
      gameResultRepository,
      games,
      []
    );

    const devCryptoMode = process.env.CRYPTO_DEV_MODE === "true";
    const gatewayKind = (process.env.CRYPTO_GATEWAY || "static").toLowerCase();

    const staticGatewayFactory = () =>
      new StaticCryptoGateway({
        address: process.env.CRYPTO_DEPOSIT_ADDRESS || "",
        network: process.env.CRYPTO_NETWORK,
        provider: process.env.CRYPTO_PROVIDER,
        memoPrefix: process.env.CRYPTO_MEMO_PREFIX
      });

    const webhookUrl = process.env.CRYPTO_WEBHOOK_PUBLIC_URL;
    const paypalEnabled = Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

    const paypalGatewayFactory = () => {
      const clientId = process.env.PAYPAL_CLIENT_ID;
      const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw new Error("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required when enabling PayPal");
      }
      
      const returnUrl = process.env.PAYPAL_RETURN_URL ?? process.env.CRYPTO_RETURN_URL;
      const cancelUrl = process.env.PAYPAL_CANCEL_URL ?? process.env.CRYPTO_RETURN_URL;
      
      if (!returnUrl || returnUrl.includes("<") || returnUrl.includes("your-host") || returnUrl.includes("yourdomain")) {
        throw new Error(
          "PAYPAL_RETURN_URL is required and must be a valid URL. " +
          "Current value: " + returnUrl + ". " +
          "Example: http://localhost:5173/account?payment=success"
        );
      }
      
      if (!cancelUrl || cancelUrl.includes("<") || cancelUrl.includes("your-host") || cancelUrl.includes("yourdomain")) {
        throw new Error(
          "PAYPAL_CANCEL_URL is required and must be a valid URL. " +
          "Current value: " + cancelUrl + ". " +
          "Example: http://localhost:5173/account?payment=cancelled"
        );
      }
      
      return new PayPalGateway({
        clientId,
        clientSecret,
        baseUrl: process.env.PAYPAL_BASE_URL,
        returnUrl,
        cancelUrl
      });
    };

    const nowPaymentsFactory = () => {
      const apiKey = process.env.NOWPAYMENTS_API_KEY;
      if (!apiKey) {
        throw new Error("NOWPAYMENTS_API_KEY is required when CRYPTO_GATEWAY=nowpayments");
      }
      const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
      const payCurrency = process.env.CRYPTO_PAY_CURRENCY ?? process.env.CRYPTO_DEFAULT_CURRENCY;
      const hasIpnSecret = Boolean(ipnSecret);
      const gateway = new NowPaymentsGateway({
        apiKey,
        ipnSecret,
        callbackUrl: webhookUrl,
        payCurrency,
        network: process.env.CRYPTO_NETWORK
      });
      return {
        gateway,
        providerName: "nowpayments",
        webhookSecret: ipnSecret ?? process.env.CRYPTO_WEBHOOK_SECRET,
        signatureHeader: hasIpnSecret ? "x-nowpayments-sig" : undefined,
        verifyWebhookSignature: hasIpnSecret
          ? ({
              rawBody,
              signature
            }: {
              req: express.Request;
              rawBody?: string | Buffer;
              signature?: string | string[];
            }) => gateway.verifySignature(rawBody, signature)
          : undefined
      };
    };

    const cryptomusFactory = () => {
      const apiKey = process.env.CRYPTOMUS_API_KEY;
      const merchantId = process.env.CRYPTOMUS_MERCHANT_ID;
      if (!apiKey || !merchantId) {
        throw new Error("CRYPTOMUS_API_KEY and CRYPTOMUS_MERCHANT_ID are required when CRYPTO_GATEWAY=cryptomus");
      }
      const gateway = new CryptomusGateway({
        apiKey,
        merchantId,
        callbackUrl: webhookUrl,
        returnUrl: process.env.CRYPTO_RETURN_URL,
        successUrl: process.env.CRYPTO_SUCCESS_URL,
        network: process.env.CRYPTO_NETWORK ?? process.env.CRYPTOMUS_NETWORK,
        baseUrl: process.env.CRYPTOMUS_BASE_URL
      });
      const expectedMerchant = merchantId.toLowerCase();
      return {
        gateway,
        providerName: "cryptomus",
        webhookSecret: process.env.CRYPTO_WEBHOOK_SECRET,
        signatureHeader: "sign",
        verifyWebhookSignature: ({
          req,
          rawBody,
          signature
        }: {
          req: express.Request;
          rawBody?: string | Buffer;
          signature?: string | string[];
        }) => {
          const merchantHeader =
            (req.headers.merchant as string | undefined) ||
            (req.headers["x-merchant"] as string | undefined);
          if (merchantHeader && merchantHeader.toLowerCase() !== expectedMerchant) {
            return false;
          }
          return gateway.verifySignature(rawBody, signature);
        }
      };
    };

    const cryptoGatewayFactory = () => {
      if (gatewayKind === "nowpayments") {
        return nowPaymentsFactory();
      }
      if (gatewayKind === "cryptomus") {
        return cryptomusFactory();
      }
      return {
        gateway: staticGatewayFactory(),
        providerName: process.env.CRYPTO_PROVIDER ?? "manual-crypto",
        webhookSecret: process.env.CRYPTO_WEBHOOK_SECRET,
        signatureHeader: undefined,
        verifyWebhookSignature: undefined
      };
    };

    const {
      gateway: cryptoGateway,
      providerName,
      webhookSecret,
      signatureHeader,
      verifyWebhookSignature
    } = cryptoGatewayFactory();

    const paymentService = new PaymentService(
      userRepository,
      paymentRepository,
      cryptoGateway,
      {
        defaultCurrency: process.env.CRYPTO_DEFAULT_CURRENCY ?? "USDT",
        minimumAmount: cryptoMinAmount,
        devMode: devCryptoMode,
        providerName
      }
    );

    const paypalPaymentService = paypalEnabled
      ? new PaymentService(userRepository, paymentRepository, paypalGatewayFactory(), {
          defaultCurrency: process.env.PAYPAL_CURRENCY ?? "USD",
          minimumAmount: paypalMinAmount,
          providerName: "paypal",
          method: PaymentMethod.PAYPAL
        })
      : undefined;

    app.use("/api", createApiRouter(casinoService));
    app.use(
      "/api/payments",
      createPaymentsRouter(paymentService, {
        webhookSecret,
        signatureHeader,
        verifyWebhookSignature,
        devMode: devCryptoMode,
        paypalService: paypalPaymentService
      })
    );

    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientDistPath, "index.html"));
    });

    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
};

void bootstrap();
