/* global Office, navigator */

import { OfficeCapabilityState } from "../../shared/types";

export const DEFAULT_OFFICE_CAPABILITIES: OfficeCapabilityState = {
  officeJsReady: false,
  excelHost: false,
  excelApiSupported: false,
  selectionRead: false,
  workbookTables: false,
  charts: false,
  freezePanes: false,
  clipboard: typeof navigator !== "undefined" && Boolean(navigator.clipboard?.writeText),
};

function isExcelApiSupported(version: string): boolean {
  try {
    return Boolean(Office.context?.requirements?.isSetSupported("ExcelApi", version));
  } catch {
    return false;
  }
}

export function detectOfficeCapabilities(host?: Office.HostType): OfficeCapabilityState {
  const excelHost = host === Office.HostType.Excel;
  const excelApiSupported = excelHost && isExcelApiSupported("1.1");

  return {
    officeJsReady: true,
    excelHost,
    excelApiSupported,
    selectionRead: excelApiSupported,
    workbookTables: excelHost && isExcelApiSupported("1.1"),
    charts: excelHost && isExcelApiSupported("1.1"),
    freezePanes: excelHost && isExcelApiSupported("1.7"),
    clipboard: typeof navigator !== "undefined" && Boolean(navigator.clipboard?.writeText),
  };
}

export function capabilityWarnings(capabilities: OfficeCapabilityState): string[] {
  const warnings: string[] = [];

  if (!capabilities.excelHost) {
    warnings.push("This add-in only supports Excel hosts.");
  }

  if (capabilities.excelHost && !capabilities.excelApiSupported) {
    warnings.push(
      "This Excel host does not expose the required Excel API set. Advanced workbook actions are disabled."
    );
  }

  if (!capabilities.clipboard) {
    warnings.push("Clipboard integration is unavailable in this Office runtime.");
  }

  return warnings;
}
