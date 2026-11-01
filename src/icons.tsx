/** One stroke icon set (24px grid, 1.75 stroke), drawn for this app. */
const PATHS = {
  play: <path d="M8 5.8v12.4a.8.8 0 0 0 1.2.7l10-6.2a.8.8 0 0 0 0-1.4l-10-6.2A.8.8 0 0 0 8 5.8Z" fill="currentColor" stroke="none" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  back: <path d="M15 5l-7 7 7 7" />,
  chevron: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  settings: <path d="M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  headphones: <path d="M4 16v-3.5a8 8 0 0 1 16 0V16M4 15h2.5a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4Zm16 0h-2.5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1H19a1 1 0 0 0 1-1v-4Z" />,
  export: <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 14v4.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V14" />,
  import: <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 14v4.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V14" />,
  refresh: <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" />,
  external: <path d="M13.5 5H19v5.5M19 5l-8 8M17 14.5V18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h3.5" />,
  swap: <path d="M5 8.5h13M14.5 5 18 8.5 14.5 12M19 15.5H6M9.5 12 6 15.5 9.5 19" />,
  moon: <path d="M19.5 14.6A7.8 7.8 0 0 1 9.4 4.5a7.8 7.8 0 1 0 10.1 10.1Z" />,
  practice: <path d="M12 4a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3ZM6 11a6 6 0 0 0 12 0M12 17v3" />,
  search: <path d="M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM15.5 15.5 20 20" />,
  // A snail: shell with a spiral, body along the ground, two feelers.
  slow: <path d="M3 19h13.5a3.5 3.5 0 0 0 3.5-3.5V12M20 12l-1.6-4M20 12l2-3.6M10 19a6 6 0 1 1 6-6M10 13a2 2 0 1 1 2 2" />,
}
export type IconName = keyof typeof PATHS

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  )
}
