export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Color = 'red' | 'black';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export class Card {
  public suit: Suit;
  public rank: Rank;
  public faceUp: boolean;
  public color: Color;
  public id: string;

  constructor(suit: Suit, rank: Rank, faceUp = false) {
    this.suit = suit;
    this.rank = rank;
    this.faceUp = faceUp;
    this.color = suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
    this.id = `${suit}-${rank}`;
  }

  get rankName(): string {
    switch (this.rank) {
      case 1: return 'A';
      case 11: return 'J';
      case 12: return 'Q';
      case 13: return 'K';
      default: return this.rank.toString();
    }
  }

  get suitSymbol(): string {
    switch (this.suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
    }
  }
}
