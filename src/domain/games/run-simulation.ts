/**
 * Run RTP Simulation Script
 * 
 * This script runs million-spin simulations to validate RTP configuration.
 * 
 * USAGE:
 *   npm run simulate:rtp
 *   npm run simulate:rtp -- --spins 5000000 --mode 5x5
 * 
 * OPTIONS:
 *   --spins <number>    Number of spins (default: 1,000,000)
 *   --mode <3x3|5x5>    Slot mode (default: 3x3)
 *   --bet <number>      Bet amount in USDT (default: 0.5)
 *   --output <file>     Save results to JSON file
 */

import { DEFAULT_SLOT_CONFIG, ConfigValidator } from "./SlotConfig";
import { RTPSimulator, SimulationResult } from "./RTPSimulator";
import * as fs from "fs";
import * as path from "path";

interface SimulationOptions {
  spins: number;
  mode: "3x3" | "5x5";
  betAmount: number;
  outputFile?: string;
}

function parseArgs(): SimulationOptions {
  const args = process.argv.slice(2);
  const options: SimulationOptions = {
    spins: 1_000_000,
    mode: "3x3",
    betAmount: 0.5
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--spins":
        options.spins = parseInt(args[++i], 10);
        break;
      case "--mode":
        options.mode = args[++i] as "3x3" | "5x5";
        break;
      case "--bet":
        options.betAmount = parseFloat(args[++i]);
        break;
      case "--output":
        options.outputFile = args[++i];
        break;
    }
  }

  return options;
}

function saveResults(result: SimulationResult, outputFile: string): void {
  const outputPath = path.resolve(outputFile);
  const json = JSON.stringify(result, null, 2);
  fs.writeFileSync(outputPath, json, "utf-8");
  console.log(`\nResults saved to: ${outputPath}`);
}

function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║          RTP SIMULATION - NFT SLOT MACHINE                 ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("");

  // Parse command-line options
  const options = parseArgs();
  
  console.log("Configuration:");
  console.log(`  Mode: ${options.mode}`);
  console.log(`  Spins: ${options.spins.toLocaleString()}`);
  console.log(`  Bet Amount: $${options.betAmount}`);
  console.log("");

  // Validate configuration
  console.log("Validating configuration...");
  const validation = ConfigValidator.validate(DEFAULT_SLOT_CONFIG);
  
  if (!validation.valid) {
    console.error("❌ Configuration validation failed:");
    validation.errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }
  
  if (validation.warnings.length > 0) {
    console.warn("⚠️  Configuration warnings:");
    validation.warnings.forEach(warn => console.warn(`  - ${warn}`));
  }
  
  console.log("✅ Configuration valid");
  console.log("");

  // Show theoretical RTP estimate
  const rtpEstimate = ConfigValidator.estimateRTP(DEFAULT_SLOT_CONFIG, options.mode);
  console.log("Theoretical RTP Estimate:");
  console.log(`  Target RTP: ${(DEFAULT_SLOT_CONFIG.targetRTP * 100).toFixed(2)}%`);
  console.log(`  Estimated RTP: ${(rtpEstimate.estimatedRTP * 100).toFixed(2)}%`);
  console.log(`  Breakdown:`);
  console.log(`    Win EV: $${rtpEstimate.breakdown.winEV}`);
  console.log(`    Shard EV: $${rtpEstimate.breakdown.shardEV}`);
  console.log(`    NFT EV: $${rtpEstimate.breakdown.nftEV}`);
  console.log("");

  // Run simulation
  console.log("Starting simulation...");
  console.log("");
  
  const simulator = new RTPSimulator(DEFAULT_SLOT_CONFIG, options.mode);
  const result = simulator.simulate(options.spins, options.betAmount);
  
  console.log("");
  console.log(RTPSimulator.generateReport(result));
  
  // Compare actual vs target RTP
  const rtpDifference = Math.abs(result.actualRTP - DEFAULT_SLOT_CONFIG.targetRTP);
  const rtpDifferencePercent = (rtpDifference * 100).toFixed(2);
  
  console.log("RTP VALIDATION:");
  console.log(`  Target RTP: ${(DEFAULT_SLOT_CONFIG.targetRTP * 100).toFixed(2)}%`);
  console.log(`  Actual RTP: ${(result.actualRTP * 100).toFixed(2)}%`);
  console.log(`  Difference: ${rtpDifferencePercent}%`);
  
  if (rtpDifference <= 0.005) {
    console.log(`  ✅ EXCELLENT - Within ±0.5%`);
  } else if (rtpDifference <= 0.01) {
    console.log(`  ✓ GOOD - Within ±1.0%`);
  } else if (rtpDifference <= 0.02) {
    console.log(`  ⚠️  ACCEPTABLE - Within ±2.0%`);
  } else {
    console.log(`  ❌ FAILED - Exceeds ±2.0% tolerance`);
  }
  console.log("");
  
  // NFT issuance rate analysis
  const avgSpinsPerNFT = result.nftStatistics.avgSpinsBetweenNFTs;
  const costPerNFT = avgSpinsPerNFT * options.betAmount;
  
  console.log("NFT ACQUISITION ANALYSIS:");
  console.log(`  Avg Spins per NFT: ${avgSpinsPerNFT.toFixed(0)}`);
  console.log(`  Avg Cost per NFT: $${costPerNFT.toFixed(2)}`);
  console.log(`  Direct Drops: ${Object.values(result.nftStatistics.directDrops).reduce((sum, n) => sum + n, 0)}`);
  console.log(`  From Shards: ${result.shardStatistics.nftsFromShards}`);
  
  const shardPercent = (result.shardStatistics.nftsFromShards / result.nftStatistics.totalNFTs * 100).toFixed(1);
  console.log(`  Shard Redemption Rate: ${shardPercent}%`);
  console.log("");

  // Balance progression analysis
  if (result.balanceSamples.length > 0) {
    console.log("BALANCE PROGRESSION:");
    const samples = result.balanceSamples;
    const finalBalance = samples[samples.length - 1].balance;
    const maxBalance = Math.max(...samples.map(s => s.balance));
    const minBalance = Math.min(...samples.map(s => s.balance));
    
    console.log(`  Final Balance: $${finalBalance.toFixed(2)}`);
    console.log(`  Peak Balance: $${maxBalance.toFixed(2)}`);
    console.log(`  Lowest Balance: $${minBalance.toFixed(2)}`);
    console.log(`  Balance Range: $${(maxBalance - minBalance).toFixed(2)}`);
    console.log("");
  }

  // Save results if output file specified
  if (options.outputFile) {
    saveResults(result, options.outputFile);
  }

  console.log("Simulation complete!");
}

// Run simulation
main();
