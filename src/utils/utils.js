// utils/processEntries.js

export function processEntries(data) {
    if (!Array.isArray(data)) {
      throw new Error("Input must be an array");
    }
  
    const result = [];
  
    for (const item of data) {
      // === RULE 2: Currency & Amount Processing (USD & AED with CCR logic) ===
      let convertedAmt;
      const desc = item["Memo/Description"] || "";
  
      // Try to extract CCR
      const ccrMatch = desc.match(/CCR\s*=\s*(\d+)/i);
      const CCR = ccrMatch ? Number(ccrMatch[1]) : null;
  
      // --- USD Rule (USD → PKR using CCR) ---
      if (item.Currency === "USD" && CCR) {
        if (item.Credit && item.Credit !== "") {
          const base = Number(item.Credit);
          if (!isNaN(base)) convertedAmt = (base * CCR).toFixed(2);
        } else if (item.Debit && item.Debit !== "") {
          const base = Number(item.Debit);
          if (!isNaN(base)) convertedAmt = (base * CCR).toFixed(2);
        }
      }
  
      // --- AED Rule (AED → USD → PKR using CCR) ---
      if (item.Currency === "AED" && CCR) {
        if (item.Credit && item.Credit !== "") {
          const base = Number(item.Credit);
          if (!isNaN(base)) {
            const usd = base / 3.673; // convert AED → USD
            convertedAmt = (usd * CCR).toFixed(2); // convert USD → PKR
          }
        } else if (item.Debit && item.Debit !== "") {
          const base = Number(item.Debit);
          if (!isNaN(base)) {
            const usd = base / 3.673; // convert AED → USD
            convertedAmt = (usd * CCR).toFixed(2); // convert USD → PKR
          }
        }
      }
  
      // Apply updated convertedAmt
      const original = { ...item };
  
      if (convertedAmt && convertedAmt !== "") {
        if (item.Credit && item.Credit !== "") {
          original.Credit = convertedAmt;
        } else if (item.Debit && item.Debit !== "") {
          original.Debit = convertedAmt;
        }
      }
  
      // Add original
      result.push(original);
  
      // Duplicate
      const newItem = { ...original };
  
      const origCredit = newItem.Credit;
      const origDebit = newItem.Debit;
  
      newItem.Credit = origDebit || "";
      newItem.Debit = origCredit || "";
  
      const file = item.FileName?.toLowerCase() || "";
      if (file.includes("tst-me")) {
        newItem.Account = "ASSET > Accounts Receivable: TST ME";
      } else if (file.includes("enterprise")) {
        newItem.Account = "ASSET > Accounts Receivable: TST Enterprise";
      }
  
      result.push(newItem);
    }
  
    return result;
  }


  // src/utils/parseGeneralLedger.js
export const parseGeneralLedgerReport = (report, fileName) => {
    const columns = report.Columns.Column;
    const output = [];
  
    const topRows = report.Rows.Row; // e.g., Reserves section
  
    topRows.forEach(parent => {
      const parentName = parent.Header?.ColData?.[0]?.value || "";
      const childSections = parent.Rows?.Row || [];
  
      childSections.forEach(child => {
        const childName = child.Header?.ColData?.[0]?.value || "";
        const accountFullName = parentName + (childName ? `:${childName}` : "");
  
        const dataRows = child.Rows?.Row || [];
        dataRows.forEach(row => {
          if (row.type === "Data") {
            const converted = convertRow(columns, row.ColData, accountFullName, fileName);
            output.push(converted);
          }
        });
      });
    });
  
    return output;
  };
  
  // Convert a single row
  const convertRow = (columns, colData, accountName, fileName) => {
    const result = {};
  
    columns.forEach((col, index) => {
      const value = colData[index]?.value || "";
  
      switch (col.ColTitle) {
        case "Date":
          result["Date"] = formatDate(value);
          break;
        case "Memo/Description":
          result["Memo/Description"] = value;
          break;
        case "Debit":
          result["Debit"] = value;
          break;
        case "Credit":
          result["Credit"] = value;
          break;
        case "Transaction Type":
          result["Type"] = value;
          break;
        case "Currency":
          result["Currency"] = value;
          break;
        default:
          break;
      }
    });
  
    result["Account"] = accountName;
    result["FileName"] = fileName;
  
    return result;
  };
  
  // Convert YYYY-MM-DD → MM/DD/YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${m}/${d}/${y}`;
  };

  // utils/parseQuickBooksReport.js
// utils/parseQuickBooksReport.js
export const parseQuickBooksReport = (dataArray) => {
    if (!Array.isArray(dataArray)) return [];
  
    const result = [];
  
    dataArray.forEach((item) => {
      let desc = item["Memo/Description"] || "";
      if (!desc.trim()) return; // skip empty descriptions
  
      // --- Remove CCR from description ---
      desc = desc.replace(/\|?\s*CCR\s*=\s*\d+/i, "").trim();
  
      let convertedAmt = item.ForeignAmount || "";
  
      // --- Extract CCR if needed for conversion ---
      const ccrMatch = item["Memo/Description"]?.match(/CCR\s*=\s*(\d+)/i);
      const CCR = ccrMatch ? Number(ccrMatch[1]) : null;
  
      // --- AED Conversion (check Debit/Credit) ---
      if (item.Currency === "AED") {
        if (item.Credit && item.Credit !== "") {
          const num = Number(item.Credit);
          if (!isNaN(num)) {
            const usd = num / 3.63;          // AED → USD
            convertedAmt = CCR ? (usd * CCR).toFixed(2) : usd.toFixed(2);
          }
        } else if (item.Debit && item.Debit !== "") {
          const num = Number(item.Debit);
          if (!isNaN(num)) {
            const usd = num / 3.63;          // AED → USD
            convertedAmt = CCR ? (usd * CCR).toFixed(2) : usd.toFixed(2);
          }
        }
      }
  
      // --- USD Conversion with CCR ---
      if (item.Currency === "USD" && CCR) {
        if (item.Credit && item.Credit !== "") {
          const base = Number(item.Credit);
          if (!isNaN(base)) convertedAmt = (base * CCR).toFixed(2);
        } else if (item.Debit && item.Debit !== "") {
          const base = Number(item.Debit);
          if (!isNaN(base)) convertedAmt = (base * CCR).toFixed(2);
        }
      }
  
      // --- Apply updated convertedAmt ---
      const original = { ...item, "Memo/Description": desc };
  
      if (convertedAmt && convertedAmt !== "") {
        if (item.Credit && item.Credit !== "") original.Credit = convertedAmt;
        else if (item.Debit && item.Debit !== "") original.Debit = convertedAmt;
      }
      const firstPart = desc.split("|")[0];
    original.Account = firstPart || item.Account || "";
  
      // --- Add original row ---
      result.push(original);
  
      // --- Duplicate with swapped Credit/Debit ---
      const newItem = { ...original };
      const origCredit = newItem.Credit;
      const origDebit = newItem.Debit;
  
      newItem.Credit = origDebit || "";
      newItem.Debit = origCredit || "";
  
      // --- Set Account based on FileName ---
      const file = (item.FileName || "").toLowerCase();
      if (file.includes("tst-me")) {
        newItem.Account = "ASSET > Accounts Receivable: TST ME";
      } else if (file.includes("enterprise")) {
        newItem.Account = "ASSET > Accounts Receivable: TST Enterprise";
      }
  
      result.push(newItem);
    });
  
    return result;
  };
  
  
  
  
  