import { useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowUpRight, Check, ChevronDown, Code2, Copy, Download, ImagePlus, Layers3, Menu, MessageSquare, Moon, Palette, Plus, RefreshCw, Sparkles, Sun, Trash2, WandSparkles, X } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const starters = [
  { icon: Sparkles, title: 'Find a fresh perspective', text: 'Help me brainstorm ideas for a creative side project.', label: 'Brainstorm something new', color: 'peach' },
  { icon: Code2, title: 'Make the complex, simple', text: 'Explain how large language models work using a simple analogy.', label: 'Learn something interesting', color: 'lavender' },
  { icon: Palette, title: 'Give your ideas a voice', text: 'Help me write a compelling introduction for my portfolio.', label: 'Write with a little more spark', color: 'sage' },
];
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Browser storage is optional. */ } }
const uid = () => crypto.randomUUID();
async function api(path, data) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 100000);
  try {
    const res = await fetch(`/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: controller.signal });
    let json; try { json = await res.json(); } catch { throw new Error('The server returned an unexpected response. Check that the FastAPI backend is running.'); }
    if (!res.ok) throw new Error(typeof json.detail === 'string' ? json.detail : 'Please check your input and try again.');
    return json;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The request timed out. Please try again.');
    if (error instanceof TypeError) throw new Error('Could not connect. Check your connection and that the backend is running.');
    throw error;
  } finally { clearTimeout(timer); }
}
function download(blob, name) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function useSvgUrl(svg) {
  const [url, setUrl] = useState('');
  useEffect(() => { if (!svg) { setUrl(''); return; } const next = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); setUrl(next); return () => URL.revokeObjectURL(next); }, [svg]);
  return url;
}
function Mark({ small = false }) { return <div className={`brand-mark ${small ? 'small' : ''}`}><Layers3 size={small ? 18 : 24} strokeWidth={1.8}/></div>; }
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return <button className="icon-button" aria-label={copied ? 'Copied' : 'Copy response'} onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); } }}>{copied ? <Check size={15}/> : <Copy size={15}/>}</button>;
}

export default function App() {
  const [page, setPage] = useState(location.pathname === '/images' ? 'images' : 'chat');
  const [theme, setTheme] = useState(() => read('forma-theme', 'light'));
  const [chats, setChats] = useState(() => { const stored = read('forma-chats', []); return Array.isArray(stored) ? stored.filter(c => c && typeof c.id === 'string' && Array.isArray(c.messages)) : []; });
  const [active, setActive] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [configured, setConfigured] = useState(null);
  const end = useRef(null);
  const chat = chats.find(c => c.id === active);
  useEffect(() => { document.documentElement.dataset.theme = theme; save('forma-theme', theme); }, [theme]);
  useEffect(() => save('forma-chats', chats), [chats]);
  useEffect(() => { fetch('/api/health').then(r => r.ok ? r.json() : Promise.reject()).then(r => setConfigured(r.configured)).catch(() => setConfigured(false)); }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat?.messages.length, busy]);
  useEffect(() => { const pop = () => { setPage(location.pathname === '/images' ? 'images' : 'chat'); setMobileOpen(false); }; window.addEventListener('popstate', pop); return () => window.removeEventListener('popstate', pop); }, []);
  function navigate(next) { setPage(next); history.pushState({}, '', next === 'images' ? '/images' : '/'); setMobileOpen(false); setError(''); }
  function newChat() { if (busy) return; setActive(null); setInput(''); navigate('chat'); }
  async function send(event, preset) {
    event?.preventDefault();
    const content = (preset ?? input).trim(); if (!content || busy) return;
    const id = active || uid();
    const messages = [...(chat?.messages || []), { role: 'user', content }];
    if (messages.length > 59) { setError('This conversation has reached its limit. Start a new chat to continue.'); return; }
    setActive(id); setInput(''); setBusy(true); setError('');
    if (!active) setChats(old => [{ id, title: content.slice(0, 45), messages }, ...old]);
    else setChats(old => old.map(c => c.id === id ? { ...c, messages } : c));
    try {
      const result = await api('chat', { messages });
      setChats(old => old.map(c => c.id === id ? { ...c, messages: [...messages, { role: 'assistant', content: result.content }] } : c));
    } catch (e) {
      setError(e.message); setInput(content);
      setChats(old => old.map(c => c.id === id ? { ...c, messages: messages.slice(0, -1) } : c));
    } finally { setBusy(false); }
  }
  return <div className="app-shell">
    {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)}/>}
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <a className="brand" href="/" onClick={e => { e.preventDefault(); navigate('chat'); }}><Mark/><span>forma<span className="brand-dot">.</span></span></a>
      <div className="workspace-label">YOUR CREATIVE WORKSPACE</div>
      <nav className="navigation" aria-label="Main navigation">
        <button className={page === 'chat' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('chat')}><MessageSquare size={19}/><span>AI Chat</span><span className="nav-shortcut">01</span></button>
        <button className={page === 'images' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('images')}><ImagePlus size={19}/><span>Image Studio</span><span className="nav-shortcut">02</span></button>
      </nav>
      <button className="new-chat" onClick={newChat} disabled={busy}><Plus size={18}/> New conversation</button>
      <div className="history-heading">RECENT CONVERSATIONS <span>{chats.length}</span></div>
      <div className="chat-history">{chats.length ? chats.map(c => <div className={`history-row ${active === c.id && page === 'chat' ? 'selected' : ''}`} key={c.id}><button disabled={busy} onClick={() => { setActive(c.id); setInput(''); navigate('chat'); }}><MessageSquare size={15}/><span>{c.title}</span></button><button className="delete-chat" disabled={busy} aria-label={`Delete ${c.title}`} onClick={() => { setChats(old => old.filter(x => x.id !== c.id)); if (active === c.id) setActive(null); }}><Trash2 size={13}/></button></div>) : <p className="history-empty">A little space for your big ideas.<br/>Your conversations will appear here.</p>}</div>
      <div className="sidebar-bottom">
        <div className="model-card"><div className="model-icon"><Sparkles size={17}/></div><div><strong>Powered by GPT-4o</strong><p>Connected through Azure OpenAI</p></div><span className={`status-dot ${configured ? 'online' : ''}`} title={configured ? 'Backend configured' : 'Backend setup required'}/></div>
        <button className="theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={17}/> : <Sun size={17}/>}<span>{theme === 'light' ? 'Dark' : 'Light'} appearance</span><span className="toggle-track"><span/></span></button>
        <div className="profile"><div className="avatar">Y</div><div><strong>Your workspace</strong><p>Make room for possibility</p></div><span className="profile-badge">LOCAL</span></div>
      </div>
    </aside>
    <main className="main-panel">
      <header className="topbar"><div className="topbar-title"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={22}/></button><span>{page === 'chat' ? 'AI Chat' : 'Image Studio'}</span><span className="header-slash">/</span><span className="muted">{page === 'chat' ? 'A space to think bigger' : 'From a thought to a thousand shapes'}</span></div><div className="model-pill"><span className="status-dot online"/> GPT-4o <ChevronDown size={13}/></div></header>
      {page === 'chat' ? <div className={`chat-page ${chat?.messages.length ? 'has-messages' : ''}`}>
        {chat?.messages.length ? <div className="messages">{chat.messages.map((message, i) => <article className={`message ${message.role}`} key={i}><div className="message-avatar">{message.role === 'assistant' ? <Mark small/> : 'Y'}</div><div className="message-body"><div className="message-name">{message.role === 'assistant' ? 'Forma' : 'You'}</div><div className="markdown"><Markdown remarkPlugins={[remarkGfm]} components={{ a: props => <a {...props} target="_blank" rel="noopener noreferrer"/> }}>{message.content}</Markdown></div>{message.role === 'assistant' && <CopyButton text={message.content}/>}</div></article>)}{busy && <div className="thinking" role="status"><Mark small/><span>Thinking with you</span><span className="typing-dots"><i/><i/><i/></span></div>}<div ref={end}/></div> : <div className="welcome">
          <div className="welcome-badge"><span/> A LITTLE CURIOSITY. ENDLESS POSSIBILITY.</div>
          <div className="welcome-symbol"><Sparkles size={36} strokeWidth={1.2}/><span className="sparkle-mini">✦</span></div>
          <h1>Good things start<br/>with <span>a conversation.</span></h1>
          <p className="welcome-description">A thought partner for your everyday. Ask a question, explore an idea,<br className="desktop-break"/> or create something you haven’t imagined yet.</p>
          <div className="starter-grid">{starters.map(s => <button key={s.title} className="starter-card" disabled={busy} onClick={() => send(null, s.text)}><span className={`starter-icon ${s.color}`}><s.icon size={20}/></span><strong>{s.title}</strong><span className="starter-label">{s.label}<ArrowUpRight size={16}/></span></button>)}</div>
          <button className="studio-link" onClick={() => navigate('images')}><span className="mini-art">✳</span><span>More of a visual thinker? <strong>Meet your Image Studio</strong></span><ArrowUpRight size={16}/></button>
        </div>}
        <div className="composer-wrap">{error && <div className="error-banner" role="alert">{error}<button aria-label="Dismiss error" onClick={() => setError('')}><X size={16}/></button></div>}<form className="composer" onSubmit={send}><textarea aria-label="Your message" placeholder="What’s on your mind?" rows={2} maxLength={24000} value={input} disabled={busy} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(e); } }}/><div className="composer-bottom"><span><Sparkles size={14}/> A little help. A lot of possibility.</span><button className="send-button" aria-label="Send message" disabled={busy || !input.trim()}>{busy ? <span className="spinner"/> : <ArrowUp size={20}/>}</button></div></form><p className="disclaimer">Powered by Azure GPT-4o. AI can make mistakes. Always give important details a second look.</p></div>
      </div> : <ImageStudio/>}
    </main>
  </div>;
}

function ImageStudio() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('Illustration');
  const [ratio, setRatio] = useState('1:1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [art, setArt] = useState(null);
  const [showCode, setShowCode] = useState(false);
  const [exporting, setExporting] = useState(false);
  const url = useSvgUrl(art?.svg);
  async function generate(e) {
    e?.preventDefault(); if (busy || prompt.trim().length < 3) return;
    setError(''); setBusy(true);
    try { setArt(await api('images', { prompt: prompt.trim(), style, ratio })); setShowCode(false); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function png() {
    setExporting(true); setError('');
    try {
      const img = new Image(); img.src = url; await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const context = canvas.getContext('2d'); if (!context) throw new Error(); context.drawImage(img, 0, 0);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error(); download(blob, 'forma-artwork.png');
    } catch { setError('PNG export failed. Please try downloading the SVG instead.'); } finally { setExporting(false); }
  }
  const suggestions = [ ['Desert daydream', 'A dreamy desert landscape with terracotta dunes, a golden sun, a tiny sage green cactus, and a warm cream sky. Minimal editorial vector illustration.'], ['A little cosmic', 'A cute astronaut tending a tiny garden on the moon, with pastel planets, stars and a midnight blue sky. Playful cartoon vector illustration.'], ['Less, but better', 'A minimal geometric logo for a botanical design studio called Fern, using an elegant leaf symbol and forest green on ivory.'] ];
  return <div className="studio-page">
    <div className="studio-heading"><div><div className="eyebrow"><WandSparkles size={15}/> IMAGINATION, IN FULL COLOR</div><h1>Your words. <span>A work of art.</span></h1><p>Turn a spark of an idea into something beautifully vector.</p></div><span className="vector-badge"><Layers3 size={15}/> 100% vector</span></div>
    <div className="studio-grid"><section className="studio-controls"><form onSubmit={generate}><div className="section-label"><span className="step">01</span><h2>Describe your vision</h2></div><label className="field-label" htmlFor="art-prompt">What would you like to create?</label><textarea id="art-prompt" className="prompt-input" placeholder="A quiet mountain cabin beside a lake, soft sunrise colors, a few pine trees…" maxLength={3000} value={prompt} onChange={e => setPrompt(e.target.value)} disabled={busy}/><div className="character-count">A few thoughtful details go a long way <span>{prompt.length}/3000</span></div><label className="field-label">Make it your style</label><div className="style-options">{['Illustration', 'Logo', 'Icon', 'Cartoon'].map(s => <button type="button" disabled={busy} className={style === s ? 'chosen' : ''} key={s} onClick={() => setStyle(s)}>{s}</button>)}</div><label className="field-label" htmlFor="ratio">Canvas proportions</label><select id="ratio" value={ratio} onChange={e => setRatio(e.target.value)} disabled={busy}><option value="1:1">Square · 1:1</option><option value="4:3">Landscape · 4:3</option><option value="3:4">Portrait · 3:4</option></select><button className="primary-button generate-button" disabled={busy || prompt.trim().length < 3}>{busy ? <><span className="spinner"/> Bringing your idea to life…</> : <><WandSparkles size={18}/>{art ? 'Generate new artwork' : 'Generate artwork'}<ArrowUpRight size={17}/></>}</button></form><div className="inspiration"><div className="field-label">NEED A LITTLE INSPIRATION?</div>{suggestions.map(([title, text], i) => <button disabled={busy} key={title} onClick={() => setPrompt(text)}><span className={`suggestion-dot dot-${i}`}/>{title}<ArrowUpRight size={14}/></button>)}</div><div className="vector-note"><Sparkles size={18}/><p><strong>Think shapes, not snapshots.</strong> GPT-4o writes SVG code to create illustrations, logos, icons, and simple vector art. It’s not designed for photorealistic images.</p></div></section>
      <section className="preview-section"><div className="preview-toolbar"><div className="section-label"><span className="step">02</span><h2>Your canvas</h2></div><div className="preview-tabs"><button className={!showCode ? 'selected' : ''} onClick={() => setShowCode(false)}>Preview</button><button disabled={!art} className={showCode ? 'selected' : ''} onClick={() => setShowCode(true)}><Code2 size={14}/> Code</button></div></div><div className={`art-canvas ${busy ? 'is-loading' : ''}`}>
        {busy ? <div className="canvas-empty" role="status"><div className="generating-orbit"><WandSparkles size={32}/></div><h3>A little imagination at work.</h3><p>GPT-4o is composing your vector artwork.<br/>Good details take a moment.</p><span className="typing-dots"><i/><i/><i/></span></div> : art ? showCode ? <pre className="svg-code"><code>{art.svg}</code></pre> : <img className="generated-image" src={url} alt={art.description}/> : <div className="canvas-empty"><div className="empty-illustration"><span className="illustration-sun"/><span className="illustration-hill back"/><span className="illustration-hill front"/><span className="illustration-spark">✦</span></div><h3>Every great image starts with an idea.</h3><p>Describe yours, choose a style, and watch it take shape.<br/>Your next creation belongs right here.</p><span className="canvas-tag">A BLANK CANVAS. A WORLD OF POSSIBILITY.</span></div>}
      </div>{error && <div className="error-banner" role="alert">{error}<button aria-label="Dismiss error" onClick={() => setError('')}><X size={16}/></button></div>}{art && <div className="art-details"><div className="art-title"><h3>{art.title}</h3><span className="vector-badge">SVG artwork</span></div><p>{art.description}</p><div className="download-actions"><button className="primary-button" disabled={busy} onClick={() => download(new Blob([art.svg], { type: 'image/svg+xml' }), 'forma-artwork.svg')}><Download size={16}/> Download SVG</button><button className="secondary-button" disabled={busy || exporting || !url} onClick={png}><Download size={16}/> {exporting ? 'Exporting…' : 'Download PNG'}</button><button className="regenerate-button" disabled={busy || prompt.trim().length < 3} onClick={generate}><RefreshCw size={16}/> Regenerate</button></div></div>}<div className="canvas-caption"><span><Check size={13}/> Sanitized for a safer preview</span><span>Made with Azure GPT-4o</span></div></section></div>
  </div>;
}
