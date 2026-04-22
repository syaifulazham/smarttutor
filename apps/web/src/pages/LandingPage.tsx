import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { TUTOR_AVATARS } from '@/data/tutorAvatars';
import CookieBanner from '@/components/shared/CookieBanner';

const PLANS = [
  {
    key: 'FREE',
    name: 'Free',
    price: 'RM 0',
    period: '',
    tagline: 'Mulakan tanpa kad kredit',
    taglineEn: 'Get started, no card needed',
    highlight: false,
    features: ['5 tangkapan soalan / bulan', 'Input teks sahaja', 'Bahasa Inggeris sahaja', '3 sesi tutor / bulan', 'Sejarah 7 hari'],
    locked: ['Tangkapan imej', 'BM & Mandarin', 'Skema jawapan'],
    cta: 'Mulakan Percuma',
    ctaTo: '/register',
    ctaClass: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
  },
  {
    key: 'CERDAS',
    name: 'Cerdas',
    price: 'RM 13.90',
    period: '/ bulan',
    tagline: 'Untuk pelajar yang bersungguh-sungguh',
    taglineEn: 'For students who mean business',
    highlight: true,
    features: ['30 tangkapan soalan / bulan', 'Teks & tangkapan imej', 'BI, BM & Mandarin', 'Sesi tutor tanpa had', 'Skema jawapan penuh', 'Sejarah 90 hari', 'Semua 6 avatar tutor'],
    locked: ['Jana semula skema', 'AI keutamaan'],
    cta: 'Mulakan Cerdas',
    ctaTo: '/register',
    ctaClass: 'bg-primary-600 text-white hover:bg-primary-700',
  },
  {
    key: 'CEMERLANG',
    name: 'Cemerlang',
    price: 'RM 23.90',
    period: '/ bulan',
    tagline: 'Untuk pelajar yang mengejar kecemerlangan',
    taglineEn: 'For students chasing excellence',
    highlight: false,
    features: ['Tangkapan soalan tanpa had', 'Teks & tangkapan imej', 'BI, BM & Mandarin', 'Sesi tutor tanpa had', 'Skema jawapan + jana semula', 'Sejarah tanpa had', 'Semua avatar + AI keutamaan'],
    locked: [],
    cta: 'Mulakan Cemerlang',
    ctaTo: '/register',
    ctaClass: 'bg-violet-600 text-white hover:bg-violet-700',
  },
];

const TUTOR_GREETINGS: Record<string, string> = {
  ayu: 'Hai! Saya Ayu 💙 Tak faham lagi? Takpe, jangan risau. Kita cuba sama-sama, perlahan-lahan. Saya percaya awak boleh buat!',
  sara: 'Hello there 🌸 I\'m Ms. Sara. No rush at all — we\'ll work through this gently, step by step. You\'re already doing better than you think.',
  rajan: 'WOOO! Mr. Rajan dah sampai! 🙌 Jom jom jom — kita BEDAH soalan ni langkah demi langkah! Confirm lepas ni awak rasa soalan tu senang je!',
  chen: 'Good day. Dr. Chen here. We will define the problem, analyse the variables, and solve with precision. No guessing. No shortcuts. Only method.',
  alex: 'Alex. Question in, answer out. ⚡ Tell me what you\'re stuck on. I\'ll get you there — fast.',
  maya: 'Heyy, Maya here! 🎨 Boring kalau buat cara sama je kan? Jom kita approach soalan ni dari angle yang lain — mesti ada cara yang lagi best!',
};

const STEPS = [
  {
    number: '01',
    title: 'Snap atau taip soalan anda',
    titleEn: 'Snap or type your question',
    desc: 'Muat naik foto soalan peperiksaan, tampal teks, atau taip terus. Menyokong soalan SPM, STPM, dan peringkat universiti.',
    descEn: 'Upload a photo, paste text, or type directly. Supports SPM, STPM, and university-level questions.',
    avatar: TUTOR_AVATARS[0],
  },
  {
    number: '02',
    title: 'Pilih tutor & pendekatan anda',
    titleEn: 'Pick your tutor & approach',
    desc: 'Pilih daripada 6 tutor AI dan tentukan: cuba sendiri untuk mendapat maklum balas, atau terima penerangan langkah demi langkah.',
    descEn: 'Choose from 6 AI tutors. Attempt it yourself for feedback, or get a step-by-step explanation straight away.',
    avatar: TUTOR_AVATARS[2],
  },
  {
    number: '03',
    title: 'Belajar dalam bahasa anda',
    titleEn: 'Learn in your language',
    desc: 'Dapatkan penerangan jelas dalam Bahasa Inggeris, Bahasa Melayu, atau Mandarin — dengan persamaan LaTeX, gambar rajah, dan skema jawapan penuh.',
    descEn: 'Clear explanations in English, Bahasa Melayu, or Mandarin — with LaTeX equations, diagrams, and a full marking scheme.',
    avatar: TUTOR_AVATARS[3],
  },
];

const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Tangkap Sebarang Soalan',
    titleEn: 'Capture any question',
    desc: 'Snap foto, tampal teks, atau taip soalan. AI mengekstrak dan menyusun soalan secara automatik.',
    descEn: 'Snap a photo, paste text, or type it. AI extracts and structures the question automatically.',
    avatar: TUTOR_AVATARS[4],
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'Penerangan Langkah demi Langkah',
    titleEn: 'Step-by-step explanations',
    desc: 'Penerangan tersusun dengan persamaan matematik, gambar rajah, dan kuiz ringkas di setiap langkah.',
    descEn: 'Structured explanations with equations, diagrams, and inline quizzes at every step.',
    avatar: TUTOR_AVATARS[1],
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
    ),
    title: 'Sokongan Pelbagai Bahasa',
    titleEn: 'Multilingual support',
    desc: 'Tukar antara Bahasa Inggeris, Bahasa Melayu, dan Mandarin. Tutor anda bercakap dalam bahasa anda.',
    descEn: 'Switch between English, Bahasa Melayu, and Mandarin. Your tutor speaks your language.',
    avatar: TUTOR_AVATARS[2],
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Skema Jawapan Penuh',
    titleEn: 'Full marking scheme',
    desc: 'Dapatkan model jawapan dan skema pemarkahan untuk setiap soalan — berstruktur seperti pemeriksa sebenar.',
    descEn: 'Get a model answer and marking scheme for every question — structured like a real examiner.',
    avatar: TUTOR_AVATARS[3],
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
      </svg>
    ),
    title: 'Mod Cuba Sendiri',
    titleEn: 'Self-attempt mode',
    desc: 'Cuba soalan dahulu, kemudian dapatkan semakan jawapan anda dengan maklum balas terperinci dan markah.',
    descEn: 'Attempt the question first, then get your answer reviewed with detailed feedback and a score.',
    avatar: TUTOR_AVATARS[0],
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Sejarah Soalan Lengkap',
    titleEn: 'Full question history',
    desc: 'Setiap soalan yang ditangkap disimpan bersama sesinya. Semak semula penerangan lalu bila-bila masa.',
    descEn: 'Every captured question is saved with its session. Review past explanations anytime.',
    avatar: TUTOR_AVATARS[5],
  },
];

export default function LandingPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <>
    <div className="min-h-screen bg-white text-gray-900">

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Tcher Ayu" className="h-10 w-auto" />
            <span className="text-xl text-gray-900 tracking-wide" style={{ fontFamily: "'Bitcount Prop Single', sans-serif" }}>TCHER AYU</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <a href="#features" className="text-gray-500 hover:text-gray-900 transition-colors">Ciri-ciri</a>
            <a href="#tutors" className="text-gray-500 hover:text-gray-900 transition-colors">Tutor</a>
            <a href="#pricing" className="text-gray-500 hover:text-gray-900 transition-colors">Harga</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <Link to="/dashboard" className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors">
                {/* Grid icon */}
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span className="hidden sm:inline">Papan Pemuka</span>
              </Link>
            ) : (
              <>
                <Link to="/login" className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors" title="Log Masuk">
                  {/* Person icon */}
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="hidden sm:inline text-sm font-medium">Log Masuk</span>
                </Link>
                <Link to="/register" className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors" title="Mulakan Percuma">
                  {/* Rocket icon */}
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="hidden sm:inline">Mulakan Percuma</span>
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-xs font-semibold mb-6 tracking-wide uppercase">
          Tuisyen AI untuk Pelajar Malaysia
        </div>
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-[1.08] tracking-tight mb-3">
          Snap soalan.<br />
          <span className="text-primary-600">Dapatkan tutor peribadi.</span>
        </h1>
        <p className="text-base text-gray-400 italic mb-5">Snap a question. Get a personal tutor.</p>
        <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-3 leading-relaxed">
          Muat naik sebarang soalan peperiksaan — SPM, STPM, atau universiti — dan tutor AI anda akan membimbing anda langkah demi langkah, dalam bahasa anda.
        </p>
        <p className="text-sm text-gray-400 max-w-xl mx-auto mb-10 italic">
          Upload any exam question and your AI tutor walks you through it step by step, in your language.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap mb-16">
          <Link to="/register" className="px-7 py-3.5 rounded-xl bg-primary-600 text-white font-semibold text-base hover:bg-primary-700 transition-colors shadow-sm">
            Mulakan Percuma
          </Link>
          <a href="#how-it-works" className="px-7 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-base hover:border-gray-300 hover:bg-gray-50 transition-colors">
            Lihat Cara Kerja
          </a>
        </div>
        <div className="flex items-center justify-center gap-4">
          <img
            src={TUTOR_AVATARS[0].url}
            alt={TUTOR_AVATARS[0].name}
            className="w-20 h-20 rounded-full border-4 border-primary-400 object-cover bg-gray-100 shadow-md"
          />
          <p className="text-sm text-gray-400 text-left">6 tutor AI sedia membantu anda<br /><span className="italic">6 AI tutors ready to help</span></p>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-gray-50 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-600 mb-2">Cara Penggunaan <span className="text-primary-300 mx-1">·</span> How it works</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Tiga langkah menuju kefahaman</h2>
            <p className="text-gray-400 italic text-sm mt-1">Three steps to understanding</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.number} className="relative bg-white rounded-2xl p-7 shadow-sm border border-gray-100 overflow-hidden">
                <img src={step.avatar.url} alt="" aria-hidden className="absolute -bottom-4 -right-4 w-28 h-28 object-contain opacity-[0.07] pointer-events-none select-none" />
                <span className="text-4xl font-black text-primary-100 leading-none block mb-4">{step.number}</span>
                <h3 className="text-base font-bold text-gray-900 mb-0.5">{step.title}</h3>
                <p className="text-xs text-gray-400 italic mb-3">{step.titleEn}</p>
                <p className="text-sm text-gray-500 leading-relaxed mb-2">{step.desc}</p>
                <p className="text-xs text-gray-400 italic leading-relaxed">{step.descEn}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section id="features" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-600 mb-2">Ciri-ciri <span className="text-primary-300 mx-1">·</span> Features</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Semua yang anda perlukan untuk cemerlang</h2>
            <p className="text-gray-400 italic text-sm mt-1">Everything you need to ace your exams</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon, title, titleEn, desc, descEn, avatar }) => (
              <div key={title} className="relative bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                <img src={avatar.url} alt="" aria-hidden className="absolute -top-5 -left-5 w-32 h-32 object-contain opacity-[0.06] pointer-events-none select-none group-hover:opacity-[0.1] transition-opacity" />
                <div className="relative z-10">
                  <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center mb-4">
                    {icon}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mb-0.5">{title}</h3>
                  <p className="text-xs text-gray-400 italic mb-2">{titleEn}</p>
                  <p className="text-sm text-gray-500 leading-relaxed mb-1">{desc}</p>
                  <p className="text-xs text-gray-400 italic leading-relaxed">{descEn}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Meet the tutors ─────────────────────────────────────── */}
      <section id="tutors" className="bg-gray-50 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-600 mb-2">Tutor AI Anda <span className="text-primary-300 mx-1">·</span> Your AI tutors</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Pilih tutor yang sesuai dengan gaya anda</h2>
            <p className="text-gray-400 italic text-sm mt-1">Pick the tutor that fits your learning style</p>
            <p className="mt-3 text-gray-500 text-sm max-w-xl mx-auto">Setiap tutor mempunyai personaliti pengajaran yang tersendiri. Anda boleh tukar bila-bila masa.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {TUTOR_AVATARS.map((av) => (
              <div key={av.id} className="group relative flex flex-col items-center gap-3 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-center cursor-default">
                {/* Speech bubble */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-52 bg-gray-900 text-white text-xs leading-relaxed rounded-2xl px-4 py-3 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
                  {TUTOR_GREETINGS[av.id]}
                  {/* Bubble tail */}
                  <span className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900" />
                </div>
                <img src={av.url} alt={av.name} className="w-20 h-20 object-contain rounded-xl bg-gray-50 group-hover:scale-105 transition-transform duration-200" />
                <div>
                  <p className="text-sm font-bold text-gray-900">{av.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug">{av.tagline}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────── */}
      <section id="pricing" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-600 mb-2">Harga <span className="text-primary-300 mx-1">·</span> Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Lebih murah daripada satu sesi tuisyen</h2>
            <p className="text-gray-400 italic text-sm mt-1">Less than one tutoring session a month</p>
            <p className="mt-2 text-gray-500 text-sm">Batalkan pada bila-bila masa. Tiada bayaran tersembunyi. <span className="italic text-gray-400">Cancel anytime. No hidden fees.</span></p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {PLANS.map((plan) => (
              <div
                key={plan.key}
                className={`relative rounded-2xl p-7 border-2 flex flex-col ${
                  plan.highlight
                    ? 'border-primary-500 shadow-lg shadow-primary-100'
                    : 'border-gray-100 shadow-sm'
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full text-xs font-bold bg-primary-600 text-white tracking-wide uppercase whitespace-nowrap">
                    Paling Popular
                  </span>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-extrabold text-gray-900">{plan.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{plan.tagline}</p>
                  <p className="text-xs text-gray-400 italic mb-4">{plan.taglineEn}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black text-gray-900">{plan.price}</span>
                    {plan.period && <span className="text-sm text-gray-400 mb-1.5">{plan.period}</span>}
                  </div>
                </div>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                  {plan.locked.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to={plan.ctaTo} className={`w-full py-3 rounded-xl text-sm font-bold text-center transition-colors ${plan.ctaClass}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-8">
            Harga dalam Ringgit Malaysia (MYR) · Dibilkan setiap bulan · Batalkan bila-bila masa
          </p>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section className="bg-primary-600 py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="flex justify-center -space-x-3 mb-6">
            {TUTOR_AVATARS.slice(0, 4).map((av) => (
              <img key={av.id} src={av.url} alt={av.name} className="w-12 h-12 rounded-full border-2 border-primary-500 object-cover bg-primary-400" />
            ))}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">
            Tutor AI anda sedang menunggu
          </h2>
          <p className="text-primary-200 italic text-sm mb-4">Your AI tutor is waiting</p>
          <p className="text-primary-200 text-base mb-8 max-w-xl mx-auto">
            Sertai pelajar di seluruh Malaysia yang semakin bijak setiap hari. Mulakan percuma — tanpa kad kredit diperlukan.
          </p>
          <Link to="/register" className="inline-block px-8 py-3.5 rounded-xl bg-white text-primary-700 font-bold text-base hover:bg-primary-50 transition-colors shadow-sm">
            Mulakan Percuma Sekarang
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="bg-gray-900 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Tcher Ayu" className="h-8 w-auto opacity-80" />
            <span className="text-sm text-gray-400 tracking-wide" style={{ fontFamily: "'Bitcount Prop Single', sans-serif" }}>TCHER AYU</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#features" className="hover:text-gray-300 transition-colors">Ciri-ciri</a>
            <a href="#tutors" className="hover:text-gray-300 transition-colors">Tutor</a>
            <a href="#pricing" className="hover:text-gray-300 transition-colors">Harga</a>
            <Link to="/login" className="hover:text-gray-300 transition-colors">Log Masuk</Link>
          </div>
          <p className="text-xs text-gray-600">© {new Date().getFullYear()} Tcher Ayu. Hak cipta terpelihara.</p>
        </div>
      </footer>

    </div>

    <CookieBanner />
    </>
  );
}
