import { Card } from '../models/Card';
import { Deck } from '../models/Deck';

export type PileType = 'stock' | 'waste' | 'foundation' | 'tableau';

export interface GameState {
  tableau: Card[][];
  foundations: Card[][];
  stock: Card[];
  waste: Card[];
  moves: number;
  score: number;
}

export class SolitaireGame {
  public tableau: Card[][] = [[], [], [], [], [], [], []];
  public foundations: Card[][] = [[], [], [], []];
  public stock: Card[] = [];
  public waste: Card[] = [];
  public moves: number = 0;
  public score: number = 0;
  public timer: number = 0;
  public gameWon: boolean = false;
  private history: GameState[] = [];
  private timerInterval: any = null;

  constructor() {
    this.newGame();
  }

  public startTimer(onTick: () => void): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (!this.gameWon) {
        this.timer++;
        onTick();
      }
    }, 1000);
  }

  public stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  public newGame(): void {
    this.stopTimer();
    const deck = new Deck();
    this.tableau = [[], [], [], [], [], [], []];
    this.foundations = [[], [], [], []];
    this.stock = [];
    this.waste = [];
    this.moves = 0;
    this.score = 0;
    this.timer = 0;
    this.gameWon = false;
    this.history = [];

    // Deal tableau
    for (let i = 0; i < 7; i++) {
      for (let j = i; j < 7; j++) {
        const card = deck.draw();
        if (card) {
          card.faceUp = (i === j); // Only top card is face up
          this.tableau[j].push(card);
        }
      }
    }

    // Remaining cards go to stock
    while (deck.remaining > 0) {
      const card = deck.draw();
      if (card) {
        card.faceUp = false;
        this.stock.push(card);
      }
    }

    this.saveState();
  }

  private saveState(): void {
    const state: GameState = {
      tableau: this.tableau.map(pile => pile.map(c => Object.assign(new Card(c.suit, c.rank, c.faceUp), c))),
      foundations: this.foundations.map(pile => pile.map(c => Object.assign(new Card(c.suit, c.rank, c.faceUp), c))),
      stock: this.stock.map(c => Object.assign(new Card(c.suit, c.rank, c.faceUp), c)),
      waste: this.waste.map(c => Object.assign(new Card(c.suit, c.rank, c.faceUp), c)),
      moves: this.moves,
      score: this.score
    };
    this.history.push(state);
  }

  public undo(): boolean {
    if (this.history.length <= 1) return false;
    this.history.pop(); // remove current state
    const previousState = this.history[this.history.length - 1];
    
    this.tableau = previousState.tableau.map(pile => pile.map(c => Object.assign(new Card(c.suit, c.rank, c.faceUp), c)));
    this.foundations = previousState.foundations.map(pile => pile.map(c => Object.assign(new Card(c.suit, c.rank, c.faceUp), c)));
    this.stock = previousState.stock.map(c => Object.assign(new Card(c.suit, c.rank, c.faceUp), c));
    this.waste = previousState.waste.map(c => Object.assign(new Card(c.suit, c.rank, c.faceUp), c));
    this.moves = previousState.moves;
    this.score = previousState.score;
    this.gameWon = false;
    return true;
  }

  public drawStock(): boolean {
    this.saveState();
    if (this.stock.length === 0) {
      if (this.waste.length === 0) return false;
      // Recycle waste to stock
      while (this.waste.length > 0) {
        const card = this.waste.pop()!;
        card.faceUp = false;
        this.stock.push(card);
      }
      this.moves++;
      return true;
    }

    const card = this.stock.pop()!;
    card.faceUp = true;
    this.waste.push(card);
    this.moves++;
    return true;
  }

  public canMoveToFoundation(card: Card, foundationIndex: number): boolean {
    const foundation = this.foundations[foundationIndex];
    if (foundation.length === 0) {
      return card.rank === 1; // Ace
    }
    const topCard = foundation[foundation.length - 1];
    return card.suit === topCard.suit && card.rank === topCard.rank + 1;
  }

  public canMoveToTableau(cards: Card[], tableauIndex: number): boolean {
    const pile = this.tableau[tableauIndex];
    const card = cards[0];
    if (pile.length === 0) {
      return card.rank === 13; // King
    }
    const topCard = pile[pile.length - 1];
    if (!topCard.faceUp) return false;
    return card.color !== topCard.color && card.rank === topCard.rank - 1;
  }

  public moveWasteToFoundation(foundationIndex: number): boolean {
    if (this.waste.length === 0) return false;
    const card = this.waste[this.waste.length - 1];
    if (this.canMoveToFoundation(card, foundationIndex)) {
      this.saveState();
      this.waste.pop();
      this.foundations[foundationIndex].push(card);
      this.moves++;
      this.score += 10;
      this.checkWin();
      return true;
    }
    return false;
  }

  public moveWasteToTableau(tableauIndex: number): boolean {
    if (this.waste.length === 0) return false;
    const card = this.waste[this.waste.length - 1];
    if (this.canMoveToTableau([card], tableauIndex)) {
      this.saveState();
      this.waste.pop();
      this.tableau[tableauIndex].push(card);
      this.moves++;
      this.score += 5;
      return true;
    }
    return false;
  }

  public moveTableauToFoundation(tableauIndex: number, foundationIndex: number): boolean {
    const pile = this.tableau[tableauIndex];
    if (pile.length === 0) return false;
    const card = pile[pile.length - 1];
    if (!card.faceUp) return false;

    if (this.canMoveToFoundation(card, foundationIndex)) {
      this.saveState();
      pile.pop();
      this.foundations[foundationIndex].push(card);
      if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
        pile[pile.length - 1].faceUp = true;
        this.score += 5; // flipping card bonus
      }
      this.moves++;
      this.score += 10;
      this.checkWin();
      return true;
    }
    return false;
  }

  public moveTableauToTableau(fromTableauIndex: number, cardIndex: number, toTableauIndex: number): boolean {
    if (fromTableauIndex === toTableauIndex) return false;
    const fromPile = this.tableau[fromTableauIndex];
    if (cardIndex < 0 || cardIndex >= fromPile.length) return false;
    const cardsToMove = fromPile.slice(cardIndex);
    if (!cardsToMove[0].faceUp) return false;

    if (this.canMoveToTableau(cardsToMove, toTableauIndex)) {
      this.saveState();
      fromPile.splice(cardIndex, cardsToMove.length);
      this.tableau[toTableauIndex].push(...cardsToMove);

      if (fromPile.length > 0 && !fromPile[fromPile.length - 1].faceUp) {
        fromPile[fromPile.length - 1].faceUp = true;
        this.score += 5; // flipping card bonus
      }
      this.moves++;
      return true;
    }
    return false;
  }

  public moveFoundationToTableau(foundationIndex: number, tableauIndex: number): boolean {
    const foundation = this.foundations[foundationIndex];
    if (foundation.length === 0) return false;
    const card = foundation[foundation.length - 1];

    if (this.canMoveToTableau([card], tableauIndex)) {
      this.saveState();
      foundation.pop();
      this.tableau[tableauIndex].push(card);
      this.moves++;
      this.score -= 15;
      return true;
    }
    return false;
  }

  private checkWin(): void {
    const totalFoundationCards = this.foundations.reduce((sum, pile) => sum + pile.length, 0);
    if (totalFoundationCards === 52) {
      this.gameWon = true;
      this.stopTimer();
    }
  }
}
