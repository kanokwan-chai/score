import { ImageResponse } from 'next/og'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <svg
          viewBox="0 0 100 100"
          width="32"
          height="32"
          style={{ width: '100%', height: '100%' }}
        >
          {/* Modern Shield representing evaluation & stability */}
          <path
            d="M 50 15 C 68 15, 82 20, 82 35 C 82 62, 68 82, 50 90 C 32 82, 18 62, 18 35 C 18 20, 32 15, 50 15 Z"
            fill="none"
            stroke="#4f46e5"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Inner Shield Accent */}
          <path
            d="M 50 23 C 62 23, 74 27, 74 37 C 74 57, 62 74, 50 81 C 38 81, 26 57, 26 37 C 26 27, 38 23, 50 23 Z"
            fill="#4f46e5"
            opacity="0.12"
          />

          {/* Rising Progress Bar Chart showing student growth */}
          <rect x="34" y="52" width="7" height="16" rx="2" fill="#4f46e5" />
          <rect x="46" y="40" width="7" height="28" rx="2" fill="#6366f1" />
          <rect x="58" y="28" width="7" height="40" rx="2" fill="#06b6d4" />

          {/* Sparkle star of success */}
          <path
            d="M 68 22 L 70 26 L 74 27 L 71 30 L 72 34 L 68 32 L 64 34 L 65 30 L 62 27 L 66 26 Z"
            fill="#FBBF24"
          />

          {/* Graduation Cap at the top center */}
          <path
            d="M 50 6 L 75 16 L 50 26 L 25 16 Z"
            fill="#10b981"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <path
            d="M 36 20.5 L 36 29 C 36 34.5, 64 34.5, 64 29 L 64 20.5"
            fill="none"
            stroke="#10b981"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          
          {/* Tassel */}
          <path
            d="M 64 16 L 75 22 L 75 30"
            fill="none"
            stroke="#FBBF24"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="75" cy="30" r="2" fill="#FBBF24" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
