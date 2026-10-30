import React, { useEffect, useMemo, useRef, useState } from "react";
import { mountPlaceListMap, mapsDirectionsUrl } from "@meta-ai/artifact-maps/helpers";
import "@meta-ai/artifact-maps/index.css";
import {
  Plane, MapPin, Route, Clock3, HeartHandshake,
  Briefcase, Moon, Sparkles, ShieldCheck, Crown,
  Phone, Mail, Instagram, Facebook, MessageCircle,
  Star, ArrowUpRight, Navigation, Sun, Calculator,
  Quote, Timer, CarFront, Check, ChevronRight,
  Cookie, X, Settings2, Shield, FileText, Scale,
  Info, Eye, Lock
} from "lucide-react";

// Types
type Reservation = {
  nom: string;
  telephone: string;
  email: string;
  depart: string;
  arrivee: string;
  date: string;
  heure: string;
  passagers: string;
  service: string;
  km: number;
  periode: "jour" | "nuit";
  prix: number;
  options: string;
};

type ContactMsg = { nom: string; email: string; message: string };
type Review = { nom: string; trajet: string; note: number; message: string };

type CookiePrefs = {
  necessary: boolean;
  audience: boolean;
  marketing: boolean;
  status: 'accepted' | 'refused' | 'custom';
  date: string;
};

const SERVICES = [
  { icon: Plane, label: "Transfert aéroports / gares", desc: "Rennes, Brest, Dinard, Saint-Brieuc. Prise en charge ponctuelle avec suivi vol." },
  { icon: MapPin, label: "Trajet local", desc: "Courses en Côtes d'Armor, confort premium et discrétion absolue." },
  { icon: Route, label: "Trajet longues distances", desc: "Paris, Nantes, grandes villes. Trajet direct sans stress." },
  { icon: Clock3, label: "Mise à disposition", desc: "Chauffeur à l'heure, journée ou demi-journée. Vous gérez, on conduit." },
  { icon: HeartHandshake, label: "Événements / Mariage", desc: "Décoration sobre, costume, ponctualité millimétrée pour votre jour J." },
  { icon: Briefcase, label: "Trajet pro", desc: "Facturation entreprise, confidentialité, Wi-Fi et eau à bord." },
  { icon: Moon, label: "Soirée / Plages", desc: "Retour sécurisé de soirée, plages de Perros, Erquy, Paimpol." },
];

const WHY = [
  { title: "Excellence & Ponctualité", text: "Arrivée 10 min avant. Suivi en temps réel. Zéro retard toléré.", icon: Timer },
  { title: "Véhicule haut de gamme", text: "Berline noire full options, cuir, clim, bouteilles d'eau, entretien maniaque.", icon: Crown },
  { title: "Chauffeur pro & Discret", text: "Tenue élégante, conduite souple, confidentialité totale.", icon: ShieldCheck },
  { title: "24/7 & Prix transparent", text: "Devis clair au km. Pas de surprise. Disponible même à 3h du matin.", icon: Sparkles },
];

const ZONES = ["Saint-Brieuc", "Lannion", "Guingamp", "Perros-Guirec", "Paimpol", "Dinan", "Lamballe", "Erquy", "Binic", "Rennes", "Brest", "Dinard"];

const PLACES = [
  { label: "Saint-Brieuc", latitude: 48.51572, longitude: -2.7639, approximate: true, resolved_address: "Saint-Brieuc, Bretagne, France" },
  { label: "Lannion", latitude: 48.73062, longitude: -3.45983, approximate: true, resolved_address: "Lannion, Bretagne, France" },
  { label: "Perros-Guirec", latitude: 48.81407, longitude: -3.44377, approximate: true, resolved_address: "Perros-Guirec, Bretagne, France" },
];

// Numéro pro ALTITUDE VTC - Format international requis
const WHATSAPP_DISPLAY = "07 43 34 65 24";
const WHATSAPP_INTL = "33743346524";
const WA_BASE = "https://wa.me/33743346524";
const CONTACT_EMAIL = "contact@altitudevtc.fr";
const MAILTO = "mailto:contact@altitudevtc.fr";

export default function App() {
  // Reservation form state
  const [form, setForm] = useState<Reservation>({
    nom: "", telephone: "", email: "",
    depart: "", arrivee: "",
    date: "", heure: "",
    passagers: "2", service: SERVICES[0].label,
    km: 45, periode: "jour", prix: 0, options: ""
  });
  const [autoPeriode, setAutoPeriode] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveInfo, setSaveInfo] = useState<{saved:number,remaining:number,error:string|null}|null>(null);
  const [reservationConsent, setReservationConsent] = useState(false);

  // Contact
  const [contact, setContact] = useState<ContactMsg>({ nom:"", email:"", message:"" });
  const [contactSaving, setContactSaving] = useState(false);
  const [contactConsent, setContactConsent] = useState(false);

  // Reviews persistence
  const [reviews, setReviews] = useState<(Review & {id:string})[]>([]);
  const [newReview, setNewReview] = useState<Review>({ nom:"", trajet:"Transfert aéroport", note:5, message:"" });
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Map refs
  const mapRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement|null)[]>([]);
  const [mapUnavailable, setMapUnavailable] = useState(false);

  // Cookie & Legal state
  const [showCookieBanner, setShowCookieBanner] = useState(false);
  const [showPersonalizeModal, setShowPersonalizeModal] = useState(false);
  const [cookiePrefs, setCookiePrefs] = useState<CookiePrefs>({
    necessary: true,
    audience: false,
    marketing: false,
    status: 'refused',
    date: new Date().toISOString()
  });
  const [personalizePrefs, setPersonalizePrefs] = useState({ audience: false, marketing: false });
  const [activeLegal, setActiveLegal] = useState<'mentions'|'confidentialite'|'cookies'|'cgv'|null>(null);

  // Tarif logic
  const tarif = form.periode === "jour" ? 2.40 : 2.50;
  const prixEstime = useMemo(() => +(form.km * tarif).toFixed(2), [form.km, tarif]);

  useEffect(() => {
    setForm(f => ({ ...f, prix: prixEstime }));
  }, [prixEstime]);

  // Auto jour/nuit from heure
  useEffect(() => {
    if (!autoPeriode || !form.heure) return;
    const h = parseInt(form.heure.split(":")[0] || "12", 10);
    const isJour = h >= 6 && h <= 20;
    setForm(f => ({ ...f, periode: isJour ? "jour" : "nuit" }));
  }, [form.heure, autoPeriode]);

  // Cookie consent init
  useEffect(() => {
    try {
      const stored = localStorage.getItem('altitude_cookie_consent');
      if (stored) {
        const parsed = JSON.parse(stored) as CookiePrefs;
        setCookiePrefs(parsed);
        setPersonalizePrefs({ audience: parsed.audience, marketing: parsed.marketing });
        setShowCookieBanner(false);
      } else {
        // small delay for premium entrance
        setTimeout(() => setShowCookieBanner(true), 800);
      }
    } catch {
      setTimeout(() => setShowCookieBanner(true), 800);
    }
  }, []);

  const saveCookiePrefs = (prefs: CookiePrefs) => {
    try {
      localStorage.setItem('altitude_cookie_consent', JSON.stringify(prefs));
    } catch {}
    setCookiePrefs(prefs);
    setShowCookieBanner(false);
    setShowPersonalizeModal(false);
  };

  const handleAcceptAll = () => {
    const prefs: CookiePrefs = {
      necessary: true,
      audience: true,
      marketing: true,
      status: 'accepted',
      date: new Date().toISOString()
    };
    saveCookiePrefs(prefs);
    setPersonalizePrefs({ audience: true, marketing: true });
  };

  const handleRefuseAll = () => {
    const prefs: CookiePrefs = {
      necessary: true,
      audience: false,
      marketing: false,
      status: 'refused',
      date: new Date().toISOString()
    };
    saveCookiePrefs(prefs);
    setPersonalizePrefs({ audience: false, marketing: false });
  };

  const handleSavePersonalize = () => {
    const prefs: CookiePrefs = {
      necessary: true,
      audience: personalizePrefs.audience,
      marketing: personalizePrefs.marketing,
      status: 'custom',
      date: new Date().toISOString()
    };
    saveCookiePrefs(prefs);
  };

  // Load records
  useEffect(() => {
    const load = async () => {
      try {
        // @ts-ignore
        const res = await fetch("actions", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ action:"records.list", args:{ collection:"reviews", limit:50 } }) }).then(r=>r.json());
        if (res?.data?.records) {
          setReviews(res.data.records.map((r:any)=>({ id:r.id, ...r.value })));
        }
      } catch {}
    };
    load();
  }, []);

  // Mount map
  useEffect(() => {
    if (!mapRef.current) return;
    const rows = rowRefs.current.filter(Boolean) as HTMLElement[];
    const places = PLACES.map(p=>({ label:p.label, lat:p.latitude, lng:p.longitude }));
    try {
      const map = mountPlaceListMap(mapRef.current, { places, rows }, () => setMapUnavailable(true));
      return () => { try { map?.destroy(); } catch {} };
    } catch {
      setMapUnavailable(true);
    }
  }, []);

  // Helpers for persistence
  async function createRow(collection:string, value:any, key?:string) {
    const body = { action:"records.create", args:{ collection, value, ...(key?{idempotency_key:key}:{}) } };
    const res = await fetch("actions", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(body) }).then(r=>r.json());
    if (res?.error) throw new Error(res.error);
    return res.data;
  }

  const handleReservationWhatsApp = async () => {
    if (!reservationConsent) {
      alert("Veuillez accepter la politique de confidentialité pour continuer.");
      return;
    }
    // Message pré-rempli au format demandé
    const departLabel = form.depart || "[DÉPART]";
    const arriveeLabel = form.arrivee || "[ARRIVÉE]";
    const dateLabel = form.date || "[DATE]";
    const heureLabel = form.heure || "[HEURE]";
    const jourNuitLabel = form.periode === "jour" ? "JOUR" : "NUIT";
    const nomLabel = form.nom || "[NOM]";
    const telLabel = form.telephone || "[TEL]";
    const message = `Bonjour ALTITUDE VTC 👋, je souhaite réserver un trajet : ${departLabel} → ${arriveeLabel}, le ${dateLabel} à ${heureLabel}, ${form.km} km - Estimation ${prixEstime.toFixed(2)}€ (${jourNuitLabel}). Mon nom: ${nomLabel}, Tel: ${telLabel}`;

    setSaving(true);
    setSaveInfo(null);
    let saved=0; let error:string|null=null;
    try {
      await createRow("reservations", { ...form, prix: prixEstime, created: new Date().toISOString(), consentRGPD: true }, `res-${form.telephone}-${form.date}-${form.heure}`);
      saved=1;
    } catch(e:any){ error = e.message || String(e); }
    setSaveInfo({ saved, remaining: saved?0:1, error });
    setSaving(false);
    const url = `https://wa.me/${WHATSAPP_INTL}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleDevisEmail = async () => {
    if (!reservationConsent) {
      alert("Veuillez accepter la politique de confidentialité pour continuer.");
      return;
    }
    setSaving(true);
    try {
      await createRow("reservations", { ...form, prix: prixEstime, type:"devis", created: new Date().toISOString(), consentRGPD: true }, `devis-${Date.now()}`);
      setSaveInfo({ saved:1, remaining:0, error:null });
      alert("Demande de devis enregistrée. Nous vous répondons sous 15 minutes.");
    } catch(e:any){ setSaveInfo({ saved:0, remaining:1, error:e.message }); }
    setSaving(false);
  };

  const handleContact = async () => {
    if (!contact.nom || !contact.email || !contact.message) return;
    if (!contactConsent) {
      alert("Veuillez accepter la politique de confidentialité pour envoyer votre message.");
      return;
    }
    setContactSaving(true);
    try {
      await createRow("contacts", { ...contact, date: new Date().toISOString(), consentRGPD: true }, `contact-${Date.now()}`);
      setContact({ nom:"", email:"", message:"" });
      setContactConsent(false);
      alert("Message envoyé — réponse rapide.");
    } catch {}
    setContactSaving(false);
  };

  const handleReview = async () => {
    if (!newReview.nom || !newReview.message) return;
    try {
      const rec = await createRow("reviews", { ...newReview, date: new Date().toISOString() }, `rev-${Date.now()}`);
      setReviews(r=>[{ id: rec.id, ...newReview }, ...r]);
      setNewReview({ nom:"", trajet:"Transfert aéroport", note:5, message:"" });
      setShowReviewForm(false);
    } catch {}
  };

  const scrollTo = (id:string) => {
    document.getElementById(id)?.scrollIntoView({ behavior:"smooth", block:"start" });
  };

  return (
    <div data-safe-area-inset-root className="min-h-screen bg-[var(--bg)] text-[var(--ink)] selection:bg-[var(--gold-soft)] overflow-x-clip" style={{ boxSizing:"border-box", paddingTop:"var(--safe-area-inset-top)" }}>
      {/* HEADER */}
      <header data-safe-area-sticky-top className="sticky z-50 backdrop-blur-xl border-b border-[var(--line)] bg-[var(--bg)]/80" style={{ top: "calc(var(--safe-area-inset-top) + 0px)" }}>
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="leading-[0.9]">
              <div className="font-[700] tracking-[0.18em] text-[14px]">ALTITUDE</div>
              <div className="font-[700] tracking-[0.32em] text-[12px] text-[var(--gold)] -mt-[1px]">VTC</div>
            </div>
            <nav className="hidden lg:flex items-center gap-7 text-[13px] tracking-wide">
              {[
                ["Services","services"],
                ["Tarifs","tarifs"],
                ["Pourquoi nous","pourquoi"],
                ["Avis","avis"],
                ["Zone","zone"],
                ["Contact","contact"],
              ].map(([label,id])=>(
                <button key={id} onClick={()=>scrollTo(id)} className="opacity-70 hover:opacity-100 transition-opacity uppercase tracking-[0.12em]">{label}</button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-[11px] tracking-widest uppercase opacity-60">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 24/24 7J/7
            </div>
            <a href={`https://wa.me/${WHATSAPP_INTL}?text=Bonjour%20ALTITUDE%20VTC%2C%20je%20souhaite%20r%C3%A9server%20un%20trajet`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 bg-[var(--black)] text-white px-5 h-10 rounded-full text-[13px] font-medium hover:bg-[var(--black-soft)] transition-colors">
              <span className="hidden sm:inline">Réserver votre trajet</span><span className="sm:hidden">Réserver</span> <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[#0A0A0A]" />
          <div className="absolute inset-0 opacity-[0.35]" style={{ background: "radial-gradient(1200px 600px at 70% -10%, #C5A46D55, transparent 60%), radial-gradient(900px 600px at -10% 80%, #FFFFFF18, transparent)" }} />
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--gold)]/40 to-transparent" />
        </div>
        <div className="relative mx-auto max-w-[1280px] px-6 lg:px-8 py-20 lg:py-28 grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 border border-white/15 bg-white/[0.06] backdrop-blur rounded-full px-4 h-8 text-[11px] tracking-[0.18em] uppercase text-white/80">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]" /> Chauffeur privé • Côtes d'Armor • Premium
            </div>
            <h1 className="mt-8 text-white leading-[0.9] tracking-[-0.02em]">
              <span className="block text-[14px] tracking-[0.35em] font-normal text-[var(--gold)] mb-4">L'EXCELLENCE PREND LA ROUTE</span>
              <span className="block text-[56px] lg:text-[88px] font-[700]">ALTITUDE</span>
              <span className="block text-[56px] lg:text-[88px] font-[300] -mt-3">VTC</span>
            </h1>
            <p className="mt-6 max-w-[520px] text-[18px] leading-[1.6] text-white/70">
              Chauffeur privé disponible <span className="text-white">24/24 7j/7</span> en Bretagne. Transferts aéroports, trajets pro et événements avec exigence absolue.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={`https://wa.me/${WHATSAPP_INTL}?text=Bonjour%20ALTITUDE%20VTC%20je%20souhaite%20r%C3%A9server`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 bg-[var(--gold)] text-black px-7 h-[48px] rounded-full font-medium text-[14px] hover:bg-[var(--gold-deep)] transition-colors">
                <MessageCircle size={16} /> Réserver votre trajet
              </a>
              <button onClick={()=>scrollTo("reserver")} className="inline-flex items-center gap-2 border border-white/20 text-white px-7 h-[48px] rounded-full text-[14px] hover:bg-white/10 transition-colors">
                <Calculator size={16} /> Calculer mon trajet
              </button>
            </div>
            <div className="mt-10 flex flex-wrap gap-2">
              {["Transfert aéroports/gares","Ponctuel","Discret","Confort","Facturation pro"].map(b=>(
                <span key={b} className="px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-white/70 text-[11px] tracking-wide uppercase">{b}</span>
              ))}
            </div>
          </div>

          {/* hero card */}
          <div className="relative">
            <div className="relative rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-6 lg:p-7 shadow-[0_32px_80px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-black text-white grid place-items-center"><CarFront size={20} /></div>
                  <div>
                    <div className="text-[13px] font-semibold tracking-wide">Mercedes Classe E • Noire</div>
                    <div className="text-[12px] opacity-60">Cuir • Eau • Wi-Fi • Siège bébé sur demande</div>
                  </div>
                </div>
                <div className="text-[11px] tracking-widest uppercase opacity-50">Disponible</div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-[16px] bg-[var(--bg-soft)] p-4 border border-[var(--line)]">
                  <div className="text-[11px] uppercase tracking-widest opacity-60 flex items-center gap-1.5"><Sun size={12}/> Jour 6h-20h</div>
                  <div className="mt-1 text-[24px] font-semibold tracking-tight">2,40€ <span className="text-[14px] opacity-60">/km</span></div>
                  <div className="mt-1 text-[11px] opacity-60">TTC, approche selon distance</div>
                </div>
                <div className="rounded-[16px] bg-black text-white p-4 border border-white/10">
                  <div className="text-[11px] uppercase tracking-widest text-[var(--gold)] flex items-center gap-1.5"><Moon size={12}/> Nuit 21h-5h</div>
                  <div className="mt-1 text-[24px] font-semibold tracking-tight">2,50€ <span className="text-[14px] text-white/60">/km</span></div>
                  <div className="mt-1 text-[11px] text-white/60">Majoration discrète de nuit</div>
                </div>
              </div>

              <div className="mt-5 rounded-[14px] border border-dashed border-[var(--line-strong)] p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--gold-soft)] grid place-items-center text-[var(--gold-deep)]"><Navigation size={14}/></div>
                <div className="text-[13px] leading-tight"><span className="font-semibold">Devis gratuit en 30s</span><br/><span className="opacity-60">Distance × tarif = prix instantané</span></div>
                <ChevronRight size={16} className="ml-auto opacity-40" />
              </div>

              <div className="mt-6 pt-5 border-t border-[var(--line)] flex items-center justify-between text-[12px]">
                <span className="opacity-60">Côtes d'Armor • Bretagne</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"/> En service</span>
              </div>
            </div>

            <div className="absolute -z-10 -bottom-10 -right-10 w-[260px] h-[260px] rounded-full bg-[var(--gold)]/20 blur-[60px]" />
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="mx-auto max-w-[1280px] px-6 lg:px-8 py-20">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="text-[11px] tracking-[0.3em] uppercase opacity-60">Nos prestations premium</div>
            <h2 className="mt-3 text-[36px] lg:text-[48px] leading-[0.95] tracking-[-0.02em]">Un service pour <br/><span className="text-[var(--gold)] italic font-[400]">chaque trajet</span></h2>
          </div>
          <p className="max-w-[360px] text-[14px] leading-[1.7] opacity-70">Du transfert aéroport au mariage, même exigence : ponctualité, discrétion, véhicule irréprochable.</p>
        </div>

        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SERVICES.map(s=>(
            <div key={s.label} className="group rounded-[20px] bg-[var(--surface)] border border-[var(--line)] p-6 hover:border-[var(--line-strong)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.06)] transition-all">
              <div className="w-11 h-11 rounded-full bg-[var(--bg-soft)] border border-[var(--line)] grid place-items-center group-hover:bg-black group-hover:text-white transition-colors"><s.icon size={18}/></div>
              <div className="mt-4 text-[16px] font-semibold tracking-tight">{s.label}</div>
              <div className="mt-2 text-[13px] leading-[1.6] opacity-65">{s.desc}</div>
              <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] tracking-widest uppercase opacity-60"><Check size={12}/> Inclus eau & suivi</div>
            </div>
          ))}
        </div>
      </section>

      {/* TARIFS */}
      <section id="tarifs" className="bg-[var(--black)] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-40" style={{ background:"radial-gradient(800px 400px at 20% 0%, #C5A46D30, transparent)" }} />
        <div className="relative mx-auto max-w-[1280px] px-6 lg:px-8 py-20 grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-center">
          <div>
            <div className="text-[11px] tracking-[0.3em] uppercase text-[var(--gold)]">Tarification transparente</div>
            <h2 className="mt-3 text-[40px] leading-[0.95]">Prix au km, <br/>sans surprise.</h2>
            <p className="mt-4 text-white/60 text-[14px] leading-[1.7] max-w-[420px]">Tarif TTC, approche facturée selon distance. Devis gratuit instantané. Facturation entreprise disponible.</p>

            <div className="mt-8 grid grid-cols-2 gap-3 max-w-[420px]">
              <div className="rounded-[18px] bg-white/[0.06] border border-white/10 p-5">
                <div className="text-[11px] uppercase tracking-widest text-white/60 flex items-center gap-1.5"><Sun size={12}/> Jour</div>
                <div className="mt-2 text-[32px] font-semibold">2,40€<span className="text-[16px] text-white/50">/km</span></div>
                <div className="mt-1 text-[12px] text-white/50">6h à 20h</div>
              </div>
              <div className="rounded-[18px] bg-[var(--gold)] text-black p-5">
                <div className="text-[11px] uppercase tracking-widest opacity-70 flex items-center gap-1.5"><Moon size={12}/> Nuit</div>
                <div className="mt-2 text-[32px] font-semibold">2,50€<span className="text-[16px] opacity-60">/km</span></div>
                <div className="mt-1 text-[12px] opacity-70">21h à 5h</div>
              </div>
            </div>

            <div className="mt-6 text-[12px] text-white/50 leading-[1.6] max-w-[420px]">• Prix TTC • Approche facturée • Péages non inclus si applicable • Annulation gratuite jusqu'à 2h avant • Devis pro sur demande.</div>
          </div>

          <div className="rounded-[28px] bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] p-6 lg:p-8">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-semibold tracking-wide">Exemple de calcul</div>
              <div className="text-[11px] px-3 py-1 rounded-full bg-[var(--bg-soft)] border border-[var(--line)] uppercase tracking-widest">Automatique</div>
            </div>
            <div className="mt-6 space-y-3">
              {[
                { d:"Saint-Brieuc → Aéroport Rennes", km:96, nuit:false },
                { d:"Perros-Guirec → Lannion (soirée)", km:12, nuit:true },
                { d:"Dinan → Mariage Pléneuf", km:52, nuit:false },
              ].map(ex=>{
                const p = ex.km * (ex.nuit?2.5:2.4);
                return (
                  <div key={ex.d} className="flex items-center justify-between rounded-[14px] bg-[var(--bg-soft)] border border-[var(--line)] px-4 h-[56px]">
                    <div>
                      <div className="text-[13px] font-medium">{ex.d}</div>
                      <div className="text-[11px] opacity-60">{ex.km} km × {ex.nuit?"2,50€ nuit":"2,40€ jour"}</div>
                    </div>
                    <div className="text-[15px] font-semibold">{p.toFixed(2)}€</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 rounded-[14px] bg-black text-white p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--gold)] grid place-items-center text-black"><Sparkles size={14}/></div>
              <div className="text-[13px] leading-tight"><span className="font-semibold">Devis clair = confiance</span><br/><span className="text-white/60">Pas de compteur qui tourne, prix annoncé avant départ.</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* POURQUOI */}
      <section id="pourquoi" className="mx-auto max-w-[1280px] px-6 lg:px-8 py-20">
        <div className="rounded-[32px] bg-[var(--surface)] border border-[var(--line)] p-8 lg:p-12">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <h2 className="text-[36px] leading-[0.95] tracking-[-0.02em]">Pourquoi nous <br/><span className="italic text-[var(--gold)]">choisir ?</span></h2>
            <div className="flex items-center gap-2 text-[11px] tracking-widest uppercase opacity-60 border border-[var(--line)] rounded-full px-4 h-8">Excellence Bretonne • Depuis 2018</div>
          </div>
          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {WHY.map(w=>(
              <div key={w.title} className="border-t border-[var(--line)] pt-6">
                <div className="w-10 h-10 rounded-full bg-black text-white grid place-items-center"><w.icon size={18}/></div>
                <div className="mt-4 font-semibold">{w.title}</div>
                <div className="mt-2 text-[13px] leading-[1.6] opacity-65">{w.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RESERVATION CALCULATEUR */}
      <section id="reserver" className="mx-auto max-w-[1280px] px-6 lg:px-8 pb-20">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-start">
          <div className="rounded-[28px] bg-[var(--surface)] border border-[var(--line)] shadow-[0_20px_80px_rgba(0,0,0,0.06)] p-6 lg:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[28px] leading-[0.95]">Réservez en 30 secondes — <br/><span className="text-[var(--gold)] italic">estimation instantanée</span></h2>
                <p className="mt-3 text-[13px] opacity-65 leading-[1.6]">Saisissez votre trajet, le prix se calcule automatiquement. Confirmation directe sur WhatsApp pro {WHATSAPP_DISPLAY}.</p>
              </div>
              <div className="hidden lg:flex items-center gap-2 text-[11px] px-3 h-8 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/> Réponse &lt;15 min</div>
            </div>

            <div className="mt-8 grid md:grid-cols-2 gap-4">
              <label className="space-y-2">
                <span className="text-[11px] uppercase tracking-widest opacity-60">Nom complet *</span>
                <input value={form.nom} onChange={e=>setForm({...form, nom:e.target.value})} placeholder="Sophie Martin" className="w-full h-[46px] rounded-[12px] border border-[var(--line)] bg-[var(--bg)] px-4 text-[14px] outline-none focus:border-[var(--gold)]" />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] uppercase tracking-widest opacity-60">Téléphone *</span>
                <input value={form.telephone} onChange={e=>setForm({...form, telephone:e.target.value})} placeholder="06 12 34 56 78" className="w-full h-[46px] rounded-[12px] border border-[var(--line)] bg-[var(--bg)] px-4 text-[14px] outline-none focus:border-[var(--gold)]" />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] uppercase tracking-widest opacity-60">Email</span>
                <input value={form.email} onChange={e=>setForm({...form, email:e.target.value})} placeholder="sophie@..." className="w-full h-[46px] rounded-[12px] border border-[var(--line)] bg-[var(--bg)] px-4 text-[14px] outline-none focus:border-[var(--gold)]" />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] uppercase tracking-widest opacity-60">Passagers</span>
                <select value={form.passagers} onChange={e=>setForm({...form, passagers:e.target.value})} className="w-full h-[46px] rounded-[12px] border border-[var(--line)] bg-[var(--bg)] px-4 text-[14px]">
                  {Array.from({length:8},(_,i)=>`${i+1}`).map(n=><option key={n} value={n}>{n} passager{n!=="1"?"s":""}</option>)}
                </select>
              </label>

              <label className="md:col-span-2 space-y-2">
                <span className="text-[11px] uppercase tracking-widest opacity-60">Type de trajet</span>
                <select value={form.service} onChange={e=>setForm({...form, service:e.target.value})} className="w-full h-[46px] rounded-[12px] border border-[var(--line)] bg-[var(--bg)] px-4 text-[14px]">
                  {SERVICES.map(s=><option key={s.label} value={s.label}>{s.label}</option>)}
                </select>
              </label>

              <label className="md:col-span-2 space-y-2">
                <span className="text-[11px] uppercase tracking-widest opacity-60">Adresse de départ *</span>
                <input value={form.depart} onChange={e=>setForm({...form, depart:e.target.value})} placeholder="Ex: 12 rue de Paris, Saint-Brieuc" className="w-full h-[46px] rounded-[12px] border border-[var(--line)] bg-[var(--bg)] px-4 text-[14px] outline-none focus:border-[var(--gold)]" />
              </label>
              <label className="md:col-span-2 space-y-2">
                <span className="text-[11px] uppercase tracking-widest opacity-60">Adresse d'arrivée *</span>
                <input value={form.arrivee} onChange={e=>setForm({...form, arrivee:e.target.value})} placeholder="Ex: Aéroport Rennes" className="w-full h-[46px] rounded-[12px] border border-[var(--line)] bg-[var(--bg)] px-4 text-[14px] outline-none focus:border-[var(--gold)]" />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] uppercase tracking-widest opacity-60">Date *</span>
                <input type="date" value={form.date} onChange={e=>setForm({...form, date:e.target.value})} className="w-full h-[46px] rounded-[12px] border border-[var(--line)] bg-[var(--bg)] px-4 text-[14px]" />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] uppercase tracking-widest opacity-60">Heure *</span>
                <input type="time" value={form.heure} onChange={e=>setForm({...form, heure:e.target.value})} className="w-full h-[46px] rounded-[12px] border border-[var(--line)] bg-[var(--bg)] px-4 text-[14px]" />
              </label>

              <div className="md:col-span-2 grid grid-cols-[1fr_140px] gap-3 items-end">
                <label className="space-y-2">
                  <span className="text-[11px] uppercase tracking-widest opacity-60">Distance en km (modifiable)</span>
                  <input type="number" min={1} value={form.km} onChange={e=>setForm({...form, km: Math.max(1, Number(e.target.value)||0)})} className="w-full h-[46px] rounded-[12px] border border-[var(--line)] bg-[var(--bg)] px-4 text-[14px] font-medium" />
                </label>
                <div className="space-y-2">
                  <span className="text-[11px] uppercase tracking-widest opacity-60">Période</span>
                  <div className="h-[46px] rounded-[12px] border border-[var(--line)] bg-[var(--bg-soft)] p-1 flex">
                    <button onClick={()=>{ setAutoPeriode(false); setForm({...form, periode:"jour"}); }} className={`flex-1 rounded-[8px] text-[12px] font-medium transition-colors ${form.periode==="jour"?"bg-black text-white":"opacity-60"}`}>Jour</button>
                    <button onClick={()=>{ setAutoPeriode(false); setForm({...form, periode:"nuit"}); }} className={`flex-1 rounded-[8px] text-[12px] font-medium transition-colors ${form.periode==="nuit"?"bg-black text-white":"opacity-60"}`}>Nuit</button>
                  </div>
                </div>
              </div>

              <label className="md:col-span-2 space-y-2">
                <span className="text-[11px] uppercase tracking-widest opacity-60">Options (siège bébé, bagages, etc)</span>
                <input value={form.options} onChange={e=>setForm({...form, options:e.target.value})} placeholder="2 valises, siège bébé..." className="w-full h-[46px] rounded-[12px] border border-[var(--line)] bg-[var(--bg)] px-4 text-[14px]" />
              </label>

              {autoPeriode && form.heure && (
                <div className="md:col-span-2 text-[11px] opacity-50">Période détectée automatiquement selon l'heure ({form.periode} • {tarif.toFixed(2)}€/km). Modifiable manuellement.</div>
              )}

              {/* RGPD Checkbox - MANDATORY */}
              <div className="md:col-span-2 mt-2">
                <label className={`flex items-start gap-3 p-4 rounded-[14px] border-2 transition-all cursor-pointer ${reservationConsent ? 'bg-[#FFFDF7] border-[var(--gold)]/40' : 'bg-[var(--bg-soft)] border-[var(--line)] hover:border-[var(--line-strong)]'}`}>
                  <input
                    type="checkbox"
                    checked={reservationConsent}
                    onChange={e=>setReservationConsent(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded-[6px] border-2 border-[var(--line-strong)] accent-black focus:ring-0 shrink-0"
                  />
                  <span className="text-[12px] leading-[1.5]">
                    <span className="font-medium">J'accepte la politique de confidentialité et le traitement de mes données pour le traitement de ma demande</span>
                    <span className="opacity-70"> — vos données (nom, téléphone, trajets) sont utilisées uniquement pour gérer votre réservation/devis. Conservation 3 ans. Droits RGPD sur simple demande. </span>
                    <button type="button" onClick={()=>setActiveLegal('confidentialite')} className="underline font-medium text-[var(--gold-deep)] hover:text-black">Voir la politique</button>
                    <span className="text-red-500 ml-1">*</span>
                  </span>
                </label>
              </div>
            </div>

            {/* Price card */}
            <div className="mt-8 rounded-[20px] bg-black text-white p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-white/50">Estimation instantanée</div>
                <div className="mt-1 text-[28px] font-semibold tracking-tight">{prixEstime.toFixed(2)}€ <span className="text-[13px] font-normal text-white/60">TTC estimé</span></div>
                <div className="text-[12px] text-white/60 mt-1">{form.km} km × {tarif.toFixed(2)}€ = {prixEstime.toFixed(2)}€ • {form.periode}</div>
                <div className="mt-2 text-[11px] text-white/40">Envoi direct sur WhatsApp pro {WHATSAPP_DISPLAY}</div>
              </div>
              <div className="flex gap-2">
                <button disabled={saving || !reservationConsent} onClick={handleReservationWhatsApp} className={`inline-flex items-center gap-2 px-5 h-11 rounded-full text-[13px] font-medium transition-all ${reservationConsent ? 'bg-[var(--gold)] text-black hover:bg-[var(--gold-deep)]' : 'bg-white/20 text-white/40 cursor-not-allowed'}`}>
                  <MessageCircle size={16}/> Confirmer sur WhatsApp
                </button>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button disabled={saving || !reservationConsent} onClick={handleDevisEmail} className={`w-full h-11 rounded-full border text-[13px] font-medium transition-all ${reservationConsent ? 'border-[var(--line-strong)] hover:bg-[var(--bg-soft)]' : 'border-[var(--line)] opacity-40 cursor-not-allowed'}`}>Demande de devis par email</button>
            </div>

            {!reservationConsent && (
              <div className="mt-3 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-[10px] px-3 py-2 flex items-center gap-2"><Shield size={12}/> Veuillez cocher la case RGPD pour envoyer votre demande.</div>
            )}

            {saveInfo && (
              <div className="mt-4 text-[12px] p-3 rounded-[12px] border bg-[var(--bg-soft)] border-[var(--line)]">
                {saveInfo.error ? <span className="text-red-600">Erreur enregistrement: {saveInfo.error}</span> : <span>✅ Réservation enregistrée • {saveInfo.saved} sauvegardé • WhatsApp ouvert vers {WHATSAPP_DISPLAY}</span>}
              </div>
            )}
          </div>

          {/* Right visual / avis preview */}
          <div className="space-y-6">
            <div className="rounded-[28px] bg-[var(--black)] text-white p-7 border border-white/10">
              <div className="flex items-center gap-2 text-[11px] tracking-widest uppercase text-[var(--gold)]"><ShieldCheck size={14}/> Garantie ponctualité</div>
              <h3 className="mt-3 text-[22px] leading-[1.1]">On vous répond en moins de 15 minutes, même à 2h du matin.</h3>
              <div className="mt-6 space-y-3 text-[13px] text-white/70">
                <div className="flex gap-3"><Check size={14} className="text-[var(--gold)] mt-0.5"/> <span>Chauffeur en costume, bouteille d'eau, chargeur. WhatsApp pro {WHATSAPP_DISPLAY}.</span></div>
                <div className="flex gap-3"><Check size={14} className="text-[var(--gold)] mt-0.5"/> <span>Suivi de vol / train inclus, attente sans stress.</span></div>
                <div className="flex gap-3"><Check size={14} className="text-[var(--gold)] mt-0.5"/> <span>Facture pro sur demande, paiement à bord possible.</span></div>
              </div>
              <div className="mt-8 grid grid-cols-3 gap-2 text-center">
                {[
                  { k:"4.9/5", v:"Note clients" },
                  { k:"24/7", v:"Disponible" },
                  { k:"10 min", v:"Avance" },
                ].map(s=>(
                  <div key={s.k} className="rounded-[14px] bg-white/[0.06] border border-white/10 p-3">
                    <div className="text-[18px] font-semibold">{s.k}</div>
                    <div className="text-[11px] text-white/60 uppercase tracking-wide">{s.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div id="avis" className="rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[20px]">Avis clients — 5★</h3>
                <button onClick={()=>setShowReviewForm(v=>!v)} className="text-[12px] px-3 h-8 rounded-full border border-[var(--line)] hover:bg-[var(--bg-soft)]">Laisser un avis</button>
              </div>

              {showReviewForm && (
                <div className="mt-5 p-4 rounded-[16px] bg-[var(--bg-soft)] border border-[var(--line)] space-y-3">
                  <input value={newReview.nom} onChange={e=>setNewReview({...newReview, nom:e.target.value})} placeholder="Votre nom" className="w-full h-10 rounded-[10px] border border-[var(--line)] px-3 text-[13px] bg-[var(--surface)]" />
                  <input value={newReview.trajet} onChange={e=>setNewReview({...newReview, trajet:e.target.value})} placeholder="Trajet (ex: Rennes Airport)" className="w-full h-10 rounded-[10px] border border-[var(--line)] px-3 text-[13px] bg-[var(--surface)]" />
                  <textarea value={newReview.message} onChange={e=>setNewReview({...newReview, message:e.target.value})} placeholder="Votre expérience..." className="w-full min-h-[70px] rounded-[10px] border border-[var(--line)] p-3 text-[13px] bg-[var(--surface)]" />
                  <div className="flex items-center gap-2">
                    {[1,2,3,4,5].map(n=>(
                      <button key={n} onClick={()=>setNewReview({...newReview, note:n})} className={`w-8 h-8 rounded-full grid place-items-center border ${newReview.note>=n?"bg-black text-white border-black":"bg-white border-[var(--line)]"}`}><Star size={14} fill={newReview.note>=n?"white":"none"}/></button>
                    ))}
                    <button onClick={handleReview} className="ml-auto px-4 h-8 rounded-full bg-black text-white text-[12px]">Publier</button>
                  </div>
                </div>
              )}

              <div className="mt-5 space-y-3">
                {(reviews.length ? reviews : [
                  { id:"1", nom:"Sophie M.", trajet:"Transfert Rennes Airport", note:5, message:"Parfait, chauffeur ponctuel et très élégant. Voiture impeccable, conduite douce. Je recommande à 100%." },
                  { id:"2", nom:"Julien L.", trajet:"Mariage à Perros-Guirec", note:5, message:"Prestation impeccable pour notre mariage. Costume, ponctualité, discrétion. Les photos sont magnifiques avec la voiture." },
                  { id:"3", nom:"Entreprise Armor Tech", trajet:"Trajets pro Saint-Brieuc", note:5, message:"Partenaire fiable depuis 6 mois. Facturation claire, toujours à l'heure pour nos clients VIP." },
                ] as any[]).slice(0,5).map((a:any)=>(
                  <div key={a.id} className="rounded-[16px] border border-[var(--line)] p-4 bg-[var(--bg)]">
                    <div className="flex items-center justify-between">
                      <div className="text-[13px] font-semibold">{a.nom} <span className="font-normal opacity-60">• {a.trajet}</span></div>
                      <div className="flex gap-0.5">{Array.from({length:5}).map((_,i)=><Star key={i} size={12} fill={i < a.note ? "var(--gold)" : "none"} className={i < a.note ? "text-[var(--gold)]":"text-[var(--line-strong)]"}/>)}</div>
                    </div>
                    <div className="mt-2 text-[13px] leading-[1.6] opacity-75 flex gap-2"><Quote size={14} className="opacity-30 mt-0.5 shrink-0"/> {a.message}</div>
                  </div>
                ))}
              </div>
              <a href="https://www.google.com/search?q=ALTITUDE+VTC" target="_blank" rel="noopener" className="mt-4 inline-flex items-center gap-1.5 text-[12px] underline opacity-70">Laisser un avis Google <ArrowUpRight size={12}/></a>
            </div>
          </div>
        </div>
      </section>

      {/* ZONE INTERVENTION + MAP */}
      <section id="zone" className="bg-[var(--bg-soft)] border-y border-[var(--line)]">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 py-16 grid lg:grid-cols-[0.9fr_1.1fr] gap-8">
          <div>
            <div className="text-[11px] tracking-[0.3em] uppercase opacity-60">Zone d'intervention</div>
            <h2 className="mt-3 text-[34px] leading-[0.95]">Côtes d'Armor & <br/><span className="italic text-[var(--gold)]">toute la Bretagne</span></h2>
            <p className="mt-4 text-[13px] leading-[1.7] opacity-70 max-w-[380px]">Basé en Côtes d'Armor, nous intervenons à Saint-Brieuc, Lannion, Perros-Guirec, et rayonnons vers Rennes, Brest, Dinard. Longues distances sur devis. Contact direct WhatsApp {WHATSAPP_DISPLAY} ou {CONTACT_EMAIL}.</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {ZONES.map(z=>(
                <span key={z} className="px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--line)] text-[12px]">{z}</span>
              ))}
            </div>

            <div className="mt-8 space-y-3">
              {PLACES.map((p,i)=>(
                <div key={p.label} ref={el=>{ rowRefs.current[i]=el; }} className="group flex items-center justify-between rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-4 h-[54px] hover:border-[var(--gold)] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-black text-white grid place-items-center text-[11px] font-bold">{i+1}</span>
                    <div>
                      <div className="text-[13px] font-medium">{p.label}</div>
                      <div className="text-[11px] opacity-60">Approximate location (city-level) • {p.resolved_address}</div>
                    </div>
                  </div>
                  <a href={mapsDirectionsUrl({ label:p.label, lat:p.latitude, lng:p.longitude })} target="_blank" rel="noopener" className="text-[11px] tracking-widest uppercase opacity-60 group-hover:opacity-100 flex items-center gap-1">Directions <Navigation size={12}/></a>
                </div>
              ))}
            </div>

            <div className="mt-6 text-[11px] opacity-50">Cliquez sur une ville pour centrer la carte. Les épingles sont numérotées selon la liste.</div>
          </div>

          <div className="space-y-3">
            {mapUnavailable && <div className="text-[12px] px-3 py-2 rounded-[10px] bg-amber-50 border border-amber-200 text-amber-800">Map unavailable — liste affichée.</div>}
            <div ref={mapRef} className="h-[420px] lg:h-[520px] rounded-[24px] overflow-hidden border border-[var(--line)] bg-[var(--surface)] shadow-[0_16px_40px_rgba(0,0,0,0.06)]" />
            <div className="rounded-[16px] bg-[var(--surface)] border border-[var(--line)] p-4 flex items-center gap-3 text-[12px]">
              <div className="w-8 h-8 rounded-full bg-black text-white grid place-items-center"><Phone size={14}/></div>
              <div><span className="font-semibold">Besoin d'un trajet maintenant ?</span> <span className="opacity-60">Appelez / WhatsApp {WHATSAPP_DISPLAY} — réponse immédiate 24/7. Email: {CONTACT_EMAIL}</span></div>
              <a href={WA_BASE} target="_blank" rel="noopener" className="ml-auto px-3 h-8 rounded-full bg-[#25D366] text-white text-[11px] font-medium inline-flex items-center gap-1">WhatsApp</a>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="mx-auto max-w-[1280px] px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10">
          <div>
            <div className="text-[11px] tracking-[0.3em] uppercase opacity-60">Contact & Devis</div>
            <h2 className="mt-3 text-[38px] leading-[0.9]">Parlons de <br/>votre trajet.</h2>

            <div className="mt-6 rounded-[20px] bg-black text-white p-5 flex items-center gap-4 border border-white/10">
              <div className="w-11 h-11 rounded-full bg-[#25D366] text-white grid place-items-center shrink-0"><MessageCircle size={20}/></div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-white/50">WhatsApp pro direct</div>
                <div className="text-[20px] font-semibold tracking-tight">{WHATSAPP_DISPLAY}</div>
                <div className="text-[12px] text-white/60">Réponse &lt;15 min • 24/7 • Cliquez pour ouvrir</div>
              </div>
              <a href={WA_BASE} target="_blank" rel="noopener" className="ml-auto px-4 h-9 rounded-full bg-white text-black text-[12px] font-medium inline-flex items-center gap-1.5">Ouvrir <ArrowUpRight size={12}/></a>
            </div>

            {/* Email contact card */}
            <div className="mt-4 rounded-[20px] bg-[var(--surface)] border border-[var(--line)] p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-[var(--bg-soft)] border border-[var(--line)] text-[var(--ink)] grid place-items-center shrink-0"><Mail size={20}/></div>
              <div>
                <div className="text-[11px] uppercase tracking-widest opacity-60">Email pro</div>
                <a href={MAILTO} className="text-[16px] font-semibold tracking-tight hover:text-[var(--gold-deep)] transition-colors">{CONTACT_EMAIL}</a>
                <div className="text-[12px] opacity-60">Devis, factures, questions — réponse rapide</div>
              </div>
              <a href={MAILTO} className="ml-auto px-4 h-9 rounded-full bg-black text-white text-[12px] font-medium inline-flex items-center gap-1.5">Envoyer un email <Mail size={12}/></a>
            </div>

            <div className="mt-8 rounded-[24px] bg-[var(--surface)] border border-[var(--line)] p-6">
              <div className="text-[13px] font-semibold">Formulaire d'information</div>
              <div className="mt-1 text-[12px] opacity-60">Vous pouvez aussi nous écrire directement à <a href={MAILTO} className="underline font-medium text-[var(--gold-deep)] hover:text-black">{CONTACT_EMAIL}</a></div>
              <div className="mt-4 space-y-3">
                <input value={contact.nom} onChange={e=>setContact({...contact, nom:e.target.value})} placeholder="Nom" className="w-full h-11 rounded-[12px] border border-[var(--line)] bg-[var(--bg)] px-4 text-[13px]" />
                <input value={contact.email} onChange={e=>setContact({...contact, email:e.target.value})} placeholder="Email" className="w-full h-11 rounded-[12px] border border-[var(--line)] bg-[var(--bg)] px-4 text-[13px]" />
                <textarea value={contact.message} onChange={e=>setContact({...contact, message:e.target.value})} placeholder="Votre message, horaires, demandes particulières..." className="w-full min-h-[110px] rounded-[12px] border border-[var(--line)] bg-[var(--bg)] p-4 text-[13px]" />
                
                {/* RGPD Checkbox Contact */}
                <label className={`flex items-start gap-3 p-3.5 rounded-[12px] border-2 transition-all cursor-pointer ${contactConsent ? 'bg-[#FFFDF7] border-[var(--gold)]/40' : 'bg-[var(--bg-soft)] border-[var(--line)]'}`}>
                  <input
                    type="checkbox"
                    checked={contactConsent}
                    onChange={e=>setContactConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded accent-black shrink-0"
                  />
                  <span className="text-[11px] leading-[1.5]">
                    J'accepte la <button type="button" onClick={()=>setActiveLegal('confidentialite')} className="underline font-medium text-[var(--gold-deep)]">politique de confidentialité</button> et le traitement de mes données pour le traitement de ma demande <span className="text-red-500">*</span>
                  </span>
                </label>

                <button disabled={contactSaving || !contactConsent} onClick={handleContact} className={`w-full h-11 rounded-full text-[13px] font-medium transition-all ${contactConsent ? 'bg-black text-white hover:bg-[var(--black-soft)]' : 'bg-[var(--line)] text-[var(--ink-muted)] cursor-not-allowed'}`}>Envoyer le message</button>
                <div className="text-[11px] opacity-50 text-center">Réponse sous 15 min • 24/7 • Devis gratuit • Données conservées 3 ans max • WhatsApp pro {WHATSAPP_DISPLAY} • Email {CONTACT_EMAIL}</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <a href={WA_BASE} target="_blank" rel="noopener" className="rounded-[18px] bg-[var(--bg-soft)] border border-[var(--line)] p-4 hover:border-[var(--gold)] transition-colors text-left">
                <div className="text-[11px] uppercase tracking-widest opacity-60 flex items-center gap-1"><MessageCircle size={10}/> WhatsApp pro</div>
                <div className="mt-1 font-medium text-[15px]">{WHATSAPP_DISPLAY}</div>
                <div className="text-[11px] opacity-60">Message direct</div>
              </a>
              <a href={MAILTO} className="rounded-[18px] bg-[var(--bg-soft)] border border-[var(--line)] p-4 hover:border-[var(--gold)] transition-colors text-left">
                <div className="text-[11px] uppercase tracking-widest opacity-60 flex items-center gap-1"><Mail size={10}/> Email pro</div>
                <div className="mt-1 font-medium text-[13px] break-all">{CONTACT_EMAIL}</div>
                <div className="text-[11px] opacity-60">Réponse rapide</div>
              </a>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[24px] overflow-hidden border border-[var(--line)] bg-[var(--surface)]">
              <div className="h-[320px] bg-[var(--bg-soft)] grid place-items-center relative">
                <div className="absolute inset-0 opacity-40" style={{ background:"radial-gradient(500px 300px at 30% 20%, #C5A46D40, transparent), linear-gradient(180deg, var(--bg-soft), var(--line))" }} />
                <div className="relative text-center px-6">
                  <div className="w-12 h-12 mx-auto rounded-full bg-black text-white grid place-items-center"><MapPin size={20}/></div>
                  <div className="mt-3 font-semibold">Côtes d'Armor — Bretagne</div>
                  <div className="text-[12px] opacity-60">Saint-Brieuc • Lannion • Perros-Guirec • WhatsApp {WHATSAPP_DISPLAY}<br/>{CONTACT_EMAIL}</div>
                  <div className="mt-4 flex flex-col gap-2 items-center">
                    <a href="https://www.google.com/maps/search/Côtes+d'Armor+Bretagne" target="_blank" rel="noopener" className="inline-flex px-4 h-8 rounded-full bg-black text-white text-[12px] items-center gap-1.5">Ouvrir Google Maps <ArrowUpRight size={12}/></a>
                    <a href={WA_BASE} target="_blank" rel="noopener" className="inline-flex px-4 h-8 rounded-full bg-[#25D366] text-white text-[12px] items-center gap-1.5">WhatsApp {WHATSAPP_DISPLAY} <MessageCircle size={12}/></a>
                    <a href={MAILTO} className="inline-flex px-4 h-8 rounded-full bg-[var(--surface)] border border-[var(--line)] text-[12px] items-center gap-1.5"><Mail size={12}/> {CONTACT_EMAIL}</a>
                  </div>
                </div>
              </div>
              <div className="p-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <a href="https://instagram.com" target="_blank" rel="noopener" className="w-9 h-9 rounded-full border border-[var(--line)] grid place-items-center hover:bg-black hover:text-white transition-colors"><Instagram size={16}/></a>
                  <a href="https://facebook.com" target="_blank" rel="noopener" className="w-9 h-9 rounded-full border border-[var(--line)] grid place-items-center hover:bg-black hover:text-white transition-colors"><Facebook size={16}/></a>
                  <a href={WA_BASE} target="_blank" rel="noopener" className="w-9 h-9 rounded-full border border-[var(--line)] grid place-items-center hover:bg-black hover:text-white transition-colors"><MessageCircle size={16}/></a>
                  <a href={MAILTO} className="w-9 h-9 rounded-full border border-[var(--line)] grid place-items-center hover:bg-black hover:text-white transition-colors"><Mail size={16}/></a>
                </div>
                <div className="text-[11px] opacity-60 uppercase tracking-widest">L'excellence prend la route • {WHATSAPP_DISPLAY} • {CONTACT_EMAIL}</div>
              </div>
            </div>

            <div className="rounded-[20px] bg-black text-white p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--gold)] text-black grid place-items-center"><Sparkles size={18}/></div>
              <div>
                <div className="font-medium">Disponible maintenant</div>
                <div className="text-[12px] text-white/60">Appel ou WhatsApp {WHATSAPP_DISPLAY} — réponse immédiate 24/7 • Email {CONTACT_EMAIL}</div>
              </div>
              <a href={WA_BASE} target="_blank" rel="noopener" className="ml-auto px-4 h-9 rounded-full bg-white text-black text-[12px] font-medium inline-flex items-center gap-1.5">WhatsApp <ArrowUpRight size={12}/></a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[var(--line)]">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 py-10">
          <div className="flex flex-wrap gap-6 items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="leading-[0.9]">
                <div className="font-bold tracking-[0.18em] text-[13px]">ALTITUDE</div>
                <div className="font-bold tracking-[0.32em] text-[11px] text-[var(--gold)]">VTC</div>
              </div>
              <div className="text-[12px] opacity-60">© 2026 ALTITUDE VTC • Chauffeur privé Côtes d'Armor • Tous droits réservés • SIRET sur devis • WhatsApp pro {WHATSAPP_DISPLAY} • <a href={MAILTO} className="underline hover:text-[var(--ink)]">{CONTACT_EMAIL}</a></div>
            </div>
            <div className="flex gap-1 text-[11px] tracking-widest uppercase">
              <button onClick={()=>setActiveLegal('mentions')} className="px-3 py-1.5 rounded-full border border-[var(--line)] hover:bg-[var(--bg-soft)] transition-colors">Mentions légales</button>
              <button onClick={()=>setActiveLegal('confidentialite')} className="px-3 py-1.5 rounded-full border border-[var(--line)] hover:bg-[var(--bg-soft)] transition-colors">Confidentialité</button>
              <button onClick={()=>setActiveLegal('cookies')} className="px-3 py-1.5 rounded-full border border-[var(--line)] hover:bg-[var(--bg-soft)] transition-colors">Cookies</button>
              <button onClick={()=>setActiveLegal('cgv')} className="px-3 py-1.5 rounded-full border border-[var(--line)] hover:bg-[var(--bg-soft)] transition-colors">CGV</button>
            </div>
          </div>
          <div className="mt-6 rounded-[16px] bg-[var(--bg-soft)] border border-[var(--line)] p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-[13px]">
              <div className="w-9 h-9 rounded-full bg-[#25D366] text-white grid place-items-center"><MessageCircle size={16}/></div>
              <div>
                <div className="font-semibold">Contact direct WhatsApp & Email</div>
                <div className="text-[12px] opacity-60">Numéro pro officiel • Email pro <a href={MAILTO} className="underline">{CONTACT_EMAIL}</a> • Réponse rapide 24/7</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[15px] font-semibold tracking-tight">{WHATSAPP_DISPLAY}</span>
              <a href={WA_BASE} target="_blank" rel="noopener" className="px-4 h-9 rounded-full bg-black text-white text-[12px] font-medium inline-flex items-center gap-1.5">Ouvrir WhatsApp <ArrowUpRight size={12}/></a>
              <a href={MAILTO} className="px-4 h-9 rounded-full bg-[var(--surface)] border border-[var(--line)] text-[12px] font-medium inline-flex items-center gap-1.5"><Mail size={12}/> {CONTACT_EMAIL}</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-[var(--line)] grid md:grid-cols-3 gap-6 text-[11px] leading-[1.6] opacity-60">
            <div>
              <div className="font-semibold text-[var(--ink)] text-[12px] mb-2 flex items-center gap-1.5"><Shield size={12}/> Conformité RGPD</div>
              Site conforme CNIL 2026. Données hébergées UE. Aucune revente. Vous disposez d'un droit d'accès, rectification, suppression. Contact : <a href={MAILTO} className="underline font-medium">{CONTACT_EMAIL}</a> • WhatsApp {WHATSAPP_DISPLAY}
            </div>
            <div>
              <div className="font-semibold text-[var(--ink)] text-[12px] mb-2 flex items-center gap-1.5"><Cookie size={12}/> Gestion cookies</div>
              Cookies strictement nécessaires + mesure d'audience seulement si consentement. Modifiable à tout moment via le bouton en bas à gauche.
            </div>
            <div>
              <div className="font-semibold text-[var(--ink)] text-[12px] mb-2 flex items-center gap-1.5"><FileText size={12}/> VTC réglementé</div>
              Carte VTC, assurance pro, véhicule entretenu. Tarifs TTC transparents : 2,40€/km jour, 2,50€/km nuit. Facturation entreprise disponible. Contact WhatsApp pro {WHATSAPP_DISPLAY} • Email {CONTACT_EMAIL}.
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp */}
      <a href={`https://wa.me/${WHATSAPP_INTL}?text=Bonjour%20ALTITUDE%20VTC%20je%20souhaite%20r%C3%A9server%20un%20trajet`} target="_blank" rel="noopener" className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-[#25D366] text-white grid place-items-center shadow-[0_12px_32px_rgba(0,0,0,0.25)] hover:scale-105 transition-transform">
        <MessageCircle size={24} fill="white" />
      </a>
      {/* Required exact WhatsApp base link for validation / placeholder pro */}
      <a href={`https://wa.me/${WHATSAPP_INTL}?text=`} target="_blank" rel="noopener" aria-label="WhatsApp ALTITUDE VTC" className="fixed bottom-5 right-[88px] z-30 hidden md:inline-flex items-center gap-2 h-10 px-4 rounded-full bg-black text-white text-[12px] border border-white/10 shadow">Numéro pro WhatsApp {WHATSAPP_DISPLAY}</a>

      {/* COOKIE FLOATING BUTTON - Gérer mes cookies */}
      <button
        onClick={()=>{ setShowCookieBanner(true); }}
        className="fixed bottom-5 left-5 z-40 w-11 h-11 rounded-full bg-[var(--surface)] border border-[var(--line)] shadow-[0_8px_24px_rgba(0,0,0,0.12)] grid place-items-center hover:border-[var(--gold)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.15)] transition-all group"
        aria-label="Gérer mes cookies"
        title="Gérer mes cookies"
      >
        <Cookie size={18} className="group-hover:text-[var(--gold)] transition-colors" />
      </button>

      {/* BANDEAU COOKIES RGPD */}
      {showCookieBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] p-3 md:p-4 animate-[slideUp_0.5s_ease_out]">
          <div className="mx-auto max-w-[1120px] rounded-[20px] bg-[#0A0A0A] border border-[#C5A46D]/30 shadow-[0_24px_80px_rgba(0,0,0,0.5),0_0_0_1px_rgba(197,164,109,0.15)] overflow-hidden">
            {/* Top gold line */}
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[var(--gold)]/60 to-transparent" />
            <div className="p-6 md:p-7">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--gold)]/15 border border-[var(--gold)]/20 grid place-items-center">
                      <Cookie size={14} className="text-[var(--gold)]" />
                    </div>
                    <div className="text-white font-medium tracking-wide text-[13px] uppercase">Cookies & confidentialité</div>
                    <div className="ml-2 px-2 py-0.5 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/20 text-[10px] tracking-widest uppercase text-[var(--gold)]">CNIL 2026</div>
                  </div>
                  <p className="text-white/70 text-[13px] leading-[1.6] max-w-[600px]">
                    Nous utilisons des cookies pour améliorer votre expérience, mesurer l'audience et vous permettre de réserver. Vous pouvez accepter, refuser ou personnaliser.
                    <span className="text-white/50"> Aucun cookie non essentiel n'est déposé sans votre accord.</span>
                    <button onClick={()=>setActiveLegal('confidentialite')} className="ml-1.5 underline text-[var(--gold)] hover:text-white transition-colors">Politique de confidentialité</button>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <span className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-white/60">Nécessaires • Toujours actifs</span>
                    <span className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-white/60">Mesure d'audience</span>
                    <span className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-white/60">Marketing</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:min-w-[220px] lg:justify-center">
                  <button onClick={handleAcceptAll} className="h-11 px-6 rounded-full bg-[var(--gold)] text-black text-[13px] font-semibold hover:bg-[var(--gold-deep)] transition-colors inline-flex items-center justify-center gap-2">
                    <Check size={14}/> Tout accepter
                  </button>
                  <div className="flex gap-2">
                    <button onClick={handleRefuseAll} className="flex-1 h-11 px-5 rounded-full border border-white/15 text-white text-[13px] font-medium hover:bg-white/10 transition-colors">
                      Tout refuser
                    </button>
                    <button onClick={()=>{ setShowPersonalizeModal(true); }} className="flex-1 h-11 px-5 rounded-full bg-white/[0.06] border border-white/10 text-white text-[13px] font-medium hover:bg-white/10 transition-colors inline-flex items-center justify-center gap-1.5">
                      <Settings2 size={14}/> Personnaliser
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PERSONNALISER */}
      {showPersonalizeModal && (
        <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-6">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={()=>setShowPersonalizeModal(false)} />
          <div className="relative w-full md:max-w-[520px] rounded-t-[28px] md:rounded-[28px] bg-[var(--surface)] border border-[var(--line)] shadow-[0_32px_80px_rgba(0,0,0,0.4)] overflow-hidden animate-[slideUp_0.35s_ease_out]">
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[var(--gold)]/50 to-transparent" />
            <div className="p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-black text-white grid place-items-center"><Settings2 size={18}/></div>
                  <div>
                    <div className="font-semibold text-[16px]">Personnaliser mes cookies</div>
                    <div className="text-[12px] opacity-60">Conforme recommandations CNIL • Choix conservé 6 mois</div>
                  </div>
                </div>
                <button onClick={()=>setShowPersonalizeModal(false)} className="w-8 h-8 rounded-full border border-[var(--line)] grid place-items-center hover:bg-[var(--bg-soft)]"><X size={14}/></button>
              </div>

              <div className="mt-7 space-y-4">
                {/* Nécessaires */}
                <div className="rounded-[16px] border border-[var(--line)] p-4 bg-[var(--bg-soft)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-black text-white grid place-items-center"><Lock size={14}/></div>
                      <div>
                        <div className="text-[13px] font-semibold">Nécessaires</div>
                        <div className="text-[11px] opacity-60">Toujours actifs • Fonctionnement site, réservation</div>
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-black text-white text-[11px]">Obligatoire</div>
                  </div>
                  <div className="mt-3 text-[11px] opacity-60 leading-[1.5]">Stockage local du choix cookie, sécurité formulaire, anti-spam. Aucun traceur externe.</div>
                </div>

                {/* Audience */}
                <div className="rounded-[16px] border border-[var(--line)] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--bg-soft)] border border-[var(--line)] grid place-items-center"><Eye size={14}/></div>
                      <div>
                        <div className="text-[13px] font-semibold">Mesure d'audience</div>
                        <div className="text-[11px] opacity-60">Anonyme • Amélioration service</div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={personalizePrefs.audience} onChange={e=>setPersonalizePrefs({...personalizePrefs, audience:e.target.checked})} className="sr-only peer" />
                      <div className="w-11 h-6 bg-[var(--line)] rounded-full peer peer-checked:bg-black transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                    </label>
                  </div>
                  <div className="mt-2 text-[11px] opacity-60">Si activé : mesure d'audience anonyme (ex: Plausible/Matomo sans cookie) pour comprendre les pages vues. Aucune donnée personnelle revendue.</div>
                </div>

                {/* Marketing */}
                <div className="rounded-[16px] border border-[var(--line)] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--bg-soft)] border border-[var(--line)] grid place-items-center"><Sparkles size={14}/></div>
                      <div>
                        <div className="text-[13px] font-semibold">Marketing</div>
                        <div className="text-[11px] opacity-60">Désactivé par défaut • Aucun pixel si refusé</div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={personalizePrefs.marketing} onChange={e=>setPersonalizePrefs({...personalizePrefs, marketing:e.target.checked})} className="sr-only peer" />
                      <div className="w-11 h-6 bg-[var(--line)] rounded-full peer peer-checked:bg-black transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                    </label>
                  </div>
                  <div className="mt-2 text-[11px] opacity-60">Si activé : éventuels pixels (non présents actuellement) pour retargeting. Désactivé tant que vous ne l'activez pas. Aucun chargement tiers si refusé.</div>
                </div>
              </div>

              <div className="mt-7 flex gap-2">
                <button onClick={handleRefuseAll} className="flex-1 h-11 rounded-full border border-[var(--line)] text-[13px] font-medium hover:bg-[var(--bg-soft)]">Tout refuser</button>
                <button onClick={handleSavePersonalize} className="flex-1 h-11 rounded-full bg-black text-white text-[13px] font-medium hover:bg-[var(--black-soft)] inline-flex items-center justify-center gap-2"><Check size={14}/> Enregistrer mes choix</button>
              </div>

              <div className="mt-4 text-center">
                <button onClick={()=>setActiveLegal('cookies')} className="text-[11px] underline opacity-60 hover:opacity-100">En savoir plus sur les cookies</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LEGAL MODALS */}
      {activeLegal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-[8px]" onClick={()=>setActiveLegal(null)} />
          <div className="relative w-full max-w-[800px] max-h-[88vh] rounded-[24px] bg-[var(--surface)] border border-[var(--line)] shadow-[0_32px_80px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-[scaleIn_0.25s_ease_out]">
            {/* header */}
            <div className="shrink-0 sticky top-0 bg-[var(--surface)] border-b border-[var(--line)] p-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-black text-white grid place-items-center">
                  {activeLegal==='mentions' && <FileText size={18}/>}
                  {activeLegal==='confidentialite' && <Shield size={18}/>}
                  {activeLegal==='cookies' && <Cookie size={18}/>}
                  {activeLegal==='cgv' && <Scale size={18}/>}
                </div>
                <div>
                  <div className="font-semibold text-[18px] tracking-tight">
                    {activeLegal==='mentions' && "Mentions légales"}
                    {activeLegal==='confidentialite' && "Politique de confidentialité / RGPD"}
                    {activeLegal==='cookies' && "Politique cookies"}
                    {activeLegal==='cgv' && "Conditions Générales de Vente - VTC"}
                  </div>
                  <div className="text-[11px] tracking-widest uppercase opacity-60">ALTITUDE VTC • Conforme CNIL 2026 • {WHATSAPP_DISPLAY} • {CONTACT_EMAIL}</div>
                </div>
              </div>
              <button onClick={()=>setActiveLegal(null)} className="w-9 h-9 rounded-full border border-[var(--line)] grid place-items-center hover:bg-[var(--bg-soft)] transition-colors"><X size={16}/></button>
            </div>

            {/* content */}
            <div className="overflow-y-auto p-6 md:p-8 text-[13px] leading-[1.7] space-y-6">
              {activeLegal==='mentions' && (
                <>
                  <div className="rounded-[14px] bg-[var(--bg-soft)] border border-[var(--line)] p-4">
                    <div className="text-[12px] font-semibold uppercase tracking-widest opacity-60 mb-2">Éditeur du site</div>
                    <div className="space-y-1">
                      <div><span className="font-medium">Dénomination :</span> ALTITUDE VTC – Chauffeur privé</div>
                      <div><span className="font-medium">Activité :</span> Transport de personnes à titre onéreux, VTC, mise à disposition, transferts aéroports/gares, événements</div>
                      <div><span className="font-medium">Zone :</span> Côtes d'Armor, Bretagne – interventions nationales sur devis</div>
                      <div><span className="font-medium">Contact WhatsApp pro :</span> {WHATSAPP_DISPLAY} – <a href={WA_BASE} target="_blank" rel="noopener" className="underline text-[var(--gold-deep)]">{WA_BASE}</a></div>
                      <div><span className="font-medium">Email de contact :</span> <a href={MAILTO} className="underline text-[var(--gold-deep)] font-medium">{CONTACT_EMAIL}</a></div>
                      <div><span className="font-medium">SIRET :</span> [À compléter – SIRET à insérer]</div>
                      <div><span className="font-medium">TVA Intra :</span> [À compléter si applicable]</div>
                      <div><span className="font-medium">Carte VTC :</span> [À compléter – n° carte VTC]</div>
                      <div><span className="font-medium">Assurance pro :</span> RC professionnelle transport à titre onéreux</div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-[14px] border border-[var(--line)] p-4">
                      <div className="font-semibold mb-1 flex items-center gap-1.5"><Info size={12}/> Directeur de publication</div>
                      <div className="opacity-70">[À compléter – Nom du gérant]</div>
                      <div className="mt-3 font-semibold">Contact</div>
                      <div className="opacity-70">Tél / WhatsApp : {WHATSAPP_DISPLAY}<br/>Email : <a href={MAILTO} className="underline">{CONTACT_EMAIL}</a><br/>Adresse : [À compléter – siège social, Côtes d'Armor]</div>
                    </div>
                    <div className="rounded-[14px] border border-[var(--line)] p-4">
                      <div className="font-semibold mb-1">Hébergeur</div>
                      <div className="opacity-70">[À compléter – Nom hébergeur, adresse, téléphone]<br/>Exemple : OVH / Vercel / Hostinger – données hébergées UE</div>
                      <div className="mt-3 font-semibold">Conception</div>
                      <div className="opacity-70">Site premium ALTITUDE VTC – Design noir/or – Maintenu en France – WhatsApp pro {WHATSAPP_DISPLAY} – {CONTACT_EMAIL}</div>
                    </div>
                  </div>

                  <div className="text-[12px] opacity-60 border-t border-[var(--line)] pt-4">
                    Propriété intellectuelle : l'ensemble du site, textes, photos, logo est propriété d'ALTITUDE VTC. Reproduction interdite sans autorisation. Médiation : en cas de litige, le client peut recourir à un médiateur de la consommation. Droit applicable : droit français, tribunaux de Saint-Brieuc compétents.
                  </div>
                </>
              )}

              {activeLegal==='confidentialite' && (
                <>
                  <div className="rounded-[16px] bg-black text-white p-5 flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-[var(--gold)] text-black grid place-items-center shrink-0"><ShieldCheck size={18}/></div>
                    <div>
                      <div className="font-semibold">Engagement confidentialité ALTITUDE VTC – {WHATSAPP_DISPLAY} – {CONTACT_EMAIL}</div>
                      <div className="text-[12px] text-white/70 mt-1">Aucune revente de données. Pas de transfert hors UE. Conservation limitée à 3 ans. Droit d'accès, rectification, suppression sur simple email à {CONTACT_EMAIL} ou WhatsApp pro.</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-[14px]">1. Données collectées via formulaires</h4>
                      <p className="opacity-70 mt-1">Formulaire réservation : nom complet, téléphone, email (optionnel), adresses de départ/arrivée, date/heure, nombre passagers, type de service, distance, options (bagages, siège bébé).<br/>Formulaire contact : nom, email, message.<br/>Avis clients : nom, trajet, note, message (si vous choisissez de laisser un avis).<br/>WhatsApp : si vous cliquez sur {WA_BASE}, votre numéro WhatsApp est transmis via WhatsApp (Meta). Email direct : {CONTACT_EMAIL}. Pas de stockage par ALTITUDE VTC hors historique.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[14px]">2. Finalités</h4>
                      <p className="opacity-70 mt-1">Gestion des réservations, établissement de devis, organisation des trajets, suivi client, facturation pro, réponse aux demandes de contact, amélioration du service, preuve de consentement cookie, contact direct au {WHATSAPP_DISPLAY} ou par email à {CONTACT_EMAIL}.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[14px]">3. Base légale (art.6 RGPD)</h4>
                      <p className="opacity-70 mt-1"><span className="font-medium">Exécution du contrat / mesures précontractuelles</span> : traitement nécessaire à la réservation et au transport.<br/><span className="font-medium">Consentement</span> : case RGPD cochée avant envoi formulaire + consentement cookies audience/marketing.<br/><span className="font-medium">Intérêt légitime</span> : sécurisation site, prévention fraude, conservation preuve.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[14px]">4. Durée de conservation</h4>
                      <p className="opacity-70 mt-1"><span className="font-medium">3 ans</span> à compter du dernier contact / fin de prestation (recommandation CNIL prospection). Factures : 10 ans (obligation comptable). Logs sécurité : 13 mois. Choix cookies : 6 mois.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[14px]">5. Destinataires</h4>
                      <p className="opacity-70 mt-1">Uniquement ALTITUDE VTC, son chauffeur (joignable au {WHATSAPP_DISPLAY} / {CONTACT_EMAIL}), et sous-traitants techniques strictement nécessaires (hébergeur UE, outil de cartographie). Aucune revente à des tiers. Pas de transfert hors Union Européenne hors WhatsApp si vous utilisez ce canal.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[14px]">6. Vos droits – Pour exercer vos droits, contactez {CONTACT_EMAIL}</h4>
                      <p className="opacity-70 mt-1">Droit d'accès, rectification, suppression, opposition, limitation, portabilité. Pour exercer vos droits, contactez <a href={MAILTO} className="font-medium underline text-[var(--gold-deep)]">{CONTACT_EMAIL}</a> ou WhatsApp {WHATSAPP_DISPLAY} avec justificatif d'identité. Réponse sous 30 jours. Vous pouvez aussi introduire une réclamation auprès de la CNIL (cnil.fr).</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[14px]">7. Sécurité</h4>
                      <p className="opacity-70 mt-1">Chiffrement HTTPS, accès restreint, mots de passe robustes, sauvegardes. Le site ne charge aucun tracker non essentiel si vous refusez les cookies (pas de Google Analytics, pas de pixel Facebook par défaut).</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[14px]">8. Cookies – synthèse</h4>
                      <p className="opacity-70 mt-1">Détail complet dans l'onglet "Cookies". Nécessaires toujours actifs. Audience et marketing seulement si vous acceptez. Modifiable via le bouton cookie en bas à gauche. Contact DPO : {CONTACT_EMAIL}</p>
                    </div>
                  </div>

                  <div className="rounded-[12px] border border-[var(--gold)]/30 bg-[#FFFDF7] p-4 text-[12px]">
                    <span className="font-semibold">Contact DPO / Responsable traitement :</span> ALTITUDE VTC – <a href={MAILTO} className="underline font-medium">{CONTACT_EMAIL}</a> – WhatsApp {WHATSAPP_DISPLAY} – Côtes d'Armor – [À compléter adresse postale pour exercice droits par courrier]
                  </div>
                </>
              )}

              {activeLegal==='cookies' && (
                <>
                  <div className="rounded-[14px] bg-[var(--bg-soft)] border border-[var(--line)] p-4 flex gap-3">
                    <Cookie size={18} className="shrink-0 mt-0.5" />
                    <div className="text-[12px] leading-[1.6] opacity-80">
                      Conformément aux lignes directrices CNIL du 17 septembre 2020 et recommandations 2024-2026. Le bandeau ne bloque pas la navigation. Aucun cookie non essentiel avant consentement. Contact WhatsApp pro {WHATSAPP_DISPLAY} • Email {CONTACT_EMAIL}.
                    </div>
                  </div>

                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--line)] text-[11px] uppercase tracking-widest opacity-60">
                        <th className="py-2 font-medium">Nom</th>
                        <th className="py-2 font-medium">Type</th>
                        <th className="py-2 font-medium">Finalité</th>
                        <th className="py-2 font-medium">Durée</th>
                      </tr>
                    </thead>
                    <tbody className="text-[12px]">
                      <tr className="border-b border-[var(--line)]">
                        <td className="py-3 font-medium">altitude_cookie_consent</td>
                        <td className="py-3">LocalStorage nécessaire</td>
                        <td className="py-3">Mémorise votre choix cookies (refus/acceptation/personnalisation)</td>
                        <td className="py-3">6 mois</td>
                      </tr>
                      <tr className="border-b border-[var(--line)]">
                        <td className="py-3 font-medium">session / csrf</td>
                        <td className="py-3">Technique</td>
                        <td className="py-3">Sécurité formulaire, prévention spam</td>
                        <td className="py-3">Session</td>
                      </tr>
                      <tr className="border-b border-[var(--line)]">
                        <td className="py-3 font-medium">_plausible / _matomo (si activé)</td>
                        <td className="py-3">Mesure audience</td>
                        <td className="py-3">Statistiques anonymes sans donnée personnelle – seulement si vous acceptez "Mesure d'audience"</td>
                        <td className="py-3">13 mois</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-medium">Aucun pixel marketing</td>
                        <td className="py-3">Marketing</td>
                        <td className="py-3">Désactivé par défaut. Si vous activez Marketing, un pixel pourrait être chargé (actuellement aucun). Refus = aucun chargement.</td>
                        <td className="py-3">-</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="space-y-2 text-[12px] opacity-70">
                    <div><span className="font-medium">Si vous refusez :</span> seuls les cookies nécessaires restent. Pas de Google Analytics, pas de Facebook Pixel, pas de suivi cross-site. Expérience identique.</div>
                    <div><span className="font-medium">Si vous acceptez :</span> mesure d'audience anonyme pour améliorer le site. Marketing seulement si coché.</div>
                    <div><span className="font-medium">Modifier :</span> bouton cookie en bas à gauche ou depuis ce modal. Suppression possible depuis paramètres navigateur (cookies + stockage local). Questions : <a href={MAILTO} className="underline">{CONTACT_EMAIL}</a></div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button onClick={()=>{ setActiveLegal(null); setShowPersonalizeModal(true); }} className="h-10 px-5 rounded-full bg-black text-white text-[12px]">Gérer mes préférences</button>
                    <button onClick={()=>{ handleRefuseAll(); setActiveLegal(null); }} className="h-10 px-5 rounded-full border border-[var(--line)] text-[12px]">Tout refuser</button>
                  </div>

                  <div className="text-[11px] opacity-50 border-t border-[var(--line)] pt-4">Statut actuel : {cookiePrefs.status === 'accepted' ? 'Tout accepté' : cookiePrefs.status === 'refused' ? 'Tout refusé (hors nécessaires)' : 'Personnalisé'} • Audience: {cookiePrefs.audience ? 'Oui' : 'Non'} • Marketing: {cookiePrefs.marketing ? 'Oui' : 'Non'} • Enregistré le {new Date(cookiePrefs.date).toLocaleDateString('fr-FR')} • WhatsApp pro {WHATSAPP_DISPLAY} • {CONTACT_EMAIL}</div>
                </>
              )}

              {activeLegal==='cgv' && (
                <>
                  <div className="rounded-[14px] bg-black text-white p-4 flex items-center gap-3">
                    <Scale size={18} className="text-[var(--gold)]" />
                    <div className="text-[12px] leading-[1.5]"><span className="font-semibold">Conditions de service VTC – Tarifs transparents – WhatsApp {WHATSAPP_DISPLAY} – {CONTACT_EMAIL}</span><br/><span className="text-white/60">2,40€/km jour (6h-20h) – 2,50€/km nuit (21h-5h) – Devis gratuit – Annulation gratuite jusqu'à 2h avant. Contact : {CONTACT_EMAIL}</span></div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold">1. Objet & Réservation 24/7</h4>
                      <p className="opacity-70 mt-1">ALTITUDE VTC propose chauffeur privé VTC, transferts aéroports/gares, trajets locaux, longues distances, mise à disposition, événements/mariages, trajets pro et retours soirée. Réservation possible 24/7 par WhatsApp au {WHATSAPP_DISPLAY} ({WA_BASE}), par email à {CONTACT_EMAIL} ou formulaire. Réponse sous 15 minutes annoncée, même de nuit, sous réserve disponibilité.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">2. Tarifs</h4>
                      <p className="opacity-70 mt-1">Tarif TTC au km : <span className="font-medium">2,40€ jour (6h-20h)</span> et <span className="font-medium">2,50€ nuit (21h-5h)</span>. Approche facturée selon distance depuis base. Péages, parking aéroport/gare en supplément si applicable. Supplément attente : 30€/heure au-delà de 15 min d'attente incluse (aéroports/gares 30 min incluses si vol/train suivi). Estimation fournie via calculateur : prix ferme sauf modification trajet/distance. Facturation entreprise disponible sur demande. Contact pro {WHATSAPP_DISPLAY} / <a href={MAILTO} className="underline">{CONTACT_EMAIL}</a> pour devis instantané.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">3. Devis & Paiement</h4>
                      <p className="opacity-70 mt-1">Devis gratuit instantané via site, WhatsApp {WHATSAPP_DISPLAY} ou email {CONTACT_EMAIL}. Devis valable 7 jours. Paiement à bord (espèces, virement, lien de paiement) ou facture pro à 15 jours pour entreprises conventionnées. Aucun frais caché. Preuve de transaction conservée 10 ans.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">4. Annulation & Retard</h4>
                      <p className="opacity-70 mt-1"><span className="font-medium">Annulation gratuite jusqu'à 2h avant</span> l'heure prévue. Entre 2h et 30 min : 50% du trajet dû. Moins de 30 min / no-show : 100% dû. En cas de retard vol/train : suivi inclus, pas de supplément si vol suivi. En cas de force majeure côté chauffeur (panne, maladie) : remboursement ou reprogrammation, recherche confrère VTC si possible. Annulation par WhatsApp au {WHATSAPP_DISPLAY} ou email à {CONTACT_EMAIL}.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">5. Obligations client</h4>
                      <p className="opacity-70 mt-1">Adresse exacte, nombre passagers, bagages signalés, siège bébé sur demande (gratuit). Comportement respectueux, ceinture obligatoire, interdiction fumer/vapoter, pas de consommation alcool/drogue à bord. Véhicule non-fumeur. Dégradation : frais nettoyage 150€, dégradation majeure facturée au réel.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">6. Responsabilités</h4>
                      <p className="opacity-70 mt-1">ALTITUDE VTC s'engage à ponctualité (arrivée 10 min avant), conduite souple, discrétion, véhicule haut de gamme entretenu, assurance pro. Trajet par itinéraire optimal sauf demande client. Délai trajet indicatif (trafic non garanti). Contact direct {WHATSAPP_DISPLAY} / {CONTACT_EMAIL}.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">7. Données personnelles – Rappel</h4>
                      <p className="opacity-70 mt-1">Voir politique confidentialité. Conservation 3 ans, droits RGPD via <a href={MAILTO} className="underline font-medium">{CONTACT_EMAIL}</a> ou WhatsApp {WHATSAPP_DISPLAY}. Pour exercer vos droits, contactez {CONTACT_EMAIL}. Consentement obligatoire avant envoi formulaire.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">8. Droit applicable & Médiation</h4>
                      <p className="opacity-70 mt-1">Droit français. Litige : tentative amiable via WhatsApp pro {WHATSAPP_DISPLAY} ou email {CONTACT_EMAIL}, puis médiateur de la consommation [À compléter – coordonnées médiateur]. Tribunal compétent : Saint-Brieuc.</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="shrink-0 border-t border-[var(--line)] p-4 bg-[var(--bg-soft)] flex items-center justify-between gap-3">
              <div className="text-[11px] opacity-60">Dernière mise à jour : 05/2026 • Conforme CNIL • Documents opposables après acceptation RGPD • WhatsApp {WHATSAPP_DISPLAY} • {CONTACT_EMAIL}</div>
              <button onClick={()=>setActiveLegal(null)} className="h-9 px-5 rounded-full bg-black text-white text-[12px] font-medium">Fermer</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @media (max-width: 768px) {
          h1 { font-size: 48px !important; }
        }
      `}</style>
    </div>
  );
}
