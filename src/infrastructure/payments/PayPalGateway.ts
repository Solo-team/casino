import { Buffer } from "buffer";
import {
  CryptoDepositRequest,
  CryptoDepositResult,
  ICryptoPaymentGateway
} from "../../domain/interfaces/ICryptoPaymentGateway";

interface PayPalGatewayOptions {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

interface PayPalLink {
  href?: string;
  rel?: string;
  method?: string;
}

interface PayPalOrderResponse {
  id?: string;
  status?: string;
  intent?: string;
  links?: PayPalLink[];
  expiration_time?: string;
}

export class PayPalGateway implements ICryptoPaymentGateway {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly returnUrl?: string;
  private readonly cancelUrl?: string;

  constructor(options: PayPalGatewayOptions) {
    if (!options.clientId) {
      throw new Error("PAYPAL_CLIENT_ID is not configured");
    }
    if (!options.clientSecret) {
      throw new Error("PAYPAL_CLIENT_SECRET is not configured");
    }

    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.baseUrl = options.baseUrl ?? "https://api-m.sandbox.paypal.com";
    
    if (options.returnUrl) {
      this.validateUrl(options.returnUrl, "PAYPAL_RETURN_URL");
      this.returnUrl = options.returnUrl;
    }
    
    if (options.cancelUrl) {
      this.validateUrl(options.cancelUrl, "PAYPAL_CANCEL_URL");
      this.cancelUrl = options.cancelUrl;
    }
  }

  private validateUrl(url: string, envVarName: string): void {
    if (url.includes("<") || url.includes(">") || url.includes("your-host") || url.includes("yourdomain")) {
      throw new Error(
        `${envVarName} contains placeholder values. Please replace with actual URL. ` +
        `Current value: ${url}. Example: http://localhost:5173/account?payment=success`
      );
    }
    
    try {
      const urlObj = new URL(url);
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        throw new Error(`${envVarName} must use http:// or https:// protocol`);
      }
    } catch (error) {
      throw new Error(
        `${envVarName} is not a valid URL: ${url}. ` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async createDeposit(request: CryptoDepositRequest): Promise<CryptoDepositResult> {
    if (!this.returnUrl) {
      throw new Error("PAYPAL_RETURN_URL is required. Please set it in your .env file.");
    }
    if (!this.cancelUrl) {
      throw new Error("PAYPAL_CANCEL_URL is required. Please set it in your .env file.");
    }

    const token = await this.getAccessToken();

    const payload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: request.paymentId,
          amount: {
            currency_code: request.currency.toUpperCase(),
            value: request.amount.toFixed(2)
          },
          description: request.description ?? `Deposit for ${request.userName ?? request.userId}`
        }
      ],
      application_context: {
        return_url: this.returnUrl,
        cancel_url: this.cancelUrl,
        user_action: "PAY_NOW"
      }
    };

    const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`PayPal create order failed: ${text || response.statusText}`);
    }

    const data = (await response.json()) as PayPalOrderResponse;
    const providerPaymentId = data.id;
    const approvalUrl =
      data.links?.find(link => link.rel === "approve")?.href ??
      data.links?.find(link => link.rel === "payer-action")?.href;

    if (!providerPaymentId || !approvalUrl) {
      throw new Error("PayPal response missing order id or approval link");
    }

    const expiresAt = data.expiration_time ? new Date(data.expiration_time) : null;

    return {
      providerPaymentId,
      address: undefined,
      memo: undefined,
      network: undefined,
      checkoutUrl: approvalUrl,
      expiresAt,
      metadata: {
        status: data.status,
        intent: data.intent
      }
    };
  }

  private async getAccessToken(): Promise<string> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`PayPal auth failed: ${text || response.statusText}`);
    }

    const data = (await response.json()) as { access_token?: string };
    if (!data.access_token) {
      throw new Error("PayPal did not return access_token");
    }
    return data.access_token;
  }
}

