# NFT Slot Machine - Operator Guide

**Version:** 1.0  
**Target RTP:** 96.5%  
**Modes:** 3x3, 5x5  

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Configuration](#configuration)
3. [RTP Management](#rtp-management)
4. [NFT & Shard Economy](#nft--shard-economy)
5. [Running Simulations](#running-simulations)
6. [Monitoring & Analytics](#monitoring--analytics)
7. [Ethical Compliance](#ethical-compliance)
8. [Troubleshooting](#troubleshooting)

---

## System Overview

### What is This System?

This is a **fair and transparent NFT slot machine** with:

- **Two game modes:** 3x3 grid and 5x5 grid
- **Configurable RTP:** Default 96.5% (industry standard)
- **Dual NFT acquisition paths:**
  - Direct drops (rare, 0.01%-0.6%)
  - Shard economy (achievable, 10 shards = 1 NFT)
- **No player manipulation:** All probabilities explicit and equal for all players
- **Auditable:** Complete simulation tools for verification

### Key Features

1. **RTP Engine:** Ensures long-term convergence to target RTP with rubber-band correction
2. **Paytable System:** Theme-based symbol configurations (Classic, Egyptian, Space)
3. **Pricing Models:** Fixed, Dynamic (fund-based), or Hybrid pricing
4. **Shard Economy:** Pattern-based shard drops for ethical NFT acquisition
5. **Multiplier System:** x2-x9 multipliers loaded from SVG files

---

## Configuration

### Main Configuration File

All settings are in `src/domain/games/SlotConfig.ts`:

```typescript
export const DEFAULT_SLOT_CONFIG: SlotSystemConfig = {
  targetRTP: 0.965,        // 96.5% RTP
  volatility: "medium",    // low | medium | high
  
  mode3x3: { ... },
  mode5x5: { ... },
  
  nftDirectDropRates: { ... },
  shardConfig: { ... },
  pricing: { ... }
};
```

### Key Parameters to Tune

#### 1. RTP Target

```typescript
targetRTP: 0.965  // 96.5%
```

**Effect:** Higher RTP = more player returns, lower house edge  
**Range:** 0.90 - 0.98 (90% - 98%)  
**Industry Standard:** 0.94 - 0.97

#### 2. Win Distribution (3x3 mode example)

```typescript
mode3x3: {
  deadSpin: 0.55,        // 55% - No win
  smallWin: 0.27,        // 27% - 1.2x to 3x
  mediumWin: 0.12,       // 12% - 3x to 10x
  bigWin: 0.04,          // 4%  - 10x to 50x
  epicWin: 0.005,        // 0.5%- 50x to 100x
  directNftTotal: 0.009, // 0.9%- NFT drop
}
```

**Must sum to ≤ 1.0**  
**Validation:** Use `ConfigValidator.validate()` to check

#### 3. NFT Direct Drop Rates

```typescript
nftDirectDropRates: {
  mode3x3: {
    S: 0.0001,  // 0.01% - Ultra rare (1 in 10,000 spins)
    A: 0.0005,  // 0.05% - Rare     (1 in 2,000 spins)
    B: 0.002,   // 0.2%  - Uncommon (1 in 500 spins)
    C: 0.006    // 0.6%  - Common   (1 in 167 spins)
  }
}
```

**Effect:** Controls how often players get direct NFT drops  
**Recommendation:** Keep total < 1% to maintain rarity  
**Note:** Shard economy provides alternative acquisition path

#### 4. Shard Economy

```typescript
shardConfig: {
  shardsRequired: 10,  // NFTs cost 10 shards
  
  mode3x3: {
    // Shard drop chances for each pattern type
    sideComboShardChance: { S: 0.01, A: 0.03, B: 0.08, C: 0.15 },
    edgeComboShardChance: { S: 0.005, A: 0.02, B: 0.05, C: 0.10 },
    diagonalPairShardChance: { S: 0.003, A: 0.01, B: 0.03, C: 0.08 }
  }
}
```

**Pattern Frequencies (estimated):**
- Side combo: 8% of spins
- Edge combo: 3% of spins
- Diagonal pair: 2% of spins

**Effect:** Higher shard drop rates = faster NFT acquisition  
**Balance:** Must maintain overall RTP target

#### 5. Pricing Model

```typescript
pricing: {
  model: "hybrid",              // fixed | fund-based | hybrid
  basePrice: 0.5,               // Base cost per spin (USDT)
  fundFactor: 0.003,            // Multiplier for prize fund
  fundContributionPercent: 0.03 // 3% of spin added to fund
}
```

**Models:**
- **Fixed:** `price = basePrice` (e.g., $0.50/spin)
- **Fund-based:** `price = fund × fundFactor` (scales with jackpot)
- **Hybrid:** `price = basePrice + (fund × fundFactor)` (best of both)

---

## RTP Management

### Understanding RTP

**RTP (Return to Player)** = Total Returned / Total Wagered

**Example:**  
- Players wager $1,000,000
- System returns $965,000
- RTP = 96.5%

### RTP Components

```
Total RTP = Win RTP + Shard RTP + NFT RTP

Win RTP   = Σ(P(outcome) × Payout)
Shard RTP = Σ(P(pattern) × P(shard) × Shard_Value)
NFT RTP   = Σ(P(nft_tier) × NFT_Value)
```

### Estimating RTP

```typescript
import { ConfigValidator } from "./SlotConfig";

const rtpEstimate = ConfigValidator.estimateRTP(config, "3x3");
console.log(`Estimated RTP: ${rtpEstimate.estimatedRTP}`);
console.log(rtpEstimate.breakdown);
```

### Adjusting RTP

**To Increase RTP (more player-friendly):**
1. Increase `smallWin`, `mediumWin` probabilities
2. Increase payout ranges (e.g., `smallWinRange: [1.5, 3.5]`)
3. Increase shard drop chances
4. Lower `deadSpin` probability

**To Decrease RTP (more profitable):**
1. Increase `deadSpin` probability
2. Decrease payout ranges
3. Decrease shard drop chances
4. Lower NFT direct drop rates (but keep shard path viable!)

### RTP Validation

Always run simulations after changing config:

```bash
npm run simulate:rtp -- --spins 1000000 --mode 3x3
```

**Target:** Actual RTP should be within ±1% of target

---

## NFT & Shard Economy

### Dual Acquisition System

#### 1. Direct Drops (Jackpot Events)

- **Very rare:** 0.01% - 0.6% per spin
- **Immediate reward:** NFT drops instantly
- **Excitement factor:** Creates "big win" moments

**Expected Frequency:**
- S-tier: 1 per 10,000 spins (~$5,000 wagered @ $0.50/spin)
- C-tier: 1 per 167 spins (~$83 wagered)

#### 2. Shard Economy (Progression System)

- **Achievable:** Shards drop 5-25% of spins (pattern-dependent)
- **Predictable:** 10 shards = 1 NFT (configurable)
- **Fair:** No player manipulation, honest probabilities

**Expected Acquisition Time:**
- C-tier NFT: ~100-200 spins ($50-$100)
- B-tier NFT: ~200-400 spins ($100-$200)
- A-tier NFT: ~500-1000 spins ($250-$500)
- S-tier NFT: ~1500-3000 spins ($750-$1500)

### Shard Drop Patterns

#### 3x3 Mode

1. **Side Combo:** Two matching symbols on left/right edges
   - Frequency: ~8% of spins
   - Shard chance: 1-15% (tier-dependent)

2. **Edge Combo:** Matches on top/bottom edges
   - Frequency: ~3% of spins
   - Shard chance: 0.5-10%

3. **Diagonal Pair:** Matches on corners
   - Frequency: ~2% of spins
   - Shard chance: 0.3-8%

#### 5x5 Mode

1. **Cluster of 4:** Four adjacent matching symbols
   - Frequency: ~10% of spins
   - Shard chance: 0.5-25%

2. **Cluster of 5:** Five adjacent matching symbols
   - Frequency: ~4% of spins
   - Shard chance: 1-30%

3. **Cluster of 6+:** Six or more adjacent matching symbols
   - Frequency: ~1.5% of spins
   - Shard chance: 2-40%

### Balancing NFT Issuance

**Key Metric:** NFTs issued per 1M spins

**Formula:**
```
NFTs_per_million = (Direct_Drops + Shard_Redemptions) / 1M spins

Direct_Drops = Σ(P(tier) × 1M)
Shard_Redemptions = (Total_Shards_Dropped / Shards_Required)
```

**Example (C-tier, 3x3):**
- Direct drops: 0.006 × 1M = 6,000 NFTs
- Shard drops: ~100,000 C-shards @ 10-15% avg rate
- Shard redemptions: 100,000 / 10 = 10,000 NFTs
- **Total:** ~16,000 C-tier NFTs per 1M spins

**Tuning:**
- Too many NFTs? Decrease shard drop chances or increase `shardsRequired`
- Too few NFTs? Increase shard drop chances or decrease `shardsRequired`

---

## Running Simulations

### Why Simulate?

- **Verify RTP:** Ensure actual RTP matches target
- **Test configuration changes:** See impact before deploying
- **Audit fairness:** Prove system is honest and transparent
- **Estimate NFT issuance:** Predict NFT supply

### Running a Simulation

```bash
# Default: 1M spins, 3x3 mode, $0.50 bet
npm run simulate:rtp

# Custom parameters
npm run simulate:rtp -- --spins 5000000 --mode 5x5 --bet 1.0

# Save results to file
npm run simulate:rtp -- --output results.json
```

### Interpreting Results

**Sample Output:**

```
RTP SIMULATION REPORT
==============================================================

BASIC STATISTICS:
  Total Spins: 1,000,000
  Total Wagered: $500,000
  Total Returned: $482,500
  Actual RTP: 96.5000%

RTP BREAKDOWN:
  Win RTP: 89.23%
  Shard RTP: 4.12%
  NFT RTP: 3.15%

OUTCOME FREQUENCIES:
  Dead Spin: 55.12%
  Small Win: 26.89%
  Medium Win: 12.03%
  Big Win: 4.01%
  Epic Win: 0.52%
  NFT Drop: 0.91%

SHARD ECONOMY:
  Total Shards Dropped:
    S: 823
    A: 3,201
    B: 12,456
    C: 31,087
  Shard Drop Rate: 18.23%
  NFTs Redeemed from Shards: 4,756

NFT STATISTICS:
  Direct NFT Drops:
    S: 112
    A: 498
    B: 1,987
    C: 5,934
  Total NFTs: 13,287
  Avg Spins Between NFTs: 75

VOLATILITY METRICS:
  Max Win: $2,450.50
  Max Loss: -$127.00
  Win Streak: 23 spins
  Loss Streak: 18 spins
  Standard Deviation: $12.34
```

**What to Check:**

1. **Actual RTP vs Target:** Should be within ±1%
   - ✅ Good: 96.5% target, 96.3% actual
   - ❌ Bad: 96.5% target, 94.2% actual

2. **Outcome Frequencies:** Should match config probabilities
   - Dead spin should be ~55% if configured as 0.55

3. **NFT Issuance:** Calculate cost per NFT
   - Formula: `Total_Wagered / Total_NFTs`
   - Example: $500,000 / 13,287 = $37.63 per NFT

4. **Shard Drop Rate:** Should align with pattern frequencies
   - 3x3: ~13-20% expected
   - 5x5: ~15-25% expected

---

## Monitoring & Analytics

### Key Metrics to Track

#### 1. RTP Over Time

**Calculate daily/weekly:**
```sql
SELECT 
  DATE(timestamp) as date,
  SUM(bet_amount) as total_wagered,
  SUM(payout) as total_returned,
  (SUM(payout) / SUM(bet_amount)) as actual_rtp
FROM game_results
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

**Alert thresholds:**
- RTP < 95.5% or > 97.5% for 24+ hours → Investigate
- RTP < 94% or > 99% for 1+ hour → Immediate check

#### 2. NFT Issuance Rate

```sql
SELECT 
  nft_tier,
  COUNT(*) as total_issued,
  COUNT(*) / (SELECT COUNT(*) FROM game_results) as issue_rate
FROM game_results
WHERE nft_dropped = TRUE
GROUP BY nft_tier;
```

**Expected rates (3x3):**
- S: ~0.01% (1 per 10k spins)
- A: ~0.05% (1 per 2k spins)
- B: ~0.2% (1 per 500 spins)
- C: ~0.6% (1 per 167 spins)

#### 3. Shard Economy Health

```sql
SELECT 
  shard_tier,
  SUM(shards_awarded) as total_shards,
  COUNT(DISTINCT player_id) as players_with_shards,
  SUM(shards_awarded) / COUNT(DISTINCT player_id) as avg_per_player
FROM shard_awards
GROUP BY shard_tier;
```

**Health check:**
- Are shards being redeemed? (redemption rate > 0%)
- Are shards accumulating excessively? (might need balancing)
- Is shard distribution fair? (no player-targeting)

#### 4. Player Engagement

```sql
SELECT 
  player_id,
  COUNT(*) as total_spins,
  SUM(bet_amount) as total_wagered,
  SUM(payout) as total_returned,
  (SUM(payout) / SUM(bet_amount)) as player_rtp
FROM game_results
GROUP BY player_id
HAVING total_spins > 1000
ORDER BY total_spins DESC
LIMIT 100;
```

**Flag for review:**
- Player RTP significantly differs from system RTP (>±5%)
- Unusual win/loss patterns

---

## Ethical Compliance

### Core Principles

1. **Transparency:** All probabilities documented and auditable
2. **Fairness:** No player-specific odds or manipulation
3. **Responsibility:** Shard economy provides achievable progression
4. **Honesty:** RTP clearly stated and verified

### What This System Does NOT Do

❌ **No player profiling:** Same odds for everyone  
❌ **No hot/cold streaks:** No artificial manipulation  
❌ **No addiction mechanics:** No psychological exploitation  
❌ **No hidden costs:** All prices and probabilities explicit  

### What This System DOES Do

✅ **Configurable probabilities:** Operator sets all rates  
✅ **RTP enforcement:** System converges to target RTP  
✅ **Auditable outcomes:** All results logged and verifiable  
✅ **Alternative acquisition:** Shards provide fair progression  
✅ **Statistical fairness:** Random outcomes based on configuration  

### Regulatory Compliance

**For jurisdictions requiring:**

1. **RTP Disclosure:** Use `DEFAULT_SLOT_CONFIG.targetRTP`
2. **Probability Tables:** Export from `SlotConfig.ts`
3. **Audit Logs:** Store all spins in `game_results` table
4. **Fairness Testing:** Run simulations regularly
5. **Player Protection:** Shard economy prevents pure gambling

---

## Troubleshooting

### RTP Deviating from Target

**Symptoms:** Actual RTP consistently < 95.5% or > 97.5%

**Diagnosis:**
1. Run simulation: `npm run simulate:rtp -- --spins 5000000`
2. Check configuration: `ConfigValidator.validate(config)`
3. Review recent changes to probabilities

**Solutions:**
- Adjust outcome probabilities (see [RTP Management](#rtp-management))
- Verify shard value coefficients are correct
- Check NFT valuation (market prices may have changed)

### Too Many/Few NFTs Issued

**Symptoms:** NFT supply growing too fast or too slow

**Diagnosis:**
```sql
SELECT 
  nft_tier,
  COUNT(*) as issued,
  COUNT(*) * 1000000.0 / (SELECT COUNT(*) FROM game_results) as per_million
FROM game_results
WHERE nft_dropped = TRUE OR shards_redeemed = TRUE
GROUP BY nft_tier;
```

**Solutions:**

**Too Many NFTs:**
- Decrease `nftDirectDropRates`
- Decrease shard drop chances in `shardConfig`
- Increase `shardsRequired` (e.g., 10 → 15)

**Too Few NFTs:**
- Increase shard drop chances
- Decrease `shardsRequired` (e.g., 10 → 8)
- Keep direct drops rare (maintain rarity/value)

### Shard Economy Imbalance

**Symptoms:** Players accumulating shards but not redeeming

**Diagnosis:**
```sql
SELECT 
  shard_tier,
  SUM(balance) as total_unredeemed
FROM player_shard_balances
GROUP BY shard_tier;
```

**Solutions:**
- Lower `shardsRequired` to make redemption easier
- Increase shard shop prices to absorb excess supply
- Add shard-exclusive benefits (cosmetics, boosts)

### Configuration Validation Errors

**Symptoms:** `ConfigValidator.validate()` returns errors

**Common Issues:**

1. **Probabilities sum > 1.0**
   ```
   Error: Probability sum 1.032 exceeds 1.0
   ```
   **Fix:** Reduce some probabilities so total ≤ 1.0

2. **Negative probabilities**
   ```
   Error: Dead spin probability -0.1 out of range [0,1]
   ```
   **Fix:** Ensure all probabilities are 0 ≤ p ≤ 1

3. **Invalid ranges**
   ```
   Error: smallWinRange [3, 1.2] has min > max
   ```
   **Fix:** Ensure `[min, max]` with min < max

---

## Quick Reference

### Common Configuration Changes

#### Make Game More Player-Friendly (Higher RTP)
```typescript
mode3x3: {
  deadSpin: 0.50,        // ↓ from 0.55
  smallWin: 0.30,        // ↑ from 0.27
  mediumWin: 0.14,       // ↑ from 0.12
  smallWinRange: [1.5, 3.5], // ↑ from [1.2, 3]
}
```

#### Increase NFT Issuance via Shards
```typescript
shardConfig: {
  shardsRequired: 8,     // ↓ from 10
  mode3x3: {
    sideComboShardChance: { 
      C: 0.20             // ↑ from 0.15
    }
  }
}
```

#### Adjust Volatility
```typescript
// Low volatility (frequent small wins)
volatility: "low",
smallWin: 0.35,
mediumWin: 0.08,
bigWin: 0.01,

// High volatility (rare big wins)
volatility: "high",
smallWin: 0.20,
mediumWin: 0.15,
bigWin: 0.08,
```

---

## Support & Documentation

- **Implementation Guide:** `IMPLEMENTATION_GUIDE.md`
- **Configuration:** `src/domain/games/SlotConfig.ts`
- **Simulation:** `src/domain/games/RTPSimulator.ts`
- **Shard Economy:** `src/domain/games/ShardEconomy.ts`

For technical support or questions about configuration, refer to the codebase documentation or run simulations to test changes before deployment.

---

**Remember:** Always run simulations after configuration changes to verify RTP and NFT issuance rates!

```bash
npm run simulate:rtp -- --spins 1000000 --output validation.json
```
