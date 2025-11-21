import { CryptoDepositRequest, CryptoDepositResult, ICryptoPaymentGateway } from "../../domain/interfaces/ICryptoPaymentGateway";

interface StaticCryptoGatewayOptions {
  address: string;
  network?: string;
  provider?: string;
  memoPrefix?: string;
}

export class StaticCryptoGateway implements ICryptoPaymentGateway {
  private readonly address: string;
  private readonly network?: string;
  private readonly provider: string;
  private readonly memoPrefix: string;

  constructor(options: StaticCryptoGatewayOptions) {
    if (!options.address) {
      throw new Error("CRYPTO_DEPOSIT_ADDRESS is not configured");
    }
    this.address = options.address;
    this.network = options.network;
    this.provider = options.provider ?? "manual-crypto";
    this.memoPrefix = options.memoPrefix ?? "CASINO";
  }

  async createDeposit(request: CryptoDepositRequest): Promise<CryptoDepositResult> {
    const memo = `${this.memoPrefix}-${request.paymentId.slice(0, 8)}`;
    return {
      providerPaymentId: request.paymentId,
      address: this.address,
      memo,
      network: this.network,
      metadata: {
        note: "Send only stablecoins to this address. Include memo in transaction if your network supports it.",
        provider: this.provider
      }
    };
  }
}
