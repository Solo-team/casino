import { createHmac } from "crypto";
import {
  CryptoDepositRequest,
  CryptoDepositResult,
  ICryptoPaymentGateway
} from "../../domain/interfaces/ICryptoPaymentGateway";

interface NowPaymentsGatewayOptions {
  apiKey: string;
  ipnSecret?: string;
  callbackUrl?: string;
  payCurrency?: string;
  baseUrl?: string;
  network?: string;
}

interface NowPaymentsCreateResponse {
  payment_id?: number | string;
  purchase_id?: number | string;
  pay_address?: string;
  payin_extra_id?: string | null;
  pay_currency?: string;
  price_amount?: number;
  price_currency?: string;
  pay_amount?: number;
  payment_status?: string;
  payin_hash?: string | null;
  invoice_url?: string;
  pay_url?: string;
  valid_until?: number;
}

export class NowPaymentsGateway implements ICryptoPaymentGateway {
  private readonly apiKey: string;
  private readonly ipnSecret?: string;
  private readonly callbackUrl?: string;
  private readonly payCurrency?: string;
  private readonly baseUrl: string;
  private readonly network?: string;

  constructor(options: NowPaymentsGatewayOptions) {
    if (!options.apiKey) {
      throw new Error("NOWPAYMENTS_API_KEY is not configured");
    }
    this.apiKey = options.apiKey;
    this.ipnSecret = options.ipnSecret;
    this.callbackUrl = options.callbackUrl;
    this.payCurrency = options.payCurrency;
    this.baseUrl = options.baseUrl ?? "https://api.nowpayments.io";
    this.network = options.network;
  }

  async createDeposit(request: CryptoDepositRequest): Promise<CryptoDepositResult> {
    const endpoint = `${this.baseUrl}/v1/payment`;
    const priceCurrency = request.currency.toLowerCase();
    const payCurrency = (this.payCurrency ?? request.currency).toLowerCase();
    const payload = {
      price_amount: request.amount,
      price_currency: priceCurrency,
      pay_currency: payCurrency,
      ipn_callback_url: this.callbackUrl,
      order_id: request.paymentId,
      order_description: request.description ?? `Deposit for ${request.userName ?? request.userId}`,
      is_fee_paid_by_user: true
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-api-key": this.apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NowPayments create payment failed: ${errorText || response.statusText}`);
    }

    const data = (await response.json()) as NowPaymentsCreateResponse;
    const providerPaymentId = String(data.payment_id ?? data.purchase_id ?? request.paymentId);

    if (!data.pay_address) {
      throw new Error("NowPayments did not return a pay address");
    }

    const expiresAt = data.valid_until ? new Date(data.valid_until * 1000) : null;
    const network = this.network ?? data.pay_currency;

    return {
      providerPaymentId,
      address: data.pay_address,
      memo: data.payin_extra_id ?? undefined,
      network: network ? network.toUpperCase() : undefined,
      checkoutUrl: data.invoice_url ?? data.pay_url,
      expiresAt,
      metadata: {
        payAmount: data.pay_amount,
        payCurrency: data.pay_currency ?? payCurrency,
        priceAmount: data.price_amount ?? request.amount,
        priceCurrency: data.price_currency ?? priceCurrency,
        rawStatus: data.payment_status
      }
    };
  }

  verifySignature(rawBody?: string | Buffer, signature?: string | string[] | undefined): boolean {
    if (!this.ipnSecret) return false;
    if (!rawBody || !signature) return false;
    const signatureValue = Array.isArray(signature) ? signature[0] : signature;
    if (!signatureValue) return false;
    const hmac = createHmac("sha512", this.ipnSecret);
    const digest = hmac.update(rawBody).digest("hex");
    return digest === signatureValue || digest === signatureValue.toLowerCase();
  }
}
