/* global Excel */

export async function activateWorksheetByName(name: string): Promise<void> {
  return Excel.run(async (context) => {
    const worksheet = context.workbook.worksheets.getItem(name);
    worksheet.activate();
    await context.sync();
  });
}
