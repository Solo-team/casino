import React from "react";

const CATEGORIES = [
  "Slot games",
  "Live casino",
  "TV games",
  "Fast games",
  "Virtual sports"
];

const CategoryTabs: React.FC = () => (
  <div className="category-tabs">
    {CATEGORIES.map((name, index) => (
      <button key={name} type="button" className={index === 0 ? "active" : ""}>
        {name}
      </button>
    ))}
  </div>
);

export default CategoryTabs;
