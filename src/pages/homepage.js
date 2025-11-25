import React, { use, useState, useEffect } from "react";
import Select from "react-select";
import "./homePage.css";
import {
  fetchQuickBooksReport,
  sendToPowerAutomate,
} from "../services/services";
import {
  parseGeneralLedgerReport,
  parseQuickBooksReport,
  formatAccountsForDropdown,
  parseMergedGeneralLedgerReports,
} from "../utils/utils";

function HomePage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [accountName, setAccountName] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [parsedData, setParsedData] = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupedAccounts, setGroupedAccounts] = useState([]);

  const fetchAccounts = () => {
    fetchQuickBooksReport({ startDate, endDate, accountName, type: "accounts" })
      .then((data) => {
        console.log(data.companies);
        setGroupedAccounts(formatAccountsForDropdown(data?.companies));
      })
      .catch((err) => {
        console.error("Error fetching report:", err);
      });
  };

  const handleAccountChange = (selected) => {
    // selected is an array of objects: { label, value }
    // You can extract accountId and companyName
    const parsed = selected.map((s) => s.value);
    setSelected(parsed);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleContinue = async () => {
    if (!startDate || !endDate || selected.length === 0) {
      alert("Please fill in all fields.");
      return;
    }

    const accountNames = selected.map((s) => s.accountId);

    try {
      const data = await fetchQuickBooksReport({
        startDate,
        endDate,
        accountIds: accountNames,
        type: "reports",
      });
      console.log("Fetched report data:", data.mergedReports);
      const result = parseMergedGeneralLedgerReports(data.mergedReports);
      setParsedData(parseQuickBooksReport(result));
      await handleSend();

    } catch (err) {
      console.error("Error processing report:", err);
      alert("Error processing report. Please check console for details.");
    }
  };

  const handleSend = async () => {
    const payload = {
      overwrite: overwrite,
      rows: parsedData,
    };
    sendToPowerAutomate(payload);
    console.log("Sending payload to Power Automate:", payload);

  };

  return (
    <div className="container">
      <h1 className="title">QuickBooks Report Extractor</h1>

      <div className="card">
        <label>Start Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        <label>End Date</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        <label>Account Name</label>
        <Select
          options={groupedAccounts}
          isMulti
          onChange={handleAccountChange}
          placeholder="Select accounts..."
          styles={{
            control: (provided) => ({
              ...provided,
              backgroundColor: "#ffffff20", // background of dropdown box
              color: "#000", // text color in box
            }),
            singleValue: (provided) => ({
              ...provided,
              color: "#000", // text color of selected value
            }),
            multiValueLabel: (provided) => ({
              ...provided,
              color: "#000", // text color for multi selected values
            }),
            menu: (provided) => ({
              ...provided,
              backgroundColor: "#ffffff20", // dropdown menu background
              color: "#000",
            }),
            option: (provided, state) => ({
              ...provided,
              backgroundColor: state.isFocused ? "#f0f0f0" : "#fff", // highlight hover
              color: "#000",
            }),
          }}
        />

        <div>
          <h2>Overwrite Existing Data</h2>
          <label style={{ marginLeft: "10px" }}>
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
              v
            />
            Overwrite Existing Data
          </label>
          <br />
        </div>

        <button className="btn" onClick={handleContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}

export default HomePage;
