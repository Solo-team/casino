import { User, AuthProvider } from "../entities/User";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByName(name: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByProviderId(provider: AuthProvider, providerId: string): Promise<User | null>;
  findByResetToken(token: string): Promise<User | null>;
  save(user: User): Promise<void>;
  getAll(): Promise<User[]>;
}
