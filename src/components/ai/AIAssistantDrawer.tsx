'use client';
import { readPreference } from '@/lib/preferences';

import React, { useState, useEffect, useRef } from 'react';
import { Dropdown } from '@/components/Dropdown';
import { Checkbox } from '@/components/Checkbox';
import { resolveAIConfig } from '@/lib/ai-config';
import { parseFocusedEdit, minimalAIEdit, validEditTarget, type AIEditTarget } from '@/lib/ai-conversation';
import { PromptCarousel } from './PromptCarousel';
import { ChatMarkdown } from './ChatMarkdown';
import { PaperReviewPanel } from './PaperReviewPanel';
import { cloudVisionSupport, prepareReferenceImage, type AIImage, type AIModel } from '@/lib/ai-images';
import { Mascot } from '../Mascot';
import { sharedSource, conversationScope, type SourceSharing } from '@/lib/ai-privacy';
import {
  Sparkles,
  Send,
  X,
  Settings,
  Key,
  Bot,
  Copy,
  Check,
  FileText,
  AlertCircle,
  HelpCircle,
  ImagePlus,
  Trash2,
  ChevronDown,
  SlidersHorizontal,
  BookOpen,
  ArrowLeft,
} from 'lucide-react';
import {
  AIConfig,
  isAcademicPrompt,
  sendAIPrompt,
  encryptApiKey,
  decryptApiKey,
} from '@/lib/ai-providers';

type ProviderProfile = { apiKey?: string; encryptedKey?: string; baseUrl?: string; modelName?: string };
const defaultModel = (provider: AIConfig['provider']) => provider === 'gemini' ? 'gemini-3.8-flash' : provider === 'openai' ? 'gpt-4o-mini' : '';
const providerOptions = [
  { value: 'gemini', label: 'Google Gemini', detail: 'Google AI Studio · cloud' },
  { value: 'openai', label: 'OpenAI', detail: 'API key · cloud or compatible endpoint' },
  { value: 'lmstudio', label: 'LM Studio', detail: 'Models on this computer · no key needed' },
  { value: 'ollama', label: 'Ollama', detail: 'Models on this computer · no key needed' },
];

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  isAcademic: boolean;
  contextSnippet?: string;
  timestamp: string;
  editTarget?: AIEditTarget;
  error?: boolean;
  image?: AIImage;
}

interface AIAssistantDrawerProps {
  projectId: string;
  cursorLine: number;
  diagnostics: string;
  diagnosticsStale: boolean;
  verifyCandidate: (target: AIEditTarget, code: string) => Promise<{ ok: boolean; message: string }>;
  applySavedEdit: (file: string, search: string, replace: string) => void;
  isOpen: boolean;
  docked?: boolean;
  onClose: () => void;
  selectedText: string;
  activeFile: string;
  getEditTarget: (finalizePending?: boolean) => AIEditTarget | null;
  onRequestDiff: (target: AIEditTarget, suggestedText: string) => void;
  projectFiles: Record<string,string>;
  onJumpToSource: (file: string, line: number) => void;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  docked = false,
  onClose,
  selectedText,
  projectFiles,
  onJumpToSource,
  activeFile,
  onRequestDiff,
  getEditTarget,
  projectId,
  cursorLine,
  diagnostics,
  diagnosticsStale,
  verifyCandidate,
  applySavedEdit,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      content:
        'Ask about LaTeX, brainstorm ideas or attach a reference image. Use Edit source for focused changes. Choose what to share in settings.',
      isAcademic: true,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<AIImage | null>(null);
  const [imagePreparing, setImagePreparing] = useState(false);
  const [imageError, setImageError] = useState('');
  const imageInput = useRef<HTMLInputElement>(null);
  const composerInput = useRef<HTMLTextAreaElement>(null);
  const imageEpoch = useRef(0);
  const [editSource, setEditSource] = useState(false);
  const [includeDiagnostics, setIncludeDiagnostics] = useState(false);
  const [verification, setVerification] = useState('');
  const [savedProposal, setSavedProposal] = useState<{ target: AIEditTarget; code: string } | null>(null);
  async function saveProposal() {
    if (!savedProposal) return;
    try {
      const minimal = minimalAIEdit(savedProposal.target, savedProposal.code), search = minimal.target.document.slice(minimal.target.from, minimal.target.to);
      if (!search || search.length > 12000 || minimal.code.length > 12000) throw new Error('Save a smaller focused change. Insertion-only proposals stay in the inline editor.');
      const url = '/api/projects/' + projectId + '/reviews'; const state = await (await fetch(url)).json();
      const line = minimal.target.document.slice(0,minimal.target.from).split('\n').length;
      const quote = minimal.target.document.split('\n')[line - 1].slice(0,1000);
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', revision: state.revision, note: { file: minimal.target.file, line, quote, message: 'Source change proposed by Lemmata Assist. Recheck against current source before applying.', origin: 'ai', edit: { search, replace: minimal.code } } }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setVerification('Proposal saved in Paper review → Persistent notes.'); setSavedProposal(null);
    } catch (problem) { setVerification((problem as Error).message); }
  }
  const [sourceSharing, setSourceSharing] = useState<SourceSharing>('none');
  const [includeHistory, setIncludeHistory] = useState(true);
  const [showSourcePreview, setShowSourcePreview] = useState(false);

  const conversations = useRef<Record<string, Message[]>>({});
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  const scopeRef = useRef('');
  const requestEpoch = useRef(0);
  const [showSettings, setShowSettings] = useState(false);
  useEffect(() => {
    const input = composerInput.current; if (!input) return;
    const resize = () => { input.style.height = 'auto'; const height = Math.max(44,Math.min(132,input.scrollHeight)); input.style.height = height + 'px'; input.style.overflowY = input.scrollHeight > 132 ? 'auto' : 'hidden'; };
    const frame = requestAnimationFrame(resize);
    let width = input.clientWidth;
    const observer = new ResizeObserver(entries => { const next = entries[0]?.contentRect.width; if (next !== width) { width = next; resize(); } });
    observer.observe(input);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [prompt, isOpen, showSettings]);

  const [reviewStarted, setReviewStarted] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const conversationEnd = useRef<HTMLDivElement>(null);
  useEffect(() => { if (isOpen) conversationEnd.current?.scrollIntoView({ block: 'nearest' }); }, [messages, loading, isOpen]);

  // Provider configuration
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'ollama' | 'lmstudio'>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [encryptedKey, setEncryptedKey] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsToast, setSettingsToast] = useState<{ id: number; text: string } | null>(null);
  useEffect(() => {
    if (!settingsToast) return;
    const timer = setTimeout(() => setSettingsToast(null), 3000);
    return () => clearTimeout(timer);
  }, [settingsToast]);
  const [masterPass, setMasterPass] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [modelName, setModelName] = useState('gemini-3.8-flash');
  const profiles = useRef<Partial<Record<AIConfig['provider'], ProviderProfile>>>({});
  const isLocal = provider === 'lmstudio' || provider === 'ollama';
  const [models, setModels] = useState<string[]>([]);
  const [modelDetails, setModelDetails] = useState<AIModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const [refreshModels, setRefreshModels] = useState(0);
  const vision = isLocal ? modelDetails.find(model => model.id === modelName)?.vision || 'unknown' : cloudVisionSupport(provider, modelName, baseUrl);
  const imageAllowed = vision === 'vision' && !modelsLoading;
  const imageHint = imageAllowed ? 'Attach reference image · PNG, JPEG or WebP, up to 8 MB' : vision === 'text' ? 'This model accepts text only. Select a vision model to attach an image.' : 'Image support is unverified. Select a model with verified vision support.';
  const scope = conversationScope(provider, baseUrl);
  useEffect(() => {
    if (scopeRef.current === scope) return;
    if (scopeRef.current) conversations.current[scopeRef.current] = messagesRef.current;
    scopeRef.current = scope;
    requestEpoch.current++;
    setLoading(false); setPrompt(''); setEditSource(false); setSourceSharing('none'); setShowSourcePreview(false);
    setMessages(conversations.current[scope] || [{ id: 'welcome', sender: 'assistant', content: 'Lemmata Assist helps with LaTeX and reference images. Control source sharing in Assistant settings. I cannot inspect your computer or other projects.', isAcademic: true, timestamp: new Date().toLocaleTimeString() }]);
  }, [scope]);
  useEffect(() => { imageEpoch.current++; setImage(null); setImageError(''); setImagePreparing(false); }, [provider, modelName, baseUrl]);

  const attachImage = async (file?: File) => {
    if (!file || !imageAllowed || loading) return;
    const epoch = ++imageEpoch.current;
    setImagePreparing(true); setImageError('');
    try {
      const prepared = await prepareReferenceImage(file);
      if (epoch === imageEpoch.current) setImage(prepared);
    } catch (error) { if (epoch === imageEpoch.current) setImageError((error as Error).message); }
    finally { if (epoch === imageEpoch.current) setImagePreparing(false); }
  };

  const pasteImage = (event: React.ClipboardEvent<HTMLElement>) => {
    if (showSettings) return;
    const files = Array.from(event.clipboardData.items).filter(item => item.kind === 'file').map(item => item.getAsFile()).filter((file): file is File => Boolean(file));
    if (!files.length) return; // Leave ordinary text paste to the focused field.
    event.preventDefault();
    if (files.length !== 1 || !files[0].type.startsWith('image/')) { setImageError('Paste one PNG, JPEG or WebP image. Other attachments are not supported.'); return; }
    if (!imageAllowed) { setImageError(imageHint); return; }
    if (loading || imagePreparing) { setImageError('Wait for the current request or image preparation to finish.'); return; }
    void attachImage(files[0]);
  };

  // Load config on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      profiles.current = JSON.parse(readPreference('lemmata_ai_profiles') || '{}');
      // Remove any plaintext keys saved by an older build; keep them only in this tab.
      localStorage.setItem('lemmata_ai_profiles', JSON.stringify(Object.fromEntries(Object.entries(profiles.current).map(([name, profile]) => [name, { encryptedKey: profile.encryptedKey || '', baseUrl: profile.baseUrl || '', modelName: profile.modelName || '' }]))));
      const savedConfig = readPreference('lemmata_ai_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        const savedProvider: AIConfig['provider'] = providerOptions.some(option => option.value === parsed.provider) ? parsed.provider : 'gemini';
        setProvider(savedProvider);
        const local = savedProvider === 'lmstudio' || savedProvider === 'ollama';
        if (!local && parsed.encryptedKey) setEncryptedKey(parsed.encryptedKey);
        if (!local && parsed.apiKey) {
          setApiKey(parsed.apiKey);
          delete parsed.apiKey;
          localStorage.setItem('lemmata_ai_config', JSON.stringify(parsed));
          setSettingsMessage('Your previously stored key is now session-only. Set a master password to save it encrypted.');
        }
        if (parsed.baseUrl) setBaseUrl(parsed.baseUrl);
        const savedModel = parsed.modelName === 'gemini-1.5-flash' && savedProvider === 'gemini' ? defaultModel('gemini') : parsed.modelName || defaultModel(savedProvider);
        setModelName(savedModel);
        profiles.current[savedProvider] = { ...parsed, modelName: savedModel };
      }
    } catch {}
  }, []);

  const changeProvider = (value: string) => {
    const next = value as AIConfig['provider'];
    profiles.current[provider] = { apiKey, encryptedKey, baseUrl, modelName };
    const profile = profiles.current[next] || {};
    const local = next === 'lmstudio' || next === 'ollama';
    setProvider(next); setMasterPass(''); setSettingsMessage('');
    setApiKey(local ? '' : profile.apiKey || '');
    setEncryptedKey(local ? '' : profile.encryptedKey || '');
    setBaseUrl(profile.baseUrl || ''); setModelName(next === 'gemini' && profile.modelName === 'gemini-1.5-flash' ? defaultModel(next) : profile.modelName || defaultModel(next));
    setModels([]); setModelsError('');
  };

  useEffect(() => {
    if (!isOpen || !isLocal) return;
    const controller = new AbortController();
    setModelsLoading(true); setModelsError(''); setModels([]);
    const timer = setTimeout(async () => {
      try {
        const query = new URLSearchParams({ provider, ...(baseUrl ? { baseUrl } : {}) });
        const response = await fetch(`/api/ai/local?${query}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not detect models.');
        if (controller.signal.aborted) return;
        setModels(data.models);
        setModelDetails(data.modelDetails || []);
        setModelName(current => data.models.includes(current) ? current : data.models[0] || '');
        if (!data.models.length) setModelsError('Server connected, but no chat models are available. Load a model and refresh.');
      } catch (error) { if (!controller.signal.aborted) setModelsError((error as Error).message); }
      finally { if (!controller.signal.aborted) setModelsLoading(false); }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [isOpen, isLocal, provider, baseUrl, refreshModels]);

  const saveSettings = async () => {
    try {
      let cipher = encryptedKey;
      if (isLocal) cipher = '';
      else if (apiKey) cipher = masterPass ? await encryptApiKey(apiKey, masterPass) : '';
      else if (cipher && masterPass && !cipher.startsWith('v3:')) cipher = await encryptApiKey(await decryptApiKey(cipher, masterPass), masterPass);
      localStorage.setItem('lemmata_ai_config', JSON.stringify({ provider, encryptedKey: cipher, baseUrl, modelName }));
      profiles.current[provider] = { apiKey: isLocal ? '' : apiKey, encryptedKey: cipher, baseUrl, modelName };
      localStorage.setItem('lemmata_ai_profiles', JSON.stringify(Object.fromEntries(Object.entries(profiles.current).map(([name, profile]) => [name, { encryptedKey: profile.encryptedKey || '', baseUrl: profile.baseUrl || '', modelName: profile.modelName || '' }]))));
      setEncryptedKey(cipher);
      setSettingsMessage(apiKey && !masterPass ? 'Key kept only in this tab. Add a master password to save it encrypted.' : '');
      setSettingsToast({ id: Date.now(), text: 'Settings saved' });
      if (isLocal || !apiKey || masterPass) setShowSettings(false);
    } catch (err) { setSettingsMessage((err as Error).message); }
  };

  const requestTarget = (finalizePending = false) => {
    const current = sourceSharing === 'none' ? null : getEditTarget(finalizePending);
    const previous = messages.findLast(message => message.sender === 'assistant' && !message.error && message.editTarget)?.editTarget;
    const target = sourceSharing === 'selection' && !selectedText && current && previous && validEditTarget(previous, current.project, current.file, current.document) ? previous : current;
    return sourceSharing === 'document' && target ? { ...target, from: 0, to: target.document.length } : target;
  };

  const handleSend = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || loading || imagePreparing || (image && !imageAllowed)) return;
    if (isLocal && (modelsLoading || !models.includes(modelName))) {
      setSettingsMessage(modelsError || 'Select an available local model before sending.');
      setShowSettings(true);
      return;
    }

    if (editSource && sourceSharing === 'none') {
      setSettingsMessage('Choose Selection or Active document to request an inline edit. No source is shared in Ask mode.');
      return;
    }
    const target = requestTarget(editSource);
    const shared = sharedSource(sourceSharing, selectedText, target);
    if (sourceSharing !== 'none' && !shared) {
      setSettingsMessage(sourceSharing === 'selection' ? 'Select source text first, or choose No source / Active document.' : 'The active document is empty or unavailable. Choose No source to generate new code.');
      return;
    }
    if (editSource && !target) {
      setSettingsMessage('Source is unavailable. Select the source file before requesting an edit.');
      return;
    }
    if (editSource && includeDiagnostics && (diagnosticsStale || !diagnostics)) { setSettingsMessage('Compile the current source first to obtain current errors, or turn off diagnostic sharing.'); return; }
    const requestSelection = shared;
    const requestFile = target?.file || activeFile;
    const requestImage = image;
    const academic = isAcademicPrompt(trimmed) || Boolean(requestSelection || requestImage) || messages.some(message => message.id !== "welcome" && message.isAcademic);
    // Historical raw attachments are not reattached. Prior answers can still contain source text.
    const history = includeHistory ? messages.filter(message => message.id !== 'welcome' && !message.error).map(message => ({ role: message.sender, content: message.content })) : [];
    const epoch = ++requestEpoch.current;
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: trimmed,
      isAcademic: academic,
      contextSnippet: requestSelection || undefined,
      editTarget: target || undefined,
      timestamp: new Date().toLocaleTimeString(),
      image: requestImage || undefined,
    };

    setMessages(prev => [...prev, userMsg]);
    setPrompt('');
    setImage(null);
    setLoading(true);

    try {
      const config = await resolveAIConfig(provider, { apiKey, encryptedKey, masterPass, baseUrl, modelName }, decryptApiKey);

      const responseText = await sendAIPrompt(config, trimmed, {
        selectedText: sourceSharing === 'selection' ? requestSelection : undefined,
        fullDocument: sourceSharing === 'document' ? requestSelection : undefined,
        activeFile: sourceSharing === 'none' ? undefined : requestFile,
        mode: editSource ? 'edit' : 'ask',
        compilerErrors: editSource && includeDiagnostics ? diagnostics : undefined,
      }, history, requestImage ? [requestImage] : []);
      if (epoch !== requestEpoch.current) return;

      const proposal = editSource && target ? parseFocusedEdit(responseText, target) : null;
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        content: proposal ? proposal.summary : responseText,
        isAcademic: academic,
        contextSnippet: requestSelection || undefined,
        editTarget: editSource ? target || undefined : undefined,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages(prev => [...prev, assistantMsg]);
      if (proposal && target && proposal.code !== target.document.slice(target.from, target.to)) {
        setSavedProposal({ target, code: proposal.code });
        onRequestDiff(target, proposal.code);
        if (includeDiagnostics) {
          setVerification('Testing the candidate with your selected engine…');
          try { const result = await verifyCandidate(target, proposal.code); if (epoch === requestEpoch.current) setVerification(result.message); }
          catch (problem) { if (epoch === requestEpoch.current) setVerification((problem as Error).message); }
          if (epoch === requestEpoch.current) setIncludeDiagnostics(false);
        }
        if (!docked) onClose();
      }
    } catch (err) {
      if (epoch !== requestEpoch.current) return;
      const errMsg: Message = {
        error: true,
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        content: `⚠️ Error: ${(err as Error).message}\n\n${isLocal ? 'Check the local server address and selected model in Settings.' : 'Check your API key and model in Settings.'}`,
        isAcademic: false,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      if (epoch === requestEpoch.current) setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <section id="lemmata-assist-panel" className="assist-panel" aria-label="Lemmata Assist" onPaste={pasteImage} onKeyDown={event => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if ((event.target as HTMLElement).closest('.custom-select')?.querySelector('[aria-expanded="true"]')) return;
      if (showSettings) { event.preventDefault(); setShowSettings(false); return; }
      event.preventDefault(); onClose();
    }}>
      {settingsToast && <div className="assist-settings-toast" role="status"><Check size={14} />{settingsToast.text}</div>}
      {/* Header */}
      <div className="assistant-header flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-500 flex items-center justify-center shadow-lg">
            <Mascot size={36} />
          </div>
          <div className="assistant-brand-copy">
            <span className="text-sm font-bold text-white">Lemmata Assist</span>
            <div className="assistant-provider-line"><span className="badge-emerald">{provider}</span><span>Writing & LaTeX</span></div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {showSettings ? <button type="button" className="btn-secondary assistant-back-button" onClick={() => setShowSettings(false)}><ArrowLeft size={14}/>Back to chat</button> : <>
          <button type="button" className="btn-icon" title="Paper review" aria-label="Open paper review" onClick={()=>{setReviewStarted(true);setReviewOpen(true);}}><BookOpen size={16}/></button>
          <button type="button" className="btn-icon" title="Clear this provider's conversation" aria-label="Clear conversation" onClick={() => { requestEpoch.current++; imageEpoch.current++; setMessages(messages.filter(message => message.id === 'welcome')); setImage(null); setPrompt(''); setLoading(false); setImagePreparing(false); }}><Trash2 size={15} /></button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            aria-label="Assistant settings"
            aria-expanded={showSettings}
            className="btn-icon"
            title="Configure AI Providers & Keys"
          >
            <Settings size={16} />
          </button>
          <button onClick={onClose} className="btn-icon hover:text-rose-400" title="Close Drawer">
            <X size={18} />
          </button>
          </>}
        </div>
      </div>

      {/* Settings Modal / Overlay inside drawer */}
      {showSettings ? (
        <div className="assist-settings flex-1 overflow-y-auto p-4 flex flex-col gap-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="font-bold text-sm text-white">Assistant settings</span>

          </div>

          <div id="assist-sharing-options" className="assist-context-controls">
            <Dropdown label="Source context" value={sourceSharing} options={[{ value: 'none', label: 'No source', detail: 'Only your message and enabled recent chat' }, { value: 'selection', label: 'Selection', detail: 'Selected text or the last valid edit range' }, { value: 'document', label: 'Active document', detail: 'Share the active file; never other project files' }]} onChange={value => { setSourceSharing(value as SourceSharing); if (value === 'none') setEditSource(false); setShowSourcePreview(false); setSettingsMessage(''); }} />
            <Checkbox checked={includeHistory} onChange={setIncludeHistory}>Include recent chat</Checkbox>
            <small>Recent replies may contain previously shared source. Images are not resent.</small>
            {sourceSharing !== 'none' && <button type="button" className="assist-source-preview-toggle" onClick={() => setShowSourcePreview(value => !value)} aria-expanded={showSourcePreview}>{showSourcePreview ? 'Hide' : 'Preview'} source to share</button>}
            {showSourcePreview && <pre className="assist-source-preview">{sharedSource(sourceSharing, selectedText, requestTarget()) || 'No source selected.'}</pre>}
          </div>
          {(diagnostics || includeDiagnostics) && <details className="repair-controls"><summary>Compiler repair pipeline</summary><p>Approve the displayed errors and source, then send an Edit request. The proposed candidate is test-compiled without replacing your PDF.</p><pre>{diagnostics || 'No current compiler errors.'}</pre><Checkbox checked={includeDiagnostics} onChange={setIncludeDiagnostics}>Include these compiler errors</Checkbox><button className="btn-secondary" disabled={!diagnostics || diagnosticsStale || loading} onClick={() => { setEditSource(true); setSourceSharing('document');  setIncludeDiagnostics(true); setShowSettings(false); setPrompt('Fix the approved compiler errors with focused changes only. Preserve unrelated source.'); }}>Prepare focused repair</button>{diagnosticsStale && <p>Source changed. Recompile before using these errors.</p>}</details>}
          <Dropdown label="Provider" value={provider} options={providerOptions} onChange={changeProvider} />

          {(provider === 'gemini' || provider === 'openai') && (
            <label className="flex flex-col gap-1">
              <span className="text-slate-300 font-semibold">API Key</span>
              <input
                type="password"
                placeholder="Enter API Key..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="input-dark"
              />
            </label>
          )}

          {(provider === 'ollama' || provider === 'lmstudio' || provider === 'openai') && (
            <label className="flex flex-col gap-1">
              <span className="text-slate-300 font-semibold">Base URL / Endpoint</span>
              <input
                type="text"
                placeholder={
                  provider === 'ollama'
                    ? 'http://localhost:11434'
                    : provider === 'lmstudio'
                    ? 'http://localhost:1234/v1'
                    : 'https://api.openai.com/v1'
                }
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                className="input-dark font-mono text-[11px]"
              />
            </label>
          )}

          {isLocal ? <div className="local-model-settings">
            <Dropdown label="Local model" value={modelName} options={models.map(model => { const detail = modelDetails.find(item => item.id === model); return { value: model, label: detail?.label || model, capability: detail?.vision || 'unknown', detail: `${model} · ${detail?.loaded ? 'Loaded' : 'Available on this computer'}` }; })} onChange={setModelName} disabled={modelsLoading || !models.length} placeholder={modelsLoading ? 'Detecting models…' : 'No models detected'} />
            <div className="local-model-status"><span role="status">{modelsLoading ? 'Connecting to your local server…' : modelsError || `${models.length} chat ${models.length === 1 ? 'model' : 'models'} detected`}</span><button type="button" className="btn-secondary" onClick={() => setRefreshModels(value => value + 1)} disabled={modelsLoading}>Refresh</button></div>
          </div> : <label className="flex flex-col gap-1">
            <span className="text-slate-300 font-semibold">Model Name</span>
            <input
              type="text"
              placeholder={provider === 'gemini' ? 'gemini-3.8-flash' : 'model-id'}
              value={modelName}
              onChange={e => setModelName(e.target.value)}
              className="input-dark font-mono text-[11px]"
            />
          </label>}

          {!isLocal && <label className="flex flex-col gap-1"><span className="text-slate-300 font-semibold">Master password</span><input type="password" autoComplete="off" className="input-dark" value={masterPass} onChange={e => setMasterPass(e.target.value)} placeholder={encryptedKey ? 'Unlock your saved API key' : 'Optional: encrypt your saved API key'} /><span className="text-slate-400">Never stored. Without a password, new keys stay only in this tab.</span></label>}
          {settingsMessage && <p role="status">{settingsMessage}</p>}
          <button onClick={saveSettings} disabled={isLocal && (modelsLoading || !models.includes(modelName))} className="btn-primary mt-3 justify-center">
            Save Provider Configuration
          </button>
        </div>
      ) : (
        <>
          {/* Messages list */}
          <div role="log" aria-label="Assistant conversation" tabIndex={0} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col gap-1.5 ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                {/* Context badge if present */}
                {msg.contextSnippet && msg.sender === 'user' && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-[10px] text-indigo-300">
                    <FileText size={11} />
                    <span>Included {msg.contextSnippet.split('\n').length} selected lines</span>
                  </div>
                )}

                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[92%] select-text ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-sm shadow-md'
                      : 'glass-card text-slate-200 rounded-bl-sm'
                  }`}
                  style={{
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.image && <img className="assist-message-image" src={`data:image/png;base64,${msg.image.data}`} alt="Attached reference" />}
                  {msg.sender === 'assistant' ? <ChatMarkdown content={msg.content} /> : <div className="whitespace-pre-wrap">{msg.content}</div>}

                  {/* Actions for assistant messages containing code */}
                  {msg.sender === 'assistant' && msg.id !== 'welcome' && (
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-white/10">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
                      >
                        {copiedId === msg.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>


                    </div>
                  )}
                </div>
                <span className="text-[9px] text-slate-500 px-1">{msg.timestamp}</span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 p-3 rounded-xl glass-card text-xs text-slate-300 animate-pulse">
                <Sparkles size={14} className="text-emerald-400 animate-spin" />
                <span>Thinking & typesetting answer...</span>
              </div>
            )}
            <div ref={conversationEnd} />
          </div>

          <PromptCarousel onSelect={setPrompt} />

          {/* Selection context indicator */}
          {selectedText && sourceSharing === 'selection' && (
            <div className="mx-3 my-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-between text-xs text-indigo-300">
              <div className="flex items-center gap-1.5 truncate">
                <FileText size={13} />
                <span className="truncate">
                  Selected {selectedText.split('\n').length} lines from {activeFile}
                </span>
              </div>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-200 px-1.5 py-0.5 rounded">
                Included
              </span>
            </div>
          )}

          {/* Input Area */}
          <div className="assist-edit-mode" role="group" aria-label="Assistant mode">
            <button type="button" aria-pressed={!editSource} onClick={() => setEditSource(false)}>Ask</button>
            <button type="button" aria-pressed={editSource} title="Propose focused source changes inline" onClick={() => { setEditSource(true); if (sourceSharing === 'none') { setSourceSharing(selectedText ? 'selection' : 'document');  } }}>Edit source</button>
            <button type="button" className="assist-more" aria-label="Configure sharing and compiler repair" title={`${sourceSharing === 'none' ? 'No source' : sourceSharing === 'selection' ? 'Selection' : 'Active document'} · Recent chat ${includeHistory ? 'on' : 'off'} · ${isLocal ? 'Local model' : provider}`} onClick={() => setShowSettings(true)}>More<ChevronDown size={14} style={{transform: 'rotate(-90deg)'}} /></button>
          </div>
          {verification && <p className="repair-verification" role="status">{verification}</p>}
          {savedProposal && <button className="btn-secondary save-proposal" onClick={saveProposal}>Save proposed change for later review</button>}
          {settingsMessage && <p className="px-3 text-xs text-amber-300" role="status">{settingsMessage}</p>}
          {image && <div className="assist-image-preview"><img src={`data:image/png;base64,${image.data}`} alt="Reference ready to send" /><span>Reference image<small>{image.width} × {image.height} · metadata removed</small></span><button type="button" className="btn-icon" aria-label="Remove reference image" onClick={() => setImage(null)}><Trash2 size={15} /></button></div>}
          {imageError && <p className="assist-image-error" role="alert">{imageError}</p>}
          <div className="assist-composer p-3 border-t border-white/10 flex items-center gap-2">
            <input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void attachImage(file); }} />
            <button type="button" className="btn-icon assist-attach-image" aria-label="Attach reference image" title={imageHint} disabled={!imageAllowed || loading || imagePreparing} onClick={() => imageInput.current?.click()}><ImagePlus size={18} /></button>
            <textarea
              ref={composerInput}
              aria-label="Message Lemmata Assist"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                editSource
                  ? 'Describe a focused change…'
                  : selectedText
                  ? 'Ask about this selection…'
                  : 'Ask Lemmata Assist…'
              }
              rows={1}
              className="input-dark flex-1 resize-none text-xs"
            />
            <button
              onClick={handleSend}
              disabled={!prompt.trim() || loading || imagePreparing || Boolean(image && !imageAllowed)}
              aria-label="Send message"
              className="btn-primary"

            >
              <Send size={16} />
            </button>
          </div>
        </>
      )}
      {reviewStarted && <PaperReviewPanel open={reviewOpen} onClose={()=>setReviewOpen(false)} files={projectFiles} activeFile={activeFile} currentProvider={provider} currentModel={modelName} currentBaseUrl={baseUrl} getConfig={()=>resolveAIConfig(provider,{apiKey,encryptedKey,masterPass,baseUrl,modelName},decryptApiKey)} onJump={onJumpToSource} projectId={projectId} cursorLine={cursorLine} applySavedEdit={applySavedEdit}/>}
    </section>
  );
};
