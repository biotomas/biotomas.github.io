import './style.css';
import { SolitaireGame } from './game/SolitaireGame';
import { UIManager } from './ui/UIManager';

function preloadCardImages(): void {
  const suits = ['clubs', 'diamonds', 'hearts', 'spades'];
  const ranks = ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'];
  const urls: string[] = ['./cards/back.svg'];

  for (const suit of suits) {
    for (const rank of ranks) {
      urls.push(`./cards/${rank}_of_${suit}.svg`);
    }
  }

  urls.forEach(url => {
    const img = new Image();
    img.src = url;
  });
}

// Preload all card graphics into browser memory immediately
preloadCardImages();

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (app) {
    const game = new SolitaireGame();
    new UIManager(app, game);
  }
});
