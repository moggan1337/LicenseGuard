#!/usr/bin/env node

/**
 * LicenseGuard CLI
 * 
 * Command-line interface for license compliance scanning,
 * policy enforcement, and compliance reporting.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs-extra';
import { DependencyTreeAnalyzer } from '../core/dependency-tree';
import { PolicyEngine } from '../core/policy-engine';
import { ReportGenerator } from '../core/reporter';
import { CopyrightEnforcer } from '../core/copyright-enforcer';
import { LicenseNegotiator } from '../core/negotiator';
import { ConflictResolver } from '../core/conflict-resolver';
import { GPLDetector } from '../core/gpl-detector';
import { LicenseDetector, SPDX_DATABASE } from '../core/license-detector';
import { ComplianceReport, ExportFormat, SPDXLicenseID, CIGateConfig } from '../core/types';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const program = new Command();

// Colors for CLI output
const colors = {
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.cyan,
  header: chalk.bold.cyan,
  muted: chalk.gray
};

/**
 * Initialize the CLI
 */
function init() {
  program
    .name('licenseguard')
    .description('Enterprise-grade dependency license compliance scanner')
    .version('1.0.0')
    .option('-v, --verbose', 'Enable verbose output')
    .option('-q, --quiet', 'Suppress non-essential output');
}

/**
 * Scan command - Scan dependencies for license compliance
 */
program
  .command('scan')
  .description('Scan project dependencies for license compliance')
  .option('-p, --project <path>', 'Project root path', process.cwd())
  .option('-o, --output <path>', 'Output file path')
  .option('-f, --format <format>', 'Output format (json|html|markdown|csv)', 'markdown')
  .option('--include-dev', 'Include dev dependencies', false)
  .option('--include-optional', 'Include optional dependencies', false)
  .option('--max-depth <number>', 'Maximum dependency depth', '10')
  .option('--policy <name>', 'Policy name to use', 'default')
  .option('--project-license <license>', 'Project license (MIT|Apache-2.0|GPL-3.0|...)', 'MIT')
  .option('--network-service', 'Mark project as network service (triggers AGPL rules)', false)
  .option('--fail-on-errors', 'Exit with error code on policy violations', false)
  .action(async (options) => {
    const startTime = Date.now();
    
    try {
      console.log(colors.header('\n🔒 LicenseGuard - License Compliance Scanner\n'));
      console.log(colors.muted(`Scanning: ${options.project}`));
      console.log(colors.muted(`Policy: ${options.policy}`));
      console.log(colors.muted(`Project License: ${options.projectLicense}\n`));

      // Analyze dependency tree
      const analyzer = new DependencyTreeAnalyzer(options.project);
      const dependencies = await analyzer.buildFullTree({
        includeDev: options.includeDev,
        includeOptional: options.includeOptional,
        maxDepth: parseInt(options.maxDepth)
      });

      console.log(colors.success(`✓ Found ${dependencies.length} direct dependencies`));

      // Evaluate against policy
      const policyEngine = new PolicyEngine(
        undefined,
        options.projectLicense as SPDXLicenseID,
        options.networkService
      );
      
      const { violations, warnings, recommendations, summary } = policyEngine.evaluate(dependencies);

      // Generate report
      const metadata = {
        toolVersion: '1.0.0',
        nodeVersion: process.version,
        platform: process.platform,
        scanDuration: Date.now() - startTime,
        filesScanned: ['package-lock.json']
      };

      const report: ComplianceReport = {
        generatedAt: new Date(),
        scannedAt: new Date(startTime),
        projectName: path.basename(options.project),
        projectVersion: '1.0.0',
        totalDependencies: dependencies.length,
        directDependencies: dependencies.length,
        transitiveDependencies: 0,
        licensesFound: {
          byLicense: new Map(),
          byCategory: new Map(),
          uniqueLicenses: [],
          mostCommon: []
        },
        violations,
        warnings,
        recommendations,
        policy: options.policy,
        summary,
        metadata
      };

      // Print summary
      printSummary(report);

      // Generate output
      if (options.output) {
        await ReportGenerator.generate(report, options.format as ExportFormat, options.output);
        console.log(colors.success(`\n✓ Report saved to: ${options.output}`));
      }

      // Exit with error code if requested
      if (options.failOnErrors && report.summary.errors > 0) {
        process.exit(1);
      }

    } catch (error) {
      console.error(colors.error(`\n✗ Error: ${error.message}`));
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

/**
 * Tree command - Display dependency tree with licenses
 */
program
  .command('tree')
  .description('Display dependency tree with license information')
  .option('-p, --project <path>', 'Project root path', process.cwd())
  .option('--show-versions', 'Show package versions', true)
  .option('--show-licenses', 'Show license identifiers', true)
  .option('--max-depth <number>', 'Maximum display depth', '3')
  .option('--filter-license <license>', 'Filter by license')
  .option('--filter-category <category>', 'Filter by category')
  .action(async (options) => {
    try {
      console.log(colors.header('\n🌳 LicenseGuard - Dependency Tree\n'));

      const analyzer = new DependencyTreeAnalyzer(options.project);
      const dependencies = await analyzer.buildFullTree({ maxDepth: parseInt(options.maxDepth) });

      // Apply filters
      let filtered = dependencies;
      if (options.filterLicense) {
        filtered = await analyzer.findByLicense(options.filterLicense as SPDXLicenseID);
      }
      if (options.filterCategory) {
        filtered = await analyzer.findByCategory(options.filterCategory);
      }

      const tree = analyzer.generateTreeVisualization(filtered, {
        showVersions: options.showVersions,
        showLicenses: options.showLicenses,
        maxDepth: parseInt(options.maxDepth)
      });

      console.log(tree);
      console.log(colors.muted(`\nTotal packages shown: ${filtered.length}`));

    } catch (error) {
      console.error(colors.error(`\n✗ Error: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Check command - Check specific package license
 */
program
  .command('check <package>')
  .description('Check license information for a specific package')
  .option('-r, --registry <url>', 'npm registry URL')
  .action(async (packageName, options) => {
    try {
      console.log(colors.header(`\n📦 Checking: ${packageName}\n`));

      // For now, just show database info if it exists
      const licenseId = Object.keys(SPDX_DATABASE).find(
        id => id.toLowerCase() === packageName.toLowerCase()
      ) as SPDXLicenseID;

      if (licenseId && SPDX_DATABASE[licenseId]) {
        const info = SPDX_DATABASE[licenseId];
        console.log(colors.success(`License: ${info.name}`));
        console.log(`SPDX ID: ${info.spdxId}`);
        console.log(`Category: ${info.category}`);
        console.log(`OSI Approved: ${info.osiApproved ? 'Yes' : 'No'}`);
        console.log(`Deprecated: ${info.isDeprecated ? 'Yes' : 'No'}`);
        if (info.permissions?.length) {
          console.log(`\nPermissions:`);
          info.permissions.forEach(p => console.log(`  • ${p}`));
        }
        if (info.conditions?.length) {
          console.log(`\nConditions:`);
          info.conditions.forEach(c => console.log(`  • ${c}`));
        }
        if (info.limitations?.length) {
          console.log(`\nLimitations:`);
          info.limitations.forEach(l => console.log(`  • ${l}`));
        }
      } else {
        console.log(colors.warning(`License "${packageName}" not found in SPDX database.`));
        console.log(colors.muted(`Use 'licenseguard licenses' to see all supported licenses.`));
      }

    } catch (error) {
      console.error(colors.error(`\n✗ Error: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Licenses command - List all supported licenses
 */
program
  .command('licenses')
  .description('List all supported SPDX licenses')
  .option('-c, --category <category>', 'Filter by category')
  .option('--osi-only', 'Show only OSI approved licenses')
  .action(async (options) => {
    try {
      console.log(colors.header('\n📜 Supported SPDX Licenses\n'));

      let licenses = Object.entries(SPDX_DATABASE) as [SPDXLicenseID, typeof SPDX_DATABASE['MIT']][];

      if (options.category) {
        licenses = licenses.filter(([, info]) => info.category === options.category);
      }

      if (options.osiOnly) {
        licenses = licenses.filter(([, info]) => info.osiApproved);
      }

      // Group by category
      const grouped: Record<string, [SPDXLicenseID, typeof SPDX_DATABASE['MIT']][]> = {};
      for (const [id, info] of licenses) {
        if (!grouped[info.category]) {
          grouped[info.category] = [];
        }
        grouped[info.category].push([id, info]);
      }

      for (const [category, items] of Object.entries(grouped)) {
        console.log(colors.header(`\n${category.toUpperCase()}`));
        console.log(colors.muted('─'.repeat(50)));
        for (const [id, info] of items) {
          const osi = info.osiApproved ? '✓' : ' ';
          const deprecated = info.isDeprecated ? '⚠' : ' ';
          console.log(`  [${id}] ${osi}${deprecated} ${info.name}`);
        }
      }

      console.log(colors.muted(`\n\nTotal: ${licenses.length} licenses`));
      console.log(colors.muted('✓ = OSI Approved, ⚠ = Deprecated'));

    } catch (error) {
      console.error(colors.error(`\n✗ Error: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Conflict command - Check for license conflicts
 */
program
  .command('conflict')
  .description('Check for license conflicts in dependencies')
  .option('-p, --project <path>', 'Project root path', process.cwd())
  .option('--project-license <license>', 'Project license', 'MIT')
  .action(async (options) => {
    try {
      console.log(colors.header('\n⚡ License Conflict Analysis\n'));

      const analyzer = new DependencyTreeAnalyzer(options.project);
      const dependencies = await analyzer.buildFullTree();

      const conflicts = ConflictResolver.detectConflicts(
        dependencies,
        options.projectLicense as SPDXLicenseID
      );

      if (conflicts.length === 0) {
        console.log(colors.success('✓ No license conflicts detected!'));
      } else {
        console.log(colors.warning(`Found ${conflicts.length} conflicts:\n`));
        for (const conflict of conflicts) {
          const severityIcon = conflict.severity === 'error' ? '🔴' : 
                             conflict.severity === 'warning' ? '🟡' : '🔵';
          console.log(`${severityIcon} ${colors.bold(conflict.source)} ↔ ${colors.bold(conflict.target)}`);
          console.log(`   Reason: ${conflict.reason}\n`);
        }
      }

    } catch (error) {
      console.error(colors.error(`\n✗ Error: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * GPL command - Check for GPL/AGPL violations
 */
program
  .command('gpl')
  .description('Check for GPL/AGPL license violations')
  .option('-p, --project <path>', 'Project root path', process.cwd())
  .option('--project-license <license>', 'Project license', 'MIT')
  .option('--network-service', 'Mark as network service')
  .action(async (options) => {
    try {
      console.log(colors.header('\n📋 GPL/AGPL Violation Check\n'));

      const analyzer = new DependencyTreeAnalyzer(options.project);
      const dependencies = await analyzer.buildFullTree();

      const violations = GPLDetector.detectViolations(
        dependencies,
        options.projectLicense as SPDXLicenseID,
        options.networkService
      );

      const riskScore = GPLDetector.calculateRiskScore(dependencies, options.networkService);

      console.log(`Risk Score: ${riskScore}/100`);
      console.log(colors.muted(`Risk Level: ${riskScore >= 70 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW'}\n`));

      if (violations.length === 0 || !violations.some(v => v.hasViolation)) {
        console.log(colors.success('✓ No GPL/AGPL violations detected!'));
      } else {
        for (const violation of violations.filter(v => v.hasViolation)) {
          console.log(colors.error(`\n🔴 ${violation.violationType?.toUpperCase()}`));
          console.log(`Packages: ${violation.sourcePackages.join(', ')}`);
          console.log(`Description: ${violation.description}`);
          console.log(`Remediation: ${violation.remediation}`);
          if (violation.legalReference) {
            console.log(colors.muted(`Legal Reference: ${violation.legalReference}`));
          }
        }
      }

      // Show recommendations
      const recommendations = GPLDetector.generateRecommendations(dependencies, options.projectLicense as SPDXLicenseID);
      if (recommendations.length > 0) {
        console.log(colors.header('\n💡 Recommendations:'));
        for (const rec of recommendations) {
          console.log(`\n[${rec.priority.toUpperCase()}] ${rec.recommendation}`);
        }
      }

    } catch (error) {
      console.error(colors.error(`\n✗ Error: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Copyright command - Check copyright headers
 */
program
  .command('copyright')
  .description('Check copyright headers in source files')
  .option('-p, --path <path>', 'Directory or file path', process.cwd())
  .option('-r, --recursive', 'Scan recursively', true)
  .option('--fix', 'Automatically fix missing headers')
  .option('--year <year>', 'Copyright year', new Date().getFullYear().toString())
  .option('--holder <name>', 'Copyright holder name')
  .option('--license <license>', 'License to use for headers', 'MIT')
  .action(async (options) => {
    try {
      console.log(colors.header('\n©️ Copyright Header Check\n'));

      const headers = await CopyrightEnforcer.scanDirectory(options.path, {
        recursive: options.recursive
      });

      const valid = headers.filter(h => h.valid).length;
      const missing = headers.filter(h => !h.valid).length;
      const total = headers.length;

      console.log(`Total files: ${total}`);
      console.log(colors.success(`Valid: ${valid}`));
      console.log(colors.warning(`Missing/Invalid: ${missing}`));

      if (missing > 0) {
        console.log(colors.header('\nFiles with issues:'));
        for (const header of headers.filter(h => !h.valid)) {
          console.log(`  ${header.file}`);
          if (header.detectedPattern) {
            console.log(colors.muted(`    Pattern: ${header.detectedPattern.substring(0, 50)}...`));
          }
        }
      }

      if (options.fix && options.holder) {
        console.log(colors.header('\n🔧 Auto-fixing headers...'));
        const fixable = headers.filter(h => !h.valid && !h.hasHeader);
        for (const header of fixable) {
          await CopyrightEnforcer.addHeaderToFile(
            header.file,
            parseInt(options.year),
            options.holder,
            options.license
          );
        }
        console.log(colors.success(`Fixed ${fixable.length} files`));
      }

    } catch (error) {
      console.error(colors.error(`\n✗ Error: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Stats command - Show dependency statistics
 */
program
  .command('stats')
  .description('Show dependency statistics')
  .option('-p, --project <path>', 'Project root path', process.cwd())
  .option('--include-dev', 'Include dev dependencies', false)
  .action(async (options) => {
    try {
      console.log(colors.header('\n📊 Dependency Statistics\n'));

      const analyzer = new DependencyTreeAnalyzer(options.project);
      const stats = await analyzer.calculateStatistics({
        includeDev: options.includeDev
      });

      console.log(colors.bold('Dependency Counts:'));
      console.log(`  Total: ${stats.totalDependencies}`);
      console.log(`  Direct: ${stats.directDependencies}`);
      console.log(`  Transitive: ${stats.transitiveDependencies}`);
      console.log(`  Max Depth: ${stats.maxDepth}`);

      console.log(colors.bold('\nLicense Distribution:'));
      const sorted = Object.entries(stats.licenseDistribution)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);
      
      for (const [license, count] of sorted) {
        const bar = '█'.repeat(Math.ceil(count / stats.totalDependencies * 30));
        console.log(`  ${license.padEnd(20)} ${count.toString().padStart(4)} ${bar}`);
      }

      console.log(colors.bold('\nCategory Distribution:'));
      for (const [category, count] of Object.entries(stats.categoryDistribution)) {
        console.log(`  ${category.padEnd(20)} ${count}`);
      }

    } catch (error) {
      console.error(colors.error(`\n✗ Error: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Negotiation command - Generate negotiation documents
 */
program
  .command('negotiate')
  .description('Generate license negotiation documents')
  .option('-f, --from <license>', 'Current license')
  .option('-t, --to <license>', 'Target license')
  .option('-p, --package <name>', 'Package name')
  .option('--output <path>', 'Output file path')
  .action(async (options) => {
    try {
      if (!options.from || !options.to) {
        console.error(colors.error('Both --from and --to licenses are required'));
        process.exit(1);
      }

      console.log(colors.header('\n🤝 License Negotiation\n'));

      const outcome = LicenseNegotiator.negotiate(
        options.from as SPDXLicenseID,
        options.to as SPDXLicenseID
      );

      console.log(`Strategy: ${outcome.strategy}`);
      console.log(`Success: ${outcome.success ? 'Yes' : 'No'}`);

      if (outcome.actions.length > 0) {
        console.log(colors.header('\nRecommended Actions:'));
        for (const action of outcome.actions) {
          const priorityIcon = action.priority === 'required' ? '🔴' : 
                              action.priority === 'recommended' ? '🟡' : '🔵';
          console.log(`  ${priorityIcon} [${action.priority}] ${action.description}`);
        }
      }

      if (options.package) {
        const alternatives = LicenseNegotiator.findAlternatives(options.package, options.from as SPDXLicenseID);
        if (alternatives.length > 0) {
          console.log(colors.header('\nAlternative Packages:'));
          for (const alt of alternatives) {
            console.log(`  ${alt.name} (${alt.license}) - ${alt.compatibility}% compatible`);
            console.log(colors.muted(`    ${alt.npmUrl}`));
          }
        }
      }

      if (options.output) {
        const letter = LicenseNegotiator.generateNegotiationLetter(
          options.package || 'package',
          'maintainer',
          'our use case'
        );
        await fs.writeFile(options.output, letter);
        console.log(colors.success(`\nNegotiation letter saved to: ${options.output}`));
      }

    } catch (error) {
      console.error(colors.error(`\n✗ Error: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Print summary to console
 */
function printSummary(report: ComplianceReport): void {
  const { summary } = report;

  // Score
  const scoreColor = summary.score >= 80 ? colors.success : 
                     summary.score >= 60 ? colors.warning : colors.error;
  console.log(colors.header('┌─────────────────────────────────────────┐'));
  console.log(colors.header('│           COMPLIANCE SUMMARY            │'));
  console.log(colors.header('└─────────────────────────────────────────┘'));
  console.log(`\n  Compliance Score: ${scoreColor(summary.score.toString() + '/100')}`);
  console.log(`  Risk Level: ${summary.riskLevel === 'none' ? colors.success(summary.riskLevel.toUpperCase()) : colors.warning(summary.riskLevel.toUpperCase())}`);
  console.log(`  Status: ${summary.compliant ? colors.success('✓ COMPLIANT') : colors.error('✗ NON-COMPLIANT')}`);

  // Stats
  console.log(`\n  Dependencies: ${report.totalDependencies}`);
  console.log(`  Errors: ${summary.errors > 0 ? colors.error(summary.errors.toString()) : colors.success('0')}`);
  console.log(`  Warnings: ${summary.warnings > 0 ? colors.warning(summary.warnings.toString()) : colors.success('0')}`);

  // Violations
  if (report.violations.length > 0) {
    console.log(colors.header('\n  🔴 VIOLATIONS:'));
    for (const v of report.violations.slice(0, 5)) {
      console.log(`    • ${v.package}: ${v.message}`);
    }
    if (report.violations.length > 5) {
      console.log(colors.muted(`    ... and ${report.violations.length - 5} more`));
    }
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    console.log(colors.header('\n  💡 RECOMMENDATIONS:'));
    for (const r of report.recommendations.slice(0, 3)) {
      console.log(`    • ${r.reason}`);
    }
  }

  console.log('');
}

// Initialize and run
init();
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
