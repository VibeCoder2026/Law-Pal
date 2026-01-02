# Tiered Grouping System for Legal Documents

## Overview

The 461 Acts and Statutes of Guyana have been organized into **12 user-friendly tiers** based on relevance to everyday citizens. This system makes legal information more accessible by grouping related laws together.

## Tiered Structure

### Tier A: Know Your Rights (44 documents) ⭐ **HIGH PRIORITY**
**Everyday legal rights - police, courts, crimes, evidence**

- Criminal procedure and offences
- Police powers and arrest
- Court procedures and evidence
- Prison and probation
- Juvenile justice
- Prevention of crime

**Why important:** Essential knowledge for understanding your rights when dealing with law enforcement and the justice system.

### Tier B: Work & Money (54 documents) ⭐ **HIGH PRIORITY**
**Employment, wages, business, consumer rights, debt**

- Labour and employment laws
- Wages and workplace safety
- Business and commerce
- Consumer protection
- Debt and insolvency
- Co-operative societies

**Why important:** Protects your rights as a worker, business owner, or consumer.

### Tier C: Family & Safety (17 documents) ⭐ **HIGH PRIORITY**
**Domestic violence, children, marriage, custody, protection**

- Domestic violence protection
- Child protection and adoption
- Marriage and divorce
- Maintenance and custody
- Sexual offences
- Birth and death registration

**Why important:** Safeguards family rights and personal safety.

### Tier D: Land & Housing (56 documents) ⭐ **HIGH PRIORITY**
**Property, land titles, rent, housing, deeds, planning**

- Land titles and deeds registry
- Property rights and transfers
- Landlord and tenant laws
- Housing and rent control
- Wills and inheritance
- Town planning and building

**Why important:** Critical for property owners, renters, and anyone dealing with land matters.

### Tier E: Democracy & Government (73 documents)
**Elections, parliament, local government, integrity, procurement**

- Elections and representation
- Parliament and National Assembly
- Local government and councils
- Public service and pensions
- Government integrity and procurement
- CARICOM and international relations

**Why important:** Understanding how government works and your democratic rights.

### Tier F: Digital Life (2 documents)
**Cybercrime, electronic transactions, privacy, data, telecommunications**

- Telecommunications
- Broadcasting and media
- (Note: This is a growing area with limited current legislation)

**Why important:** Emerging digital rights and responsibilities.

### Tier G: Finance & Tax (45 documents)
**Banking, taxation, customs, revenue, financial services**

- Banking and financial services
- Taxation (VAT, customs, excise)
- Revenue collection
- Audit and fiscal management
- Securities and investment
- Product-specific duties (spirits, tobacco, etc.)

**Why important:** Understanding your tax obligations and financial regulations.

### Tier H: Health & Education (19 documents)
**Healthcare, medical, schools, universities, training**

- Medical practitioners and health facilities
- Pharmacy and drugs
- Public health
- Schools and universities
- Teacher training
- National insurance

**Why important:** Access to healthcare and education services.

### Tier I: Environment & Resources (41 documents)
**Environment, mining, forestry, agriculture, wildlife**

- Environmental protection
- Mining and petroleum
- Forestry and timber
- Agriculture (rice, sugar, livestock)
- Wildlife and fisheries
- Water and energy

**Why important:** Environmental rights and resource management.

### Tier J: Transport & Immigration (24 documents)
**Roads, vehicles, aviation, shipping, immigration, citizenship**

- Motor vehicles and traffic
- Roads and bridges
- Shipping and maritime
- Aviation
- Immigration and citizenship
- Passports and visas

**Why important:** Travel, transport, and residency rights.

### Tier K: Indigenous & Special Rights (13 documents)
**Amerindian rights, special populations, cultural heritage**

- Amerindian Act and land rights
- Ethnic relations
- Cultural heritage (archives, library, national trust)
- Equal rights
- Fire safety
- Sports and recreation

**Why important:** Protection of indigenous and minority rights.

### Tier L: Legal Profession & Administration (4 documents)
**Legal practitioners, notaries, coroners, court administration**

- Legal practitioners regulation
- Notaries public
- Coroners
- Legal education

**Why important:** For those working in or needing legal services.

### Tier Z: Other Legal Documents (69 documents)
**Specialized and administrative laws**

Includes highly specialized regulations for:
- Specific industries (e.g., Molasses Act, Soap Act)
- Trust funds and special provisions
- Historical or technical administrative matters
- Regional agreements and protocols

**Why less relevant:** These are niche laws that apply to specific circumstances or industries.

---

## Approach to Categorization

### 1. Keyword Matching
Each document was analyzed based on:
- Document title
- Chapter classification
- Subject matter keywords

### 2. Relevance Prioritization
Tiers A-D are marked as **HIGH PRIORITY** because they affect everyday citizens most directly:
- **Tier A**: Rights when interacting with police/courts
- **Tier B**: Work and economic rights
- **Tier C**: Family and personal safety
- **Tier D**: Property and housing

### 3. Multi-pass Classification
The system uses multiple passes to categorize documents:
1. Direct category mapping (existing categorization)
2. Keyword pattern matching
3. Default to specialized category if no match

### 4. Coverage Statistics
- **Total documents:** 461
- **Categorized into specific tiers:** 392 (85%)
- **Remaining in "Other":** 69 (15%)

The 15% in "Other" represents genuinely specialized/technical legislation that doesn't fit common user needs.

---

## Implementation Files

- **Script:** `tools/create-tiered-groups.js`
- **Output:** `law_sources/tiered-catalog.json`
- **Original catalog:** `law_sources/catalog.json`

## Usage

Run the tiered grouping script:
```bash
cd tools
node create-tiered-groups.js
```

This generates `law_sources/tiered-catalog.json` with the complete tiered structure ready for database import.

---

## Next Steps

1. ✅ Download and organize PDFs (461 documents)
2. ✅ Create tiered grouping system
3. ⏳ Extract text content from PDFs
4. ⏳ Design database schema for Acts/Statutes
5. ⏳ Update app UI to browse by tiers
6. ⏳ Implement search across Constitution + Acts



