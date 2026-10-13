import React, { useState, useRef } from 'react';
import { Upload, FileText, X, CheckCircle2, AlertCircle } from 'lucide-react';

const FileUploadArea = ({ file, onFileSelect, accept = ".pdf,.jpg,.jpeg,.png", label = "Supporting Document" }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      onFileSelect(droppedFile);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="file-upload-wrapper">
      <label className="form-label">{label} <span className="text-required">*</span></label>
      
      {!file ? (
        <div
          className={`dropzone-container ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current && inputRef.current.click()}
        >
          <input
            type="file"
            ref={inputRef}
            onChange={handleFileChange}
            accept={accept}
            className="hidden-file-input"
          />
          <div className="dropzone-icon-circle">
            <Upload className="dropzone-icon" />
          </div>
          <div className="dropzone-text-primary">
            Drag & drop your document here, or <span className="dropzone-browse">browse files</span>
          </div>
          <div className="dropzone-text-secondary">
            Supported formats: PDF, JPG, PNG (Max 10MB)
          </div>
        </div>
      ) : (
        <div className="selected-file-card">
          <div className="selected-file-icon">
            <FileText className="file-icon-svg" />
          </div>
          <div className="selected-file-details">
            <div className="selected-file-name" title={file.name}>{file.name}</div>
            <div className="selected-file-size">{formatFileSize(file.size)} • Ready to upload</div>
          </div>
          <div className="selected-file-actions">
            <span className="file-status-tag"><CheckCircle2 className="w-3.5 h-3.5" /> Selected</span>
            <button
              type="button"
              className="file-remove-btn"
              onClick={(e) => {
                e.stopPropagation();
                onFileSelect(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadArea;
