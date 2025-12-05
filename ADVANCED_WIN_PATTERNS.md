# Advanced Win Patterns System

## Overview
The slot machine now supports **13+ different winning combinations** beyond basic 3-in-a-row, significantly increasing perceived win frequency while maintaining operator profitability through careful probability management.

---

## Win Categories

### 1. Traditional 3-in-a-Row
- **3 identical symbols** (horizontal, vertical, diagonal)
- **Payout**: 2×–10× bet (depends on symbol rarity)
- **NFT Drop Chance**: 1% when using NFT-class symbols
- **Frequency**: ~8-12% of spins (down from 16% with RTP adjustments)

### 2. Near-Miss (2 matching)
- **2 identical symbols** adjacent
- **Payout**: 10-20% bet refund
- **Frequency**: ~15-20% of spins
- **Purpose**: Retention mechanic, keeps players engaged

### 3. Broken Three-in-a-Row (NEW)
- **Pattern**: 2 matching symbols + 1 Wild
- **Examples**: 
  - `[A, Wild, A]`
  - `[Wild, B, B]`
  - `[C, Wild, Wild]`
- **Payout**: 1.5×–3× bet
- **Frequency**: ~5-8% of spins
- **Available in**: 3x3 and 5x5

### 4. L-Shape Match (NEW)
- **Pattern**: 5 symbols forming an L
- **Payout**: 
  - Small L (3 cells): 1.8× bet
  - Big L (5 cells): 3.5× bet
- **Frequency**: ~2-4% of spins
- **Available in**: 3x3 (small), 5x5 (both)

### 5. Corner Match (NEW)
- **Pattern**: All 4 corners identical
- **Payout**: 
  - 3x3: 5× bet
  - 5x5: 8× bet
- **Frequency**: ~0.3-0.5% of spins
- **High visual impact**: Players notice corners easily

### 6. Cross Pattern (NEW)
- **Pattern**: Center + 4 mid-edges
- **Payout**: 
  - 3x3: 10× bet
  - 5x5: 15× bet
- **Frequency**: ~0.2-0.4% of spins
- **Epic win category**

### 7. Plus Sign (5x5 only, NEW)
- **Pattern**: Center + 4 adjacent cells
- **Payout**: 6× bet
- **Frequency**: ~1% of spins

### 8. X Pattern (5x5 only, NEW)
- **Pattern**: Both diagonals match
- **Payout**: 12× bet
- **Frequency**: ~0.15% of spins

### 9. Diamond (5x5 only, NEW)
- **Pattern**: 8 cells forming diamond shape
- **Payout**: 9× bet
- **Frequency**: ~0.2% of spins

### 10. Inner Box (5x5 only, NEW)
- **Pattern**: Inner 3×3 box outline
- **Payout**: 7× bet
- **Frequency**: ~0.3% of spins

### 11. Double Pair (NEW)
- **Pattern**: 2 different pairs anywhere on grid
- **Example**: 2 × Symbol A + 2 × Symbol B
- **Payout**: 1.2× bet
- **Frequency**: ~8-12% of spins
- **Purpose**: Frequent small wins to maintain engagement

### 12. Wild Storm (NEW)
- **Pattern**: 2+ Wilds + any other win
- **Effect**: +3 extra free spins (BONUS)
- **Frequency**: ~1-2% of spins when Wilds appear
- **Stacks with**: All other wins

### 13. Multiplier Symbols (x2–x9)
- **Pattern**: Standalone symbol that appears
- **Effect**: Multiplies total win
- **Frequency**:
  - x2, x3: ~5% (common)
  - x4: ~2% (rare)
  - x5-x7: ~0.5% (epic)
  - x8-x9: ~0.1% (legendary)
- **Can appear**: Even on losing spins (3% tease rate)

---

## Economy & Probability

### Target Win Distribution
```
Dead spin:        55-60%  (no win)
Small win:        25-30%  (0.1×–2× bet)
Medium win:       8-12%   (2×–5× bet)
Big win:          2-4%    (5×–15× bet)
Huge win:         0.5-1%  (15×+ bet)
NFT drop attempt: 0.05%   (structural 3-in-row NFT symbols)
NFT actual drop:  1%      (of attempts = 0.0005% overall)
```

### Target RTP
- **Base RTP**: 70-88% (operator profit: 12-30%)
- **Free Spins RTP**: 40-60% (reduced to prevent exploitation)
- **Overall Long-Term RTP**: ~76-82%

### Symbol Weights (3x3)
```
Common:      60%
Rare:        20%
Epic:        10%
Wild:        6%
Multipliers: 2%
NFT class:   2%
```

### Symbol Weights (5x5)
```
Common:      55%
Rare:        22%
Epic:        12%
Wild:        7%
Multipliers: 2%
NFT class:   2%
```

---

## Wild Mechanics

### Wild Base Behavior
- **Substitution**: Acts as ANY symbol for pattern matching
- **Free Spin**: Always grants +1 free spin
- **Frequency**:
  - 3x3: 1 Wild appears in ~1/8 spins (12.5%)
  - 5x5: 1 Wild appears in ~1/5 spins (20%)

### 3 Wilds Trigger
- **Pattern**: 3 Wild symbols anywhere (not necessarily aligned)
- **Reward**: +10 free spins
- **Frequency**:
  - 3x3: ~0.85-1.3% of spins
  - 5x5: ~2-3% of spins

### Wild Storm (NEW)
- **Pattern**: 2+ Wilds + any win on same spin
- **Reward**: +3 bonus free spins
- **Purpose**: High excitement moment, compounds with other wins

---

## Free Spins Economy

### Free Spin Acquisition
1. **1 Wild**: +1 free spin
2. **3 Wilds**: +10 free spins
3. **Wild Storm**: +3 free spins (bonus)

### Free Spin Modifications (Operator Protection)
To maintain positive house edge:
- **NFT drop rate**: Divided by 5 (0.2% → 0.04%)
- **Multiplier spawn**: Reduced by 50% (12% → 6%)
- **High-tier symbols**: Weighted down by 30%
- **RTP during free spins**: ~50-60% (vs 76% base)

### Chain Prevention
- Free spins **cannot trigger additional free spin bonuses**
- Max free spins per session: 50 (hard cap)
- After 50, all further free spins convert to small coin wins

---

## Multiplier System

### Multiplier Symbols (x2–x9)
Located in `/public/` as SVG files:
- `2.svg` → x2 multiplier
- `3.svg` → x3 multiplier
- ... 
- `9.svg` → x9 multiplier

### Spawn Mechanics
- **Base chance**: 12% on winning spins
- **High bet boost**: Up to 25% at max bet
- **Big win boost**: +8% on 10×+ wins
- **Teaser mode**: 3% chance on losing spins (no effect, just visual)

### Stacking Rules
- Multiple multipliers **multiply together**
  - Example: x2 + x3 = x6 total
- Applied **after** all other bonuses (NFT drops, patterns)
- Work during **free spins** but at reduced rate

---

## Pattern Detection Algorithm

### Priority Order
1. Check traditional 3-in-a-row (highest priority)
2. Check geometric patterns (corners, cross, L-shapes)
3. Check broken patterns (Wild substitution)
4. Check double pair
5. Check Wild storm
6. Check near-miss (consolation)

### Multiple Pattern Handling
- **All matching patterns pay out**
- Payouts **stack additively**
- Example: L-shape (1.8×) + Double pair (1.2×) = 3× bet total

### Wild Substitution Logic
- Wild replaces **any non-legendary** symbol
- Wild **does not** replace NFT-class symbols for drops
- Wild **can** participate in geometric patterns

---

## Operator Protection Mechanisms

### 1. Max Payout Cap
- Default: **500× bet** per spin
- Prevents catastrophic losses
- Configurable per game instance

### 2. NFT Drop Safeguards
- **Structural probability**: 0.05% (3 NFT symbols align)
- **Drop probability**: 1% (of structural events)
- **Combined**: 0.0005% overall
- **Free spin reduction**: ÷5 to prevent farming

### 3. RTP Balancing
- RTPEngine tracks session-level RTP
- **Rubber-band correction**: 
  - If RTP > target: reduce win rate by 15%
  - If RTP < target: increase win rate by 15%
- **Streak management**: 
  - 20+ losses: +50% win boost (retention)
  - 6+ wins: -30% win rate (cool-down)

### 4. Free Spin Economics
- Free spins have **50% lower RTP** than paid spins
- Prevents "free spin farming" strategies
- High-value symbols weighted down 30%

---

## Implementation Details

### Files Modified
1. `WinPatterns.ts` (NEW)
   - Pattern definitions
   - Detection engine
   - Broken pattern logic
   - Double pair detection
   - Wild storm detection

2. `NftSlotGame.ts` (UPDATED)
   - Integrated WinPatternDetector
   - Added pattern payout calculation
   - Updated gameData to include pattern info
   - Wild storm free spin bonus
   - Advanced pattern logging

3. `RTPEngine.ts` (UPDATED)
   - Reduced hitFrequency: 28% → 16%
   - Increased deadSpinRatio: 72% → 84%
   - Removed warm-up boost
   - Reduced RTP correction aggressiveness

4. `MultiplierEngine.ts` (UPDATED)
   - Increased base spawn: 5% → 12%
   - Added teaser mode (3% on losses)
   - Higher spawn on big bets (up to 25%)

### API Response Structure
```typescript
gameData: {
  // Traditional
  matched: boolean,
  multiplier: number,
  symbols: NftSymbol[],
  
  // Advanced Patterns (NEW)
  advancedPatterns: [{
    name: "L-Shape TL",
    description: "Top-left L",
    multiplier: 1.8,
    positions: [0, 1, 3],
    payout: 9.0
  }],
  
  // Double Pair (NEW)
  doublePair: {
    pairs: [
      { symbol: "symbolA", positions: [0, 1] },
      { symbol: "symbolB", positions: [3, 4] }
    ],
    payout: 6.0
  },
  
  // Wild Storm (NEW)
  wildStorm: {
    wildCount: 2,
    wildPositions: [2, 7],
    bonusSpins: 3
  },
  
  // Updated free spins
  freeSpinsAwarded: 13  // includes Wild Storm bonus
}
```

---

## Player Experience Goals

### Perceived Win Frequency
- **Total hit rate**: ~40-45% (vs 16% traditional)
- **Breakdown**:
  - Traditional wins: 16%
  - Advanced patterns: 12-15%
  - Double pairs: 8-12%
  - Near-miss: 15-20%

### Emotional Engagement
1. **Small frequent wins** (double pairs, broken patterns)
   - Keep players engaged
   - Feel like "almost winning big"

2. **Medium wins** (L-shapes, geometric patterns)
   - Exciting moments
   - Visual clarity (shapes are recognizable)

3. **Big wins** (Cross, X, NFT drops)
   - Rare but impactful
   - Screenshots/shares potential

4. **Wild Storm** 
   - Compound excitement
   - Bonus on top of win

### Retention Mechanics
- Multiplier teasers (show on losses)
- Near-miss refunds (10-20%)
- Wild storm bonuses
- Frequent small wins (double pairs)

---

## Configuration

### Recommended Settings (3x3)
```typescript
{
  minBet: 0.2,
  maxBet: 100,
  targetRTP: 0.76,
  volatility: "medium",
  hitFrequency: 0.16,
  maxPayout: 500,
  freeSpinRTPMultiplier: 0.5
}
```

### Recommended Settings (5x5)
```typescript
{
  minBet: 0.3,
  maxBet: 150,
  targetRTP: 0.78,
  volatility: "medium",
  hitFrequency: 0.18,  // slightly higher due to more cells
  maxPayout: 800,
  freeSpinRTPMultiplier: 0.5
}
```

---

## Testing Recommendations

### Simulation Tests
1. **10,000 spins** on 3x3 mode
   - Verify overall RTP: 75-80%
   - Check pattern distribution
   - Confirm NFT drop rate < 0.001%

2. **10,000 spins** on 5x5 mode
   - Verify overall RTP: 76-82%
   - Check 5x5-exclusive patterns
   - Confirm higher engagement

3. **1,000 free spins**
   - Verify reduced RTP: 50-60%
   - Confirm no free spin farming
   - Check multiplier reduction

### Edge Cases
- All Wilds (should still count as win)
- All same symbol (should trigger ALL applicable patterns)
- Max payout cap (should clamp at 500×)
- Free spin chain (should stop at 50)

---

## Future Enhancements

### Planned Features
1. **Cluster Pays** (5x5)
   - 5+ adjacent matching symbols
   - Avalanche/cascade mechanics

2. **Progressive Jackpot**
   - Linked to NFT drops
   - Builds over time

3. **Buy Bonus**
   - Pay 100× to trigger free spins immediately
   - Reduced RTP (60%)

4. **Achievements System**
   - "Hit 3 Cross patterns"
   - "Collect 10 Wild Storms"
   - Unlock cosmetics/badges

---

## Summary

The advanced win pattern system transforms the slot machine from a simple 3-in-a-row game into a rich, multi-layered experience with **13+ winning combinations**. This significantly increases perceived win frequency (~40% total hit rate) while maintaining operator profitability through:

1. **Reduced base RTP** (76-82%)
2. **Controlled free spins** (50% RTP)
3. **NFT drop safeguards** (0.0005% overall)
4. **Max payout caps** (500× bet)
5. **RTP balancing** (rubber-band correction)

Players experience **more frequent engagement** with small/medium wins, while the house maintains a healthy **12-30% margin** long-term.
