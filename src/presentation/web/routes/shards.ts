import { Router, Request, Response } from "express";
import { ShardBalanceRepository } from "../../../infrastructure/repositories/ShardBalanceRepository";
import { DEFAULT_SHARD_CONFIG } from "../../../domain/games/ShardEconomy";

const router = Router();
const shardRepository = new ShardBalanceRepository();

/**
 * GET /api/shards/balance/:playerId
 * Get player's shard balance
 */
router.get("/balance/:playerId", async (req: Request, res: Response) => {
  try {
    const { playerId } = req.params;

    const balance = await shardRepository.getOrCreateBalance(playerId);

    res.json({
      success: true,
      data: {
        playerId: balance.playerId,
        shards: {
          S: balance.shardTierS,
          A: balance.shardTierA,
          B: balance.shardTierB,
          C: balance.shardTierC
        },
        totalShards: balance.getTotalShards(),
        totalEarned: balance.totalShardsEarned,
        nftsRedeemed: balance.nftsRedeemed,
        updatedAt: balance.updatedAt
      }
    });
  } catch (error) {
    console.error("Error fetching shard balance:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch shard balance"
    });
  }
});

/**
 * POST /api/shards/redeem
 * Redeem shards for NFT
 */
router.post("/redeem", async (req: Request, res: Response) => {
  try {
    const { playerId, tier } = req.body;

    if (!playerId || !tier) {
      return res.status(400).json({
        success: false,
        error: "playerId and tier are required"
      });
    }

    if (!["S", "A", "B", "C"].includes(tier)) {
      return res.status(400).json({
        success: false,
        error: "Invalid tier. Must be S, A, B, or C"
      });
    }

    const required = DEFAULT_SHARD_CONFIG.shardsRequired;
    const result = await shardRepository.redeemShards(playerId, tier, required);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    return res.json({
      success: true,
      message: `Successfully redeemed ${required} ${tier}-tier shards for NFT`,
      data: {
        playerId: result.balance!.playerId,
        shards: {
          S: result.balance!.shardTierS,
          A: result.balance!.shardTierA,
          B: result.balance!.shardTierB,
          C: result.balance!.shardTierC
        },
        nftsRedeemed: result.balance!.nftsRedeemed
      }
    });
  } catch (error) {
    console.error("Error redeeming shards:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to redeem shards"
    });
  }
});

/**
 * GET /api/shards/leaderboard
 * Get shard leaderboard
 */
router.get("/leaderboard", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const leaderboard = await shardRepository.getLeaderboard(limit);

    return res.json({
      success: true,
      data: leaderboard.map(entry => ({
        playerId: entry.playerId,
        totalShardsEarned: entry.totalShardsEarned,
        currentShards: {
          S: entry.shardTierS,
          A: entry.shardTierA,
          B: entry.shardTierB,
          C: entry.shardTierC
        },
        nftsRedeemed: entry.nftsRedeemed
      }))
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch leaderboard"
    });
  }
});

/**
 * GET /api/shards/stats
 * Get global shard statistics
 */
router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const stats = await shardRepository.getGlobalStats();

    return res.json({
      success: true,
      data: {
        totalPlayers: stats.totalPlayers,
        totalShards: stats.totalShards,
        totalNFTsRedeemed: stats.totalNFTsRedeemed,
        config: {
          shardsRequired: DEFAULT_SHARD_CONFIG.shardsRequired,
          shopPrices: DEFAULT_SHARD_CONFIG.shopPrices
        }
      }
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch statistics"
    });
  }
});

/**
 * GET /api/shards/config
 * Get shard system configuration
 */
router.get("/config", async (_req: Request, res: Response) => {
  try {
    return res.json({
      success: true,
      data: {
        shardsRequired: DEFAULT_SHARD_CONFIG.shardsRequired,
        shopPrices: DEFAULT_SHARD_CONFIG.shopPrices,
        mode3x3: {
          patterns: ["sideCombo", "edgeCombo", "diagonalPair"],
          estimatedFrequencies: {
            sideCombo: "8% of spins",
            edgeCombo: "3% of spins",
            diagonalPair: "2% of spins"
          }
        },
        mode5x5: {
          patterns: ["cluster4", "cluster5", "cluster6Plus"],
          estimatedFrequencies: {
            cluster4: "10% of spins",
            cluster5: "4% of spins",
            cluster6Plus: "1.5% of spins"
          }
        }
      }
    });
  } catch (error) {
    console.error("Error fetching config:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch configuration"
    });
  }
});

export default router;
