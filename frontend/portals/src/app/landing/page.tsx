/**
 * Public-facing marketing landing page for medguard360.com.
 *
 * Lives inside the portals app (Next.js) but mounted at /landing during development.
 * In production, this becomes the root for medguard360.com — separate from the
 * /portal/* surface (which is for authenticated platform users).
 */
export default function LandingPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 text-white">
        <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center font-bold text-brand-700">M</div>
            <div className="font-semibold tracking-tight">MedGuard360</div>
          </div>
          <nav className="flex gap-6 text-sm">
            <a href="#platform"      className="hover:text-brand-100">Platform</a>
            <a href="#fraud-prevention" className="hover:text-brand-100">Fraud Prevention</a>
            <a href="#states"        className="hover:text-brand-100">States</a>
            <a href="#contact"       className="hover:text-brand-100">Contact</a>
            <a href="/" className="rounded-md bg-white text-brand-700 px-3 py-1 hover:bg-brand-50">Sign in</a>
          </nav>
        </header>

        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
            Stop Medicaid fraud <span className="text-brand-200">before</span> it happens.
          </h1>
          <p className="mt-6 text-xl text-brand-100 max-w-2xl mx-auto">
            The first unified platform that prevents fraud, manages claims, and serves members across
            all 50 states — built for state Medicaid agencies, MCOs, and providers.
          </p>
          <div className="mt-10 flex gap-3 justify-center">
            <a href="#contact" className="rounded-md bg-white text-brand-700 px-6 py-3 font-medium hover:bg-brand-50">Request demo</a>
            <a href="#platform" className="rounded-md border border-white/40 px-6 py-3 hover:bg-white/10">See the platform</a>
          </div>
          <div className="mt-12 flex gap-8 justify-center text-sm text-brand-100">
            <div><div className="text-3xl font-bold text-white">$1.2B+</div>fraud prevented (industry-validated)</div>
            <div><div className="text-3xl font-bold text-white">3-5 day</div>credentialing turnaround</div>
            <div><div className="text-3xl font-bold text-white">50 state</div>scalable architecture</div>
          </div>
        </div>
      </section>

      {/* Platform overview */}
      <section id="platform" className="py-20 max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-slate-900 text-center">One platform, twelve core modules</h2>
        <p className="text-center text-slate-600 mt-3 max-w-2xl mx-auto">
          Built end-to-end. Every billing entity, every workflow, every compliance touchpoint.
        </p>
        <div className="grid md:grid-cols-3 gap-4 mt-12">
          {[
            ['Real-time clinical doc', 'Voice + video capture, scispaCy NLP, AI code suggestion'],
            ['Biometric identity', 'Suprema / NEC SDK, 3-second emergency responder access'],
            ['Provider credentialing', '50-state unified, NPI/PECOS/LEIE/SAM/DHSR/license checks'],
            ['AI claim generation', '837P/I, NCPDP D.0, HCPCS — auto-coded from notes'],
            ['Preventive fraud detection', 'GPS + timestamp + doc cross-validation pre-submission'],
            ['Clinical Decision PA Engine', 'BERT criteria matching, plain-language explanations'],
            ['Denial management', 'AI-drafted appeals, human-approved, CARC-aware'],
            ['Crisis plan + responder access', 'Biometric scan, 988 escalation, GPS dispatch'],
            ['Real-time eligibility', '270/271 via NCTracks, MMIS, all 50 states'],
            ['Statewide 1-800 hub', '2-tier AI + human, intent classification, crisis routing'],
            ['Compliance reporting', 'PERM, T-MSIS, fraud reports, automated dashboards'],
            ['AI Governance framework', 'AI assists, humans decide — never autonomous on consequential decisions'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-lg border border-slate-200 p-5">
              <div className="font-semibold text-slate-900">{title}</div>
              <div className="text-sm text-slate-600 mt-2">{body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Fraud prevention */}
      <section id="fraud-prevention" className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center">Fraud prevention, not fraud auditing</h2>
          <p className="text-center text-slate-600 mt-3 max-w-2xl mx-auto">
            Existing tools recover money <em>after</em> it's been paid out. MedGuard360 catches it before submission.
          </p>
          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <div className="rounded-lg bg-white border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 text-lg">10 AI engines, every claim</h3>
              <ul className="mt-3 text-sm text-slate-700 space-y-1">
                <li>• Risk score 1-100 from XGBoost + Isolation Forest ensemble</li>
                <li>• Fraud-ring detection via PyTorch Geometric GNN</li>
                <li>• Provider behavior monitor — license/DEA/malpractice expiry, billing spikes</li>
                <li>• Eligibility intelligence — predicts coverage breaks 60 days out</li>
                <li>• Crisis language detector in clinical notes</li>
              </ul>
            </div>
            <div className="rounded-lg bg-white border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 text-lg">Human-in-the-loop, always</h3>
              <ul className="mt-3 text-sm text-slate-700 space-y-1">
                <li>• AI never auto-denies a PA or claim</li>
                <li>• Fraud cases routed to investigator with explanation</li>
                <li>• Every decision logged to append-only audit trail (HIPAA-grade)</li>
                <li>• Overrides retrain the models quarterly</li>
                <li>• Plain-language reasons on every output</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* States */}
      <section id="states" className="py-20 max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-slate-900 text-center">Built to scale state-by-state</h2>
        <p className="text-center text-slate-600 mt-3">Phase 1 piloting in NC + GA. Phase 2: SC, VA, WV, TN.</p>
        <div className="mt-10 grid grid-cols-2 md:grid-cols-6 gap-3">
          {['NC','SC','GA','VA','WV','TN'].map(s => (
            <div key={s} className="rounded-lg bg-brand-50 border border-brand-200 p-4 text-center">
              <div className="text-2xl font-bold text-brand-800">{s}</div>
              <div className="text-xs text-brand-700 mt-1">Phase {['NC','SC','GA'].includes(s) ? '1' : '2'}</div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-500 mt-8">
          Integration with NCTracks · NC HealthConnex · CMS Interoperability APIs (CMS-0057-F) ·
          MTM Link · ModivCare · CGS DMEPOS · Palmetto GBA
        </p>
      </section>

      {/* Compliance */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold">Built for compliance from day one</h2>
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            <div><div className="text-brand-300 font-semibold">HIPAA</div><div className="text-sm text-slate-300 mt-1">45 CFR 160/164. AES-256 at rest, TLS 1.3 in transit, RLS on every PHI table, append-only audit log.</div></div>
            <div><div className="text-brand-300 font-semibold">SOC 2 Type II</div><div className="text-sm text-slate-300 mt-1">Observation in progress with A-LIGN. HITRUST CSF i1 parallel track.</div></div>
            <div><div className="text-brand-300 font-semibold">42 CFR 455</div><div className="text-sm text-slate-300 mt-1">Risk-based provider screening, NPI/PECOS/LEIE/SAM/DHSR — automated monthly re-screen.</div></div>
            <div><div className="text-brand-300 font-semibold">CMS-0057-F</div><div className="text-sm text-slate-300 mt-1">Da Vinci PAS/CRD/DTR scaffolded for Jan 2027 PA API mandate.</div></div>
            <div><div className="text-brand-300 font-semibold">StateRAMP</div><div className="text-sm text-slate-300 mt-1">Migrating to AWS GovCloud before any production PHI.</div></div>
            <div><div className="text-brand-300 font-semibold">BAA-ready</div><div className="text-sm text-slate-300 mt-1">45 CFR 164.504(e) template with NC + GA state-specific addenda.</div></div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl font-bold text-slate-900">Talk to us</h2>
        <p className="mt-3 text-slate-600">
          State Medicaid agencies, MCOs, provider organizations — request a 30-minute platform walkthrough.
        </p>
        <div className="mt-8 space-y-2">
          <a href="mailto:hello@medguard360.com" className="block text-lg text-brand-700 hover:underline">hello@medguard360.com</a>
          <div className="text-sm text-slate-500">A TRG TechLink company · Built in North Carolina</div>
        </div>
      </section>

      <footer className="bg-slate-100 py-6 text-center text-xs text-slate-500">
        © 2026 MedGuard360 LLC. All rights reserved. ·{' '}
        <a href="/privacy" className="hover:underline">Privacy</a> ·{' '}
        <a href="/terms" className="hover:underline">Terms</a> ·{' '}
        <a href="/notices" className="hover:underline">HIPAA notice of privacy practices</a>
      </footer>
    </div>
  );
}
