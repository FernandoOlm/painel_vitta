import { useRef } from "react";
import Papa from "papaparse";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Botões "Importar CSV" + "Modelo CSV" (separador ;, UTF-8 com BOM). */
export function CsvImportButtons({
  modeloNome,
  headers,
  exemplo,
  onRows,
}: {
  modeloNome: string;
  headers: string[];
  exemplo: string[][];
  onRows: (rows: Record<string, string>[]) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function baixarModelo() {
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers.join(";"), ...exemplo.map((r) => r.map(esc).join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = modeloNome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importar(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      delimiter: ";",
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/^\uFEFF/, ""),
      complete: async (res) => {
        try {
          await onRows(res.data);
        } catch (e) {
          toast.error((e as Error).message);
        }
      },
    });
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importar(f);
          e.target.value = "";
        }}
      />
      <Button variant="outline" onClick={() => fileRef.current?.click()}>
        <Upload className="size-4 mr-2" /> Importar CSV
      </Button>
      <Button variant="outline" onClick={baixarModelo}>
        <Download className="size-4 mr-2" /> Modelo CSV
      </Button>
    </>
  );
}
