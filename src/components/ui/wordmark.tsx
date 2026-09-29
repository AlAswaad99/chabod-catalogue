// "ካቦድ" with the --mark gradient. This is the ONLY place in the app the
// painterly gradient treatment appears — never on buttons, cards, or body
// text (design-reference/CLAUDE_CODE_PROMPT.md §1).
export function Wordmark({
  size = 26,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={className}
      style={{
        fontFamily: "var(--font-noto-ethiopic)",
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.05,
        backgroundImage: "var(--mark)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        display: "inline-block",
      }}
    >
      ካቦድ ኳየር
    </span>
  );
}
