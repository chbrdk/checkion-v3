/** Bilingual help-tip catalog — specs/domain/help-tips.md */

export type HelpTipLocale = 'en' | 'de'

export type HelpTipEntry = {
  /** English tip body (fallback). */
  en: string
  /** German tip body. */
  de: string
  /** Trigger aria-label — English UI chrome. */
  label: string
}

export const HELP_TIPS = {
  // —— Score kinds (Wave A) ——
  'score.accessibility': {
    label: 'About Accessibility score',
    en: 'How well the page works with assistive tech and keyboard navigation. Lower when errors and warnings pile up across pages.',
    de: 'Wie gut die Seite mit Assistenztechnik und Tastatur funktioniert. Sinkt, wenn Fehler und Warnungen über Seiten hinweg zunehmen.',
  },
  'score.seo': {
    label: 'About SEO score',
    en: 'Search readiness from meta coverage, headings, and content depth — not a Google ranking guarantee.',
    de: 'Suchmaschinen-Bereitschaft aus Meta-Abdeckung, Überschriften und Inhaltstiefe — keine Google-Ranking-Garantie.',
  },
  'score.performance': {
    label: 'About Performance score',
    en: 'Lab load quality aligned with Lighthouse Performance (0–100). Pair with the timing tiles for measured vitals.',
    de: 'Lab-Ladequalität angelehnt an Lighthouse Performance (0–100). Die Timing-Kacheln zeigen gemessene Vitals.',
  },
  'score.ux': {
    label: 'About UX score',
    en: 'Interaction quality: layout shift, tap targets, mobile friendliness, console noise, and broken links.',
    de: 'Interaktionsqualität: Layout Shift, Tap-Targets, Mobile-Tauglichkeit, Konsolenrauschen und kaputte Links.',
  },
  'score.eco': {
    label: 'About Eco score',
    en: 'Relative carbon footprint of the page transfer — greener hosts and lighter weight score higher.',
    de: 'Relativer CO₂-Fußabdruck des Seitentransfers — grünere Hosts und weniger Gewicht schneiden besser ab.',
  },
  'score.geo': {
    label: 'About GEO score',
    en: 'Generative engine readiness: blend of discoverability and how easily answers can reuse the page.',
    de: 'Bereitschaft für generative Engines: Mischung aus Auffindbarkeit und wie leicht Antworten die Seite wiederverwenden.',
  },
  'score.best_practices': {
    label: 'About Best Practices score',
    en: 'Baseline engineering hygiene (HTTPS, console, deprecated APIs) from the lab run.',
    de: 'Basis-Engineering-Hygiene (HTTPS, Konsole, veraltete APIs) aus dem Lab-Lauf.',
  },

  // —— Lab tiles (Wave A) ——
  'lab.freshness': {
    label: 'About Freshness',
    en: 'Estimated content age from Last-Modified, JSON-LD, or Open Graph dates when sources agree.',
    de: 'Geschätztes Inhaltsalter aus Last-Modified, JSON-LD oder Open-Graph-Daten, wenn Quellen übereinstimmen.',
  },
  'lab.shield': {
    label: 'About Shield',
    en: 'Security and privacy flags: HTTPS, HSTS, CSP, privacy policy, cookies, mixed content.',
    de: 'Sicherheits- und Privacy-Flags: HTTPS, HSTS, CSP, Datenschutz, Cookies, Mixed Content.',
  },
  'lab.cleared': {
    label: 'About Cleared checks',
    en: 'Runner checks that passed with zero findings on this scan.',
    de: 'Runner-Checks, die in diesem Scan ohne Befunde bestanden haben.',
  },
  'lab.ux': {
    label: 'About UX lab tile',
    en: 'Quick UX snapshot: CLS, mobile friendliness, and tap-target issues.',
    de: 'Kurzer UX-Schnappschuss: CLS, Mobile-Tauglichkeit und Tap-Target-Probleme.',
  },
  'lab.eco': {
    label: 'About Eco lab tile',
    en: 'Estimated CO₂ for the page weight and whether the host is listed as green.',
    de: 'Geschätztes CO₂ für das Seitengewicht und ob der Host als grün gelistet ist.',
  },
  'lab.links': {
    label: 'About Links lab tile',
    en: 'Broken outbound/inbound links and missing noopener on external targets.',
    de: 'Kaputte aus-/eingehende Links und fehlendes noopener bei externen Zielen.',
  },

  // —— Perf vitals (Wave A) ——
  'vital.ttfb': {
    label: 'About TTFB',
    en: 'Time to first byte — how long until the server starts responding.',
    de: 'Time to First Byte — wie lange es dauert, bis der Server antwortet.',
  },
  'vital.fcp': {
    label: 'About FCP',
    en: 'First Contentful Paint — when the first text or image appears.',
    de: 'First Contentful Paint — wann erstmals Text oder Bild erscheint.',
  },
  'vital.lcp': {
    label: 'About LCP',
    en: 'Largest Contentful Paint — when the main visible content finishes painting.',
    de: 'Largest Contentful Paint — wann der Hauptinhalt fertig gezeichnet ist.',
  },
  'vital.dom': {
    label: 'About DOM content loaded',
    en: 'DOMContentLoaded — HTML parsed and deferred scripts ready; images may still load.',
    de: 'DOMContentLoaded — HTML geparst und deferred Scripts bereit; Bilder können noch laden.',
  },
  'vital.load': {
    label: 'About Window load',
    en: 'Window load — full page resources finished loading.',
    de: 'Window load — alle Seitenressourcen sind fertig geladen.',
  },
  'vital.scripts': {
    label: 'About Scripts transfer',
    en: 'JavaScript transfer weight for this page — heavy scripts slow interactivity.',
    de: 'JavaScript-Transfergewicht dieser Seite — schwere Scripts bremsen Interaktivität.',
  },

  // —— Reading (Wave A) ——
  'reading.cefr': {
    label: 'About Readability CEFR',
    en: 'CEFR band mapped from Flesch–Kincaid on page copy — a reading-ease estimate, not a language certificate.',
    de: 'CEFR-Band aus Flesch–Kincaid auf dem Seitentext — Lesbarkeitsschätzung, kein Sprachzertifikat.',
  },
  'reading.clarity': {
    label: 'About Clarity score',
    en: 'Numeric readability score (higher is clearer) derived from the same reading model.',
    de: 'Numerischer Lesbarkeitswert (höher = klarer) aus demselben Lesemodell.',
  },
  'reading.complexity': {
    label: 'About Complexity',
    en: 'Page intensity tier from structure and content density (1 light → 5 dense).',
    de: 'Intensitätsstufe der Seite aus Struktur und Inhaltsdichte (1 leicht → 5 dicht).',
  },

  // —— GEO meters (Wave A / D) ——
  'geo.score': {
    label: 'About GEO score',
    en: 'Combined generative readiness: 0.52 × discoverability + 0.48 × repurposing.',
    de: 'Kombinierte generative Bereitschaft: 0,52 × Auffindbarkeit + 0,48 × Wiederverwendung.',
  },
  'geo.discoverability': {
    label: 'About Discoverability',
    en: 'How findable the page is for AI systems (llms.txt, FAQ schema, crawl cues).',
    de: 'Wie auffindbar die Seite für KI-Systeme ist (llms.txt, FAQ-Schema, Crawl-Signale).',
  },
  'geo.repurposing': {
    label: 'About Repurposing',
    en: 'How readily answer engines can reuse page content in generated replies.',
    de: 'Wie leicht Antwort-Engines Seiteninhalte in generierten Antworten wiederverwenden können.',
  },
  'geo.cited_share': {
    label: 'About Cited share',
    en: 'Share of query×model cells where the target domain appears in URL citations — not prose mentions alone.',
    de: 'Anteil der Prompt×Modell-Zellen, in denen die Ziel-Domain in URL-Zitaten vorkommt — nicht allein Prosa-Erwähnungen.',
  },
  'geo.mentioned_share': {
    label: 'About Mentioned in answer',
    en: 'Live search only — share of cells where the brand is named in the answer text, even without a URL citation. Never blended into Cited share.',
    de: 'Nur Live-Suche — Anteil der Zellen, in denen die Marke im Antworttext genannt wird, auch ohne URL-Zitat. Nie in Cited share gemischt.',
  },
  'geo.share_of_voice': {
    label: 'About Share of voice',
    en: 'Relative presence versus competitors across prompt × model runs.',
    de: 'Relative Präsenz gegenüber Wettbewerbern über Prompt×Modell-Läufe.',
  },
  'geo.eeat': {
    label: 'About E-E-A-T',
    en: 'Experience, Expertise, Authoritativeness, Trustworthiness — quality signals for generative answers.',
    de: 'Experience, Expertise, Authoritativeness, Trustworthiness — Qualitätssignale für generative Antworten.',
  },
  'geo.eeat.experience': {
    label: 'About Experience',
    en: 'Signals that content reflects first-hand or lived experience.',
    de: 'Signale, dass Inhalte aus erster Hand oder gelebter Erfahrung stammen.',
  },
  'geo.eeat.expertise': {
    label: 'About Expertise',
    en: 'Depth and topical competence demonstrated in the answers and sources.',
    de: 'Tiefe und fachliche Kompetenz in Antworten und Quellen.',
  },
  'geo.eeat.authoritativeness': {
    label: 'About Authoritativeness',
    en: 'Recognition as a go-to source in the category.',
    de: 'Anerkennung als maßgebliche Quelle in der Kategorie.',
  },
  'geo.eeat.trustworthiness': {
    label: 'About Trustworthiness',
    en: 'Accuracy, transparency, and reliability cues in cited material.',
    de: 'Genauigkeit, Transparenz und Verlässlichkeit in zitiertem Material.',
  },
  'geo.eeat.fitness': {
    label: 'About GEO fitness',
    en: 'Overall fitness of the brand’s presence for generative retrieval.',
    de: 'Gesamt-Tauglichkeit der Markenpräsenz für generative Abrufe.',
  },

  // —— Detail bands (Wave B) ——
  'detail.ledger': {
    label: 'About Ledger',
    en: 'Overall ≈ mean of category scores 0–100. Categories sorted weak → strong.',
    de: 'Gesamt ≈ Mittel der Kategorie-Scores 0–100. Kategorien schwach → stark sortiert.',
  },
  'detail.scan': {
    label: 'About Scan band',
    en: 'Accessibility = 100 − (errors×10 + warnings×3 + notices×1) / pages.',
    de: 'Accessibility = 100 − (Fehler×10 + Warnungen×3 + Hinweise×1) / Seiten.',
  },
  'detail.performance': {
    label: 'About Performance band',
    en: 'Ledger Performance = Lighthouse 0–100; band lists lab timings (TTFB / FCP / LCP / …).',
    de: 'Ledger-Performance = Lighthouse 0–100; Band listet Lab-Timings (TTFB / FCP / LCP / …).',
  },
  'detail.seo': {
    label: 'About SEO band',
    en: 'Score ≈ 40% meta×indexability + 30% headings + 30% content depth (≥ 300 words).',
    de: 'Score ≈ 40% Meta×Indexierbarkeit + 30% Überschriften + 30% Inhaltstiefe (≥ 300 Wörter).',
  },
  'detail.ux': {
    label: 'About UX band',
    en: 'Score = 100 − CLS − tap targets − not-mobile − console − broken links (capped deductions).',
    de: 'Score = 100 − CLS − Tap-Targets − nicht mobil − Konsole − kaputte Links (gedeckelt).',
  },
  'detail.eco': {
    label: 'About Eco band',
    en: 'CO₂ from transfer weight (SWD model); grade A+…F; ledger Eco ≈ cleaner-than percentile.',
    de: 'CO₂ aus Transfergewicht (SWD); Note A+…F; Ledger-Eco ≈ Cleaner-than-Perzentil.',
  },
  'detail.links': {
    label: 'About Links band',
    en: 'No composite score — inventory of total / broken / internal / external / missing noopener.',
    de: 'Kein Gesamtscore — Inventar total / kaputt / intern / extern / fehlendes noopener.',
  },
  'detail.shield': {
    label: 'About Shield band',
    en: 'No composite score — HTTPS · HSTS · CSP · privacy · cookies · mixed content.',
    de: 'Kein Gesamtscore — HTTPS · HSTS · CSP · Privacy · Cookies · Mixed Content.',
  },
  'detail.freshness': {
    label: 'About Freshness band',
    en: 'No composite score — age from date headers / structured data; confidence from source agreement.',
    de: 'Kein Gesamtscore — Alter aus Datums-Headern / Structured Data; Konfidenz aus Quellenübereinstimmung.',
  },
  'detail.geo': {
    label: 'About GEO band',
    en: 'Score = 0.52 × discoverability + 0.48 × repurposing.',
    de: 'Score = 0,52 × Auffindbarkeit + 0,48 × Wiederverwendung.',
  },
  'detail.infra': {
    label: 'About Infra band',
    en: 'No composite score — hosting / CDN / platform / tracking inventory.',
    de: 'Kein Gesamtscore — Hosting- / CDN- / Plattform- / Tracking-Inventar.',
  },
  'detail.class': {
    label: 'About Class / devices band',
    en: 'No composite score — tags · intensity · sibling device overalls.',
    de: 'Kein Gesamtscore — Tags · Intensität · Geschwister-Geräte-Scores.',
  },
  'detail.cleared': {
    label: 'About Cleared checks band',
    en: 'No composite score — runner checks that passed with zero findings.',
    de: 'Kein Gesamtscore — Runner-Checks ohne Befunde.',
  },

  // —— Domain (Wave C) ——
  'domain.seo_coverage': {
    label: 'About SEO coverage',
    en: 'Share of crawled pages that meet title / meta / H1 expectations across the host.',
    de: 'Anteil gecrawlter Seiten, die Title-/Meta-/H1-Erwartungen über den Host erfüllen.',
  },
  'domain.distribution': {
    label: 'About score distribution',
    en: 'How category scores spread across the crawled corpus — not a single page reading.',
    de: 'Wie Kategorie-Scores über das Crawl-Korpus streuen — keine EinzelSeiten-Lesung.',
  },
  'domain.eeat': {
    label: 'About domain trust / E-E-A-T',
    en: 'Trust and authority cues aggregated across the domain corpus.',
    de: 'Trust- und Authority-Signale aggregiert über das Domain-Korpus.',
  },

  // —— Issues (Wave E) ——
  'issue.layer.capture': {
    label: 'About capture layer',
    en: 'Page screenshot capture — spatial context for where findings appear.',
    de: 'Seiten-Screenshot — räumlicher Kontext, wo Befunde erscheinen.',
  },
  'issue.layer.issues': {
    label: 'About issues layer',
    en: 'Finding overlays on the capture — paired with the dossier list.',
    de: 'Befund-Overlays auf dem Capture — gekoppelt mit der Dossier-Liste.',
  },
  'issue.severity.critical': {
    label: 'About critical severity',
    en: 'Blocks use or causes serious harm for affected users — fix first.',
    de: 'Blockiert Nutzung oder verursacht schweren Schaden — zuerst beheben.',
  },
  'issue.severity.serious': {
    label: 'About serious severity',
    en: 'Major barrier; many users will struggle without a workaround.',
    de: 'Große Barriere; viele Nutzer scheitern ohne Workaround.',
  },
  'issue.severity.moderate': {
    label: 'About moderate severity',
    en: 'Noticeable friction; some users are impaired but not fully blocked.',
    de: 'Merkbare Reibung; manche Nutzer eingeschränkt, aber nicht blockiert.',
  },
  'issue.severity.minor': {
    label: 'About minor severity',
    en: 'Polish / low impact — still worth tracking, rarely urgent alone.',
    de: 'Feinschliff / geringe Wirkung — trotzdem tracken, selten allein dringend.',
  },

  // —— Launch / jobs (Wave F) ——
  'launch.wcag': {
    label: 'About WCAG capability',
    en: 'Accessibility-first scan (axe / HTMLCS) with SEO and performance beside it.',
    de: 'Accessibility-first Scan (axe / HTMLCS) mit SEO und Performance daneben.',
  },
  'launch.geo': {
    label: 'About GEO capability',
    en: 'Prompt × model presence job — how generative answers cite the brand. Pick Model memory (Layer 1) or Live search (Layer 2).',
    de: 'Prompt×Modell-Präsenzjob — wie generative Antworten die Marke zitieren. Wähle Modell-Gedächtnis (Layer 1) oder Live-Suche (Layer 2).',
  },
  'launch.seo': {
    label: 'About SEO capability',
    en: 'Host crawl for SEO coverage across pages (titles, meta, H1s, density).',
    de: 'Host-Crawl für SEO-Abdeckung über Seiten (Titles, Meta, H1s, Dichte).',
  },
  'launch.depth.single': {
    label: 'About Quick single scan',
    en: 'One URL → one magazine result. Fast path for a single page.',
    de: 'Eine URL → ein Magazine-Ergebnis. Schneller Pfad für eine Seite.',
  },
  'launch.depth.deep': {
    label: 'About Deep scan',
    en: 'Broader crawl under the host — domain magazine with multi-page coverage.',
    de: 'Breiterer Crawl unter dem Host — Domain-Magazine mit Mehrseiten-Abdeckung.',
  },
  'launch.geo.recall': {
    label: 'About Model memory GEO',
    en: 'Layer 1 — ungrounded chat. Measures whether the model already names your host from training, not ChatGPT-with-search.',
    de: 'Layer 1 — Chat ohne Suche. Misst, ob das Modell euren Host aus dem Training nennt — nicht ChatGPT mit Suche.',
  },
  'launch.geo.live': {
    label: 'About Live search GEO',
    en: 'Layer 2 — provider web search. Closer to ChatGPT with browse; still not the consumer ChatGPT app. Never mixed with Model memory scores.',
    de: 'Layer 2 — Websuche der Provider. Näher an ChatGPT mit Browse; nicht die ChatGPT-App. Nie mit Modell-Gedächtnis-Scores mischen.',
  },
  'job.status.queued': {
    label: 'About queued status',
    en: 'Accepted and waiting for a runner — not started yet.',
    de: 'Angenommen und wartet auf einen Runner — noch nicht gestartet.',
  },
  'job.status.running': {
    label: 'About running status',
    en: 'Actively processing; progress may update until completed or failed.',
    de: 'Läuft aktiv; Fortschritt kann bis completed oder failed aktualisieren.',
  },
  'job.status.completed': {
    label: 'About completed status',
    en: 'Finished successfully — open the magazine from the job link.',
    de: 'Erfolgreich fertig — Magazine über den Job-Link öffnen.',
  },
  'job.status.failed': {
    label: 'About failed status',
    en: 'Stopped with an error — check detail and retry if appropriate.',
    de: 'Mit Fehler gestoppt — Detail prüfen und ggf. erneut starten.',
  },
  'job.status.paused': {
    label: 'About paused status',
    en: 'Crawl paused — resume to continue from the current queue (same process).',
    de: 'Crawl pausiert — Fortsetzen setzt die Warteschlange im gleichen Prozess fort.',
  },
  'job.status.cancelling': {
    label: 'About cancelling status',
    en: 'Stop requested — in-flight page scans finish, then the crawl ends.',
    de: 'Stopp angefordert — laufende Seiten-Scans enden, dann bricht der Crawl ab.',
  },
  'job.status.cancelled': {
    label: 'About cancelled status',
    en: 'Stopped by user — partial results may be available.',
    de: 'Vom Nutzer gestoppt — Teilergebnisse können verfügbar sein.',
  },
} as const satisfies Record<string, HelpTipEntry>

export type TipId = keyof typeof HELP_TIPS

export function resolveHelpTip(
  id: TipId,
  locale: HelpTipLocale | string | null | undefined,
): { content: string; label: string } {
  const entry = HELP_TIPS[id]
  const loc = locale === 'de' ? 'de' : 'en'
  return {
    content: entry[loc] || entry.en,
    label: entry.label,
  }
}

export function tipIdForScoreKind(kind: string): TipId | null {
  switch (kind) {
    case 'accessibility':
      return 'score.accessibility'
    case 'seo':
      return 'score.seo'
    case 'performance':
      return 'score.performance'
    case 'ux':
      return 'score.ux'
    case 'eco':
      return 'score.eco'
    case 'generative':
      return 'score.geo'
    case 'best_practices':
      return 'score.best_practices'
    default:
      return null
  }
}

export function tipIdForDetailBand(bandId: string): TipId | null {
  const key = bandId.replace(/^report-/, '').replace(/\s+/g, '-')
  if (key === 'class-/-devices' || key.startsWith('class')) return 'detail.class'
  if (key === 'cleared-checks' || key.startsWith('cleared')) return 'detail.cleared'
  const map: Record<string, TipId> = {
    ledger: 'detail.ledger',
    scan: 'detail.scan',
    performance: 'detail.performance',
    seo: 'detail.seo',
    'seo-coverage': 'domain.seo_coverage',
    ux: 'detail.ux',
    eco: 'detail.eco',
    links: 'detail.links',
    shield: 'detail.shield',
    freshness: 'detail.freshness',
    geo: 'detail.geo',
    infra: 'detail.infra',
    eeat: 'domain.eeat',
    corpus: 'domain.distribution',
  }
  return map[key] ?? null
}
