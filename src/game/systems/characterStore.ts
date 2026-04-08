import { characters } from '../../config/game';
import { getSelectedCharacter, saveSelectedCharacter } from '../../services/storage';

export function setActiveCharacter(key: string): void {
  saveSelectedCharacter(key);
}

export function getActiveCharacter(): string {
  return getSelectedCharacter() ?? characters[0].key;
}
