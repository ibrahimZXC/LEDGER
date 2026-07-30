import { FileText, FileSpreadsheet, FileDown, Image as ImageIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/format";
import {
  exportReportCsv,
  exportReportExcel,
  exportReportImage,
  exportReportPdf,
  type ReportSpec,
} from "@/lib/report";

export function ExportMenu({ spec }: { spec: () => ReportSpec }) {
  const { t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 text-xs">
          <Download className="size-3.5" strokeWidth={1.75} />
          {t("export")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem className="text-xs" onClick={() => void exportReportPdf(spec())}>
          <FileText className="size-3.5" strokeWidth={1.75} />
          {t("exportPdf")}
        </DropdownMenuItem>
        <DropdownMenuItem className="text-xs" onClick={() => void exportReportImage(spec())}>
          <ImageIcon className="size-3.5" strokeWidth={1.75} />
          {t("exportImage")}
        </DropdownMenuItem>
        <DropdownMenuItem className="text-xs" onClick={() => void exportReportExcel(spec())}>
          <FileSpreadsheet className="size-3.5" strokeWidth={1.75} />
          {t("exportExcel")}
        </DropdownMenuItem>
        <DropdownMenuItem className="text-xs" onClick={() => exportReportCsv(spec())}>
          <FileDown className="size-3.5" strokeWidth={1.75} />
          {t("exportCsv")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
