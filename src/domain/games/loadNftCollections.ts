import { promises as fs, Dirent } from "fs";
import path from "path";
import { NftGameSymbol, NftSlotConfig, NftSlotGame, NftRarity } from "./NftSlotGame";

interface RawNftItem {
  name?: string;
  price?: string;
  image_url?: string;
}

const COLLECTION_FILE_PATTERN = /^nft_.+\.json$/i;
const DEFAULT_COLLECTION_DIR = path.resolve(process.cwd(), "pyt");

export async function loadNftSlotGames(collectionDir: string = DEFAULT_COLLECTION_DIR): Promise<NftSlotGame[]> {
  const resolvedDir = path.resolve(collectionDir);
  let files: Dirent[] = [];
  try {
    files = await fs.readdir(resolvedDir, { withFileTypes: true });
  } catch (error) {
    console.warn(`[NFT] Collection directory not found: ${resolvedDir}`);
    return [];
  }

  const jsonFiles = files.filter(entry => entry.isFile() && COLLECTION_FILE_PATTERN.test(entry.name));
  const games: NftSlotGame[] = [];

  for (const file of jsonFiles) {
    const filePath = path.join(resolvedDir, file.name);
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(raw) as RawNftItem[];
      if (!Array.isArray(parsed) || parsed.length < 3) {
        console.warn(`[NFT] Skipping ${file.name}: expected an array with at least 3 entries.`);
        continue;
      }

      const symbols = buildSymbols(parsed);
      if (!symbols.length) {
        console.warn(`[NFT] Skipping ${file.name}: no valid NFT entries.`);
        continue;
      }

      const collectionName = deriveCollectionName(parsed, file.name);
      const slug = slugify(file.name.replace(/\.json$/i, ""));
      const stats = calculatePriceStats(symbols);

      const config: NftSlotConfig = {
        id: slug,
        name: collectionName,
        sourcePath: filePath,
        previewImage: symbols[0]?.imageUrl,
        items: symbols,
        priceStats: stats
      };

      games.push(new NftSlotGame(config));
    } catch (error) {
      console.error(`[NFT] Failed to load collection ${file.name}:`, error);
    }
  }

  if (!games.length) {
    console.warn("[NFT] No NFT collections were loaded. Add files like nft_collection_1.json to the pyt directory.");
  }

  return games;
}

function buildSymbols(items: RawNftItem[]): NftGameSymbol[] {
  const enriched = items
    .map((item, index) => {
      const imageUrl = item.image_url?.trim();
      const priceLabel = item.price?.trim() ?? "0";
      if (!imageUrl) {
        return null;
      }
      const priceValue = parsePrice(priceLabel);
      const id = item.name?.trim() || `nft-${index}`;
      return {
        id,
        name: item.name?.trim() || `NFT #${index + 1}`,
        priceLabel,
        priceValue,
        imageUrl
      };
    })
    .filter((value): value is Required<Omit<NftGameSymbol, "rarity">> => Boolean(value));

  if (!enriched.length) {
    return [];
  }

  const rarityMap = assignRarity(enriched);
  return enriched.map(symbol => ({
    ...symbol,
    rarity: rarityMap.get(symbol.id) ?? "common"
  }));
}

function parsePrice(raw: string): number {
  if (!raw) {
    return 0;
  }
  
  // FIXED: Handle space as decimal separator (5 500 = 5.5, 5500 = 5500)
  // If there's a space, treat it as decimal separator
  const trimmed = raw.trim();
  
  // Check if there's a space in the middle (not at start/end)
  const spaceMatch = trimmed.match(/^(\d+)\s+(\d+)$/);
  if (spaceMatch) {
    // Format: "5 500" means 5.5
    const intPart = spaceMatch[1];
    const decPart = spaceMatch[2];
    return parseFloat(`${intPart}.${decPart}`);
  }
  
  // Standard parsing for formats like "5.5", "5,5", "5500"
  const sanitized = trimmed
    .replace(/[\u2000-\u206F]/g, "") // Remove unicode spaces except regular space
    .replace(/[^0-9.,\s]/g, "")      // Keep digits, dot, comma, space
    .replace(/,/g, ".");              // Normalize comma to dot
  
  const value = Number.parseFloat(sanitized);
  return Number.isFinite(value) ? value : 0;
}

function assignRarity(symbols: Array<Required<Omit<NftGameSymbol, "rarity">>>): Map<string, NftRarity> {
  const sorted = [...symbols].sort((a, b) => b.priceValue - a.priceValue);
  const legendaryCount = Math.max(1, Math.floor(sorted.length * 0.05));
  const rareCount = Math.max(legendaryCount, Math.floor(sorted.length * 0.2));
  const legendaryThreshold = sorted[legendaryCount - 1]?.priceValue ?? sorted[0]?.priceValue ?? 0;
  const rareThreshold = sorted[rareCount - 1]?.priceValue ?? legendaryThreshold;

  const rarityMap = new Map<string, NftRarity>();
  for (const symbol of symbols) {
    const rarity: NftRarity = symbol.priceValue >= legendaryThreshold
      ? "legendary"
      : symbol.priceValue >= rareThreshold
        ? "rare"
        : "common";
    rarityMap.set(symbol.id, rarity);
  }
  return rarityMap;
}

function calculatePriceStats(items: NftGameSymbol[]): Required<NftSlotConfig["priceStats"]> {
  const values = items.map(item => item.priceValue);
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0] ?? 0;
  const max = sorted[sorted.length - 1] ?? min;
  const median = sorted[Math.floor(sorted.length / 2)] ?? min;
  const average = values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
  return { min, max, median, average };
}

function deriveCollectionName(items: RawNftItem[], fileName: string): string {
  const firstName = items.find(item => item?.name)?.name?.trim();
  if (firstName) {
    const beforeHash = firstName.split("#")[0]?.trim();
    if (beforeHash) {
      return beforeHash;
    }
    return firstName;
  }
  const fallback = fileName.replace(/\.json$/i, "");
  return fallback
    .replace(/[_-]+/g, " ")
    .split(" ")
    .map(part => part ? part[0].toUpperCase() + part.slice(1) : "")
    .join(" ")
    .trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}
