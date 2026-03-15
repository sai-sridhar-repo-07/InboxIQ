import { useEffect, useState, useCallback } from 'react';
import { X, Download, Loader2, AlertTriangle, ZoomIn, ZoomOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

type Attachment = {
  attachment_id: string;
  message_id: string;
  filename: string;
  mime_type: string;
  size: number;
};

interface AttachmentViewerProps {
  attachment: Attachment;
  emailId: string;
  onClose: () => void;
}

function isViewable(mimeType: string): 'pdf' | 'image' | 'text' | null {
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('text/')) return 'text';
  return null;
}

export default function AttachmentViewer({ attachment, emailId, onClose }: AttachmentViewerProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);

  const viewType = isViewable(attachment.mime_type);

  const fetchBlob = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const url = `${base}/api/emails/${emailId}/attachments/${attachment.attachment_id}/download?filename=${encodeURIComponent(attachment.filename)}&mime_type=${encodeURIComponent(attachment.mime_type)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();

      if (viewType === 'text') {
        const text = await blob.text();
        setTextContent(text);
      } else {
        setObjectUrl(URL.createObjectURL(blob));
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [emailId, attachment, viewType]);

  useEffect(() => {
    if (viewType) {
      fetchBlob();
    } else {
      setLoading(false);
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  const handleDownload = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const url = `${base}/api/emails/${emailId}/attachments/${attachment.attachment_id}/download?filename=${encodeURIComponent(attachment.filename)}&mime_type=${encodeURIComponent(attachment.mime_type)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = attachment.filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error('Failed to download');
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900/95 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-900 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">{attachment.filename}</p>
          <p className="text-xs text-gray-400 mt-0.5">{attachment.mime_type}</p>
        </div>
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          {viewType === 'image' && (
            <>
              <button
                onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
                className="rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-xs text-gray-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                className="rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </>
          )}
          <button
            onClick={handleDownload}
            className="rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            title="Close (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 text-gray-400 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-400" />
            <p className="text-sm font-medium text-white">Failed to load file</p>
            <p className="text-xs text-gray-400">Try downloading it instead.</p>
            <button onClick={handleDownload} className="mt-2 btn-primary text-sm">
              <Download className="h-4 w-4 mr-1.5" />Download
            </button>
          </div>
        ) : viewType === 'pdf' && objectUrl ? (
          <iframe
            src={objectUrl}
            className="w-full h-full rounded-lg bg-white"
            style={{ minHeight: '80vh' }}
            title={attachment.filename}
          />
        ) : viewType === 'image' && objectUrl ? (
          <div className="overflow-auto max-w-full max-h-full">
            <img
              src={objectUrl}
              alt={attachment.filename}
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s' }}
              className="max-w-full rounded-lg shadow-2xl"
            />
          </div>
        ) : viewType === 'text' && textContent !== null ? (
          <pre className="max-w-4xl w-full bg-gray-800 text-gray-100 text-xs leading-relaxed p-6 rounded-xl overflow-auto max-h-full whitespace-pre-wrap break-words">
            {textContent}
          </pre>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-700">
              <Download className="h-8 w-8 text-gray-300" />
            </div>
            <div>
              <p className="text-white font-medium">Preview not available</p>
              <p className="text-sm text-gray-400 mt-1">This file type cannot be previewed in the browser.</p>
            </div>
            <button onClick={handleDownload} className="btn-primary text-sm">
              <Download className="h-4 w-4 mr-1.5" />Download to view
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
