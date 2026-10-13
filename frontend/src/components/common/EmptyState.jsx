import React from 'react';
import { Inbox, FileText, Search, CheckCircle } from 'lucide-react';

const EmptyState = ({
  icon: Icon = Inbox,
  title = "No data available",
  description = "There are no records to display at this time.",
  actionLabel,
  onAction
}) => {
  return (
    <div className="empty-state-card">
      <div className="empty-state-icon-wrapper">
        <Icon className="empty-state-icon" />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {actionLabel && onAction && (
        <button type="button" className="btn btn-primary btn-sm mt-3" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
