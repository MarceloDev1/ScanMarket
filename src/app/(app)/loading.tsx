export default function Loading() {
  return (
    <div role="status" aria-label="Carregando" className="animate-pulse space-y-4">
      <div className="h-8 w-40 rounded-lg bg-border" />
      <div className="h-32 rounded-2xl bg-border" />
      <div className="h-24 rounded-2xl bg-border" />
      <div className="h-24 rounded-2xl bg-border" />
    </div>
  );
}
