import React from "react";

const DateInput = ({ label, value, onChange }) => {
  return (
    <>
      <label>{label}</label>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
    </>
  );
};

export default DateInput;
