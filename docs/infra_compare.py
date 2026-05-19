#!/usr/bin/env python3
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
                                 HRFlowable, Table, TableStyle, PageBreak)
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY

NAV  = colors.HexColor('#00264D')
BLUE = colors.HexColor('#0057A8')
ORNG = colors.HexColor('#E8620A')
GRN  = colors.HexColor('#1A7A4A')
RED  = colors.HexColor('#B22222')
LBG  = colors.HexColor('#EEF4FB')
LGRAY= colors.HexColor('#F5F5F5')
DGRAY= colors.HexColor('#222222')
GRAY = colors.HexColor('#555555')
WHITE= colors.white

doc = SimpleDocTemplate(
    '/mnt/user-data/outputs/07_MedGuard360_Infrastructure_Comparison.pdf',
    pagesize=letter,
    rightMargin=0.75*inch, leftMargin=0.75*inch,
    topMargin=0.85*inch,   bottomMargin=0.75*inch)

b = getSampleStyleSheet()
def a(name,**kw): b.add(ParagraphStyle(name=name,**kw))
a('T',  fontSize=26,leading=32,textColor=NAV, fontName='Helvetica-Bold',alignment=TA_CENTER,spaceAfter=6)
a('Sub',fontSize=12,leading=17,textColor=BLUE,fontName='Helvetica',     alignment=TA_CENTER,spaceAfter=4)
a('Tag',fontSize=9, leading=13,textColor=GRAY,fontName='Helvetica',     alignment=TA_CENTER,spaceAfter=2)
a('SH', fontSize=14,leading=19,textColor=NAV, fontName='Helvetica-Bold',spaceBefore=14,spaceAfter=6)
a('SH2',fontSize=11,leading=15,textColor=BLUE,fontName='Helvetica-Bold',spaceBefore=10,spaceAfter=4)
a('BD', fontSize=10,leading=15,textColor=DGRAY,fontName='Helvetica',alignment=TA_JUSTIFY,spaceAfter=5)
a('BL', fontSize=10,leading=15,textColor=DGRAY,fontName='Helvetica',leftIndent=16,spaceAfter=3)
a('Cap',fontSize=8, leading=11,textColor=GRAY, fontName='Helvetica',alignment=TA_CENTER)
a('GRN',fontSize=10,leading=14,textColor=GRN,  fontName='Helvetica-Bold',spaceAfter=3)
a('RED',fontSize=10,leading=14,textColor=RED,  fontName='Helvetica-Bold',spaceAfter=3)

def div(c=BLUE,t=1,bef=4,aft=8):
    return HRFlowable(width='100%',thickness=t,color=c,spaceBefore=bef,spaceAfter=aft)

def tbl(data, widths, header_color=NAV):
    t = Table(data, colWidths=widths)
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),header_color),
        ('TEXTCOLOR',(0,0),(-1,0),WHITE),
        ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
        ('FONTSIZE',(0,0),(-1,-1),8.5),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[WHITE,LBG]),
        ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#CCCCCC')),
        ('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),
        ('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
    ]))
    return t

story = []

# ── COVER
story.append(Spacer(1,0.4*inch))
story.append(Paragraph('MedGuard360', b['T']))
story.append(Paragraph('Current vs. Required Infrastructure — Gap Analysis', b['Sub']))
story.append(Spacer(1,4))
story.append(Paragraph('DOCUMENT 7  ·  TRG TECHLINK INTERNAL  ·  PROPRIETARY  ·  2026', b['Tag']))
story.append(div(ORNG,2,6,6))
story.append(Paragraph('Prepared for: Sainté Robinson (Deon)  ·  TRG TechLink', b['Tag']))
story.append(Spacer(1,0.3*inch))

story.append(Paragraph(
    'This document compares TRG TechLink\'s current self-hosted server stack against '
    'what MedGuard360 requires at Phase 1 (3 states) and full national scale (50 states). '
    'For every component, you will see exactly what you have, what you need, '
    'the gap, and the estimated cost to close it.',b['BD']))

# ── SECTION 1: WHAT YOU HAVE NOW
story.append(Paragraph('Section 1: Your Current Stack', b['SH'])); story.append(div())
story.append(Paragraph(
    'This is your confirmed, fully self-hosted infrastructure at TRG TechLink '
    'as it stands today:', b['BD']))

current = [
    ['Component','Current Specification','Status'],
    ['PostgreSQL Database','Primary + 2 replicas  ·  localhost ports 5432–5434  ·  Full ACID compliance, encryption-ready','✓ In Place'],
    ['Redis Cache','3-node cluster  ·  ports 6379–6381  ·  Session management, caching','✓ In Place'],
    ['Backend Services','Node.js v25.9.0 + Express.js  ·  28 microservices  ·  PM2 managed, auto-restart','✓ In Place'],
    ['Frontend','Next.js 14, React 19, TypeScript, Tailwind CSS, shadcn/ui, Heroicons','✓ In Place'],
    ['Mobile','React Native / Expo — iOS and Android capable','✓ In Place'],
    ['Auth','Clerk + JWT + bcrypt','✓ In Place'],
    ['Real-Time','Socket.IO','✓ In Place'],
    ['Video','LiveKit','✓ In Place'],
    ['Reverse Proxy','nginx — TLS 1.3, rate limiting, security headers, multi-brand routing','✓ In Place'],
    ['Monitoring','Prometheus (20+ scrape targets), Grafana (10+ dashboards), AlertManager (41 alert rules → info@geniuseye.ai)','✓ In Place'],
    ['Logging','ELK Stack — 5+ dashboards','✓ In Place'],
    ['Process Mgmt','PM2 (28+ Node services)  +  Systemd (Trading Bot, Redis)','✓ In Place'],
    ['Security','iptables (65 rules), fail2ban (SSH/nginx/DB), AES-256 encrypted backups, TLS in-transit','✓ In Place'],
    ['Secrets','/ opt/credential-vault/ — no hardcoded keys','✓ In Place'],
    ['Dev Tooling','Git, npm, TypeScript compiler, ESLint, Prettier, Jest, Playwright','✓ In Place'],
    ['Storage','Existing server storage — unspecified petabyte capacity','⚠ Needs Expansion'],
    ['AI/ML Engines','Not yet built for production','✗ Missing'],
    ['Object Storage','No MinIO or equivalent tiered object storage configured','✗ Missing'],
    ['Message Queue','No Kafka or equivalent event streaming','✗ Missing'],
    ['Call Hub','No VoIP/call center infrastructure','✗ Missing'],
    ['GPU Servers','No GPU compute for AI/ML training and inference','✗ Missing'],
    ['EDI Engine','Not yet built','✗ Missing'],
    ['Biometric SDK','Not yet integrated','✗ Missing'],
    ['CDN / App Distribution','Not configured for multi-state app distribution','✗ Missing'],
]
t = tbl(current,[1.4*inch,4.0*inch,0.85*inch])
# Color status column
t.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,0),NAV),('TEXTCOLOR',(0,0),(-1,0),WHITE),
    ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
    ('FONTSIZE',(0,0),(-1,-1),8),
    ('ROWBACKGROUNDS',(0,1),(-1,-1),[WHITE,LBG]),
    ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#CCCCCC')),
    ('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),
    ('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),
    ('VALIGN',(0,0),(-1,-1),'TOP'),
    ('TEXTCOLOR',(2,1),(2,16),GRN),('FONTNAME',(2,1),(2,16),'Helvetica-Bold'),
    ('TEXTCOLOR',(2,17),(2,17),colors.HexColor('#CC6600')),('FONTNAME',(2,17),(2,17),'Helvetica-Bold'),
    ('TEXTCOLOR',(2,18),(2,-1),RED),('FONTNAME',(2,18),(2,-1),'Helvetica-Bold'),
]))
story.append(t)

# ── SECTION 2: COMPONENT GAP ANALYSIS
story.append(PageBreak())
story.append(Paragraph('Section 2: Component-by-Component Gap Analysis', b['SH'])); story.append(div())

# Database
story.append(Paragraph('2.1  Database — PostgreSQL', b['SH2']))
story.append(Paragraph(
    'What you have: PostgreSQL primary + 2 replicas running on localhost. '
    'Solid baseline. Handles TRG TechLink\'s current 28-service stack efficiently.', b['BD']))
story.append(Paragraph(
    'What MedGuard360 needs: At Phase 1 (3 states, ~5,000 providers, ~500K claims/month), '
    'your current 3-node PostgreSQL setup is adequate IF you add PgBouncer for connection '
    'pooling — PostgreSQL alone maxes out at 300–500 efficient concurrent connections. '
    'At full national scale (50 states, 50,000+ providers, 5M+ claims/month), you need '
    'to scale to 5-6 PostgreSQL nodes with 256GB RAM each and add PgBouncer in front.', b['BD']))
gaps_pg = [
    ['Metric','You Have Now','Phase 1 Need','Full Scale Need'],
    ['Nodes','3 (primary + 2 replicas)','3 + PgBouncer','6 nodes + PgBouncer'],
    ['RAM per Node','Current spec','64GB minimum','256GB minimum'],
    ['Storage per Node','Current spec','2TB NVMe SSD','10TB NVMe SSD'],
    ['Concurrent Connections','~300–500 efficient','~2,000 (PgBouncer)','~50,000 (PgBouncer)'],
    ['Est. Annual Cost','~$15K–$20K','~$50K–$80K','~$400K–$600K'],
    ['Gap to Close (Phase 1)','—','Add PgBouncer + upgrade RAM/storage','—'],
    ['Gap to Close (Full Scale)','—','—','Add 3 more nodes, upgrade all RAM/storage'],
]
story.append(tbl(gaps_pg,[1.4*inch,1.4*inch,1.6*inch,1.85*inch]))

story.append(Spacer(1,10))

# Redis
story.append(Paragraph('2.2  Cache — Redis', b['SH2']))
story.append(Paragraph(
    'What you have: 3-node Redis cluster on ports 6379–6381. '
    'Already properly architected — 3 masters provide quorum for failover.', b['BD']))
story.append(Paragraph(
    'What MedGuard360 needs: Your 3-node cluster scales well through Phase 1. '
    'At full national scale, real-time eligibility caching, session management '
    'across 500K+ concurrent users, and claim status tracking across 50 states '
    'requires expanding to a 9-node cluster (3 shards x 3 replicas).', b['BD']))
gaps_redis = [
    ['Metric','You Have Now','Phase 1 Need','Full Scale Need'],
    ['Nodes','3','3 (adequate)','9 (3 shards x 3 replicas)'],
    ['RAM per Node','Current spec','32GB minimum','128GB minimum'],
    ['Concurrent Sessions','~50,000','~100,000','~500,000+'],
    ['Est. Annual Cost','~$5K–$8K','~$20K–$30K','~$200K–$300K'],
    ['Gap to Close (Phase 1)','—','Upgrade RAM per node','—'],
    ['Gap to Close (Full Scale)','—','—','Add 6 more nodes, upgrade RAM'],
]
story.append(tbl(gaps_redis,[1.4*inch,1.4*inch,1.6*inch,1.85*inch]))

story.append(Spacer(1,10))

# Storage
story.append(Paragraph('2.3  Storage — The Biggest Gap', b['SH2']))
story.append(Paragraph(
    'What you have: Standard server storage — not tiered, not configured at petabyte scale.', b['BD']))
story.append(Paragraph(
    'What MedGuard360 needs: Every provider visit generates audio (1MB/min), video (10–50MB/hr), '
    'GPS data, clinical notes, and metadata. At 5M visits/day across 50 states, you are '
    'ingesting 5–15 petabytes daily at full scale. This is your single largest infrastructure gap. '
    'You need MinIO clusters deployed in a hot/warm/cold tiered model.', b['BD']))
gaps_storage = [
    ['Tier','Retention','You Have Now','Phase 1 Need','Full Scale Need','Est. Cost (Full Scale)'],
    ['Hot (Real-Time)','0–30 days','Untiered','50TB MinIO','200TB MinIO SSD','$500K capex'],
    ['Warm (Compliance)','1–12 months','None','200TB MinIO','5PB MinIO','$2M capex'],
    ['Cold (Archival)','1–7+ years','None','500TB tape/archival','50PB+ archival','$5M capex'],
    ['Backup','365 days','AES-256 encrypted (existing)','Expand existing','10PB off-site encrypted','$1M capex'],
    ['TOTAL','','~5TB estimated','~750TB','~55PB+','$8.5M+ capex, $2M/yr opex'],
]
t2 = Table(gaps_storage, colWidths=[0.9*inch,0.8*inch,1.0*inch,1.1*inch,1.1*inch,1.35*inch])
t2.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,0),NAV),('TEXTCOLOR',(0,0),(-1,0),WHITE),
    ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
    ('FONTSIZE',(0,0),(-1,-1),7.5),
    ('ROWBACKGROUNDS',(0,1),(-1,-2),[WHITE,LBG]),
    ('BACKGROUND',(0,-1),(-1,-1),colors.HexColor('#1A4D7A')),
    ('TEXTCOLOR',(0,-1),(-1,-1),WHITE),
    ('FONTNAME',(0,-1),(-1,-1),'Helvetica-Bold'),
    ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#CCCCCC')),
    ('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4),
    ('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),
    ('VALIGN',(0,0),(-1,-1),'TOP'),
]))
story.append(t2)

story.append(PageBreak())

# AI/ML
story.append(Paragraph('2.4  AI / Machine Learning Infrastructure', b['SH2']))
story.append(Paragraph(
    'What you have: None built for production yet. Your Python 3.10+ capability exists '
    'and your stack supports it, but no GPU compute or ML pipeline is deployed.', b['BD']))
story.append(Paragraph(
    'What MedGuard360 needs: 10 AI engines running continuously — '
    'speech-to-text, NLP coding, OCR credentialing, fraud scoring, GNN fraud rings, '
    'PA NLP matching, denial prediction, provider monitoring, crisis detection, eligibility intelligence. '
    'These require dedicated GPU servers for training and high-speed CPU servers for inference.', b['BD']))
gaps_ai = [
    ['Component','You Have Now','Phase 1 Need','Full Scale Need'],
    ['GPU Servers (Training)','None','2x servers — NVIDIA A100 80GB x2 each','6x servers — NVIDIA A100 80GB x4 each'],
    ['CPU Servers (Inference)','Shared with Node services','2x dedicated — 64GB RAM / 32-core','8x dedicated — 256GB RAM / 64-core'],
    ['ML Framework','Python 3.10+ capable','PyTorch + scikit-learn + Hugging Face installed','Same — scaled dataset'],
    ['NLP Libraries','Not installed','scispaCy, MedSpaCy, Transformers','Same — fine-tuned on claim data'],
    ['Speech-to-Text','Not deployed','Whisper self-hosted — 1 server','Whisper cluster — 3 servers'],
    ['Model Storage','None','2TB NVMe for model weights','10TB NVMe for all model versions'],
    ['Est. Capital Cost','$0','~$500K–$800K','~$2.5M–$5M'],
    ['Est. Annual Ops Cost','$0','~$100K–$200K','~$800K–$1.5M'],
]
story.append(tbl(gaps_ai,[1.5*inch,1.3*inch,1.5*inch,1.95*inch]))

story.append(Spacer(1,10))

# Message Queue
story.append(Paragraph('2.5  Message Queue — Apache Kafka', b['SH2']))
story.append(Paragraph(
    'What you have: No message queue / event streaming. '
    'Your 28 services likely communicate via direct API calls today.', b['BD']))
story.append(Paragraph(
    'What MedGuard360 needs: Kafka is critical for decoupling your 20+ microservices. '
    'When a claim is submitted, it triggers eligibility check, fraud scoring, prior auth validation, '
    'audit logging, and notification — all simultaneously via Kafka events. '
    'Without Kafka, you create tightly coupled services that break each other under load.', b['BD']))
gaps_kafka = [
    ['Metric','You Have Now','Phase 1 Need','Full Scale Need'],
    ['Kafka Brokers','None','3 brokers — 16GB RAM / 8-core each','9 brokers — 64GB RAM / 32-core each'],
    ['Throughput','N/A','~50K messages/sec','~1M+ messages/sec'],
    ['Retention','N/A','7-day message retention','30-day retention'],
    ['Est. Annual Cost','$0','~$30K–$60K','~$200K–$400K'],
]
story.append(tbl(gaps_kafka,[1.4*inch,1.6*inch,1.6*inch,1.65*inch]))

story.append(Spacer(1,10))

# Call Hub
story.append(Paragraph('2.6  Statewide One-Call Hub Infrastructure', b['SH2']))
story.append(Paragraph(
    'What you have: None. No VoIP or call center infrastructure exists.', b['BD']))
story.append(Paragraph(
    'What MedGuard360 needs: One 1-800 number per state, each routing through your platform. '
    'AI chatbot handles 90% of calls. Human agents handle complexity. '
    'Every call recorded, transcribed, and compliance-logged.', b['BD']))
gaps_hub = [
    ['Component','You Have Now','Per State Need','50-State Full Scale'],
    ['VoIP Platform','None','Twilio or AWS Connect integration','Same — volume pricing'],
    ['Call Recording Servers','None','2x servers — 32GB RAM / 16-core','10x servers — 64GB RAM / 32-core'],
    ['AI Chatbot Engine','None','NLP-based routing model — shared AI infra','Same'],
    ['Speech-to-Text (Hub)','None','Whisper instance dedicated to hub calls','Cluster of 3'],
    ['Human Agent Seats','None','25–50 agents per state (software seats)','1,250–2,500 total seats'],
    ['Est. Infra Cost','$0','$100K–$200K per state','$5M–$10M for all 50'],
    ['Est. Annual Ops','$0','$600K–$2.4M per state','$30M–$120M (staffing + infra)'],
]
story.append(tbl(gaps_hub,[1.4*inch,1.3*inch,1.5*inch,1.5*inch]))

story.append(PageBreak())

# Network & Security
story.append(Paragraph('2.7  Network & Security Infrastructure', b['SH2']))
story.append(Paragraph(
    'What you have: Solid foundation — nginx TLS 1.3, iptables 65 rules, fail2ban, AES-256. '
    'This is better than most startups. You need to scale and harden it for healthcare.', b['BD']))
gaps_net = [
    ['Component','You Have Now','Phase 1 Addition','Full Scale Addition'],
    ['Firewall','iptables (65 rules)','Add enterprise hardware firewall (Palo Alto or Fortinet)','HA pair of enterprise firewalls'],
    ['DDoS Protection','fail2ban (partial)','Cloudflare Pro or Enterprise ($500/mo)','Cloudflare Enterprise ($100K+/yr)'],
    ['Intrusion Detection','fail2ban (partial)','Wazuh SIEM (open source, self-hosted)','Commercial SIEM (Splunk or similar)'],
    ['Hardware Security Module','None (software only)','Thales Luna HSM — for biometric key storage','HA pair of HSMs'],
    ['Load Balancers','nginx (single region)','nginx HA pair','Multi-region nginx clusters per zone'],
    ['VPN','Not specified','WireGuard or OpenVPN for admin access','Enterprise VPN (Fortinet or Cisco)'],
    ['SOC / Security Ops','None','Managed SOC service ($10K–$30K/mo)','Dedicated SOC or enterprise MSSP'],
    ['Pen Testing','None','Quarterly third-party pen test ($25K–$50K/quarter)','Same at scale'],
    ['Cyber Insurance','Not specified','Healthcare-specific cyber policy required','$500K–$2M annual premium at scale'],
    ['Est. Annual Security Cost','~$50K','~$300K–$500K','~$2M–$4M'],
]
story.append(tbl(gaps_net,[1.5*inch,1.3*inch,1.5*inch,1.95*inch]))

story.append(Spacer(1,10))

# External APIs
story.append(Paragraph('2.8  External API Integrations', b['SH2']))
story.append(Paragraph(
    'What you have: Basic API integrations for your current 28 services. '
    'MedGuard360 adds 250+ external system connections that do not exist yet.', b['BD']))
apis = [
    ['Integration','Count','Build Complexity','Est. Annual Cost'],
    ['State MMIS Systems','50 states','High — mix of legacy mainframe + REST','$0 (state-funded, dev cost only)'],
    ['State Medical/Pharmacy/Nursing Boards','150+ boards','Medium — APIs + structured queries','$50K–$150K dev'],
    ['CMS PECOS, OIG LEIE, SAM.gov','3 federal systems','Low — documented federal APIs','$0 (federal, free)'],
    ['NPPES NPI Registry','1','Low — documented REST API','$0 (free)'],
    ['MCO APIs (per state)','200+ MCOs','High — each MCO has different API spec','$100K–$500K dev'],
    ['Pharmacy Switch Networks','2–3','Medium — NCPDP D.0 standard','$50K–$200K/yr licensing'],
    ['CMS PA Interoperability APIs','Federal mandate','Medium — FHIR R4 compliant','$0 (required by law)'],
    ['State HIE Networks','50','Medium — FHIR R4 standard','$0–$50K dev per state'],
    ['911/CAD Dispatch Systems','Varies by state','High — proprietary per state','$50K–$200K dev'],
    ['Biometric SDK','1','Medium — vendor SDK integration','$50K–$200K/yr licensing'],
    ['Twilio/VoIP (Hub)','1','Low — well-documented SDK','$100K–$1M/yr (volume)'],
    ['Clerk (Auth)','1 (existing)','Already integrated','$25K–$100K/yr'],
    ['TOTAL','450+ connections','—','$500K–$2M/yr + $2M–$5M dev'],
]
story.append(tbl(apis,[1.4*inch,0.65*inch,2.1*inch,1.6*inch]))

story.append(PageBreak())

# SECTION 3: MASTER COMPARISON TABLE
story.append(Paragraph('Section 3: Master Gap Summary Table', b['SH'])); story.append(div())
story.append(Paragraph(
    'All components side by side — current state, Phase 1 requirement, '
    'full national scale requirement, and estimated cost to close the gap.', b['BD']))

master = [
    ['Component','You Have Now','Annual Cost Now','Phase 1 Need','Phase 1 Cost','Full Scale Need','Full Scale Cost','Gap Factor'],
    ['PostgreSQL','3 nodes','~$20K','3 nodes + PgBouncer','~$60K','6 nodes + PgBouncer','~$500K','25x'],
    ['Redis','3-node cluster','~$6K','RAM upgrade','~$25K','9-node cluster','~$250K','40x'],
    ['Object Storage','~5TB total','~$2K','750TB MinIO','~$200K','55PB+ tiered','$8.5M capex\n$2M/yr ops','10,000x'],
    ['AI/ML GPU Infra','None','$0','2x GPU servers','~$150K capex\n$100K/yr','6x GPU servers','$3M capex\n$1M/yr','New'],
    ['Message Queue','None','$0','3-broker Kafka','~$40K','9-broker Kafka','~$300K','New'],
    ['Call Hub Infra','None','$0','Per-state infra','$150K/state','50-state full','$10M+','New'],
    ['Network/Security','nginx+iptables+fail2ban','~$50K','Enterprise firewall, SOC','~$400K','Multi-region, full SOC','~$3M','60x'],
    ['Load Balancing','Single-region nginx','~$5K','nginx HA pair','~$30K','Multi-region cluster','~$300K','60x'],
    ['API Integrations','<10 integrations','~$20K','50 integrations','~$500K dev','450+ integrations','$2M/yr + $5M dev','45x'],
    ['Mobile CDN','None','$0','Basic CDN','~$50K','Global distribution','~$300K','New'],
    ['EDI Engine','None','$0','Build 837P/I/835/NCPDP','$200K dev','Same at scale','~$100K/yr maint','New'],
    ['Biometric SDK','None','$0','Vendor SDK','~$100K/yr','Same at scale','~$200K/yr','New'],
    ['Monitoring','Prometheus+Grafana+ELK','~$10K','Scale existing','~$30K','Enterprise scale','~$200K','20x'],
    ['Compliance/HIPAA Audit','Basic','~$20K','Formal HIPAA program','~$150K','Full compliance ops','~$800K','40x'],
    ['TOTALS','','~$133K/yr','','~$2M–$3M/yr\n+ $1M capex','','~$16M–$20M/yr\n+ $22M capex','120–150x'],
]
t3 = Table(master, colWidths=[0.85*inch,0.75*inch,0.65*inch,0.85*inch,0.7*inch,0.85*inch,0.85*inch,0.55*inch])
t3.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,0),NAV),('TEXTCOLOR',(0,0),(-1,0),WHITE),
    ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
    ('FONTSIZE',(0,0),(-1,-1),7),
    ('ROWBACKGROUNDS',(0,1),(-1,-2),[WHITE,LBG]),
    ('BACKGROUND',(0,-1),(-1,-1),colors.HexColor('#1A4D7A')),
    ('TEXTCOLOR',(0,-1),(-1,-1),WHITE),
    ('FONTNAME',(0,-1),(-1,-1),'Helvetica-Bold'),
    ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#CCCCCC')),
    ('LEFTPADDING',(0,0),(-1,-1),3),('RIGHTPADDING',(0,0),(-1,-1),3),
    ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),
    ('VALIGN',(0,0),(-1,-1),'TOP'),
    ('TEXTCOLOR',(7,1),(7,-2),RED),('FONTNAME',(7,1),(7,-2),'Helvetica-Bold'),
]))
story.append(t3)

story.append(PageBreak())

# SECTION 4: WHAT YOU DON'T NEED TO REBUILD
story.append(Paragraph('Section 4: What You Already Have Right', b['SH'])); story.append(div())
story.append(Paragraph(
    'Your current stack is not broken — it is a solid foundation. '
    'Here is what is already correctly architected and does not need to be rebuilt, '
    'only scaled:', b['BD']))
already_right = [
    'Node.js v25.9.0 + Express.js microservices with PM2 — correct runtime, correct process management',
    'Next.js 14 + TypeScript + Tailwind + shadcn/ui — correct frontend stack for all 20 portals',
    'React Native / Expo — correct mobile framework for app-on-every-device',
    'PostgreSQL + Redis architecture — correct database choices, just need more nodes',
    'Socket.IO for real-time communication — correct for live documentation and claim updates',
    'LiveKit for video — correct for telehealth and home visit documentation',
    'Clerk + JWT for authentication — correct, HIPAA-compatible identity layer',
    'nginx TLS 1.3 + iptables + fail2ban — correct security baseline, just needs upgrading',
    '/opt/credential-vault/ for secrets — correct secrets management pattern',
    'Prometheus + Grafana + AlertManager + ELK — correct observability stack',
    'AES-256 encryption + TLS in-transit — correct encryption model',
    'Git + TypeScript + ESLint + Prettier + Jest + Playwright — correct dev tooling',
    'Systemd for infrastructure services — correct for Redis and supporting services',
]
for item in already_right:
    story.append(Paragraph(f'✓  {item}', b['BL']))

story.append(Spacer(1,10))

# SECTION 5: PHASED ACQUISITION PLAN
story.append(Paragraph('Section 5: Phased Infrastructure Acquisition Plan', b['SH'])); story.append(div())
story.append(Paragraph(
    'You do not need to buy everything at once. '
    'Here is the sequence aligned with your rollout phases:', b['BD']))

phases = [
    ('Phase 1 — Before NC/SC/GA Launch (Next 6 Months)', [
        'Add PgBouncer in front of existing PostgreSQL cluster — immediate connection pooling',
        'Upgrade RAM on existing PostgreSQL and Redis nodes to 64GB minimum per node',
        'Deploy MinIO on 3+ servers: 50TB hot storage, 200TB warm storage — Phase 1 minimum',
        'Add 3-broker Apache Kafka cluster — event streaming for microservices',
        'Deploy 2x GPU servers (NVIDIA A100 80GB x2 each) — Phase 1 AI engine training',
        'Deploy 2x dedicated Python FastAPI servers for AI engine inference',
        'Integrate Whisper speech-to-text — deploy as self-hosted service',
        'Install and configure scispaCy, MedSpaCy, PyTorch, XGBoost — AI/ML libraries',
        'Deploy Tesseract OCR with deep learning classifier for credentialing documents',
        'Add enterprise hardware firewall (Palo Alto PA-1400 or Fortinet 400F) in front of nginx',
        'Engage managed SOC service — $10K–$30K/month, quarterly pen test',
        'Add Cloudflare Pro/Business for DDoS and CDN — $500–$2,000/month',
        'Build EDI engine as new Node.js service — 837P, 837I, 835, NCPDP D.0',
        'Integrate Clerk biometric SDK for facial recognition and fingerprint',
        'Begin Twilio or AWS Connect integration for first state hub pilot',
        'Estimated Phase 1 infrastructure investment: $800K–$1.5M capex + $300K–$500K/yr additional opex',
    ]),
    ('Phase 2 — Scaling to 10–15 States (Months 7–18)', [
        'Add 3 more PostgreSQL nodes — scale to 6-node cluster',
        'Expand Redis to 9-node cluster (3 shards x 3 replicas)',
        'Expand MinIO to 1PB+ warm storage, begin cold archival infrastructure',
        'Scale Kafka to 6-broker cluster',
        'Add 2 more GPU servers for expanded AI training capacity',
        'Deploy hub infrastructure per state as states onboard',
        'Deploy Hardware Security Module (HSM) for biometric key storage',
        'Upgrade to Cloudflare Enterprise — $100K+/year',
        'Expand SOC to full managed MSSP or build internal security team',
        'Add load balancer HA pairs — nginx in active-active configuration',
        'Estimated Phase 2 additional investment: $2M–$4M capex + $1M–$2M/yr opex',
    ]),
    ('Phase 3 — National Scale 30–50 States (Months 19–36)', [
        'Full PostgreSQL 6-node cluster with enterprise SAN storage',
        'Redis 9-node cluster at full capacity',
        'MinIO expansion to 10PB+ warm, 50PB+ cold archival',
        'Kafka 9-broker cluster handling 1M+ messages/second',
        'GPU cluster scaled to 6+ servers for full AI model retraining capacity',
        'Multi-region infrastructure for geographic redundancy',
        'Full SOC operations — 24/7 monitoring, incident response team',
        'Hub infrastructure across all participating states',
        'Complete external API integrations — all 50 MMIS, all MCOs, all state boards',
        'Estimated Phase 3 additional investment: $10M–$15M capex + $8M–$12M/yr opex',
    ]),
]

for phase_title, tasks in phases:
    data = [[Paragraph(phase_title, b['SH2'])]]
    t_hdr = Table(data, colWidths=[6.75*inch])
    t_hdr.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),LBG),
        ('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),
        ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
    ]))
    story.append(t_hdr)
    story.append(Spacer(1,4))
    for task in tasks:
        color = ORNG if 'Estimated' in task else DGRAY
        sname = 'BL'
        story.append(Paragraph(f'{"→" if "Estimated" in task else "•"}  {task}',
                               ParagraphStyle('tmp', parent=b['BL'], textColor=color,
                                              fontName='Helvetica-Bold' if 'Estimated' in task else 'Helvetica')))
    story.append(Spacer(1,10))

# SECTION 6: BOTTOM LINE
story.append(PageBreak())
story.append(Paragraph('Section 6: Bottom Line — What You Need to Spend', b['SH'])); story.append(div())

summary = [
    ['Timeline','Capital Investment','Additional Annual Opex','What It Unlocks'],
    ['Right Now (Pre-Launch)', '$800K–$1.5M','+$300K–$500K/yr','Phase 1: NC, SC, GA live. 5,000 providers. Fraud prevention operational. First claim revenue.'],
    ['Phase 2 (Months 7–18)', '$2M–$4M','+$1M–$2M/yr','10–15 states live. 20,000+ providers. MCO integrations complete. Hub operations.'],
    ['Phase 3 (Months 19–36)', '$10M–$15M','+$8M–$12M/yr','40–50 states live. 50,000+ providers. CMS certification. National fraud prevention platform.'],
    ['TOTAL TO FULL SCALE', '$13M–$20.5M','$16M–$20M/yr at full scale','The most comprehensive Medicaid fraud prevention platform in the United States.'],
]
t4 = Table(summary, colWidths=[1.1*inch,1.2*inch,1.2*inch,3.75*inch])
t4.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,0),NAV),('TEXTCOLOR',(0,0),(-1,0),WHITE),
    ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
    ('FONTSIZE',(0,0),(-1,-1),8.5),
    ('ROWBACKGROUNDS',(0,1),(-1,-2),[WHITE,LBG]),
    ('BACKGROUND',(0,-1),(-1,-1),colors.HexColor('#1A4D7A')),
    ('TEXTCOLOR',(0,-1),(-1,-1),WHITE),
    ('FONTNAME',(0,-1),(-1,-1),'Helvetica-Bold'),
    ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#CCCCCC')),
    ('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),
    ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
    ('VALIGN',(0,0),(-1,-1),'TOP'),
    ('TEXTCOLOR',(1,1),(2,3),ORNG),('FONTNAME',(1,1),(2,3),'Helvetica-Bold'),
]))
story.append(t4)

story.append(Spacer(1,14))
story.append(Paragraph('Key Insight', b['SH2']))
story.append(Paragraph(
    'Your current infrastructure of approximately $133K annually is a legitimate enterprise '
    'foundation. Your architectural choices are correct. You are not starting from zero. '
    'What you need is capital to scale what already works — more nodes, more storage, '
    'new AI infrastructure, and new integrations. '
    'The good news: Phase 1 revenue from North Carolina, South Carolina, and Georgia alone '
    'is projected to generate $50M–$80M annually at full penetration — '
    'well above the Phase 1 infrastructure cost of $800K–$1.5M. '
    'The infrastructure investment pays for itself in the first year of operation.', b['BD']))

story.append(Spacer(1,16))
story.append(div(colors.HexColor('#CCCCCC'),0.5))
story.append(Paragraph(
    'MedGuard360  ·  TRG TechLink Proprietary  ·  Document 7  ·  Infrastructure Comparison  ·  2026',
    b['Cap']))

doc.build(story)
print('✅  Infrastructure Comparison PDF complete.')
