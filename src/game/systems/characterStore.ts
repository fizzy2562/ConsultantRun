import { characters } from '../../config/game';

let activeCharacterKey: string = characters[0].key;

export function setActiveCharacter(key: string): void {
  activeCharacterKey = key;
}

export function getActiveCharacter(): string {
  return activeCharacterKey;
}
