import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { GameResultType } from "../../../domain/entities/GameResult";

@Entity({ name: "game_results" })
@Index(["userId", "timestamp"])
export class GameResultOrmEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "game_id", type: "varchar", length: 255 })
  gameId!: string;

  @Column({ name: "user_id", type: "varchar", length: 64 })
  @Index()
  userId!: string;

  @Column({ name: "game_type", type: "varchar", length: 100 })
  gameType!: string;

  @Column({ name: "bet_amount", type: "numeric", precision: 15, scale: 2 })
  betAmount!: number;

  @Column({
    name: "result_type",
    type: "varchar",
    length: 10,
    enum: GameResultType
  })
  resultType!: GameResultType;

  @Column({ type: "numeric", precision: 15, scale: 2 })
  payout!: number;

  @Column({ name: "game_data", type: "json", nullable: true })
  gameData?: Record<string, unknown>;

  @CreateDateColumn({ name: "timestamp", type: "timestamptz" })
  timestamp!: Date;
}

