import React, { useState, useEffect, useCallback } from "react";
import Select from "react-select";
import { showToast } from "../utils/utils";

import "./homePage.css";
import {
  fetchQuickBooksReport,
  sendToPowerAutomate,
} from "../services/services";

import {
  parseQuickBooksReport,
  formatAccountsForDropdown,
  parseMergedGeneralLedgerReports,
} from "../utils/utils";

function HomePage() {
  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    overwrite: false,
  });

  const [groupedAccounts, setGroupedAccounts] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [parsedData, setParsedData] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  /** ----------------------------------
   * Fetch Accounts on Page Load
   * ---------------------------------- */
  const loadAccounts = useCallback(async () => {
    try {
      setLoadingAccounts(true);

      const data = await fetchQuickBooksReport({ type: "accounts" });

      setGroupedAccounts(formatAccountsForDropdown(data?.companies));
      showToast("Accounts Fetched successfully!", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to fetch accounts!", "error");
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  /** ----------------------------------
   * Handle account selection
   * ---------------------------------- */
  const handleAccountChange = (selected) => {
    const values = selected?.map((item) => item.value) || [];
    setSelectedAccounts(values);
  };

  /** ----------------------------------
   * Validate form inputs
   * ---------------------------------- */
  const isFormValid =
    form.startDate &&
    form.endDate &&
    selectedAccounts.length > 0 &&
    !loading &&
    !loadingAccounts;

  /** ----------------------------------
   * Main Handler
   * ---------------------------------- */
  const handleContinue = async () => {
    if (!isFormValid) {
      showToast("Please fill in the required infomration", "error");

      return;
    }

    setLoading(true);
    showToast("Fetching Reports...", "info");

    try {
      const accountIds = selectedAccounts.map((s) => s.accountId);

      const data = await fetchQuickBooksReport({
        startDate: form.startDate,
        endDate: form.endDate,
        accountIds,
        type: "reports",
      });

      showToast("Reports fetched successfully", "success");
;

      const merged = parseMergedGeneralLedgerReports(data.mergedReports);
      const processed = parseQuickBooksReport(merged);

      setParsedData(processed);

      await sendDataToPowerAutomate(processed);
    } catch (err) {
      console.error("Error:", err);
      showToast("Error while fetching reports", "error");
    } finally {
      setLoading(false);
    }
  };

  /** ----------------------------------
   * Send to Power Automate
   * ---------------------------------- */
  const sendDataToPowerAutomate = async (rows) => {
    try {
      const payload = { overwrite: form.overwrite, rows };
      console.log("Sending payload:", payload);

      showToast("Sending Reports to Powe Automate", "info");

      await sendToPowerAutomate(payload);

      showToast("Reports sent to Power Automate", "success");
    } catch (err) {
      console.error(err);
      showToast("Error while sending data to Power Automate", "error");
    }
  };

  /** ----------------------------------
   * JSX
   * ---------------------------------- */
  return (
    <div className="container">
      <h1 className="title">QuickBooks Report Extractor</h1>

      <div className="card">
        <label>Start Date</label>
        <input
          type="date"
          value={form.startDate}
          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
        />

        <label>End Date</label>
        <input
          type="date"
          value={form.endDate}
          onChange={(e) => setForm({ ...form, endDate: e.target.value })}
        />

        <label>Account Name</label>
        <Select
          options={groupedAccounts}
          isMulti
          isLoading={loadingAccounts}
          onChange={handleAccountChange}
          placeholder="Select accounts..."
          styles={dropdownStyles}
        />

        <div className="checkbox-section">
          <h2>Overwrite Existing Data</h2>
          <label>
            <input
              type="checkbox"
              checked={form.overwrite}
              onChange={(e) =>
                setForm({ ...form, overwrite: e.target.checked })
              }
            />
            Overwrite Existing Data
          </label>
        </div>

        <button
          className="btn"
          onClick={handleContinue}
          disabled={!isFormValid}
        >
          {loading ? "Processing..." : "Continue"}
        </button>
      </div>
    </div>
  );
}

/** ----------------------------------
 * Dropdown styling
 * ---------------------------------- */
const dropdownStyles = {
  control: (base) => ({
    ...base,
    backgroundColor: "#ffffff20",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? "#eee" : "#fff",
    color: "#000",
  }),
};

export default HomePage;
