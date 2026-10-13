import React from 'react';
import { Clock, CheckCircle2, XCircle, Eye, AlertCircle } from 'lucide-react';

const StatusBadge = ({ status }) => {
  switch (status) {
    case 'SUBMITTED':
    case 'PENDING':
      return (
        <span className="status-badge badge-submitted">
          <Clock className="w-3.5 h-3.5" />
          Pending Review
        </span>
      );
    case 'APPROVED_BY_HOD':
    case 'APPROVED':
      return (
        <span className="status-badge badge-approved">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {status === 'APPROVED_BY_HOD' ? 'HOD Approved' : 'Approved'}
        </span>
      );
    case 'REJECTED_BY_HOD':
    case 'REJECTED':
      return (
        <span className="status-badge badge-rejected">
          <XCircle className="w-3.5 h-3.5" />
          {status === 'REJECTED_BY_HOD' ? 'HOD Rejected' : 'Rejected'}
        </span>
      );
    case 'ACKNOWLEDGED':
      return (
        <span className="status-badge badge-acknowledged">
          <Eye className="w-3.5 h-3.5" />
          Acknowledged
        </span>
      );
    default:
      return (
        <span className="status-badge badge-default">
          <AlertCircle className="w-3.5 h-3.5" />
          {status}
        </span>
      );
  }
};

export default StatusBadge;
