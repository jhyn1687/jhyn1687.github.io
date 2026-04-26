import type { PersonColor } from "./types";

// 8 Catppuccin Mocha-toned OKLCH color pairs for participant avatars
const PALETTE: PersonColor[] = [
  { bg: "oklch(35% 0.12 148)", fg: "oklch(82% 0.1 148)" },   // teal
  { bg: "oklch(35% 0.12 240)", fg: "oklch(82% 0.1 240)" },   // blue
  { bg: "oklch(35% 0.12 310)", fg: "oklch(82% 0.1 310)" },   // mauve
  { bg: "oklch(35% 0.12 22)",  fg: "oklch(82% 0.1 22)" },    // red
  { bg: "oklch(35% 0.12 60)",  fg: "oklch(82% 0.1 60)" },    // yellow
  { bg: "oklch(35% 0.12 200)", fg: "oklch(82% 0.1 200)" },   // sky
  { bg: "oklch(35% 0.12 280)", fg: "oklch(82% 0.1 280)" },   // lavender
  { bg: "oklch(35% 0.12 100)", fg: "oklch(82% 0.1 100)" },   // green
];

export function colorForIndex(index: number): PersonColor {
  return PALETTE[index % PALETTE.length];
}
