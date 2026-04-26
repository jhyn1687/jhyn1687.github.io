export function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-10">
      <h2 className="text-2xl font-bold text-ctp-text">{title}</h2>
    </div>
  );
}
