// src/api/quickbooks.js
export const fetchQuickBooksReport = async ({
  startDate,
  endDate,
  accountName,
}) => {
  try {
    const response = await fetch("https://tstaccounts.abasit477.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate, accountName }),
    });

    if (!response.ok) {
      throw new Error(`Worker error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error("Error fetching QuickBooks report:", err);
    throw err;
  }
};

export async function sendToPowerAutomate(data) {
  const FLOW_URL = "https://e77957525d20e25a83842ff6ec5ac9.8f.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/4658afc012ef4d29af23c0286462b42d/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=6UTPH7pvImrvaZguEUE-_977zgdMnOnCRa_azkrEP5I"
  try {
    const response = await fetch(FLOW_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        message: `Power Automate Error: ${response.status} — ${errorText}`,
      };
    }

    const json = await response.json().catch(() => ({})); // PA sometimes returns empty
    return {
      success: true,
      message: "Excel updated successfully!",
      data: json,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || "Unexpected error occurred",
    };
  }
}
