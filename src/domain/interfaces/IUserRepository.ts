import { User } from "../entities/User";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByName(name: string): Promise<User | null>;
  save(user: User): Promise<void>;
  getAll(): Promise<User[]>;
}
