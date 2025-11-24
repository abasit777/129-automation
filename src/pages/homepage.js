import React, { useState } from "react";
import "./homePage.css";
import { fetchQuickBooksReport, sendToPowerAutomate } from "../services/services";
import {
  parseGeneralLedgerReport,
  parseQuickBooksReport,
} from "../utils/utils";

function HomePage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [accountName, setAccountName] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [parsedData, setParsedData] = useState([]);



  const handleContinue = () => {
    fetchQuickBooksReport({ startDate, endDate, accountName })
      .then((data) => {
        console.log(data);
        let result = parseGeneralLedgerReport(data, "TST-ME");
        setParsedData(parseQuickBooksReport(result));
        handleSend();
      })
      .catch((err) => {
        console.error("Error fetching report:", err);
      });
  };

  const handleSend = async () => {
    const payload = {
      overwrite: overwrite,
      rows: parsedData,
    };
    console.log("Sending payload to Power Automate:", payload);
  
    const result = await sendToPowerAutomate(payload);
    console.log(result);
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
        <input
          type="text"
          placeholder="e.g. Reserves"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
        />

        <div>
          <h2>Update Local Excel</h2>
          <label style={{ marginLeft: "10px" }}>
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
v            />
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
