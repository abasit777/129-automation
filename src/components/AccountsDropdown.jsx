import React from "react";
import Select from "react-select";

const AccountsDropdown = ({ groupedAccounts, onChange, loading, isMulti, title }) => {
  return (
    <>
      <label>{title}</label>
      <Select
        options={groupedAccounts}
        isMulti = {isMulti}
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
