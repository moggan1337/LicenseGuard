/**
 * Automated License Negotiation
 * 
 * Handles automated license compatibility negotiations,
 * suggests alternative packages, and manages license transitions.
 */

import { 
  SPDXLicenseID, 
  NegotiationOffer,
  LicenseResolution,
  DependencyNode,
  Recommendation
} from './types';
import { LicenseDetector } from './license-detector';
import { CompatibilityMatrix } from './compatibility-matrix';
import { ConflictResolver } from './conflict-resolver';

/**
 * Negotiation strategy types
 */
type NegotiationStrategy = 
  | 'upgrade-to-permissive'
  | 'replace-with-alternative'
  | 'dual-license'
  | 'commercial-license'
  | 'exception-request';

/**
 * Negotiation outcome
 */
interface NegotiationOutcome {
  success: boolean;
  strategy: NegotiationStrategy;
  originalLicense: SPDXLicenseID;
  targetLicense?: SPDXLicenseID;
  actions: NegotiationAction[];
  timeline?: string;
  cost?: string;
  notes?: string;
}

/**
 * Action to take during negotiation
 */
interface NegotiationAction {
  type: 'replace' | 'upgrade' | 'exception' | 'document' | 'contact';
  description: string;
  target?: string;
  priority: 'required' | 'recommended' | 'optional';
}

/**
 * Alternative package suggestion
 */
interface AlternativePackage {
  name: string;
  version: string;
  license: SPDXLicenseID;
  compatibility: number; // 0-100
  features: string[];
  npmUrl: string;
  lastPublish: string;
  weeklyDownloads: number;
}

/**
 * License upgrade path
 */
interface UpgradePath {
  from: SPDXLicenseID;
  to: SPDXLicenseID;
  steps: UpgradeStep[];
  risk: 'low' | 'medium' | 'high';
}

/**
 * Single upgrade step
 */
interface UpgradeStep {
  action: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  breaking: boolean;
}

/**
 * Automated License Negotiator
 */
export class LicenseNegotiator {
  // Known upgrade paths between licenses
  private static readonly KNOWN_UPGRADE_PATHS: Record<SPDXLicenseID, SPDXLicenseID[]> = {
    'GPL-2.0': ['GPL-3.0', 'LGPL-2.1', 'LGPL-3.0', 'Apache-2.0', 'MIT'],
    'GPL-3.0': ['Apache-2.0', 'MIT'],
    'LGPL-2.1': ['LGPL-3.0', 'Apache-2.0', 'MIT'],
    'EUPL-1.1': ['EUPL-1.2', 'GPL-3.0', 'Apache-2.0', 'MIT'],
    'MPL-1.1': ['MPL-2.0', 'EPL-2.0', 'Apache-2.0'],
    'EPL-1.0': ['EPL-2.0', 'Apache-2.0', 'MIT'],
    'CDDL-1.0': ['CDDL-1.1', 'EPL-2.0', 'Apache-2.0'],
    'Proprietary': ['Apache-2.0', 'MIT', 'BSD-3-Clause']
  };

  // Package replacement registry
  private static readonly PACKAGE_ALTERNATIVES: Record<string, AlternativePackage[]> = {
    // Date/Time libraries
    'moment': [
      { name: 'date-fns', version: '3.x', license: 'MIT', compatibility: 95, features: ['tree-shakeable', 'immutable', 'modular'], npmUrl: 'https://www.npmjs.com/package/date-fns', lastPublish: '2024', weeklyDownloads: 12000000 },
      { name: 'dayjs', version: '1.x', license: 'MIT', compatibility: 90, features: ['moment-compatible', 'lightweight', 'immutable'], npmUrl: 'https://www.npmjs.com/package/dayjs', lastPublish: '2024', weeklyDownloads: 8000000 },
      { name: 'luxon', version: '3.x', license: 'MIT', compatibility: 85, features: ['immutable', 'powerful', 'timezone-native'], npmUrl: 'https://www.npmjs.com/package/luxon', lastPublish: '2024', weeklyDownloads: 3000000 }
    ],
    // Lodash alternatives
    'lodash': [
      { name: 'lodash-es', version: '4.x', license: 'MIT', compatibility: 100, features: ['tree-shakeable', 'es-modules'], npmUrl: 'https://www.npmjs.com/package/lodash-es', lastPublish: '2024', weeklyDownloads: 5000000 },
      { name: 'ramda', version: '0.29', license: 'MIT', compatibility: 80, features: ['functional', 'immutable', 'curried'], npmUrl: 'https://www.npmjs.com/package/ramda', lastPublish: '2024', weeklyDownloads: 1500000 }
    ],
    // HTTP clients
    'axios': [
      { name: 'node-fetch', version: '3.x', license: 'MIT', compatibility: 85, features: ['native-fetch', 'server-side'], npmUrl: 'https://www.npmjs.com/package/node-fetch', lastPublish: '2024', weeklyDownloads: 6000000 }
    ],
    // CLI utilities
    'commander': [
      { name: 'clipanion', version: '3.x', license: 'MIT', compatibility: 75, features: ['type-safe', 'claire'], npmUrl: 'https://www.npmjs.com/package/clipanion', lastPublish: '2024', weeklyDownloads: 500000 }
    ]
  };

  /**
   * Negotiate license compatibility
   */
  static negotiate(
    currentLicense: SPDXLicenseID,
    targetLicense: SPDXLicenseID,
    projectContext?: {
      isNetworkService?: boolean;
      isProprietary?: boolean;
      hasTrademarkAssets?: boolean;
    }
  ): NegotiationOutcome {
    const compatibility = CompatibilityMatrix.checkCompatibility(currentLicense, targetLicense);
    
    if (compatibility.compatible) {
      return {
        success: true,
        strategy: 'upgrade-to-permissive',
        originalLicense: currentLicense,
        targetLicense,
        actions: [{
          type: 'document',
          description: 'Licenses are already compatible, no action required',
          priority: 'optional'
        }]
      };
    }

    // Generate negotiation offer
    const offer = CompatibilityMatrix.generateNegotiationOffer(currentLicense, targetLicense);
    
    // Determine strategy based on licenses
    const strategy = this.determineStrategy(currentLicense, targetLicense, projectContext);
    
    // Generate actions
    const actions = this.generateNegotiationActions(currentLicense, targetLicense, strategy, offer);

    return {
      success: true,
      strategy,
      originalLicense: currentLicense,
      targetLicense,
      actions,
      notes: offer?.compatibilityNotes
    };
  }

  /**
   * Find upgrade path between licenses
   */
  static findUpgradePath(from: SPDXLicenseID, to: SPDXLicenseID): UpgradePath | null {
    // Direct upgrade
    if (CompatibilityMatrix.checkCompatibility(from, to).compatible) {
      return {
        from,
        to,
        steps: [{
          action: 'upgrade',
          description: `Direct upgrade from ${from} to ${to}`,
          effort: 'low',
          breaking: false
        }],
        risk: 'low'
      };
    }

    // Find indirect path
    const knownUpgrades = this.KNOWN_UPGRADE_PATHS[from] || [];
    const steps: UpgradeStep[] = [];

    let current = from;
    let risk: 'low' | 'medium' | 'high' = 'medium';

    for (const nextLicense of knownUpgrades) {
      if (steps.length > 3) break; // Limit path length

      const stepCompatibility = CompatibilityMatrix.checkCompatibility(current, nextLicense);
      
      if (stepCompatibility.compatible) {
        steps.push({
          action: 'upgrade',
          description: `Upgrade ${current} to ${nextLicense}`,
          effort: 'low',
          breaking: false
        });
        current = nextLicense;

        if (CompatibilityMatrix.checkCompatibility(current, to).compatible) {
          steps.push({
            action: 'upgrade',
            description: `Upgrade ${current} to ${to}`,
            effort: 'low',
            breaking: false
          });

          return { from, to, steps, risk };
        }
      }
    }

    return steps.length > 0 ? { from, to, steps, risk } : null;
  }

  /**
   * Find alternative packages
   */
  static findAlternatives(packageName: string, currentLicense: SPDXLicenseID): AlternativePackage[] {
    const alternatives = this.PACKAGE_ALTERNATIVES[packageName] || [];
    
    // Filter by compatibility if needed
    return alternatives.filter(alt => 
      CompatibilityMatrix.checkCompatibility(currentLicense, alt.license).compatible
    );
  }

  /**
   * Suggest replacement for a dependency
   */
  static suggestReplacement(
    dependency: DependencyNode,
    targetLicenseCategory?: string
  ): Recommendation | null {
    const currentLicense = dependency.license?.spdxId || 'Unknown';
    const alternatives = this.findAlternatives(dependency.name, currentLicense);

    if (alternatives.length === 0) {
      return null;
    }

    // Find best alternative
    const best = alternatives.reduce((prev, curr) => 
      prev.compatibility > curr.compatibility ? prev : curr
    );

    return {
      type: 'replace',
      package: dependency.name,
      currentLicense,
      suggestedReplacement: best.name,
      suggestedLicense: best.license,
      priority: 'high',
      reason: `Replace ${dependency.name} with ${best.name} (${best.license}) for better license compatibility. ${best.compatibility}% API compatible.`,
      effort: best.compatibility >= 90 ? 'low' : best.compatibility >= 70 ? 'medium' : 'high'
    };
  }

  /**
   * Generate negotiation letter template
   */
  static generateNegotiationLetter(
    packageName: string,
    maintainer: string,
    purpose: string
  ): string {
    return `# License Negotiation Request

## Package Information
- **Package:** ${packageName}
- **Maintainer:** ${maintainer}
- **Purpose:** ${purpose}

## Request Details

Dear ${maintainer},

I am writing to discuss the licensing of ${packageName} for use in our project.

[Describe your use case and why current licensing presents challenges]

## Proposed Options

### Option 1: License Upgrade
Would you consider releasing ${packageName} under a more permissive license such as MIT or Apache 2.0?

### Option 2: Dual Licensing
Would you be open to offering a commercial license for proprietary use cases?

### Option 3: Exception Request
Would you consider granting a specific exception for our use case?

## Benefits

- Increased adoption among enterprise users
- Broader community contributions
- Goodwill within the open source community

## Next Steps

Please let me know your thoughts on any of these options. I am happy to discuss further and can arrange a call if preferred.

Thank you for your time and consideration.

Best regards,
[Your Name]
[Your Organization]
[Contact Information]
`;
  }

  /**
   * Determine best negotiation strategy
   */
  private static determineStrategy(
    from: SPDXLicenseID,
    to: SPDXLicenseID,
    context?: {
      isNetworkService?: boolean;
      isProprietary?: boolean;
    }
  ): NegotiationStrategy {
    const fromCategory = LicenseDetector.getCategory(from);
    const toCategory = LicenseDetector.getCategory(to);

    // Upgrade to permissive
    if (fromCategory !== 'permissive' && toCategory === 'permissive') {
      return 'upgrade-to-permissive';
    }

    // Replace with alternative
    if (fromCategory === 'copyleft-strong' || fromCategory === 'network-copyleft') {
      if (context?.isProprietary) {
        return 'replace-with-alternative';
      }
      return 'upgrade-to-permissive';
    }

    // Dual licensing
    if (fromCategory === 'proprietary' && toCategory === 'permissive') {
      return 'upgrade-to-permissive';
    }

    // Commercial license
    if (fromCategory === 'copyleft-strong') {
      return 'commercial-license';
    }

    return 'exception-request';
  }

  /**
   * Generate negotiation actions
   */
  private static generateNegotiationActions(
    from: SPDXLicenseID,
    to: SPDXLicenseID,
    strategy: NegotiationStrategy,
    offer?: NegotiationOffer | null
  ): NegotiationAction[] {
    const actions: NegotiationAction[] = [];

    switch (strategy) {
      case 'upgrade-to-permissive':
        actions.push({
          type: 'upgrade',
          description: `Contact maintainer to request license upgrade from ${from} to ${to}`,
          priority: 'required'
        });
        actions.push({
          type: 'document',
          description: 'Document the request and any response received',
          priority: 'required'
        });
        break;

      case 'replace-with-alternative':
        actions.push({
          type: 'replace',
          description: `Find and migrate to ${to}-licensed alternative`,
          priority: 'required'
        });
        actions.push({
          type: 'document',
          description: 'Document the deprecation and migration path',
          priority: 'recommended'
        });
        break;

      case 'dual-license':
        actions.push({
          type: 'contact',
          description: `Negotiate dual-licensing arrangement for ${from}`,
          priority: 'required'
        });
        actions.push({
          type: 'document',
          description: 'Execute license agreement and store in legal repository',
          priority: 'required'
        });
        break;

      case 'commercial-license':
        actions.push({
          type: 'contact',
          description: `Contact maintainer for commercial licensing terms`,
          priority: 'required'
        });
        actions.push({
          type: 'document',
          description: 'Review and execute commercial license agreement',
          priority: 'required'
        });
        break;

      case 'exception-request':
        actions.push({
          type: 'exception',
          description: `Request specific license exception for ${from}`,
          priority: 'recommended'
        });
        actions.push({
          type: 'document',
          description: 'Document the exception grant and its scope',
          priority: 'required'
        });
        break;
    }

    // Add offer-specific obligations
    if (offer) {
      for (const obligation of offer.obligations) {
        actions.push({
          type: 'document',
          description: `Obligation: ${obligation}`,
          priority: 'required'
        });
      }
    }

    return actions;
  }
}
