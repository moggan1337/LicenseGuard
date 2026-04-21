/**
 * LicenseGuard - Core Types and Interfaces
 * 
 * This module defines all the core types used throughout the LicenseGuard system,
 * including SPDX identifiers, license compatibility rules, policy definitions,
 * and dependency tree structures.
 */

// SPDX License Identifiers and License Categories
export type SPDXLicenseID = 
  | 'MIT' | 'Apache-2.0' | 'GPL-2.0' | 'GPL-3.0' | 'LGPL-2.1' | 'LGPL-3.0'
  | 'AGPL-3.0' | 'BSD-2-Clause' | 'BSD-3-Clause' | 'MPL-2.0' | 'ISC'
  | 'Unlicense' | 'CC0-1.0' | 'Artistic-2.0' | 'BSL-1.0' | 'WTFPL'
  | 'Zlib' | 'PostgreSQL' | 'Python-2.0' | 'Ruby' | 'Perl-5' | 'PHP'
  | 'EUPL-1.2' | 'EUPL-1.1' | 'CDDL-1.0' | 'CDDL-1.1' | 'EPL-1.0' | 'EPL-2.0'
  | 'OSL-3.0' | 'AFL-3.0' | 'NCSA' | 'ODbL-1.0' | 'ODC-By' | 'PDDL-1.0'
  | '0BSD' | 'Beerware' | 'CC-BY-4.0' | 'CC-BY-SA-4.0' | 'CC-BY-NC-4.0'
  | 'Proprietary' | 'Unknown' | 'NOASSERTION';

export type LicenseCategory = 
  | 'permissive' 
  | 'copyleft-strong' 
  | 'copyleft-weak' 
  | 'copyleft-limited'
  | 'network-copyleft'
  | 'public-domain'
  | 'proprietary'
  | 'unknown';

/**
 * SPDX License Expression for complex license combinations
 */
export interface SPDXExpression {
  operator?: 'AND' | 'OR';
  left?: SPDXExpression;
  right?: SPDXExpression;
  license?: string;
  exception?: string;
}

/**
 * License information extracted from a package
 */
export interface LicenseInfo {
  spdxId: SPDXLicenseID;
  name: string;
  raw: string;
  category: LicenseCategory;
  isDeprecated: boolean;
  osiApproved: boolean;
  url?: string;
  text?: string;
  permissions?: string[];
  conditions?: string[];
  limitations?: string[];
}

/**
 * Dependency node in the dependency tree
 */
export interface DependencyNode {
  name: string;
  version: string;
  license?: LicenseInfo;
  repository?: string;
  homepage?: string;
  author?: string;
  description?: string;
  dev: boolean;
  optional: boolean;
  bundled: boolean;
  children: DependencyNode[];
  parent?: DependencyNode;
  depth: number;
  path: string[];
}

/**
 * License conflict between two dependencies
 */
export interface LicenseConflict {
  source: string;
  target: string;
  reason: string;
  severity: 'error' | 'warning' | 'info';
  resolution?: LicenseResolution;
}

/**
 * Resolution strategy for license conflicts
 */
export interface LicenseResolution {
  strategy: 'upgrade' | 'replace' | 'ignore' | 'negotiate' | 'exception';
  suggestedPackage?: string;
  alternativeLicense?: string;
  action?: string;
  notes?: string;
}

/**
 * Policy rule for license compliance
 */
export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'error' | 'warning' | 'info';
  licenses: SPDXLicenseID[];
  category?: LicenseCategory;
  action: 'allow' | 'deny' | 'warn' | 'negotiate';
  conditions?: PolicyCondition[];
  message?: string;
}

/**
 * Condition for policy evaluation
 */
export interface PolicyCondition {
  field: 'license' | 'category' | 'osiApproved' | 'dev' | 'optional';
  operator: 'equals' | 'contains' | 'matches' | 'in';
  value: string | boolean | string[];
}

/**
 * Compliance policy configuration
 */
export interface CompliancePolicy {
  id: string;
  name: string;
  description: string;
  version: string;
  rules: PolicyRule[];
  globalSettings: PolicySettings;
  exceptions: PolicyException[];
}

/**
 * Policy settings
 */
export interface PolicySettings {
  allowDeprecatedLicenses: boolean;
  requireOSIApproval: boolean;
  checkLicenseCompatibility: boolean;
  detectGPLViolations: boolean;
  enforceCopyrightHeaders: boolean;
  minimumCompatibleLicenseAge?: number;
  maxLicenseRiskScore: number;
  allowedLicenseCategories: LicenseCategory[];
  blockedLicenses: SPDXLicenseID[];
  approvedLicenses: SPDXLicenseID[];
}

/**
 * Policy exception for specific packages
 */
export interface PolicyException {
  packageName: string;
  packageVersion?: string;
  license: SPDXLicenseID;
  reason: string;
  approvedBy?: string;
  expiresAt?: Date;
  ticket?: string;
}

/**
 * License compatibility result
 */
export interface CompatibilityResult {
  licenseA: SPDXLicenseID;
  licenseB: SPDXLicenseID;
  compatible: boolean;
  direction?: 'a-to-b' | 'b-to-a' | 'bidirectional';
  restrictions?: string;
  attributionRequired?: string[];
  shareAlikeRequired?: boolean;
}

/**
 * Compliance report
 */
export interface ComplianceReport {
  generatedAt: Date;
  scannedAt: Date;
  projectName: string;
  projectVersion: string;
  totalDependencies: number;
  directDependencies: number;
  transitiveDependencies: number;
  licensesFound: LicenseDistribution;
  violations: LicenseViolation[];
  warnings: LicenseWarning[];
  recommendations: Recommendation[];
  policy: string;
  summary: ComplianceSummary;
  metadata: ReportMetadata;
}

/**
 * License distribution statistics
 */
export interface LicenseDistribution {
  byLicense: Map<SPDXLicenseID, number>;
  byCategory: Map<LicenseCategory, number>;
  uniqueLicenses: SPDXLicenseID[];
  mostCommon: { license: SPDXLicenseID; count: number }[];
}

/**
 * License violation
 */
export interface LicenseViolation {
  package: string;
  version: string;
  license: SPDXLicenseID;
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  autoFix?: string;
  documentation?: string;
}

/**
 * License warning
 */
export interface LicenseWarning {
  package: string;
  version: string;
  issue: string;
  details?: string;
}

/**
 * Recommendation for license compliance
 */
export interface Recommendation {
  type: 'upgrade' | 'replace' | 'negotiate' | 'document';
  package?: string;
  currentLicense?: SPDXLicenseID;
  suggestedLicense?: SPDXLicenseID;
  suggestedReplacement?: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  effort?: 'low' | 'medium' | 'high';
}

/**
 * Compliance summary
 */
export interface ComplianceSummary {
  compliant: boolean;
  score: number;
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  totalIssues: number;
  errors: number;
  warnings: number;
  infoMessages: number;
}

/**
 * Report metadata
 */
export interface ReportMetadata {
  toolVersion: string;
  nodeVersion: string;
  platform: string;
  scanDuration: number;
  filesScanned: string[];
}

/**
 * Dependency resolution strategy
 */
export interface ResolutionStrategy {
  name: string;
  description: string;
  prefer: 'license-compatibility' | 'newest' | 'newest-compatible';
}

/**
 * Negotiation offer for license compatibility
 */
export interface NegotiationOffer {
  fromLicense: SPDXLicenseID;
  toLicense: SPDXLicenseID;
  rationale: string;
  obligations: string[];
  restrictions: string[];
  compatibilityNotes: string;
}

/**
 * CI/CD configuration for policy gates
 */
export interface CIGateConfig {
  enabled: boolean;
  failOnErrors: boolean;
  failOnWarnings: boolean;
  allowWarnings: boolean;
  outputFormat: 'json' | 'html' | 'markdown' | 'table';
  outputPath: string;
  summaryInPR: boolean;
  requireApproval: boolean;
}

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'html' | 'markdown' | 'csv' | 'xml' | 'spdx-json' | 'spdx-tag-value';

/**
 * Scan options
 */
export interface ScanOptions {
  includeDev: boolean;
  includeOptional: boolean;
  includeBundled: boolean;
  maxDepth?: number;
  production: boolean;
  lockfileOnly: boolean;
  registries?: string[];
  customRules?: PolicyRule[];
}

/**
 * Copyright header information
 */
export interface CopyrightHeader {
  file: string;
  hasHeader: boolean;
  detectedPattern?: string;
  year?: number;
  holder?: string;
  valid: boolean;
}

/**
 * Tree visualization options
 */
export interface TreeOptions {
  colorize: boolean;
  showVersions: boolean;
  showLicenses: boolean;
  showDev: boolean;
  showOptional: boolean;
  maxDepth: number;
  filter?: (node: DependencyNode) => boolean;
  licenseColors?: Map<LicenseCategory, string>;
}
