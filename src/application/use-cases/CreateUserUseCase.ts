import { User } from "../../domain/entities/User";
import { CasinoService } from "../services/CasinoService";

export class CreateUserUseCase {
  constructor(private casinoService: CasinoService) {}

  async execute(name: string, initialBalance?: number): Promise<User> {
    return this.casinoService.createUser(name, initialBalance);
  }
}
