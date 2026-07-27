export default function LoadingSpinner({ label = "Loading" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-pitch-500">
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border-2 border-pitch-600" />
        <div className="absolute inset-0 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
      </div>
      <p className="font-display text-sm uppercase tracking-widest">{label}</p>
    </div>
  );
}
