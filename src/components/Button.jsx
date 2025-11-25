import React from "react";

const SubmitButton = ({ loading, disabled, onClick }) => (
  <button className="btn" onClick={onClick} disabled={disabled}>
    {loading ? "Processing..." : "Continue"}
  </button>
);

export default SubmitButton;
