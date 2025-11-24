import { createHash } from "crypto";
import {
  CryptoDepositRequest,
  CryptoDepositResult,
  ICryptoPaymentGateway
} from "../../domain/interfaces/ICryptoPaymentGateway";

interface CryptomusGatewayOptions {
  apiKey: string;
  merchantId: string;
  callbackUrl?: string;
  returnUrl?: string;
  successUrl?: string;
  network?: string;
  baseUrl?: string;
}

interface CryptomusCreateResponse {
  state?: number;
  result?: {
    uuid?: string;
    url?: string;
    address?: string;
    network?: string;
    tag?: string;
    memo?: string;
    expired_at?: number;
    payment_amount?: number | string;
    payer_amount?: number | string;
    currency?: string;
    status?: string;
  };
}

export class CryptomusGateway implements ICryptoPaymentGateway {
  private readonly apiKey: string;
  private readonly merchantId: string;
  private readonly callbackUrl?: string;
  private readonly returnUrl?: string;
  private readonly successUrl?: string;
  private readonly baseUrl: string;
  private readonly network?: string;

  constructor(options: CryptomusGatewayOptions) {
    if (!options.apiKey) {
      throw new Error("CRYPTOMUS_API_KEY is not configured");
    }
    if (!options.merchantId) {
      throw new Error("CRYPTOMUS_MERCHANT_ID is not configured");
    }
    this.apiKey = options.apiKey;
    this.merchantId = options.merchantId;
    this.callbackUrl = options.callbackUrl;
    this.returnUrl = options.returnUrl;
    this.successUrl = options.successUrl;
    this.network = options.network;
    this.baseUrl = options.baseUrl ?? "https://api.cryptomus.com/v1";
  }

  async createDeposit(request: CryptoDepositRequest): Promise<CryptoDepositResult> {
    const amount = Number(request.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Cryptomus deposit amount must be positive");
    }
    const currency = request.currency.toUpperCase();

    const toNumber = (value?: number | string | null): number | undefined => {
      if (value === undefined || value === null) return undefined;
      const parsed = typeof value === "string" ? Number(value) : value;
      return Number.isFinite(parsed) ? Number(parsed) : undefined;
    };

    const endpoint = `${this.baseUrl}/payment`;
    const payload = {
      amount: amount.toString(),
      currency,
      order_id: request.paymentId,
      network: this.network,
      url_return: this.returnUrl,
      url_success: this.successUrl,
      url_callback: this.callbackUrl,
      description: request.description ?? `Deposit for ${request.userName ?? request.userId}`,
      is_payment_multiple: false
    };

    const body = JSON.stringify(payload);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        merchant: this.merchantId,
        sign: this.signRaw(body)
      },
      body
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cryptomus create payment failed: ${errorText || response.statusText}`);
    }

    const data = (await response.json()) as CryptomusCreateResponse;
    const result = data.result ?? {};

    if (!result.uuid) {
      throw new Error("Cryptomus did not return a payment UUID");
    }

    if (!result.address && !result.url) {
      throw new Error("Cryptomus response missing address and hosted checkout URL");
    }

    const providerPaymentId = result.uuid;
    const expiresAt = result.expired_at ? new Date(result.expired_at * 1000) : null;
    const network = (result.network ?? this.network)?.toUpperCase();
    const memo = result.tag ?? result.memo ?? undefined;

    return {
      providerPaymentId,
      address: result.address ?? "",
      memo,
      network,
      checkoutUrl: result.url,
      expiresAt,
      metadata: {
        payAmount: toNumber(result.payment_amount ?? result.payer_amount),
        currency: (result.currency ?? currency).toUpperCase(),
        rawStatus: result.status,
        state: data.state
      }
    };
  }

  verifySignature(rawBody?: string | Buffer, signature?: string | string[] | undefined): boolean {
    if (!rawBody || !signature) return false;
    const signatureValue = Array.isArray(signature) ? signature[0] : signature;
    if (!signatureValue) return false;
    const expected = this.signRaw(typeof rawBody === "string" ? rawBody : rawBody.toString());
    return expected === signatureValue || expected === signatureValue.toLowerCase();
  }

  private signRaw(raw: string): string {
    const encoded = Buffer.from(raw).toString("base64");
    return createHash("md5").update(encoded + this.apiKey).digest("hex");
  }
}
