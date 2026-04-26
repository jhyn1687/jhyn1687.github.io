import type { PersonColor } from "~/splitter/types";

const PALETTE: PersonColor[] = [
  {
    chip: "border-ctp-blue/40 bg-ctp-blue/15 text-ctp-blue",
    avatar: "bg-ctp-blue/25 text-ctp-blue",
    text: "text-ctp-blue",
    button: "bg-ctp-blue/20 text-ctp-blue",
  },
  {
    chip: "border-ctp-mauve/40 bg-ctp-mauve/15 text-ctp-mauve",
    avatar: "bg-ctp-mauve/25 text-ctp-mauve",
    text: "text-ctp-mauve",
    button: "bg-ctp-mauve/20 text-ctp-mauve",
  },
  {
    chip: "border-ctp-red/40 bg-ctp-red/15 text-ctp-red",
    avatar: "bg-ctp-red/25 text-ctp-red",
    text: "text-ctp-red",
    button: "bg-ctp-red/20 text-ctp-red",
  },
  {
    chip: "border-ctp-yellow/40 bg-ctp-yellow/15 text-ctp-yellow",
    avatar: "bg-ctp-yellow/25 text-ctp-yellow",
    text: "text-ctp-yellow",
    button: "bg-ctp-yellow/20 text-ctp-yellow",
  },
  {
    chip: "border-ctp-sky/40 bg-ctp-sky/15 text-ctp-sky",
    avatar: "bg-ctp-sky/25 text-ctp-sky",
    text: "text-ctp-sky",
    button: "bg-ctp-sky/20 text-ctp-sky",
  },
  {
    chip: "border-ctp-lavender/40 bg-ctp-lavender/15 text-ctp-lavender",
    avatar: "bg-ctp-lavender/25 text-ctp-lavender",
    text: "text-ctp-lavender",
    button: "bg-ctp-lavender/20 text-ctp-lavender",
  },
  {
    chip: "border-ctp-green/40 bg-ctp-green/15 text-ctp-green",
    avatar: "bg-ctp-green/25 text-ctp-green",
    text: "text-ctp-green",
    button: "bg-ctp-green/20 text-ctp-green",
  },
];

export function colorForIndex(index: number): PersonColor {
  return PALETTE[index % PALETTE.length];
}

export function nextColorSeed(
  participants: Array<{ color?: PersonColor }>,
): number {
  let max = -1;
  for (const p of participants) {
    if (!p.color) continue;
    const idx = PALETTE.findIndex((c) => c.chip === p.color!.chip);
    if (idx > max) max = idx;
  }
  return max + 1;
}
