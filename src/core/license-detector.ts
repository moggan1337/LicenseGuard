/**
 * SPDX License Database and Detection
 * 
 * Provides comprehensive SPDX license information including:
 * - License metadata (name, SPDX ID, category, OSI approval)
 * - SPDX expression parsing
 * - License text extraction patterns
 * - License categorization
 */

import { 
  SPDXLicenseID, 
  LicenseCategory, 
  LicenseInfo, 
  SPDXExpression 
} from './types';

/**
 * SPDX License Database
 * Maps SPDX IDs to their full metadata
 */
export const SPDX_DATABASE: Record<SPDXLicenseID, Omit<LicenseInfo, 'raw'>> = {
  'MIT': {
    spdxId: 'MIT',
    name: 'MIT License',
    category: 'permissive',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use'],
    conditions: ['include-copyright'],
    limitations: ['no-liability']
  },
  'Apache-2.0': {
    spdxId: 'Apache-2.0',
    name: 'Apache License 2.0',
    category: 'permissive',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'patent-use', 'private-use'],
    conditions: ['include-copyright', 'include-notice', 'state-changes'],
    limitations: ['no-liability', 'trademark-use']
  },
  'GPL-2.0': {
    spdxId: 'GPL-2.0',
    name: 'GNU General Public License v2.0 only',
    category: 'copyleft-strong',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use'],
    conditions: ['include-copyright', 'disclose-source', 'source-code-provided', 'same-license'],
    limitations: ['no-liability']
  },
  'GPL-3.0': {
    spdxId: 'GPL-3.0',
    name: 'GNU General Public License v3.0 only',
    category: 'copyleft-strong',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use', 'patent-use'],
    conditions: ['include-copyright', 'disclose-source', 'source-code-provided', 'same-license', 'network-use-disclose'],
    limitations: ['no-liability', 'trademark-use']
  },
  'LGPL-2.1': {
    spdxId: 'LGPL-2.1',
    name: 'GNU Lesser General Public License v2.1 only',
    category: 'copyleft-weak',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use'],
    conditions: ['include-copyright', 'disclose-source', 'source-code-provided', 'same-license'],
    limitations: ['no-liability']
  },
  'LGPL-3.0': {
    spdxId: 'LGPL-3.0',
    name: 'GNU Lesser General Public License v3.0 only',
    category: 'copyleft-weak',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use', 'patent-use'],
    conditions: ['include-copyright', 'disclose-source', 'source-code-provided', 'same-license'],
    limitations: ['no-liability', 'trademark-use']
  },
  'AGPL-3.0': {
    spdxId: 'AGPL-3.0',
    name: 'GNU Affero General Public License v3.0',
    category: 'network-copyleft',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use', 'patent-use'],
    conditions: ['include-copyright', 'disclose-source', 'source-code-provided', 'same-license', 'network-use-disclose'],
    limitations: ['no-liability', 'trademark-use']
  },
  'BSD-2-Clause': {
    spdxId: 'BSD-2-Clause',
    name: 'BSD 2-Clause "Simplified" License',
    category: 'permissive',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use'],
    conditions: ['include-copyright'],
    limitations: ['no-endorsement']
  },
  'BSD-3-Clause': {
    spdxId: 'BSD-3-Clause',
    name: 'BSD 3-Clause "New" or "Revised" License',
    category: 'permissive',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use'],
    conditions: ['include-copyright', 'no-endorsement'],
    limitations: ['no-liability']
  },
  'MPL-2.0': {
    spdxId: 'MPL-2.0',
    name: 'Mozilla Public License 2.0',
    category: 'copyleft-limited',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'patent-use', 'private-use'],
    conditions: ['disclose-source', 'include-license'],
    limitations: ['no-liability', 'trademark-use', 'patent-use']
  },
  'ISC': {
    spdxId: 'ISC',
    name: 'ISC License',
    category: 'permissive',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use'],
    conditions: ['include-copyright'],
    limitations: ['no-liability']
  },
  'Unlicense': {
    spdxId: 'Unlicense',
    name: 'The Unlicense',
    category: 'public-domain',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use', 'sublicense'],
    conditions: [],
    limitations: []
  },
  'CC0-1.0': {
    spdxId: 'CC0-1.0',
    name: 'Creative Commons Zero v1.0 Universal',
    category: 'public-domain',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use', 'sublicense'],
    conditions: [],
    limitations: ['no-patent', 'no-trademark']
  },
  'Artistic-2.0': {
    spdxId: 'Artistic-2.0',
    name: 'Artistic License 2.0',
    category: 'permissive',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use'],
    conditions: ['include-copyright', 'same-license'],
    limitations: ['no-liability']
  },
  'BSL-1.0': {
    spdxId: 'BSL-1.0',
    name: 'Boost Software License 1.0',
    category: 'permissive',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use'],
    conditions: ['include-copyright'],
    limitations: ['no-liability']
  },
  'WTFPL': {
    spdxId: 'WTFPL',
    name: 'Do What The F*ck You Want To Public License',
    category: 'permissive',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use', 'sublicense'],
    conditions: [],
    limitations: []
  },
  'Zlib': {
    spdxId: 'Zlib',
    name: 'zlib License',
    category: 'permissive',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use'],
    conditions: ['include-copyright', 'acknowledge-source'],
    limitations: ['no-liability']
  },
  'PostgreSQL': {
    spdxId: 'PostgreSQL',
    name: 'PostgreSQL License',
    category: 'permissive',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use', 'sublicense'],
    conditions: ['include-copyright', 'acknowledge-source'],
    limitations: ['no-liability']
  },
  'Python-2.0': {
    spdxId: 'Python-2.0',
    name: 'Python License 2.0',
    category: 'permissive',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use'],
    conditions: ['include-copyright', 'include-license'],
    limitations: ['no-liability', 'trademark-use']
  },
  'Ruby': {
    spdxId: 'Ruby',
    name: 'Ruby License',
    category: 'permissive',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use'],
    conditions: ['include-copyright'],
    limitations: ['no-liability', 'trademark-use']
  },
  'Perl-5': {
    spdxId: 'Perl-5',
    name: 'Perl License',
    category: 'permissive',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use'],
    conditions: ['include-copyright'],
    limitations: ['no-liability']
  },
  'PHP': {
    spdxId: 'PHP',
    name: 'PHP License v3.01',
    category: 'permissive',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use'],
    conditions: ['include-copyright', 'include-license'],
    limitations: ['no-liability', 'trademark-use']
  },
  'EUPL-1.2': {
    spdxId: 'EUPL-1.2',
    name: 'European Union Public License 1.2',
    category: 'copyleft-strong',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use', 'sublicense'],
    conditions: ['include-copyright', 'same-license'],
    limitations: ['no-liability']
  },
  'EUPL-1.1': {
    spdxId: 'EUPL-1.1',
    name: 'European Union Public License 1.1',
    category: 'copyleft-strong',
    isDeprecated: true,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use'],
    conditions: ['include-copyright', 'same-license'],
    limitations: ['no-liability']
  },
  'CDDL-1.0': {
    spdxId: 'CDDL-1.0',
    name: 'Common Development and Distribution License 1.0',
    category: 'copyleft-limited',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use'],
    conditions: ['disclose-source', 'include-license', 'same-license'],
    limitations: ['no-liability', 'trademark-use']
  },
  'CDDL-1.1': {
    spdxId: 'CDDL-1.1',
    name: 'Common Development and Distribution License 1.1',
    category: 'copyleft-limited',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use'],
    conditions: ['disclose-source', 'include-license', 'same-license'],
    limitations: ['no-liability', 'trademark-use']
  },
  'EPL-1.0': {
    spdxId: 'EPL-1.0',
    name: 'Eclipse Public License 1.0',
    category: 'copyleft-limited',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use'],
    conditions: ['disclose-source', 'include-license', 'same-license'],
    limitations: ['no-liability']
  },
  'EPL-2.0': {
    spdxId: 'EPL-2.0',
    name: 'Eclipse Public License 2.0',
    category: 'copyleft-limited',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use', 'patent-use'],
    conditions: ['disclose-source', 'include-license', 'same-license'],
    limitations: ['no-liability', 'trademark-use']
  },
  'OSL-3.0': {
    spdxId: 'OSL-3.0',
    name: 'Open Software License 3.0',
    category: 'copyleft-strong',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use'],
    conditions: ['include-copyright', 'authenticate-source', 'source-code-provided', 'same-license'],
    limitations: ['no-liability']
  },
  'AFL-3.0': {
    spdxId: 'AFL-3.0',
    name: 'Academic Free License 3.0',
    category: 'permissive',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use'],
    conditions: ['include-copyright', 'include-notice'],
    limitations: ['no-liability']
  },
  'NCSA': {
    spdxId: 'NCSA',
    name: 'University of Illinois/NCSA Open Source License',
    category: 'permissive',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use'],
    conditions: ['include-copyright', 'include-notice'],
    limitations: ['no-liability']
  },
  'ODbL-1.0': {
    spdxId: 'ODbL-1.0',
    name: 'Open Data Commons Open Database License v1.0',
    category: 'copyleft-weak',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use'],
    conditions: ['include-copyright', 'disclose-source', 'same-license'],
    limitations: ['no-warranty', 'liability-limit']
  },
  'ODC-By': {
    spdxId: 'ODC-By',
    name: 'Open Data Commons Attribution License v1.0',
    category: 'permissive',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use'],
    conditions: ['include-attribution'],
    limitations: []
  },
  'PDDL-1.0': {
    spdxId: 'PDDL-1.0',
    name: 'Open Data Commons Public Domain Dedication v1.0',
    category: 'public-domain',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use', 'sublicense'],
    conditions: [],
    limitations: []
  },
  '0BSD': {
    spdxId: '0BSD',
    name: 'BSD Zero Clause License',
    category: 'permissive',
    isDeprecated: false,
    osiApproved: true,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use'],
    conditions: [],
    limitations: []
  },
  'Beerware': {
    spdxId: 'Beerware',
    name: 'Beerware License',
    category: 'permissive',
    isDeprecated: false,
    osiApproved: false,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use'],
    conditions: ['buy-beer'],
    limitations: []
  },
  'CC-BY-4.0': {
    spdxId: 'CC-BY-4.0',
    name: 'Creative Commons Attribution 4.0 International',
    category: 'permissive',
    isDeprecated: false,
    osiApproved: false,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use', 'sublicense'],
    conditions: ['include-copyright', 'include-attribution'],
    limitations: ['no-endorsement']
  },
  'CC-BY-SA-4.0': {
    spdxId: 'CC-BY-SA-4.0',
    name: 'Creative Commons Attribution Share Alike 4.0 International',
    category: 'copyleft-weak',
    isDeprecated: false,
    osiApproved: false,
    permissions: ['commercial-use', 'modifications', 'distribution', 'private-use', 'sublicense'],
    conditions: ['include-copyright', 'include-attribution', 'same-license'],
    limitations: ['no-endorsement']
  },
  'CC-BY-NC-4.0': {
    spdxId: 'CC-BY-NC-4.0',
    name: 'Creative Commons Attribution Non Commercial 4.0 International',
    category: 'copyleft-weak',
    isDeprecated: false,
    osiApproved: false,
    permissions: ['modifications', 'distribution', 'private-use', 'sublicense'],
    conditions: ['include-copyright', 'include-attribution', 'non-commercial'],
    limitations: ['no-commercial', 'no-endorsement']
  },
  'Proprietary': {
    spdxId: 'Proprietary',
    name: 'Proprietary License',
    category: 'proprietary',
    isDeprecated: false,
    osiApproved: false,
    permissions: [],
    conditions: [],
    limitations: []
  },
  'Unknown': {
    spdxId: 'Unknown',
    name: 'Unknown License',
    category: 'unknown',
    isDeprecated: false,
    osiApproved: false,
    permissions: [],
    conditions: [],
    limitations: []
  },
  'NOASSERTION': {
    spdxId: 'NOASSERTION',
    name: 'No Assertion',
    category: 'unknown',
    isDeprecated: false,
    osiApproved: false,
    permissions: [],
    conditions: [],
    limitations: []
  }
};

/**
 * License detection patterns for common license formats
 */
export const LICENSE_PATTERNS: { pattern: RegExp; license: SPDXLicenseID }[] = [
  // MIT License
  { pattern: /MIT\s*License/i, license: 'MIT' },
  { pattern: /permission is hereby granted, free of charge/i, license: 'MIT' },
  
  // Apache 2.0
  { pattern: /Apache\s+License[,\s]+Version\s+2\.0/i, license: 'Apache-2.0' },
  { pattern: /Apache-2\.0/i, license: 'Apache-2.0' },
  
  // GPL Family
  { pattern: /GNU\s+General\s+Public\s+License[,\s]+version\s+3/i, license: 'GPL-3.0' },
  { pattern: /GNU\s+General\s+Public\s+License[,\s]+version\s+2/i, license: 'GPL-2.0' },
  { pattern: /GPL-3\.0|GNU\s+GPL\s+v3/i, license: 'GPL-3.0' },
  { pattern: /GPL-2\.0|GNU\s+GPL\s+v2/i, license: 'GPL-2.0' },
  { pattern: /GNU\s+Affero\s+General\s+Public\s+License/i, license: 'AGPL-3.0' },
  { pattern: /GNU\s+Lesser\s+General\s+Public\s+License[,\s]+version\s+3/i, license: 'LGPL-3.0' },
  { pattern: /GNU\s+Lesser\s+General\s+Public\s+License[,\s]+version\s+2/i, license: 'LGPL-2.1' },
  { pattern: /LGPL-3\.0/i, license: 'LGPL-3.0' },
  { pattern: /LGPL-2\.1/i, license: 'LGPL-2.1' },
  { pattern: /AGPL-3\.0/i, license: 'AGPL-3.0' },
  
  // BSD Family
  { pattern: /BSD\s+2-Clause|BSD-2-Clause/i, license: 'BSD-2-Clause' },
  { pattern: /BSD\s+3-Clause|BSD-3-Clause/i, license: 'BSD-3-Clause' },
  { pattern: /BSD\s+Zero\s+Clause|0BSD/i, license: '0BSD' },
  
  // Other Open Source Licenses
  { pattern: /Mozilla\s+Public\s+License[,\s]+Version\s+2\.0/i, license: 'MPL-2.0' },
  { pattern: /MPL-2\.0/i, license: 'MPL-2.0' },
  { pattern: /ISC\s+License/i, license: 'ISC' },
  { pattern: /The\s+Unlicense/i, license: 'Unlicense' },
  { pattern: /CC0\s+1\.0|Creative\s+Commons\s+Zero/i, license: 'CC0-1.0' },
  { pattern: /Boost\s+Software\s+License/i, license: 'BSL-1.0' },
  { pattern: /zlib\s+License/i, license: 'Zlib' },
  { pattern: /PostgreSQL\s+License/i, license: 'PostgreSQL' },
  { pattern: /Python\s+License\s+2\.0/i, license: 'Python-2.0' },
  { pattern: /Ruby\s+License/i, license: 'Ruby' },
  { pattern: /Perl\s+License/i, license: 'Perl-5' },
  { pattern: /PHP\s+License/i, license: 'PHP' },
  { pattern: /Eclipse\s+Public\s+License/i, license: 'EPL-2.0' },
  { pattern: /EPL-2\.0/i, license: 'EPL-2.0' },
  { pattern: /CDDL/i, license: 'CDDL-1.0' },
  { pattern: /Common\s+Development\s+and\s+Distribution/i, license: 'CDDL-1.0' },
  { pattern: /EUPL|European\s+Union\s+Public\s+License/i, license: 'EUPL-1.2' },
  { pattern: /Open\s+Software\s+License/i, license: 'OSL-3.0' },
  { pattern: /Academic\s+Free\s+License/i, license: 'AFL-3.0' },
  { pattern: /NCSA\s+Open\s+Source\s+License/i, license: 'NCSA' },
  { pattern: /WTFPL|Do\s+What\s+The\s+F\*?ck/i, license: 'WTFPL' },
  { pattern: /Artistic\s+License/i, license: 'Artistic-2.0' },
  
  // Creative Commons
  { pattern: /CC-BY(-NC)?(-SA)?\s*4\.0/i, license: 'CC-BY-4.0' },
  { pattern: /Creative\s+Commons\s+Attribution/i, license: 'CC-BY-4.0' },
  
  // Public Domain
  { pattern: /Public\s+Domain/i, license: 'Unlicense' },
  { pattern: /No\s+Rights\s+Reserved/i, license: 'CC0-1.0' }
];

/**
 * Category risk scores (0-100, higher = more risky)
 */
export const CATEGORY_RISK_SCORES: Record<LicenseCategory, number> = {
  'permissive': 10,
  'public-domain': 5,
  'copyleft-weak': 30,
  'copyleft-limited': 40,
  'copyleft-strong': 60,
  'network-copyleft': 80,
  'proprietary': 50,
  'unknown': 90
};

/**
 * LicenseGuard License Detector
 */
export class LicenseDetector {
  /**
   * Detect license from package.json license field or license file content
   */
  static detect(licenseField: string | { type?: string; url?: string } | null): LicenseInfo {
    if (!licenseField) {
      return this.createUnknownLicense();
    }

    // Handle SPDX expression format
    if (typeof licenseField === 'string') {
      // Check for SPDX expression with operators
      if (licenseField.includes(' OR ') || licenseField.includes(' AND ')) {
        return this.parseSPDXExpression(licenseField);
      }

      // Try exact SPDX ID match
      const normalized = this.normalizeLicenseString(licenseField);
      const spdxId = this.findSPDXId(normalized);
      if (spdxId && SPDX_DATABASE[spdxId]) {
        return this.createLicenseInfo(spdxId, licenseField);
      }

      // Try pattern matching
      for (const { pattern, license } of LICENSE_PATTERNS) {
        if (pattern.test(licenseField)) {
          return this.createLicenseInfo(license, licenseField);
        }
      }

      // Check for common license file patterns
      if (licenseField.includes('(MIT)') || licenseField === 'MIT') {
        return this.createLicenseInfo('MIT', licenseField);
      }

      // Return unknown if no match
      return this.createLicenseInfo('Unknown', licenseField);
    }

    // Handle object format (package.json license type)
    if (licenseField.type) {
      return this.detect(licenseField.type);
    }

    if (licenseField.url) {
      return this.detect(licenseField.url);
    }

    return this.createUnknownLicense();
  }

  /**
   * Detect license from file content (LICENSE file, README, etc.)
   */
  static detectFromContent(content: string): LicenseInfo | null {
    if (!content || content.length < 50) {
      return null;
    }

    // Try pattern matching
    for (const { pattern, license } of LICENSE_PATTERNS) {
      if (pattern.test(content)) {
        return this.createLicenseInfo(license, content.substring(0, 200));
      }
    }

    return null;
  }

  /**
   * Parse SPDX expression (simplified)
   */
  private static parseSPDXExpression(expression: string): LicenseInfo {
    // Handle OR expressions - take the first compatible alternative
    const orMatch = expression.match(/([^ ]+)\s+OR\s+(.+)/i);
    if (orMatch) {
      const firstLicense = this.normalizeLicenseString(orMatch[1]);
      const firstId = this.findSPDXId(firstLicense);
      if (firstId && SPDX_DATABASE[firstId]) {
        return this.createLicenseInfo(firstId, expression);
      }
      const secondLicense = this.normalizeLicenseString(orMatch[2]);
      const secondId = this.findSPDXId(secondLicense);
      if (secondId && SPDX_DATABASE[secondId]) {
        return this.createLicenseInfo(secondId, expression);
      }
    }

    // Handle AND expressions - take the first one
    const andMatch = expression.match(/([^ ]+)\s+AND\s+(.+)/i);
    if (andMatch) {
      const firstLicense = this.normalizeLicenseString(andMatch[1]);
      const firstId = this.findSPDXId(firstLicense);
      if (firstId && SPDX_DATABASE[firstId]) {
        return this.createLicenseInfo(firstId, expression);
      }
    }

    return this.createLicenseInfo('Unknown', expression);
  }

  /**
   * Normalize license string for matching
   */
  private static normalizeLicenseString(license: string): string {
    return license
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/\s+/g, '-')
      .replace(/[()]/g, '')
      .toUpperCase();
  }

  /**
   * Find SPDX ID from normalized license string
   */
  private static findSPDXId(normalized: string): SPDXLicenseID | null {
    const spdxIds = Object.keys(SPDX_DATABASE) as SPDXLicenseID[];
    
    // Direct match
    if (spdxIds.includes(normalized as SPDXLicenseID)) {
      return normalized as SPDXLicenseID;
    }

    // Fuzzy match
    for (const id of spdxIds) {
      const normalizedId = id.toUpperCase().replace(/\s+/g, '-');
      if (normalized.includes(normalizedId) || normalizedId.includes(normalized)) {
        return id;
      }
    }

    return null;
  }

  /**
   * Create license info object
   */
  private static createLicenseInfo(spdxId: SPDXLicenseID, raw: string): LicenseInfo {
    const dbEntry = SPDX_DATABASE[spdxId];
    return {
      ...dbEntry,
      raw
    };
  }

  /**
   * Create unknown license info
   */
  private static createUnknownLicense(): LicenseInfo {
    return {
      ...SPDX_DATABASE['Unknown'],
      raw: ''
    };
  }

  /**
   * Get category for a license
   */
  static getCategory(license: SPDXLicenseID): LicenseCategory {
    const dbEntry = SPDX_DATABASE[license];
    return dbEntry?.category || 'unknown';
  }

  /**
   * Check if license is OSI approved
   */
  static isOSIApproved(license: SPDXLicenseID): boolean {
    const dbEntry = SPDX_DATABASE[license];
    return dbEntry?.osiApproved || false;
  }

  /**
   * Check if license is deprecated
   */
  static isDeprecated(license: SPDXLicenseID): boolean {
    const dbEntry = SPDX_DATABASE[license];
    return dbEntry?.isDeprecated || false;
  }

  /**
   * Get risk score for a license
   */
  static getRiskScore(license: SPDXLicenseID): number {
    const category = this.getCategory(license);
    return CATEGORY_RISK_SCORES[category] || 50;
  }

  /**
   * Get all licenses in a category
   */
  static getLicensesByCategory(category: LicenseCategory): SPDXLicenseID[] {
    return (Object.keys(SPDX_DATABASE) as SPDXLicenseID[])
      .filter(id => SPDX_DATABASE[id].category === category);
  }

  /**
   * Get all OSI approved licenses
   */
  static getOSIApprovedLicenses(): SPDXLicenseID[] {
    return (Object.keys(SPDX_DATABASE) as SPDXLicenseID[])
      .filter(id => SPDX_DATABASE[id].osiApproved);
  }
}
