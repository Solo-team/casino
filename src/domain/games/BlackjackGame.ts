import { IGame } from "../interfaces/IGame";
import { GameResult, GameResultType } from "../entities/GameResult";
import { Deck } from "../value-objects/Deck";
import { Card } from "../value-objects/Card";

interface Hand {
  cards: Card[];
  score: number;
  isBusted: boolean;
  isBlackjack: boolean;
}

export class BlackjackGame implements IGame {
  readonly name = "Blackjack";
  readonly id = "blackjack";
  private readonly minBet = 10;
  private readonly maxBet = 1000;

  validateBet(betAmount: number, userBalance: number): boolean {
    return (
      betAmount >= this.minBet &&
      betAmount <= this.maxBet &&
      betAmount <= userBalance
    );
  }

  getMinBet(): number {
    return this.minBet;
  }

  getMaxBet(): number {
    return this.maxBet;
  }

  async play(
    userId: string,
    betAmount: number,
    gameData?: Record<string, any>
  ): Promise<GameResult> {
    const deck = new Deck();
    const playerHand = this.dealHand(deck);
    const dealerHand = this.dealHand(deck);

    let playerFinalHand = playerHand;
    if (gameData?.action === "hit" && !playerHand.isBusted && !playerHand.isBlackjack) {
      const newCard = deck.deal();
      if (newCard) {
        playerFinalHand = this.addCardToHand(playerHand, newCard);
      }
    }

    let dealerFinalHand = dealerHand;
    while (dealerFinalHand.score < 17 && !dealerFinalHand.isBusted) {
      const newCard = deck.deal();
      if (newCard) {
        dealerFinalHand = this.addCardToHand(dealerFinalHand, newCard);
      } else {
        break;
      }
    }

    const resultType = this.determineWinner(playerFinalHand, dealerFinalHand);
    const payout = this.calculatePayout(betAmount, resultType, playerFinalHand.isBlackjack);

    return new GameResult(
      this.generateGameId(),
      userId,
      this.name,
      betAmount,
      resultType,
      payout,
      {
        playerHand: playerFinalHand.cards.map(c => c.toString()),
        dealerHand: dealerFinalHand.cards.map(c => c.toString()),
        playerScore: playerFinalHand.score,
        dealerScore: dealerFinalHand.score,
        isBlackjack: playerFinalHand.isBlackjack
      }
    );
  }

  private dealHand(deck: Deck): Hand {
    const cards: Card[] = [];
    const card1 = deck.deal();
    const card2 = deck.deal();
    
    if (card1 && card2) {
      cards.push(card1, card2);
    }

    return this.calculateHand(cards);
  }

  private addCardToHand(hand: Hand, card: Card): Hand {
    const newCards = [...hand.cards, card];
    return this.calculateHand(newCards);
  }

  private calculateHand(cards: Card[]): Hand {
    let score = 0;
    let aces = 0;

    for (const card of cards) {
      const value = card.getValue();
      if (value === 11) {
        aces++;
      }
      score += value;
    }

    while (score > 21 && aces > 0) {
      score -= 10;
      aces--;
    }

    const isBusted = score > 21;
    const isBlackjack = cards.length === 2 && score === 21;

    return {
      cards,
      score,
      isBusted,
      isBlackjack
    };
  }

  private determineWinner(playerHand: Hand, dealerHand: Hand): GameResultType {
    if (playerHand.isBusted) {
      return GameResultType.LOSS;
    }

    if (dealerHand.isBusted) {
      return GameResultType.WIN;
    }

    if (playerHand.isBlackjack && !dealerHand.isBlackjack) {
      return GameResultType.WIN;
    }

    if (playerHand.score > dealerHand.score) {
      return GameResultType.WIN;
    }

    if (playerHand.score < dealerHand.score) {
      return GameResultType.LOSS;
    }

    return GameResultType.DRAW;
  }

  private calculatePayout(
    betAmount: number,
    resultType: GameResultType,
    isBlackjack: boolean
  ): number {
    if (resultType === GameResultType.LOSS) {
      return 0;
    }

    if (resultType === GameResultType.DRAW) {
      return betAmount;
    }

    if (isBlackjack) {
      return betAmount * 2.5;
    }

    return betAmount * 2;
  }

  private generateGameId(): string {
    return `blackjack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
