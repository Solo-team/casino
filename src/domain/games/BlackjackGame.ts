import { IGame } from "../interfaces/IGame";
import { GameResult, GameResultType } from "../entities/GameResult";
import { Deck } from "../value-objects/Deck";
import { Card, Suit, Rank } from "../value-objects/Card";

type BlackjackAction = "deal" | "hit" | "stand";

interface GameState {
  playerHand: Card[];
  dealerHand: Card[];
  deck: Card[];
  status: "playing" | "finished";
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
    const action = (gameData?.action as BlackjackAction) || "deal";
    let state: GameState;

    if (action === "deal") {
      state = this.dealPhase();
    } else {
      state = this.restoreState(gameData?.state);
      if (action === "hit") {
        state = this.hitPhase(state);
      } else if (action === "stand") {
        state = this.standPhase(state);
      }
    }

    if (state.status === "playing") {
      return new GameResult(
        this.generateGameId(),
        userId,
        this.name,
        betAmount,
        GameResultType.DRAW,
        0,
        {
          status: "playing",
          playerHand: state.playerHand.map(c => c.toString()),
          dealerHand: [state.dealerHand[0].toString(), "HIDDEN"],
          playerScore: this.calculateScore(state.playerHand),
          serverState: state
        }
      );
    }

    const resultType = this.determineWinner(state.playerHand, state.dealerHand);
    const isBlackjack = this.isBlackjack(state.playerHand);
    const payout = this.calculatePayout(betAmount, resultType, isBlackjack);

    return new GameResult(
      this.generateGameId(),
      userId,
      this.name,
      betAmount,
      resultType,
      payout,
      {
        status: "finished",
        playerHand: state.playerHand.map(c => c.toString()),
        dealerHand: state.dealerHand.map(c => c.toString()),
        playerScore: this.calculateScore(state.playerHand),
        dealerScore: this.calculateScore(state.dealerHand),
        result: resultType
      }
    );
  }

  private dealPhase(): GameState {
    const deck = new Deck();
    const playerHand = [deck.deal()!, deck.deal()!];
    const dealerHand = [deck.deal()!, deck.deal()!];

    if (this.isBlackjack(playerHand)) {
      return { playerHand, dealerHand, deck: [], status: "finished" };
    }

    return { 
      playerHand, 
      dealerHand, 
      deck: [], 
      status: "playing" 
    };
  }

  private hitPhase(state: GameState): GameState {
    const deck = new Deck();
    const newCard = deck.deal()!;
    state.playerHand.push(newCard);

    const score = this.calculateScore(state.playerHand);
    if (score > 21) {
      state.status = "finished";
    }

    return state;
  }

  private standPhase(state: GameState): GameState {
    const deck = new Deck();
    let dealerScore = this.calculateScore(state.dealerHand);

    while (dealerScore < 17) {
      const newCard = deck.deal()!;
      state.dealerHand.push(newCard);
      dealerScore = this.calculateScore(state.dealerHand);
    }

    state.status = "finished";
    return state;
  }

  private calculateScore(cards: Card[]): number {
    let score = 0;
    let aces = 0;
    for (const card of cards) {
      const val = card.getValue();
      score += val;
      if (val === 11) aces++;
    }
    while (score > 21 && aces > 0) {
      score -= 10;
      aces--;
    }
    return score;
  }

  private isBlackjack(cards: Card[]): boolean {
    return cards.length === 2 && this.calculateScore(cards) === 21;
  }

  private determineWinner(player: Card[], dealer: Card[]): GameResultType {
    const pScore = this.calculateScore(player);
    const dScore = this.calculateScore(dealer);

    if (pScore > 21) return GameResultType.LOSS;
    if (dScore > 21) return GameResultType.WIN;
    
    if (pScore > dScore) return GameResultType.WIN;
    if (pScore < dScore) return GameResultType.LOSS;
    
    return GameResultType.DRAW;
  }

  private calculatePayout(bet: number, result: GameResultType, isBj: boolean): number {
    if (result === GameResultType.LOSS) return 0;
    if (result === GameResultType.DRAW) return bet;
    return isBj ? bet * 2.5 : bet * 2;
  }

  private restoreState(rawState: any): GameState {
    if (!rawState) {
        return { playerHand: [], dealerHand: [], deck: [], status: "playing" };
    }
    
    const restoreCards = (rawCards: any) => {
        if (!Array.isArray(rawCards)) return [];
        return rawCards.map((c: any) => new Card(c.suit as Suit, c.rank as Rank));
    };

    return {
      playerHand: restoreCards(rawState.playerHand),
      dealerHand: restoreCards(rawState.dealerHand),
      deck: [], 
      status: rawState.status || "playing"
    };
  }

  private generateGameId(): string {
    return `bj-${Date.now()}`;
  }
}