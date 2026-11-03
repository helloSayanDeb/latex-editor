'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Terminal, 
  Copy, 
  Check, 
  ExternalLink, 
  Download, 
  Sparkles, 
  RefreshCw, 
  Laptop, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  HardDrive
} from 'lucide-react';

export type OperatingSystem = 'windows' | 'macos' | 'linux';

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLocalServerActive?: boolean;
}

export function SetupModal({ isOpen, onClose, isLocalServerActive = false }: SetupModalProps) {
  const [detectedOs, setDetectedOs] = useState<OperatingSystem>('windows');
  const [activeOs, setActiveOs] = useState<OperatingSystem>('windows');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const [probeFound, setProbeFound] = useState(isLocalServerActive);
  const [probeAttempted, setProbeAttempted] = useState(false);

  // Client-side detection of user's operating system
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = window.navigator.userAgent.toLowerCase();
    const platform = (window.navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform?.toLowerCase() || '';

    let os: OperatingSystem = 'windows';
    if (/mac|darwin/.test(ua) || /mac/.test(platform)) {
      os = 'macos';
    } else if (/linux|x11/.test(ua) || /linux/.test(platform)) {
      os = 'linux';
    } else {
      os = 'windows';
    }

    setDetectedOs(os);
    setActiveOs(os);
  }, []);

  // Sync internal probe status with prop if provided
  useEffect(() => {
    setProbeFound(isLocalServerActive);
  }, [isLocalServerActive]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Local loopback heartbeat check
  const checkLocalApp = async () => {
    setIsProbing(true);
    setProbeAttempted(true);

    const endpoints = [
      'http://127.0.0.1:2303/api/system',
      'http://localhost:2303/api/system'
    ];

    let found = false;
    for (const url of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        // Using no-cors mode allows detection even if cross-origin headers are strict
        await fetch(url, { mode: 'no-cors', signal: controller.signal });
        clearTimeout(timeoutId);
        found = true;
        break;
      } catch {
        // Failed or aborted probe
      }
    }

    setProbeFound(found);
    setIsProbing(false);
  };

  const copyToClipboard = (text: string, key: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const windowsOneLiner = 'irm https://raw.githubusercontent.com/helloSayanDeb/latex-editor/main/bootstrap.ps1 | iex';
  const macBootstrapOneLiner = 'curl -fsSL https://raw.githubusercontent.com/helloSayanDeb/latex-editor/main/bootstrap.sh | bash';
  const macGitOneLiner = 'git clone https://github.com/helloSayanDeb/latex-editor.git && cd latex-editor && ./Lemmata\\ Setup.command';
  const linuxDevOneLiner = 'git clone https://github.com/helloSayanDeb/latex-editor.git && cd latex-editor && npm install && npm run build && npm start';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="setup-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="setup-modal-title">
          <motion.div 
            className="setup-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          >
            {/* Header / Banner */}
            <div className="setup-modal-header">
              <div className="setup-modal-badge">
                <span className="setup-live-pulse" />
                <span>LOCAL-FIRST ARCHITECTURE</span>
              </div>
              <button 
                className="setup-modal-close" 
                onClick={onClose}
                aria-label="Close setup modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="setup-modal-hero">
              <h2 id="setup-modal-title">
                Lemmata is a <em>local engine</em>.
              </h2>
              <p>
                To preserve 100% data privacy and compile directly with your machine&apos;s installed TeX engines (pdfLaTeX, XeLaTeX, LuaLaTeX), Lemmata runs natively on your computer.
              </p>
            </div>

            {/* Local Server Live Status / Detection Banner */}
            <div className={`setup-status-card ${probeFound ? 'is-online' : 'is-standby'}`}>
              <div className="setup-status-info">
                <div className="setup-status-indicator">
                  {probeFound ? (
                    <CheckCircle2 size={18} className="text-emerald-400" />
                  ) : (
                    <Laptop size={18} />
                  )}
                </div>
                <div>
                  <div className="setup-status-title">
                    {probeFound ? 'Local Lemmata is Running!' : 'Local Server: Not Detected on port 2303'}
                  </div>
                  <div className="setup-status-sub">
                    {probeFound 
                      ? 'Connected to local loopback (http://localhost:2303). Ready to launch.' 
                      : 'Follow the steps below to start Lemmata on your machine.'}
                  </div>
                </div>
              </div>

              <div className="setup-status-action">
                {probeFound ? (
                  <a 
                    href="http://localhost:2303/lemmata" 
                    className="setup-launch-btn"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <span>Open Local Lemmata</span>
                    <ArrowRight size={14} />
                  </a>
                ) : (
                  <button 
                    className="setup-probe-btn" 
                    onClick={checkLocalApp} 
                    disabled={isProbing}
                  >
                    <RefreshCw size={13} className={isProbing ? 'spin-icon' : ''} />
                    <span>{isProbing ? 'Checking…' : probeAttempted ? 'Check Again' : 'Check Local (2303)'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* OS Selector Tabs */}
            <div className="setup-os-selector" role="tablist" aria-label="Target Operating System">
              <button 
                role="tab"
                aria-selected={activeOs === 'windows'}
                className={`setup-os-tab ${activeOs === 'windows' ? 'active' : ''}`}
                onClick={() => setActiveOs('windows')}
              >
                <span>Windows</span>
                {detectedOs === 'windows' && <span className="os-detected-badge">Detected</span>}
              </button>
              <button 
                role="tab"
                aria-selected={activeOs === 'macos'}
                className={`setup-os-tab ${activeOs === 'macos' ? 'active' : ''}`}
                onClick={() => setActiveOs('macos')}
              >
                <span>macOS</span>
                {detectedOs === 'macos' && <span className="os-detected-badge">Detected</span>}
              </button>
              <button 
                role="tab"
                aria-selected={activeOs === 'linux'}
                className={`setup-os-tab ${activeOs === 'linux' ? 'active' : ''}`}
                onClick={() => setActiveOs('linux')}
              >
                <span>Linux / Git</span>
                {detectedOs === 'linux' && <span className="os-detected-badge">Detected</span>}
              </button>
            </div>

            {/* Step-by-Step Instructions Based on Active OS */}
            <div className="setup-instructions-body">
              {activeOs === 'windows' && (
                <div className="setup-panel-os">
                  <div className="setup-step-item">
                    <div className="setup-step-num">01</div>
                    <div className="setup-step-content">
                      <h4>One-Line Terminal Install (Recommended)</h4>
                      <p>Open <strong>PowerShell</strong> and paste this single command. It downloads Lemmata, opens guided setup, and launches your browser:</p>
                      <div className="terminal-snippet-box">
                        <Terminal size={14} className="terminal-icon" />
                        <code>{windowsOneLiner}</code>
                        <button 
                          className="snippet-copy-btn"
                          onClick={() => copyToClipboard(windowsOneLiner, 'win-one-liner')}
                          aria-label="Copy Windows bootstrap command"
                        >
                          {copiedKey === 'win-one-liner' ? <Check size={14} /> : <Copy size={14} />}
                          <span>{copiedKey === 'win-one-liner' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="setup-step-item">
                    <div className="setup-step-num">02</div>
                    <div className="setup-step-content">
                      <h4>Alternative: Download ZIP Archive</h4>
                      <p>
                        Download the release package, extract it to any folder, and double-click <code>Lemmata Setup.cmd</code>. No Node.js or manual build required.
                      </p>
                      <div className="setup-action-row">
                        <a 
                          href="https://github.com/helloSayanDeb/latex-editor/archive/refs/heads/main.zip" 
                          className="setup-secondary-action"
                          download
                        >
                          <Download size={14} />
                          <span>Download ZIP Archive</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeOs === 'macos' && (
                <div className="setup-panel-os">
                  <div className="setup-step-item">
                    <div className="setup-step-num">01</div>
                    <div className="setup-step-content">
                      <h4>One-Line Terminal Install (Recommended)</h4>
                      <p>Open <strong>Terminal</strong> and run this bootstrap command to download and set up Lemmata in your Applications folder:</p>
                      <div className="terminal-snippet-box">
                        <Terminal size={14} className="terminal-icon" />
                        <code>{macBootstrapOneLiner}</code>
                        <button 
                          className="snippet-copy-btn"
                          onClick={() => copyToClipboard(macBootstrapOneLiner, 'mac-bootstrap')}
                          aria-label="Copy Mac bootstrap command"
                        >
                          {copiedKey === 'mac-bootstrap' ? <Check size={14} /> : <Copy size={14} />}
                          <span>{copiedKey === 'mac-bootstrap' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="setup-step-item">
                    <div className="setup-step-num">02</div>
                    <div className="setup-step-content">
                      <h4>Alternative: Clone Repository</h4>
                      <p>If you prefer Git or a custom working directory:</p>
                      <div className="terminal-snippet-box">
                        <Terminal size={14} className="terminal-icon" />
                        <code>{macGitOneLiner}</code>
                        <button 
                          className="snippet-copy-btn"
                          onClick={() => copyToClipboard(macGitOneLiner, 'mac-one-liner')}
                          aria-label="Copy Mac git command"
                        >
                          {copiedKey === 'mac-one-liner' ? <Check size={14} /> : <Copy size={14} />}
                          <span>{copiedKey === 'mac-one-liner' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="setup-step-item">
                    <div className="setup-step-num">03</div>
                    <div className="setup-step-content">
                      <h4>Or Download &amp; Run</h4>
                      <p>
                        Download the ZIP archive, extract it, and double-click <code>Lemmata Setup.command</code>. (If macOS warns about unidentified developer, Control-click &rarr; Open).
                      </p>
                      <div className="setup-action-row">
                        <a 
                          href="https://github.com/helloSayanDeb/latex-editor/archive/refs/heads/main.zip" 
                          className="setup-secondary-action"
                          download
                        >
                          <Download size={14} />
                          <span>Download Mac Bundle (.zip)</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeOs === 'linux' && (
                <div className="setup-panel-os">
                  <div className="setup-step-item">
                    <div className="setup-step-num">01</div>
                    <div className="setup-step-content">
                      <h4>Git Clone &amp; Node.js Setup</h4>
                      <p>Clone the repository and launch Lemmata in 4 fast commands (Node.js 22+ recommended):</p>
                      <div className="terminal-snippet-box">
                        <Terminal size={14} className="terminal-icon" />
                        <code>{linuxDevOneLiner}</code>
                        <button 
                          className="snippet-copy-btn"
                          onClick={() => copyToClipboard(linuxDevOneLiner, 'linux-one-liner')}
                          aria-label="Copy Linux command"
                        >
                          {copiedKey === 'linux-one-liner' ? <Check size={14} /> : <Copy size={14} />}
                          <span>{copiedKey === 'linux-one-liner' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Features / Guarantee */}
            <div className="setup-modal-footer">
              <div className="setup-guarantee-pills">
                <span><ShieldCheck size={12} /> Zero telemetry</span>
                <span><HardDrive size={12} /> Local files only</span>
                <span><Sparkles size={12} /> Optional private AI</span>
              </div>
              <a 
                href="https://github.com/helloSayanDeb/latex-editor" 
                target="_blank" 
                rel="noopener noreferrer"
                className="setup-github-link"
              >
                <span>View Source on GitHub</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
