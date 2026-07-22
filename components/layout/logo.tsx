export function Logo({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M6 6 L10 2 L12 8 L8 10 Z" fill="currentColor" />
      <path d="M26 6 L22 2 L20 8 L24 10 Z" fill="currentColor" />
      <ellipse cx="16" cy="17" rx="11" ry="10" fill="currentColor" />
      <ellipse cx="16" cy="21" rx="5.5" ry="4" className="fill-muted" />
      <ellipse cx="16" cy="19.5" rx="2.5" ry="1.8" className="fill-background" />
      <circle cx="11" cy="15" r="1.5" fill="var(--background)" />
      <circle cx="21" cy="15" r="1.5" fill="var(--background)" />
      <line x1="12.5" y1="15" x2="19.5" y2="15" stroke="var(--background)" strokeWidth="0.6" />
      <rect x="8" y="12.5" width="6" height="5" rx="2" stroke="var(--background)" strokeWidth="0.6" fill="none" />
      <rect x="18" y="12.5" width="6" height="5" rx="2" stroke="var(--background)" strokeWidth="0.6" fill="none" />
      <line x1="8" y1="13.5" x2="3" y2="11" stroke="var(--background)" strokeWidth="0.5" />
      <line x1="26" y1="13.5" x2="29" y2="11" stroke="var(--background)" strokeWidth="0.5" />
      <ellipse cx="16" cy="24" rx="2" ry="1.8" className="fill-red-400" />
    </svg>
  );
}
