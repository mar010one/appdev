'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, X, Smartphone, Globe, FileImage,
  Type, AlignLeft, Sparkles, Loader2,
  ChevronRight, ChevronLeft, Check,
  User, Image as ImageIcon, Mail, ShieldCheck, Link as LinkIcon,
  Minus, Tag, BadgeCheck, Wand2, RefreshCw,
  Package, Upload, AlertCircle, Layers
} from 'lucide-react';
import { addApp, generateAppDescriptions, generateDescriptionField } from '@/lib/actions';
import ModalPortal from './ModalPortal';

type Account = {
  id: number;
  type: 'google_play' | 'apple_store' | string;
  developer_name?: string;
  developer_id?: string;
  email?: string;
  website?: string;
  phone?: string;
};

const TOTAL_STEPS = 4;

function deriveDefaultPrivacyUrl(website?: string) {
  if (!website) return '';
  try {
    const u = new URL(website);
    // Use the host root + /privacy.html (per requirement)
    return `${u.protocol}//${u.host}/privacy.html`;
  } catch {
    // Fallback: append the path if user typed bare domain
    const trimmed = website.replace(/\/+$/, '');
    return `${trimmed}/privacy.html`;
  }
}

export default function CreateAppModal({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isPending, setIsPending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shortBusy, setShortBusy] = useState<false | 'generate' | 'refine'>(false);
  const [longBusy, setLongBusy] = useState<false | 'generate' | 'refine'>(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Form State
  const [aiPrompt, setAiPrompt] = useState('');
  const [shortKwCount, setShortKwCount] = useState(2);
  const [longKwCount, setLongKwCount] = useState(6);
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [usedKeywords, setUsedKeywords] = useState<string[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts[0]?.id ? String(accounts[0].id) : ''
  );
  const [appName, setAppName] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [longDesc, setLongDesc] = useState('');

  // Contact & compliance
  const [contactEmail, setContactEmail] = useState('');
  const [privacyUrl, setPrivacyUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [privacyTouched, setPrivacyTouched] = useState(false);
  const [websiteTouched, setWebsiteTouched] = useState(false);

  // Asset Preview States
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [promoPreview, setPromoPreview] = useState<string | null>(null);
  const [promoFile, setPromoFile] = useState<File | null>(null);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [aabFile, setAabFile] = useState<File | null>(null);
  const [iconError, setIconError] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const selectedAccount = useMemo(
    () => accounts.find(a => String(a.id) === String(selectedAccountId)),
    [accounts, selectedAccountId]
  );

  // Auto-fill contact, website, and privacy URL from the selected developer account.
  // Only auto-fill fields the user hasn't manually edited yet.
  useEffect(() => {
    if (!selectedAccount) return;
    if (!emailTouched) setContactEmail(selectedAccount.email || '');
    if (!websiteTouched) setWebsiteUrl(selectedAccount.website || '');
    if (!privacyTouched) setPrivacyUrl(deriveDefaultPrivacyUrl(selectedAccount.website));
  }, [selectedAccount, emailTouched, websiteTouched, privacyTouched]);

  const nextStep = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  async function handleAiGenerate() {
    if (!aiPrompt) return alert('Please enter an app concept first');

    setIsGenerating(true);
    const result = await generateAppDescriptions(aiPrompt, {
      keywordCount: Math.max(shortKwCount, longKwCount),
      keywords,
    });
    setIsGenerating(false);

    if (result.success && result.data) {
      setShortDesc(result.data.short);
      setLongDesc(result.data.long);
      if (Array.isArray(result.data.keywords)) {
        setUsedKeywords(result.data.keywords.filter((k: unknown): k is string => typeof k === 'string'));
      } else {
        setUsedKeywords([]);
      }
    } else {
      alert(result.error || 'AI generation failed');
    }
  }

  const addKeywordFromInput = () => {
    const parts = keywordInput.split(',').map(k => k.trim()).filter(Boolean);
    if (!parts.length) return;
    setKeywords(prev => {
      const merged = [...prev];
      for (const p of parts) {
        if (!merged.some(x => x.toLowerCase() === p.toLowerCase()) && merged.length < 20) {
          merged.push(p);
        }
      }
      return merged;
    });
    setKeywordInput('');
  };

  const removeKeyword = (kw: string) => {
    setKeywords(prev => prev.filter(k => k !== kw));
  };

  async function handleFieldAi(target: 'short' | 'long', mode: 'generate' | 'refine') {
    const concept = aiPrompt.trim() || appName.trim();
    if (!concept) {
      alert('Describe your app concept (or set the app name in step 1) first.');
      return;
    }
    const current = target === 'short' ? shortDesc : longDesc;
    if (mode === 'refine' && !current.trim()) {
      alert('There is no text to refine yet. Generate first or write a draft.');
      return;
    }

    const setBusy = target === 'short' ? setShortBusy : setLongBusy;
    setBusy(mode);
    const result = await generateDescriptionField(target, concept, {
      keywordCount: target === 'short' ? shortKwCount : longKwCount,
      keywords,
      current: mode === 'refine' ? current : undefined,
      appName,
      mode,
    });
    setBusy(false);

    if (result.success && result.data?.text) {
      if (target === 'short') setShortDesc(result.data.text);
      else setLongDesc(result.data.text);
    } else {
      alert(result.error || 'AI generation failed');
    }
  }

  async function handleFinalSubmit() {
    // Validate required fields here because the inputs from earlier steps
    // are not in the DOM when we submit from step 4.
    if (!selectedAccountId) return alert('Please select a developer account.');
    if (!appName) return alert('Application name is required.');

    setIsPending(true);

    // Build FormData explicitly from React state — do NOT rely on
    // `new FormData(formRef.current)` because conditionally-rendered steps
    // unmount their inputs, dropping fields like accountId on submit.
    const formData = new FormData();
    formData.set('accountId', selectedAccountId);
    formData.set('name', appName);
    formData.set('storeUrl', storeUrl);
    formData.set('shortDescription', shortDesc);
    formData.set('longDescription', longDesc);
    formData.set('contactEmail', contactEmail);
    formData.set('privacyUrl', privacyUrl);
    formData.set('websiteUrl', websiteUrl);

    if (iconFile) formData.set('iconSmall', iconFile);
    if (promoFile) formData.set('iconLarge', promoFile);
    if (aabFile) formData.set('aabFile', aabFile);

    // Append screenshots
    screenshotFiles.forEach((file, index) => {
      formData.append(`screenshot_${index}`, file);
    });

    const result = await addApp(formData);
    setIsPending(false);

    if (result.success && result.data?.id) {
      const newId = result.data.id;
      setIsOpen(false);
      resetForm();
      // Redirect to the auto-generated info page (copy-paste / download view)
      router.push(`/apps/${newId}/info`);
    } else {
      alert(result.error || 'Something went wrong');
    }
  }

  const resetForm = () => {
    setStep(1);
    setAiPrompt('');
    setShortKwCount(2);
    setLongKwCount(6);
    setKeywordInput('');
    setKeywords([]);
    setUsedKeywords([]);
    setAppName('');
    setStoreUrl('');
    setShortDesc('');
    setLongDesc('');
    setContactEmail('');
    setPrivacyUrl('');
    setWebsiteUrl('');
    setEmailTouched(false);
    setPrivacyTouched(false);
    setWebsiteTouched(false);
    setIconPreview(null);
    setIconFile(null);
    setPromoPreview(null);
    setPromoFile(null);
    setScreenshotPreviews([]);
    setScreenshotFiles([]);
    setAabFile(null);
    setIconError(null);
    setPromoError(null);
  };

  function checkImageDimensions(file: File, w: number, h: number): Promise<string | null> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        if (img.naturalWidth !== w || img.naturalHeight !== h) {
          resolve(`Must be exactly ${w}×${h}px — uploaded image is ${img.naturalWidth}×${img.naturalHeight}px.`);
        } else {
          resolve(null);
        }
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'icon' | 'promo' | 'screenshots') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (type === 'icon') {
      const err = await checkImageDimensions(files[0], 512, 512);
      if (err) {
        setIconError(err);
        setIconFile(null);
        setIconPreview(null);
        e.target.value = '';
        return;
      }
      setIconError(null);
      setIconFile(files[0]);
      setIconPreview(URL.createObjectURL(files[0]));
    } else if (type === 'promo') {
      const err = await checkImageDimensions(files[0], 1024, 500);
      if (err) {
        setPromoError(err);
        setPromoFile(null);
        setPromoPreview(null);
        e.target.value = '';
        return;
      }
      setPromoError(null);
      setPromoFile(files[0]);
      setPromoPreview(URL.createObjectURL(files[0]));
    } else if (type === 'screenshots') {
      const newFiles = Array.from(files);
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setScreenshotFiles(prev => [...prev, ...newFiles].slice(0, 8));
      setScreenshotPreviews(prev => [...prev, ...newPreviews].slice(0, 8));
    }
  };

  const removeScreenshot = (index: number) => {
    setScreenshotPreviews(prev => prev.filter((_, i) => i !== index));
    setScreenshotFiles(prev => prev.filter((_, i) => i !== index));
  };

  const stepLabels: Record<number, string> = {
    1: 'App Identity',
    2: 'Content Studio',
    3: 'Visual Assets',
    4: 'Contact & Compliance',
  };

  const stepIcons = [
    <User key={1} size={20} />,
    <Layers key={2} size={20} />,
    <ImageIcon key={3} size={20} />,
    <ShieldCheck key={4} size={20} />,
  ];

  const StepIndicator = () => (
    <div className="stepper-container">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className={`step-item ${step === s ? 'active' : ''} ${step > s ? 'completed' : ''}`}>
          <div className="step-circle">
            {step > s ? <Check size={18} /> : step === s ? stepIcons[s - 1] : s}
          </div>
          <span className="step-label">{stepLabels[s]}</span>
          {s < TOTAL_STEPS && <div className="step-line" />}
        </div>
      ))}
    </div>
  );

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn btn-primary">
        <Plus size={20} />
        Register New App
      </button>

      <ModalPortal open={isOpen}>
        <div className="modal-overlay fullscreen" onClick={() => setIsOpen(false)}>
          <div className="modal-content fullscreen-content" onClick={(e) => e.stopPropagation()}>

            <div className="modal-header modal-header-modern">
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div className="app-icon-preview app-icon-preview-modern">
                  {iconPreview ? (
                    <img src={iconPreview} alt="App icon" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                  ) : (
                    <Smartphone size={24} />
                  )}
                </div>
                <div>
                  <div className="modal-eyebrow">
                    <Sparkles size={12} /> NEW APPLICATION
                  </div>
                  <h2 className="modal-title-modern">{appName || 'Register Application'}</h2>
                  <p className="text-muted">
                    {selectedAccount
                      ? <>Listing under <strong style={{ color: 'var(--foreground)' }}>{selectedAccount.developer_name || selectedAccount.email}</strong> · Step {step} of {TOTAL_STEPS}</>
                      : <>Set up your store identity and listing content.</>
                    }
                  </p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <StepIndicator />

            <form ref={formRef} className="modal-body step-content-container">

              {/* STEP 1: APP IDENTITY */}
              {step === 1 && (
                <div className="step-fade-in max-w-screen">
                  <div className="section-title">
                    <User size={24} color="var(--accent)" />
                    <h3>Core Identity</h3>
                  </div>
                  <p className="step-description">Define who owns the app and its primary store identity.</p>

                  <div className="form-grid-large">
                    <div className="input-field">
                      <label>Developer Account</label>
                      <select name="accountId" value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} required>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.developer_name || acc.email} ({acc.type === 'google_play' ? 'Google' : 'Apple'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedAccount && (
                      <div className="developer-card">
                        <div className="dev-card-row">
                          <span className="dev-card-key"><Mail size={14} /> Email</span>
                          <span className="dev-card-val">{selectedAccount.email || '—'}</span>
                        </div>
                        <div className="dev-card-row">
                          <span className="dev-card-key"><Globe size={14} /> Website</span>
                          <span className="dev-card-val">{selectedAccount.website || '—'}</span>
                        </div>
                        <div className="dev-card-row">
                          <span className="dev-card-key"><ShieldCheck size={14} /> Privacy URL</span>
                          <span className="dev-card-val">{deriveDefaultPrivacyUrl(selectedAccount.website) || '—'}</span>
                        </div>
                        <p className="dev-card-hint">These will auto-fill in step 4. You can override them per app.</p>
                      </div>
                    )}

                    <div className="input-field">
                      <label>Application Name</label>
                      <div className="input-with-icon-large">
                        <Smartphone size={22} />
                        <input
                          type="text"
                          name="name"
                          placeholder="e.g., ZenFlow Meditation"
                          value={appName}
                          onChange={(e) => setAppName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="input-field">
                      <label>Official Store URL (Optional)</label>
                      <div className="input-with-icon-large">
                        <Globe size={22} />
                        <input
                          type="url"
                          name="storeUrl"
                          placeholder="https://play.google.com/store/..."
                          value={storeUrl}
                          onChange={(e) => setStoreUrl(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: CONTENT STUDIO (AI + DESCRIPTIONS) */}
              {step === 2 && (
                <div className="step-fade-in studio-grid max-w-screen">

                  {/* Left: AI Control */}
                  <div className="studio-col">
                    <div className="section-title">
                      <Sparkles size={24} color="var(--accent)" />
                      <h3>Content Studio</h3>
                    </div>
                    <p className="step-description">Generate a policy-compliant Google Play listing tuned to the exact number of main keywords you want to rank for.</p>

                    <div className="policy-banner">
                      <div className="policy-banner-icon">
                        <BadgeCheck size={18} />
                      </div>
                      <div className="policy-banner-body">
                        <strong>Google Play Policy Compliance</strong>
                        <span>All AI output follows 100% of Google Play&apos;s Developer Program &amp; Store Listing policies — no misleading claims, no keyword stuffing, no prohibited content.</span>
                      </div>
                    </div>

                    <div className="ai-workspace ai-workspace-modern">
                      <div className="workspace-header">
                        <Sparkles size={16} />
                        <span>APP CONCEPT</span>
                      </div>
                      <textarea
                        placeholder="Describe your app concept in a few sentences... (e.g., 'A meditation app that uses AI to create personalized soundscapes based on user mood')"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="glass-input ai-input-large"
                        rows={8}
                      />

                      <div className="kw-shared-block">
                        <div className="kw-control-title">
                          <Tag size={14} />
                          <span>SHARED BRAND KEYWORDS · OPTIONAL</span>
                        </div>
                        <p className="kw-shared-hint">
                          Lock specific keywords the AI must use across both fields (e.g. your product category or niche terms). Leave empty to let the AI choose.
                        </p>

                        <div className="kw-input-row">
                          <div className="kw-input-wrap">
                            <Tag size={16} />
                            <input
                              type="text"
                              placeholder="Type keywords, comma or Enter to add"
                              value={keywordInput}
                              onChange={(e) => setKeywordInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ',') {
                                  e.preventDefault();
                                  addKeywordFromInput();
                                }
                              }}
                            />
                          </div>
                          <button type="button" className="btn btn-secondary kw-add-btn" onClick={addKeywordFromInput}>
                            Add
                          </button>
                        </div>

                        {keywords.length > 0 && (
                          <div className="kw-chip-row">
                            {keywords.map((kw) => (
                              <span key={kw} className="kw-chip">
                                {kw}
                                <button type="button" onClick={() => removeKeyword(kw)} aria-label={`Remove ${kw}`}>
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary btn-large full-width ai-pulse"
                        onClick={handleAiGenerate}
                        disabled={isGenerating}
                      >
                        {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} />}
                        {isGenerating ? 'Synthesizing...' : 'Generate Full Listing'}
                      </button>
                    </div>
                  </div>

                  {/* Right: Manual Review/Edit */}
                  <div className="studio-col">
                    <div className="section-title">
                      <AlignLeft size={24} color="var(--accent)" />
                      <h3>Refine &amp; Review</h3>
                    </div>
                    <p className="step-description">Review the generated content and make manual adjustments as needed.</p>

                    {usedKeywords.length > 0 && (
                      <div className="kw-used-row">
                        <span className="kw-used-label"><BadgeCheck size={14} /> Keywords used</span>
                        <div className="kw-chip-row compact">
                          {usedKeywords.map((kw) => (
                            <span key={kw} className="kw-chip ghost">{kw}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="editor-group">
                      {/* --- SHORT DESCRIPTION CARD --- */}
                      <div className="field-card">
                        <div className="field-card-head">
                          <div className="field-card-title">
                            <span className="field-card-dot" />
                            <label>Small Description</label>
                            <span className="field-card-sub">Short · max 80 chars</span>
                          </div>
                          <span className={`char-count-pill ${shortDesc.length > 80 ? 'error' : shortDesc.length > 70 ? 'warning' : ''}`}>
                            {shortDesc.length} / 80
                          </span>
                        </div>

                        <div className="field-input-wrap">
                          <Type size={18} />
                          <input
                            type="text"
                            className="field-input"
                            placeholder="Catchy tagline — or click AI Generate below"
                            maxLength={80}
                            value={shortDesc}
                            onChange={(e) => setShortDesc(e.target.value)}
                          />
                        </div>

                        <div className="field-toolbar">
                          <div className="field-kw">
                            <Tag size={12} />
                            <span className="field-kw-label">Keywords</span>
                            <div className="field-kw-stepper">
                              <button
                                type="button"
                                className="kw-mini-btn"
                                onClick={() => setShortKwCount(c => Math.max(1, c - 1))}
                                disabled={keywords.length > 0 || shortKwCount <= 1}
                                aria-label="Decrease short keyword count"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="kw-mini-value">{keywords.length > 0 ? keywords.length : shortKwCount}</span>
                              <button
                                type="button"
                                className="kw-mini-btn"
                                onClick={() => setShortKwCount(c => Math.min(5, c + 1))}
                                disabled={keywords.length > 0 || shortKwCount >= 5}
                                aria-label="Increase short keyword count"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            {keywords.length > 0 && <span className="field-kw-locked">locked to brand keywords</span>}
                          </div>

                          <div className="field-actions">
                            <button
                              type="button"
                              className="ai-field-btn"
                              onClick={() => handleFieldAi('short', 'generate')}
                              disabled={!!shortBusy}
                            >
                              {shortBusy === 'generate' ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                              <span>{shortBusy === 'generate' ? 'Generating…' : 'AI Generate'}</span>
                            </button>
                            <button
                              type="button"
                              className="ai-field-btn ghost"
                              onClick={() => handleFieldAi('short', 'refine')}
                              disabled={!!shortBusy || !shortDesc.trim()}
                            >
                              {shortBusy === 'refine' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                              <span>{shortBusy === 'refine' ? 'Refining…' : 'Refine'}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* --- LONG DESCRIPTION CARD --- */}
                      <div className="field-card grow">
                        <div className="field-card-head">
                          <div className="field-card-title">
                            <span className="field-card-dot" />
                            <label>Full Description</label>
                            <span className="field-card-sub">Long · max 4,000 chars</span>
                          </div>
                          <span className={`char-count-pill ${longDesc.length > 4000 ? 'error' : longDesc.length > 3500 ? 'warning' : ''}`}>
                            {longDesc.length.toLocaleString()} / 4,000
                          </span>
                        </div>

                        <textarea
                          className="field-textarea premium-scroll"
                          placeholder="Detailed features, benefits, and call to action — or click AI Generate below"
                          maxLength={4000}
                          value={longDesc}
                          onChange={(e) => setLongDesc(e.target.value)}
                        />

                        <div className="field-toolbar">
                          <div className="field-kw">
                            <Tag size={12} />
                            <span className="field-kw-label">Keywords</span>
                            <div className="field-kw-stepper">
                              <button
                                type="button"
                                className="kw-mini-btn"
                                onClick={() => setLongKwCount(c => Math.max(1, c - 1))}
                                disabled={keywords.length > 0 || longKwCount <= 1}
                                aria-label="Decrease long keyword count"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="kw-mini-value">{keywords.length > 0 ? keywords.length : longKwCount}</span>
                              <button
                                type="button"
                                className="kw-mini-btn"
                                onClick={() => setLongKwCount(c => Math.min(20, c + 1))}
                                disabled={keywords.length > 0 || longKwCount >= 20}
                                aria-label="Increase long keyword count"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            {keywords.length > 0 && <span className="field-kw-locked">locked to brand keywords</span>}
                          </div>

                          <div className="field-actions">
                            <button
                              type="button"
                              className="ai-field-btn"
                              onClick={() => handleFieldAi('long', 'generate')}
                              disabled={!!longBusy}
                            >
                              {longBusy === 'generate' ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                              <span>{longBusy === 'generate' ? 'Generating…' : 'AI Generate'}</span>
                            </button>
                            <button
                              type="button"
                              className="ai-field-btn ghost"
                              onClick={() => handleFieldAi('long', 'refine')}
                              disabled={!!longBusy || !longDesc.trim()}
                            >
                              {longBusy === 'refine' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                              <span>{longBusy === 'refine' ? 'Refining…' : 'Refine'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: VISUAL ASSETS */}
              {step === 3 && (
                <div className="step-fade-in max-w-screen">
                  <div className="section-title">
                    <ImageIcon size={24} color="var(--accent)" />
                    <h3>Visual Assets</h3>
                  </div>
                  <p className="step-description">Upload high-quality graphics to make your app stand out in the store listings.</p>

                  <div className="assets-layout-grid">
                    {/* Top Row: Icon and Promo */}
                    <div className="assets-grid-xl">
                      {/* Store Icon */}
                      <div className={`asset-upload-card ${iconPreview ? 'has-preview' : ''} ${iconError ? 'has-error' : ''}`}>
                        <div className="asset-card-header">
                          <div className="asset-info">
                            <strong>Store Icon</strong>
                            <div className="asset-dim-badge">
                              <span className="dim-required">512 × 512</span>
                              <span>PNG / JPG</span>
                            </div>
                          </div>
                          {iconPreview && !iconError && (
                            <span className="asset-status-ok"><Check size={12} /> OK</span>
                          )}
                        </div>
                        <label className="file-upload-xl" style={{ cursor: 'pointer' }}>
                          {iconPreview ? (
                            <>
                              <img src={iconPreview} alt="Icon Preview" className="asset-preview-img" />
                              <span className="asset-replace-hint"><Upload size={14} /> Replace</span>
                            </>
                          ) : (
                            <>
                              <div className="asset-upload-icon"><FileImage size={36} /></div>
                              <p className="asset-upload-label">Click to upload</p>
                              <p className="asset-upload-hint">Exact 512×512px required</p>
                            </>
                          )}
                          <input type="file" name="iconSmall" accept="image/*" className="hidden-input" onChange={(e) => handleFileChange(e, 'icon')} />
                        </label>
                        {iconError && (
                          <div className="asset-error-msg">
                            <AlertCircle size={14} />
                            <span>{iconError}</span>
                          </div>
                        )}
                      </div>

                      {/* Feature Graphic */}
                      <div className={`asset-upload-card ${promoPreview ? 'has-preview' : ''} ${promoError ? 'has-error' : ''}`}>
                        <div className="asset-card-header">
                          <div className="asset-info">
                            <strong>Feature Graphic</strong>
                            <div className="asset-dim-badge">
                              <span className="dim-required">1024 × 500</span>
                              <span>PNG / JPG</span>
                            </div>
                          </div>
                          {promoPreview && !promoError && (
                            <span className="asset-status-ok"><Check size={12} /> OK</span>
                          )}
                        </div>
                        <label className="file-upload-xl" style={{ cursor: 'pointer' }}>
                          {promoPreview ? (
                            <>
                              <img src={promoPreview} alt="Promo Preview" className="asset-preview-img" />
                              <span className="asset-replace-hint"><Upload size={14} /> Replace</span>
                            </>
                          ) : (
                            <>
                              <div className="asset-upload-icon"><ImageIcon size={36} /></div>
                              <p className="asset-upload-label">Click to upload</p>
                              <p className="asset-upload-hint">Exact 1024×500px required</p>
                            </>
                          )}
                          <input type="file" name="iconLarge" accept="image/*" className="hidden-input" onChange={(e) => handleFileChange(e, 'promo')} />
                        </label>
                        {promoError && (
                          <div className="asset-error-msg">
                            <AlertCircle size={14} />
                            <span>{promoError}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Section: Screenshots */}
                    <div className="screenshot-section">
                      <div className="section-header-row">
                        <div className="asset-info">
                          <strong>App Screenshots</strong>
                          <span>Upload up to 8 images (Phone/Tablet)</span>
                        </div>
                        {screenshotPreviews.length < 8 && (
                          <div className="btn btn-secondary btn-small relative">
                            <Plus size={16} /> Add Screenshots
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden-input"
                              onChange={(e) => handleFileChange(e, 'screenshots')}
                            />
                          </div>
                        )}
                      </div>

                      <div className="screenshots-preview-grid">
                        {screenshotPreviews.map((url, index) => (
                          <div key={index} className="screenshot-card anim-fade-in">
                            <img src={url} alt={`Screenshot ${index + 1}`} />
                            <button type="button" className="remove-asset" onClick={() => removeScreenshot(index)}>
                              <X size={14} />
                            </button>
                          </div>
                        ))}

                        {screenshotPreviews.length === 0 && (
                          <div className="screenshot-placeholder">
                            <Smartphone size={32} />
                            <p>No screenshots uploaded yet</p>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden-input"
                              onChange={(e) => handleFileChange(e, 'screenshots')}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* AAB Upload */}
                  <div className="aab-upload-section">
                    <div className="aab-section-title">
                      <Package size={18} color="#22c55e" />
                      <strong>App Bundle</strong>
                      <span>Optional · .aab file for Google Play</span>
                    </div>

                    {aabFile ? (
                      <div className="aab-upload-card has-file">
                        <div className="aab-icon-box">
                          <Package size={26} />
                        </div>
                        <div className="aab-upload-info">
                          <div className="aab-upload-title">Bundle ready</div>
                          <div className="aab-file-name">{aabFile.name}</div>
                          <div className="aab-upload-sub">{(aabFile.size / 1024 / 1024).toFixed(1)} MB</div>
                        </div>
                        <span className="aab-status-badge"><Check size={12} /> Attached</span>
                        <label className="aab-change-btn" style={{ cursor: 'pointer' }}>
                          <Upload size={13} /> Change
                          <input
                            type="file"
                            accept=".aab"
                            className="hidden-input"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) setAabFile(f);
                            }}
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="aab-upload-card" style={{ cursor: 'pointer' }}>
                        <div className="aab-icon-box">
                          <Package size={26} />
                        </div>
                        <div className="aab-upload-info">
                          <div className="aab-upload-title">Upload App Bundle (AAB)</div>
                          <div className="aab-upload-sub">Drag & drop or click to select · .aab</div>
                        </div>
                        <Upload size={20} color="var(--muted)" />
                        <input
                          type="file"
                          accept=".aab"
                          className="hidden-input"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setAabFile(f);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: CONTACT & COMPLIANCE */}
              {step === 4 && (
                <div className="step-fade-in max-w-screen">
                  <div className="section-title">
                    <ShieldCheck size={24} color="var(--accent)" />
                    <h3>Contact & Compliance</h3>
                  </div>
                  <p className="step-description">
                    These fields auto-populate from the selected developer account. Update them only if this app needs different details.
                  </p>

                  <div className="form-grid-large">
                    <div className="input-field">
                      <div className="label-row">
                        <label>Contact Email</label>
                        {selectedAccount?.email && contactEmail === selectedAccount.email && (
                          <span className="char-count-pill" style={{ color: 'var(--accent)', borderColor: 'var(--accent-soft)', background: 'var(--accent-soft)' }}>
                            <Sparkles size={10} style={{ marginRight: 4 }} /> AUTO-FILLED
                          </span>
                        )}
                      </div>
                      <div className="input-with-icon-large">
                        <Mail size={22} />
                        <input
                          type="email"
                          name="contactEmail"
                          placeholder="support@yourcompany.com"
                          value={contactEmail}
                          onChange={(e) => { setContactEmail(e.target.value); setEmailTouched(true); }}
                          required
                        />
                      </div>
                    </div>

                    <div className="input-field">
                      <div className="label-row">
                        <label>Developer Website</label>
                        {selectedAccount?.website && websiteUrl === selectedAccount.website && (
                          <span className="char-count-pill" style={{ color: 'var(--accent)', borderColor: 'var(--accent-soft)', background: 'var(--accent-soft)' }}>
                            <Sparkles size={10} style={{ marginRight: 4 }} /> AUTO-FILLED
                          </span>
                        )}
                      </div>
                      <div className="input-with-icon-large">
                        <LinkIcon size={22} />
                        <input
                          type="url"
                          name="websiteUrl"
                          placeholder="https://yourcompany.com"
                          value={websiteUrl}
                          onChange={(e) => { setWebsiteUrl(e.target.value); setWebsiteTouched(true); }}
                        />
                      </div>
                    </div>

                    <div className="input-field">
                      <div className="label-row">
                        <label>Privacy Policy URL</label>
                        {selectedAccount?.website && privacyUrl === deriveDefaultPrivacyUrl(selectedAccount.website) && (
                          <span className="char-count-pill" style={{ color: 'var(--accent)', borderColor: 'var(--accent-soft)', background: 'var(--accent-soft)' }}>
                            <Sparkles size={10} style={{ marginRight: 4 }} /> AUTO-FILLED
                          </span>
                        )}
                      </div>
                      <div className="input-with-icon-large">
                        <ShieldCheck size={22} />
                        <input
                          type="url"
                          name="privacyUrl"
                          placeholder="https://yourcompany.com/privacy.html"
                          value={privacyUrl}
                          onChange={(e) => { setPrivacyUrl(e.target.value); setPrivacyTouched(true); }}
                        />
                      </div>
                      <p className="dev-card-hint" style={{ marginTop: 8 }}>
                        Tip: a default <code>/privacy.html</code> page is bundled with this app and can be hosted at the developer&apos;s domain.
                      </p>
                    </div>

                    <div className="summary-card">
                      <div className="summary-card-header">
                        <span>READY TO PUBLISH</span>
                      </div>
                      <div className="summary-card-body">
                        <div className="summary-row"><strong>App</strong><span>{appName || '—'}</span></div>
                        <div className="summary-row"><strong>Developer</strong><span>{selectedAccount?.developer_name || selectedAccount?.email || '—'}</span></div>
                        <div className="summary-row"><strong>Email</strong><span>{contactEmail || '—'}</span></div>
                        <div className="summary-row"><strong>Website</strong><span>{websiteUrl || '—'}</span></div>
                        <div className="summary-row"><strong>Privacy</strong><span>{privacyUrl || '—'}</span></div>
                        <div className="summary-row"><strong>Screenshots</strong><span>{screenshotFiles.length} uploaded</span></div>
                        <div className="summary-row"><strong>App Bundle</strong><span>{aabFile ? aabFile.name : '—'}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>

            <div className="modal-footer sticky-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={step === 1 ? () => setIsOpen(false) : prevStep}
              >
                {step === 1 ? 'Cancel' : <><ChevronLeft size={18} /> Back</>}
              </button>

              <div style={{ display: 'flex', gap: '15px' }}>
                {step < TOTAL_STEPS ? (
                  <button type="button" className="btn btn-primary" onClick={nextStep} style={{ width: '140px' }}>
                    Next <ChevronRight size={18} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-accent btn-glow"
                    onClick={handleFinalSubmit}
                    disabled={isPending || shortDesc.length > 80 || longDesc.length > 4000}
                  >
                    {isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                    {isPending ? 'Deploying...' : 'Save & Generate Info Page'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>
    </>
  );
}
