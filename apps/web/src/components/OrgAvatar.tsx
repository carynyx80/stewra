export function OrgAvatar({ org, size = 40 }: { org: { name: string; logoUrl: string | null }; size?: number }) {
  if (org.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={org.logoUrl} alt="" width={size} height={size} className="rounded-xl border border-line object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span className="flex items-center justify-center rounded-xl border border-lime/25 bg-lime/10 font-display text-sm font-semibold text-lime" style={{ width: size, height: size }}>
      {org.name.slice(0, 2).toUpperCase()}
    </span>
  );
}
