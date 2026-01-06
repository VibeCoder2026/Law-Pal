/**
 * Create Tiered Grouping for Legal Documents
 *
 * Maps the 461 legal documents into user-friendly tiers based on relevance
 * to everyday citizens
 */

const fs = require('fs').promises;
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const CATALOG_PATH = path.join(ROOT_DIR, 'law_sources', 'catalog.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'law_sources', 'tiered-catalog.json');

/**
 * Tier definitions based on relevance to everyday citizens
 */
const TIER_DEFINITIONS = {
  'tier-a-rights': {
    name: 'Know Your Rights',
    description: 'Everyday legal rights - police, courts, crimes, evidence',
    priority: 1,
    icon: 'shield-account',
    keywords: /police|arrest|bail|court|procedure|criminal|offence|offense|evidence|statement|jury|trial|magistrate|justice|prison|probation|sentence|parole|witness|testimony|crime|penalty|penal|gambling|theft|stealing|kidnapping|hijacking|piracy|juvenile offender|fugitive|rehabilitation|flogging|whipping|prevention of crime/i,
    includeCategories: ['criminal-justice'],
  },

  'tier-b-work-money': {
    name: 'Work & Money',
    description: 'Employment, wages, business, consumer rights, debt',
    priority: 2,
    icon: 'cash-multiple',
    keywords: /labour|labor|employment|worker|wage|salary|termination|consumer|debt|contract|business|trade|commerce|company|partnership|insolvency|bankruptcy|loan|credit|co-operative|societies|pledge|metal dealer|bakeries/i,
    includeCategories: ['labor-employment', 'commercial-business', 'consumer-protection'],
  },

  'tier-c-family-safety': {
    name: 'Family & Safety',
    description: 'Domestic violence, children, marriage, custody, protection',
    priority: 3,
    icon: 'home-heart',
    keywords: /domestic violence|child|children|protection|marriage|divorce|custody|maintenance|matrimonial|family|adoption|sexual offence|trafficking|abuse|victim|infancy|legitimacy|birth|death|registration/i,
    includeCategories: ['family-social'],
  },

  'tier-d-land-housing': {
    name: 'Land & Housing',
    description: 'Property, land titles, rent, housing, deeds, planning',
    priority: 4,
    icon: 'home-city',
    keywords: /land|property|title|deed|registry|mortgage|lease|rent|housing|estate|eviction|landlord|tenant|town planning|building|construction|will|inheritance|probate|trustee|defamation|limitation|arbitration|insolvency|receiver|wills act|immovable property|partition|war graves|state lands|resumption|acquisition|land bonds|surveys|geological survey/i,
    includeCategories: ['civil-law', 'housing-development'],
  },

  'tier-e-democracy-gov': {
    name: 'Democracy & Government',
    description: 'Elections, parliament, local government, integrity, procurement',
    priority: 5,
    icon: 'vote',
    keywords: /election|parliament|assembly|local government|municipality|council|integrity|corruption|ombudsman|procurement|public service|commission|pension|defence|national service|military|security|mutual assistance|privileges and immunities|diplomatic|consular|statute law|interpretation|law revision|caribbean community|caricom|geneva convention|friendly societies|public officer|local democratic organs|coat of arms|public holiday|national registration|statistics/i,
    includeCategories: ['constitutional-electoral', 'administrative-public'],
  },

  'tier-f-digital-life': {
    name: 'Digital Life',
    description: 'Cybercrime, electronic transactions, privacy, data, telecommunications',
    priority: 6,
    icon: 'laptop',
    keywords: /cyber|electronic|digital|data|privacy|telecommunication|internet|computer|information technology|broadcasting|media/i,
    includeCategories: ['media-communications'],
  },

  'tier-g-finance-tax': {
    name: 'Finance & Tax',
    description: 'Banking, taxation, customs, revenue, financial services',
    priority: 7,
    icon: 'bank',
    keywords: /bank|financial|tax|revenue|customs|vat|duty|excise|stamp|levy|securities|investment|insurance|audit|fiscal|procurement|debentures|rice cess|molasses|cordials|bitters|soap|spirits|tobacco|rum|matches/i,
    includeCategories: ['finance-banking', 'tax-revenue'],
  },

  'tier-h-health-education': {
    name: 'Health & Education',
    description: 'Healthcare, medical, schools, universities, training',
    priority: 8,
    icon: 'school',
    keywords: /health|medical|hospital|doctor|pharmacy|drug|education|school|university|teacher|student|training/i,
    includeCategories: ['health-welfare', 'education'],
  },

  'tier-i-environment-resources': {
    name: 'Environment & Resources',
    description: 'Environment, mining, forestry, agriculture, wildlife',
    priority: 9,
    icon: 'leaf',
    keywords: /environment|forestry|mining|petroleum|wildlife|fisheries|agriculture|crop|livestock|conservation|water|energy|electricity|national park|iwokrama|environmental protection|forests|bauxite|geology|mines|timber|rice|sugar|coconut|tobacco|balata|cane|bees|birds|cattle|slaughter|dogs|sea defence|drainage|irrigation|blasting|minerals/i,
    includeCategories: ['environment-resources', 'agriculture', 'energy-utilities'],
  },

  'tier-j-transport-immigration': {
    name: 'Transport & Immigration',
    description: 'Roads, vehicles, aviation, shipping, immigration, citizenship',
    priority: 10,
    icon: 'airplane-car',
    keywords: /transport|motor|vehicle|road|traffic|aviation|shipping|maritime|immigration|passport|visa|citizenship|alien|expulsion|domicile|carriage of goods|passengers act|harbours|wharves|steamer|river navigation|creek|bridge|airport/i,
    includeCategories: ['transport-infrastructure', 'immigration-citizenship'],
  },

  'tier-k-indigenous-special': {
    name: 'Indigenous & Special Rights',
    description: 'Amerindian rights, special populations, cultural heritage',
    priority: 11,
    icon: 'account-group',
    keywords: /amerindian|indigenous|tribal|native|land rights|cultural|heritage|archives|library|national trust|racial hostility|ethnic relations|equal rights|fire prevention|fire service|public collections|music and dancing|methodist|red cross|boy scouts|national data|sports commission/i,
    includeCategories: ['indigenous-amerindian'],
  },

  'tier-l-legal-profession': {
    name: 'Legal Profession & Administration',
    description: 'Legal practitioners, notaries, coroners, court administration',
    priority: 12,
    icon: 'gavel',
    keywords: /legal practitioner|lawyer|attorney|notary|coroner|legal education|council of legal education|petition|statutory declaration|power of attorney/i,
    includeCategories: [],
  },
};

/**
 * Categorize a document into a tier
 */
function categorizeIntoTier(doc, existingCategory) {
  // First check if the existing category maps directly to a tier
  for (const [tierId, tier] of Object.entries(TIER_DEFINITIONS)) {
    if (tier.includeCategories.includes(existingCategory)) {
      return tierId;
    }
  }

  // If not, match by keywords in title
  const searchText = `${doc.title} ${doc.chapter}`;

  for (const [tierId, tier] of Object.entries(TIER_DEFINITIONS)) {
    if (tier.keywords.test(searchText)) {
      return tierId;
    }
  }

  // Default to uncategorized
  return 'tier-z-other';
}

/**
 * Create tiered catalog
 */
async function createTieredCatalog() {
  console.log('📊 Creating tiered catalog...\n');

  // Read existing catalog
  const catalogData = await fs.readFile(CATALOG_PATH, 'utf8');
  const catalog = JSON.parse(catalogData);

  // Initialize tiers
  const tiers = {
    'tier-a-rights': { ...TIER_DEFINITIONS['tier-a-rights'], documents: [] },
    'tier-b-work-money': { ...TIER_DEFINITIONS['tier-b-work-money'], documents: [] },
    'tier-c-family-safety': { ...TIER_DEFINITIONS['tier-c-family-safety'], documents: [] },
    'tier-d-land-housing': { ...TIER_DEFINITIONS['tier-d-land-housing'], documents: [] },
    'tier-e-democracy-gov': { ...TIER_DEFINITIONS['tier-e-democracy-gov'], documents: [] },
    'tier-f-digital-life': { ...TIER_DEFINITIONS['tier-f-digital-life'], documents: [] },
    'tier-g-finance-tax': { ...TIER_DEFINITIONS['tier-g-finance-tax'], documents: [] },
    'tier-h-health-education': { ...TIER_DEFINITIONS['tier-h-health-education'], documents: [] },
    'tier-i-environment-resources': { ...TIER_DEFINITIONS['tier-i-environment-resources'], documents: [] },
    'tier-j-transport-immigration': { ...TIER_DEFINITIONS['tier-j-transport-immigration'], documents: [] },
    'tier-k-indigenous-special': { ...TIER_DEFINITIONS['tier-k-indigenous-special'], documents: [] },
    'tier-l-legal-profession': { ...TIER_DEFINITIONS['tier-l-legal-profession'], documents: [] },
    'tier-z-other': {
      name: 'Other Legal Documents',
      description: 'Specialized and administrative laws',
      priority: 99,
      icon: 'book',
      documents: []
    },
  };

  // Categorize all documents
  let totalDocs = 0;
  for (const category of catalog.categories) {
    for (const doc of category.documents) {
      const tier = categorizeIntoTier(doc, category.name);

      tiers[tier].documents.push({
        ...doc,
        originalCategory: category.name,
      });

      totalDocs++;
    }
  }

  // Calculate counts
  for (const tier of Object.values(tiers)) {
    tier.count = tier.documents.length;
    // Sort documents by chapter number
    tier.documents.sort((a, b) => {
      if (!a.chapter) return 1;
      if (!b.chapter) return -1;
      return a.chapter.localeCompare(b.chapter);
    });
  }

  // Create output
  const tieredCatalog = {
    totalDocuments: totalDocs,
    createdAt: new Date().toISOString(),
    source: catalog.source,
    tiers: Object.entries(tiers)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => a.priority - b.priority),
  };

  // Save to file
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(tieredCatalog, null, 2));

  console.log(`✅ Tiered catalog created!\n`);
  console.log(`📊 Summary by tier:\n`);

  tieredCatalog.tiers.forEach(tier => {
    console.log(`   ${tier.name.padEnd(40)} ${tier.count.toString().padStart(3)} documents`);
  });

  console.log(`\n📁 Saved to: ${OUTPUT_PATH}\n`);
}

// Run
if (require.main === module) {
  createTieredCatalog().catch(console.error);
}

module.exports = { createTieredCatalog, categorizeIntoTier };
