import { User } from "lucide-react";
interface Props {
  show: boolean;
  clientName?: string;
}
export function ClientPrefillBadge({ show, clientName: _clientName }: Props) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/8 px-1.5 py-0.5 text-[9px] font-medium text-primary/70">
      <User className="h-2 w-2" />
      Fiche
    </span>
  );
}
