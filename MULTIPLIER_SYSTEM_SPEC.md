# Multiplier System with VAU-Effect - Complete Implementation

## Overview
This document describes the **exact implementation** of the multiplier system with VAU-effect (wow-effect) as specified. The system creates high-energy, exciting gameplay while maintaining operator profitability.

---

## 🎰 Multiplier Symbols

### SVG Files
- Located in `/public/` directory
- Files: `2.svg`, `3.svg`, `4.svg`, `5.svg`, `6.svg`, `7.svg`, `8.svg`, `9.svg`
- Each file represents a multiplier symbol with that value

### Symbol Distribution
```typescript
x2 = 2.0% chance  (weight: 200) - Common
x3 = 1.2% chance  (weight: 120) - Common
x4 = 0.8% chance  (weight: 80)  - Rare
x5 = 0.5% chance  (weight: 50)  - Rare
x6 = 0.3% chance  (weight: 30)  - Rare
x7 = 0.12% chance (weight: 12)  - Epic
x8 = 0.04% chance (weight: 4)   - Epic
x9 = 0.01% chance (weight: 1)   - Epic
```

**Total probability: ~4.97%** (split between modes)

---

## 📊 Drop Rates

### Mode-Based Spawn Rates
- **3x3 Mode**: 4% chance per spin
- **5x5 Mode**: 5% chance per spin
- **Free Spins**: **1.5× frequency**
  - 3x3 in free spins: 6%
  - 5x5 in free spins: 7.5%

### Important Rules
✅ **Multipliers ONLY appear on WINNING spins**
✅ **Multipliers STACK MULTIPLICATIVELY**
❌ **Multipliers NEVER replace regular symbols**

---

## 🔥 Multiplicative Stacking

### Examples
```
x2 + x3 = x6
x3 + x5 + x2 = x30
x9 + x9 = x81
```

### Implementation
```typescript
const totalMultiplier = multipliers.reduce((total, mult) => total * mult.value, 1);
finalPayout = baseWin * totalMultiplier;
```

### Free Spins Special Behavior
- Multiple multipliers can drop in a single spin (15% chance for 2nd)
- Multipliers **persist** across all free spins rounds
- Example progression:
  ```
  Spin 1: x2 → persistent = x2
  Spin 3: x3 → persistent = x6  (2 × 3)
  Spin 4: x5 → persistent = x30 (6 × 5)
  Spin 7: x2 → persistent = x60 (30 × 2)
  ```

---

## 🌟 Wild Symbol Mechanics

### Wild (FREE Spin Symbol) Powers
1. **Substitution**: Replaces any symbol
2. **+1 Free Spin**: EVERY Wild awards +1 free spin
3. **3 Wilds = +10 Free Spins**: When 3 Wilds appear anywhere

### Wild Frequency
- **Normal mode**: Standard frequency (in weighted reel strip)
- **Free spins**: **1.3× higher frequency**
  - Implemented as: 13% base chance before reel selection

### 3-Wild Trigger Chances
| Mode | Normal | Free Spins |
|------|--------|------------|
| 3x3  | 1.5%   | 3.0% (2×)  |
| 5x5  | 3.0%   | 6.0% (2×)  |

**Note**: These are **HIGHER than real casinos** to drive engagement.

---

## 🎯 Win Conditions (All Implemented)

### 1. Three-in-Row (Traditional)
- 3 identical symbols in a line (row/column/diagonal)
- **NFT Attempt**: EXACT 1% probability
- Structural NFT chance: 0.05-0.1%

### 2. Two Adjacent Symbols
- **Payout**: 10%-20% of bet (random)
- Horizontal or vertical adjacency
- Scales by symbol value

### 3. Wild Substitution
- Wild replaces any symbol
- Awards +1 free spin per Wild
- 3 Wilds anywhere = +10 free spins

### 4. Broken 3-in-Row
- Pattern: A, Wild, A
- **Payout**: 1.5×-3× bet

### 5. L-Shape (5x5 only)
- Corner + 2 adjacent forming L
- **Payout**: 2×-4× bet

### 6. Corner Match (5x5)
- All 4 corner symbols identical
- **Payout**: 5× bet

### 7. Cross Pattern
- Center + 4 middle edges
- **Payout**: 8×-12× bet

### 8. Double Pair
- 2 separate pairs of identical symbols
- **Payout**: 1.2× bet

### 9. Advanced Geometric Patterns
- Diamond, Plus, X-shape, Inner Box
- Payouts: 2×-8× bet depending on pattern

### 10. Wild Storm
- 2+ Wilds + any win
- **Bonus**: +3 free spins

---

## 🚀 Free Spin Mechanics

### Win Rate Boosts (Inside Free Spins)
- **+8% relative win frequency**
- **+15% for 3-in-row** (non-NFT)
- Broken-3, L-shapes, corners appear more often
- **NFT chance remains UNCHANGED** (economy protection)

### Multiplier Persistence
```typescript
// Outside free spins: Apply only to current spin
if (!isFreeSpinMode) {
  payout = baseWin * currentSpinMultiplier;
}

// Inside free spins: Stack and persist
if (isFreeSpinMode) {
  persistentMultiplier *= currentSpinMultiplier;
  payout = baseWin * persistentMultiplier;
}
```

### Cap Protection
- Maximum free spins cap: **50**
- Prevents infinite free spin chains

---

## 💰 Economy Protection

### Max Payout Cap
- **Default**: 500× bet
- Applied before GameResult creation
- Prevents excessive payouts

### RTP Configuration
- **Target RTP**: 70-88% (operator profitable)
- **Dead Spin Ratio**: 55% (45% wins)
- High-value drops (NFTs) remain extremely rare

### Free Spin Protection
- NFT drop rate unchanged during free spins
- Symbol weights can be adjusted
- Multiplier persistence creates excitement without breaking economy

---

## 💵 Spin Pricing

### Configurable Pricing
```typescript
3x3 Mode: 0.2 - 0.5 USDT per spin
5x5 Mode: 0.3 - 0.8 USDT per spin
```

### Returned in GameResult
```typescript
gameData: {
  spinPrice: 0.35,  // Actual cost
  spinPriceRange: {
    min: 0.2,
    max: 0.5
  }
}
```

---

## 🛠️ Technical Implementation

### MultiplierEngine.ts
```typescript
// Exact drop rates
shouldSpawnMultiplier(mode: "3x3" | "5x5", isFreeSpinMode: boolean): boolean
```

### NftSlotGame.ts
```typescript
// Persistent multiplier tracking
gameData: {
  persistentMultiplier: number,  // Carries over in free spins
  wildCount: number,             // Wilds in current spin
  wildFreeSpins: number,         // Bonus spins from Wilds
  adjacentPairs: Array<...>,     // Two-adjacent wins
  // ... other fields
}
```

### Symbol Files Required
```
/public/2.svg   - x2 multiplier
/public/3.svg   - x3 multiplier
/public/4.svg   - x4 multiplier
/public/5.svg   - x5 multiplier
/public/6.svg   - x6 multiplier
/public/7.svg   - x7 multiplier
/public/8.svg   - x8 multiplier
/public/9.svg   - x9 multiplier
```

---

## 📋 Testing Checklist

### Unit Tests
- [ ] Multiplier spawn rates (3x3: 4%, 5x5: 5%)
- [ ] Free spin boost (1.5× frequency)
- [ ] Multiplicative stacking (x2 × x3 = x6)
- [ ] Persistent multiplier in free spins
- [ ] Wild +1 free spin bonus
- [ ] 3-Wild trigger (3x3: 1.5%, 5x5: 3%)
- [ ] Wild 1.3× frequency in free spins
- [ ] Two-adjacent payouts (10%-20%)
- [ ] Max payout cap (500×)
- [ ] Spin pricing (0.2-0.8 USDT)

### Integration Tests
- [ ] 10,000 spin simulation
- [ ] Actual RTP: 70-82%
- [ ] Win distribution matches spec
- [ ] Operator margin: 12-30%
- [ ] Free spin persistence works
- [ ] NFT drops remain rare (<0.1%)

### Frontend Integration
- [ ] Multiplier symbols load from /public/*.svg
- [ ] Persistent multiplier displayed during free spins
- [ ] Wild count shows bonus spins (+1 each)
- [ ] Adjacent pairs highlighted
- [ ] Spin price displayed correctly

---

## 🎮 Player Experience

### High-Energy Elements
1. **Frequent multiplier sightings** (4-5% base)
2. **Exciting stacking** (x2 + x3 = x6)
3. **Persistent free spin multipliers** (can reach x60+)
4. **Multiple win conditions** (13+ types)
5. **Wild bonuses** (+1 spin each)

### Balanced Economy
1. **Multipliers only on wins** (no false excitement)
2. **Max payout cap** (500× protection)
3. **Rare NFT drops** (<0.1%)
4. **70-88% RTP** (operator profit)
5. **Free spin cap** (max 50)

---

## 📊 Expected Outcomes

### Win Distribution
```
Dead spins:   55%
Small wins:   25% (10-20% return)
Medium wins:  10% (1.2×-3×)
Big wins:     5%  (3×-10×)
Huge wins:    0.5% (10×-50×)
NFT attempts: 0.05% (structural)
```

### Operator Metrics
- **House Edge**: 12-30%
- **Player Retention**: High (exciting gameplay)
- **Volatility**: Medium-High (big wins possible)
- **Session Length**: Extended (frequent small wins)

---

## 🔧 Configuration

All mechanics are modular and configurable:
- Multiplier spawn rates
- Wild frequencies
- Free spin multiplier boost
- Max payout cap
- Spin pricing ranges
- RTP targets

Adjust constants in `NftSlotGame.ts` to fine-tune balance.

---

**Implementation Status**: ✅ COMPLETE  
**Version**: 2.0  
**Last Updated**: December 5, 2025
