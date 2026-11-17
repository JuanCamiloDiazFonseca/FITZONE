import type { ReactNode } from "react";

export type IconName =
  | "activity"
  | "arrow-down"
  | "arrow-up"
  | "bell"
  | "calendar"
  | "card"
  | "check"
  | "chevron"
  | "clock"
  | "credit-card"
  | "download"
  | "dumbbell"
  | "filter"
  | "grid"
  | "menu"
  | "plus"
  | "search"
  | "users"
  | "x";

const paths: Record<IconName, ReactNode> = {
  activity: <><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></>,
  "arrow-down": <><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></>,
  "arrow-up": <><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
  card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  chevron: <><path d="m9 18 6-6-6-6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  "credit-card": <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h3" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></>,
  dumbbell: <><path d="m6.5 6.5 11 11M3 8l5-5M16 21l5-5M7 3l14 14M3 7l4-4M17 21l4-4" /><path d="m5 10 5-5M14 19l5-5" /></>,
  filter: <><path d="M4 7h16M7 12h10m-7 5h4" /></>,
  grid: <><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="5" rx="2" /><rect x="13" y="10" width="8" height="11" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  x: <><path d="m18 6-12 12M6 6l12 12" /></>,
};

export function Icon({ name, size = 18, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
