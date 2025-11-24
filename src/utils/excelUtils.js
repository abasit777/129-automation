import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/**
 * Updates an Excel file with new data.
 * @param {File} file - Uploaded Excel file
 * @param {Array} parsedData - Array of objects to add to Excel
 * @param {boolean} overwrite - If true, replaces all data; else appends
 */
export const updateExcelFile = (file, parsedData, overwrite = false) => {
  if (!file) {
    throw new Error("No Excel file provided");
  }

  const reader = new FileReader();

  reader.onload = (evt) => {
    const data = evt.target.result;
    const workbook = XLSX.read(data, { type: "binary" });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    let newData = parsedData;

    if (!overwrite) {
      // Merge with existing sheet data
      const existingData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      newData = [...existingData, ...parsedData];
    }

    // Convert to sheet and replace
    const newWorksheet = XLSX.utils.json_to_sheet(newData);
    workbook.Sheets[sheetName] = newWorksheet;

    // Save file
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "Updated_QuickBooks_Report.xlsx");
  };

  reader.readAsBinaryString(file);
};
