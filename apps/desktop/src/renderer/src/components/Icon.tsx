import type { ReactNode } from "react";

export type IconName =
  | "about"
  | "cut"
  | "circle"
  | "document"
  | "layers"
  | "home"
  | "line"
  | "nodes"
  | "open"
  | "points"
  | "polygon"
  | "rectangle"
  | "rounded-rectangle"
  | "ruler"
  | "select"
  | "text"
  | "undo"
  | "redo";

const paths: Record<IconName, ReactNode> = {
  about: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></>,
  cut: <><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="6.5" cy="17.5" r="2.5"/><path d="M8.3 8.3 19 19M8.3 15.7 19 5"/><circle cx="10.5" cy="12" r="1.2" fill="currentColor" stroke="none"/></>,
  circle: <circle cx="12" cy="12" r="8"/>,
  document: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/></>,
  layers: <><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
  home: <><path d="m4 11 8-7 8 7v9H4z"/><path d="M9 20v-6h6v6"/></>,
  line: <path d="M5 19 19 5"/>,
  nodes: <><path d="M6 18 9 7l9 4"/><circle cx="6" cy="18" r="2"/><circle cx="9" cy="7" r="2"/><circle cx="18" cy="11" r="2"/></>,
  open: <path d="M3 7h7l2 2h9l-2 10H4z"/>,
  points: <>{[6,12,18].flatMap((x) => [6,12,18].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="currentColor" stroke="none"/>))}</>,
  polygon: <path d="m7 4 10 1 4 8-6 7-10-3-2-8z"/>,
  rectangle: <rect x="4" y="5" width="16" height="14"/>,
  "rounded-rectangle": <rect x="4" y="5" width="16" height="14" rx="3"/>,
  ruler: <><path d="m5 19 14-14 3 3L8 22z"/><path d="m14 8 2 2M11 11l2 2M8 14l2 2"/></>,
  select: <path d="m5 3 12 9-6 1 4 7-3 1-4-7-3 4z"/>,
  text: <><path d="M5 5h14M12 5v14M8 19h8"/></>,
  undo: <><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5A5.5 5.5 0 0 1 14.5 20H11"/></>,
  redo: <><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5 5.5 5.5 0 0 0 9.5 20H13"/></>
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
