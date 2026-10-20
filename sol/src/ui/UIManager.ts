import { SolitaireGame } from '../game/SolitaireGame';
import { Card } from '../models/Card';

export class UIManager {
  private game: SolitaireGame;
  private container: HTMLElement;
  private selectedSelection: { type: 'waste' | 'tableau' | 'foundation'; pileIndex: number; cardIndex?: number } | null = null;

  constructor(container: HTMLElement, game: SolitaireGame) {
    this.container = container;
    this.game = game;
    this.init();
  }

  private init(): void {
    this.render();
    this.game.startTimer(() => this.updateStats());
  }

  public render(): void {
    this.container.innerHTML = `
      <header>
        <h1>KLONDIKE SOLITAIRE</h1>
        <div class="stats">
          <div class="stat-item">Moves: <span id="moves-val">${this.game.moves}</span></div>
          <div class="stat-item">Score: <span id="score-val">${this.game.score}</span></div>
          <div class="stat-item">Time: <span id="time-val">${this.formatTime(this.game.timer)}</span></div>
        </div>
        <div class="controls">
          <button id="undo-btn">Undo</button>
          <button id="new-game-btn">New Game</button>
        </div>
      </header>

      <div class="game-board">
        <div class="top-area">
          <div class="stock-waste-area">
            <div class="pile stock-pile" id="stock-pile"></div>
            <div class="pile waste-pile" id="waste-pile"></div>
          </div>
          <div class="foundations-area" id="foundations-area">
            <div class="pile foundation-pile" data-index="0"></div>
            <div class="pile foundation-pile" data-index="1"></div>
            <div class="pile foundation-pile" data-index="2"></div>
            <div class="pile foundation-pile" data-index="3"></div>
          </div>
        </div>

        <div class="tableau-area" id="tableau-area">
          ${[0, 1, 2, 3, 4, 5, 6].map(i => `<div class="tableau-pile" data-index="${i}"></div>`).join('')}
        </div>
      </div>

      ${this.game.gameWon ? `
        <div class="modal-overlay">
          <div class="modal">
            <h2>You Won! 🎉</h2>
            <p>Congratulations! You solved the game in ${this.game.moves} moves and ${this.formatTime(this.game.timer)} with a score of ${this.game.score}.</p>
            <button id="modal-new-game-btn">Play Again</button>
          </div>
        </div>
      ` : ''}
    `;

    this.attachEventListeners();
    this.populateBoard();
  }

  private updateStats(): void {
    const movesEl = document.getElementById('moves-val');
    const scoreEl = document.getElementById('score-val');
    const timeEl = document.getElementById('time-val');
    if (movesEl) movesEl.textContent = this.game.moves.toString();
    if (scoreEl) scoreEl.textContent = this.game.score.toString();
    if (timeEl) timeEl.textContent = this.formatTime(this.game.timer);
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  private attachEventListeners(): void {
    document.getElementById('new-game-btn')?.addEventListener('click', () => {
      this.game.newGame();
      this.selectedSelection = null;
      this.render();
    });

    document.getElementById('modal-new-game-btn')?.addEventListener('click', () => {
      this.game.newGame();
      this.selectedSelection = null;
      this.render();
    });

    document.getElementById('undo-btn')?.addEventListener('click', () => {
      this.game.undo();
      this.selectedSelection = null;
      this.render();
    });

    // Stock pile click
    document.getElementById('stock-pile')?.addEventListener('click', () => {
      this.game.drawStock();
      this.selectedSelection = null;
      this.render();
    });

    // Foundation click targets
    document.querySelectorAll('.foundation-pile').forEach(el => {
      const index = parseInt(el.getAttribute('data-index')!);
      el.addEventListener('click', () => {
        if (this.selectedSelection) {
          if (this.selectedSelection.type === 'waste') {
            if (this.game.moveWasteToFoundation(index)) {
              this.selectedSelection = null;
              this.render();
              return;
            }
          } else if (this.selectedSelection.type === 'tableau' && this.selectedSelection.cardIndex !== undefined) {
            // Check if it's the top card of the tableau pile
            const pile = this.game.tableau[this.selectedSelection.pileIndex];
            if (this.selectedSelection.cardIndex === pile.length - 1) {
              if (this.game.moveTableauToFoundation(this.selectedSelection.pileIndex, index)) {
                this.selectedSelection = null;
                this.render();
                return;
              }
            }
          }
        }
        this.selectedSelection = null;
        this.render();
      });
    });

    // Tableau click targets for empty piles or placing cards
    document.querySelectorAll('.tableau-pile').forEach(el => {
      const index = parseInt(el.getAttribute('data-index')!);
      el.addEventListener('click', (e) => {
        // If clicking directly on empty space of tableau pile
        if (e.target === el && this.selectedSelection) {
          this.executeMove(index);
        }
      });
    });
  }

  private populateBoard(): void {
    // Populate Stock
    const stockEl = document.getElementById('stock-pile');
    if (stockEl && this.game.stock.length > 0) {
      const card = this.game.stock[this.game.stock.length - 1];
      stockEl.appendChild(this.createCardElement(card));
    }

    // Populate Waste
    const wasteEl = document.getElementById('waste-pile');
    if (wasteEl && this.game.waste.length > 0) {
      const card = this.game.waste[this.game.waste.length - 1];
      const cardEl = this.createCardElement(card, { type: 'waste', pileIndex: 0 });
      if (this.selectedSelection?.type === 'waste') {
        cardEl.classList.add('selected');
      }
      cardEl.addEventListener('dblclick', () => {
        // Try to move to any foundation automatically
        for (let i = 0; i < 4; i++) {
          if (this.game.moveWasteToFoundation(i)) {
            this.selectedSelection = null;
            this.render();
            return;
          }
        }
      });
      wasteEl.appendChild(cardEl);
    }

    // Populate Foundations
    this.game.foundations.forEach((pile, index) => {
      const foundationEl = document.querySelector(`.foundation-pile[data-index="${index}"]`);
      if (foundationEl && pile.length > 0) {
        const card = pile[pile.length - 1];
        const cardEl = this.createCardElement(card);
        cardEl.addEventListener('dblclick', () => {
          // Try to move back to tableau
          for (let t = 0; t < 7; t++) {
            if (this.game.moveFoundationToTableau(index, t)) {
              this.selectedSelection = null;
              this.render();
              return;
            }
          }
        });
        foundationEl.appendChild(cardEl);
      }
    });

    // Populate Tableau
    this.game.tableau.forEach((pile, pileIndex) => {
      const tableauEl = document.querySelector(`.tableau-pile[data-index="${pileIndex}"]`);
      if (tableauEl) {
        pile.forEach((card, cardIndex) => {
          const cardEl = this.createCardElement(card, { type: 'tableau', pileIndex, cardIndex });
          cardEl.style.top = `${cardIndex * 28}px`;

          if (this.selectedSelection?.type === 'tableau' &&
              this.selectedSelection.pileIndex === pileIndex &&
              this.selectedSelection.cardIndex !== undefined &&
              cardIndex >= this.selectedSelection.cardIndex) {
            cardEl.classList.add('selected');
          }

          // Double click top card to move to foundation
          if (card.faceUp && cardIndex === pile.length - 1) {
            cardEl.addEventListener('dblclick', (e) => {
              e.stopPropagation();
              for (let f = 0; f < 4; f++) {
                if (this.game.moveTableauToFoundation(pileIndex, f)) {
                  this.selectedSelection = null;
                  this.render();
                  return;
                }
              }
            });
          }

          tableauEl.appendChild(cardEl);
        });
      }
    });
  }

  private createCardElement(card: Card, selectionInfo?: { type: 'waste' | 'tableau' | 'foundation'; pileIndex: number; cardIndex?: number }): HTMLElement {
    const el = document.createElement('div');
    el.className = `card ${card.faceUp ? card.color : 'face-down'}`;

    if (card.faceUp) {
      el.innerHTML = `
        <div class="card-top">
          <span>${card.rankName}</span>
          <span>${card.suitSymbol}</span>
        </div>
        <div class="card-center">${card.suitSymbol}</div>
        <div class="card-bottom">
          <span>${card.rankName}</span>
          <span>${card.suitSymbol}</span>
        </div>
      `;

      if (selectionInfo) {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleCardClick(selectionInfo);
        });
      }
    }

    return el;
  }

  private handleCardClick(info: { type: 'waste' | 'tableau' | 'foundation'; pileIndex: number; cardIndex?: number }): void {
    if (!this.selectedSelection) {
      // If clicking a face-down card in tableau, ignore
      if (info.type === 'tableau' && info.cardIndex !== undefined) {
        const card = this.game.tableau[info.pileIndex][info.cardIndex];
        if (!card.faceUp) return;
      }
      this.selectedSelection = info;
      this.render();
    } else {
      // Already have a selection, attempt move or reselect
      if (this.selectedSelection.type === 'tableau' && info.type === 'tableau') {
        if (this.selectedSelection.pileIndex === info.pileIndex && this.selectedSelection.cardIndex === info.cardIndex) {
          // Deselect
          this.selectedSelection = null;
          this.render();
          return;
        }
        // Try move tableau to tableau
        if (this.selectedSelection.cardIndex !== undefined) {
          if (this.game.moveTableauToTableau(this.selectedSelection.pileIndex, this.selectedSelection.cardIndex, info.pileIndex)) {
            this.selectedSelection = null;
            this.render();
            return;
          }
        }
      } else if (this.selectedSelection.type === 'waste' && info.type === 'tableau') {
        if (this.game.moveWasteToTableau(info.pileIndex)) {
          this.selectedSelection = null;
          this.render();
          return;
        }
      }

      // If move failed or clicked another valid source card, change selection
      if (info.type === 'tableau' && info.cardIndex !== undefined) {
        const card = this.game.tableau[info.pileIndex][info.cardIndex];
        if (card.faceUp) {
          this.selectedSelection = info;
          this.render();
          return;
        }
      }
      this.selectedSelection = null;
      this.render();
    }
  }

  private executeMove(targetTableauIndex: number): void {
    if (!this.selectedSelection) return;

    if (this.selectedSelection.type === 'waste') {
      if (this.game.moveWasteToTableau(targetTableauIndex)) {
        this.selectedSelection = null;
        this.render();
      }
    } else if (this.selectedSelection.type === 'tableau' && this.selectedSelection.cardIndex !== undefined) {
      if (this.game.moveTableauToTableau(this.selectedSelection.pileIndex, this.selectedSelection.cardIndex, targetTableauIndex)) {
        this.selectedSelection = null;
        this.render();
      }
    }
  }
}
