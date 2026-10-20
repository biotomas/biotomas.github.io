import './style.css';
import { SolitaireGame } from './game/SolitaireGame';
import { UIManager } from './ui/UIManager';

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (app) {
    const game = new SolitaireGame();
    new UIManager(app, game);
  }
});
