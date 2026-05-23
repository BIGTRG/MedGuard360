# Georgia Medicaid CMO Procurement — Status Snapshot

**Snapshot date:** 2026-05-22
**Author:** MedGuard360 GA enterprise integration team
**Supersedes:** The "2025 award" summary in `integrations/ga-enterprise/README.md`

---

## TL;DR

- **Operational CMOs today (May 2026):** Still the incumbents — **Amerigroup/Wellpoint
  (Elevance), CareSource, Peach State Health Plan (Centene)**. The new lineup has NOT
  taken effect yet.
- **Award (Dec 2024):** Notice of Intent to Award (NOIA) went to **CareSource (retained),
  Humana, Molina, UnitedHealthcare**. **Amerigroup (Elevance) and Peach State (Centene)
  lost.** UnitedHealthcare also won the **Georgia Families 360°** (foster care) contract,
  displacing Amerigroup which has held it since 2014.
- **Effective date of new contracts:** **Targeted July 1, 2026.** Amerigroup and Peach
  State have received contract extensions through **June 30, 2026** so the state is not
  left without coverage during the protest period.
- **Protests:** Filed by both Amerigroup and Peach State. Denied by Deputy Commissioner
  Jim Barnaby on **Nov 10, 2025**; a hearing-officer review wrapped in **December 2025**
  upholding the denials. **Litigation under the Georgia Open Records Act** filed by both
  companies in **Fulton County Superior Court** is still pending as of this snapshot.
- **Pathways to Coverage:** Active. CMS extended the §1115 demonstration through
  **Dec 31, 2026**; major program changes took effect Oct 1, 2025. Federal OBBBA / H.R. 1
  Medicaid work-requirement provisions take effect after Dec 31, 2026.
- **ABD expansion:** State has noticed intent to move ~200,000 aged/blind/disabled
  beneficiaries into managed care under the new contracts, beginning mid-2026.

---

## 1. Actual operational CMO list — May 2026

| CMO | Parent | Status May 2026 | Plan Type | Notes |
|---|---|---|---|---|
| **Amerigroup Community Care / Wellpoint of GA** | Elevance Health | **Operational** (extended) | GF + GF 360° | Contract extended through 2026-06-30; "Wellpoint" is Elevance's rebrand of Amerigroup |
| **CareSource Georgia** | CareSource | **Operational** | GF | Sole returning incumbent under new award |
| **Peach State Health Plan** | Centene | **Operational** (extended) | GF | Contract extended through 2026-06-30 |
| Humana Healthy Horizons in GA | Humana | NOIA winner — **NOT yet operational** | GF | Targeted launch 2026-07-01 |
| Molina Healthcare of GA | Molina | NOIA winner — **NOT yet operational** | GF | Targeted launch 2026-07-01 |
| UnitedHealthcare Community Plan of GA | UnitedHealth | NOIA winner — **NOT yet operational** | GF + GF 360° | Targeted launch 2026-07-01; also takes foster care from Amerigroup |

The README's framing that the "2025 award was implemented" is **incorrect** for current
operations. The award was issued, but the new CMOs are pre-launch and the prior
incumbents are still delivering covered services under bridge extensions.

---

## 2. Effective date of contract changes

- **NOIA issued:** December 2, 2024 (DCH announcement)
- **Initial protests filed:** January 2025
- **Protest denied (agency):** November 10, 2025
- **Hearing officer review concluded:** December 2025 — denials upheld
- **Incumbent bridge extensions:** through **June 30, 2026**
- **New CMO target go-live:** **July 1, 2026** (subject to litigation outcomes)
- **Aged/Blind/Disabled (ABD) carve-in to managed care:** **mid-2026**, contingent on
  new CMOs going live first

---

## 3. Transition arrangements (member auto-assignment)

DCH has not published a final transition operations guide as of this snapshot, but the
shape based on agency communications and prior GA transitions:

- **Bridge period (now → 2026-06-30):** Members remain enrolled in current CMO
  (Amerigroup/Wellpoint, CareSource, Peach State). No action required.
- **Open-choice window (expected spring 2026):** Members of the two exiting CMOs
  (Amerigroup non-foster-care portion + Peach State) will be offered a 90-day choice
  window to pick among CareSource, Humana, Molina, UnitedHealthcare.
- **Auto-assignment fallback (2026-07-01):** Members who do not affirmatively choose
  will be auto-assigned by DCH's algorithm. Historically GA uses a load-balanced
  assignment weighted by provider network match.
- **GF 360° (foster care) transition:** ~27,000 children/youth move from Amerigroup
  to UnitedHealthcare on 2026-07-01. Foster-parent advocacy groups raised concerns at
  the December 2025 hearing about continuity of behavioral health providers; DCH has
  committed to continuity-of-care provisions but specifics are pending.

**MedGuard360 impact:** Eligibility service (3005) and state-config-service (3018)
must support a **dual-active period** plus auto-assignment crosswalks. Plan for a
configuration cutover at 2026-07-01 with read-back-compatible payer IDs for ~90 days
after launch to handle late-arriving 835s on bridge-period claims.

---

## 4. Status of litigation and protests

| Forum | Filed by | Subject | Status |
|---|---|---|---|
| DCH internal protest | Amerigroup, Peach State | Procurement defects (CareSource references, UHC enforcement disclosures, evaluator score changes, conflict-of-interest disclosures) | **Denied 2025-11-10** by Deputy Commissioner Barnaby |
| Hearing officer review | Amerigroup, Peach State | Same | **Denials upheld December 2025** |
| Fulton County Superior Court | Peach State | Georgia Open Records Act violations — withheld procurement documents | **Pending** as of May 2026 |
| Fulton County Superior Court | Amerigroup | Georgia Open Records Act violations | **Pending** as of May 2026 |

Major substantive allegations on the record:
- CareSource allegedly failed the mandatory three-reference requirement
  (three named references reportedly declined to provide a reference).
- UnitedHealthcare allegedly failed to disclose state Medicaid enforcement actions.
- A DCH evaluator allegedly lowered scores after a meeting with her supervisor.
- DCH staff and consultants allegedly did not all complete required conflict-of-interest
  disclosures.
- Former DCH Commissioner Russel Carlson allegedly violated the procurement
  "period of silence."

A Commissioner's final decision on the procurement record was not yet posted as of this
snapshot. **The litigation is not currently expected to delay the July 1, 2026 launch**,
but a court order could; build the cutover plan to be reversible.

---

## 5. Pathways to Coverage — current state

- **Status:** Active.
- **Authority:** CMS §1115 demonstration; **temporary extension granted September 2025**,
  effective through **December 31, 2026**. Without the extension the program would have
  expired 2025-09-30.
- **Enrollment:** Has lagged state projections badly; GBPI and GAO have both criticized
  the program's administrative-cost-to-care ratio (GAO: administrative costs roughly
  twice as much as health-care spending).
- **Eligibility:** Adults 19–64 up to 100% FPL who meet a qualifying-activity
  requirement (work, school, etc.) for ≥80 hours/month.
- **Changes effective 2025-10-01:**
  - Parent/legal guardian of a Medicaid-enrolled child under 6 now qualifies as
    a qualifying activity.
  - Reporting reduced to **application + annual renewal** (was monthly).
  - Coverage now begins on the **first day of the application month**.
- **What happens after 2026-12-31:** OBBBA / H.R. 1 federal Medicaid work-requirement
  provisions take effect, which will subsume or replace the Pathways framework. State
  has not yet published its post-2026 plan.

---

## 6. Special-population CMO contracts

| Population | Current carrier | Post-2026-07-01 carrier | Notes |
|---|---|---|---|
| **Georgia Families** (general TANF/CHIP/PCK/LIM, ~1.7M+ members) | Amerigroup, CareSource, Peach State | CareSource, Humana, Molina, UnitedHealthcare | Standard managed care |
| **Georgia Families 360°** (foster care, adoption assistance, juvenile justice — ~27K) | **Amerigroup** (sole, since 2014-03-03) | **UnitedHealthcare** (sole) | Single-CMO carve-out; transition is contested by foster-parent advocates |
| **Aged, Blind, Disabled (ABD)** | Fee-for-service / PCCM today | Managed care under the four new CMOs | ~200K members; **carve-in begins mid-2026**, after the new CMOs go live |
| Pathways to Coverage | Same Georgia Families CMOs | Same new-lineup CMOs | Members are routed through the same standard CMO pool |

There is no separate dual-eligible D-SNP CMO contract in this procurement — D-SNPs in
Georgia are negotiated separately under federal Medicare Advantage rules.

---

## 7. Action items for MedGuard360

1. **Update `mco_registry` schema** — add Humana, Molina, UnitedHealthcare GA rows with
   `launch_date = 2026-07-01`, `active = false` until launch (or via feature flag).
   See follow-up migration `0021_ga_cmo_update.sql`.
2. **Schedule cutover work in state-config-service (3018):** dual-active payer-ID
   period 2026-07-01 → 2026-09-30 for late 835s and corrected claims.
3. **Eligibility service (3005):** add 270/271 routing for the three incoming CMOs;
   keep outgoing CMOs queryable for at least 24 months for retro eligibility.
4. **Foster care path (GF 360°):** swap Amerigroup → UnitedHealthcare in the
   patient-service (3004) and crisis-service (3014) carrier-specific care-coordination
   templates effective 2026-07-01.
5. **Monitor Fulton County Superior Court dockets** for the Peach State and Amerigroup
   open-records cases; any TRO or injunction must trigger a cutover hold.
6. **Pathways 2026-12-31 cliff:** state-config-service work-requirement rule engine
   needs an OBBBA / H.R. 1 ruleset ready for 2027-01-01.

---

## Sources

- [Georgia Department of Community Health — Notice of Intent to Award announcement (Dec 2, 2024)](https://dch.georgia.gov/announcement/2024-12-02/georgia-families-georgia-families-360o-care-management-organization-cmo)
- [Becker's Payer Issues — "Georgia to award 4 Medicaid contracts"](https://www.beckerspayer.com/contracting/georgia-to-award-4-medicaid-contracts/)
- [Georgia Recorder — "Fight over Georgia's Medicaid contracts nears the end, as foster parents plead for reversal" (Dec 13, 2025)](https://georgiarecorder.com/2025/12/13/fight-over-georgias-medicaid-contracts-nears-the-end-as-foster-parents-plead-for-reversal/)
- [WABE — same Georgia Recorder syndication](https://www.wabe.org/fight-over-georgias-medicaid-contracts-nears-the-end-as-foster-parents-plead-for-reversal/)
- [The Current GA — "Contract disputes create uncertainty over Georgia's Medicaid oversight" (May 3, 2025)](https://thecurrentga.org/2025/05/03/contract-disputes-create-uncertainty-over-georgias-medicaid-oversight/)
- [Capitol Beat — "Confusion, concern over the future of Medicaid management in Georgia" (May 2025)](https://capitol-beat.org/2025/05/confusion-concern-over-the-future-of-medicaid-management-in-georgia/)
- [AJC — "Inside the 'big deal' battle for Georgia's multibillion-dollar Medicaid contract"](https://www.ajc.com/politics/inside-the-big-deal-battle-for-georgias-multibillion-dollar-medicaid-contract/ZWBDMVJBTJH63PTDE6NPS2JBAY/)
- [Mostly Medicaid — "Losing bidders accuse state officials of mishandling Medicaid contracts"](https://mostlymedicaid.com/state-news-losing-bidders-accuse-state-officials-of-mishandling-medicaid-contracts-2/)
- [Free Beacon hosted copy — Peach State Challenge protest filing (Jan 8, 2025)](https://freebeacon.com/wp-content/uploads/2025/02/Peach-State-Challenge.pdf)
- [DOAS — Deputy Commissioner protest-denial letter (Nov 10, 2025)](https://ssl.doas.state.ga.us/gpr/downloadAttachment?attachmentId=316377&amp=&sourceSystemType=ps)
- [DOAS — Peach State protest exhibit (Jan 8, 2025)](https://ssl.doas.state.ga.us/gpr/downloadAttachment?attachmentId=314093&sourceSystemType=ps)
- [Georgia Dental Association — "Major CMO Contract Shakeup"](https://www.gadental.org/news/georgia-department-of-community-health-announces-major-cmo-contract-shakeup)
- [NDDS — "Georgia DCH Announces Major CMO Contract Shakeup" (Jan 24, 2025)](https://www.ndds.org/advocacy/legislative-insider/2025/01/24/georgia-department-of-community-health-announces-major-cmo-contract-shakeup)
- [State Affairs Pro — foster care mental-health-access concerns](https://pro.stateaffairs.com/ga/health-care/georgia-medicaid-united-healthcare-foster-care)
- [Albany Herald — "Georgia agency rejects Medicaid contract challenge"](https://albanyherald.com/news/local/georgia-agency-rejects-medicaid-contract-challenge/)
- [Acuity — "Georgia ABA Alert: CareSource Slashing Medicaid Rates by 20%"](https://acuity.news/regulation/georgia-medicaid-aba-caresource-rate-cut-2026/)
- [Insurance News Net syndication — AJC "big deal" coverage](https://insurancenewsnet.com/oarticle/inside-the-big-deal-battle-for-georgias-medicaid-contract)
- [GA DCH — Pathways Updates effective Oct 1, 2025](https://dch.georgia.gov/announcement/2025-10-01/pathways-updates-oct12025)
- [CMS — Georgia Pathway to Coverage temporary extension approval (Sep 23, 2025)](https://www.medicaid.gov/medicaid/section-1115-demonstrations/downloads/ga-pathway-to-covrg-cms-tmpry-extn-aprvl-09232025.pdf)
- [Georgia Recorder — "Georgia's limited Medicaid expansion program is extended through 2026" (Sep 26, 2025)](https://georgiarecorder.com/2025/09/26/georgias-limited-medicaid-expansion-program-is-extended-through-2026-despite-concerns-about-cost/)
- [Georgetown CCF — "CMS's Georgia Waiver Extension Underscores the Failure of Medicaid Work Requirements" (Oct 30, 2025)](https://ccf.georgetown.edu/2025/10/30/cmss-georgia-waiver-extension-underscores-the-failure-of-medicaid-work-requirements/)
- [GBPI — "Pathways to Coverage: Looking Back Two Years and Into the Future"](https://gbpi.org/pathways-to-coverage-looking-back-two-years-and-into-the-future/)
- [ProPublica — "Georgia's Medicaid Work Requirement Program Spent Twice as Much on Administrative Costs as on Health Care, GAO Says"](https://www.propublica.org/article/georgia-pathways-medicaid-work-requirement-gao-report)
- [Amerigroup — Georgia Families 360° provider overview (PDF)](https://provider.amerigroup.com/docs/gpp/GA_CAID_360Families.pdf?v=202210141814)
- [GA Medicaid — Georgia Families 360° program page](https://medicaid.georgia.gov/programs/all-programs/georgia-families/georgia-families-latest-news)

---

## Confidence and caveats

- **High confidence:** NOIA winners and losers; July 1, 2026 target; protest denial
  dates; Pathways extension to 2026-12-31; UnitedHealthcare taking GF 360°.
- **Moderate confidence:** Detailed transition / auto-assignment mechanics — DCH has not
  yet published the final beneficiary-facing transition guide, and these details may
  change.
- **Lower confidence:** Final ABD carve-in timing — "mid-2026" per state notice, but
  could slip into late 2026 if litigation drags or new CMO readiness reviews fail.
- **Watch items:** (a) Commissioner's final written decision on the procurement;
  (b) Fulton County rulings on the two open-records suits; (c) any TRO or injunction
  filing that could block the July 1, 2026 cutover; (d) federal OBBBA work-requirement
  implementing regulations that supersede the Pathways framework.
