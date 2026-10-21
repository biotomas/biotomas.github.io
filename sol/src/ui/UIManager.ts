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
  }

  public render(): void {
    this.container.innerHTML = `
      <header>
        <h1>KLONDIKE SOLITAIRE</h1>
        <div class="stats">
          <div class="stat-item">Moves: <span id="moves-val">${this.game.moves}</span></div>
          <div class="stat-item">Score: <span id="score-val">${this.game.score}</span></div>
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
            <p>Congratulations! You solved the game in ${this.game.moves} moves with a score of ${this.game.score}.</p>
            <button id="modal-new-game-btn">Play Again</button>
          </div>
        </div>
      ` : ''}
    `;

    this.attachEventListeners();
    this.populateBoard();
    this.updateSelectionUI();
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

    // Tableau click targets for empty piles
    document.querySelectorAll('.tableau-pile').forEach(el => {
      const index = parseInt(el.getAttribute('data-index')!);
      el.addEventListener('click', (e) => {
        if (e.target === el && this.selectedSelection) {
          this.executeMove(index);
        }
      });
    });
  }

  private getDropTarget(x: number, y: number): { type: 'foundation' | 'tableau'; index: number } | null {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const foundation = el.closest('.foundation-pile') as HTMLElement | null;
    if (foundation) {
      const idx = parseInt(foundation.getAttribute('data-index') || '-1');
      if (idx >= 0) return { type: 'foundation', index: idx };
    }
    const tableau = el.closest('.tableau-pile') as HTMLElement | null;
    if (tableau) {
      const idx = parseInt(tableau.getAttribute('data-index') || '-1');
      if (idx >= 0) return { type: 'tableau', index: idx };
    }
    return null;
  }

  private setupPointerDrag(cardEl: HTMLElement, info: { type: 'waste' | 'tableau' | 'foundation'; pileIndex: number; cardIndex?: number }): void {
    let startX = 0;
    let startY = 0;
    let isDragging = false;
    let elementsToMove: HTMLElement[] = [];

    cardEl.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.button !== 0) return; // Left mouse button only

      startX = e.clientX;
      startY = e.clientY;
      isDragging = false;

      // Determine which cards are moving (for tableau, card and all cards below it)
      if (info.type === 'tableau' && info.cardIndex !== undefined) {
        const tableauPile = document.querySelector(`.tableau-pile[data-index="${info.pileIndex}"]`);
        if (tableauPile) {
          const cards = Array.from(tableauPile.querySelectorAll('.card')) as HTMLElement[];
          elementsToMove = cards.slice(info.cardIndex);
        } else {
          elementsToMove = [cardEl];
        }
      } else {
        elementsToMove = [cardEl];
      }

      cardEl.setPointerCapture(e.pointerId);

      const onPointerMove = (moveEv: PointerEvent) => {
        const dx = moveEv.clientX - startX;
        const dy = moveEv.clientY - startY;

        if (!isDragging && (Math.hypot(dx, dy) > 5)) {
          isDragging = true;
          elementsToMove.forEach((el, i) => {
            el.style.zIndex = `${1000 + i}`;
            el.style.pointerEvents = 'none';
          });
        }

        if (isDragging) {
          elementsToMove.forEach(el => {
            el.style.transform = `translate(${dx}px, ${dy}px)`;
          });
        }
      };

      const onPointerUp = (upEv: PointerEvent) => {
        cardEl.removeEventListener('pointermove', onPointerMove);
        cardEl.removeEventListener('pointerup', onPointerUp);
        cardEl.removeEventListener('pointercancel', onPointerUp);
        try {
          cardEl.releasePointerCapture(upEv.pointerId);
        } catch {
          // ignore
        }

        if (isDragging) {
          const dx = upEv.clientX - startX;
          const dy = upEv.clientY - startY;

          // Temporarily keep pointerEvents none to inspect drop target below
          elementsToMove.forEach(el => { el.style.pointerEvents = 'none'; });
          const target = this.getDropTarget(upEv.clientX, upEv.clientY);
          elementsToMove.forEach(el => { el.style.pointerEvents = ''; });

          let moved = false;
          if (target) {
            if (target.type === 'foundation') {
              if (info.type === 'waste') {
                moved = this.game.moveWasteToFoundation(target.index);
              } else if (info.type === 'tableau' && info.cardIndex !== undefined) {
                if (info.cardIndex === this.game.tableau[info.pileIndex].length - 1) {
                  moved = this.game.moveTableauToFoundation(info.pileIndex, target.index);
                }
              }
            } else if (target.type === 'tableau') {
              if (info.type === 'waste') {
                moved = this.game.moveWasteToTableau(target.index);
              } else if (info.type === 'tableau' && info.cardIndex !== undefined) {
                moved = this.game.moveTableauToTableau(info.pileIndex, info.cardIndex, target.index);
              } else if (info.type === 'foundation') {
                moved = this.game.moveFoundationToTableau(info.pileIndex, target.index);
              }
            }
          }

          if (moved) {
            this.selectedSelection = null;
            this.render();
          } else {
            // Animate snap back
            let completed = 0;
            elementsToMove.forEach(el => {
              const anim = el.animate([
                { transform: `translate(${dx}px, ${dy}px)` },
                { transform: 'translate(0, 0)' }
              ], {
                duration: 160,
                easing: 'ease-out'
              });
              anim.onfinish = () => {
                el.style.transform = '';
                el.style.zIndex = '';
                completed++;
                if (completed === elementsToMove.length) {
                  this.updateSelectionUI();
                }
              };
            });
          }
        } else {
          // It was a click, not a drag
          this.handleCardClick(info);
        }
      };

      cardEl.addEventListener('pointermove', onPointerMove);
      cardEl.addEventListener('pointerup', onPointerUp);
      cardEl.addEventListener('pointercancel', onPointerUp);
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
      if (this.game.waste.length > 1) {
        const prevCard = this.game.waste[this.game.waste.length - 2];
        const prevCardEl = this.createCardElement(prevCard);
        wasteEl.appendChild(prevCardEl);
      }

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
      el.innerHTML = `<div class="card-face" style="background-image: url('${card.imagePath}');"></div>`;

      if (selectionInfo) {
        this.setupPointerDrag(el, selectionInfo);
      }
    } else {
      el.innerHTML = `<div class="card-face" style="background-image: url('./cards/back.svg');"></div>`;
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
