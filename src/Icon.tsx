export type IconName =
  | 'home'
  | 'plan'
  | 'library'
  | 'cloud'
  | 'plus'
  | 'minus'
  | 'edit'
  | 'trash'
  | 'search'
  | 'external'
  | 'close'
  | 'check'
  | 'arrow'
  | 'calendar'
  | 'chart'
  | 'chevron-left'
  | 'chevron-right'
  | 'trend-up'
  | 'trend-down'
  | 'trend-flat'
  | 'pause'
  | 'flag'
  | 'trophy'

const paths: Record<IconName, string> = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6',
  plan: 'M4 5h16M4 12h16M4 19h9M7 3v4M17 3v4',
  library: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5zM4 16.5A2.5 2.5 0 0 1 6.5 14H20',
  cloud: 'M7 18h10a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 7 8.5a4.75 4.75 0 0 0 0 9.5Z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  edit: 'm15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16z',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3',
  search: 'm20 20-4.5-4.5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z',
  external: 'M14 4h6v6M20 4l-9 9M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6',
  close: 'm6 6 12 12M18 6 6 18',
  check: 'm5 12 4 4L19 6',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  calendar: 'M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5zM4 10h16M8 3v4M16 3v4',
  chart: 'M4 20h16M7 16v-5M12 16V7M17 16v-8',
  'chevron-left': 'm15 6-6 6 6 6',
  'chevron-right': 'm9 6 6 6-6 6',
  'trend-up': 'm4 16 6-6 4 4 6-6M15 8h5v5',
  'trend-down': 'm4 8 6 6 4-4 6 6M15 16h5v-5',
  'trend-flat': 'M4 12h16M16 8l4 4-4 4',
  pause: 'M9 6v12M15 6v12',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M9.5 17h5',
}

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  )
}
