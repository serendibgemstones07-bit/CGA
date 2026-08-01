from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, Image, KeepTogether
)
import os

SCREENSHOTS = "C:/Claude - Web Applications/ceylon-gem-archive/screenshots"

# Colors
DARK_NAVY = HexColor('#060810')
NAVY = HexColor('#0f1520')
GOLD = HexColor('#c9a84c')
DARK_GOLD = HexColor('#b87714')
WHITE = HexColor('#ffffff')
LIGHT_GRAY = HexColor('#e5e7eb')
MID_GRAY = HexColor('#9ca3af')
DARK_GRAY = HexColor('#374151')
TABLE_BG = HexColor('#141b2d')
TABLE_BORDER = HexColor('#1f2d45')
GREEN = HexColor('#22c55e')
BLUE = HexColor('#3b82f6')
AMBER = HexColor('#f59e0b')

# Styles
styles = {
    'title': ParagraphStyle('Title', fontName='Helvetica-Bold', fontSize=28, textColor=GOLD, alignment=TA_CENTER, leading=34, spaceAfter=4),
    'subtitle': ParagraphStyle('Subtitle', fontName='Helvetica', fontSize=12, textColor=MID_GRAY, alignment=TA_CENTER, spaceBefore=8, spaceAfter=30),
    'h1': ParagraphStyle('H1', fontName='Helvetica-Bold', fontSize=18, textColor=GOLD, spaceBefore=20, spaceAfter=10),
    'h2': ParagraphStyle('H2', fontName='Helvetica-Bold', fontSize=14, textColor=WHITE, spaceBefore=14, spaceAfter=8),
    'h3': ParagraphStyle('H3', fontName='Helvetica-Bold', fontSize=11, textColor=GOLD, spaceBefore=10, spaceAfter=6),
    'body': ParagraphStyle('Body', fontName='Helvetica', fontSize=10, textColor=LIGHT_GRAY, leading=14, spaceAfter=6),
    'bullet': ParagraphStyle('Bullet', fontName='Helvetica', fontSize=10, textColor=LIGHT_GRAY, leading=14, leftIndent=20, spaceAfter=3, bulletIndent=8),
    'small': ParagraphStyle('Small', fontName='Helvetica', fontSize=8, textColor=MID_GRAY, alignment=TA_CENTER),
    'footer': ParagraphStyle('Footer', fontName='Helvetica', fontSize=8, textColor=MID_GRAY, alignment=TA_RIGHT),
    'check': ParagraphStyle('Check', fontName='Helvetica', fontSize=10, textColor=GREEN, leading=14, leftIndent=20, spaceAfter=3, bulletIndent=8),
    'caption': ParagraphStyle('Caption', fontName='Helvetica-Oblique', fontSize=8, textColor=MID_GRAY, alignment=TA_CENTER, spaceBefore=4, spaceAfter=12),
}

W_USABLE = A4[0] - 80

def bg_canvas(canvas_obj, doc):
    canvas_obj.saveState()
    canvas_obj.setFillColor(DARK_NAVY)
    canvas_obj.rect(0, 0, A4[0], A4[1], fill=True, stroke=False)
    canvas_obj.setFillColor(GOLD)
    canvas_obj.rect(0, A4[1] - 4, A4[0], 4, fill=True, stroke=False)
    canvas_obj.setFillColor(MID_GRAY)
    canvas_obj.setFont('Helvetica', 7)
    canvas_obj.drawRightString(A4[0] - 40, 25, f"Page {doc.page}")
    canvas_obj.drawString(40, 25, "Ceylon Gem Archive - Project Plan")
    canvas_obj.setStrokeColor(HexColor('#c9a84c30'))
    canvas_obj.setLineWidth(0.5)
    canvas_obj.line(40, 38, A4[0] - 40, 38)
    canvas_obj.restoreState()

def screenshot(name, caption_text, width=None):
    path = os.path.join(SCREENSHOTS, name)
    w = width or W_USABLE
    img = Image(path, width=w, height=w * 0.45)
    img.hAlign = 'CENTER'
    cap = Paragraph(caption_text, styles['caption'])
    return [Spacer(1, 8), img, cap]

def make_table(headers, rows, col_widths=None):
    data = [headers] + rows
    w = col_widths or [None] * len(headers)
    t = Table(data, colWidths=w, repeatRows=1)
    style = [
        ('BACKGROUND', (0, 0), (-1, 0), GOLD),
        ('TEXTCOLOR', (0, 0), (-1, 0), DARK_NAVY),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('TEXTCOLOR', (0, 1), (-1, -1), LIGHT_GRAY),
        ('BACKGROUND', (0, 1), (-1, -1), TABLE_BG),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [TABLE_BG, NAVY]),
        ('GRID', (0, 0), (-1, -1), 0.5, TABLE_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]
    t.setStyle(TableStyle(style))
    return t

def divider():
    return HRFlowable(width="100%", thickness=1, color=TABLE_BORDER, spaceBefore=10, spaceAfter=10)

def build():
    doc = SimpleDocTemplate(
        "C:/Claude - Web Applications/ceylon-gem-archive/CGA_Project_Plan.pdf",
        pagesize=A4,
        topMargin=30, bottomMargin=50,
        leftMargin=40, rightMargin=40,
    )
    story = []
    W = W_USABLE

    # === COVER ===
    story.append(Spacer(1, 120))
    story.append(Paragraph("CEYLON GEM ARCHIVE", styles['title']))
    story.append(Paragraph("Project Plan & Implementation Roadmap", styles['subtitle']))
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="40%", thickness=2, color=GOLD, spaceBefore=0, spaceAfter=20))
    story.append(Paragraph("A Complete Gemstone Business Operating System", ParagraphStyle('s', fontName='Helvetica', fontSize=12, textColor=WHITE, alignment=TA_CENTER, spaceAfter=8)))
    story.append(Paragraph("Built for Serendib Gemstones", ParagraphStyle('s2', fontName='Helvetica', fontSize=11, textColor=MID_GRAY, alignment=TA_CENTER, spaceAfter=40)))

    info_data = [
        ['Client', 'Serendib Gemstones'],
        ['Platform', 'ceylon-gem-archive.vercel.app'],
        ['Version', '1.0 (Current)'],
        ['Date', 'June 2026'],
        ['Tech Stack', 'React + TypeScript + Tailwind + Supabase + Vercel'],
    ]
    info_table = Table(info_data, colWidths=[120, 300])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), GOLD),
        ('TEXTCOLOR', (1, 0), (1, -1), LIGHT_GRAY),
        ('BACKGROUND', (0, 0), (-1, -1), TABLE_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, TABLE_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(info_table)
    story.append(PageBreak())

    # === TABLE OF CONTENTS ===
    story.append(Paragraph("TABLE OF CONTENTS", styles['h1']))
    story.append(divider())
    toc_items = [
        "1.  Project Overview",
        "2.  Current Features (Built & Working)",
        "3.  Technology Stack",
        "4.  Implementation Roadmap",
        "5.  Competitive Landscape",
        "6.  CGA Competitive Advantages",
        "7.  Summary & Next Steps",
    ]
    for item in toc_items:
        story.append(Paragraph(item, ParagraphStyle('toc', fontName='Helvetica', fontSize=11, textColor=LIGHT_GRAY, spaceAfter=8, leftIndent=20)))
    story.append(PageBreak())

    # === 1. PROJECT OVERVIEW ===
    story.append(Paragraph("1. PROJECT OVERVIEW", styles['h1']))
    story.append(divider())
    story.append(Paragraph(
        "Ceylon Gem Archive (CGA) is a web-based gemstone business operating system designed specifically for colored gemstone dealers. "
        "Unlike general jewelry or diamond-focused inventory systems, CGA is purpose-built for the unique workflows of Sri Lankan gem traders "
        "dealing in sapphires, rubies, and other precious colored stones.",
        styles['body']
    ))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "The system serves as a comprehensive platform for managing gemstone inventory, tracking costs and provenance, "
        "sharing stones with potential buyers through secure links, and maintaining complete documentation for each stone in the collection.",
        styles['body']
    ))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Project Goals:", styles['h3']))
    goals = [
        "Replace spreadsheet-based gemstone tracking with a professional digital system",
        "Provide secure, beautiful buyer presentation links for international clients",
        "Track complete stone journey from acquisition through sale",
        "Maintain full cost breakdown and profitability analysis per stone",
        "Build a competitive advantage over other gem dealers through technology",
    ]
    for g in goals:
        story.append(Paragraph(f"•  {g}", styles['bullet']))

    # Login screenshot
    story.extend(screenshot("01_login.png", "Fig 1. Secure login portal with branded design"))

    story.append(PageBreak())

    # === 2. CURRENT FEATURES ===
    story.append(Paragraph("2. CURRENT FEATURES (BUILT & WORKING)", styles['h1']))
    story.append(divider())

    # -- Dashboard & Navigation --
    story.append(Paragraph("Dashboard & Navigation", styles['h2']))
    checks = [
        "Overview dashboard with gemstone statistics and quick actions",
        "Recent stones quick access",
        "Responsive sidebar with mobile drawer support",
        "Grid and list views for gemstone archive",
        "Search and filter functionality",
    ]
    for c in checks:
        story.append(Paragraph(f"✓  {c}", styles['check']))
    story.extend(screenshot("02_dashboard.png", "Fig 2. Dashboard overview with stats, quick actions, and recent additions"))

    # -- Gem Archive --
    story.append(Paragraph("Gemstone Database & Archive", styles['h2']))
    checks = [
        "Complete stone profiles: species, variety, weight, dimensions, color, clarity, cut, treatment, origin",
        "Auto-generated archive numbers (CGA-YYYY-NNNN) for unique identification",
        "Stone state tracking (Rough / Cut & Polished)",
        "Status management: Available, Reserved, Sold, Exported",
    ]
    for c in checks:
        story.append(Paragraph(f"✓  {c}", styles['check']))
    story.extend(screenshot("03_archive.png", "Fig 3. Gem Archive list view with search, filters, and quick actions"))

    story.append(PageBreak())

    # -- Gemstone Detail --
    story.append(Paragraph("Gemstone Detail View", styles['h2']))
    checks = [
        "Rich detail page with photo/video gallery and all stone properties",
        "Share, Edit, and Delete actions from the detail header",
        "Video playback with navigation arrows and drag-to-reorder thumbnails",
    ]
    for c in checks:
        story.append(Paragraph(f"✓  {c}", styles['check']))
    story.extend(screenshot("08_detail.png", "Fig 4. Gemstone detail page showing video gallery and full property panel"))

    # -- Add/Edit Gemstone --
    story.append(Paragraph("Add & Edit Gemstone Form", styles['h2']))
    checks = [
        "Comprehensive form: Basic Information, Physical Properties, Certification",
        "Dropdown selectors for species, origin, clarity, and status",
        "Auto-generated archive numbers on creation",
    ]
    for c in checks:
        story.append(Paragraph(f"✓  {c}", styles['check']))

    story.append(PageBreak())

    # -- Cost Breakdown --
    story.append(Paragraph("Cost Breakdown & Pricing", styles['h2']))
    checks = [
        "Complete cost tracking: buying price, treatment, certification, other costs",
        "Support for Rough and Cut & Polished cost structures",
        "10 currencies supported with live exchange rate conversion",
        "Selling price, buyer price, and sold price with separate currencies",
        "Profit margin calculation with percentage display",
        "Receipt and bill uploads linked to cost records",
    ]
    for c in checks:
        story.append(Paragraph(f"✓  {c}", styles['check']))
    story.extend(screenshot("04_cost_breakdown.png", "Fig 5. Cost Breakdown section with Rough/Cut & Polished toggle and multi-currency support"))
    story.extend(screenshot("05_selling_notes.png", "Fig 6. Selling Prices with internal/buyer/sold pricing and Notes section"))

    story.append(PageBreak())

    # -- Certificate --
    story.append(Paragraph("Certificate Management", styles['h2']))
    checks = [
        "Store certificate number and certifying laboratory per stone",
        "Support for all major labs: GIA, GRS, GGTL, SSEF, EGL, AIGS, Lotus Gemology",
        "Certificate display on buyer share pages",
    ]
    for c in checks:
        story.append(Paragraph(f"✓  {c}", styles['check']))

    # -- Provenance --
    story.append(Paragraph("Provenance & History Timeline", styles['h2']))
    checks = [
        "Visual timeline of stone journey events",
        "Track: event type, date, location, performed by, notes",
        "Inline editing of history entries from both detail and edit pages",
        "Add, edit, and delete events at any time",
    ]
    for c in checks:
        story.append(Paragraph(f"✓  {c}", styles['check']))
    story.extend(screenshot("09_provenance.png", "Fig 7. Buyer Notes display and Provenance & History timeline with event tracking"))

    # -- Photo & Video --
    story.append(Paragraph("Photo & Video Management", styles['h2']))
    checks = [
        "Multi-file upload with drag-and-drop (JPG, PNG, WebP, MP4)",
        "Image reordering with drag-to-sort functionality",
        "Primary image selection for thumbnails",
        "Full-screen lightbox viewer with image rotation and save",
        "Video playback with custom thumbnails",
    ]
    for c in checks:
        story.append(Paragraph(f"✓  {c}", styles['check']))
    story.extend(screenshot("06_media_upload.png", "Fig 8. Media upload area with drag-and-drop support for photos and videos"))

    story.append(PageBreak())

    # -- Buyer Share Links --
    story.append(Paragraph("Buyer Share Links", styles['h2']))
    checks = [
        "Generate secure, token-based share links for any gemstone",
        "Configurable expiry dates: 1 hour to 90 days, or never",
        "View count tracking per share link",
        "Beautiful public presentation page (no login required)",
        "Representative contact info with profile photo, Call & WhatsApp buttons",
    ]
    for c in checks:
        story.append(Paragraph(f"✓  {c}", styles['check']))
    story.extend(screenshot("10_share_dialog.png", "Fig 9. Share dialog with expiry settings, active link management, and view tracking"))

    story.extend(screenshot("11_buyer_page.png", "Fig 10. Buyer presentation page — public view with properties, certificate, and gallery"))
    story.extend(screenshot("12_buyer_contact.png", "Fig 11. Buyer page footer with representative contact, Call & WhatsApp buttons"))

    story.append(PageBreak())

    # -- Auth & Admin --
    story.append(Paragraph("Authentication & Admin Management", styles['h2']))
    checks = [
        "Secure Supabase authentication with email/password",
        "Role-based access: Super Admin and Admin roles",
        "Admin invite system with unique signup links",
        "Admin blocking, promotion, and management",
        "Profile management with avatar upload",
    ]
    for c in checks:
        story.append(Paragraph(f"✓  {c}", styles['check']))
    story.extend(screenshot("07_admin.png", "Fig 12. Admin Management — invite system, pending invites, role management"))

    # -- Notes --
    story.append(Paragraph("Notes System", styles['h2']))
    checks = [
        "Internal notes (never shown to buyers)",
        "Buyer notes with paragraph formatting (shown on share pages)",
        "Resizable text areas for comfortable editing",
    ]
    for c in checks:
        story.append(Paragraph(f"✓  {c}", styles['check']))

    story.append(PageBreak())

    # === 3. TECH STACK ===
    story.append(Paragraph("3. TECHNOLOGY STACK", styles['h1']))
    story.append(divider())

    tech_data = [
        ['Layer', 'Technology', 'Purpose'],
        ['Frontend', 'React + TypeScript', 'Component-based UI with type safety'],
        ['Styling', 'Tailwind CSS', 'Utility-first CSS with custom gem theme'],
        ['Backend', 'Supabase', 'Authentication, database, storage, real-time'],
        ['Database', 'PostgreSQL', 'Relational data with row-level security'],
        ['Storage', 'Supabase Storage', 'Photos, videos, certificates, receipts'],
        ['Hosting', 'Vercel', 'Edge deployment with automatic CI/CD'],
        ['Routing', 'React Router', 'Client-side navigation'],
        ['Icons', 'Lucide React', 'Consistent icon system'],
    ]
    story.append(make_table(tech_data[0], tech_data[1:], [80, 140, W - 220]))
    story.append(Spacer(1, 20))
    story.append(Paragraph("Architecture Highlights:", styles['h3']))
    arch = [
        "Row-Level Security (RLS) on all database tables for data protection",
        "Public share pages accessible without authentication",
        "Optimized media delivery through Supabase CDN",
        "Responsive design supporting desktop and mobile browsers",
    ]
    for a in arch:
        story.append(Paragraph(f"•  {a}", styles['bullet']))

    story.append(PageBreak())

    # === 4. IMPLEMENTATION ROADMAP ===
    story.append(Paragraph("4. IMPLEMENTATION ROADMAP", styles['h1']))
    story.append(divider())

    story.append(Paragraph("PHASE 1 — Close Critical Gaps", styles['h2']))
    story.append(Paragraph("Goal: Match core features of Nveloop GMS and GemCloud to be competitive.", styles['body']))
    phase1 = [
        ['Feature', 'Description', 'Effort'],
        ['Consignment / Memo\nTracking', 'Track stones sent on approval: who has it, due date,\nmemo terms. New "On Memo" status with reminders.', '2-3\nsessions'],
        ['QR Code System', 'Generate QR per stone linking to buyer share page.\nPrint sheets for gem shows.', '1\nsession'],
        ['Invoicing', 'Generate PDF invoices with logo, stone details,\ncertificate info. Track payment status.', '2\nsessions'],
        ['Supplier\nManagement', 'Track suppliers, link to purchases, view history\nand amounts owed/paid per supplier.', '1-2\nsessions'],
    ]
    story.append(make_table(phase1[0], phase1[1:], [110, W - 180, 70]))
    story.append(Spacer(1, 15))

    story.append(Paragraph("PHASE 2 — Gain Competitive Advantage", styles['h2']))
    story.append(Paragraph("Goal: Surpass competitors with unique features they don't offer.", styles['body']))
    phase2 = [
        ['Feature', 'Description', 'Effort'],
        ['Buyer CRM', 'Full contact management, purchase history, interest\nmatching, auto-suggest stones to buyers.', '2-3\nsessions'],
        ['AI Certificate OCR', 'Upload any certificate (GIA, GGTL, GRS, SSEF, EGL),\nauto-extract all fields. First to support ALL labs.', '1-2\nsessions'],
        ['Consignment\nAccounting', 'Dashboard of memo values, who has what,\noverdue tracking, profit/loss per stone.', '2\nsessions'],
        ['Multi-Currency\nAccounting', 'Track payments in different currencies,\nexchange rate at time of sale.', '1-2\nsessions'],
        ['Digital Vault', 'Store export permits, invoices, lab reports\npermanently linked to each stone.', '1-2\nsessions'],
        ['Inventory Valuation\nDashboard', 'Total cost, market value, potential profit.\nGroup by status, origin, species.', '1-2\nsessions'],
    ]
    story.append(make_table(phase2[0], phase2[1:], [110, W - 180, 70]))
    story.append(Spacer(1, 15))

    story.append(Paragraph("PHASE 3 — Market Leadership", styles['h2']))
    story.append(Paragraph("Goal: Build features no competitor offers, establishing CGA as the industry leader.", styles['body']))
    phase3 = [
        ['Feature', 'Description', 'Effort'],
        ['Exhibition Mode', 'Named collections for shows, PDF/QR catalogues,\ntemporary buyer group share links.', '2\nsessions'],
        ['B2B Marketplace', 'Public catalogue with inquiry button,\nno prices shown. Integrated natively.', '3-4\nsessions'],
        ['Gemstone Passport', 'Blockchain-verified ownership, QR reveals full\nprovenance, certificates, sale history.', '4-5\nsessions'],
        ['Mobile PWA', 'Progressive web app for gem shows and\nfield buying. Offline capable.', '1\nsession'],
        ['Role-Based\nVisibility', 'Hide costs from "Sales" role. Fine-grained\nfield-level access control.', '1\nsession'],
        ['Watermark\nProtection', 'Buyer name overlay on shared images.\nDiscourage unauthorized distribution.', '1\nsession'],
        ['Price Intelligence', 'Price-per-carat trends from sales data.\nHistorical charts by species.', '1-2\nsessions'],
        ['Audit Logs', 'Track who viewed, edited, downloaded,\nshared each stone. Full accountability.', '1-2\nsessions'],
    ]
    story.append(make_table(phase3[0], phase3[1:], [110, W - 180, 70]))

    story.append(PageBreak())

    # === 5. COMPETITIVE LANDSCAPE ===
    story.append(Paragraph("5. COMPETITIVE LANDSCAPE", styles['h1']))
    story.append(divider())
    story.append(Paragraph(
        "The gemstone-specific software market is thin, with only 3-4 truly dedicated tools. "
        "Most competitors are either diamond-focused or general jewelry retail systems. "
        "This represents a significant opportunity for CGA.",
        styles['body']
    ))
    story.append(Spacer(1, 10))

    comp_data = [
        ['System', 'Price/Month', 'Focus', 'Target Market'],
        ['Nveloop GMS', '$50 - $140', 'Colored gemstone\ndealer management', 'Gem merchants\n(closest competitor)'],
        ['GemCloud', '$89.99', 'Inventory + B2B\nmarketplace', 'Gemstone traders'],
        ['Smartrade', 'Unknown', 'Trade management', 'Enterprise gem\nbusinesses'],
        ['CrystalDesk', 'Unknown', 'Merchant CRM', 'Gem merchants'],
        ['Gem Logic', '$299 - $2,500', 'Full jewelry store\nmanagement', 'Retail jewelers'],
        ['Jewel360', 'Unknown', 'Jewelry retail POS\n(GIA integration)', 'Jewelry retailers'],
        ['WingoldNext', 'Unknown', 'Jewelry ERP &\nmanufacturing', 'Jewelry\nmanufacturers'],
        ['Ceylon Gem\nArchive', 'Free\n(self-hosted)', 'Colored gemstone\nbusiness OS', 'Sri Lankan gem\ndealers'],
    ]
    story.append(make_table(comp_data[0], comp_data[1:], [85, 80, 120, W - 285]))
    story.append(Spacer(1, 15))

    story.append(Paragraph("Key Competitor Limitations:", styles['h3']))
    limits = [
        "Nveloop limits photos to 2-3 per stone depending on plan tier",
        "No competitor offers buyer share links with public presentation pages",
        "No competitor provides stone provenance/journey timeline tracking",
        "Most have dated, utilitarian interfaces lacking modern design",
        "None specifically target the Sri Lankan gemstone market",
        "AI-powered certificate extraction is not available in any competitor",
    ]
    for l in limits:
        story.append(Paragraph(f"•  {l}", styles['bullet']))

    story.append(PageBreak())

    # === 6. COMPETITIVE ADVANTAGES ===
    story.append(Paragraph("6. CGA COMPETITIVE ADVANTAGES", styles['h1']))
    story.append(divider())

    adv_data = [
        ['Advantage', 'Details', 'vs Competitors'],
        ['Buyer Share Links', 'Secure, expiring links with beautiful\npublic presentation pages', 'No competitor\noffers this'],
        ['Unlimited Media', 'Upload unlimited photos and videos\nper stone with full management', 'Nveloop limits\nto 2-3 per stone'],
        ['Provenance Timeline', 'Visual journey tracking from\nacquisition through sale', 'Unique to CGA'],
        ['Modern UI/UX', 'Dark luxury theme with responsive\ndesign and smooth interactions', 'Competitors look\ndated'],
        ['Receipt Uploads', 'Bills and receipts linked directly\nto cost breakdown records', 'Not available\nelsewhere'],
        ['Cost Effective', 'Free / self-hosted with no\nmonthly subscription fees', 'Competitors charge\n$50-$300+/month'],
        ['Sri Lankan Focus', 'Built specifically for Sri Lankan\ngem dealers and their workflows', 'No competitor\ntargets this market'],
    ]
    story.append(make_table(adv_data[0], adv_data[1:], [110, 200, W - 310]))

    story.append(PageBreak())

    # === 7. SUMMARY ===
    story.append(Paragraph("7. SUMMARY & NEXT STEPS", styles['h1']))
    story.append(divider())
    story.append(Paragraph(
        "Ceylon Gem Archive is already a functional gemstone business management system with features that surpass "
        "competitors in key areas like buyer presentation, media management, and provenance tracking. "
        "The three-phase roadmap will systematically close gaps and build market-leading capabilities.",
        styles['body']
    ))
    story.append(Spacer(1, 10))

    story.append(Paragraph("Current Status:", styles['h3']))
    status_items = [
        "Core platform built and deployed at ceylon-gem-archive.vercel.app",
        "9 major feature modules operational",
        "Active use for gemstone inventory management",
    ]
    for s in status_items:
        story.append(Paragraph(f"✓  {s}", styles['check']))

    story.append(Spacer(1, 10))
    story.append(Paragraph("Immediate Next Steps (Phase 1):", styles['h3']))
    next_items = [
        "Implement Consignment/Memo tracking for stone approvals",
        "Add QR code generation for gem show presentations",
        "Build invoicing system with PDF export",
        "Create supplier management module",
    ]
    for n in next_items:
        story.append(Paragraph(f"→  {n}", styles['bullet']))

    story.append(Spacer(1, 10))
    story.append(Paragraph("Strategic Vision:", styles['h3']))
    story.append(Paragraph(
        "With Phase 1 and Phase 2 complete, CGA will offer everything that Nveloop and GemCloud provide, "
        "plus buyer share links, unlimited media, provenance tracking, AI-powered certificate OCR, "
        "and a modern user experience — all at a fraction of the cost. This positions CGA as the most "
        "complete and cost-effective gemstone business platform in the market.",
        styles['body']
    ))

    story.append(Spacer(1, 40))
    story.append(HRFlowable(width="30%", thickness=2, color=GOLD, spaceBefore=0, spaceAfter=15))
    story.append(Paragraph("Ceylon Gem Archive — Serendib Gemstones", ParagraphStyle('end', fontName='Helvetica-Bold', fontSize=11, textColor=GOLD, alignment=TA_CENTER, spaceAfter=4)))
    story.append(Paragraph("Project Plan v1.0 • June 2026", ParagraphStyle('end2', fontName='Helvetica', fontSize=9, textColor=MID_GRAY, alignment=TA_CENTER)))

    doc.build(story, onFirstPage=bg_canvas, onLaterPages=bg_canvas)
    print("PDF created: CGA_Project_Plan.pdf")

build()
