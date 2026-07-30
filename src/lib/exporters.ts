import type { Entity, Transaction } from "@/types";
import type { Lang } from "@/lib/i18n";
import { formatDate, formatMoney } from "@/lib/format";
import {
  exportReportCsv,
  exportReportExcel,
  exportReportImage,
  exportReportPdf,
  type ReportSpec,
} from "@/lib/report";

interface Row {
  tx: Transaction;
  running: number;
}

export function statementSpec(
  entity: Entity,
  rows: Row[],
  lang: Lang,
  t: (k: string) => string,
): ReportSpec {
  const balance = rows.length ? rows[rows.length - 1].running : entity.openingBalance;
  return {
    title: entity.name,
    subtitle: t("accountStatement"),
    meta: [
      { label: t("openingBalance"), value: formatMoney(entity.openingBalance, lang) },
      { label: t("balance"), value: formatMoney(balance, lang) },
    ],
    headers: [
      t("date"),
      t("type"),
      t("quantity"),
      t("unitPrice"),
      t("total"),
      t("paid"),
      t("balance"),
    ],
    numeric: [2, 3, 4, 5, 6],
    rows: rows.map(({ tx, running }) => [
      formatDate(tx.date, lang),
      t(tx.type),
      tx.quantity ? String(tx.quantity) : "—",
      tx.unitPrice ? formatMoney(tx.unitPrice, lang) : "—",
      formatMoney(tx.totalAmount, lang),
      formatMoney(tx.amountPaid, lang),
      formatMoney(running, lang),
    ]),
    lang,
    filename: `${entity.name}-statement`,
  };
}

export function exportStatementCsv(
  entity: Entity,
  rows: Row[],
  lang: Lang,
  t: (k: string) => string,
) {
  exportReportCsv(statementSpec(entity, rows, lang, t));
}

export async function exportStatementExcel(
  entity: Entity,
  rows: Row[],
  lang: Lang,
  t: (k: string) => string,
) {
  await exportReportExcel(statementSpec(entity, rows, lang, t));
}

export async function exportStatementPdf(
  entity: Entity,
  rows: Row[],
  lang: Lang,
  t: (k: string) => string,
) {
  await exportReportPdf(statementSpec(entity, rows, lang, t));
}

export async function exportStatementImage(
  entity: Entity,
  rows: Row[],
  lang: Lang,
  t: (k: string) => string,
) {
  await exportReportImage(statementSpec(entity, rows, lang, t));
}
