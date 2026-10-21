import { SolitaireGame } from '../game/SolitaireGame';
import { Card } from '../models/Card';

export class UIManager {
  private game: SolitaireGame;
  private container: HTMLElement;
  private selectedSelection: { type: 'waste' | 'tableau' | 'foundation'; pileIndex: number; cardIndex?: number } | null = null;
  private draggedData: { type: 'waste' | 'tableau' | 'foundation'; pileIndex: number; cardIndex?: number } | null = null;

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
    this.updateSelectionUI();
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

  private updateSelectionUI(): void {
    document.querySelectorAll('.card.selected').forEach(el => el.classList.remove('selected'));

    if (!this.selectedSelection) return;

    if (this.selectedSelection.type === 'waste') {
      const wasteCard = document.querySelector('.waste-pile .card');
      wasteCard?.classList.add('selected');
    } else if (this.selectedSelection.type === 'foundation') {
      const foundationCard = document.querySelector(`.foundation-pile[data-index="${this.selectedSelection.pileIndex}"] .card:last-child`);
      foundationCard?.classList.add('selected');
    } else if (this.selectedSelection.type === 'tableau' && this.selectedSelection.cardIndex !== undefined) {
      const tableauPile = document.querySelector(`.tableau-pile[data-index="${this.selectedSelection.pileIndex}"]`);
      if (tableauPile) {
        const cards = tableauPile.querySelectorAll('.card');
        for (let i = this.selectedSelection.cardIndex; i < cards.length; i++) {
          cards[i].classList.add('selected');
        }
      }
    }
  }

  private flipAnimate(startRect: DOMRect, targetSelector: string): void {
    requestAnimationFrame(() => {
      const targetEl = document.querySelector(targetSelector) as HTMLElement | null;
      if (!targetEl) return;
      const endRect = targetEl.getBoundingClientRect();
      const dx = startRect.left - endRect.left;
      const dy = startRect.top - endRect.top;

      targetEl.style.zIndex = '1000';
      const anim = targetEl.animate([
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: 'translate(0, 0)' }
      ], {
        duration: 250,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
      });

      anim.onfinish = () => {
        targetEl.style.zIndex = '';
      };
    });
  }

  private autoMoveToFoundationFromCard(type: 'waste' | 'tableau', pileIndex: number, foundationIndex: number): void {
    let startRect: DOMRect | null = null;
    if (type === 'waste') {
      const el = document.querySelector('.waste-pile .card');
      startRect = el ? el.getBoundingClientRect() : null;
      this.game.moveWasteToFoundation(foundationIndex);
    } else {
      const el = document.querySelector(`.tableau-pile[data-index="${pileIndex}"] .card:last-child`);
      startRect = el ? el.getBoundingClientRect() : null;
      this.game.moveTableauToFoundation(pileIndex, foundationIndex);
    }

    this.selectedSelection = null;
    this.render();
    if (startRect) {
      this.flipAnimate(startRect, `.foundation-pile[data-index="${foundationIndex}"] .card:last-child`);
    }

    // Cascade next cards automatically
    setTimeout(() => this.cascadeToFoundations(), 220);
  }

  private cascadeToFoundations(): void {
    // 1. Check waste pile
    if (this.game.waste.length > 0) {
      const wasteCard = this.game.waste[this.game.waste.length - 1];
      for (let f = 0; f < 4; f++) {
        if (this.game.canMoveToFoundation(wasteCard, f)) {
          const wasteEl = document.querySelector('.waste-pile .card');
          const startRect = wasteEl ? wasteEl.getBoundingClientRect() : null;
          this.game.moveWasteToFoundation(f);
          this.selectedSelection = null;
          this.render();
          if (startRect) {
            this.flipAnimate(startRect, `.foundation-pile[data-index="${f}"] .card:last-child`);
          }
          setTimeout(() => this.cascadeToFoundations(), 220);
          return;
        }
      }
    }

    // 2. Check each tableau pile top card
    for (let t = 0; t < 7; t++) {
      const pile = this.game.tableau[t];
      if (pile.length > 0) {
        const card = pile[pile.length - 1];
        if (card.faceUp) {
          for (let f = 0; f < 4; f++) {
            if (this.game.canMoveToFoundation(card, f)) {
              const el = document.querySelector(`.tableau-pile[data-index="${t}"] .card:last-child`);
              const startRect = el ? el.getBoundingClientRect() : null;
              this.game.moveTableauToFoundation(t, f);
              this.selectedSelection = null;
              this.render();
              if (startRect) {
                this.flipAnimate(startRect, `.foundation-pile[data-index="${f}"] .card:last-child`);
              }
              setTimeout(() => this.cascadeToFoundations(), 220);
              return;
            }
          }
        }
      }
    }
  }

  private attachEventListeners(): void {
    this.container.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

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

    document.getElementById('stock-pile')?.addEventListener('click', () => {
      this.game.drawStock();
      this.selectedSelection = null;
      this.render();
    });

    // Foundation drop targets
    document.querySelectorAll('.foundation-pile').forEach(el => {
      const index = parseInt(el.getAttribute('data-index')!);
      
      el.addEventListener('dragover', (e) => e.preventDefault());

      el.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!this.draggedData) return;

        let moved = false;
        if (this.draggedData.type === 'waste') {
          moved = this.game.moveWasteToFoundation(index);
        } else if (this.draggedData.type === 'tableau' && this.draggedData.cardIndex !== undefined) {
          const pile = this.game.tableau[this.draggedData.pileIndex];
          if (this.draggedData.cardIndex === pile.length - 1) {
            moved = this.game.moveTableauToFoundation(this.draggedData.pileIndex, index);
          }
        }

        this.draggedData = null;
        this.selectedSelection = null;
        if (moved) {
          this.render();
        }
      });

      el.addEventListener('click', () => {
        if (this.selectedSelection) {
          if (this.selectedSelection.type === 'waste') {
            if (this.game.moveWasteToFoundation(index)) {
              this.selectedSelection = null;
              this.render();
              return;
            }
          } else if (this.selectedSelection.type === 'tableau' && this.selectedSelection.cardIndex !== undefined) {
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
        this.updateSelectionUI();
      });
    });

    // Tableau drop targets
    document.querySelectorAll('.tableau-pile').forEach(el => {
      const index = parseInt(el.getAttribute('data-index')!);

      el.addEventListener('dragover', (e) => e.preventDefault());

      el.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!this.draggedData) return;

        let moved = false;
        if (this.draggedData.type === 'waste') {
          moved = this.game.moveWasteToTableau(index);
        } else if (this.draggedData.type === 'tableau' && this.draggedData.cardIndex !== undefined) {
          moved = this.game.moveTableauToTableau(this.draggedData.pileIndex, this.draggedData.cardIndex, index);
        } else if (this.draggedData.type === 'foundation') {
          moved = this.game.moveFoundationToTableau(this.draggedData.pileIndex, index);
        }

        this.draggedData = null;
        this.selectedSelection = null;
        if (moved) {
          this.render();
        }
      });

      el.addEventListener('click', (e) => {
        if (e.target === el && this.selectedSelection) {
          this.executeMove(index);
        }
      });
    });
  }

  private populateBoard(): void {
    const stockEl = document.getElementById('stock-pile');
    if (stockEl && this.game.stock.length > 0) {
      const card = this.game.stock[this.game.stock.length - 1];
      stockEl.appendChild(this.createCardElement(card));
    }

    const wasteEl = document.getElementById('waste-pile');
    if (wasteEl && this.game.waste.length > 0) {
      const card = this.game.waste[this.game.waste.length - 1];
      const cardEl = this.createCardElement(card, { type: 'waste', pileIndex: 0 });
      cardEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const startRect = cardEl.getBoundingClientRect();
        for (let i = 0; i < 4; i++) {
          if (this.game.canMoveToFoundation(card, i)) {
            this.game.moveWasteToFoundation(i);
            this.selectedSelection = null;
            this.render();
            this.flipAnimate(startRect, `.foundation-pile[data-index="${i}"] .card:last-child`);
            return;
          }
        }
      });

      cardEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        for (let i = 0; i < 4; i++) {
          if (this.game.canMoveToFoundation(card, i)) {
            this.autoMoveToFoundationFromCard('waste', 0, i);
            return;
          }
        }
      });

      wasteEl.appendChild(cardEl);
    }

    this.game.foundations.forEach((pile, index) => {
      const foundationEl = document.querySelector(`.foundation-pile[data-index="${index}"]`);
      if (foundationEl && pile.length > 0) {
        if (pile.length > 1) {
          const prevCard = pile[pile.length - 2];
          const prevCardEl = this.createCardElement(prevCard);
          foundationEl.appendChild(prevCardEl);
        }

        const topCard = pile[pile.length - 1];
        const topCardEl = this.createCardElement(topCard, { type: 'foundation', pileIndex: index });
        topCardEl.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          const startRect = topCardEl.getBoundingClientRect();
          for (let t = 0; t < 7; t++) {
            if (this.game.canMoveToTableau([topCard], t)) {
              this.game.moveFoundationToTableau(index, t);
              this.selectedSelection = null;
              this.render();
              this.flipAnimate(startRect, `.tableau-pile[data-index="${t}"] .card:last-child`);
              return;
            }
          }
        });
        foundationEl.appendChild(topCardEl);
      }
    });

    this.game.tableau.forEach((pile, pileIndex) => {
      const tableauEl = document.querySelector(`.tableau-pile[data-index="${pileIndex}"]`);
      if (tableauEl) {
        pile.forEach((card, cardIndex) => {
          const cardEl = this.createCardElement(card, { type: 'tableau', pileIndex, cardIndex });
          cardEl.style.top = `${cardIndex * 28}px`;

          if (card.faceUp && cardIndex === pile.length - 1) {
            cardEl.addEventListener('dblclick', (e) => {
              e.stopPropagation();
              const startRect = cardEl.getBoundingClientRect();
              for (let f = 0; f < 4; f++) {
                if (this.game.canMoveToFoundation(card, f)) {
                  this.game.moveTableauToFoundation(pileIndex, f);
                  this.selectedSelection = null;
                  this.render();
                  this.flipAnimate(startRect, `.foundation-pile[data-index="${f}"] .card:last-child`);
                  return;
                }
              }
            });

            cardEl.addEventListener('contextmenu', (e) => {
              e.preventDefault();
              e.stopPropagation();
              for (let f = 0; f < 4; f++) {
                if (this.game.canMoveToFoundation(card, f)) {
                  this.autoMoveToFoundationFromCard('tableau', pileIndex, f);
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
        el.draggable = true;
        el.addEventListener('dragstart', () => {
          this.draggedData = selectionInfo;
          el.classList.add('dragging');
        });

        el.addEventListener('dragend', () => {
          el.classList.remove('dragging');
          this.draggedData = null;
        });

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
      if (info.type === 'tableau' && info.cardIndex !== undefined) {
        const card = this.game.tableau[info.pileIndex][info.cardIndex];
        if (!card.faceUp) return;
      }
      this.selectedSelection = info;
      this.updateSelectionUI();
    } else {
      const startCardEl = document.querySelector(this.getCardSelector(this.selectedSelection));
      const startRect = startCardEl ? startCardEl.getBoundingClientRect() : null;

      if (this.selectedSelection.type === 'tableau' && info.type === 'tableau') {
        if (this.selectedSelection.pileIndex === info.pileIndex && this.selectedSelection.cardIndex === info.cardIndex) {
          this.selectedSelection = null;
          this.updateSelectionUI();
          return;
        }
        if (this.selectedSelection.cardIndex !== undefined) {
          if (this.game.moveTableauToTableau(this.selectedSelection.pileIndex, this.selectedSelection.cardIndex, info.pileIndex)) {
            this.selectedSelection = null;
            this.render();
            if (startRect) this.flipAnimate(startRect, `.tableau-pile[data-index="${info.pileIndex}"] .card:last-child`);
            return;
          }
        }
      } else if (this.selectedSelection.type === 'waste' && info.type === 'tableau') {
        if (this.game.moveWasteToTableau(info.pileIndex)) {
          this.selectedSelection = null;
          this.render();
          if (startRect) this.flipAnimate(startRect, `.tableau-pile[data-index="${info.pileIndex}"] .card:last-child`);
          return;
        }
      } else if (this.selectedSelection.type === 'foundation' && info.type === 'tableau') {
        if (this.game.moveFoundationToTableau(this.selectedSelection.pileIndex, info.pileIndex)) {
          this.selectedSelection = null;
          this.render();
          if (startRect) this.flipAnimate(startRect, `.tableau-pile[data-index="${info.pileIndex}"] .card:last-child`);
          return;
        }
      }

      if (info.type === 'tableau' && info.cardIndex !== undefined) {
        const card = this.game.tableau[info.pileIndex][info.cardIndex];
        if (card.faceUp) {
          this.selectedSelection = info;
          this.updateSelectionUI();
          return;
        }
      }
      this.selectedSelection = null;
      this.updateSelectionUI();
    }
  }

  private executeMove(targetTableauIndex: number): void {
    if (!this.selectedSelection) {
      return;
    }
    const startCardEl = document.querySelector(this.getCardSelector(this.selectedSelection));
    const startRect = startCardEl ? startCardEl.getBoundingClientRect() : null;

    let moved = false;
    if (this.selectedSelection.type === 'waste') {
      moved = this.game.moveWasteToTableau(targetTableauIndex);
    } else if (this.selectedSelection.type === 'tableau' && this.selectedSelection.cardIndex !== undefined) {
      moved = this.game.moveTableauToTableau(this.selectedSelection.pileIndex, this.selectedSelection.cardIndex, targetTableauIndex);
    } else if (this.selectedSelection.type === 'foundation') {
      moved = this.game.moveFoundationToTableau(this.selectedSelection.pileIndex, targetTableauIndex);
    }

    if (moved) {
      this.selectedSelection = null;
      this.render();
      if (startRect) {
        this.flipAnimate(startRect, `.tableau-pile[data-index="${targetTableauIndex}"] .card:last-child`);
      }
    }
  }

  private getCardSelector(info: { type: 'waste' | 'tableau' | 'foundation'; pileIndex: number; cardIndex?: number }): string {
    if (info.type === 'waste') return '.waste-pile .card';
    if (info.type === 'foundation') return `.foundation-pile[data-index="${info.pileIndex}"] .card:last-child`;
    return `.tableau-pile[data-index="${info.pileIndex}"] .card:nth-child(${(info.cardIndex ?? 0) + 1})`;
  }
}
