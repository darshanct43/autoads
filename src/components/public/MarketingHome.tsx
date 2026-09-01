import { useEffect } from 'react';

interface MarketingHomeProps { path: string; }

type PageConfig = {
  title: string;
  description: string;
  eyebrow: string;
  heading: string;
  intro: string;
  primaryLabel: string;
  sectionHeading: string;
  sectionBody: string;
};

const pages: Record<string, PageConfig> = {
  '/': {
    title: 'Auto Rickshaw Advertising & Auto Advertising in Karnataka | AutoAds',
    description: 'AutoAds offers auto rickshaw advertising, auto advertising, and digital screen advertising inside passenger autos in Karnataka. Starting in Hassan and expanding city by city.',
    eyebrow: 'MAYAAN PRESENTS AUTOADS',
    heading: 'Auto rickshaw advertising that reaches local customers.',
    intro: 'AutoAds connects brands with passenger-auto audiences through digital screens installed inside autos. Advertise on auto rickshaws while drivers host campaigns on their daily routes.',
    primaryLabel: 'Advertise with AutoAds',
    sectionHeading: 'Hyperlocal digital advertising in passenger autos',
    sectionBody: 'Launch an auto advertising campaign, choose the city you want to reach, and build local visibility through screens inside passenger autos. AutoAds is currently operating in Hassan and preparing for Chikkamagaluru.',
  },
  '/for-drivers': {
    title: 'Earn by Hosting Ads in Your Auto | AutoAds',
    description: 'Passenger-auto drivers in Hassan and Chikkamagaluru can host AutoAds screens, display brand campaigns, and build an additional income opportunity around their daily routes.',
    eyebrow: 'FOR PASSENGER-AUTO DRIVERS',
    heading: 'Turn your daily auto routes into an earning opportunity.',
    intro: 'AutoAds installs a digital advertising screen inside your passenger auto. Host approved ad displays while you work and use the platform to manage your driver account.',
    primaryLabel: 'Driver login or registration',
    sectionHeading: 'Why drivers join AutoAds',
    sectionBody: 'Get an easy screen setup, display campaigns while serving passengers, and manage your AutoAds activity through one account. Availability begins city by city, starting with Hassan and expanding to Chikkamagaluru.',
  },
  '/for-brands': {
    title: 'Auto Rickshaw Advertising Cost & Packages in Karnataka | AutoAds',
    description: 'Compare auto rickshaw advertising cost and auto advertising packages with AutoAds. Advertise on digital screens inside passenger autos in Hassan and Chikkamagaluru from ₹19 per day for one auto.',
    eyebrow: 'FOR BRANDS AND LOCAL BUSINESSES',
    heading: 'Advertise your business on passenger auto screens.',
    intro: 'AutoAds helps brands advertise on auto rickshaws through digital screens inside passenger autos. Start from ₹19 per day for one auto and build visibility across your target city.',
    primaryLabel: 'Start an advertising enquiry',
    sectionHeading: 'Affordable auto advertising for local businesses',
    sectionBody: 'Use advertising on auto rickshaws to promote a local business, offer, event, product, or service. Ask about auto advertising rates, campaign packages, and city-by-city reach starting in Hassan and expanding to Chikkamagaluru.',
  },
  '/locations/hassan': {
    title: 'Auto Rickshaw Advertising in Hassan, Karnataka | AutoAds',
    description: 'Reach customers in Hassan through auto rickshaw advertising and digital screen advertising inside passenger autos. AutoAds supports local brands and passenger-auto drivers in Hassan, Karnataka.',
    eyebrow: 'AUTOADS IN HASSAN',
    heading: 'Auto rickshaw advertising in Hassan.',
    intro: 'AutoAds is currently operating in Hassan, Karnataka. Brands can advertise on auto rickshaws through screens inside passenger autos, while local drivers can join the network and host ad displays.',
    primaryLabel: 'Enquire about Hassan advertising',
    sectionHeading: 'Built for Hassan businesses and drivers',
    sectionBody: 'Whether you are promoting a local business or looking for an additional earning opportunity as a passenger-auto driver, AutoAds brings both sides of the network together in Hassan.',
  },
  '/locations/chikkamagaluru': {
    title: 'Auto Rickshaw Advertising in Chikkamagaluru | AutoAds',
    description: 'AutoAds is expanding to Chikkamagaluru with auto rickshaw advertising and digital screens inside passenger autos for local brands and driver partners.',
    eyebrow: 'COMING NEXT TO CHIKKAMAGALURU',
    heading: 'Auto rickshaw advertising is coming to Chikkamagaluru.',
    intro: 'AutoAds is preparing to expand from Hassan to Chikkamagaluru, Karnataka. Local brands and passenger-auto drivers can register interest for the next auto advertising launch.',
    primaryLabel: 'Register interest for Chikkamagaluru',
    sectionHeading: 'Be ready for the next city launch',
    sectionBody: 'Advertisers can plan local campaigns, and drivers can learn about joining the AutoAds network. The rollout is designed to grow city by city with local partners.',
  },
};

function setMeta(name: string, content: string) {
  let element = document.head.querySelector('meta[name="' + name + '"]') as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.name = name;
    document.head.appendChild(element);
  }
  element.content = content;
}

function setCanonical(path: string) {
  const url = 'https://autoads.co.in' + (path === '/' ? '/' : path);
  let element = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }
  element.href = url;
}

export default function MarketingHome({ path }: MarketingHomeProps) {
  const page = pages[path] || pages['/'];

  useEffect(() => {
    document.title = page.title;
    setMeta('description', page.description);
    setMeta('og:title', page.title);
    setMeta('og:description', page.description);
    setMeta('og:url', 'https://autoads.co.in' + path);
    setCanonical(path);
  }, [page, path]);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      <header className="border-b border-white/10 bg-black/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-5">
          <a href="/" className="text-lg font-black italic tracking-tight text-amber-400">AUTOADS</a>
          <nav aria-label="Primary navigation" className="hidden gap-6 text-xs font-bold uppercase tracking-wider text-slate-300 md:flex">
            <a href="/for-drivers" className="hover:text-amber-400">For Drivers</a>
            <a href="/for-brands" className="hover:text-amber-400">For Brands</a>
            <a href="/locations/hassan" className="hover:text-amber-400">Hassan</a>
            <a href="/locations/chikkamagaluru" className="hover:text-amber-400">Chikkamagaluru</a>
          </nav>
          <a href="/login" className="rounded-full bg-amber-400 px-4 py-2 text-xs font-black uppercase tracking-wider text-black hover:bg-white">Login / Register</a>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-24 md:pb-28 md:pt-32" aria-labelledby="page-heading">
          <div className="max-w-4xl">
            <p className="mb-6 text-xs font-black uppercase tracking-[0.35em] text-amber-400">{page.eyebrow}</p>
            <h1 id="page-heading" className="max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-7xl">{page.heading}</h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">{page.intro}</p>
            <div className="mt-9 flex flex-wrap gap-4">
              <a href="/login" className="rounded-xl bg-amber-400 px-6 py-4 text-sm font-black uppercase tracking-wide text-black hover:bg-white">{page.primaryLabel}</a>
              <a href="/for-drivers" className="rounded-xl border border-white/20 px-6 py-4 text-sm font-black uppercase tracking-wide text-white hover:border-amber-400 hover:text-amber-400">I am a driver</a>
              <a href="/for-brands" className="rounded-xl border border-white/20 px-6 py-4 text-sm font-black uppercase tracking-wide text-white hover:border-amber-400 hover:text-amber-400">I am a brand</a>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-[#0b0f19]" aria-labelledby="section-heading">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-2 md:py-20">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-400">WHY AUTOADS</p>
              <h2 id="section-heading" className="mt-4 text-3xl font-black tracking-tight md:text-5xl">{page.sectionHeading}</h2>
            </div>
            <p className="text-lg leading-8 text-slate-300">{page.sectionBody}</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16 md:py-20" aria-labelledby="audiences-heading">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-400">ONE NETWORK, TWO SIDES</p>
          <h2 id="audiences-heading" className="mt-4 text-3xl font-black tracking-tight md:text-5xl">Made for drivers and brands.</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
              <h3 className="text-2xl font-black">For passenger-auto drivers</h3>
              <p className="mt-4 leading-7 text-slate-300">Host a screen inside your auto, display approved campaigns on your daily routes, and manage your activity through AutoAds.</p>
              <a href="/for-drivers" className="mt-6 inline-block font-black text-amber-400 hover:text-white">Learn about joining →</a>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
              <h3 className="text-2xl font-black">For brands and local businesses</h3>
              <p className="mt-4 leading-7 text-slate-300">Promote your business on screens inside passenger autos, starting from ₹19 per day for one auto, with city-by-city reach.</p>
              <a href="/for-brands" className="mt-6 inline-block font-black text-amber-400 hover:text-white">Plan an advertising campaign →</a>
            </article>
          </div>
        </section>

        <section className="border-t border-white/10 bg-amber-400 px-6 py-14 text-black md:py-20" aria-labelledby="locations-heading">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-black uppercase tracking-[0.3em]">CITY-BY-CITY NETWORK</p>
            <h2 id="locations-heading" className="mt-4 text-3xl font-black tracking-tight md:text-5xl">Starting in Hassan. Expanding to Chikkamagaluru.</h2>
            <div className="mt-8 flex flex-wrap gap-3 text-sm font-black">
              <a href="/locations/hassan" className="rounded-full bg-black px-5 py-3 text-white hover:bg-white hover:text-black">AutoAds in Hassan</a>
              <a href="/locations/chikkamagaluru" className="rounded-full bg-black px-5 py-3 text-white hover:bg-white hover:text-black">AutoAds in Chikkamagaluru</a>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#0b0f19]" aria-labelledby="keyword-heading">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-400">AUTO ADVERTISING FOR LOCAL BUSINESSES</p>
            <h2 id="keyword-heading" className="mt-4 text-3xl font-black tracking-tight md:text-5xl">Digital advertising inside passenger autos.</h2>
            <p className="mt-5 max-w-4xl text-lg leading-8 text-slate-300">Looking for auto rickshaw advertising cost, auto advertising rates, or an affordable way to advertise your business on auto rickshaws? AutoAds uses digital screens inside passenger autos for hyperlocal advertising, helping brands reach people during everyday travel. Ask about auto advertising packages and city availability.</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16 md:py-20" aria-labelledby="kannada-heading">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-400">ಕನ್ನಡದಲ್ಲಿ</p>
          <h2 id="kannada-heading" className="mt-4 text-3xl font-black tracking-tight">ಪ್ರಯಾಣಿಕ ಆಟೋಗಳಲ್ಲಿ ಜಾಹೀರಾತು</h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">AutoAds ಪ್ರಯಾಣಿಕ ಆಟೋಗಳ ಒಳಗೆ ಅಳವಡಿಸಿದ ಡಿಜಿಟಲ್ ಪರದೆಗಳ ಮೂಲಕ ಸ್ಥಳೀಯ ಗ್ರಾಹಕರನ್ನು ತಲುಪಲು ಬ್ರ್ಯಾಂಡ್‌ಗಳಿಗೆ ಸಹಾಯ ಮಾಡುತ್ತದೆ. ಆಟೋ ಚಾಲಕರು ಜಾಹೀರಾತು ಪ್ರದರ್ಶಿಸಿ ಹೆಚ್ಚುವರಿ ಆದಾಯದ ಅವಕಾಶ ಪಡೆಯಬಹುದು. ನಾವು ಹಾಸನದಿಂದ ಆರಂಭಿಸಿ ಚಿಕ್ಕಮಗಳೂರಿಗೆ ವಿಸ್ತರಿಸುತ್ತಿದ್ದೇವೆ.</p>
        </section>
      </main>

      <footer className="border-t border-white/10 px-6 py-8 text-sm text-slate-500">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <span>© {new Date().getFullYear()} AutoAds by Mayaan</span>
          <a href="/login" className="font-bold text-slate-300 hover:text-amber-400">Login / Register</a>
        </div>
      </footer>
    </div>
  );
}
