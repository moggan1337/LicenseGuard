/**
 * LicenseGuard - Test Suite
 */

import { 
  LicenseDetector, 
  SPDX_DATABASE,
  CATEGORY_RISK_SCORES 
} from '../src/core/license-detector';
import { 
  CompatibilityMatrix, 
  COMPATIBILITY_MATRIX 
} from '../src/core/compatibility-matrix';
import { GPLDetector } from '../src/core/gpl-detector';
import { ConflictResolver } from '../src/core/conflict-resolver';
import { CopyrightEnforcer } from '../src/core/copyright-enforcer';
import { VersionUtils, StringUtils, formatBytes, formatDuration } from '../src/utils';

describe('LicenseDetector', () => {
  describe('detect', () => {
    it('should detect MIT license', () => {
      const result = LicenseDetector.detect('MIT');
      expect(result.spdxId).toBe('MIT');
      expect(result.category).toBe('permissive');
      expect(result.osiApproved).toBe(true);
    });

    it('should detect Apache-2.0 license', () => {
      const result = LicenseDetector.detect('Apache-2.0');
      expect(result.spdxId).toBe('Apache-2.0');
      expect(result.category).toBe('permissive');
      expect(result.osiApproved).toBe(true);
    });

    it('should detect GPL-3.0 license', () => {
      const result = LicenseDetector.detect('GPL-3.0');
      expect(result.spdxId).toBe('GPL-3.0');
      expect(result.category).toBe('copyleft-strong');
      expect(result.osiApproved).toBe(true);
    });

    it('should detect AGPL-3.0 license', () => {
      const result = LicenseDetector.detect('AGPL-3.0');
      expect(result.spdxId).toBe('AGPL-3.0');
      expect(result.category).toBe('network-copyleft');
    });

    it('should handle unknown license', () => {
      const result = LicenseDetector.detect('UNKNOWN_LICENSE_XYZ');
      expect(result.spdxId).toBe('Unknown');
      expect(result.category).toBe('unknown');
    });

    it('should handle null input', () => {
      const result = LicenseDetector.detect(null);
      expect(result.spdxId).toBe('Unknown');
    });

    it('should detect SPDX expression with OR', () => {
      const result = LicenseDetector.detect('MIT OR Apache-2.0');
      expect(['MIT', 'Apache-2.0']).toContain(result.spdxId);
    });
  });

  describe('getCategory', () => {
    it('should return correct category for MIT', () => {
      expect(LicenseDetector.getCategory('MIT')).toBe('permissive');
    });

    it('should return correct category for GPL', () => {
      expect(LicenseDetector.getCategory('GPL-3.0')).toBe('copyleft-strong');
    });

    it('should return correct category for AGPL', () => {
      expect(LicenseDetector.getCategory('AGPL-3.0')).toBe('network-copyleft');
    });

    it('should return correct category for CC0', () => {
      expect(LicenseDetector.getCategory('CC0-1.0')).toBe('public-domain');
    });
  });

  describe('isOSIApproved', () => {
    it('should return true for MIT', () => {
      expect(LicenseDetector.isOSIApproved('MIT')).toBe(true);
    });

    it('should return true for Apache-2.0', () => {
      expect(LicenseDetector.isOSIApproved('Apache-2.0')).toBe(true);
    });

    it('should return false for proprietary', () => {
      expect(LicenseDetector.isOSIApproved('Proprietary')).toBe(false);
    });
  });

  describe('getRiskScore', () => {
    it('should return low risk for permissive licenses', () => {
      const score = LicenseDetector.getRiskScore('MIT');
      expect(score).toBeLessThan(20);
    });

    it('should return high risk for network copyleft', () => {
      const score = LicenseDetector.getRiskScore('AGPL-3.0');
      expect(score).toBeGreaterThanOrEqual(80);
    });

    it('should return high risk for unknown licenses', () => {
      const score = LicenseDetector.getRiskScore('Unknown');
      expect(score).toBeGreaterThanOrEqual(80);
    });
  });

  describe('getOSIApprovedLicenses', () => {
    it('should return array of OSI approved licenses', () => {
      const licenses = LicenseDetector.getOSIApprovedLicenses();
      expect(licenses).toContain('MIT');
      expect(licenses).toContain('Apache-2.0');
      expect(licenses).toContain('GPL-3.0');
    });
  });
});

describe('CompatibilityMatrix', () => {
  describe('checkCompatibility', () => {
    it('should show MIT and MIT are compatible', () => {
      const result = CompatibilityMatrix.checkCompatibility('MIT', 'MIT');
      expect(result.compatible).toBe(true);
    });

    it('should show MIT and Apache-2.0 are compatible', () => {
      const result = CompatibilityMatrix.checkCompatibility('MIT', 'Apache-2.0');
      expect(result.compatible).toBe(true);
    });

    it('should show MIT and GPL-3.0 are compatible', () => {
      const result = CompatibilityMatrix.checkCompatibility('MIT', 'GPL-3.0');
      expect(result.compatible).toBe(true);
    });

    it('should show GPL-3.0 and Proprietary are incompatible', () => {
      const result = CompatibilityMatrix.checkCompatibility('GPL-3.0', 'Proprietary');
      expect(result.compatible).toBe(false);
      expect(result.restrictions).toBeDefined();
    });

    it('should show AGPL-3.0 and Proprietary are incompatible', () => {
      const result = CompatibilityMatrix.checkCompatibility('AGPL-3.0', 'Proprietary');
      expect(result.compatible).toBe(false);
    });
  });

  describe('checkAllCompatible', () => {
    it('should return true for all permissive licenses', () => {
      const result = CompatibilityMatrix.checkAllCompatible(['MIT', 'Apache-2.0', 'BSD-3-Clause']);
      expect(result.compatible).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should detect conflicts with GPL and Proprietary', () => {
      const result = CompatibilityMatrix.checkAllCompatible(['GPL-3.0', 'Proprietary']);
      expect(result.compatible).toBe(false);
      expect(result.conflicts.length).toBeGreaterThan(0);
    });
  });

  describe('getCompatibleLicenses', () => {
    it('should return compatible licenses for MIT', () => {
      const compatible = CompatibilityMatrix.getCompatibleLicenses('MIT');
      expect(compatible).toContain('GPL-3.0');
      expect(compatible).toContain('Apache-2.0');
    });
  });

  describe('calculateCompatibilityScore', () => {
    it('should return 100 for single license', () => {
      const score = CompatibilityMatrix.calculateCompatibilityScore(['MIT']);
      expect(score).toBe(100);
    });

    it('should return lower score for incompatible licenses', () => {
      const score = CompatibilityMatrix.calculateCompatibilityScore(['GPL-3.0', 'Proprietary']);
      expect(score).toBeLessThan(100);
    });
  });
});

describe('GPLDetector', () => {
  describe('detectViolations', () => {
    it('should detect GPL and proprietary combination', () => {
      const mockDeps = [
        {
          name: 'gpl-package',
          version: '1.0.0',
          license: { spdxId: 'GPL-3.0' as const, category: 'copyleft-strong' as const },
          children: []
        },
        {
          name: 'proprietary-package',
          version: '2.0.0',
          license: { spdxId: 'Proprietary' as const, category: 'proprietary' as const },
          children: []
        }
      ];

      const violations = GPLDetector.detectViolations(mockDeps as any, 'Proprietary');
      expect(violations.some(v => v.hasViolation && v.violationType === 'strong-copyleft-linking')).toBe(true);
    });

    it('should detect AGPL in network service', () => {
      const mockDeps = [
        {
          name: 'agpl-package',
          version: '1.0.0',
          license: { spdxId: 'AGPL-3.0' as const, category: 'network-copyleft' as const },
          children: []
        }
      ];

      const violations = GPLDetector.detectViolations(mockDeps as any, 'MIT', true);
      expect(violations.some(v => v.hasViolation && v.violationType === 'network-copyleft-usage')).toBe(true);
    });
  });

  describe('calculateRiskScore', () => {
    it('should return 0 for empty dependencies', () => {
      const score = GPLDetector.calculateRiskScore([]);
      expect(score).toBe(0);
    });

    it('should return higher score for GPL dependencies', () => {
      const mockDeps = [
        {
          name: 'gpl-package',
          version: '1.0.0',
          license: { spdxId: 'GPL-3.0' as const, category: 'copyleft-strong' as const },
          children: []
        }
      ];

      const score = GPLDetector.calculateRiskScore(mockDeps as any);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations for GPL dependencies', () => {
      const mockDeps = [
        {
          name: 'gpl-package',
          version: '1.0.0',
          license: { spdxId: 'GPL-3.0' as const, category: 'copyleft-strong' as const },
          children: []
        }
      ];

      const recommendations = GPLDetector.generateRecommendations(mockDeps as any, 'MIT');
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].priority).toBe('high');
    });
  });
});

describe('ConflictResolver', () => {
  describe('detectConflicts', () => {
    it('should detect no conflicts for permissive licenses', () => {
      const mockDeps = [
        {
          name: 'mit-package',
          version: '1.0.0',
          license: { spdxId: 'MIT' as const, category: 'permissive' as const },
          children: []
        },
        {
          name: 'apache-package',
          version: '2.0.0',
          license: { spdxId: 'Apache-2.0' as const, category: 'permissive' as const },
          children: []
        }
      ];

      const conflicts = ConflictResolver.detectConflicts(mockDeps as any, 'MIT');
      expect(conflicts.filter(c => c.severity === 'error')).toHaveLength(0);
    });
  });

  describe('findReplacements', () => {
    it('should find replacements for moment.js', () => {
      const replacements = ConflictResolver.findReplacements('moment');
      expect(replacements.length).toBeGreaterThan(0);
    });

    it('should return empty for unknown package', () => {
      const replacements = ConflictResolver.findReplacements('nonexistent-package-xyz');
      expect(replacements).toHaveLength(0);
    });
  });
});

describe('CopyrightEnforcer', () => {
  describe('validateCopyright', () => {
    it('should validate correct copyright string', () => {
      expect(CopyrightEnforcer.validateCopyright('Copyright 2024 Test Company')).toBe(true);
    });

    it('should validate copyright with © symbol', () => {
      expect(CopyrightEnforcer.validateCopyright('© 2024 Test Company')).toBe(true);
    });

    it('should reject future year', () => {
      expect(CopyrightEnforcer.validateCopyright('Copyright 2099 Future Inc')).toBe(false);
    });
  });

  describe('extractCopyrightInfo', () => {
    it('should extract years from copyright string', () => {
      const info = CopyrightEnforcer.extractCopyrightInfo('Copyright 2020-2024 Test');
      expect(info.years).toContain(2020);
      expect(info.years).toContain(2024);
    });

    it('should extract holder from copyright string', () => {
      const info = CopyrightEnforcer.extractCopyrightInfo('Copyright 2024 Test Company Inc');
      expect(info.holders).toContain('Test Company Inc');
    });
  });
});

describe('VersionUtils', () => {
  describe('satisfies', () => {
    it('should validate version satisfies range', () => {
      expect(VersionUtils.satisfies('1.2.3', '^1.0.0')).toBe(true);
      expect(VersionUtils.satisfies('2.0.0', '^1.0.0')).toBe(false);
    });
  });

  describe('compare', () => {
    it('should compare versions correctly', () => {
      expect(VersionUtils.compare('1.2.3', '1.2.4')).toBe(-1);
      expect(VersionUtils.compare('2.0.0', '1.9.9')).toBe(1);
      expect(VersionUtils.compare('1.0.0', '1.0.0')).toBe(0);
    });
  });

  describe('isValid', () => {
    it('should validate semver versions', () => {
      expect(VersionUtils.isValid('1.0.0')).toBe(true);
      expect(VersionUtils.isValid('1.2.3-beta.1')).toBe(true);
      expect(VersionUtils.isValid('invalid')).toBe(false);
    });
  });

  describe('latest', () => {
    it('should return latest version from list', () => {
      expect(VersionUtils.latest(['1.0.0', '2.0.0', '1.5.0'])).toBe('2.0.0');
    });

    it('should return null for empty list', () => {
      expect(VersionUtils.latest([])).toBeNull();
    });
  });
});

describe('StringUtils', () => {
  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(StringUtils.truncate('Hello World', 8)).toBe('Hello...');
    });

    it('should not truncate short strings', () => {
      expect(StringUtils.truncate('Hi', 10)).toBe('Hi');
    });
  });

  describe('kebabCase', () => {
    it('should convert to kebab-case', () => {
      expect(StringUtils.kebabCase('helloWorld')).toBe('hello-world');
      expect(StringUtils.kebabCase('Hello World')).toBe('hello-world');
    });
  });

  describe('camelCase', () => {
    it('should convert to camelCase', () => {
      expect(StringUtils.camelCase('hello-world')).toBe('helloWorld');
      expect(StringUtils.camelCase('hello_world')).toBe('helloWorld');
    });
  });
});

describe('formatBytes', () => {
  it('should format bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
  });
});

describe('formatDuration', () => {
  it('should format duration correctly', () => {
    expect(formatDuration(500)).toBe('500ms');
    expect(formatDuration(1500)).toBe('1.5s');
    expect(formatDuration(120000)).toBe('2.0m');
  });
});
