import React from "react";
import type { ApiProvider } from "../../types/api";

interface Props {
  search: string;
  onSearch: (value: string) => void;
  providers: ApiProvider[];
  selectedProvider: string | null;
  onProviderChange: (providerId: string | null) => void;
}

const GameFilters: React.FC<Props> = ({ search, onSearch, providers, selectedProvider, onProviderChange }) => (
  <div className="filters-row">
    <input
      className="input search-input"
      type="search"
      placeholder="Search"
      value={search}
      onChange={event => onSearch(event.target.value)}
    />
    <select
      className="input"
      value={selectedProvider ?? "all"}
      onChange={event => {
        const value = event.target.value;
        onProviderChange(value === "all" ? null : value);
      }}
      disabled={!providers.length}
    >
      <option value="all">All providers</option>
      {providers.map(provider => (
        <option key={provider.id} value={provider.id}>
          {provider.name}
        </option>
      ))}
    </select>
    <button className="button button-secondary" type="button">
      Filters
    </button>
  </div>
);

export default GameFilters;
