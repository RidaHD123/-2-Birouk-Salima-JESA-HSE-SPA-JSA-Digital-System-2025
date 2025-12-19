
import React, { useState, useEffect, useRef } from 'react';
import { TRANSLATIONS, SEED_JOBS, LOCATIONS, PROJECTS_LIST } from './constants';
import { JSAData, Language, AppState, SignatureData, RiskScore } from './types';
import { generateJSAFromAI } from './services/geminiService';
import SignaturePad from './components/SignaturePad';

// Add globals for the PDF libraries injected via CDN
declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
  }
}

// --- SVG Logos (Optimized) ---
const JesaLogo = () => (
  <svg viewBox="0 0 100 40" className="h-10 w-auto">
    <path d="M10,10 L30,10 L20,35 Z" fill="#F37021" />
    <text x="35" y="30" fill="#004A99" fontSize="24" fontWeight="bold" fontFamily="sans-serif">JESA</text>
  </svg>
);
const OcpLogo = () => (
  <svg viewBox="0 0 100 40" className="h-10 w-auto">
    <circle cx="20" cy="20" r="15" fill="#2E7D32" opacity="0.2" />
    <text x="40" y="30" fill="#2E7D32" fontSize="24" fontWeight="bold" fontFamily="sans-serif">OCP</text>
  </svg>
);
const WorleyLogo = () => (
  <svg viewBox="0 0 120 40" className="h-10 w-auto">
    <text x="0" y="30" fill="#E53935" fontSize="24" fontWeight="bold" fontFamily="sans-serif">Worley</text>
  </svg>
);

// --- Utilities ---
const calculateRiskLevel = (score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' => {
  if (score >= 15) return 'EXTREME';
  if (score >= 10) return 'HIGH';
  if (score >= 5) return 'MEDIUM';
  return 'LOW';
};

// --- Components ---

const Navbar = ({ mode, setMode, language, setLanguage, isRTL }: { 
    mode: AppState['mode'], 
    setMode: (mode: AppState['mode']) => void, 
    language: Language, 
    setLanguage: (lang: Language) => void,
    isRTL: boolean
}) => (
  <nav className="bg-jesa-blue text-white shadow-md print:hidden h-16 flex items-center justify-between px-6 shrink-0">
    <div className="flex items-center gap-3 cursor-pointer" onClick={() => setMode('search')}>
      <div className="font-black text-2xl tracking-tighter">JESA<span className="text-jesa-orange">.SPA</span></div>
      <div className="hidden md:block h-6 w-px bg-white/30"></div>
      <div className="hidden md:block text-xs opacity-80 leading-tight">
        Safe Performance Analysis<br/>Digital System v2025
      </div>
    </div>
    <div className="flex items-center gap-2">
       {(mode === 'edit' || mode === 'preview') && (
         <div className="flex bg-blue-900/50 rounded-lg p-1 mr-4">
           <button 
              onClick={() => setMode('edit')} 
              className={`px-3 py-1 text-sm rounded transition-colors ${mode === 'edit' ? 'bg-white text-jesa-blue font-bold shadow' : 'text-white hover:bg-white/10'}`}
           >
             {isRTL ? '١. تحرير' : '1. Edit'}
           </button>
           <button 
              onClick={() => setMode('preview')} 
              className={`px-3 py-1 text-sm rounded transition-colors ${mode === 'preview' ? 'bg-white text-jesa-blue font-bold shadow' : 'text-white hover:bg-white/10'}`}
           >
              {isRTL ? '٢. معاينة' : '2. Preview'}
           </button>
         </div>
       )}
       {(['en', 'fr', 'ar'] as Language[]).map(l => (
          <button key={l} onClick={() => setLanguage(l)} className={`w-8 h-8 rounded-full border border-white/30 flex items-center justify-center text-xs font-bold transition-all ${language === l ? 'bg-white text-jesa-blue scale-110 shadow-lg' : 'hover:bg-white/10'}`}>
              {l.toUpperCase()}
          </button>
       ))}
    </div>
  </nav>
);

const SearchMode = ({ 
    language, 
    onSearch, 
    isLoading, 
    onSeedSelect 
}: { 
    language: Language, 
    onSearch: (q: string) => void, 
    isLoading: boolean, 
    onSeedSelect: (job: JSAData) => void 
}) => {
    const [localQuery, setLocalQuery] = useState('');
    const [suggestions, setSuggestions] = useState<JSAData[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const t = TRANSLATIONS[language];
    const isRTL = language === 'ar';
    const wrapperRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (localQuery.length > 0) {
            const lowerQ = localQuery.toLowerCase();
            const matches = SEED_JOBS.filter(job => 
                (job.title.en && job.title.en.toLowerCase().includes(lowerQ)) ||
                (job.title.fr && job.title.fr.toLowerCase().includes(lowerQ)) ||
                (job.title.ar && job.title.ar.includes(localQuery))
            );
            setSuggestions(matches);
            setShowSuggestions(true);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }, [localQuery]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    return (
        <div className="flex-grow flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-blue-50">
            <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-3xl w-full transform transition-all border border-white/50 relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-jesa-orange/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-jesa-blue/5 rounded-full -ml-32 -mb-32 blur-3xl"></div>
                
                <div className="flex justify-center items-center gap-8 mb-10 opacity-90 relative z-10">
                    <JesaLogo /> <div className="h-8 w-px bg-gray-300"></div> <OcpLogo /> <div className="h-8 w-px bg-gray-300"></div> <WorleyLogo />
                </div>
                
                <h1 className="text-4xl font-black text-center text-jesa-blue mb-2 tracking-tight">{t.appTitle}</h1>
                <p className="text-center text-gray-500 mb-10 text-lg font-medium">{t.subtitle} <span className="text-jesa-orange mx-2">•</span> Corporate HSE Standard</p>
                
                <form onSubmit={(e) => { e.preventDefault(); onSearch(localQuery); }} className="relative group z-10" ref={wrapperRef}>
                    <div className="relative">
                        <input
                            type="text"
                            value={localQuery}
                            onChange={(e) => setLocalQuery(e.target.value)}
                            onFocus={() => localQuery.length > 0 && setShowSuggestions(true)}
                            placeholder={t.searchPlaceholder}
                            className={`w-full p-5 pl-6 border-2 border-gray-100 rounded-2xl shadow-inner focus:border-jesa-blue focus:ring-4 focus:ring-jesa-blue/10 outline-none text-xl transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                            dir={isRTL ? 'rtl' : 'ltr'}
                            autoComplete="off"
                        />
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className={`absolute top-2.5 ${isRTL ? 'left-2.5' : 'right-2.5'} bottom-2.5 bg-jesa-orange text-white px-8 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg hover:shadow-orange-500/30 flex items-center gap-2`}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                </div>
                            ) : (
                                <span>{t.generateWithAI}</span>
                            )}
                        </button>
                    </div>

                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute w-full bg-white mt-2 rounded-xl shadow-xl border border-gray-100 overflow-hidden max-h-60 overflow-y-auto z-50">
                            {suggestions.map((job) => (
                                <div 
                                    key={job.id}
                                    onClick={() => {
                                        setLocalQuery(language === 'ar' ? job.title.ar : language === 'fr' ? job.title.fr : job.title.en);
                                        setShowSuggestions(false);
                                        onSeedSelect(job);
                                    }}
                                    className={`p-4 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors ${isRTL ? 'text-right' : 'text-left'}`}
                                    dir={isRTL ? 'rtl' : 'ltr'}
                                >
                                    <div className="font-bold text-gray-800">
                                        {language === 'ar' ? job.title.ar : language === 'fr' ? job.title.fr : job.title.en}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        {language !== 'en' && job.title.en}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </form>

                <div className="mt-6 text-center text-xs text-gray-400">
                    {isRTL ? 'اكتب للبحث، أو اضغط زر التوليد للإنشاء بالذكاء الاصطناعي' : 'Start typing to see suggestions, or press Generate to draft with AI.'}
                </div>
            </div>
        </div>
    );
};

const EditorView = ({ 
    jsa, 
    language, 
    activeTab, 
    setActiveTab, 
    onUpdateJSA, 
    onRiskChange, 
    signatures, 
    onUpdateSignature, 
    onClose, 
    onPreview 
}: {
    jsa: JSAData,
    language: Language,
    activeTab: 'general' | 'details' | 'steps' | 'finish',
    setActiveTab: (tab: 'general' | 'details' | 'steps' | 'finish') => void,
    onUpdateJSA: (field: keyof JSAData, value: any) => void,
    onRiskChange: (type: 'initialRisk' | 'residualRisk', field: 'likelihood' | 'severity', value: number) => void,
    signatures: AppState['signatures'],
    onUpdateSignature: (role: keyof AppState['signatures'], field: keyof SignatureData, value: string | null) => void,
    onClose: () => void,
    onPreview: () => void
}) => {
    const t = TRANSLATIONS[language];
    const isRTL = language === 'ar';
    const [showProjectSuggestions, setShowProjectSuggestions] = useState(false);

    const TabButton = ({ id, label }: { id: typeof activeTab, label: string }) => (
        <button 
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-4 text-sm font-bold border-b-2 transition-all duration-300 ${activeTab === id ? 'border-jesa-blue text-jesa-blue bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
            {label}
        </button>
    );

    const filteredProjects = PROJECTS_LIST.filter(p => 
        p.toLowerCase().includes((jsa.metadata?.project || '').toLowerCase())
    );

    return (
        <div className="max-w-5xl mx-auto bg-white min-h-[calc(100vh-4rem)] shadow-xl flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex border-b border-gray-200 sticky top-0 bg-white z-20 shrink-0">
                <TabButton id="general" label={t.editor.tabs.general} />
                <TabButton id="details" label={t.editor.tabs.details} />
                <TabButton id="steps" label={t.editor.tabs.steps} />
                <TabButton id="finish" label={t.editor.tabs.finish} />
            </div>

            <div className="p-8 pb-32 flex-grow">
                {activeTab === 'general' && (
                    <div className="space-y-8 animate-fadeIn">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t.editor.jobTitle} ({t.editor.editMode})</label>
                                <input 
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-jesa-blue outline-none font-medium transition-all"
                                    value={language === 'ar' ? jsa.title.ar : language === 'fr' ? jsa.title.fr : jsa.title.en}
                                    onChange={(e) => {
                                        const newTitles = {...jsa.title};
                                        if (language === 'ar') newTitles.ar = e.target.value;
                                        else if (language === 'fr') newTitles.fr = e.target.value;
                                        else newTitles.en = e.target.value;
                                        onUpdateJSA('title', newTitles);
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t.location}</label>
                                <select className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-jesa-blue outline-none bg-white transition-all">
                                    {jsa.locations.map(l => <option key={l.name}>{l.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm">
                             <h3 className="text-jesa-blue font-bold mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                Job Details & Team
                             </h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">{t.meta.company}</label>
                                    <input className="w-full p-2 border rounded bg-white text-sm" value={jsa.metadata?.company || ''} onChange={(e) => onUpdateJSA('metadata', {...jsa.metadata, company: e.target.value})} placeholder="e.g. JESA" />
                                </div>
                                <div className="relative">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">{t.meta.project}</label>
                                    <input 
                                        className="w-full p-2 border rounded bg-white text-sm focus:ring-2 focus:ring-jesa-blue outline-none" 
                                        value={jsa.metadata?.project || ''} 
                                        onChange={(e) => {
                                            onUpdateJSA('metadata', {...jsa.metadata, project: e.target.value});
                                            setShowProjectSuggestions(true);
                                        }}
                                        onFocus={() => setShowProjectSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowProjectSuggestions(false), 200)}
                                        placeholder="Type to search projects..." 
                                    />
                                    {showProjectSuggestions && filteredProjects.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 max-h-48 overflow-y-auto bg-white border border-gray-200 shadow-xl rounded-b-lg z-50">
                                            {filteredProjects.map((proj, idx) => (
                                                <div 
                                                    key={idx}
                                                    className="p-2 text-xs hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-none"
                                                    onClick={() => {
                                                        onUpdateJSA('metadata', {...jsa.metadata, project: proj});
                                                        setShowProjectSuggestions(false);
                                                    }}
                                                >
                                                    {proj}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">{t.meta.workOrder}</label>
                                    <input className="w-full p-2 border rounded bg-white text-sm" value={jsa.metadata?.workOrder || ''} onChange={(e) => onUpdateJSA('metadata', {...jsa.metadata, workOrder: e.target.value})} placeholder="WO-123456" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">{t.meta.teamLeader}</label>
                                    <input className="w-full p-2 border rounded bg-white text-sm" value={jsa.metadata?.teamLeader || ''} onChange={(e) => onUpdateJSA('metadata', {...jsa.metadata, teamLeader: e.target.value})} placeholder="Name" />
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-xs font-bold text-gray-500 mb-2">{t.meta.teamMembers}</label>
                                <div className="space-y-2">
                                    {(jsa.metadata?.teamMembers || []).map((member, idx) => (
                                        <div key={idx} className="flex gap-2 group">
                                            <input 
                                                className="w-full p-2 border rounded bg-white text-sm" 
                                                value={member} 
                                                onChange={(e) => {
                                                    const newMembers = [...(jsa.metadata.teamMembers || [])];
                                                    newMembers[idx] = e.target.value;
                                                    onUpdateJSA('metadata', {...jsa.metadata, teamMembers: newMembers});
                                                }}
                                            />
                                            <button 
                                                onClick={() => {
                                                    const newMembers = jsa.metadata.teamMembers.filter((_, i) => i !== idx);
                                                    onUpdateJSA('metadata', {...jsa.metadata, teamMembers: newMembers});
                                                }}
                                                className="bg-red-50 text-red-500 px-3 rounded hover:bg-red-100 transition-colors"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    <button 
                                        onClick={() => onUpdateJSA('metadata', {...jsa.metadata, teamMembers: [...(jsa.metadata.teamMembers || []), '']})}
                                        className="text-xs bg-white border border-blue-300 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-50 w-full transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        Add Team Member / Participant
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
                             <h3 className="text-lg font-bold text-jesa-blue mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                {t.editor.riskMatrix}
                             </h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div>
                                    <h4 className="font-bold text-sm text-gray-500 uppercase mb-3 border-b pb-1">{t.initial}</h4>
                                    <div className="flex gap-4 mb-4">
                                        <div className="flex-1">
                                            <label className="text-xs font-semibold">{t.likelihood} (1-5)</label>
                                            <input type="range" min="1" max="5" value={jsa.initialRisk.likelihood} onChange={(e) => onRiskChange('initialRisk', 'likelihood', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-jesa-blue" />
                                            <div className="text-center font-bold text-lg text-jesa-blue mt-1">{jsa.initialRisk.likelihood}</div>
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs font-semibold">{t.severity} (1-5)</label>
                                            <input type="range" min="1" max="5" value={jsa.initialRisk.severity} onChange={(e) => onRiskChange('initialRisk', 'severity', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-jesa-blue" />
                                            <div className="text-center font-bold text-lg text-jesa-blue mt-1">{jsa.initialRisk.severity}</div>
                                        </div>
                                    </div>
                                    <div className={`p-3 rounded-lg text-center font-bold text-white shadow transition-colors ${jsa.initialRisk.level === 'EXTREME' ? 'bg-red-600' : jsa.initialRisk.level === 'HIGH' ? 'bg-orange-500' : jsa.initialRisk.level === 'MEDIUM' ? 'bg-yellow-500 text-black' : 'bg-green-500'}`}>
                                        Score: {jsa.initialRisk.score} - {jsa.initialRisk.level}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-gray-500 uppercase mb-3 border-b pb-1">{t.residual}</h4>
                                    <div className="flex gap-4 mb-4">
                                        <div className="flex-1">
                                            <label className="text-xs font-semibold">{t.likelihood} (1-5)</label>
                                            <input type="range" min="1" max="5" value={jsa.residualRisk.likelihood} onChange={(e) => onRiskChange('residualRisk', 'likelihood', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-jesa-blue" />
                                            <div className="text-center font-bold text-lg text-jesa-blue mt-1">{jsa.residualRisk.likelihood}</div>
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs font-semibold">{t.severity} (1-5)</label>
                                            <input type="range" min="1" max="5" value={jsa.residualRisk.severity} onChange={(e) => onRiskChange('residualRisk', 'severity', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-jesa-blue" />
                                            <div className="text-center font-bold text-lg text-jesa-blue mt-1">{jsa.residualRisk.severity}</div>
                                        </div>
                                    </div>
                                    <div className={`p-3 rounded-lg text-center font-bold text-white shadow transition-colors ${jsa.residualRisk.level === 'EXTREME' ? 'bg-red-600' : jsa.residualRisk.level === 'HIGH' ? 'bg-orange-500' : jsa.residualRisk.level === 'MEDIUM' ? 'bg-yellow-500 text-black' : 'bg-green-500'}`}>
                                        Score: {jsa.residualRisk.score} - {jsa.residualRisk.level}
                                    </div>
                                </div>
                             </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t.editor.requiredPermits}</label>
                            <div className="flex flex-wrap gap-2">
                                {jsa.requiredPermits.map((permit, idx) => (
                                    <span key={idx} className="flex items-center gap-2 bg-blue-50 text-blue-800 px-3 py-1 rounded-full text-sm border border-blue-200 shadow-sm animate-fadeIn">
                                        {permit}
                                        <button onClick={() => {
                                            const newPermits = jsa.requiredPermits.filter((_, i) => i !== idx);
                                            onUpdateJSA('requiredPermits', newPermits);
                                        }} className="text-blue-500 hover:text-red-500 transition-colors">×</button>
                                    </span>
                                ))}
                                <button 
                                    onClick={() => {
                                        const p = prompt(t.editor.addControl); 
                                        if (p) onUpdateJSA('requiredPermits', [...jsa.requiredPermits, p]);
                                    }}
                                    className="px-3 py-1 rounded-full border border-dashed border-gray-400 text-gray-500 hover:border-jesa-blue hover:text-jesa-blue text-sm transition-all"
                                >
                                    + Add Permit
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'details' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
                            <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center shrink-0">
                                <h3 className="font-bold text-red-800 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    {t.hazards}
                                </h3>
                                <button onClick={() => onUpdateJSA('hazards', [...jsa.hazards, { id: Date.now().toString(), description: 'New Hazard', limit: '' }])} className="text-xs bg-white border border-red-200 text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors shadow-sm">
                                    {t.editor.addHazard}
                                </button>
                            </div>
                            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                                {jsa.hazards.map((h, i) => (
                                    <div key={h.id} className="flex gap-2 items-start group p-1 hover:bg-red-50/50 rounded transition-colors">
                                        <span className="text-gray-400 text-xs mt-2 w-4 text-center">{i+1}.</span>
                                        <div className="flex-1 space-y-1">
                                            <input 
                                                className="w-full text-sm border-b border-transparent focus:border-red-300 outline-none bg-transparent hover:bg-white p-1 transition-all" 
                                                value={h.description}
                                                onChange={(e) => {
                                                    const newHazards = [...jsa.hazards];
                                                    newHazards[i].description = e.target.value;
                                                    onUpdateJSA('hazards', newHazards);
                                                }}
                                            />
                                            <input 
                                                className="w-full text-xs text-red-600 font-mono bg-red-100/30 p-1 rounded border border-transparent focus:border-red-300 outline-none" 
                                                value={h.limit}
                                                placeholder="Limit (e.g., >85dB)"
                                                onChange={(e) => {
                                                    const newHazards = [...jsa.hazards];
                                                    newHazards[i].limit = e.target.value;
                                                    onUpdateJSA('hazards', newHazards);
                                                }}
                                            />
                                        </div>
                                        <button onClick={() => onUpdateJSA('hazards', jsa.hazards.filter((_, idx) => idx !== i))} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity">×</button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
                            <div className="bg-green-50 p-4 border-b border-green-100 flex justify-between items-center shrink-0">
                                <h3 className="font-bold text-green-800 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.040L5 6.257c0 5.308 1.313 10.312 3.656 14.561L12 21l3.344-14.561z" /></svg>
                                    {t.controls}
                                </h3>
                                <button onClick={() => onUpdateJSA('controls', [...jsa.controls, { id: Date.now().toString(), description: 'New Control', type: 'PROCEDURE', standardRef: '' }])} className="text-xs bg-white border border-green-200 text-green-600 px-2 py-1 rounded hover:bg-green-50 transition-colors shadow-sm">
                                    {t.editor.addControl}
                                </button>
                            </div>
                            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                                {jsa.controls.map((c, i) => (
                                    <div key={c.id} className="flex gap-2 items-start group p-1 hover:bg-green-50/50 rounded transition-colors">
                                        <span className="text-gray-400 text-xs mt-2 w-4 text-center">{i+1}.</span>
                                        <div className="flex-1 space-y-1">
                                            <input 
                                                className="w-full text-sm border-b border-transparent focus:border-green-300 outline-none bg-transparent hover:bg-white p-1 transition-all" 
                                                value={c.description}
                                                onChange={(e) => {
                                                    const newControls = [...jsa.controls];
                                                    newControls[i].description = e.target.value;
                                                    onUpdateJSA('controls', newControls);
                                                }}
                                            />
                                            <div className="flex gap-2">
                                                <select 
                                                    className="text-[10px] bg-gray-100 rounded px-1 border-none outline-none cursor-pointer"
                                                    value={c.type}
                                                    onChange={(e) => {
                                                        const newControls = [...jsa.controls];
                                                        newControls[i].type = e.target.value as any;
                                                        onUpdateJSA('controls', newControls);
                                                    }}
                                                >
                                                    <option>PPE</option>
                                                    <option>PROCEDURE</option>
                                                    <option>STANDARD</option>
                                                </select>
                                                <input 
                                                    className="flex-1 text-[10px] text-blue-600 italic outline-none bg-transparent hover:bg-white px-1 transition-all"
                                                    placeholder="Reference (e.g. ISO 45001)"
                                                    value={c.standardRef}
                                                    onChange={(e) => {
                                                        const newControls = [...jsa.controls];
                                                        newControls[i].standardRef = e.target.value;
                                                        onUpdateJSA('controls', newControls);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <button onClick={() => onUpdateJSA('controls', jsa.controls.filter((_, idx) => idx !== i))} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity">×</button>
                                    </div>
                                ))}
                            </div>
                        </div>

                         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden lg:col-span-2 shadow-sm shrink-0">
                            <div className="bg-jesa-blue/5 p-4 border-b border-jesa-blue/10 flex justify-between items-center">
                                <h3 className="font-bold text-jesa-blue flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
                                    {t.tools}
                                </h3>
                                <button onClick={() => onUpdateJSA('tools', [...jsa.tools, { id: Date.now().toString(), name: 'New Tool', brandModel: '' }])} className="text-xs bg-white border border-blue-200 text-jesa-blue px-2 py-1 rounded hover:bg-blue-50 transition-colors shadow-sm">
                                    {t.editor.addTool}
                                </button>
                            </div>
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {jsa.tools.map((tool, i) => (
                                    <div key={tool.id} className="flex flex-col border p-2 rounded bg-gray-50 group relative shadow-inner hover:bg-white transition-all">
                                        <input 
                                            className="font-bold text-sm bg-transparent outline-none w-full border-b border-transparent focus:border-blue-200 mb-1"
                                            value={tool.name}
                                            onChange={(e) => {
                                                const newTools = [...jsa.tools];
                                                newTools[i].name = e.target.value;
                                                onUpdateJSA('tools', newTools);
                                            }}
                                        />
                                        <input 
                                            className="text-[10px] text-gray-500 italic bg-transparent outline-none w-full"
                                            value={tool.brandModel}
                                            placeholder="Brand/Model"
                                            onChange={(e) => {
                                                const newTools = [...jsa.tools];
                                                newTools[i].brandModel = e.target.value;
                                                onUpdateJSA('tools', newTools);
                                            }}
                                        />
                                        <button onClick={() => onUpdateJSA('tools', jsa.tools.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[10px] shadow-lg transition-all">×</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'steps' && (
                    <div className="animate-fadeIn h-full flex flex-col">
                        <div className="flex justify-between items-center mb-4 shrink-0">
                            <h3 className="font-bold text-lg text-gray-700 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                                {t.editor.tabs.steps}
                            </h3>
                            <button onClick={() => onUpdateJSA('steps', [...jsa.steps, { id: jsa.steps.length + 1, description: '', hazardRef: '' }])} className="bg-jesa-blue text-white px-4 py-2 rounded shadow hover:bg-blue-800 text-sm font-bold transition-all flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                {t.editor.addStep}
                            </button>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-grow flex flex-col">
                            <div className="overflow-y-auto custom-scrollbar flex-grow">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold border-b sticky top-0 z-10">
                                        <tr>
                                            <th className="p-4 w-16 text-center">#</th>
                                            <th className={`p-4 ${isRTL ? 'text-right' : 'text-left'}`}>Activity Description</th>
                                            <th className={`p-4 ${isRTL ? 'text-right' : 'text-left'} w-1/3`}>Hazard Reference</th>
                                            <th className="p-4 w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {jsa.steps.map((step, i) => (
                                            <tr key={step.id} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="p-4 text-center font-bold text-gray-400">{i + 1}</td>
                                                <td className="p-4">
                                                    <textarea 
                                                        className="w-full bg-transparent resize-none outline-none text-sm font-medium focus:bg-white focus:ring-1 focus:ring-blue-100 rounded p-1 transition-all"
                                                        rows={2}
                                                        value={step.description}
                                                        onChange={(e) => {
                                                            const newSteps = [...jsa.steps];
                                                            newSteps[i].description = e.target.value;
                                                            onUpdateJSA('steps', newSteps);
                                                        }}
                                                    />
                                                </td>
                                                <td className="p-4">
                                                     <input 
                                                        className="w-full bg-red-50/50 text-red-600 px-2 py-1 rounded border border-transparent focus:border-red-200 focus:bg-white outline-none text-xs transition-all"
                                                        value={step.hazardRef}
                                                        placeholder="Associated Hazard"
                                                        onChange={(e) => {
                                                            const newSteps = [...jsa.steps];
                                                            newSteps[i].hazardRef = e.target.value;
                                                            onUpdateJSA('steps', newSteps);
                                                        }}
                                                    />
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button onClick={() => onUpdateJSA('steps', jsa.steps.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'finish' && (
                    <div className="animate-fadeIn max-w-2xl mx-auto space-y-8 flex flex-col">
                        <div className="text-center">
                            <h3 className="text-2xl font-bold text-jesa-blue mb-2">{t.signatures}</h3>
                            <p className="text-gray-500 text-sm">Sign digitally below to validate the document before export.</p>
                        </div>
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t.preparedBy}</label>
                                <input 
                                    className="w-full p-2 border rounded mb-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none" 
                                    placeholder="Full Name"
                                    value={signatures.creator.name}
                                    onChange={(e) => onUpdateSignature('creator', 'name', e.target.value)}
                                />
                                <SignaturePad 
                                    label="Digital Signature" 
                                    isRTL={isRTL} 
                                    typedName={signatures.creator.name}
                                    onSave={(img) => onUpdateSignature('creator', 'signatureImage', img)} 
                                />
                            </div>
                            <div className="bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t.approvedBy}</label>
                                <input 
                                    className="w-full p-2 border rounded mb-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none" 
                                    placeholder="Full Name (Supervisor)"
                                    value={signatures.supervisor.name}
                                    onChange={(e) => onUpdateSignature('supervisor', 'name', e.target.value)}
                                />
                                <SignaturePad 
                                    label="Digital Signature" 
                                    isRTL={isRTL} 
                                    typedName={signatures.supervisor.name}
                                    onSave={(img) => onUpdateSignature('supervisor', 'signatureImage', img)} 
                                />
                            </div>
                        </div>
                        <button 
                            onClick={onPreview}
                            className="w-full py-4 bg-green-600 text-white font-bold text-xl rounded-xl shadow-lg hover:bg-green-700 transition-all transform hover:scale-[1.01] flex items-center justify-center gap-3"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            {t.editor.previewMode}
                        </button>
                    </div>
                )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-between items-center z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] shrink-0">
                 <button onClick={onClose} className="text-gray-500 font-bold hover:text-red-600 px-4 transition-colors">
                    Close
                 </button>
                 <div className="flex gap-4">
                    {activeTab !== 'finish' && (
                        <button 
                            onClick={() => {
                                if(activeTab === 'general') setActiveTab('details');
                                else if(activeTab === 'details') setActiveTab('steps');
                                else if(activeTab === 'steps') setActiveTab('finish');
                            }}
                            className="bg-jesa-blue text-white px-8 py-3 rounded-lg font-bold shadow hover:bg-blue-800 transition-all active:scale-95"
                        >
                            Next &rarr;
                        </button>
                    )}
                    {activeTab === 'finish' && (
                        <button onClick={onPreview} className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold shadow hover:bg-green-700 transition-all active:scale-95">
                             Preview Document
                        </button>
                    )}
                 </div>
            </div>
        </div>
    );
};

const PreviewMode = ({
    jsa,
    language,
    signatures,
    onEdit,
    onPrint
}: {
    jsa: JSAData,
    language: Language,
    signatures: AppState['signatures'],
    onEdit: () => void,
    onPrint: () => void
}) => {
    const t = TRANSLATIONS[language];
    const isRTL = language === 'ar';

    const PrintHeader = () => (
      <div className="border-b-2 border-jesa-blue pb-2 mb-4 shrink-0">
        <div className="flex justify-between items-end mb-2">
          <div className="flex gap-4 grayscale opacity-80 scale-75 origin-left">
             <JesaLogo /> <OcpLogo /> <WorleyLogo />
          </div>
          <div className="text-right">
             <h1 className="text-2xl font-black text-jesa-blue tracking-tighter">SPA / JSA</h1>
             <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Job Safety Analysis</p>
          </div>
        </div>
        
        <div className="bg-gray-50 border border-gray-300 grid grid-cols-4 text-[9px] box-border">
            <div className="p-1.5 border-r border-b border-gray-300">
                <span className="block font-bold text-gray-500 uppercase">{t.meta.company}</span>
                <span className="font-bold">{jsa.metadata?.company || 'JESA'}</span>
            </div>
            <div className="p-1.5 border-r border-b border-gray-300">
                <span className="block font-bold text-gray-500 uppercase">{t.meta.project}</span>
                <span className="font-bold truncate block">{jsa.metadata?.project || '_________________'}</span>
            </div>
            <div className="p-1.5 border-r border-b border-gray-300">
                <span className="block font-bold text-gray-500 uppercase">{t.meta.workOrder}</span>
                <span className="font-mono">{jsa.metadata?.workOrder || '_________________'}</span>
            </div>
            <div className="p-1.5 border-b border-gray-300">
                <span className="block font-bold text-gray-500 uppercase">{t.date}</span>
                <span className="font-mono">{new Date().toLocaleDateString()}</span>
            </div>
            
            <div className="col-span-2 p-1.5 border-r border-gray-300">
                <span className="block font-bold text-gray-500 uppercase">{t.editor.jobTitle}</span>
                <span className="font-bold text-xs text-jesa-blue leading-tight block truncate">
                    {language === 'ar' ? jsa.title.ar : language === 'fr' ? jsa.title.fr : jsa.title.en}
                </span>
            </div>
             <div className="col-span-2 p-1.5 border-gray-300 flex justify-between items-center gap-2 overflow-hidden">
                 <div className="min-w-0">
                    <span className="block font-bold text-gray-500 uppercase">{t.location}</span>
                    <span className="font-bold truncate block">{jsa.locations[0].name}</span>
                 </div>
                 <div className="min-w-0 text-right">
                     <span className="block font-bold text-gray-500 uppercase">{t.meta.teamLeader}</span>
                     <span className="font-bold truncate block">{jsa.metadata?.teamLeader || '_________________'}</span>
                 </div>
            </div>
        </div>
      </div>
    );

    const RiskMatrix = ({ initial }: { initial: boolean }) => {
        const risk = initial ? jsa.initialRisk : jsa.residualRisk;
        const color = risk.level === 'EXTREME' ? 'bg-red-600 text-white' 
            : risk.level === 'HIGH' ? 'bg-orange-500 text-white'
            : risk.level === 'MEDIUM' ? 'bg-yellow-400 text-black'
            : 'bg-green-500 text-white';

        return (
            <div className={`border border-black/10 p-2 text-center ${color} text-xs h-full flex flex-col justify-between shadow-sm`}>
                <div className="font-bold uppercase mb-1 border-b border-black/10 pb-0.5 text-[9px]">{initial ? t.initial : t.residual}</div>
                <div className="grid grid-cols-3 gap-0.5 my-1 items-center">
                    <div><span className="block text-[8px] opacity-80 leading-none">{t.likelihood[0]}</span><span className="font-black text-base">{risk.likelihood}</span></div>
                    <div className="text-sm opacity-50">×</div>
                    <div><span className="block text-[8px] opacity-80 leading-none">{t.severity[0]}</span><span className="font-black text-base">{risk.severity}</span></div>
                </div>
                <div className="font-black text-base tracking-widest border-t border-black/10 pt-0.5 leading-none">{risk.score}</div>
                <div className="text-[8px] font-bold tracking-wider leading-none mt-0.5">{risk.level}</div>
            </div>
        )
    }

    return (
      <div className={`min-h-screen bg-slate-200 py-8 px-4 flex flex-col items-center gap-8 ${isRTL ? 'text-right' : 'text-left'} overflow-y-auto`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="fixed top-24 right-8 flex flex-col gap-3 print:hidden z-50">
            <button onClick={onEdit} className="bg-white text-gray-700 p-4 rounded-full shadow-2xl hover:bg-gray-50 border border-gray-100 transition-all hover:scale-110 active:scale-95 group" title="Edit">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button onClick={onPrint} className="bg-jesa-blue text-white p-4 rounded-full shadow-2xl hover:bg-blue-800 transition-all hover:scale-110 active:scale-95 group relative" title="Download PDF / Print">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                <span className="absolute right-full mr-3 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 whitespace-nowrap shadow-xl transition-opacity pointer-events-none">{t.print}</span>
            </button>
        </div>

        {/* --- PAGE 1 --- */}
        <div id="printArea" className="w-[210mm] h-[297mm] bg-white shadow-2xl p-[10mm] text-xs leading-tight flex flex-col overflow-hidden shrink-0 border border-gray-200 box-border">
          
          <PrintHeader />

          <div className="grid grid-cols-12 gap-2 mb-3 shrink-0">
             <div className="col-span-9">
                 <div className="mb-2">
                    <h2 className="bg-gray-800 text-white px-2 py-1 font-bold uppercase text-[9px] tracking-wider mb-1 flex justify-between items-center">
                        <span>{t.tools}</span>
                        <span className="opacity-50 text-[7px] uppercase tracking-widest">Equipment List</span>
                    </h2>
                    <div className="grid grid-cols-4 gap-1 h-[64px] overflow-hidden">
                        {jsa.tools.slice(0, 8).map((tool) => (
                            <div key={tool.id} className="border p-1 rounded-sm bg-gray-50/50 border-gray-200 flex flex-col justify-center">
                                <div className="font-bold text-[8px] leading-tight truncate">{tool.name}</div>
                                <div className="text-gray-500 text-[7px] font-mono truncate">{tool.brandModel}</div>
                            </div>
                        ))}
                    </div>
                 </div>
                 <div>
                     <h2 className="bg-blue-800 text-white px-2 py-1 font-bold uppercase text-[9px] tracking-wider mb-1">{t.meta.teamMembers}</h2>
                     <div className="flex flex-wrap gap-1 h-[40px] overflow-hidden content-start">
                         {jsa.metadata?.teamMembers && jsa.metadata.teamMembers.length > 0 ? jsa.metadata.teamMembers.map((member, i) => (
                             <span key={i} className="border border-gray-200 px-1.5 py-0.5 rounded text-[8px] font-medium bg-gray-50">{member}</span>
                         )) : <span className="text-gray-300 italic text-[8px]">No team members listed</span>}
                     </div>
                 </div>
             </div>
             <div className="col-span-3 flex gap-1 h-28">
                 <div className="flex-1"><RiskMatrix initial={true} /></div>
                 <div className="flex-1"><RiskMatrix initial={false} /></div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4 flex-grow overflow-hidden mb-2">
             <div className="flex flex-col h-full overflow-hidden">
                 <h2 className="bg-jesa-orange text-white px-2 py-1 font-bold uppercase text-[9px] mb-1 shrink-0">{t.hazards}</h2>
                 <div className="border-t-2 border-jesa-orange flex-grow overflow-hidden">
                    {jsa.hazards.slice(0, 12).map((h, i) => (
                        <div key={h.id} className="flex gap-2 border-b border-gray-100 py-1 items-start">
                            <span className="font-bold text-jesa-orange w-3 flex-shrink-0 text-[9px]">{i + 1}.</span>
                            <div className="min-w-0 flex-grow">
                                <div className="font-bold text-gray-800 text-[9px] leading-tight break-words">{h.description}</div>
                                {h.limit && <div className="text-[7px] text-red-600 font-mono inline-block bg-red-50 px-1 rounded-sm mt-0.5 border border-red-100">{h.limit}</div>}
                            </div>
                        </div>
                    ))}
                 </div>
             </div>
             <div className="flex flex-col h-full overflow-hidden">
                <h2 className="bg-green-600 text-white px-2 py-1 font-bold uppercase text-[9px] mb-1 shrink-0">{t.controls}</h2>
                <div className="border-t-2 border-green-600 flex-grow overflow-hidden">
                    {jsa.controls.slice(0, 12).map((c, i) => (
                        <div key={c.id} className="flex gap-2 border-b border-gray-100 py-1 items-start">
                            <span className="font-bold text-green-700 w-3 flex-shrink-0 text-[9px]">{i + 1}.</span>
                            <div className="min-w-0 flex-grow">
                                <div className="font-bold text-gray-800 text-[9px] leading-tight break-words">{c.description}</div>
                                <div className="flex gap-1 text-[7px] mt-0.5">
                                    <span className="bg-gray-100 px-1 rounded border border-gray-200 text-gray-600 uppercase tracking-tighter">{c.type}</span>
                                    {c.standardRef && <span className="text-blue-600 italic font-medium truncate">{c.standardRef}</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                 </div>
             </div>
          </div>
          
          <div className="text-[8px] text-gray-400 flex justify-between items-center border-t pt-2 shrink-0">
              <div className="font-mono">DOC REF: JESA-HSE-SPA-{jsa.id.slice(-6).toUpperCase()}</div>
              <div>Page 1/2</div>
          </div>
        </div>

        {/* --- PAGE 2 --- */}
        <div id="printArea2" className="w-[210mm] h-[297mm] bg-white shadow-2xl p-[10mm] text-xs leading-tight flex flex-col overflow-hidden shrink-0 border border-gray-200 box-border">
          
          <div className="flex justify-between items-center border-b-2 border-gray-200 pb-2 mb-4 shrink-0">
             <div className="flex gap-2 grayscale opacity-60 h-6">
                <JesaLogo /> <OcpLogo /> <WorleyLogo />
             </div>
             <span className="font-black text-jesa-blue text-lg tracking-tighter uppercase italic">Work Execution Plan</span>
             <span className="text-[9px] font-mono text-gray-400">Ver: 2025.1</span>
          </div>

          <div className="mb-4 flex-grow overflow-hidden flex flex-col">
            <table className="w-full text-left border-collapse border border-gray-300 table-fixed">
                <thead>
                    <tr className="bg-jesa-blue text-white text-[9px] uppercase tracking-wider shrink-0">
                        <th className="p-1 border border-blue-800 w-6 text-center">#</th>
                        <th className={`p-1 border border-blue-800 ${isRTL ? 'text-right' : 'text-left'}`}>Activity Step / Sequential Procedure</th>
                        <th className={`p-1 border border-blue-800 w-1/4 ${isRTL ? 'text-right' : 'text-left'}`}>Hazards Linked</th>
                        <th className="p-1 border border-blue-800 w-10 text-center">Sign</th>
                    </tr>
                </thead>
                <tbody className="overflow-hidden">
                    {jsa.steps.slice(0, 16).map((step) => (
                        <tr key={step.id} className="border-b border-gray-200 text-[9px] h-11">
                            <td className="p-1 border-r border-gray-200 text-center font-bold text-gray-400">{step.id}</td>
                            <td className="p-1 border-r border-gray-200 font-medium leading-tight align-middle break-words">{step.description}</td>
                            <td className="p-1 border-r border-gray-200 text-[8px] text-red-700 bg-red-50/20 leading-tight align-middle italic">{step.hazardRef}</td>
                            <td className="p-1 text-center align-middle">
                                <div className="w-4 h-4 border border-gray-300 rounded inline-block bg-gray-50"></div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>

           <div className="mt-auto shrink-0">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-2 bg-red-50 border border-red-100 rounded shadow-inner">
                        <h3 className="font-black text-red-700 mb-1 uppercase text-[9px] flex items-center gap-1.5">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            {t.emergency}
                        </h3>
                        <div className="text-[8px] space-y-1">
                            <div className="flex justify-between border-b border-red-100 pb-0.5">
                                <span className="text-red-900">Emergency Hub (Ambulance)</span>
                                <span className="font-mono font-bold text-red-600">{jsa.locations[0].emergencyPhone}</span>
                            </div>
                            <div className="flex justify-between border-b border-red-100 pb-0.5">
                                <span className="text-red-900">Fire Safety Center</span>
                                <span className="font-mono font-bold text-red-600">INT: 5555 / 150</span>
                            </div>
                            <div className="flex justify-between pt-0.5">
                                <span className="text-red-900">Muster Assembly Point</span>
                                <span className="font-bold text-red-600">{jsa.locations[0].musterPoint}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-2 bg-gray-50 border border-gray-200 rounded flex flex-col justify-between shadow-inner">
                        <div>
                            <h3 className="font-bold text-gray-700 mb-1 uppercase text-[9px] border-b pb-0.5">Active Permits Required</h3>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {jsa.requiredPermits.map(p => (
                                    <span key={p} className="bg-white border border-gray-200 px-1 py-0.5 rounded-[2px] text-[7px] font-black text-blue-800 uppercase">{p}</span>
                                ))}
                                {jsa.requiredPermits.length === 0 && <span className="text-[7px] text-gray-400 italic">No special permits indicated</span>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border border-gray-300 rounded p-3 bg-gray-50 shadow-sm">
                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-1 border-r border-gray-200 pr-2">
                            <p className="text-[8px] font-bold text-gray-400 uppercase mb-4 tracking-tighter">{t.preparedBy}</p>
                            <div className="h-10 flex items-center justify-center">
                                {signatures.creator.signatureImage ? (
                                    <img src={signatures.creator.signatureImage} className="h-full object-contain mix-blend-multiply" alt="Sig" />
                                ) : signatures.creator.name ? (
                                    <div className="text-xl text-blue-900 transform -rotate-2 leading-none" style={{ fontFamily: "'Great Vibes', cursive" }}>
                                        {signatures.creator.name}
                                    </div>
                                ) : <div className="h-px w-full bg-gray-200 opacity-50"></div>}
                            </div>
                            <div className="border-t border-gray-300 pt-1 text-center mt-1">
                                <p className="font-bold text-[8px] uppercase">{signatures.creator.name || 'Sign Above'}</p>
                            </div>
                        </div>
                        <div className="col-span-1 border-r border-gray-200 pr-2">
                            <p className="text-[8px] font-bold text-gray-400 uppercase mb-4 tracking-tighter">{t.approvedBy}</p>
                            <div className="h-10 flex items-center justify-center">
                                {signatures.supervisor.signatureImage ? (
                                    <img src={signatures.supervisor.signatureImage} className="h-full object-contain mix-blend-multiply" alt="Sig" />
                                ) : signatures.supervisor.name ? (
                                    <div className="text-xl text-blue-900 transform -rotate-2 leading-none" style={{ fontFamily: "'Great Vibes', cursive" }}>
                                        {signatures.supervisor.name}
                                    </div>
                                ) : <div className="h-px w-full bg-gray-200 opacity-50"></div>}
                            </div>
                            <div className="border-t border-gray-300 pt-1 text-center mt-1">
                                <p className="font-bold text-[8px] uppercase">{signatures.supervisor.name || 'Sign Above'}</p>
                            </div>
                        </div>
                        <div className="col-span-2 flex flex-col justify-center items-center">
                            <div className="text-center group">
                                <p className="text-2xl text-jesa-blue/90 mb-1 transform -rotate-1 tracking-tight" style={{ fontFamily: "'Great Vibes', cursive" }}>BIROUK Salima</p>
                                <p className="text-[9px] uppercase font-black tracking-widest text-slate-800 leading-none">HSE Operations Manager - Corporate</p>
                                <p className="text-[7px] text-gray-400 uppercase tracking-[0.2em] mt-1.5 font-bold">Authenticated JESA • OCP Group • Worley Ecosystem</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex justify-between items-center text-[7px] text-gray-400 mt-2 font-mono px-1">
                    <div>SECURE DIGITAL ID: {jsa.id.toUpperCase()}</div>
                    <div className="font-sans uppercase font-bold tracking-tighter">Page 2/2</div>
                </div>
           </div>
        </div>
      </div>
    );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentJSA: null,
    language: 'ar', 
    mode: 'search',
    signatures: {
      creator: { name: '', role: '', date: '', signatureImage: null },
      supervisor: { name: '', role: '', date: '', signatureImage: null },
      manager: { name: '', role: '', date: '', signatureImage: null }
    },
    isLoading: false,
  });

  const [activeTab, setActiveTab] = useState<'general' | 'details' | 'steps' | 'finish'>('general');

  const handleSearch = async (query: string) => {
    if (!query) return;

    setState(prev => ({ ...prev, isLoading: true }));
    try {
        const aiJSA = await generateJSAFromAI(query, state.language);
        setState(prev => ({ ...prev, currentJSA: aiJSA, mode: 'edit', isLoading: false }));
        setActiveTab('general');
    } catch (error) {
        // Safe fallback in case of API failure
        const fallback = JSON.parse(JSON.stringify(SEED_JOBS[0]));
        fallback.title.en = query;
        fallback.title.fr = query;
        fallback.title.ar = query;
        fallback.id = "local-" + Date.now();
        setState(prev => ({ ...prev, currentJSA: fallback, mode: 'edit', isLoading: false }));
        setActiveTab('general');
    }
  };

  const handleUpdateJSA = (field: keyof JSAData, value: any) => {
    if (!state.currentJSA) return;
    setState(prev => ({
      ...prev,
      currentJSA: { ...prev.currentJSA!, [field]: value }
    }));
  };

  const handleUpdateSignature = (role: keyof AppState['signatures'], field: keyof SignatureData, value: string | null) => {
      setState(prev => ({
          ...prev,
          signatures: {
              ...prev.signatures,
              [role]: {
                  ...prev.signatures[role],
                  [field]: value
              }
          }
      }));
  };

  const handleRiskChange = (type: 'initialRisk' | 'residualRisk', field: 'likelihood' | 'severity', value: number) => {
    if (!state.currentJSA) return;
    const currentRisk = state.currentJSA[type];
    const newLikelihood = field === 'likelihood' ? value : currentRisk.likelihood;
    const newSeverity = field === 'severity' ? value : currentRisk.severity;
    const newScore = newLikelihood * newSeverity;

    setState(prev => ({
      ...prev,
      currentJSA: {
        ...prev.currentJSA!,
        [type]: {
          likelihood: newLikelihood,
          severity: newSeverity,
          score: newScore,
          level: calculateRiskLevel(newScore)
        }
      }
    }));
  };

  const handleExportPDF = () => {
    if (!window.jspdf || !window.html2canvas) {
        alert('Required PDF libraries are not fully loaded. Please wait a moment.');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    const p1 = document.getElementById('printArea');
    const p2 = document.getElementById('printArea2');

    if (!p1 || !p2) return;

    setState(p => ({...p, isLoading: true}));

    const options = {
        scale: 3, // High quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
    };

    window.html2canvas(p1, options).then((canvas1: HTMLCanvasElement) => {
        const imgData1 = canvas1.toDataURL('image/jpeg', 0.95);
        doc.addImage(imgData1, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        
        doc.addPage();
        
        window.html2canvas(p2, options).then((canvas2: HTMLCanvasElement) => {
            const imgData2 = canvas2.toDataURL('image/jpeg', 0.95);
            doc.addImage(imgData2, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
            
            const jobTitle = state.currentJSA?.title.en || 'JSA';
            const fileName = `JESA_SPA_JSA_${jobTitle.replace(/[^a-z0-9]/gi, '_').toUpperCase()}_${new Date().getTime()}.pdf`;
            doc.save(fileName);
            setState(p => ({...p, isLoading: false}));
        });
    });
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar 
          mode={state.mode} 
          setMode={(m) => setState(p => ({...p, mode: m}))}
          language={state.language}
          setLanguage={(l) => setState(p => ({...p, language: l}))}
          isRTL={state.language === 'ar'}
      />

      <main className="flex-grow flex flex-col relative">
          {state.mode === 'search' && (
              <SearchMode 
                language={state.language} 
                onSearch={handleSearch} 
                isLoading={state.isLoading}
                onSeedSelect={(job) => {
                    setState(prev => ({...prev, currentJSA: JSON.parse(JSON.stringify(job)), mode: 'edit'}));
                    setActiveTab('general');
                }}
              />
          )}

          {state.mode === 'edit' && state.currentJSA && (
              <EditorView 
                jsa={state.currentJSA}
                language={state.language}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onUpdateJSA={handleUpdateJSA}
                onRiskChange={handleRiskChange}
                signatures={state.signatures}
                onUpdateSignature={handleUpdateSignature}
                onClose={() => setState(prev => ({...prev, mode: 'search', currentJSA: null}))}
                onPreview={() => setState(prev => ({...prev, mode: 'preview'}))}
              />
          )}

          {state.mode === 'preview' && state.currentJSA && (
              <PreviewMode 
                jsa={state.currentJSA}
                language={state.language}
                signatures={state.signatures}
                onEdit={() => setState(prev => ({...prev, mode: 'edit'}))}
                onPrint={handleExportPDF}
              />
          )}
      </main>

      {state.isLoading && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[100] flex flex-col items-center justify-center animate-fadeIn">
            <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
                <div className="relative w-16 h-16 mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-t-jesa-orange animate-spin"></div>
                </div>
                <p className="text-jesa-blue font-black tracking-tight uppercase text-sm animate-pulse">
                    {TRANSLATIONS[state.language].loading}
                </p>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
