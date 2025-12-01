import { User, AuthProvider } from "../../domain/entities/User";
import { IUserRepository } from "../../domain/interfaces/IUserRepository";

export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByName(name: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.name === name) {
        return user;
      }
    }
    return null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async findByProviderId(provider: AuthProvider, providerId: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.provider === provider && user.providerId === providerId) {
        return user;
      }
    }
    return null;
  }

  async findByResetToken(token: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.resetToken === token) {
        return user;
      }
    }
    return null;
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  async getAll(): Promise<User[]> {
    return Array.from(this.users.values());
  }
}
