const AppIcon = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    aria-hidden="true"
    className={className}
  >
    <path
      d="M8 13.5C8 11.6 9.6 10 11.5 10H22C23.1 10 24 10.9 24 12V38C24 36.3 22.7 35 21 35H11.5C9.6 35 8 33.4 8 31.5V13.5Z"
      fill="currentColor"
      opacity="0.9"
    />
    <path
      d="M40 13.5C40 11.6 38.4 10 36.5 10H26C24.9 10 24 10.9 24 12V38C24 36.3 25.3 35 27 35H36.5C38.4 35 40 33.4 40 31.5V13.5Z"
      fill="currentColor"
      opacity="0.72"
    />
    <path
      d="M15 17H20M15 22H20M28 17H33"
      stroke="var(--primary-foreground)"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <path
      d="M33.5 21.5L35 25L38.5 26.5L35 28L33.5 31.5L32 28L28.5 26.5L32 25L33.5 21.5Z"
      fill="var(--primary-foreground)"
    />
    <path
      d="M24 12V38"
      stroke="var(--primary-foreground)"
      strokeWidth="2.2"
      strokeLinecap="round"
      opacity="0.55"
    />
  </svg>
);

export default AppIcon;
