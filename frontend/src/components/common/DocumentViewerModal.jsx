import React from 'react';
import { X, Download, FileText, ExternalLink } from 'lucide-react';

const DocumentViewerModal = ({ isOpen, onClose, documentUrl, fileName, fileType }) => {
  if (!isOpen || !documentUrl) return null;

  const isPdf = fileType?.includes('pdf') || fileName?.toLowerCase().endsWith('.pdf');
  const isImage = fileType?.includes('image') || fileName?.match(/\.(jpg|jpeg|png)$/i);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 text-sky-700 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base">{fileName || 'Uploaded Document'}</h3>
              <p className="text-xs text-slate-500 font-mono">{fileType || 'Document attachment'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open New Tab
            </a>
            <a
              href={documentUrl}
              download={fileName}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 bg-slate-900/5 p-4 overflow-auto min-h-[450px] flex items-center justify-center">
          {isPdf ? (
            <iframe
              src={documentUrl}
              title={fileName}
              className="w-full h-[550px] rounded-lg border border-slate-200 shadow-inner bg-white"
            />
          ) : isImage ? (
            <img
              src={documentUrl}
              alt={fileName}
              className="max-h-[550px] max-w-full object-contain rounded-lg shadow-md border border-slate-200"
            />
          ) : (
            <div className="text-center p-8 bg-white rounded-xl shadow border border-slate-200 max-w-md">
              <FileText className="w-12 h-12 text-sky-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700 mb-1">Preview not inline supported</p>
              <p className="text-xs text-slate-500 mb-4">Please download or open in a new tab to inspect the file.</p>
              <a
                href={documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700"
              >
                <Download className="w-4 h-4" /> Download File
              </a>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DocumentViewerModal;
