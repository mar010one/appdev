'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Smartphone, Globe, Save, AlignLeft, Sparkles, Loader2, ChevronLeft, Image as ImageIcon, FileImage, Plus, Check, Trash2 } from 'lucide-react';
import { updateApp, generateAppDescriptions, deleteScreenshot } from '@/lib/actions';
import ModalPortal from './ModalPortal';

export default function EditAppModal({ app }: { app: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'assets'>('content');
  const [aiPrompt, setAiPrompt] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  
  // States for controlled inputs
  const [shortDesc, setShortDesc] = useState(app.short_description || '');
  const [longDesc, setLongDesc] = useState(app.long_description || '');

  // Visual Assets State
  const [iconPreview, setIconPreview] = useState<string | null>(app.icon_small_path || null);
  const [promoPreview, setPromoPreview] = useState<string | null>(app.icon_large_path || null);
  const [existingScreenshots, setExistingScreenshots] = useState(app.screenshots || []);
  const [newScreenshotPreviews, setNewScreenshotPreviews] = useState<string[]>([]);
  const [newScreenshotFiles, setNewScreenshotFiles] = useState<File[]>([]);

  // Sync state when app prop changes (crucial for refresh after save)
  useEffect(() => {
    setShortDesc(app.short_description || '');
    setLongDesc(app.long_description || '');
    setIconPreview(app.icon_small_path || null);
    setPromoPreview(app.icon_large_path || null);
    setExistingScreenshots(app.screenshots || []);
    setNewScreenshotFiles([]);
    setNewScreenshotPreviews([]);
  }, [app]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    
    // Ensure controlled states are sent
    formData.set('shortDescription', shortDesc);
    formData.set('longDescription', longDesc);

    // Append new screenshots
    newScreenshotFiles.forEach((file, index) => {
      formData.append(`screenshot_${index}`, file);
    });
    
    const result = await updateApp(app.id, formData);
    setIsPending(false);
    
    if (result.success) {
      setIsOpen(false);
      setNewScreenshotFiles([]);
      setNewScreenshotPreviews([]);
    } else {
      alert(result.error || 'Something went wrong');
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'icon' | 'promo' | 'screenshots') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (type === 'icon') {
      setIconPreview(URL.createObjectURL(files[0]));
    } else if (type === 'promo') {
      setPromoPreview(URL.createObjectURL(files[0]));
    } else if (type === 'screenshots') {
      const newFiles = Array.from(files);
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      
      setNewScreenshotFiles(prev => [...prev, ...newFiles]);
      setNewScreenshotPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeNewScreenshot = (index: number) => {
    setNewScreenshotPreviews(prev => prev.filter((_, i) => i !== index));
    setNewScreenshotFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingScreenshot = async (id: number) => {
    if (!confirm('Are you sure you want to delete this screenshot?')) return;
    const res = await deleteScreenshot(id);
    if (res.success) {
      setExistingScreenshots(prev => prev.filter((s: any) => s.id !== id));
    } else {
      alert(res.error);
    }
  };

  async function handleAiGenerate() {
    if (!aiPrompt) return alert('Please enter an app concept first');
    
    setIsGenerating(true);
    const result = await generateAppDescriptions(aiPrompt);
    setIsGenerating(false);

    if (result.success && result.data) {
      setShortDesc(result.data.short);
      setLongDesc(result.data.long);
    } else {
      alert(result.error || 'AI generation failed');
    }
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn btn-secondary small" style={{ width: '40px', padding: 0, justifyContent: 'center' }}>
        <Smartphone size={16} />
      </button>

      <ModalPortal open={isOpen}>
        <div className="modal-overlay fullscreen" onClick={() => setIsOpen(false)}>
          <div className="modal-content fullscreen-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div className="app-icon-preview">
                  <Smartphone size={24} />
                </div>
                <div>
                  <h2>Edit Application</h2>
                  <p className="text-muted">Modify branding and listing details for {app.name}.</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="modal-body max-w-screen">
              {/* Tab Switcher */}
              <div className="tab-switcher">
                <button 
                  type="button" 
                  className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`}
                  onClick={() => setActiveTab('content')}
                >
                  <AlignLeft size={18} /> Content Studio
                </button>
                <button 
                  type="button" 
                  className={`tab-btn ${activeTab === 'assets' ? 'active' : ''}`}
                  onClick={() => setActiveTab('assets')}
                >
                  <ImageIcon size={18} /> Visual Assets
                </button>
              </div>

              {activeTab === 'content' ? (
                <div className="studio-grid anim-fade-in">
                  
                  {/* Left Column: AI & Info */}
                  <div className="studio-col">
                    <div className="section-title">
                      <Sparkles size={24} color="var(--accent)" />
                      <h3>Market Identity</h3>
                    </div>
                    <p className="step-description">Update your app's core details and use AI to refine your presence.</p>

                    <div className="ai-workspace">
                      <div className="workspace-header">
                        <Sparkles size={16} />
                        <span>AI REFINEMENT</span>
                      </div>
                      <textarea 
                        placeholder="Refine app concept or features..." 
                        className="glass-input ai-input-large" 
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        rows={6}
                      />
                      <button 
                        type="button" 
                        className="btn btn-primary btn-large full-width ai-pulse" 
                        onClick={handleAiGenerate}
                        disabled={isGenerating}
                      >
                        {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                        {isGenerating ? 'Regenerating...' : 'AI Regenerate Listing'}
                      </button>
                    </div>

                    <div className="form-grid-large" style={{ gap: '20px' }}>
                      <div className="input-field">
                        <label>App Name</label>
                        <div className="input-with-icon-large">
                          <Smartphone size={20} />
                          <input type="text" name="name" defaultValue={app.name} required />
                        </div>
                      </div>
                      <div className="input-field">
                        <label>Store URL</label>
                        <div className="input-with-icon-large">
                          <Globe size={20} />
                          <input type="url" name="storeUrl" defaultValue={app.store_url} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Descriptions */}
                  <div className="studio-col">
                    <div className="section-title">
                      <AlignLeft size={24} color="var(--accent)" />
                      <h3>Content Review</h3>
                    </div>
                    <p className="step-description">Fine-tune your messaging to maximize store conversion rates.</p>

                    <div className="editor-group">
                      <div className="input-field">
                        <div className="label-row">
                          <label>Short Description (Tagline)</label>
                          <span className={`char-count-pill ${shortDesc.length > 80 ? 'error' : shortDesc.length > 70 ? 'warning' : ''}`}>
                            {shortDesc.length} / 80
                          </span>
                        </div>
                        <div className="input-with-icon-large">
                          <AlignLeft size={20} />
                          <input 
                            type="text" 
                            name="shortDescription" 
                            value={shortDesc}
                            onChange={(e) => setShortDesc(e.target.value)}
                            maxLength={80} 
                          />
                        </div>
                      </div>

                      <div className="input-field grow">
                        <div className="label-row">
                          <label>Full Listing Description</label>
                          <span className={`char-count-pill ${longDesc.length > 4000 ? 'error' : longDesc.length > 3500 ? 'warning' : ''}`}>
                            {longDesc.length.toLocaleString()} / 4,000
                          </span>
                        </div>
                        <textarea 
                          name="longDescription" 
                          value={longDesc}
                          onChange={(e) => setLongDesc(e.target.value)}
                          className="glass-input editor-textarea premium-scroll" 
                          maxLength={4000}
                          style={{ minHeight: '520px' }}
                        />
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="assets-workspace anim-fade-in">
                  <div className="section-title">
                    <ImageIcon size={24} color="var(--accent)" />
                    <h3>Store Assets</h3>
                  </div>
                  <p className="step-description">Manage graphical assets for Google Play Store visibility.</p>

                  <div className="assets-grid-edit">
                    <div className="asset-main-cols">
                      <div className="asset-upload-card icon-upload">
                        <label>App Icon (512x512)</label>
                        <div className="preview-box">
                          {iconPreview ? (
                            <img src={iconPreview} alt="Icon Preview" />
                          ) : (
                            <div className="placeholder">
                              <FileImage size={40} />
                              <span>Small Icon</span>
                            </div>
                          )}
                          <input type="file" name="iconSmall" accept="image/*" onChange={(e) => handleFileChange(e, 'icon')} />
                        </div>
                      </div>

                      <div className="asset-upload-card promo-upload">
                        <label>Promo Graphic (1024x500)</label>
                        <div className="preview-box promo">
                          {promoPreview ? (
                            <img src={promoPreview} alt="Promo Preview" />
                          ) : (
                            <div className="placeholder">
                              <ImageIcon size={40} />
                              <span>Promo Graphic</span>
                            </div>
                          )}
                          <input type="file" name="iconLarge" accept="image/*" onChange={(e) => handleFileChange(e, 'promo')} />
                        </div>
                      </div>
                    </div>

                    <div className="screenshot-management">
                      <label>Screenshots (Up to 8)</label>
                      <div className="screenshots-preview-grid">
                        {/* Existing Screenshots */}
                        {existingScreenshots.map((shot: any) => (
                          <div key={shot.id} className="screenshot-card">
                            <img src={shot.file_path} alt="Screenshot" />
                            <button type="button" className="remove-asset" onClick={() => handleRemoveExistingScreenshot(shot.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}

                        {/* New Screenshot Previews */}
                        {newScreenshotPreviews.map((preview, idx) => (
                          <div key={idx} className="screenshot-card anim-pulse">
                            <img src={preview} alt="New Preview" />
                            <button type="button" className="remove-asset" onClick={() => removeNewScreenshot(idx)}>
                              <X size={14} />
                            </button>
                          </div>
                        ))}

                        {existingScreenshots.length + newScreenshotPreviews.length < 8 && (
                          <div className="screenshot-placeholder" onClick={() => document.getElementById('edit-shot-input')?.click()}>
                            <Plus size={24} />
                            <span>Add Shot</span>
                            <input 
                              id="edit-shot-input"
                              type="file" 
                              multiple 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handleFileChange(e, 'screenshots')} 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>

            <div className="modal-footer sticky-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsOpen(false)}>
                <ChevronLeft size={18} /> Cancel
              </button>
              <button type="submit" className="btn btn-accent btn-glow" disabled={isPending || shortDesc.length > 80 || longDesc.length > 4000} onClick={() => {
                if (formRef.current) formRef.current.requestSubmit();
              }}>
                <Save size={18} style={{ marginRight: '8px' }} />
                {isPending ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </>
  );
}
