import * as React from "react";
import { CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";
import { isoToBR, maskBR, parseDateToISO } from "@/lib/date-parse";

const baseClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

/**
 * Campo de data em texto (dd/mm/aaaa) que aceita copiar e colar.
 * Mantém o contrato do input nativo: onChange recebe e.target.value em ISO (aaaa-mm-dd) ou "".
 */
const DateInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, value, defaultValue, onChange, onBlur, min, max, disabled, readOnly, ...props }, ref) => {
    const iso = String(value ?? defaultValue ?? "");
    const [text, setText] = React.useState(isoToBR(iso));
    const pickerRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
      if (parseDateToISO(text) !== (iso || null)) setText(isoToBR(iso));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [iso]);

    const emit = (v: string) => {
      const fake = { target: { value: v }, currentTarget: { value: v } } as unknown as React.ChangeEvent<HTMLInputElement>;
      onChange?.(fake);
    };

    const handleText = (t: string) => {
      setText(t);
      if (!t.trim()) return emit("");
      const parsed = parseDateToISO(t);
      if (parsed) emit(parsed);
    };

    return (
      <div className="relative w-full">
        <input
          {...props}
          ref={ref}
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/aaaa"
          disabled={disabled}
          readOnly={readOnly}
          className={cn(baseClass, "pr-9", className)}
          value={text}
          onChange={(e) => handleText(maskBR(e.target.value))}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData("text");
            const parsed = parseDateToISO(pasted);
            if (parsed) {
              e.preventDefault();
              setText(isoToBR(parsed));
              emit(parsed);
            }
          }}
          onBlur={(e) => {
            if (text && !parseDateToISO(text)) setText(isoToBR(iso));
            onBlur?.(e);
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || readOnly}
          aria-label="Abrir calendário"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
          onClick={() => {
            const p = pickerRef.current;
            if (!p) return;
            try { p.showPicker(); } catch { p.focus(); }
          }}
        >
          <CalendarDays className="size-4" />
        </button>
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden
          className="absolute right-0 bottom-0 h-0 w-0 opacity-0 pointer-events-none"
          value={iso}
          min={min}
          max={max}
          onChange={(e) => {
            setText(isoToBR(e.target.value));
            emit(e.target.value);
          }}
        />
      </div>
    );
  },
);
DateInput.displayName = "DateInput";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    if (type === "date") return <DateInput ref={ref} className={className} {...props} />;
    return <input type={type} className={cn(baseClass, className)} ref={ref} {...props} />;
  },
);
Input.displayName = "Input";

export { Input };
