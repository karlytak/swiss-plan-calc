// Combobox pays avec recherche et regroupement (priorité / UE / autres).
// Stocke un code ISO alpha-2 (ex. "CH"), affiche "Suisse (CH)".
import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  PRIORITY_COUNTRIES,
  EU_COUNTRIES,
  OTHER_COUNTRIES,
  countryName,
  type Country,
} from "@/lib/swiss/countries";

interface CountryComboboxProps {
  value: string; // ISO alpha-2
  onChange: (code: string) => void;
  id?: string;
  placeholder?: string;
}

function renderItem(c: Country, value: string, onSelect: (code: string) => void) {
  return (
    <CommandItem
      key={c.code}
      value={`${c.name} ${c.code}`}
      onSelect={() => onSelect(c.code)}
    >
      <Check
        className={cn(
          "mr-2 h-4 w-4",
          value.toUpperCase() === c.code ? "opacity-100" : "opacity-0",
        )}
      />
      <span className="flex-1">{c.name}</span>
      <span className="ml-2 text-xs text-muted-foreground">{c.code}</span>
    </CommandItem>
  );
}

export function CountryCombobox({
  value,
  onChange,
  id,
  placeholder = "Sélectionner un pays…",
}: CountryComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const display = value ? `${countryName(value)} (${value.toUpperCase()})` : "";

  const handleSelect = (code: string) => {
    onChange(code);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {display || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher un pays…" />
          <CommandList>
            <CommandEmpty>Aucun pays trouvé.</CommandEmpty>
            <CommandGroup heading="Pays voisins / fréquents">
              {PRIORITY_COUNTRIES.map((c) => renderItem(c, value, handleSelect))}
            </CommandGroup>
            <CommandGroup heading="Union européenne">
              {EU_COUNTRIES.map((c) => renderItem(c, value, handleSelect))}
            </CommandGroup>
            <CommandGroup heading="Autres pays">
              {OTHER_COUNTRIES.map((c) => renderItem(c, value, handleSelect))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
