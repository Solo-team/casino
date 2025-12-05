const { Client } = require('pg');
require('dotenv').config();
const crypto = require('crypto');

async function addTestNFTs() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const userEmail = process.argv[2] || 'malavov70@gmail.com';
    console.log(`Looking for user: ${userEmail}`);

    const userResult = await client.query(
      'SELECT id, name FROM users WHERE email = $1 OR name = $1 LIMIT 1',
      [userEmail]
    );

    if (userResult.rows.length === 0) {
      console.error(`User not found: ${userEmail}`);
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`Found user: ${user.name} (${user.id})`);

    const fs = require('fs');
    const path = require('path');
    const collectionDir = path.resolve(process.cwd(), 'pyt');
    
    let nftGames = [];
    try {
      const files = fs.readdirSync(collectionDir, { withFileTypes: true });
      const jsonFiles = files.filter(entry => 
        entry.isFile() && /^nft_.+\.json$/i.test(entry.name)
      );

      for (const file of jsonFiles) {
        const filePath = path.join(collectionDir, file.name);
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        
        if (Array.isArray(parsed) && parsed.length >= 3) {
          const symbols = parsed
            .map((item, index) => {
              const imageUrl = item.image_url?.trim();
              if (!imageUrl) return null;
              
              const priceLabel = item.price?.trim() ?? '0';
              const priceValue = parseFloat(
                priceLabel.replace(/[\u2000-\u206F\s]/g, '')
                  .replace(/[^0-9.,]/g, '')
                  .replace(/,/g, '.')
              ) || 0;
              
              const sorted = [...parsed]
                .map((i, idx) => ({
                  price: parseFloat(
                    (i.price?.trim() ?? '0')
                      .replace(/[\u2000-\u206F\s]/g, '')
                      .replace(/[^0-9.,]/g, '')
                      .replace(/,/g, '.')
                  ) || 0,
                  index: idx
                }))
                .sort((a, b) => b.price - a.price);
              
              const legendaryCount = Math.max(1, Math.floor(sorted.length * 0.05));
              const rareCount = Math.max(legendaryCount, Math.floor(sorted.length * 0.2));
              const legendaryThreshold = sorted[legendaryCount - 1]?.price ?? 0;
              const rareThreshold = sorted[rareCount - 1]?.price ?? legendaryThreshold;
              
              let rarity = 'common';
              if (priceValue >= legendaryThreshold) rarity = 'legendary';
              else if (priceValue >= rareThreshold) rarity = 'rare';
              
              return {
                id: item.name?.trim() || `nft-${index}`,
                name: item.name?.trim() || `NFT #${index + 1}`,
                imageUrl,
                priceLabel,
                priceValue,
                rarity
              };
            })
            .filter(Boolean);

          if (symbols.length > 0) {
            const collectionName = parsed.find(item => item?.name)?.name?.split('#')[0]?.trim() || 
              file.name.replace(/\.json$/i, '').replace(/[_-]+/g, ' ');
            
            nftGames.push({
              id: file.name.replace(/\.json$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              name: collectionName,
              symbols: symbols.slice(0, 10)
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading NFT collections:', error.message);
    }

    if (nftGames.length === 0) {
      console.error('No NFT games found. Please add nft_*.json files to the pyt directory.');
      process.exit(1);
    }

    console.log(`Found ${nftGames.length} NFT collections`);

    const testNFTs = [
      { gameIndex: 0, symbolIndex: 0, rarity: 'legendary' },
      { gameIndex: 0, symbolIndex: 1, rarity: 'rare' },
      { gameIndex: 0, symbolIndex: 2, rarity: 'common' },
      { gameIndex: 0, symbolIndex: 0, rarity: 'legendary' },
      { gameIndex: Math.min(1, nftGames.length - 1), symbolIndex: 0, rarity: 'rare' },
    ];

    for (let i = 0; i < testNFTs.length; i++) {
      const testNFT = testNFTs[i];
      const game = nftGames[testNFT.gameIndex];
      
      if (!game || !game.symbols[testNFT.symbolIndex]) {
        console.log(`Skipping test NFT ${i + 1}: game or symbol not found`);
        continue;
      }

      const symbol = game.symbols[testNFT.symbolIndex];
      const symbols = [symbol, symbol, symbol];
      
      const priceStats = {
        min: Math.min(...game.symbols.map(s => s.priceValue)),
        max: Math.max(...game.symbols.map(s => s.priceValue)),
        median: game.symbols[Math.floor(game.symbols.length / 2)]?.priceValue || 0,
        average: game.symbols.reduce((sum, s) => sum + s.priceValue, 0) / game.symbols.length
      };

      const multiplier = symbol.rarity === 'legendary' ? 20 : symbol.rarity === 'rare' ? 10 : 6;
      const betAmount = 10;
      const payout = betAmount * multiplier;

      const gameData = {
        collectionId: game.id,
        collectionName: game.name,
        symbols: symbols.map(s => ({
          id: s.id,
          name: s.name,
          imageUrl: s.imageUrl,
          priceLabel: s.priceLabel,
          priceValue: s.priceValue,
          rarity: s.rarity
        })),
        matched: true,
        chance: 0.01,
        multiplier,
        priceStats,
        mode: 'classic'
      };

      const resultId = crypto.randomUUID();
      const timestamp = new Date(Date.now() - (testNFTs.length - i) * 60000);

      await client.query(
        `INSERT INTO game_results (
          id, game_id, user_id, game_type, bet_amount, result_type, payout, game_data, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          resultId,
          game.id,
          user.id,
          game.name,
          betAmount,
          'WIN',
          payout,
          JSON.stringify(gameData),
          timestamp
        ]
      );

      console.log(`✅ Added NFT: ${symbol.name} (${symbol.rarity}) from ${game.name}`);
    }

    console.log(`\n🎉 Successfully added ${testNFTs.length} test NFTs to ${user.name}'s account!`);
    console.log('Refresh your account page to see them in the inventory.');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addTestNFTs();

