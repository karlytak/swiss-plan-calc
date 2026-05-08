// Auto-complétion communes filtrée par canton. Saisie libre acceptée
// (les communes hors liste prioritaire sont sauvegardées telles quelles).
import * as React from "react";
import { Input } from "@/components/ui/input";
import { getCommunesForCanton } from "@/lib/swiss/communes";

interface CommuneAutocompleteProps {
  value: string;
  onChange: (v: string) => void;
  canton: string | null | undefined;
  id?: string;
}

export function CommuneAutocomplete({
  value,
  onChange,
  canton,
  id,
}: CommuneAutocompleteProps) {
  const listId = React.useId();
  const communes = React.useMemo(() => getCommunesForCanton(canton), [canton]);

  return (
    <>
      <Input
        id={id}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={80}
        placeholder={
          canton
            ? communes[0]
              ? `Ex. ${communes[0]}…`
              : "Saisir la commune"
            : "Sélectionner un canton d'abord"
        }
        autoComplete="off"
      />
      <datalist id={listId}>
        {communes.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </>
  );
}
