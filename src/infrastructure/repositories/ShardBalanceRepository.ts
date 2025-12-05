import { Repository } from "typeorm";
import { AppDataSource } from "../database/data-source";
import { PlayerShardBalance } from "../database/entities/PlayerShardBalance";

export class ShardBalanceRepository {
  private repository: Repository<PlayerShardBalance>;

  constructor() {
    this.repository = AppDataSource.getRepository(PlayerShardBalance);
  }

  /**
   * Get player's shard balance, create if doesn't exist
   */
  async getOrCreateBalance(playerId: string): Promise<PlayerShardBalance> {
    let balance = await this.repository.findOne({
      where: { playerId }
    });

    if (!balance) {
      balance = this.repository.create({
        playerId,
        shardTierS: 0,
        shardTierA: 0,
        shardTierB: 0,
        shardTierC: 0,
        totalShardsEarned: 0,
        nftsRedeemed: 0
      });
      await this.repository.save(balance);
    }

    return balance;
  }

  /**
   * Add shards to player's balance
   */
  async addShards(
    playerId: string,
    shards: Array<{ tier: "S" | "A" | "B" | "C"; count: number }>
  ): Promise<PlayerShardBalance> {
    const balance = await this.getOrCreateBalance(playerId);

    for (const shard of shards) {
      balance.addShards(shard.tier, shard.count);
    }

    return await this.repository.save(balance);
  }

  /**
   * Check if player can redeem NFT (has enough shards)
   */
  async canRedeem(playerId: string, tier: "S" | "A" | "B" | "C", required: number): Promise<boolean> {
    const balance = await this.getOrCreateBalance(playerId);
    return balance.getBalance(tier) >= required;
  }

  /**
   * Redeem shards for NFT
   */
  async redeemShards(
    playerId: string,
    tier: "S" | "A" | "B" | "C",
    required: number
  ): Promise<{ success: boolean; balance?: PlayerShardBalance; error?: string }> {
    const balance = await this.getOrCreateBalance(playerId);

    if (balance.getBalance(tier) < required) {
      return {
        success: false,
        error: `Insufficient ${tier}-tier shards. Required: ${required}, Current: ${balance.getBalance(tier)}`
      };
    }

    const redeemed = balance.redeemShards(tier, required);
    if (!redeemed) {
      return { success: false, error: "Redemption failed" };
    }

    const updatedBalance = await this.repository.save(balance);
    return { success: true, balance: updatedBalance };
  }

  /**
   * Get balance by player ID
   */
  async getBalance(playerId: string): Promise<PlayerShardBalance | null> {
    return await this.repository.findOne({
      where: { playerId }
    });
  }

  /**
   * Get leaderboard by total shards earned
   */
  async getLeaderboard(limit: number = 100): Promise<PlayerShardBalance[]> {
    return await this.repository.find({
      order: {
        totalShardsEarned: "DESC"
      },
      take: limit
    });
  }

  /**
   * Get statistics for all players
   */
  async getGlobalStats(): Promise<{
    totalPlayers: number;
    totalShards: { S: number; A: number; B: number; C: number };
    totalNFTsRedeemed: number;
  }> {
    const players = await this.repository.find();

    return {
      totalPlayers: players.length,
      totalShards: players.reduce(
        (acc, p) => ({
          S: acc.S + p.shardTierS,
          A: acc.A + p.shardTierA,
          B: acc.B + p.shardTierB,
          C: acc.C + p.shardTierC
        }),
        { S: 0, A: 0, B: 0, C: 0 }
      ),
      totalNFTsRedeemed: players.reduce((sum, p) => sum + p.nftsRedeemed, 0)
    };
  }
}
