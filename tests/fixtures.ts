import { RangeSnapshot } from "../src/shared/types";

export function createSalesSnapshot(): RangeSnapshot {
  return {
    address: "A1:E5",
    sheetName: "sales_data",
    startRowIndex: 0,
    startColumnIndex: 0,
    rowCount: 5,
    columnCount: 5,
    values: [
      ["Month", "Region", "Revenue", "Cost", "Margin %"],
      ["2026-01-01", "North", 125000, 83000, 33.6],
      ["2026-02-01", "North", 132500, 87000, 34.3],
      ["2026-01-01", "South", 117200, 79900, 31.8],
      ["2026-02-01", "South", 121900, 81250, 33.3],
    ],
    text: [
      ["Month", "Region", "Revenue", "Cost", "Margin %"],
      ["2026-01-01", "North", "125000", "83000", "33.6"],
      ["2026-02-01", "North", "132500", "87000", "34.3"],
      ["2026-01-01", "South", "117200", "79900", "31.8"],
      ["2026-02-01", "South", "121900", "81250", "33.3"],
    ],
    numberFormats: [
      ["@", "@", "@", "@", "@"],
      ["yyyy-mm-dd", "@", "#,##0", "#,##0", "0.0"],
      ["yyyy-mm-dd", "@", "#,##0", "#,##0", "0.0"],
      ["yyyy-mm-dd", "@", "#,##0", "#,##0", "0.0"],
      ["yyyy-mm-dd", "@", "#,##0", "#,##0", "0.0"],
    ],
    capturedAt: "2026-03-17T20:00:00.000Z",
  };
}

export function createSupportSnapshot(): RangeSnapshot {
  return {
    address: "A1:E5",
    sheetName: "support_log",
    startRowIndex: 0,
    startColumnIndex: 0,
    rowCount: 5,
    columnCount: 5,
    values: [
      ["Ticket ID", "Team", "Status", "Owner", "Comment"],
      [
        "INC-1001",
        "Support",
        "Open",
        "Alice",
        "Customer cannot access the enterprise portal after the MFA reset and needs a manual override.",
      ],
      ["INC-1002", "Support", "Closed", null, "Resolved after clearing the cached browser session."],
      ["INC-1003", "Operations", "In Progress", "Marc", null],
      ["INC-1004", "Operations", null, null, "Waiting for third-party vendor feedback."],
    ],
    text: [
      ["Ticket ID", "Team", "Status", "Owner", "Comment"],
      [
        "INC-1001",
        "Support",
        "Open",
        "Alice",
        "Customer cannot access the enterprise portal after the MFA reset and needs a manual override.",
      ],
      ["INC-1002", "Support", "Closed", "", "Resolved after clearing the cached browser session."],
      ["INC-1003", "Operations", "In Progress", "Marc", ""],
      ["INC-1004", "Operations", "", "", "Waiting for third-party vendor feedback."],
    ],
    numberFormats: [
      ["@", "@", "@", "@", "@"],
      ["@", "@", "@", "@", "@"],
      ["@", "@", "@", "@", "@"],
      ["@", "@", "@", "@", "@"],
      ["@", "@", "@", "@", "@"],
    ],
    capturedAt: "2026-03-18T09:30:00.000Z",
  };
}
