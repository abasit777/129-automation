import React from "react";
import Select from "react-select";

const AccountsDropdown = ({ groupedAccounts, onChange, loading }) => {
  return (
    <>
      <label>Account Name</label>
      <Select
        options={groupedAccounts}
        isMulti
        isLoading={loading}
        onChange={onChange}
        placeholder="Select accounts..."
        styles={dropdownStyles}
      />
    </>
  );
};

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

export default AccountsDropdown;
