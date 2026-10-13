import React from 'react';

export const TableSkeleton = ({ rows = 5, cols = 5 }) => {
  return (
    <div className="skeleton-table-wrapper">
      <div className="skeleton-table-header">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton-block skeleton-th" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="skeleton-table-row">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="skeleton-block skeleton-td" />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton = ({ count = 3 }) => {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-block skeleton-title" />
          <div className="skeleton-block skeleton-text" />
          <div className="skeleton-block skeleton-text-short" />
        </div>
      ))}
    </div>
  );
};

export default { TableSkeleton, CardSkeleton };
