import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

@Entity("player_shard_balances")
@Index("IDX_PLAYER_SHARD_BALANCES_PLAYER_ID", ["playerId"], { unique: true })
export class PlayerShardBalance {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "player_id", type: "uuid" })
  playerId!: string;

  @Column({ name: "shard_tier_s", type: "integer", default: 0 })
  shardTierS!: number;

  @Column({ name: "shard_tier_a", type: "integer", default: 0 })
  shardTierA!: number;

  @Column({ name: "shard_tier_b", type: "integer", default: 0 })
  shardTierB!: number;

  @Column({ name: "shard_tier_c", type: "integer", default: 0 })
  shardTierC!: number;

  @Column({ name: "total_shards_earned", type: "integer", default: 0 })
  totalShardsEarned!: number;

  @Column({ name: "nfts_redeemed", type: "integer", default: 0 })
  nftsRedeemed!: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  // Helper method to get balance for specific tier
  getBalance(tier: "S" | "A" | "B" | "C"): number {
    switch (tier) {
      case "S": return this.shardTierS;
      case "A": return this.shardTierA;
      case "B": return this.shardTierB;
      case "C": return this.shardTierC;
    }
  }

  // Helper method to add shards
  addShards(tier: "S" | "A" | "B" | "C", count: number): void {
    switch (tier) {
      case "S": this.shardTierS += count; break;
      case "A": this.shardTierA += count; break;
      case "B": this.shardTierB += count; break;
      case "C": this.shardTierC += count; break;
    }
    this.totalShardsEarned += count;
  }

  // Helper method to deduct shards for redemption
  redeemShards(tier: "S" | "A" | "B" | "C", count: number): boolean {
    const currentBalance = this.getBalance(tier);
    if (currentBalance < count) return false;

    switch (tier) {
      case "S": this.shardTierS -= count; break;
      case "A": this.shardTierA -= count; break;
      case "B": this.shardTierB -= count; break;
      case "C": this.shardTierC -= count; break;
    }
    this.nftsRedeemed++;
    return true;
  }

  // Get total shards across all tiers
  getTotalShards(): number {
    return this.shardTierS + this.shardTierA + this.shardTierB + this.shardTierC;
  }
}
