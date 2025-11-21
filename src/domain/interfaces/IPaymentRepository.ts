import { PaymentTransaction } from "../entities/PaymentTransaction";

export interface IPaymentRepository {
  findById(id: string): Promise<PaymentTransaction | null>;
  findByProviderPaymentId(providerPaymentId: string): Promise<PaymentTransaction | null>;
  findByUserId(userId: string): Promise<PaymentTransaction[]>;
  save(payment: PaymentTransaction): Promise<void>;
}
