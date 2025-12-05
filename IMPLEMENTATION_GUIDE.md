# Slot Machine System - Implementation Guide

## Overview

This document describes the complete slot machine system with NFT rewards, implementing fair RNG, transparent probabilities, and configurable RTP.

---

## ✅ Implemented Features

### 1. Grid Modes

#### **3x3 Grid (Classic/Expanded Mode)**
- 9 symbols total
- 3 horizontal paylines (top, middle, bottom)
- Wild/FREE symbol support
- Near-miss detection (2-of-3 matches)
- Automatic re-spin on FREE symbols

**Usage:**
```typescript
gameData: { mode: "expanded" } // or "3x3"
```

#### **5x5 Grid (Mode5)**
- 25 symbols total
- **12 paylines total:**
  - 5 horizontal rows
  - 5 vertical columns
  - 2 diagonals (\ and /)
- **Cluster wins:** 5+ adjacent matching symbols
- Wild multipliers (x2-x9) can appear
- Enhanced free spin mechanics

**Usage:**
```typescript
gameData: { mode: "mode5" } // or "5x5"
```

---

### 2. Symbol System

#### **Symbol Types**

| Type | Description | Function |
|------|-------------|----------|
| **Common** | Base symbols, frequent appearance | Standard payouts (2-5x) |
| **Rare** | Mid-tier symbols | Higher payouts (6-12x) |
| **Epic** | High-value symbols | Large payouts (15-30x) |
| **Legendary/NFT** | Rarest symbols | Mega payouts (35-100x) |
| **Wild** | Substitutes for any symbol (except NFT) | Can carry multipliers in 5x5 |
| **Multipliers** | x2-x9 from `/2.txt` - `/9.txt` | Multiply total win |

#### **Weighted Reel Strips**

Symbols appear with frequency inversely proportional to value:
```
Weight = Max_Price / Symbol_Price
```

**Example:**
- Cheap symbol ($10): Weight = 100
- Expensive symbol ($100): Weight = 10
- → Cheap symbols appear 10× more often

**Implementation:** `RTPEngine.createWeightedReelStrip()`

---

### 3. Wild Symbol Logic

#### **FREE/Wild Symbol**
- **Image:** `/free.jpg`
- **Functions:**
  - Substitutes for any symbol (wildcard)
  - Triggers free spins when 3 appear
  - In 5x5 mode: Can carry x2-x9 multipliers

#### **Free Spin Trigger**
```typescript
3 Wild/FREE symbols anywhere → 10 free spins
```

**During free spins:**
- Re-trigger possible (3 more FREE → +3 spins)
- All wins use bet amount = 0 (free)

---

### 4. NFT Reward System

#### **Tier Configuration**

| Tier | Drop Rate | Label | Bonus Multiplier | Rarity |
|------|-----------|-------|------------------|--------|
| **S** | 0.01% | Ultra Rare | 10x | Legendary |
| **A** | 0.05% | Rare | 5x | Epic |
| **B** | 0.2% | Uncommon | 2.5x | Rare |
| **C** | 0.6% | Common | 1.5x | Common |

**Total NFT drop chance:** ~0.87% per winning spin

#### **NFT Drop Mechanics**

When a winning spin occurs:
1. Roll for NFT tier (S/A/B/C)
2. If drop occurs:
   - Select most valuable matched symbol as NFT
   - Apply tier bonus multiplier to payout
   - Return NFT metadata in result

**Example:**
```typescript
// Win with $100 symbol (10x multiplier)
// NFT Tier A drops (5x bonus)
// Final payout: Bet × 10 × 5 = 50x
```

**Result metadata:**
```typescript
{
  nftDrop: {
    tier: "A",
    rarity: "Rare",
    bonusMultiplier: 5,
    nftSymbol: { id, name, imageUrl, priceValue, rarity }
  }
}
```

---

### 5. RTP Engine & Probability

#### **RTP Configuration**

**Default Settings:**
- Target RTP: **96.5%**
- Volatility: **Medium**
- Hit Frequency: **28%** (28% of spins win)

#### **RTP Formula**

```
RTP = Total_Paid / Total_Wagered

Target: 96.5% = $965 paid per $1000 wagered
House Edge: 3.5%
```

#### **Volatility Profiles**

| Level | Hit Rate | Win Distribution | Dead Spins |
|-------|----------|------------------|------------|
| **Low** | 35% | 70% small, 25% med, 4.5% big, 0.5% mega | 65% |
| **Medium** | 28% | 60% small, 28% med, 10% big, 2% mega | 72% |
| **High** | 20% | 45% small, 35% med, 15% big, 5% mega | 80% |

#### **Win Size Ranges**

- **Small:** 1.2x - 3x bet
- **Medium:** 3x - 10x bet
- **Big:** 10x - 50x bet
- **Mega:** 50x - 100x bet

#### **Adaptive Probability (Rubber Band Effect)**

The RTP engine dynamically adjusts win chances:

```typescript
if (currentRTP < targetRTP - 5%) {
  winChance × 1.5 // Significantly boost wins
} else if (currentRTP < targetRTP - 2%) {
  winChance × 1.2 // Moderate boost
} else if (currentRTP > targetRTP + 5%) {
  winChance × 0.5 // Reduce wins
}
```

#### **Streak Management**

- **First 5 spins:** +15% win chance (warm-up)
- **10-15 loss streak:** +30% win chance (anti-frustration)
- **15+ loss streak:** +80% win chance (retention)
- **5+ win streak:** -40% win chance (cool down)

**Implementation:** `RTPEngine.calculateSpinOutcome()`

---

### 6. Multiplier System

#### **SVG Multiplier Symbols**

Located in `/client/public/`:
```
2.txt → x2 multiplier
3.txt → x3 multiplier
...
9.txt → x9 multiplier
```

#### **Spawn Logic**

**Base chance:** 5%

**Bonuses:**
- Higher bet: +0-9% (scales with bet/minBet ratio)
- Big win: +5% (if base win ≥ 10x)
- Medium win: +3% (if base win ≥ 5x)

**Max spawn chance:** 15%

#### **Weighted Selection**

| Multiplier | Weight | Rarity | Frequency |
|------------|--------|--------|-----------|
| x2 | 100 | Common | ~33% |
| x3 | 80 | Common | ~27% |
| x4 | 50 | Rare | ~17% |
| x5 | 35 | Rare | ~12% |
| x6 | 20 | Rare | ~7% |
| x7 | 10 | Epic | ~3% |
| x8 | 5 | Epic | ~2% |
| x9 | 2 | Epic | ~1% |

#### **Application**

Multiplier applies to **total win** (all paylines):

```typescript
// Example:
Line 1: $50 win
Line 2: $30 win
Total: $80
Multiplier: x4
Final: $80 × 4 = $320
```

**Implementation:** `MultiplierEngine`

---

### 7. Cluster Wins (5x5 Mode)

#### **Cluster Definition**

A cluster is a group of **5+ adjacent matching symbols** (horizontally or vertically connected).

#### **Detection Algorithm**

Uses flood-fill algorithm:
1. Start from each symbol
2. Find all connected matching symbols
3. If ≥5 connected → cluster win

#### **Payout**

Clusters pay in addition to paylines:
```typescript
Total Win = Payline_wins + Cluster_wins
```

**Implementation:** `NftSlotGame.findClusters()`

---

### 8. Pricing & Tokenomics

#### **Three Pricing Models**

##### **A) Fixed Price**
```typescript
C_spin = static_price

Example: 0.5 USDT per spin
```

**Usage:**
```typescript
import { PricingSystem, PRICING_PRESETS } from './PricingSystem';

const config = PRICING_PRESETS.CASUAL; // 0.5 USDT
const metadata = PricingSystem.calculateSpinPrice(config, 0, betAmount);
```

##### **B) Dynamic (Fund-Based)**
```typescript
C_spin = F_prize × rate

Where:
- F_prize = Current prize fund
- rate = 0.003-0.01 (0.3%-1%)

Example:
Fund = $10,000
Rate = 0.005 (0.5%)
Price = $10,000 × 0.005 = $50
```

**Usage:**
```typescript
const config = PricingSystem.createDynamicPricing(
  0.005,  // 0.5% rate
  1,      // $1 minimum
  1000    // $1000 maximum
);

const metadata = PricingSystem.calculateSpinPrice(
  config,
  prizeFund,
  betAmount
);
```

##### **C) Hybrid**
```typescript
C_spin = base_price + (F_prize × rate)

Example:
Base = $5
Fund = $10,000
Rate = 0.0025 (0.25%)
Price = $5 + ($10,000 × 0.0025) = $5 + $25 = $30
```

**Usage:**
```typescript
const config = PRICING_PRESETS.REGULAR; // Hybrid model
```

#### **Pricing Metadata**

Every spin returns pricing information:
```typescript
{
  model: "hybrid",
  spinPrice: 30,
  breakdown: {
    baseFee: 5,
    fundFee: 25,
    discount: 2 // VIP/bonus discounts
  },
  prizeFund: 10000,
  currency: "USDT",
  expectedValue: -1.05, // Player EV (negative = house edge)
  houseEdge: 3.5 // %
}
```

#### **Advanced Calculations**

**Optimal Pricing:**
```typescript
PricingSystem.calculateOptimalPrice(avgPayout, avgBet, targetRTP);
```

**Break-Even Point:**
```typescript
PricingSystem.calculateBreakEven(totalCollected, targetRTP);
```

**Fund Growth Estimation:**
```typescript
PricingSystem.estimateFundGrowth(
  spinsPerHour,
  averagePrice,
  averagePayout,
  rtp
);
```

---

### 9. Paytable System

#### **Theme-Based Configuration**

Three pre-built themes:
1. **Classic** - Fruit machine (cherries, bars, 7s)
2. **Egyptian** - Pharaoh's treasures (pyramids, sphinxes)
3. **Space** - Cosmic adventure (planets, UFOs)

#### **Symbol Configuration**

```typescript
interface SymbolDefinition {
  id: string;
  name: string;
  weight: number;           // Reel frequency
  payoutMultiplier: number; // Win multiplier
  rarity: "common" | "rare" | "epic" | "legendary";
  isWild?: boolean;
  isScatter?: boolean;
}
```

#### **Usage**

```typescript
import { PaytableSystem } from './PaytableSystem';

// Get theme paytable
const paytable = PaytableSystem.getPaytable("egyptian");

// Get symbols for RNG
const symbols = PaytableSystem.getSymbolSet("egyptian");

// Get weighted probabilities
const weights = PaytableSystem.getSymbolWeights("egyptian");

// Get paylines for mode
const paylines = PaytableSystem.getPaylines("egyptian", "5x5");
```

#### **Mathematical Analysis**

**Calculate Theoretical RTP:**
```typescript
const rtp = PaytableSystem.calculateTheoreticalRTP("classic", "3x3");
// Returns: 0.965 (96.5%)
```

**Calculate Hit Frequency:**
```typescript
const hitRate = PaytableSystem.calculateHitFrequency("egyptian", "5x5");
// Returns: 0.22 (22% of spins win)
```

**Calculate Volatility:**
```typescript
const vol = PaytableSystem.calculateVolatility("space");
// Returns: { index: 1.8, level: "medium" }
```

---

## 🎮 Complete Play Flow

### Example: 5x5 Spin with All Features

```typescript
// 1. Player initiates spin
const result = await nftSlotGame.play(
  userId,
  betAmount: 100,
  {
    mode: "5x5",
    freeSpinMode: false,
    userSpinCount: 15 // First 20 spins get bonuses
  }
);

// 2. System processes:
// - RTP engine decides win/loss
// - Generate 25 weighted symbols
// - Check for FREE symbols (free spin trigger)
// - Evaluate 12 paylines + clusters
// - Check for NFT drop
// - Roll for multiplier symbol

// 3. Result contains:
{
  bet: 100,
  payout: 450, // Won 4.5x
  
  symbols: [...], // 25 symbols
  winningLines: [[0,1,2,3,4], [1,6,11,16,21]], // 2 lines
  clusterWins: [{positions: [...], size: 7}], // 1 cluster
  
  nftDrop: {
    tier: "B",
    bonusMultiplier: 2.5,
    nftSymbol: {...}
  },
  
  appliedMultiplier: {
    value: 3,
    imageUrl: "/3.txt",
    rarity: "common"
  },
  
  rtpState: {
    currentRTP: 94.2, // Below target, will boost next spins
    totalSpins: 47,
    consecutiveLosses: 0
  },
  
  freeSpinsTriggered: false,
  freeSpinsAwarded: 0
}
```

---

## 📊 Probability Distributions

### 3x3 Mode (Safe, Transparent)

| Outcome | Probability | Description |
|---------|-------------|-------------|
| Dead spin | 50-60% | No win |
| Small win | 25-30% | 1.2-3x bet |
| Medium win | 10-15% | 3-10x bet |
| Big win | 3-5% | 10-50x bet |
| Epic win | 0.5-1% | 50-100x bet |
| NFT drop | 0.05-0.5% | Tier S/A/B/C bonus |

### 5x5 Mode (Higher Variance)

| Outcome | Probability | Description |
|---------|-------------|-------------|
| Dead spin | 55-65% | No win |
| Small win | 20-25% | 1.2-3x bet |
| Medium win | 8-12% | 3-10x bet |
| Big win | 3-5% | 10-50x bet |
| Epic win | 0.5-1% | 50-100x bet |
| NFT drop | 0.01-0.5% | Tier bonus |
| Cluster win | 2-5% | 5+ adjacent symbols |

---

## 🔧 Integration Guide

### Backend Integration

```typescript
import { NftSlotGame } from './domain/games/NftSlotGame';
import { PaytableSystem } from './domain/games/PaytableSystem';
import { PricingSystem, PRICING_PRESETS } from './domain/games/PricingSystem';

// Initialize game with NFT collection
const game = new NftSlotGame({
  id: "collection-1",
  name: "My NFT Slots",
  sourcePath: "/collections/collection-1",
  items: nftSymbols, // Your NFT collection
  minBet: 5,
  maxBet: 500
});

// Calculate spin price
const pricingConfig = PRICING_PRESETS.REGULAR;
const pricingMeta = PricingSystem.calculateSpinPrice(
  pricingConfig,
  prizeFundBalance,
  betAmount,
  userIsVip
);

// Play spin
const result = await game.play(userId, betAmount, {
  mode: "5x5", // or "3x3", "classic"
  freeSpinMode: userHasFreeSpin,
  userSpinCount: userTotalSpins
});

// Handle result
if (result.payout > 0) {
  await creditUserBalance(userId, result.payout);
}

if (result.metadata.nftDrop) {
  await awardNFT(userId, result.metadata.nftDrop.nftSymbol);
}

if (result.metadata.freeSpinsAwarded > 0) {
  await addFreeSpins(userId, result.metadata.freeSpinsAwarded);
}
```

### Frontend Display

```typescript
// Display symbols in grid
const gridSize = result.metadata.mode === "5x5" ? 5 : 3;
renderGrid(result.metadata.symbols, gridSize);

// Highlight winning lines
for (const line of result.metadata.winningLines) {
  animateWinningLine(line);
}

// Show multiplier
if (result.metadata.appliedMultiplier) {
  showMultiplierAnimation(result.metadata.appliedMultiplier);
}

// Show NFT drop
if (result.metadata.nftDrop) {
  showNFTDropCelebration(result.metadata.nftDrop);
}

// Display RTP stats (for transparency)
displayRTPInfo(result.metadata.rtpState);
```

---

## 📈 Testing & Validation

### RTP Validation

```typescript
// Run 10,000 spins to verify RTP convergence
let totalWagered = 0;
let totalPaid = 0;

for (let i = 0; i < 10000; i++) {
  const result = await game.play(userId, 10, { mode: "3x3" });
  totalWagered += 10;
  totalPaid += result.payout;
}

const actualRTP = totalPaid / totalWagered;
console.log(`RTP after 10k spins: ${(actualRTP * 100).toFixed(2)}%`);
// Should be close to 96.5%
```

### Volatility Testing

```typescript
const wins: number[] = [];
// Collect win amounts over many spins
// Calculate standard deviation
const mean = wins.reduce((a,b) => a+b) / wins.length;
const variance = wins.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / wins.length;
const stdDev = Math.sqrt(variance);
const volatilityIndex = stdDev / mean;

console.log(`Volatility: ${volatilityIndex > 2.5 ? "High" : volatilityIndex > 1.5 ? "Medium" : "Low"}`);
```

---

## 🎯 Best Practices

1. **Server-Side RNG Only** - Never trust client for randomness
2. **Provably Fair** - Store RTP state with each result for transparency
3. **Rate Limiting** - Prevent spam spins
4. **Balance Checks** - Validate user has sufficient funds
5. **Audit Logging** - Log all spins for analysis
6. **Progressive Fund** - Monitor fund health with `PricingSystem.estimateFundGrowth()`
7. **Player Protection** - Implement loss limits, reality checks
8. **Testing** - Validate RTP over 100k+ spins before launch

---

## 📦 File Structure

```
src/domain/games/
├── NftSlotGame.ts           # Main game engine (3x3, 5x5)
├── RTPEngine.ts             # RTP management & probability
├── MultiplierEngine.ts      # x2-x9 multiplier system
├── PaytableSystem.ts        # Theme-based symbol configuration
├── PricingSystem.ts         # Tokenomics & pricing models
└── README_IMPLEMENTATION.md # This file
```

---

## 🔗 Related Files

- **Backend:** `src/application/services/CasinoService.ts`
- **API:** `src/presentation/web/routes/casino.routes.ts`
- **Frontend:** `client/src/app/components/NftSlotGame.tsx`

---

## 📝 License & Compliance

⚠️ **Important:** Online gambling is heavily regulated. Ensure compliance with:
- Local gambling laws
- Age verification
- Responsible gaming features
- Fair gaming certifications
- Anti-money laundering (AML)
- Know Your Customer (KYC)

---

## 🆘 Support

For questions about implementation:
1. Check this documentation
2. Review code comments in source files
3. Test with `npm run dev` and inspect console logs
4. Validate RTP with test suite

---

**Last Updated:** December 2025
**Version:** 2.0
