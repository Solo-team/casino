import { randomUUID } from "crypto";
import {
  PaymentMethod,
  PaymentStatus,
  PaymentTransaction,
  PaymentType
} from "../../domain/entities/PaymentTransaction";
import { ICryptoPaymentGateway } from "../../domain/interfaces/ICryptoPaymentGateway";
import { IPaymentRepository } from "../../domain/interfaces/IPaymentRepository";
import { IUserRepository } from "../../domain/interfaces/IUserRepository";
import { AppDataSource } from "../../infrastructure/database/data-source";
import { TypeOrmPaymentRepository } from "../../infrastructure/repositories/TypeOrmPaymentRepository";
import { TypeOrmUserRepository } from "../../infrastructure/repositories/TypeOrmUserRepository";

export interface PaymentServiceConfig {
  defaultCurrency?: string;
  minimumAmount?: number;
  devMode?: boolean;
  providerName?: string;
}

export interface CreateCryptoDepositInput {
  userId: string;
  amount: number;
  currency?: string;
}

export interface CryptoDepositResponse {
  payment: PaymentTransaction;
  instructions: {
    address: string;
    memo?: string;
    network?: string;
    amount: number;
    currency: string;
    providerPaymentId?: string;
    checkoutUrl?: string;
    expiresAt?: Date | null;
  };
}

export interface CryptoWebhookPayload {
  paymentId?: string;
  providerPaymentId?: string;
  status: "confirmed" | "processing" | "failed" | "expired";
  txHash?: string;
}

export class PaymentService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly paymentRepository: IPaymentRepository,
    private readonly cryptoGateway: ICryptoPaymentGateway,
    private readonly config: PaymentServiceConfig = {}
  ) {}

  async createCryptoDeposit(input: CreateCryptoDepositInput): Promise<CryptoDepositResponse> {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Deposit amount must be positive");
    }

    if (this.config.minimumAmount && amount < this.config.minimumAmount) {
      throw new Error(`Minimum deposit is ${this.config.minimumAmount}`);
    }

    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const currency = (input.currency || this.config.defaultCurrency || "USDT").toUpperCase();
    const paymentId = randomUUID();

    const gatewayResponse = await this.cryptoGateway.createDeposit({
      paymentId,
      amount,
      currency,
      userId: user.id,
      userName: user.name,
      description: `Deposit for ${user.name}`
    });

    const payment = new PaymentTransaction(
      paymentId,
      user.id,
      amount,
      currency,
      PaymentType.DEPOSIT,
      PaymentMethod.CRYPTO,
      this.config.providerName || "crypto-gateway",
      gatewayResponse.providerPaymentId,
      gatewayResponse.address,
      gatewayResponse.memo,
      gatewayResponse.network,
      PaymentStatus.PENDING,
      gatewayResponse.metadata ?? {},
      new Date(),
      null,
      gatewayResponse.expiresAt ?? null
    );

    await this.paymentRepository.save(payment);

    return {
      payment,
      instructions: {
        address: gatewayResponse.address,
        memo: gatewayResponse.memo,
        network: gatewayResponse.network,
        amount,
        currency,
        providerPaymentId: gatewayResponse.providerPaymentId,
        checkoutUrl: gatewayResponse.checkoutUrl,
        expiresAt: gatewayResponse.expiresAt ?? null
      }
    };
  }

  async findPaymentForUser(paymentId: string, userId: string): Promise<PaymentTransaction> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment || payment.userId !== userId) {
      throw new Error("Payment not found");
    }
    return payment;
  }

  async listUserPayments(userId: string): Promise<PaymentTransaction[]> {
    return this.paymentRepository.findByUserId(userId);
  }

  async handleCryptoWebhook(payload: CryptoWebhookPayload): Promise<PaymentTransaction> {
    const payment = await this.resolvePayment(payload);

    if (payload.status === "confirmed") {
      return this.markCompleted(payment, payload.txHash);
    }

    if (payload.status === "processing") {
      payment.markProcessing();
      await this.paymentRepository.save(payment);
      return payment;
    }

    if (payload.status === "failed") {
      payment.markFailed();
    } else if (payload.status === "expired") {
      payment.markExpired();
    }
    await this.paymentRepository.save(payment);
    return payment;
  }

  async markCompleted(payment: PaymentTransaction, txHash?: string): Promise<PaymentTransaction> {
    if (payment.status === PaymentStatus.COMPLETED) {
      return payment;
    }
    payment.markCompleted(txHash);
    await this.persistWithBalanceUpdate(payment);
    return payment;
  }

  private async resolvePayment(payload: CryptoWebhookPayload): Promise<PaymentTransaction> {
    let payment: PaymentTransaction | null = null;
    if (payload.paymentId) {
      payment = await this.paymentRepository.findById(payload.paymentId);
    }
    if (!payment && payload.providerPaymentId) {
      payment = await this.paymentRepository.findByProviderPaymentId(payload.providerPaymentId);
    }
    if (!payment) {
      throw new Error("Payment not found");
    }
    return payment;
  }

  private async persistWithBalanceUpdate(payment: PaymentTransaction): Promise<void> {
    const user = await this.userRepository.findById(payment.userId);
    if (!user) {
      throw new Error("User not found for payment");
    }

    user.deposit(payment.amount);

    const isTypeOrmRepos =
      this.userRepository instanceof TypeOrmUserRepository &&
      this.paymentRepository instanceof TypeOrmPaymentRepository;

    if (isTypeOrmRepos && AppDataSource.isInitialized) {
      const userRepo = this.userRepository as TypeOrmUserRepository;
      const paymentRepo = this.paymentRepository as TypeOrmPaymentRepository;
      await AppDataSource.manager.transaction(async manager => {
        await paymentRepo.saveWithManager(manager, payment);
        await userRepo.saveWithManager(manager, user);
      });
      return;
    }

    await this.paymentRepository.save(payment);
    await this.userRepository.save(user);
  }
}
