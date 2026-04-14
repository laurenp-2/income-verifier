import { useState, useCallback } from 'react';
import { verifyIncome } from './parseIncome';
import type { VerificationResult } from './types';
import './App.css';

const STATUS_META = {
  verified: {
    label: 'Verified',
    description: 'Income exceeds $150,000',
    className: 'result-verified',
  },
  not_verified: {
    label: 'Not Verified',
    description: 'Income is $150,000 or below',
    className: 'result-not-verified',
  },
  unable_to_determine: {
    label: 'Unable to Determine',
    description: 'No clearly labelled income field could be identified',
    className: 'result-unable',
  },
} as const;

export default function App() {
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setFileName(file.name);
    try {
      const res = await verifyIncome(file);
      setResult(res);
    } catch (e) {
      console.error(e);
      setError('Failed to parse the PDF. Please try a different file.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so the same file can be re-uploaded
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const meta = result ? STATUS_META[result.status] : null;

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="header-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 12h6M9 16h4" />
            </svg>
          </div>
          <div>
            <h1>Income Verifier</h1>
            <p className="header-sub">Upload a PDF income document to check eligibility against the $150,000 threshold</p>
          </div>
        </div>
      </header>

      <main className="main">
        {/* Upload zone */}
        <label
          className={['upload-zone', dragging ? 'dragging' : '', loading ? 'loading' : ''].filter(Boolean).join(' ')}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragging(false)}
          aria-label="Upload PDF"
        >
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={loading}
            className="visually-hidden"
          />
          <div className="upload-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          {loading ? (
            <p className="upload-primary">Analyzing document<span className="ellipsis" /></p>
          ) : (
            <>
              <p className="upload-primary">
                Drop a PDF here or <span className="upload-link">click to browse</span>
              </p>
              <p className="upload-secondary">Only PDF files are supported</p>
            </>
          )}
          {fileName && !loading && (
            <p className="upload-filename">{fileName}</p>
          )}
        </label>

        {/* Error */}
        {error && (
          <div className="error-card" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* Result */}
        {result && meta && (
          <div className={`result-card ${meta.className}`}>
            <div className="result-header">
              <span className="result-badge">{meta.label}</span>
              <p className="result-description">{meta.description}</p>
            </div>

            {result.value !== null && (
              <div className="result-row">
                <span className="result-row-label">Value used</span>
                <span className="result-row-value">
                  ${result.value.toLocaleString('en-US')}
                </span>
              </div>
            )}

            {result.label && (
              <div className="result-row">
                <span className="result-row-label">Source line</span>
                <span className="result-row-value result-row-mono">{result.label}</span>
              </div>
            )}

            {result.status === 'unable_to_determine' && (
              <p className="result-hint">
                The document did not contain a clearly labelled income field (e.g. Adjusted Gross Income, Net Income). Fields like revenue, gross receipts, or net profit are excluded from the determination.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
