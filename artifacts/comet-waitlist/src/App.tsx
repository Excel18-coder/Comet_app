import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  Cloud,
  Code2,
  Command,
  Copy,
  FileArchive,
  Folder,
  Globe2,
  Laptop,
  Layers3,
  Menu,
  Orbit,
  PanelTop,
  Radio,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

type Platform = '' | 'macOS' | 'Windows' | 'iPhone' | 'Android' | 'Web';
type FormStatus = 'idle' | 'loading' | 'success' | 'duplicate' | 'error';

const navItems = [
  { label: 'How it works', target: 'how-it-works' },
  { label: 'For your setup', target: 'for-you' },
  { label: 'Coming soon', target: 'coming-soon' },
  { label: 'FAQ', target: 'faq' },
];

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <a
      href="#top"
      className={`flex w-fit items-center gap-2.5 ${inverse ? 'text-[#f7f3e8]' : 'text-[#152752]'}`}
      data-testid="link-logo"
      aria-label="Comet home"
    >
      <span className={`grid h-8 w-8 place-items-center rounded-full ${inverse ? 'bg-[#ff7c67]' : 'bg-[#3558dc]'}`}>
        <Orbit size={18} strokeWidth={2.5} className="text-[#f7f3e8]" />
      </span>
      <span className="font-display text-[1.15rem] font-bold tracking-[-0.045em]">Comet</span>
    </a>
  );
}

function StatusMessage({ status }: { status: FormStatus }) {
  if (status === 'success') {
    return (
      <div className="flex items-start gap-2 text-sm text-[#204f43]" role="status" aria-live="polite" data-testid="status-waitlist-success">
        <Check size={17} className="mt-0.5 shrink-0" />
        <span>You’re on the list. We’ll send the first signal when Comet is ready.</span>
      </div>
    );
  }
  if (status === 'duplicate') {
    return (
      <div className="flex items-start gap-2 text-sm text-[#8f4a25]" role="status" aria-live="polite" data-testid="status-waitlist-duplicate">
        <CircleHelp size={17} className="mt-0.5 shrink-0" />
        <span>That address is already on the list. We haven’t forgotten you.</span>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex items-start gap-2 text-sm text-[#a64646]" role="alert" data-testid="status-waitlist-error">
        <CircleHelp size={17} className="mt-0.5 shrink-0" />
        <span>We couldn’t save that just now. Check your connection and try again.</span>
      </div>
    );
  }
  return null;
}

function WaitlistForm({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [platform, setPlatform] = useState<Platform>('');
  const [status, setStatus] = useState<FormStatus>('idle');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    window.setTimeout(() => {
      try {
        const key = 'comet-waitlist';
        const saved = JSON.parse(localStorage.getItem(key) ?? '[]') as Array<{ email: string }>;
        if (saved.some((entry) => entry.email === normalizedEmail)) {
          setStatus('duplicate');
          return;
        }
        const source = new URLSearchParams(window.location.search).get('ref') ?? document.referrer ?? 'direct';
        const nextEntry = {
          email: normalizedEmail,
          platform: platform || 'unspecified',
          timestamp: new Date().toISOString(),
          referral: source,
        };
        localStorage.setItem(key, JSON.stringify([...saved, nextEntry]));
        setStatus('success');
      } catch {
        setStatus('error');
      }
    }, 650);
  };

  const inputClass = dark
    ? 'border-[#5572b5] bg-[#20396d] text-[#f7f3e8] placeholder:text-[#afbddc] focus:border-[#ff9b87]'
    : 'border-[#bec8dc] bg-[#f8f5ed] text-[#152752] placeholder:text-[#6d7892] focus:border-[#3558dc]';
  const labelClass = dark ? 'text-[#d8e0f5]' : 'text-[#152752]';

  if (status === 'success') {
    return (
      <div className={`rounded-2xl border p-4 ${dark ? 'border-[#5572b5] bg-[#20396d]' : 'border-[#accfbe] bg-[#e8f2e7]'}`} data-testid="form-waitlist-confirmation">
        <StatusMessage status={status} />
        <button
          type="button"
          onClick={() => { setStatus('idle'); setEmail(''); }}
          className={`mt-3 text-xs font-semibold underline underline-offset-4 ${dark ? 'text-[#f7f3e8]' : 'text-[#204f43]'}`}
          data-testid="button-join-another"
        >
          Add another address
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? 'space-y-3' : 'space-y-3'} noValidate data-testid="form-waitlist">
      <div>
        <label htmlFor={`waitlist-email-${dark ? 'dark' : 'light'}`} className={`mb-2 block text-xs font-semibold ${labelClass}`}>Email address</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={`waitlist-email-${dark ? 'dark' : 'light'}`}
            type="email"
            required
            value={email}
            onChange={(event) => { setEmail(event.target.value); if (status !== 'idle') setStatus('idle'); }}
            placeholder="you@somewhere.com"
            className={`min-h-12 w-full rounded-xl border px-4 text-sm outline-none transition-colors ${inputClass}`}
            data-testid={`input-email-${dark ? 'dark' : 'light'}`}
            aria-describedby={status !== 'idle' ? `waitlist-status-${dark ? 'dark' : 'light'}` : undefined}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="group inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#ff7c67] px-5 text-sm font-bold text-[#152752] transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
            data-testid={`button-submit-waitlist-${dark ? 'dark' : 'light'}`}
          >
            {status === 'loading' ? 'Saving…' : 'Request access'}
            {status !== 'loading' && <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />}
          </button>
        </div>
      </div>
      <div>
        <label htmlFor={`platform-${dark ? 'dark' : 'light'}`} className={`mb-2 block text-xs font-semibold ${labelClass}`}>
          Where would you use Comet? <span className="font-normal opacity-70">(optional)</span>
        </label>
        <select
          id={`platform-${dark ? 'dark' : 'light'}`}
          value={platform}
          onChange={(event) => setPlatform(event.target.value as Platform)}
          className={`min-h-11 w-full rounded-xl border px-3 text-sm outline-none transition-colors ${inputClass}`}
          data-testid={`select-platform-${dark ? 'dark' : 'light'}`}
        >
          <option value="">Choose a platform</option>
          <option value="macOS">macOS</option>
          <option value="Windows">Windows</option>
          <option value="iPhone">iPhone</option>
          <option value="Android">Android</option>
          <option value="Web">Web</option>
        </select>
      </div>
      <div id={`waitlist-status-${dark ? 'dark' : 'light'}`} className="min-h-5">
        <StatusMessage status={status} />
      </div>
      <p className={`text-[0.68rem] leading-5 ${dark ? 'text-[#afbddc]' : 'text-[#6d7892]'}`}>
        Private beta access is limited. No product news, no noise — just the invite when your slot opens.
      </p>
    </form>
  );
}

function ConnectedDevices() {
  return (
    <div className="relative mx-auto h-[430px] w-full max-w-[650px] sm:h-[500px]" aria-label="A laptop and phone connected to Comet cloud">
      <div className="absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-[#6f86ef]/20 blur-3xl" />
      <div className="absolute left-[11%] top-[16%] text-[#3558dc]">
        <span className="signal-dot absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#ff7c67]" />
        <Cloud size={76} strokeWidth={1.2} />
      </div>
      <svg className="absolute inset-x-0 top-[17%] h-[150px] w-full" viewBox="0 0 650 150" fill="none" aria-hidden="true">
        <path className="connection-line" d="M120 54 C230 130 326 128 408 64" stroke="#8298eb" strokeWidth="1.5" />
        <path className="connection-line" d="M145 54 C265 24 430 15 548 88" stroke="#ff9b87" strokeWidth="1.5" style={{ animationDelay: '1.2s' }} />
        <circle cx="284" cy="111" r="3" fill="#ff7c67" />
        <circle cx="399" cy="61" r="3" fill="#3558dc" />
      </svg>

      <div className="device-float absolute bottom-2 left-0 w-[76%] sm:left-[5%]">
        <div className="relative rounded-[1.35rem] border-[5px] border-[#152752] bg-[#172f60] p-2 shadow-[0_30px_50px_-30px_rgba(21,39,82,0.65)]">
          <div className="overflow-hidden rounded-[0.8rem] border border-[#5572b5] bg-[#f5f0e5]">
            <div className="flex h-7 items-center gap-1.5 border-b border-[#d4d8df] bg-[#e8e6df] px-3">
              <span className="h-2 w-2 rounded-full bg-[#ff7c67]" /><span className="h-2 w-2 rounded-full bg-[#dfc26d]" /><span className="h-2 w-2 rounded-full bg-[#7fb598]" />
              <span className="ml-3 h-2 w-20 rounded-full bg-[#d1d2d0]" />
            </div>
            <div className="flex h-[190px] sm:h-[235px]">
              <div className="w-[25%] border-r border-[#d4d8df] bg-[#eeeae0] p-2">
                <div className="mb-4 h-2 w-12 rounded bg-[#b9c2d6]" />
                <div className="space-y-2">
                  <div className="h-2 w-14 rounded bg-[#3558dc]" /><div className="h-2 w-10 rounded bg-[#c9cbd0]" /><div className="h-2 w-12 rounded bg-[#c9cbd0]" />
                </div>
              </div>
              <div className="flex-1 p-3 sm:p-5">
                <div className="mb-4 flex items-end justify-between"><div><div className="mb-2 h-3 w-20 rounded bg-[#152752]" /><div className="h-2 w-28 rounded bg-[#b9c2d6]" /></div><div className="h-5 w-12 rounded bg-[#dce3fb]" /></div>
                <div className="grid grid-cols-3 gap-2">
                  {['#ffdbd3', '#dce3fb', '#dcefe6', '#e9e0f2', '#f0e5c9', '#dce3fb'].map((color, index) => <div key={index} className="aspect-square rounded-lg border border-[#d2d4d4] p-2" style={{ backgroundColor: color }}><div className="h-full w-full rounded bg-[#f4f1e8]/70" /></div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto h-2 w-[108%] rounded-b-xl bg-[#20396d] shadow-[0_15px_15px_-10px_rgba(21,39,82,0.4)]" />
      </div>

      <div className="device-float-slow absolute bottom-4 right-[4%] w-[27%] min-w-[120px] max-w-[155px]">
        <div className="rounded-[1.5rem] border-[5px] border-[#152752] bg-[#172f60] p-1.5 shadow-[0_30px_50px_-30px_rgba(21,39,82,0.65)]">
          <div className="overflow-hidden rounded-[1rem] border border-[#5572b5] bg-[#f5f0e5]">
            <div className="mx-auto mt-1.5 h-2 w-12 rounded-full bg-[#152752]" />
            <div className="px-3 pb-4 pt-5"><div className="mb-4 flex items-center justify-between"><div className="h-3 w-12 rounded bg-[#152752]" /><div className="h-5 w-5 rounded-full bg-[#ff9b87]" /></div><div className="space-y-2.5">{['Photos', 'Work', 'Archive', 'Shared'].map((item, index) => <div key={item} className="flex items-center gap-2 rounded-lg border border-[#d4d8df] bg-[#eeeae0] p-2"><span className={`h-5 w-5 rounded ${index === 0 ? 'bg-[#ffdbd3]' : index === 1 ? 'bg-[#dce3fb]' : 'bg-[#dcefe6]'}`} /><span className="h-2 w-12 rounded bg-[#9ca6bd]" /></div>)}</div></div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-[30%] rounded-full border border-[#b7c7e8] bg-[#f5f0e5] px-3 py-1.5 text-[10px] font-semibold tracking-wide text-[#3558dc] shadow-sm">
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#71b49c]" />one filesystem, wherever you are
      </div>
    </div>
  );
}

function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div className="border-b border-[#c8ceda] py-5" data-testid={`faq-item-${index}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-6 text-left"
        aria-expanded={open}
        data-testid={`button-faq-${index}`}
      >
        <span className="font-display text-base font-semibold tracking-[-0.02em] text-[#152752] sm:text-lg">{question}</span>
        <ChevronDown size={19} className={`shrink-0 text-[#3558dc] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className="faq-answer" data-open={open}>
        <div><p className="max-w-2xl pt-3 pr-8 text-sm leading-7 text-[#5f6b84]">{answer}</p></div>
      </div>
    </div>
  );
}

function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleNav = (target: string) => {
    setMenuOpen(false);
    scrollToId(target);
  };

  return (
    <div id="top" className="comet-page noise-layer min-h-[100dvh]">
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Main navigation">
          {navItems.map((item) => <button key={item.target} type="button" onClick={() => handleNav(item.target)} className="text-[0.76rem] font-semibold text-[#52617d] transition-colors hover:text-[#3558dc]" data-testid={`button-nav-${item.target}`}>{item.label}</button>)}
        </nav>
        <button type="button" onClick={() => scrollToId('join')} className="hidden items-center gap-2 rounded-full bg-[#152752] px-4 py-2.5 text-xs font-bold text-[#f7f3e8] transition-transform hover:-translate-y-0.5 sm:inline-flex" data-testid="button-header-join">
          Join private beta <ArrowRight size={14} />
        </button>
        <button type="button" onClick={() => setMenuOpen((open) => !open)} className="grid h-10 w-10 place-items-center rounded-full border border-[#bec8dc] text-[#152752] md:hidden" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} data-testid="button-mobile-menu">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>
      {menuOpen && <nav className="absolute left-5 right-5 top-[74px] z-30 rounded-2xl border border-[#c8ceda] bg-[#f8f5ed] p-3 shadow-xl md:hidden" aria-label="Mobile navigation">{navItems.map((item) => <button key={item.target} type="button" onClick={() => handleNav(item.target)} className="block w-full rounded-xl px-3 py-3 text-left text-sm font-semibold text-[#152752] hover:bg-[#e9edf9]" data-testid={`button-mobile-nav-${item.target}`}>{item.label}</button>)}</nav>}

      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-12 pt-14 sm:px-8 sm:pb-20 sm:pt-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:pb-28 lg:pt-24" aria-labelledby="hero-title">
          <div className="relative z-10 max-w-xl">
            <div className="reveal eyebrow mb-6 flex items-center gap-2"><span className="h-px w-7 bg-[#ff7c67]" />Private beta · cloud filesystem</div>
            <h1 id="hero-title" className="reveal reveal-delay-1 font-display text-[clamp(3.6rem,10vw,7.9rem)] font-semibold leading-[0.88] tracking-[-0.075em] text-[#152752]">Your files,<br /><span className="text-[#3558dc]">off-device.</span></h1>
            <p className="reveal reveal-delay-2 mt-7 max-w-md text-base leading-7 text-[#5f6b84] sm:text-lg">Comet puts your files in the cloud and keeps them close. Access the same filesystem from your phone, desktop, or browser — without asking your storage to hold everything.</p>
            <div className="reveal reveal-delay-3 mt-8 max-w-md" id="join"><WaitlistForm /></div>
            <div className="reveal reveal-delay-4 mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.69rem] font-mono uppercase tracking-[0.08em] text-[#7b8599]"><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#71b49c]" />No invite yet? Start here.</span><span>Built for the overflow</span></div>
          </div>
          <div className="reveal reveal-delay-2 pt-5 lg:pt-16"><ConnectedDevices /></div>
        </section>

        <section className="border-y border-[#253d70] bg-[#152752] text-[#f7f3e8]" id="for-you" aria-labelledby="audience-title">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.7fr_1.3fr] lg:px-12 lg:py-24">
            <div><div className="eyebrow mb-6 text-[#ff9b87]">For the overflow</div><h2 id="audience-title" className="font-display max-w-sm text-4xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-5xl">For people whose storage has become a negotiation.</h2></div>
            <div className="grid gap-7 sm:grid-cols-3">
              <div className="border-l border-[#5572b5] pl-5"><Folder size={20} className="mb-7 text-[#ff9b87]" /><h3 className="font-display text-lg font-semibold">The archivist</h3><p className="mt-3 text-sm leading-6 text-[#b9c6e3]">Keeps every draft, photo, recording, and strange little file that might matter later.</p></div>
              <div className="border-l border-[#5572b5] pl-5"><Layers3 size={20} className="mb-7 text-[#ff9b87]" /><h3 className="font-display text-lg font-semibold">The multi-device person</h3><p className="mt-3 text-sm leading-6 text-[#b9c6e3]">Works across a desk, a laptop, and a phone — and is tired of moving files between them.</p></div>
              <div className="border-l border-[#5572b5] pl-5"><Sparkles size={20} className="mb-7 text-[#ff9b87]" /><h3 className="font-display text-lg font-semibold">The almost-full drive</h3><p className="mt-3 text-sm leading-6 text-[#b9c6e3]">Doesn’t need to delete the past just to make room for what’s next.</p></div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_0.85fr] lg:px-12 lg:py-32" aria-labelledby="problem-title">
          <div>
            <div className="eyebrow mb-6">The local-storage problem</div>
            <h2 id="problem-title" className="font-display max-w-2xl text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-[#152752] sm:text-6xl">Your storage is a room. Your files are a city.</h2>
            <p className="mt-7 max-w-xl text-base leading-8 text-[#5f6b84]">Every device makes you choose what gets to stay. A photo library grows until it crowds out your work. A project archive waits on an external drive. The things you want nearby are scattered across the places that happen to have space.</p>
          </div>
          <div className="relative min-h-[250px] overflow-hidden rounded-[1.75rem] border border-[#c8ceda] bg-[#e7edf9] p-6 sm:p-9">
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#b8c7fb] opacity-60 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between border-b border-[#c1cce6] pb-4"><span className="font-mono text-[0.66rem] uppercase tracking-[0.12em] text-[#3558dc]">local disk / 256 GB</span><span className="text-xs font-semibold text-[#a64646]">97% used</span></div>
              <div className="mt-7 flex items-center gap-3"><div className="h-14 w-14 rounded-xl bg-[#ffdbd3] p-3 text-[#a64646]"><FileArchive size={28} /></div><div><div className="font-display font-semibold text-[#152752]">everything, everywhere</div><div className="mt-1 text-xs text-[#6d7892]">A very small box for a very large life.</div></div></div>
              <div className="mt-8 h-3 overflow-hidden rounded-full bg-[#c5cee5]"><div className="h-full w-[97%] rounded-full bg-[#ff7c67]" /></div>
              <div className="mt-3 flex justify-between font-mono text-[0.63rem] text-[#6d7892]"><span>248.3 GB occupied</span><span>7.7 GB free</span></div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-[#e5edfb] px-5 py-20 sm:px-8 sm:py-28 lg:px-12" aria-labelledby="how-title">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl"><div className="eyebrow mb-6">How Comet works</div><h2 id="how-title" className="font-display text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-[#152752] sm:text-6xl">A filesystem that knows where you are.</h2><p className="mt-6 text-base leading-7 text-[#5f6b84]">Comet is being built as a quiet layer between your files and your devices. The whole library can live in the cloud; the work you need can appear where you need it.</p></div>
            <div className="mt-14 grid gap-4 lg:grid-cols-3">
              {[
                { number: '01', icon: <Cloud size={22} />, title: 'Keep the source in the cloud', copy: 'Your library has one home instead of a dozen partial copies. Your devices don’t have to carry the full weight.' },
                { number: '02', icon: <PanelTop size={22} />, title: 'Open it like a local file', copy: 'Browse folders and open what you need through a familiar filesystem surface, not a separate tab you have to remember.' },
                { number: '03', icon: <Radio size={22} />, title: 'Move without moving it', copy: 'Switch from desk to phone to browser while the underlying library stays in one consistent place.' },
              ].map((item) => <div key={item.number} className="group relative overflow-hidden rounded-2xl border border-[#bcc9e5] bg-[#f5f3ed] p-7 transition-transform hover:-translate-y-1 sm:p-9"><div className="flex items-start justify-between"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#dce3fb] text-[#3558dc]">{item.icon}</div><span className="font-mono text-xs text-[#8290ac]">{item.number}</span></div><h3 className="mt-14 max-w-[14rem] font-display text-xl font-semibold tracking-[-0.035em] text-[#152752]">{item.title}</h3><p className="mt-3 text-sm leading-6 text-[#68758e]">{item.copy}</p><ArrowRight className="absolute bottom-8 right-8 text-[#ff7c67] opacity-0 transition-opacity group-hover:opacity-100" size={19} /></div>)}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:px-12 lg:py-32" aria-labelledby="vision-title">
          <div className="order-2 lg:order-1"><div className="relative overflow-hidden rounded-[1.75rem] bg-[#152752] p-5 shadow-[0_30px_70px_-40px_rgba(21,39,82,0.7)] sm:p-8"><div className="mb-6 flex items-center justify-between"><div className="flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[#afbddc]"><span className="h-2 w-2 rounded-full bg-[#71b49c]" />comet / active</div><span className="font-mono text-[0.65rem] text-[#8298eb]">3 surfaces / 1 library</span></div><div className="grid grid-cols-3 items-end gap-2 sm:gap-4"><div className="rounded-xl border border-[#5572b5] bg-[#20396d] p-2 sm:p-3"><div className="mb-3 h-2 w-12 rounded bg-[#8298eb]" /><div className="space-y-2"><div className="h-14 rounded-lg bg-[#f1dcd4]" /><div className="h-14 rounded-lg bg-[#dcefe6]" /></div><div className="mt-3 font-mono text-[0.55rem] text-[#afbddc]">desktop</div></div><div className="rounded-xl border border-[#5572b5] bg-[#20396d] p-2 sm:p-3"><div className="mb-3 h-2 w-8 rounded bg-[#ff9b87]" /><div className="space-y-2"><div className="h-9 rounded-lg bg-[#dce3fb]" /><div className="h-9 rounded-lg bg-[#e9e0f2]" /><div className="h-9 rounded-lg bg-[#dcefe6]" /></div><div className="mt-3 font-mono text-[0.55rem] text-[#afbddc]">phone</div></div><div className="rounded-xl border border-[#5572b5] bg-[#20396d] p-2 sm:p-3"><div className="mb-3 h-2 w-10 rounded bg-[#71b49c]" /><div className="space-y-2"><div className="h-10 rounded-lg bg-[#e9e0f2]" /><div className="h-20 rounded-lg bg-[#f1dcd4]" /></div><div className="mt-3 font-mono text-[0.55rem] text-[#afbddc]">web</div></div></div><div className="mt-6 flex items-center justify-center gap-3 font-mono text-[0.63rem] uppercase tracking-[0.1em] text-[#afbddc]"><span className="h-px flex-1 bg-[#5572b5]" /><span>same view / different place</span><span className="h-px flex-1 bg-[#5572b5]" /></div></div></div>
          <div className="order-1 lg:order-2"><div className="eyebrow mb-6">The cross-device vision</div><h2 id="vision-title" className="font-display max-w-xl text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-[#152752] sm:text-6xl">The cloud, minus the distance.</h2><p className="mt-7 max-w-lg text-base leading-8 text-[#5f6b84]">A file shouldn’t feel foreign because you opened it on another screen. Comet is designed so your library follows your context — not the other way around.</p><button type="button" onClick={() => scrollToId('join')} className="group mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#3558dc]" data-testid="button-vision-join">Get an early look <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></button></div>
        </section>

        <section id="coming-soon" className="border-y border-[#e7b3a8] bg-[#ffebe5] px-5 py-20 sm:px-8 sm:py-24 lg:px-12" aria-labelledby="future-title">
          <div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-end"><div><div className="eyebrow mb-6 text-[#a64646]">Coming soon · not in private beta</div><h2 id="future-title" className="font-display max-w-xl text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-[#152752] sm:text-5xl">The filesystem is only the beginning.</h2></div><p className="max-w-xs text-sm leading-6 text-[#7d5a5a]">A preview of the surfaces we’re exploring next. These are direction, not promises.</p></div><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[{icon: <Terminal size={20} />, title: 'Command line access', copy: 'A scriptable path for people who think in shells.'}, {icon: <Globe2 size={20} />, title: 'Shareable workspaces', copy: 'Bring a small, intentional slice of your library to a team.'}, {icon: <Copy size={20} />, title: 'Smart availability', copy: 'Make room locally with more control over what stays close.'}, {icon: <Code2 size={20} />, title: 'Developer primitives', copy: 'Build tools on top of the place your files already live.'}].map((item) => <div key={item.title} className="rounded-2xl border border-[#e3b7ae] bg-[#fff3ee] p-6"><div className="mb-10 text-[#a64646]">{item.icon}</div><h3 className="font-display font-semibold text-[#152752]">{item.title}</h3><p className="mt-2 text-sm leading-6 text-[#7d5a5a]">{item.copy}</p></div>)}</div></div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:py-28" aria-labelledby="technical-title">
          <div><div className="eyebrow mb-6">Under the surface</div><h2 id="technical-title" className="font-display max-w-md text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-[#152752] sm:text-5xl">Quiet on the outside. Serious underneath.</h2><p className="mt-6 max-w-md text-base leading-7 text-[#5f6b84]">Comet starts with a simple contract: one canonical library, presented through familiar file semantics. We’re building the foundation before adding the ornaments.</p></div>
          <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-[#c8ceda] bg-[#f8f5ed] p-6"><Command size={20} className="mb-10 text-[#3558dc]" /><h3 className="font-display font-semibold text-[#152752]">Virtual filesystem layer</h3><p className="mt-2 text-sm leading-6 text-[#6d7892]">The interface should feel native to your operating system, while storage stays independent from any one device.</p></div><div className="rounded-2xl border border-[#c8ceda] bg-[#f8f5ed] p-6"><Cloud size={20} className="mb-10 text-[#3558dc]" /><h3 className="font-display font-semibold text-[#152752]">Cloud-first by design</h3><p className="mt-2 text-sm leading-6 text-[#6d7892]">Local space is treated as a useful cache, not the source of truth for your entire archive.</p></div><div className="rounded-2xl border border-[#c8ceda] bg-[#f8f5ed] p-6"><Laptop size={20} className="mb-10 text-[#3558dc]" /><h3 className="font-display font-semibold text-[#152752]">Context-aware access</h3><p className="mt-2 text-sm leading-6 text-[#6d7892]">Desktop, mobile, and web are different windows into the same underlying model.</p></div><div className="rounded-2xl border border-[#c8ceda] bg-[#f8f5ed] p-6"><Radio size={20} className="mb-10 text-[#3558dc]" /><h3 className="font-display font-semibold text-[#152752]">Built in the open</h3><p className="mt-2 text-sm leading-6 text-[#6d7892]">The private beta is for testing the primitives with people who care how this layer should work.</p></div></div>
        </section>

        <section className="bg-[#152752] px-5 py-20 text-[#f7f3e8] sm:px-8 sm:py-24 lg:px-12" aria-labelledby="cta-title">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_0.8fr]"><div><div className="eyebrow mb-6 text-[#ff9b87]">Get there early</div><h2 id="cta-title" className="font-display max-w-2xl text-5xl font-semibold leading-[0.93] tracking-[-0.065em] sm:text-7xl">Make room for what’s next.</h2><p className="mt-7 max-w-md text-base leading-7 text-[#b9c6e3]">Tell us where you want Comet first. We’re inviting a small group of people who already feel the limits of local storage.</p></div><div id="bottom-form"><WaitlistForm dark compact /></div></div>
        </section>

        <section id="faq" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28" aria-labelledby="faq-title"><div className="grid gap-12 lg:grid-cols-[0.65fr_1.35fr]"><div><div className="eyebrow mb-6">Questions, honestly</div><h2 id="faq-title" className="font-display text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-[#152752] sm:text-5xl">Before you send your address.</h2><p className="mt-6 max-w-xs text-sm leading-6 text-[#6d7892]">We’re early. Here’s what we can say without dressing it up.</p></div><div>{[{question: 'What is Comet?', answer: 'Comet is a cloud filesystem in development. The goal is to make a cloud-based file library feel accessible from the devices you already use, without requiring every device to store the whole thing.'}, {question: 'Is Comet available now?', answer: 'Not yet. We’re opening a private beta in stages and using the waitlist to learn which platforms and workflows matter most at the start.'}, {question: 'Which platforms will Comet support?', answer: 'The first direction includes desktop, phone, and web access. Tell us your most important platform in the form so we can prioritize the beta around real setups.'}, {question: 'What happens after I join?', answer: 'We save your address and optional platform preference locally for this early prototype. In a production beta, those details would be sent to Comet’s waitlist service so we can contact you about access.'}, {question: 'Can I use Comet for my team?', answer: 'The private beta is initially focused on individual file libraries. Shared workspaces are a clearly marked future direction, not part of the current promise.'}].map((item, index) => <FAQItem key={item.question} {...item} index={index} />)}</div></div></section>
      </main>

      <footer className="border-t border-[#c8ceda] px-5 py-8 sm:px-8 lg:px-12"><div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><Logo /><div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#6d7892]"><button type="button" onClick={() => scrollToId('how-it-works')} className="transition-colors hover:text-[#3558dc]" data-testid="button-footer-how">How it works</button><button type="button" onClick={() => scrollToId('faq')} className="transition-colors hover:text-[#3558dc]" data-testid="button-footer-faq">FAQ</button><span className="font-mono text-[0.63rem] uppercase tracking-[0.08em] text-[#9aa3b4]">Comet / private beta / 2025</span></div></div></footer>
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;