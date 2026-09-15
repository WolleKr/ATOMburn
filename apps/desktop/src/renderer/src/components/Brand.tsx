export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? "brand brand--compact" : "brand"} aria-label="ATOMburn">
      <span>ATOM</span><span className="brand__burn">burn</span>
    </span>
  );
}
