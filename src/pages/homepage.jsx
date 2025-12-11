import React, { useState, useEffect, useCallback } from "react";

import DateInput from "../components/DateInput";
import AccountsDropdown from "../components//AccountsDropdown";
import SubmitButton from "../components/Button";
import Select from "react-select";


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
  const [journalAccount, setJournalAccount] = useState(null);
  const journalAccounts = [
    {
      name: "129 Consulting",
      path: "129 Consulting/Accounts - 129 Consulting_2025-26.xlsx"
    },
    {
      name: "AR",
      path: "Abdur Rehman/Accounts - AR_2025-26.xlsx"
    },
    {
      name: "AQM",
      path: "Ahmad Qamar Manan/Accounts - AQM_2025-26.xlsx"
    },
    {
      name: "CodeSynx",
      path: "Codesynx/Accounts - CodeSynx_2025-26.xlsx"
    },
    {
      name: "Usman Jamil",
      path: "Log N/Accounts - Usman Jamil_2025-26.xlsx"
    },
    {
      name: "Luminogics",
      path: "Luminogics/Accounts - Luminogics_2025-26.xlsx"
    },
    {
      name: "Mirai Consulting",
      path: "MIRAI/Accounts - Mirai Consulting_2025-26.xlsx"
    },
    {
      name: "Muhammad Omer",
      path: "Muhammad Omer/Accounts - Muhammad Omer_2025-26.xlsx"
    },
    {
      name: "OrcaTech",
      path: "OrcaTech/Accounts - OrcaTech_2025-26.xlsx"
    },
    {
      name: "Panacea",
      path: "Panacea/Accounts - Panacea_2025-26.xlsx"
    },
    {
      name: "Retailync",
      path: "Retailync/Accounts - Retailync_2025-26.xlsx"
    },
    {
      name: "Source Tek",
      path: "Source Tek/Accounts - Source Tek_2025-26.xlsx"
    },
    {
      name: "TSG",
      path: "TSG/Accounts - TSG_2025-26.xlsx"
    },
    {
      name: "Usman Tariq",
      path: "Usman Tariq/Accounts - Usman Tariq_2025-26.xlsx"
    },
    {
      name: "Waheed Arshad",
      path: "Waheed Arshad/Accounts - Waheed Arshad_2025-26.xlsx"
    },
    {
      name: "Waqas Rasheed",
      path: "Waqas Rasheed/Accounts - Waqas Rasheed_2025-26.xlsx"
    },
    {
      name: "SPV 1",
      path: "SPV1/Accounts - SPV1_2025-26.xlsx"
    }
  ];
  
  

  const options = journalAccounts.map(acc => ({
    label: acc.name,
    value: acc.name,
    url: acc.path,
  }));

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

  const handleJournalAccountChange = (selected) => {
    setJournalAccount(selected);
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
      const accountIds = selectedAccounts.map((x) => ({
        accountId: x.accountId,
        companyName: x.companyName,
      }));
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
        journalAccountUrl: journalAccount,
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
          isMulti={true}
          title="Select Ledger Accounts"
        />

        <label>Select Journal Account</label>

        <Select
        options={options}
        isMulti={false}
        isLoading={false}
        onChange={handleJournalAccountChange}
        placeholder="Select Journal account..."
        styles={dropdownStyles}
      />

        <p>Selected: {journalAccount?.label}</p>
        {/* <OverwriteToggle
          value={form.overwrite}
          onChange={(v) => setForm({ ...form, overwrite: v })}
        /> */}

        <SubmitButton
          loading={loading}
          disabled={!isFormValid}
          onClick={handleContinue}
        />
      </div>
    </div>
  );
}

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
