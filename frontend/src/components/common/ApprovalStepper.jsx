import React from 'react';
import { Check, Clock, X, AlertCircle } from 'lucide-react';

/**
 * Visual Approval Stepper component showing the 4-stage journey:
 * 1. Submitted (Student)
 * 2. HOD Review & Decision
 * 3. Teacher Notification & Acknowledgement
 */
const ApprovalStepper = ({ application }) => {
  if (!application) return null;

  const { status, hod_approval, acknowledgements } = application;

  const isHodApproved = status === 'APPROVED_BY_HOD' || status === 'APPROVED';
  const isHodRejected = status === 'REJECTED_BY_HOD' || status === 'REJECTED';
  const isPendingHod = status === 'SUBMITTED' || status === 'PENDING';

  const hasTeacherAck = acknowledgements && acknowledgements.length > 0;

  // Step 1: Submission
  const step1 = { label: 'Application Submitted', status: 'completed', subtitle: 'Sent to HOD' };

  // Step 2: HOD Review & Decision
  let step2 = { label: 'HOD Review', status: 'pending', subtitle: 'Awaiting decision' };
  if (isHodApproved) {
    const hodName = hod_approval?.hod_name ? `By ${hod_approval.hod_name}` : 'Approved';
    step2 = { label: 'HOD Approved', status: 'completed', subtitle: hodName };
  } else if (isHodRejected) {
    const hodName = hod_approval?.hod_name ? `By ${hod_approval.hod_name}` : 'Rejected';
    step2 = { label: 'HOD Rejected', status: 'rejected', subtitle: hod_approval?.remarks || hodName };
  } else if (isPendingHod) {
    step2 = { label: 'HOD Review', status: 'current', subtitle: 'Under HOD review' };
  }

  // Step 3: Teacher Acknowledgement
  let step3 = { label: 'Faculty Acknowledgement', status: 'pending', subtitle: 'Pending teacher review' };
  if (isHodRejected) {
    step3 = { label: 'Workflow Ended', status: 'disabled', subtitle: 'Application rejected by HOD' };
  } else if (hasTeacherAck) {
    const count = acknowledgements.length;
    step3 = { label: 'Teacher Acknowledged', status: 'completed', subtitle: `${count} Faculty ack'd` };
  } else if (isHodApproved) {
    step3 = { label: 'Teacher Review', status: 'current', subtitle: 'Notified faculty' };
  }

  const steps = [step1, step2, step3];

  const renderIcon = (stepStatus) => {
    switch (stepStatus) {
      case 'completed':
        return <Check className="stepper-icon-svg" />;
      case 'rejected':
        return <X className="stepper-icon-svg" />;
      case 'current':
        return <Clock className="stepper-icon-svg" />;
      default:
        return <div className="stepper-dot-inner" />;
    }
  };

  return (
    <div className="approval-stepper-container">
      <div className="stepper-header-title">Approval Journey Progress</div>
      <div className="stepper-track">
        {steps.map((step, idx) => (
          <div key={idx} className={`stepper-item ${step.status}`}>
            <div className="stepper-node">
              <div className={`stepper-icon-badge ${step.status}`}>
                {renderIcon(step.status)}
              </div>
              {idx < steps.length - 1 && (
                <div className={`stepper-connector ${step.status === 'completed' ? 'active' : ''}`} />
              )}
            </div>
            <div className="stepper-label-content">
              <div className="stepper-title">{step.label}</div>
              <div className="stepper-subtitle">{step.subtitle}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApprovalStepper;
