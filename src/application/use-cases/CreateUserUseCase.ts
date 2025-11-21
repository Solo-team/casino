import { User } from "../../domain/entities/User";
import { CasinoService } from "../services/CasinoService";

export class CreateUserUseCase {
  constructor(private casinoService: CasinoService) {}

  async execute(name: string, password: string, initialBalance?: number): Promise<User> {
    return this.casinoService.registerUser(name, password, initialBalance);
  }
}
