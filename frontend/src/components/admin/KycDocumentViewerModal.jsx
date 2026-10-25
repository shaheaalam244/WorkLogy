import React, { useState } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileText,
  FileCheck,
  Maximize2,
  Check,
  AlertCircle,
  Clock
} from 'lucide-react';
import { resolveDocumentUrl } from '../../utils/formatters';

export default function KycDocumentViewerModal({
  isOpen,
  onClose,
  document: doc,
  vendorId,
  onApprove,
  onReject,
  onRequestChanges
}) {
  if (!isOpen || !doc) return null;

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  const rawUrl = doc.url || '';
  const resolvedUrl = resolveDocumentUrl(rawUrl);
  const isPdf = rawUrl.toLowerCase().includes('.pdf') || doc.docType?.toLowerCase()?.includes('pdf');
  const isImage = !isPdf && (rawUrl.match(/\.(jpeg|jpg|png|webp|gif)($|\?)/i) || rawUrl.includes('cloudinary') || rawUrl.startsWith('data:image/'));

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const status = doc.status || 'pending';

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-60 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-5xl w-full flex flex-col max-h-[92vh] shadow-2xl overflow-hidden border border-slate-200">
        {/* Top Header Bar */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/40 text-purple-300 flex items-center justify-center shrink-0">
              {isPdf ? <FileText className="w-5 h-5 text-purple-300" /> : <FileCheck className="w-5 h-5 text-purple-300" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black truncate max-w-md text-white">
                  {doc.name || 'Verification Document'}
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-purple-300 border border-purple-500/30">
                  {doc.docType || 'Identity Document'}
                </span>
                {status === 'approved' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <CheckCircle2 className="w-3 h-3" /> Approved
                  </span>
                )}
                {status === 'rejected' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    <X className="w-3 h-3" /> Rejected
                  </span>
                )}
                {status === 'changes_required' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <AlertTriangle className="w-3 h-3" /> Changes Required
                  </span>
                )}
                {status === 'pending' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    <Clock className="w-3 h-3" /> Pending Review
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {doc.uploadedAt ? `Uploaded on ${new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Uploaded Document'}
                {doc.maskedId ? ` · ID: ${doc.maskedId}` : ''}
              </p>
            </div>
          </div>

          {/* Action buttons on header */}
          <div className="flex items-center gap-1.5 shrink-0">
            {resolvedUrl && (
              <a
                href={resolvedUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in new window"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            {resolvedUrl && (
              <a
                href={resolvedUrl}
                download={doc.name || 'document'}
                title="Download Document"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                <Download className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport Toolbar (Only for images) */}
        {isImage && (
          <div className="px-5 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold text-slate-700 text-[11px]">
              Zoom: {Math.round(zoom * 100)}% {rotation !== 0 && `· Rotation: ${rotation}°`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                title="Zoom Out"
                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-40"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleReset}
                title="Reset View"
                className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 font-bold text-[11px] text-slate-700"
              >
                100%
              </button>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                title="Zoom In"
                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-40"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-slate-300 mx-1" />
              <button
                onClick={handleRotate}
                title="Rotate 90 Degrees"
                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Rejection / Changes Banner if applicable */}
        {doc.rejectionReason && (
          <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong className="font-bold">Reviewer Note:</strong> {doc.rejectionReason}
            </span>
          </div>
        )}

        {/* Main Document Display Canvas */}
        <div className="flex-1 bg-slate-900/95 overflow-auto relative flex items-center justify-center p-4 min-h-[380px] max-h-[64vh]">
          {loadError ? (
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md text-center text-white">
              <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <h4 className="text-sm font-bold">Document Preview Unavailable</h4>
              <p className="text-xs text-slate-400 mt-1">
                The file could not be rendered directly in this preview viewport. You may inspect or download it directly using the button below.
              </p>
              {resolvedUrl && (
                <div className="mt-4 flex justify-center gap-2">
                  <a
                    href={resolvedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open External Document</span>
                  </a>
                </div>
              )}
            </div>
          ) : isPdf ? (
            <div className="w-full h-full min-h-[500px] bg-slate-800 rounded-xl overflow-hidden flex flex-col">
              <object
                data={resolvedUrl}
                type="application/pdf"
                className="w-full h-[520px]"
                onLoad={() => setLoading(false)}
                onError={() => setLoadError(true)}
              >
                <div className="p-8 text-center text-white flex flex-col items-center justify-center h-full">
                  <FileText className="w-14 h-14 text-purple-400 mb-3" />
                  <h4 className="text-sm font-bold">PDF Document Ready</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    This PDF file can be inspected directly in your browser or downloaded.
                  </p>
                  <a
                    href={resolvedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open PDF Document</span>
                  </a>
                </div>
              </object>
            </div>
          ) : (
            <div className="relative flex items-center justify-center w-full h-full overflow-hidden">
              <img
                src={resolvedUrl}
                alt={doc.name || 'Verification Document'}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s ease-out'
                }}
                className="max-h-[56vh] max-w-full object-contain rounded-lg shadow-lg select-none"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setLoadError(true);
                }}
              />
            </div>
          )}
        </div>

        {/* Bottom Review Action Bar */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">
              Compliance Document Actions:
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onApprove && status !== 'approved' && (
              <button
                type="button"
                onClick={() => onApprove(doc)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-2xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve Document</span>
              </button>
            )}

            {onRequestChanges && status !== 'changes_required' && (
              <button
                type="button"
                onClick={() => onRequestChanges(doc)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-2xs"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Request Changes</span>
              </button>
            )}

            {onReject && status !== 'rejected' && (
              <button
                type="button"
                onClick={() => onReject(doc)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-2xs"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reject Document</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition ml-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
