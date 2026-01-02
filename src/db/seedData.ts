/**
 * Seed Data for Database
 *
 * Static data that needs to be pre-populated in the database
 */

import { Tier } from '../types';

/**
 * Tier metadata for Acts & Statutes organization
 */
export const TIER_SEED_DATA: Tier[] = [
  {
    id: 'tier-a-rights',
    name: 'Know Your Rights',
    description: 'Everyday legal rights - police, courts, crimes, evidence',
    priority: 1,
    icon: 'shield-account',
    is_priority: true,
  },
  {
    id: 'tier-b-work-money',
    name: 'Work & Money',
    description: 'Employment, wages, business, consumer rights, debt',
    priority: 2,
    icon: 'cash-multiple',
    is_priority: true,
  },
  {
    id: 'tier-c-family-safety',
    name: 'Family & Safety',
    description: 'Domestic violence, children, marriage, custody, protection',
    priority: 3,
    icon: 'home-heart',
    is_priority: true,
  },
  {
    id: 'tier-d-land-housing',
    name: 'Land & Housing',
    description: 'Property, land titles, rent, housing, deeds, planning',
    priority: 4,
    icon: 'home-city',
    is_priority: true,
  },
  {
    id: 'tier-e-democracy-gov',
    name: 'Democracy & Government',
    description: 'Elections, parliament, local government, integrity, procurement',
    priority: 5,
    icon: 'vote',
    is_priority: false,
  },
  {
    id: 'tier-f-digital-life',
    name: 'Digital Life',
    description: 'Cybercrime, electronic transactions, privacy, data, telecommunications',
    priority: 6,
    icon: 'laptop',
    is_priority: false,
  },
  {
    id: 'tier-g-finance-tax',
    name: 'Finance & Tax',
    description: 'Banking, taxation, customs, revenue, financial services',
    priority: 7,
    icon: 'bank',
    is_priority: false,
  },
  {
    id: 'tier-h-health-education',
    name: 'Health & Education',
    description: 'Healthcare, medical, schools, universities, training',
    priority: 8,
    icon: 'school',
    is_priority: false,
  },
  {
    id: 'tier-i-environment-resources',
    name: 'Environment & Resources',
    description: 'Environment, mining, forestry, agriculture, wildlife',
    priority: 9,
    icon: 'leaf',
    is_priority: false,
  },
  {
    id: 'tier-j-transport-immigration',
    name: 'Transport & Immigration',
    description: 'Roads, vehicles, aviation, shipping, immigration, citizenship',
    priority: 10,
    icon: 'airplane-car',
    is_priority: false,
  },
  {
    id: 'tier-k-indigenous-special',
    name: 'Indigenous & Special Rights',
    description: 'Amerindian rights, special populations, cultural heritage',
    priority: 11,
    icon: 'account-group',
    is_priority: false,
  },
  {
    id: 'tier-l-legal-profession',
    name: 'Legal Profession & Administration',
    description: 'Legal practitioners, notaries, coroners, court administration',
    priority: 12,
    icon: 'gavel',
    is_priority: false,
  },
  {
    id: 'tier-z-other',
    name: 'Other Legal Documents',
    description: 'Specialized and administrative laws',
    priority: 99,
    icon: 'book',
    is_priority: false,
  },
];
