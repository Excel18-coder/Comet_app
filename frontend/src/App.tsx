import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  Cloud,
  Copy,
  Download,
  Expand,
  FileArchive,
  Film,
  Folder,
  Globe2,
  Laptop,
  Layers3,
  Menu,
  Orbit,
  PanelTop,
  Plus,
  Radio,
  Smartphone,
  Sparkles,
  Upload,
  Users,
  Zap,
  X,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

type Platform = 'macOS' | 'Windows' | 'iPhone' | 'Android' | 'Web';
type FormStatus = 'idle' | 'loading' | 'success' | 'duplicate' | 'error';

interface SignupEntry {
  email: string;
  whatsapp?: string;
  platforms: Platform[];
  timestamp: string;
  referral: string;
}

const navItems = [
  { label: 'How it works', target: 'how-it-works' },
  { label: 'Free up space', target: 'free-up-space' },
  { label: 'Works everywhere', target: 'storage-follows' },
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
        <span>You’re in. We’ll send early-access updates as Comet gets closer.</span>
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

function buildApiUrl(path: string) {
  const base = import.meta.env.VITE_API_BASE_URL ?? '';
  return `${base}${path}`;
}

function formatWhatsappInput(raw: string) {
  const digits = raw.replace(/\D/g, '');

  if (!digits) return '';

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;

  const countryCode = digits.slice(0, digits.length - 10);
  const local = digits.slice(-10);
  const localFormatted = `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;

  return countryCode ? `+${countryCode} ${localFormatted}` : localFormatted;
}

function WaitlistForm({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [status, setStatus] = useState<FormStatus>('idle');

  const platformOptions: Platform[] = ['macOS', 'Windows', 'iPhone', 'Android', 'Web'];

  const togglePlatform = (platform: Platform) => {
    setPlatforms((current) =>
      current.includes(platform)
        ? current.filter((p) => p !== platform)
        : [...current, platform]
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedWhatsapp = formatWhatsappInput(whatsapp).trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setStatus('error');
      return;
    }

    if (!/^\+?[0-9\s-]{7,20}$/.test(normalizedWhatsapp) || normalizedWhatsapp.replace(/[^\d]/g, '').length < 8) {
      setStatus('error');
      return;
    }

    setStatus('loading');
    
    const source = new URLSearchParams(window.location.search).get('ref') ?? document.referrer ?? 'direct';
    
    // Send to backend API
    fetch(buildApiUrl('/api/signups'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: normalizedEmail,
        whatsapp: normalizedWhatsapp,
        platforms: platforms.length > 0 ? platforms : [],
        referral: source,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data.success) {
          if (data.error?.includes('already')) {
            setStatus('duplicate');
          } else {
            setStatus('error');
          }
          return;
        }
        setStatus('success');
        setEmail('');
        setWhatsapp('');
        setPlatforms([]);
      })
      .catch(() => {
        setStatus('error');
      });
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
          onClick={() => { setStatus('idle'); setEmail(''); setWhatsapp(''); setPlatforms([]); }}
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
            {status === 'loading' ? 'Saving…' : 'Join waitlist'}
            {status !== 'loading' && <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />}
          </button>
        </div>
      </div>
      <div>
        <label htmlFor={`waitlist-whatsapp-${dark ? 'dark' : 'light'}`} className={`mb-2 block text-xs font-semibold ${labelClass}`}>WhatsApp number</label>
        <input
          id={`waitlist-whatsapp-${dark ? 'dark' : 'light'}`}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          value={whatsapp}
          onChange={(event) => {
            const formatted = formatWhatsappInput(event.target.value);
            setWhatsapp(formatted);
            if (status !== 'idle') setStatus('idle');
          }}
          placeholder="+1 555 123 4567"
          className={`min-h-12 w-full rounded-xl border px-4 text-sm outline-none transition-colors ${inputClass}`}
          data-testid={`input-whatsapp-${dark ? 'dark' : 'light'}`}
        />
      </div>
      <div>
        <label className={`mb-3 block text-xs font-semibold ${labelClass}`}>
          Which devices will you use? <span className="font-normal opacity-70">(optional)</span>
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {platformOptions.map((platform) => (
            <button
              key={platform}
              type="button"
              onClick={() => togglePlatform(platform)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                platforms.includes(platform)
                  ? dark
                    ? 'border-[#ff9b87] bg-[#ff9b87] text-[#152752]'
                    : 'border-[#3558dc] bg-[#3558dc] text-[#f7f3e8]'
                  : dark
                    ? 'border-[#5572b5] bg-[#20396d] text-[#d8e0f5] hover:border-[#ff9b87]'
                    : 'border-[#bec8dc] bg-[#f8f5ed] text-[#152752] hover:border-[#3558dc]'
              }`}
              data-testid={`button-platform-${platform}`}
            >
              {platforms.includes(platform) && <Check size={14} className="inline mr-1" />}
              {platform}
            </button>
          ))}
        </div>
      </div>
      <div id={`waitlist-status-${dark ? 'dark' : 'light'}`} className="min-h-5">
        <StatusMessage status={status} />
      </div>
      <p className={`text-[0.68rem] leading-5 ${dark ? 'text-[#afbddc]' : 'text-[#6d7892]'}`}>
        Comet is an upcoming product. Join the waitlist for early-access updates and launch news.
      </p>
    </form>
  );
}

function ConnectedDevices() {
  return (
    <div className="relative mx-auto h-[430px] w-full max-w-[650px] sm:h-[500px]" aria-label="A laptop and phone connected to Comet cloud storage">
      <div className="star-field" aria-hidden="true">
        {Array.from({ length: 20 }).map((_, index) => (
          <span key={index} className="twinkle-dot" style={{ left: `${(index * 19) % 100}%`, top: `${(index * 23) % 100}%`, animationDelay: `${index * 0.22}s` }} />
        ))}
      </div>
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
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#71b49c]" />one library across devices
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
            <div className="reveal eyebrow mb-6 flex items-center gap-2"><span className="h-px w-7 bg-[#ff7c67]" />Upcoming product · Early waitlist</div>
            <h1 id="hero-title" className="reveal reveal-delay-1 font-display text-[clamp(2.8rem,9vw,6.4rem)] font-semibold leading-[0.92] tracking-[-0.07em] text-[#152752]">Infinite storage<br /><span className="text-[#3558dc]">on your phone and desktop.</span></h1>
            <p className="reveal reveal-delay-2 mt-7 max-w-lg text-base leading-7 text-[#5f6b84] sm:text-lg">Access terabytes of files without filling your device. Comet streams your library in real-time across phone, desktop, and web. Never manage storage again.</p>
            <div className="reveal reveal-delay-3 mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={() => scrollToId('join')} className="inline-flex items-center gap-2 rounded-full bg-[#152752] px-5 py-2.5 text-sm font-bold text-[#f7f3e8] transition-transform hover:-translate-y-0.5" data-testid="button-hero-primary">Join the waitlist <ArrowRight size={15} /></button>
              <button type="button" onClick={() => scrollToId('how-it-works')} className="inline-flex items-center gap-2 rounded-full border border-[#bcc9e5] bg-[#f5f0e5] px-5 py-2.5 text-sm font-semibold text-[#3558dc] transition-colors hover:bg-[#e8eefc]" data-testid="button-hero-secondary">See how it works</button>
            </div>
            <div className="reveal reveal-delay-3 mt-8 max-w-md" id="join"><WaitlistForm /></div>
            <div className="reveal reveal-delay-4 mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.69rem] font-mono uppercase tracking-[0.08em] text-[#7b8599]"><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#71b49c]" />Zero disk space used</span><span>One library across devices</span></div>
          </div>
          <div className="reveal reveal-delay-2 pt-5 lg:pt-16"><ConnectedDevices /></div>
        </section>

        <section className="border-y border-[#c8ceda] bg-[#f0f4fd] py-4">
          <div className="ticker-track" aria-label="Storage benefits">
            <div className="ticker-content font-mono text-[0.67rem] uppercase tracking-[0.13em] text-[#4e6088]">
              <span>More usable storage</span>
              <span>•</span>
              <span>Files stay accessible</span>
              <span>•</span>
              <span>Free up space anytime</span>
              <span>•</span>
              <span>Your library follows you</span>
              <span>•</span>
              <span>More usable storage</span>
              <span>•</span>
              <span>Files stay accessible</span>
              <span>•</span>
              <span>Free up space anytime</span>
              <span>•</span>
              <span>Your library follows you</span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-12" aria-labelledby="concept-title">
          <div className="mb-16">
            <div className="eyebrow mb-6">The simple idea</div>
            <h2 id="concept-title" className="font-display max-w-3xl text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-[#152752] sm:text-5xl">Your device has limited storage. Your cloud doesn't.</h2>
          </div>
          
          <div className="grid gap-8 lg:grid-cols-3 mb-12">
            <div className="concept-card rounded-2xl border border-[#c8ceda] bg-[#f8f5ed] p-8 text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-xl bg-[#e8e4f7] text-[#3558dc] mb-6">
                <Smartphone size={28} strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-lg font-semibold text-[#152752] mb-3">Your Device</h3>
              <div className="font-mono text-sm font-semibold text-[#3558dc] mb-2">128 GB</div>
              <p className="text-sm leading-6 text-[#6d7892]">Physical storage on your phone or computer.</p>
            </div>

            <div className="concept-card rounded-2xl border border-[#bcc9e5] bg-gradient-to-br from-[#e8eefc] to-[#f5f0e5] p-8 text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-xl bg-[#dce3fb] text-[#ff7c67] mb-6">
                <Plus size={28} strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-lg font-semibold text-[#152752] mb-3">Connected To</h3>
              <div className="font-mono text-sm font-semibold text-[#ff7c67] mb-2">2 TB</div>
              <p className="text-sm leading-6 text-[#6d7892]">Unlimited cloud storage, always at your fingertips.</p>
            </div>

            <div className="concept-card rounded-2xl border border-[#c8ceda] bg-[#f8f5ed] p-8 text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-xl bg-[#dcefe6] text-[#71b49c] mb-6">
                <Expand size={28} strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-lg font-semibold text-[#152752] mb-3">Your Access</h3>
              <div className="font-mono text-sm font-semibold text-[#71b49c] mb-2">Your Full Library</div>
              <p className="text-sm leading-6 text-[#6d7892]">Browse and access everything, like it's all local.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#bcc9e5] bg-[#eef4ff] p-8 sm:p-12">
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <h3 className="font-display text-2xl font-semibold text-[#152752] mb-6">Without Comet</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#ffebe5] text-[#a64646] text-xs font-bold shrink-0">✕</span>
                    <span className="text-sm text-[#5f6b84]">Phone constantly full</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#ffebe5] text-[#a64646] text-xs font-bold shrink-0">✕</span>
                    <span className="text-sm text-[#5f6b84]">Manual file management</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#ffebe5] text-[#a64646] text-xs font-bold shrink-0">✕</span>
                    <span className="text-sm text-[#5f6b84]">Delete files you want to keep</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#ffebe5] text-[#a64646] text-xs font-bold shrink-0">✕</span>
                    <span className="text-sm text-[#5f6b84]">Upgrade devices for more space</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-display text-2xl font-semibold text-[#152752] mb-6">With Comet</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#dcefe6] text-[#71b49c] text-xs font-bold shrink-0">✓</span>
                    <span className="text-sm text-[#5f6b84]">Access your full library anytime</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#dcefe6] text-[#71b49c] text-xs font-bold shrink-0">✓</span>
                    <span className="text-sm text-[#5f6b84]">Smart storage management</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#dcefe6] text-[#71b49c] text-xs font-bold shrink-0">✓</span>
                    <span className="text-sm text-[#5f6b84]">Keep files safely in the cloud</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#dcefe6] text-[#71b49c] text-xs font-bold shrink-0">✓</span>
                    <span className="text-sm text-[#5f6b84]">Free up space without losing files</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-12" aria-labelledby="teams-title">
          <div className="mb-16">
            <div className="eyebrow mb-6">Built for collaboration</div>
            <h2 id="teams-title" className="font-display max-w-3xl text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-[#152752] sm:text-5xl">Your team, always in sync.</h2>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#5f6b84]">Teammates and agents write to Comet. Every other connected device can open and edit files before the upload even finishes. Real-time collaboration without the wait.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 mb-12">
            <div className="rounded-2xl border border-[#c8ceda] bg-gradient-to-br from-[#f8f5ed] to-[#eef4ff] p-8 hover-lift">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-[#dce3fb] text-[#3558dc] mb-6">
                <Zap size={24} strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-lg font-semibold text-[#152752] mb-3">Edit instantly</h3>
              <p className="text-sm leading-6 text-[#6d7892] mb-4">Open 4K video, raw footage, high-res images directly in DaVinci, Premiere Pro, Photoshop. Comet streams only what you need in real-time.</p>
              <ul className="space-y-2 text-xs text-[#5f6b84]">
                <li className="flex items-start gap-2"><Check size={14} className="text-[#3558dc] shrink-0 mt-0.5" /><span>Stream terabytes without local storage</span></li>
                <li className="flex items-start gap-2"><Check size={14} className="text-[#3558dc] shrink-0 mt-0.5" /><span>No proxy files or render waits</span></li>
                <li className="flex items-start gap-2"><Check size={14} className="text-[#3558dc] shrink-0 mt-0.5" /><span>Works with apps you already use</span></li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[#c8ceda] bg-gradient-to-br from-[#f8f5ed] to-[#e8f2e7] p-8 hover-lift">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-[#dcefe6] text-[#71b49c] mb-6">
                <Users size={24} strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-lg font-semibold text-[#152752] mb-3">Instant sync & collaboration</h3>
              <p className="text-sm leading-6 text-[#6d7892] mb-4">Hit save and your team sees changes immediately. Phone uploads sync to desktop. Desktop edits appear on everyone's laptop. All without waiting.</p>
              <ul className="space-y-2 text-xs text-[#5f6b84]">
                <li className="flex items-start gap-2"><Check size={14} className="text-[#71b49c] shrink-0 mt-0.5" /><span>Changes sync in seconds</span></li>
                <li className="flex items-start gap-2"><Check size={14} className="text-[#71b49c] shrink-0 mt-0.5" /><span>One shared library, multiple locations</span></li>
                <li className="flex items-start gap-2"><Check size={14} className="text-[#71b49c] shrink-0 mt-0.5" /><span>Mobile uploads appear instantly</span></li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[#c8ceda] bg-gradient-to-br from-[#f8f5ed] to-[#ffebe5] p-8 hover-lift">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-[#ffdbd3] text-[#ff7c67] mb-6">
                <Smartphone size={24} strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-lg font-semibold text-[#152752] mb-3">Mobile-first design</h3>
              <p className="text-sm leading-6 text-[#6d7892] mb-4">Capture and upload directly from your phone. Your footage arrives in the cloud instantly and becomes available to your entire team—no desktop needed.</p>
              <ul className="space-y-2 text-xs text-[#5f6b84]">
                <li className="flex items-start gap-2"><Check size={14} className="text-[#ff7c67] shrink-0 mt-0.5" /><span>Upload while working</span></li>
                <li className="flex items-start gap-2"><Check size={14} className="text-[#ff7c67] shrink-0 mt-0.5" /><span>Instant team access</span></li>
                <li className="flex items-start gap-2"><Check size={14} className="text-[#ff7c67] shrink-0 mt-0.5" /><span>No device storage limit</span></li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[#c8ceda] bg-gradient-to-br from-[#f8f5ed] to-[#e8e4f7] p-8 hover-lift">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-[#e8e4f7] text-[#6f86ef] mb-6">
                <Cloud size={24} strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-lg font-semibold text-[#152752] mb-3">Blazingly fast search</h3>
              <p className="text-sm leading-6 text-[#6d7892] mb-4">Find files across your entire library instantly. Comet indexes everything and surfaces results in milliseconds, whether searching phone or desktop.</p>
              <ul className="space-y-2 text-xs text-[#5f6b84]">
                <li className="flex items-start gap-2"><Check size={14} className="text-[#6f86ef] shrink-0 mt-0.5" /><span>Search terabytes instantly</span></li>
                <li className="flex items-start gap-2"><Check size={14} className="text-[#6f86ef] shrink-0 mt-0.5" /><span>One search across all devices</span></li>
                <li className="flex items-start gap-2"><Check size={14} className="text-[#6f86ef] shrink-0 mt-0.5" /><span>Find what you need, fast</span></li>
              </ul>
            </div>
          </div>
        </section>

        <section className="border-y border-[#253d70] bg-[#152752] text-[#f7f3e8]" id="for-you" aria-labelledby="audience-title">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.7fr_1.3fr] lg:px-12 lg:py-24">
            <div><div className="eyebrow mb-6 text-[#ff9b87]">Who it's for</div><h2 id="audience-title" className="font-display max-w-sm text-4xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-5xl">From individual creators to large teams.</h2></div>
            <div className="grid gap-7 sm:grid-cols-3">
              <div className="border-l border-[#5572b5] pl-5"><Smartphone size={20} className="mb-7 text-[#ff9b87]" /><h3 className="font-display text-lg font-semibold">Individual creators</h3><p className="mt-3 text-sm leading-6 text-[#b9c6e3]">Photographers, videographers, and designers who need access to massive libraries without filling their devices.</p></div>
              <div className="border-l border-[#5572b5] pl-5"><Film size={20} className="mb-7 text-[#ff9b87]" /><h3 className="font-display text-lg font-semibold">Production studios</h3><p className="mt-3 text-sm leading-6 text-[#b9c6e3]">Film, video, and post-production teams collaborating on 4K/8K footage in real-time from multiple locations.</p></div>
              <div className="border-l border-[#5572b5] pl-5"><Users size={20} className="mb-7 text-[#ff9b87]" /><h3 className="font-display text-lg font-semibold">Organizations</h3><p className="mt-3 text-sm leading-6 text-[#b9c6e3]">Media companies, creative agencies, and enterprises managing petabytes of shared assets and workflows.</p></div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_0.85fr] lg:px-12 lg:py-32" aria-labelledby="problem-title">
          <div>
            <div className="eyebrow mb-6">The problem</div>
            <h2 id="problem-title" className="font-display max-w-2xl text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-[#152752] sm:text-6xl">Stop waiting for file transfers.</h2>
            <p className="mt-7 max-w-xl text-base leading-8 text-[#5f6b84]">Uploading a 4GB video takes hours. Downloading a project onto your phone wastes storage. Collaborating means waiting for files to sync. Teams waste time on file management instead of creative work. Comet changes everything.</p>
            <ul className="mt-8 space-y-4 text-sm text-[#4f607f]">
              <li className="flex items-start gap-3"><span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#ffebe5] text-[#a64646] text-xs font-bold shrink-0">✕</span><span>Waiting hours for uploads and downloads</span></li>
              <li className="flex items-start gap-3"><span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#ffebe5] text-[#a64646] text-xs font-bold shrink-0">✕</span><span>External drives and manual file transfers</span></li>
              <li className="flex items-start gap-3"><span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#ffebe5] text-[#a64646] text-xs font-bold shrink-0">✕</span><span>Device storage fills up constantly</span></li>
              <li className="flex items-start gap-3"><span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#ffebe5] text-[#a64646] text-xs font-bold shrink-0">✕</span><span>Teams waiting for file sync across devices</span></li>
            </ul>
          </div>
          <div className="relative min-h-[250px] overflow-hidden rounded-[1.75rem] border border-[#c8ceda] bg-[#e7edf9] p-6 sm:p-9">
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#b8c7fb] opacity-60 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between border-b border-[#c1cce6] pb-4"><span className="font-mono text-[0.66rem] uppercase tracking-[0.12em] text-[#3558dc]">Upload time / 4GB video</span><span className="text-xs font-semibold text-[#a64646]">3+ hours waiting</span></div>
              <div className="mt-7 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-[#ffdbd3] p-2 text-[#a64646]"><Upload size={24} /></div>
                  <div>
                    <div className="font-display font-semibold text-[#152752]">Traditional uploads</div>
                    <div className="mt-1 text-xs text-[#6d7892]">Wait for full download, then edit</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-[#dcefe6] p-2 text-[#71b49c]"><Zap size={24} /></div>
                  <div>
                    <div className="font-display font-semibold text-[#152752]">With Comet</div>
                    <div className="mt-1 text-xs text-[#6d7892]">Stream and edit instantly, while uploading</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-[#e5edfb] px-5 py-20 sm:px-8 sm:py-28 lg:px-12" aria-labelledby="how-title">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl"><div className="eyebrow mb-6">Never wait for files again</div><h2 id="how-title" className="font-display text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-[#152752] sm:text-6xl">Open and edit instantly.</h2><p className="mt-6 text-base leading-7 text-[#5f6b84]">Comet streams your files in real-time. No downloads. No waiting. Just open and work.</p></div>
            <div className="mt-14 grid gap-4 lg:grid-cols-3">
              {[
                { number: '01', icon: <Zap size={22} />, title: 'Files open instantly', copy: 'Stream 4K video, large datasets, and projects directly to your apps. No waiting for downloads.' },
                { number: '02', icon: <Users size={22} />, title: 'Instant sync across devices', copy: 'Hit save and your team sees changes in seconds. Phone, desktop, laptop—always in sync.' },
                { number: '03', icon: <Radio size={22} />, title: 'Works with apps you already use', copy: 'DaVinci, Premiere, Photoshop, Figma. Open files directly from Comet. No plugins needed.' },
              ].map((item) => <div key={item.number} className="card-glow group relative overflow-hidden rounded-2xl border border-[#bcc9e5] bg-[#f5f3ed] p-7 transition-transform hover:-translate-y-1 sm:p-9"><div className="flex items-start justify-between"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#dce3fb] text-[#3558dc]">{item.icon}</div><span className="font-mono text-xs text-[#8290ac]">{item.number}</span></div><h3 className="mt-14 max-w-[14rem] font-display text-xl font-semibold tracking-[-0.035em] text-[#152752]">{item.title}</h3><p className="mt-3 text-sm leading-6 text-[#68758e]">{item.copy}</p><ArrowRight className="absolute bottom-8 right-8 text-[#ff7c67] opacity-0 transition-opacity group-hover:opacity-100" size={19} /></div>)}
            </div>
          </div>
        </section>

        <section id="free-up-space" className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_0.95fr] lg:px-12 lg:py-32" aria-labelledby="free-up-title">
          <div>
            <div className="eyebrow mb-6">Free up your device</div>
            <h2 id="free-up-title" className="font-display max-w-xl text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-[#152752] sm:text-6xl">Clear space without losing your files.</h2>
            <p className="mt-7 max-w-lg text-base leading-8 text-[#5f6b84]">Comet helps you remove large local copies while keeping the cloud copy safe and visible in your library.</p>
            <ul className="mt-8 space-y-3 text-sm text-[#4f607f]">
              <li className="flex items-start gap-3"><Check size={17} className="mt-0.5 text-[#3558dc]" /><span>See what is taking the most space.</span></li>
              <li className="flex items-start gap-3"><Check size={17} className="mt-0.5 text-[#3558dc]" /><span>Tap “Free up space” for selected files.</span></li>
              <li className="flex items-start gap-3"><Check size={17} className="mt-0.5 text-[#3558dc]" /><span>Open cloud files later when you need them.</span></li>
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-[1.75rem] border border-[#c8ceda] bg-[#f8f5ed] p-6 sm:p-8">
            <div className="aurora-orb" />
            <div className="relative z-10 rounded-2xl border border-[#bfd0ef] bg-[#eef4ff] p-5">
              <div className="flex items-center justify-between border-b border-[#c8d4eb] pb-3">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-[#4c6090]">Storage suggestions</span>
                <span className="text-xs font-semibold text-[#a64646]">18.7 GB can be cleared</span>
              </div>
              <div className="mt-4 space-y-3">
                {[{ name: 'vacation-video-4k.mp4', size: '4.0 GB' }, { name: 'wedding-footage.mov', size: '6.3 GB' }, { name: 'screen-recording.mp4', size: '8.4 GB' }].map((file) => (
                  <div key={file.name} className="hover-lift flex items-center justify-between rounded-xl border border-[#ccdaef] bg-[#f8fbff] px-3 py-2.5">
                    <div>
                      <div className="text-xs font-semibold text-[#20396d]">{file.name}</div>
                      <div className="text-[0.65rem] text-[#6a7a99]">Stored in cloud • remove local copy</div>
                    </div>
                    <span className="font-mono text-[0.63rem] text-[#4f607f]">{file.size}</span>
                  </div>
                ))}
              </div>
              <button type="button" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#ff7c67] px-3.5 py-2 text-xs font-bold text-[#152752]">Free up space <ArrowRight size={13} /></button>
            </div>
          </div>
        </section>

        <section id="storage-follows" className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:px-12 lg:py-20" aria-labelledby="vision-title">
          <div className="order-2 lg:order-1"><div className="relative overflow-hidden rounded-[1.75rem] bg-[#152752] p-5 shadow-[0_30px_70px_-40px_rgba(21,39,82,0.7)] sm:p-8"><div className="mb-6 flex items-center justify-between"><div className="flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[#afbddc]"><span className="h-2 w-2 rounded-full bg-[#71b49c]" />your account</div><span className="font-mono text-[0.65rem] text-[#8298eb]">phone → cloud → laptop → web</span></div><div className="grid grid-cols-3 items-end gap-2 sm:gap-4"><div className="rounded-xl border border-[#5572b5] bg-[#20396d] p-2 sm:p-3"><div className="mb-3 h-2 w-12 rounded bg-[#8298eb]" /><div className="space-y-2"><div className="h-14 rounded-lg bg-[#f1dcd4]" /><div className="h-14 rounded-lg bg-[#dcefe6]" /></div><div className="mt-3 font-mono text-[0.55rem] text-[#afbddc]">desktop</div></div><div className="rounded-xl border border-[#5572b5] bg-[#20396d] p-2 sm:p-3"><div className="mb-3 h-2 w-8 rounded bg-[#ff9b87]" /><div className="space-y-2"><div className="h-9 rounded-lg bg-[#dce3fb]" /><div className="h-9 rounded-lg bg-[#e9e0f2]" /><div className="h-9 rounded-lg bg-[#dcefe6]" /></div><div className="mt-3 font-mono text-[0.55rem] text-[#afbddc]">phone</div></div><div className="rounded-xl border border-[#5572b5] bg-[#20396d] p-2 sm:p-3"><div className="mb-3 h-2 w-10 rounded bg-[#71b49c]" /><div className="space-y-2"><div className="h-10 rounded-lg bg-[#e9e0f2]" /><div className="h-20 rounded-lg bg-[#f1dcd4]" /></div><div className="mt-3 font-mono text-[0.55rem] text-[#afbddc]">web</div></div></div><div className="mt-6 flex items-center justify-center gap-3 font-mono text-[0.63rem] uppercase tracking-[0.1em] text-[#afbddc]"><span className="h-px flex-1 bg-[#5572b5]" /><span>one library / multiple devices</span><span className="h-px flex-1 bg-[#5572b5]" /></div></div></div>
          <div className="order-1 lg:order-2"><div className="eyebrow mb-6">Your storage follows you</div><h2 id="vision-title" className="font-display max-w-xl text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-[#152752] sm:text-6xl">One library. Multiple devices.</h2><p className="mt-7 max-w-lg text-base leading-8 text-[#5f6b84]">Your files stay connected to your account, not trapped on one phone or one laptop. The same library travels with you.</p><button type="button" onClick={() => scrollToId('join')} className="group mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#3558dc]" data-testid="button-vision-join">Get early access updates <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></button></div>
        </section>

        <section id="coming-soon" className="border-y border-[#e7b3a8] bg-[#ffebe5] px-5 py-20 sm:px-8 sm:py-24 lg:px-12" aria-labelledby="future-title">
          <div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-end"><div><div className="eyebrow mb-6 text-[#a64646]">Coming soon · future direction</div><h2 id="future-title" className="font-display max-w-xl text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-[#152752] sm:text-5xl">What we plan to add next.</h2></div><p className="max-w-xs text-sm leading-6 text-[#7d5a5a]">These ideas are in exploration. They are not part of today’s waitlist promise.</p></div><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[{icon: <Globe2 size={20} />, title: 'Sharing links', copy: 'Quickly share selected files with people outside your account.'}, {icon: <Copy size={20} />, title: 'Smarter cleanup', copy: 'More ways to recommend which local files can be safely removed.'}, {icon: <Laptop size={20} />, title: 'Desktop depth', copy: 'A richer desktop experience for heavy file workflows.'}, {icon: <Folder size={20} />, title: 'Team spaces', copy: 'Shared libraries for small teams and collaborative projects.'}].map((item) => <div key={item.title} className="rounded-2xl border border-[#e3b7ae] bg-[#fff3ee] p-6"><div className="mb-10 text-[#a64646]">{item.icon}</div><h3 className="font-display font-semibold text-[#152752]">{item.title}</h3><p className="mt-2 text-sm leading-6 text-[#7d5a5a]">{item.copy}</p></div>)}</div></div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:py-28" aria-labelledby="value-title">
          <div><div className="eyebrow mb-6">What matters most</div><h2 id="value-title" className="font-display max-w-md text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-[#152752] sm:text-5xl">Not just backup. Everyday access.</h2><p className="mt-6 max-w-md text-base leading-7 text-[#5f6b84]">Backup is part of the story. The bigger goal is simple: your files should be available when you need them, across the devices you already use.</p></div>
          <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-[#c8ceda] bg-[#f8f5ed] p-6"><Cloud size={20} className="mb-10 text-[#3558dc]" /><h3 className="font-display font-semibold text-[#152752]">Always in your library</h3><p className="mt-2 text-sm leading-6 text-[#6d7892]">Cloud files stay visible even when local copies are removed.</p></div><div className="rounded-2xl border border-[#c8ceda] bg-[#f8f5ed] p-6"><PanelTop size={20} className="mb-10 text-[#3558dc]" /><h3 className="font-display font-semibold text-[#152752]">Find → Open → Use</h3><p className="mt-2 text-sm leading-6 text-[#6d7892]">Open what you need without manual browser-download-folder steps.</p></div><div className="rounded-2xl border border-[#c8ceda] bg-[#f8f5ed] p-6"><Laptop size={20} className="mb-10 text-[#3558dc]" /><h3 className="font-display font-semibold text-[#152752]">Built for mobile + desktop</h3><p className="mt-2 text-sm leading-6 text-[#6d7892]">Designed from day one for phones and computers, with web access too.</p></div><div className="rounded-2xl border border-[#c8ceda] bg-[#f8f5ed] p-6"><Radio size={20} className="mb-10 text-[#3558dc]" /><h3 className="font-display font-semibold text-[#152752]">Offline choices</h3><p className="mt-2 text-sm leading-6 text-[#6d7892]">Choose files you always want available offline on your current device.</p></div></div>
        </section>

        <section className="bg-[#152752] px-5 py-20 text-[#f7f3e8] sm:px-8 sm:py-24 lg:px-12" aria-labelledby="cta-title">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_0.8fr]"><div><div className="eyebrow mb-6 text-[#ff9b87]">Join the waitlist</div><h2 id="cta-title" className="font-display max-w-2xl text-5xl font-semibold leading-[0.93] tracking-[-0.065em] sm:text-7xl">Ready to stop waiting for files?</h2><p className="mt-7 max-w-md text-base leading-7 text-[#b9c6e3]">Comet launches with individual and team plans. Get early-access updates as we roll out the first private beta.</p></div><div id="bottom-form"><WaitlistForm dark compact /></div></div>
        </section>

        <section id="faq" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28" aria-labelledby="faq-title"><div className="grid gap-12 lg:grid-cols-[0.65fr_1.35fr]"><div><div className="eyebrow mb-6">Questions, honestly</div><h2 id="faq-title" className="font-display text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-[#152752] sm:text-5xl">Before you join.</h2><p className="mt-6 max-w-xs text-sm leading-6 text-[#6d7892]">Clear answers, no inflated promises.</p></div><div>{[{question: 'What is Comet?', answer: 'Comet is an upcoming cloud storage product designed to make your files feel connected to your phone and computer, not separated from them.'}, {question: 'Is Comet available today?', answer: 'Not yet. We are currently collecting waitlist signups and sharing progress updates before private beta access begins.'}, {question: 'Will this replace local storage?', answer: 'No. Local storage still matters. Comet is meant to use local space more intelligently while keeping the rest of your library in the cloud.'}, {question: 'Which platforms are in the plan?', answer: 'Our long-term direction includes Android, iPhone, Windows, macOS, Linux, and web. Waitlist feedback helps us prioritize rollout order.'}, {question: 'Is this just backup?', answer: 'Backup is one part. The bigger idea is access — your files should remain available across devices without keeping every file locally.'}].map((item, index) => <FAQItem key={item.question} {...item} index={index} />)}</div></div></section>
      </main>
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/admin" component={AdminDashboard} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function AdminDashboard() {
  const [signups, setSignups] = useState<SignupEntry[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    byPlatform: [] as Array<{ _id: string; count: number }>,
    byReferral: [] as Array<{ _id: string; count: number }>,
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState('');
  const [activePanel, setActivePanel] = useState<'overview' | 'signups' | 'analytics' | 'exports'>('overview');

  const platformColors: Record<string, string> = {
    macOS: '#3558dc',
    Windows: '#71b49c',
    iPhone: '#ff7c67',
    Android: '#ffb15c',
    Web: '#7f6ae8',
    default: '#94a3b8',
  };

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

  function buildApiUrl(path: string) {
    return `${apiBaseUrl}${path}`;
  }

  const navigateToPanel = (panel: 'overview' | 'signups' | 'analytics' | 'exports') => {
    setActivePanel(panel);

    if (panel === 'exports') {
      exportToCSV();
      return;
    }

    const panelMap = {
      overview: 'admin-overview',
      signups: 'admin-signups',
      analytics: 'admin-analytics',
      exports: 'admin-overview',
    } as const;

    const element = document.getElementById(panelMap[panel]);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      verifyToken(token);
      return;
    }

    const savedToken = sessionStorage.getItem('comet-admin-token');
    if (savedToken) {
      verifyToken(savedToken);
    }
  }, []);

  const hashToken = async (str: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const verifyToken = async (token: string) => {
    const normalizedToken = token.trim();
    const envTokenHash = import.meta.env.VITE_ADMIN_TOKEN_HASH ?? '';
    const expected = envTokenHash ? await hashToken(normalizedToken) : normalizedToken === 'Nm643PpQ';

    if (envTokenHash ? expected === envTokenHash : expected) {
      setIsAuthenticated(true);
      sessionStorage.setItem('comet-admin-token', normalizedToken);
      loadDashboardData();
      setError('');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    setError('Invalid or expired token');
  };

  const loadDashboardData = () => {
    const token = sessionStorage.getItem('comet-admin-token');
    if (!token) return;

    Promise.all([
      fetch(buildApiUrl('/api/signups'), {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
      fetch(buildApiUrl('/api/signups/stats'), {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
    ])
      .then(([signupsRes, statsRes]) => {
        if (signupsRes.success && Array.isArray(signupsRes.data)) {
          setSignups(signupsRes.data);
        }
        if (statsRes.success && statsRes.stats) {
          setStats(statsRes.stats);
        }
      })
      .catch((err) => {
        console.error('Error loading dashboard data:', err);
      });
  };

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!tokenInput.trim()) {
      setError('Please enter a valid admin token');
      return;
    }
    void verifyToken(tokenInput);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('comet-admin-token');
    setSignups([]);
    setStats({ total: 0, byPlatform: [], byReferral: [] });
    setTokenInput('');
    setError('');
  };

  const exportToCSV = () => {
    const token = sessionStorage.getItem('comet-admin-token');

    if (!token) return;
    window.location.href = buildApiUrl(`/api/signups/export/csv?token=${encodeURIComponent(token)}`);
  };

  const maxPlatformValue = Math.max(...stats.byPlatform.map((item) => item.count), 1);
  const maxReferralValue = Math.max(...stats.byReferral.map((item) => item.count), 1);

  const formatPercentage = (value: number, total: number) => {
    if (!total) return '0%';
    return `${Math.round((value / total) * 100)}%`;
  };

  const recentSignups = [...signups].slice(0, 6);
  const mobileUsers = signups.filter((signup) => signup.platforms.some((platform) => ['iPhone', 'Android'].includes(platform))).length;
  const desktopUsers = signups.filter((signup) => signup.platforms.some((platform) => ['macOS', 'Windows'].includes(platform))).length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f8f5ed] flex items-center justify-center px-5">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <Logo />
            <h1 className="mt-6 font-display text-2xl font-semibold text-[#152752]">Admin Dashboard</h1>
          </div>

          <form onSubmit={handleLogin} className="rounded-2xl border border-[#c8ceda] bg-[#f8f5ed] p-8 space-y-4">
            <div>
              <label htmlFor="token" className="block text-xs font-semibold text-[#152752] mb-2">
                Password
              </label>
              <input
                id="token"
                type="password"
                value={tokenInput}
                onChange={(e) => {
                  setTokenInput(e.target.value);
                  setError('');
                }}
                placeholder="Enter password"
                className={`w-full rounded-xl border px-4 py-2 text-sm outline-none focus:border-[#3558dc] bg-[#f8f5ed] ${
                  error ? 'border-[#a64646]' : 'border-[#bec8dc]'
                }`}
              />
            </div>
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-[#ffebe5] p-3">
                <CircleHelp size={16} className="text-[#a64646] shrink-0 mt-0.5" />
                <span className="text-xs text-[#a64646]">{error}</span>
              </div>
            )}
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#3558dc] px-5 py-2.5 text-sm font-bold text-[#f7f3e8] transition-transform hover:-translate-y-0.5"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#152752]">
      <div className="mx-auto flex max-w-[1600px]">
        <aside className="hidden min-h-screen w-72 border-r border-[#dfe7f3] bg-[#0f172a] p-6 text-slate-100 lg:block">
          <div className="mb-10">
            <Logo inverse />
          </div>

          <nav className="space-y-2">
            {[
              { label: 'Overview', active: activePanel === 'overview' },
              { label: 'Signups', active: activePanel === 'signups' },
              { label: 'Analytics', active: activePanel === 'analytics' },
              { label: 'Exports', active: activePanel === 'exports' },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => navigateToPanel(item.label.toLowerCase() as 'overview' | 'signups' | 'analytics' | 'exports')}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${
                  item.active ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <span>{item.label}</span>
                {item.active && <span className="h-2 w-2 rounded-full bg-[#7dd3fc]" />}
              </button>
            ))}
          </nav>

          <div className="mt-10 rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
            <div className="text-[0.62rem] font-mono uppercase tracking-[0.12em] text-slate-400">Access</div>
            <div className="mt-3 text-sm font-medium text-slate-100">Protected admin</div>
            <div className="mt-2 text-xs text-slate-400">Password: Nm643PpQ</div>
          </div>
        </aside>

        <main className="flex-1">
          <header className="border-b border-[#dfe7f3] bg-white/80 backdrop-blur-sm">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
              <div>
                <p className="text-[0.62rem] font-mono uppercase tracking-[0.14em] text-[#6d7892]">Comet admin</p>
                <h1 className="mt-1 font-display text-2xl font-semibold text-[#152752]">Waitlist dashboard</h1>
              </div>

              <div className="flex items-center gap-3">
                <span className="rounded-full bg-[#e8f2e7] px-3 py-1 text-xs font-semibold text-[#204f43]">
                  Live database
                </span>
                <button
                  type="button"
                  onClick={exportToCSV}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#3558dc] px-3.5 py-2 text-xs font-bold text-[#f7f3e8]"
                >
                  <Download size={14} /> Export CSV
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#c8ceda] bg-white px-3.5 py-2 text-xs font-semibold text-[#152752]"
                >
                  <X size={14} /> Logout
                </button>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" id="admin-overview">
              <div className="rounded-2xl border border-[#dfe7f3] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-[0.62rem] font-mono uppercase tracking-[0.12em] text-[#6d7892]">Total signups</div>
                  <div className="rounded-lg bg-[#e8f1ff] p-2 text-[#3558dc]"><Users size={16} /></div>
                </div>
                <div className="mt-5 text-3xl font-bold text-[#152752]">{stats.total || signups.length}</div>
                <div className="mt-2 text-xs text-[#6d7892]">All waitlist submissions</div>
              </div>

              <div className="rounded-2xl border border-[#dfe7f3] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-[0.62rem] font-mono uppercase tracking-[0.12em] text-[#6d7892]">Mobile users</div>
                  <div className="rounded-lg bg-[#fff1eb] p-2 text-[#ff7c67]"><Smartphone size={16} /></div>
                </div>
                <div className="mt-5 text-3xl font-bold text-[#152752]">{mobileUsers}</div>
                <div className="mt-2 text-xs text-[#6d7892]">{formatPercentage(mobileUsers, stats.total || signups.length)} of total</div>
              </div>

              <div className="rounded-2xl border border-[#dfe7f3] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-[0.62rem] font-mono uppercase tracking-[0.12em] text-[#6d7892]">Desktop users</div>
                  <div className="rounded-lg bg-[#eafaf1] p-2 text-[#2b8a6a]"><Laptop size={16} /></div>
                </div>
                <div className="mt-5 text-3xl font-bold text-[#152752]">{desktopUsers}</div>
                <div className="mt-2 text-xs text-[#6d7892]">{formatPercentage(desktopUsers, stats.total || signups.length)} of total</div>
              </div>

              <div className="rounded-2xl border border-[#dfe7f3] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-[0.62rem] font-mono uppercase tracking-[0.12em] text-[#6d7892]">Top referral</div>
                  <div className="rounded-lg bg-[#f3ecff] p-2 text-[#7c5cf2]"><Globe2 size={16} /></div>
                </div>
                <div className="mt-5 text-xl font-bold text-[#152752]">{stats.byReferral[0]?. _id || 'Direct'}</div>
                <div className="mt-2 text-xs text-[#6d7892]">{stats.byReferral[0]?. count || 0} signups</div>
              </div>
            </section>

            <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]" id="admin-analytics">
              <div className="rounded-2xl border border-[#dfe7f3] bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold text-[#152752]">Platform mix</h2>
                  <span className="text-xs text-[#6d7892]">by selection</span>
                </div>

                <div className="space-y-4">
                  {stats.byPlatform.length > 0 ? (
                    stats.byPlatform.map((item) => {
                      const percentage = formatPercentage(item.count, stats.total || signups.length);
                      return (
                        <div key={item._id}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-semibold text-[#152752]">{item._id}</span>
                            <span className="text-[#6d7892]">{item.count} · {percentage}</span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-[#edf2f7]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(item.count / maxPlatformValue) * 100}%`,
                                background: platformColors[item._id] ?? platformColors.default,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-[#6d7892]">No platform data yet.</div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-[#dfe7f3] bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold text-[#152752]">Referral sources</h2>
                  <span className="text-xs text-[#6d7892]">traffic split</span>
                </div>

                <div className="space-y-4">
                  {stats.byReferral.length > 0 ? (
                    stats.byReferral.map((item) => {
                      const percentage = formatPercentage(item.count, stats.total || signups.length);
                      return (
                        <div key={item._id}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-semibold text-[#152752]">{item._id || 'Direct'}</span>
                            <span className="text-[#6d7892]">{item.count} · {percentage}</span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-[#edf2f7]">
                            <div
                              className="h-full rounded-full bg-[#3558dc]"
                              style={{ width: `${(item.count / maxReferralValue) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-[#6d7892]">No referral data yet.</div>
                  )}
                </div>
              </div>
            </section>

            <section className="mt-8 rounded-2xl border border-[#dfe7f3] bg-white p-5 shadow-sm" id="admin-signups">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[0.62rem] font-mono uppercase tracking-[0.12em] text-[#6d7892]">Records</p>
                  <h2 className="mt-1 font-display text-xl font-semibold text-[#152752]">Recent signups</h2>
                </div>
                <span className="text-xs text-[#6d7892]">Latest from the database</span>
              </div>

              {recentSignups.length === 0 ? (
                <div className="text-sm text-[#6d7892]">No signups yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[#f4f7fb]">
                      <tr className="border-b border-[#e5edf8] text-[#6d7892]">
                        <th className="px-4 py-3 font-semibold">Email</th>
                        <th className="px-4 py-3 font-semibold">WhatsApp</th>
                        <th className="px-4 py-3 font-semibold">Devices</th>
                        <th className="px-4 py-3 font-semibold">Source</th>
                        <th className="px-4 py-3 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSignups.map((signup) => (
                        <tr key={`${signup.email}-${signup.timestamp}-row`} className="border-b border-[#edf2f8] align-top last:border-b-0">
                          <td className="px-4 py-3 font-medium text-[#152752]">{signup.email}</td>
                          <td className="px-4 py-3 text-[#152752]">{signup.whatsapp || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {signup.platforms.length > 0 ? (
                                signup.platforms.map((platform) => (
                                  <span
                                    key={`${signup.email}-${platform}-row`}
                                    className="rounded-full px-2 py-1 text-[10px] font-semibold text-white"
                                    style={{ backgroundColor: platformColors[platform] ?? platformColors.default }}
                                  >
                                    {platform}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[#6d7892]">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[#6d7892]">{signup.referral || 'Direct'}</td>
                          <td className="px-4 py-3 text-[#6d7892]">{new Date(signup.timestamp).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
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