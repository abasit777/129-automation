export const parseMergedGeneralLedgerReports = (mergedReports) => {
  const combinedOutput = [];
  console.log("Parsing merged reports:", mergedReports);

  mergedReports.forEach((reportItem) => {
    const { companyName, reportData, accountName } = reportItem;

    // Call your existing parser
    const parsedRows = parseGeneralLedgerReport(reportData, companyName);
    console.log(
      `Parsed ${parsedRows.length} rows for company: ${companyName}, account: ${accountName}`
    );

    // Add company name to each row
    const parsedWithCompany = parsedRows.map((row) => ({
      companyName,
      ...row,
    }));

    combinedOutput.push(...parsedWithCompany);
  });

  return combinedOutput;
};

// src/utils/parseGeneralLedger.js
export const parseGeneralLedgerReport = (report, fileName) => {
  const columns = report.Columns.Column;
  const output = [];

  const topRows = Array.isArray(report.Rows?.Row)
    ? report.Rows.Row
    : report.Rows?.Row
    ? [report.Rows.Row]
    : [];

  topRows.forEach((parent) => {
    const parentName = parent.Header?.ColData?.[0]?.value || "";

    // Check if there are nested child rows
    const childSections = Array.isArray(parent.Rows?.Row)
      ? parent.Rows.Row
      : parent.Rows?.Row
      ? [parent.Rows.Row]
      : [];

    // If no nested children, treat parent itself as the data container
    if (childSections.length === 0 && parent.Rows?.Row?.type === "Data") {
      const converted = convertRow(
        columns,
        parent.Rows.ColData,
        parentName,
        fileName
      );
      output.push(converted);
    }

    childSections.forEach((child) => {
      const childName = child.Header?.ColData?.[0]?.value || "";
      const accountFullName = parentName + (childName ? `:${childName}` : "");

      const dataRows = Array.isArray(child.Rows?.Row)
        ? child.Rows.Row
        : child.Rows?.Row
        ? [child.Rows.Row]
        : [];

      // If child itself is a data row
      if (child.type === "Data") {
        const converted = convertRow(
          columns,
          child.ColData,
          accountFullName,
          fileName
        );
        output.push(converted);
      }

      dataRows.forEach((row) => {
        if (row.type === "Data") {
          const converted = convertRow(
            columns,
            row.ColData,
            accountFullName,
            fileName
          );
          output.push(converted);
        }
      });
    });
  });

  console.log(`Converted ${output.length} rows from General Ledger report.`);
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
      case "Exchange Rate":
        result["Exchange Rate"] = value;
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

export const formatAccountsForDropdown = (companies) => {
  return companies.map((company) => {
    // Step 1: find the "Account Reserves" account
    const reservesAcc = company.accounts.find(
      (acc) => acc.Name?.trim().toLowerCase() === "reserves"
    );

    if (!reservesAcc) {
      // If company has no reserves account → empty options
      return {
        label: company.companyName,
        options: [],
      };
    }

    const reservesId = reservesAcc.Id;

    // Step 2: Filter accounts by rule
    const filtered = company.accounts.filter((acc) => {
      const parent = acc.ParentRef?.value;
      return acc.Id === reservesId || parent === reservesId;
    });

    // Step 3: Format for dropdown
    return {
      label: company.companyName,
      options: filtered.map((acc) => ({
        label: acc.Name,
        value: {
          accountId: acc.Id,
          companyName: company.companyName,
        },
      })),
    };
  });
};


export const showToast = (message, type = "success") => {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <div class="close-btn" onclick="this.parentElement.remove()">×</div>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "fadeOut 0.4s ease forwards";
    setTimeout(() => toast.remove(), 400);
  }, 3000);
};

// ----------------------------------------------------------
//  Utility: Determine company from filename
// ----------------------------------------------------------
function determineCompany(fileName = "") {
  const file = fileName.toLowerCase();
  if (file.includes("tst-me")) return "tst-me";
  if (file.includes("enterprise") || file.includes("tst-ent"))
    return "tst-ent";
  if (file.includes("acna")) return "acna";
  return "";
}

// ----------------------------------------------------------
//  Utility: Extract CCR from original description
// ----------------------------------------------------------
function extractCCR(desc = "") {
  const match = desc.match(/CCR\s*=\s*(\d+)/i);
  return match ? Number(match[1]) : 0;
}

// ----------------------------------------------------------
//  Utility: Clean description (remove CCR=xxx)
// ----------------------------------------------------------
function cleanDescription(desc = "") {
  // Remove CCR and EXR
  let cleaned = desc.replace(/\|?\s*CCR\s*=\s*\d+/i, "");
  cleaned = cleaned.replace(/\|?\s*EXR\s*=\s*[\d.]+/i, "");

  return cleaned;
}

// ----------------------------------------------------------
//  Utility: Get account before first |
// ----------------------------------------------------------
function getOriginalAccount(desc = "", fallback = "") {
  return desc.split("|")[0].trim() || fallback;
}

// ----------------------------------------------------------
//  Utility: Company-based conversion logic
//  Returns: convertedAmt OR null
// ----------------------------------------------------------
function convertAmount(item, company, CCR) {
  // Check only for missing CCR, not for zero
  if (CCR === null || CCR === undefined) return null;

  const base = Number(item.Credit || item.Debit);
  if (isNaN(base)) return null;

  // Extract EXR from description
  const exrMatch = (item["Memo/Description"] || "").match(/EXR\s*=\s*([\d.]+)/i);
  const exr = exrMatch ? Number(exrMatch[1]) : 0;

  // ==== ACNA (simple CCR multiplication) ====
  if (company === "acna") {
    console.log("ACNA conversion:", { base, CCR });
    return (base * CCR).toFixed(2);
  }

  // ==== TST-ME ====
  if (company === "tst-me") {
    if (exr === 0) return 0; // no EXR → result is zero

    if (item.Currency === "USD") {
      const usd = base / exr;
      return (usd * CCR).toFixed(2);
    }

    if (item.Currency === "AED") {
      if (exr === 1) {
        const usd = base / 3.673;
        return (usd * CCR).toFixed(2);
      }
      return (base * CCR).toFixed(2);
    }
  }

  return null;
}

// ----------------------------------------------------------
//  Utility: Duplicate entry account based on company
// ----------------------------------------------------------
function getDuplicateAccount(company) {
  if (company === "tst-me") return "ASSET > Accounts Receivable: TST ME";
  if (company === "tst-ent")
    return "ASSET > Accounts Receivable: TST Enterprises";
  if (company === "acna") return "ASSET > Accounts Receivable: ACNA Inc.";
  return "";
}

// ----------------------------------------------------------
//  Build original entry
// ----------------------------------------------------------
function buildOriginalEntry(item, cleanedDesc, convertedAmt, originalAccount) {
  const original = { ...item, "Memo/Description": cleanedDesc };

  if (convertedAmt !== null) {
    if (item.Credit) original.Credit = convertedAmt;
    else if (item.Debit) original.Debit = convertedAmt;
  }

  original.Account = originalAccount;
  return original;
}

// ----------------------------------------------------------
//  Build duplicate entry
// ----------------------------------------------------------
function buildDuplicateEntry(original, company) {
  const newItem = { ...original };

  newItem.Credit = original.Debit || "";
  newItem.Debit = original.Credit || "";

  newItem.Account = getDuplicateAccount(company);
  return newItem;
}

// ----------------------------------------------------------
//  MAIN FUNCTION — now super clean
// ----------------------------------------------------------
export function parseQuickBooksReport(dataArray) {
  if (!Array.isArray(dataArray)) return [];

  const result = [];

  for (const item of dataArray) {
    const originalDesc = item["Memo/Description"] || "";
    if (!originalDesc.trim()) continue;

    const company = determineCompany(item.FileName);
    const CCR = extractCCR(originalDesc);
    let cleanedDesc = cleanDescription(originalDesc);
    cleanedDesc = removeFirstPipeSection(cleanedDesc); 
    
    // ORIGINAL ACCOUNT ALWAYS from original description
    const originalAccount = getOriginalAccount(originalDesc, item.Account);

    // ========== TST-ENT HAS NO CONVERSION ==========
    if (company === "tst-ent") {
      const original = buildOriginalEntry(item, cleanedDesc, null, originalAccount);
      const duplicate = buildDuplicateEntry(original, company);

      result.push(original, duplicate);
      continue;
    }

    // Perform conversion (ACNA, TST-ME)
    const convertedAmt = convertAmount(item, company, CCR);

    // Build original entry
    const original = buildOriginalEntry(item, cleanedDesc, convertedAmt, originalAccount);

    // Build duplicate
    const duplicate = buildDuplicateEntry(original, company);

    result.push(original, duplicate);
  }

  return result;
}

function removeFirstPipeSection(desc = "") {
  if (!desc.includes("|")) return desc.trim();

  // Split once at first pipe
  const parts = desc.split("|");

  // Remove the first part (Account name)
  parts.shift();

  // Join the rest
  return parts.join("|").trim();
}



