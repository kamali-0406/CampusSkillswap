export default function Logo({ size = 30 }) {
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#18244a" />
        <path d="M8 12h13l-3-3" fill="none" stroke="#34d3c0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 20H11l3 3" fill="none" stroke="#f4b740" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>Campus SkillSwap</span>
    </span>
  );
}
