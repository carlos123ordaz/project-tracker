/**
 * LogoMark — brand icon + wordmark for the sidebar.
 *
 * The icon is a 3-bar ascending chart on an indigo→violet gradient square,
 * drawn entirely with SVG primitives (no external images or fonts for the mark).
 *
 * Usage:
 *   <LogoMark />              → icon only (32 × 32)
 *   <LogoMark showText />     → icon + "Project Tracker" wordmark
 */

interface LogoMarkProps {
  showText?: boolean
  size?: number
}

export default function LogoMark({ showText = false, size = 28 }: LogoMarkProps) {
  const uid = 'lm'          // stable gradient id (one instance on screen)

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
      {/* ── Icon mark ── */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', flexShrink: 0 }}
        aria-hidden
      >
        <defs>
          {/* Background gradient: indigo → violet */}
          <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#5B5EF0" />
            <stop offset="1" stopColor="#7C3AED" />
          </linearGradient>

          {/* Top-edge gloss */}
          <linearGradient id={`${uid}-gloss`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="white" stopOpacity=".15" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          {/* Soft drop shadow for the icon */}
          <filter id={`${uid}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#4F46E5" floodOpacity=".35" />
          </filter>
        </defs>

        {/* Rounded background */}
        <rect width="32" height="32" rx="7.5" fill={`url(#${uid}-bg)`} filter={`url(#${uid}-shadow)`} />

        {/* Top-edge gloss overlay */}
        <rect width="32" height="14" rx="7.5" fill={`url(#${uid}-gloss)`} />

        {/* ── Ascending bar chart — 3 columns, bottom-aligned at y = 27 ── */}

        {/* Bar 1 — low (leftmost) */}
        <rect x="5" y="19" width="6" height="8"  rx="1.5" fill="white" fillOpacity=".40" />

        {/* Bar 2 — medium */}
        <rect x="13" y="12" width="6" height="15" rx="1.5" fill="white" fillOpacity=".72" />

        {/* Bar 3 — full height (rightmost) */}
        <rect x="21" y="5"  width="6" height="22" rx="1.5" fill="white" />

        {/* Tiny dot on the tallest bar — represents the "current progress" marker */}
        <circle cx="24" cy="8.5" r="1.8" fill="white" fillOpacity=".35" />
      </svg>

      {/* ── Wordmark (shown only when expanded) ── */}
      {showText && (
        <span
          aria-label="Project Tracker"
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            lineHeight: 1,
            gap: 2,
            whiteSpace: 'nowrap',
          }}
        >
          {/* Main name — rendered as SVG text so it stays crisp at all sizes
              and matches the design font, without relying on a web-font load */}
          <svg
            width="101"
            height="28"
            viewBox="0 0 101 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <defs>
              <linearGradient id={`${uid}-text`} x1="0" y1="0" x2="101" y2="0" gradientUnits="userSpaceOnUse">
                <stop stopColor="#15171C" />
                <stop offset="1" stopColor="#3B414C" />
              </linearGradient>
            </defs>

            {/* "Project" — weight 650, size 13 */}
            <text
              x="0" y="13"
              fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif"
              fontSize="13"
              fontWeight="650"
              letterSpacing="-0.25"
              fill="url(#lm-text)"
            >
              Project
            </text>

            {/* "Tracker" — weight 400, size 10.5, muted */}
            <text
              x="0.5" y="26"
              fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif"
              fontSize="10.5"
              fontWeight="450"
              letterSpacing="0.15"
              fill="#7A818F"
            >
              TRACKER
            </text>
          </svg>
        </span>
      )}
    </span>
  )
}
