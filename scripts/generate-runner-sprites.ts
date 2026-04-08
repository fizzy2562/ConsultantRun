import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { characters } from '../src/config/game';
import type { CharacterPalette } from '../src/types/app';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(__dirname, '../src/assets/sprites/runners');

const frameWidth = 128;
const frameHeight = 144;

type PoseName = 'idle' | 'run-1' | 'run-2' | 'jump' | 'fail';

interface PoseDefinition {
  torsoLean: number;
  shoulderLift: number;
  headTilt: number;
  frontUpperArm: [number, number];
  frontLowerArm: [number, number];
  rearUpperArm: [number, number];
  rearLowerArm: [number, number];
  frontUpperLeg: [number, number];
  frontLowerLeg: [number, number];
  rearUpperLeg: [number, number];
  rearLowerLeg: [number, number];
  bagOffsetX: number;
  bagOffsetY: number;
  shadowScale: number;
  stumble?: boolean;
}

const poses: Record<PoseName, PoseDefinition> = {
  idle: {
    torsoLean: -4,
    shoulderLift: 0,
    headTilt: -3,
    frontUpperArm: [14, 10],
    frontLowerArm: [16, 16],
    rearUpperArm: [-12, 14],
    rearLowerArm: [-4, 20],
    frontUpperLeg: [10, 20],
    frontLowerLeg: [12, 30],
    rearUpperLeg: [-8, 18],
    rearLowerLeg: [-6, 32],
    bagOffsetX: 0,
    bagOffsetY: 0,
    shadowScale: 0.92,
  },
  'run-1': {
    torsoLean: 6,
    shoulderLift: -2,
    headTilt: 5,
    frontUpperArm: [22, 4],
    frontLowerArm: [14, 16],
    rearUpperArm: [-18, 10],
    rearLowerArm: [-12, 18],
    frontUpperLeg: [22, 8],
    frontLowerLeg: [16, 32],
    rearUpperLeg: [-20, 14],
    rearLowerLeg: [-16, 30],
    bagOffsetX: -8,
    bagOffsetY: 2,
    shadowScale: 1,
  },
  'run-2': {
    torsoLean: -2,
    shoulderLift: 2,
    headTilt: -1,
    frontUpperArm: [-14, 12],
    frontLowerArm: [-10, 18],
    rearUpperArm: [22, 2],
    rearLowerArm: [12, 18],
    frontUpperLeg: [-10, 18],
    frontLowerLeg: [-8, 34],
    rearUpperLeg: [18, 10],
    rearLowerLeg: [12, 32],
    bagOffsetX: 4,
    bagOffsetY: -2,
    shadowScale: 0.98,
  },
  jump: {
    torsoLean: 10,
    shoulderLift: -4,
    headTilt: 6,
    frontUpperArm: [16, -2],
    frontLowerArm: [12, 14],
    rearUpperArm: [-20, 2],
    rearLowerArm: [-18, 12],
    frontUpperLeg: [18, 6],
    frontLowerLeg: [10, 22],
    rearUpperLeg: [-10, -2],
    rearLowerLeg: [-2, 20],
    bagOffsetX: -10,
    bagOffsetY: -4,
    shadowScale: 0.74,
  },
  fail: {
    torsoLean: 16,
    shoulderLift: 5,
    headTilt: 12,
    frontUpperArm: [10, 18],
    frontLowerArm: [8, 22],
    rearUpperArm: [-8, 18],
    rearLowerArm: [-10, 20],
    frontUpperLeg: [4, 20],
    frontLowerLeg: [-6, 28],
    rearUpperLeg: [-2, 20],
    rearLowerLeg: [10, 26],
    bagOffsetX: -2,
    bagOffsetY: 10,
    shadowScale: 0.88,
    stumble: true,
  },
};

function toHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function lighten(color: string, amount: number): string {
  const value = color.replace('#', '');
  const channels = [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16));
  const next = channels
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel + (255 - channel) * amount))))
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('');
  return `#${next}`;
}

function limbPath(startX: number, startY: number, mid: [number, number], end: [number, number]): string {
  return `M ${startX} ${startY} Q ${mid[0]} ${mid[1]} ${end[0]} ${end[1]}`;
}

function shoePolygon(x: number, y: number, flipped = false): string {
  const direction = flipped ? -1 : 1;
  return [
    `${x},${y}`,
    `${x + 18 * direction},${y - 1}`,
    `${x + 22 * direction},${y + 5}`,
    `${x + 8 * direction},${y + 8}`,
    `${x - 2 * direction},${y + 4}`,
  ].join(' ');
}

function frameSvg(poseName: PoseName, palette: CharacterPalette): string {
  const pose = poses[poseName];
  const jacket = toHex(palette.body);
  const accent = poseName === 'fail' ? '#c67d7d' : toHex(palette.accent);
  const shirt = lighten(toHex(palette.arms), 0.08);
  const jacketEdge = palette.body === 0xffffff ? '#344152' : lighten(jacket, 0.18);
  const trouser = poseName === 'fail' ? '#5f6572' : '#6d7484';
  const shoe = '#1d2230';
  const bag = '#2b3142';
  const bagMetal = '#cfd4df';
  const skin = poseName === 'fail' ? '#ecaa9c' : '#f4b294';
  const skinShadow = poseName === 'fail' ? '#d89086' : '#dd947f';
  const hair = '#50455c';

  const hipX = 65 + pose.torsoLean * 0.18;
  const hipY = 86;
  const shoulderFront: [number, number] = [75 + pose.torsoLean * 0.2, 52 + pose.shoulderLift];
  const shoulderRear: [number, number] = [51 + pose.torsoLean * 0.2, 54 + pose.shoulderLift];
  const headX = 66 + pose.torsoLean * 0.2;
  const headY = 25;
  const bagX = 24 + pose.bagOffsetX;
  const bagY = 72 + pose.bagOffsetY;

  const frontElbow: [number, number] = [shoulderFront[0] + pose.frontUpperArm[0], shoulderFront[1] + pose.frontUpperArm[1]];
  const frontHand: [number, number] = [frontElbow[0] + pose.frontLowerArm[0], frontElbow[1] + pose.frontLowerArm[1]];
  const rearElbow: [number, number] = [shoulderRear[0] + pose.rearUpperArm[0], shoulderRear[1] + pose.rearUpperArm[1]];
  const rearHand: [number, number] = [rearElbow[0] + pose.rearLowerArm[0], rearElbow[1] + pose.rearLowerArm[1]];

  const frontKnee: [number, number] = [hipX + pose.frontUpperLeg[0], hipY + pose.frontUpperLeg[1]];
  const frontFoot: [number, number] = [frontKnee[0] + pose.frontLowerLeg[0], frontKnee[1] + pose.frontLowerLeg[1]];
  const rearKnee: [number, number] = [hipX + pose.rearUpperLeg[0], hipY + pose.rearUpperLeg[1]];
  const rearFoot: [number, number] = [rearKnee[0] + pose.rearLowerLeg[0], rearKnee[1] + pose.rearLowerLeg[1]];

  const mouth = pose.stumble
    ? `<path d="M ${headX - 4} 31 Q ${headX + 1} 35 ${headX + 6} 31" fill="none" stroke="${skinShadow}" stroke-width="2" stroke-linecap="round" />`
    : `<path d="M ${headX - 2} 31 Q ${headX + 3} 33 ${headX + 7} 30" fill="none" stroke="${skinShadow}" stroke-width="1.8" stroke-linecap="round" />`;

  const stumbleLines = pose.stumble
    ? `
      <path d="M 14 58 L 28 54" stroke="#91d2be" stroke-width="4" stroke-linecap="round" opacity="0.45" />
      <path d="M 10 70 L 26 66" stroke="#91d2be" stroke-width="3" stroke-linecap="round" opacity="0.3" />
    `
    : '';

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${frameWidth}" height="${frameHeight}" viewBox="0 0 ${frameWidth} ${frameHeight}">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="2.2" flood-color="#07110d" flood-opacity="0.35"/>
      </filter>
      <linearGradient id="bagGloss" x1="0" x2="1">
        <stop offset="0%" stop-color="${lighten(bag, 0.08)}"/>
        <stop offset="100%" stop-color="${bag}"/>
      </linearGradient>
    </defs>
    <g filter="url(#shadow)">
      <ellipse cx="66" cy="136" rx="${26 * pose.shadowScale}" ry="7.5" fill="#08120b" opacity="0.38" />

      <path d="M ${shoulderFront[0] - 2} ${shoulderFront[1] - 10} L ${bagX + 12} ${bagY + 4}" stroke="#1a2030" stroke-width="6" stroke-linecap="round" opacity="0.92" />
      <rect x="${bagX}" y="${bagY}" width="34" height="30" rx="7" fill="url(#bagGloss)" stroke="${lighten(bag, 0.18)}" stroke-width="2" />
      <rect x="${bagX + 12}" y="${bagY + 10}" width="10" height="7" rx="2" fill="${bagMetal}" opacity="0.95" />

      <path d="${limbPath(shoulderRear[0], shoulderRear[1], [rearElbow[0] - 2, rearElbow[1]], rearHand)}" fill="none" stroke="${jacket}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" />
      <path d="${limbPath(rearElbow[0], rearElbow[1], [rearHand[0] - 2, rearHand[1] - 1], rearHand)}" fill="none" stroke="${shirt}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="${rearHand[0]}" cy="${rearHand[1]}" r="5.2" fill="${skin}" />

      <path d="${limbPath(hipX, hipY, [rearKnee[0] - 2, rearKnee[1] + 1], rearFoot)}" fill="none" stroke="${trouser}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" />
      <polygon points="${shoePolygon(rearFoot[0] - 4, rearFoot[1] - 1, rearFoot[0] < rearKnee[0])}" fill="${shoe}" />

      <g transform="rotate(${pose.torsoLean}, ${hipX}, 72)">
        <ellipse cx="${headX}" cy="${headY}" rx="11" ry="13.5" fill="${skin}" />
        <path d="M ${headX - 13} 22 C ${headX - 11} 10, ${headX + 2} 5, ${headX + 12} 16 C ${headX + 6} 11, ${headX - 2} 11, ${headX - 8} 18 C ${headX - 10} 16, ${headX - 12} 18, ${headX - 13} 22" fill="${hair}" />
        <path d="M ${headX - 4} 18 C ${headX + 1} 7, ${headX + 10} 8, ${headX + 14} 20 C ${headX + 5} 15, ${headX - 2} 15, ${headX - 4} 18" fill="${hair}" />
        <path d="M ${headX - 2} 35 L ${headX + 2} 35 L ${headX + 1} 44 L ${headX - 1} 44 Z" fill="${skinShadow}" opacity="0.9" />
        ${mouth}

        <path d="M ${headX - 19} 47 Q ${headX - 3} 40 ${headX + 14} 43 L ${headX + 17} 86 Q ${headX + 2} 94 ${headX - 13} 87 Z" fill="${jacket}" stroke="${jacketEdge}" stroke-width="2" stroke-linejoin="round" />
        <path d="M ${headX - 3} 44 L ${headX + 5} 44 L ${headX + 2} 68 L ${headX - 4} 68 Z" fill="${shirt}" />
        <path d="M ${headX - 14} 45 L ${headX - 4} 45 L ${headX - 5} 70 L ${headX - 14} 57 Z" fill="${accent}" opacity="0.95" />
        <path d="M ${headX + 13} 44 L ${headX + 5} 44 L ${headX + 7} 68 L ${headX + 13} 56 Z" fill="${accent}" opacity="0.95" />
        <path d="M ${headX + 1} 51 L ${headX + 5} 51 L ${headX + 4} 67 L ${headX} 67 Z" fill="${accent}" />
        <rect x="${headX + 7}" y="58" width="8" height="4" rx="2" fill="${accent}" opacity="0.95" />
        <rect x="${headX + 8}" y="79" width="8" height="4" rx="2" fill="${accent}" opacity="0.95" />
        <circle cx="${headX + 1}" cy="69" r="2" fill="${lighten(jacketEdge, 0.25)}" />
        <circle cx="${headX + 1}" cy="78" r="2" fill="${lighten(jacketEdge, 0.25)}" />
      </g>

      <path d="${limbPath(shoulderFront[0], shoulderFront[1], [frontElbow[0] + 1, frontElbow[1] - 1], frontHand)}" fill="none" stroke="${jacket}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" />
      <path d="${limbPath(frontElbow[0], frontElbow[1], [frontHand[0] + 1, frontHand[1]], frontHand)}" fill="none" stroke="${shirt}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="${frontHand[0]}" cy="${frontHand[1]}" r="5.4" fill="${skin}" />

      <path d="${limbPath(hipX, hipY, [frontKnee[0] + 2, frontKnee[1]], frontFoot)}" fill="none" stroke="${trouser}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" />
      <polygon points="${shoePolygon(frontFoot[0] - 2, frontFoot[1], false)}" fill="${shoe}" />
    </g>
    ${stumbleLines}
  </svg>`;
}

async function buildSheet(palette: CharacterPalette): Promise<Buffer> {
  const canvas = sharp({
    create: {
      width: frameWidth * 5,
      height: frameHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const order: PoseName[] = ['idle', 'run-1', 'run-2', 'jump', 'fail'];
  const composites = await Promise.all(
    order.map(async (poseName, index) => ({
      input: await sharp(Buffer.from(frameSvg(poseName, palette))).png().toBuffer(),
      left: index * frameWidth,
      top: 0,
    })),
  );

  return canvas.composite(composites).png().toBuffer();
}

async function main(): Promise<void> {
  await mkdir(outputDir, { recursive: true });

  await Promise.all(
    characters.map(async (character) => {
      const sheet = await buildSheet(character.palette);
      await writeFile(path.join(outputDir, `${character.key}.png`), sheet);
    }),
  );

  console.log(`Generated ${characters.length} sprite sheets in ${outputDir}`);
}

await main();
