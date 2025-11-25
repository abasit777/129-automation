import React from "react";

const OverwriteToggle = ({ value, onChange }) => {
  return (
    <div className="checkbox-section">
      <h2>Overwrite Existing Data</h2>
      <label>
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        Overwrite Existing Data
      </label>
    </div>
  );
};

export default OverwriteToggle;
