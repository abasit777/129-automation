import React, { useState, useEffect, useCallback } from "react";

import DateInput from "../components/DateInput";
import AccountsDropdown from "../components//AccountsDropdown";
import OverwriteToggle from "../components//Toggle";
import SubmitButton from "../components/Button";

import { showToast } from "../utils/utils";
import {
  fetchQuickBooksReport,
  sendToPowerAutomate,
} from "../services/services";

import {
  parseQuickBooksReport,
  formatAccountsForDropdown,
  parseMergedGeneralLedgerReports,
} from "../utils/utils";

import "./homePage.css";

function HomePage() {
  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    overwrite: false,
  });

  const [groupedAccounts, setGroupedAccounts] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const loadAccounts = useCallback(async () => {
    try {
      setLoadingAccounts(true);
      const data = await fetchQuickBooksReport({ type: "accounts" });

      setGroupedAccounts(formatAccountsForDropdown(data?.companies));
      showToast("Accounts loaded!", "success");
    } catch (err) {
      showToast("Failed to load accounts", "error");
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleAccountChange = (selected) => {
    setSelectedAccounts(selected ? selected.map((item) => item.value) : []);
  };

  const isFormValid =
    form.startDate &&
    form.endDate &&
    selectedAccounts.length > 0 &&
    !loading &&
    !loadingAccounts;

  const handleContinue = async () => {
    if (!isFormValid) return showToast("Missing required fields", "error");

    setLoading(true);
    showToast("Fetching report...", "info");

    try {
      const accountIds = selectedAccounts.map((x) => x.accountId);

      const data = await fetchQuickBooksReport({
        startDate: form.startDate,
        endDate: form.endDate,
        accountIds,
        type: "reports",
      });

      const merged = parseMergedGeneralLedgerReports(data.mergedReports);
      const processed = parseQuickBooksReport(merged);

      showToast("Report fetched!", "success");

      await sendToPowerAutomate({
        overwrite: form.overwrite,
        rows: processed,
      });

      showToast("Sent to Power Automate!", "success");
    } catch (err) {
      showToast("Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1 className="title">QuickBooks Report Extractor</h1>

      <div className="card">
        <DateInput
          label="Start Date"
          value={form.startDate}
          onChange={(v) => setForm({ ...form, startDate: v })}
        />

        <DateInput
          label="End Date"
          value={form.endDate}
          onChange={(v) => setForm({ ...form, endDate: v })}
        />

        <AccountsDropdown
          groupedAccounts={groupedAccounts}
          onChange={handleAccountChange}
          loading={loadingAccounts}
        />

        <OverwriteToggle
          value={form.overwrite}
          onChange={(v) => setForm({ ...form, overwrite: v })}
        />

        <SubmitButton
          loading={loading}
          disabled={!isFormValid}
          onClick={handleContinue}
        />
      </div>
    </div>
  );
}

export default HomePage;
