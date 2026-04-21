/**
 * Compliance Report Generator
 * 
 * Generates compliance reports in multiple formats (JSON, HTML, Markdown, CSV)
 * for audit trails and CI/CD integration.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { 
  ComplianceReport, 
  ExportFormat, 
  LicenseViolation,
  LicenseWarning,
  LicenseDistribution,
  SPDXLicenseID
} from './types';

/**
 * Report formatting options
 */
interface ReportOptions {
  includeTimestamp?: boolean;
  includeSummary?: boolean;
  includeViolations?: boolean;
  includeWarnings?: boolean;
  includeRecommendations?: boolean;
  includeLicenseDistribution?: boolean;
  theme?: 'light' | 'dark';
  companyName?: string;
  projectName?: string;
}

/**
 * Compliance Report Generator
 */
export class ReportGenerator {
  /**
   * Generate report in specified format
   */
  static async generate(
    report: ComplianceReport,
    format: ExportFormat,
    outputPath: string,
    options?: ReportOptions
  ): Promise<void> {
    let content: string;

    switch (format) {
      case 'json':
        content = this.generateJSON(report);
        break;
      case 'html':
        content = this.generateHTML(report, options);
        break;
      case 'markdown':
        content = this.generateMarkdown(report, options);
        break;
      case 'csv':
        content = this.generateCSV(report);
        break;
      case 'xml':
        content = this.generateXML(report);
        break;
      case 'spdx-json':
        content = this.generateSPDXJSON(report);
        break;
      case 'spdx-tag-value':
        content = this.generateSPDXTagValue(report);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, content, 'utf-8');
  }

  /**
   * Generate string in specified format (without file write)
   */
  static generateString(
    report: ComplianceReport,
    format: ExportFormat,
    options?: ReportOptions
  ): string {
    switch (format) {
      case 'json':
        return this.generateJSON(report);
      case 'html':
        return this.generateHTML(report, options);
      case 'markdown':
        return this.generateMarkdown(report, options);
      case 'csv':
        return this.generateCSV(report);
      case 'xml':
        return this.generateXML(report);
      case 'spdx-json':
        return this.generateSPDXJSON(report);
      case 'spdx-tag-value':
        return this.generateSPDXTagValue(report);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Generate JSON report
   */
  private static generateJSON(report: ComplianceReport): string {
    const reportData = {
      ...report,
      licensesFound: {
        byLicense: Object.fromEntries(report.licensesFound.byLicense),
        byCategory: Object.fromEntries(report.licensesFound.byCategory),
        uniqueLicenses: report.licensesFound.uniqueLicenses,
        mostCommon: report.licensesFound.mostCommon
      }
    };
    return JSON.stringify(reportData, null, 2);
  }

  /**
   * Generate HTML report
   */
  private static generateHTML(report: ComplianceReport, options?: ReportOptions): string {
    const theme = options?.theme || 'light';
    const themeStyles = theme === 'dark' ? this.getDarkTheme() : this.getLightTheme();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LicenseGuard Compliance Report - ${report.projectName}</title>
    <style>
        ${themeStyles}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🔒 LicenseGuard Compliance Report</h1>
            <div class="subtitle">${report.projectName} v${report.projectVersion}</div>
            <div class="meta">Generated: ${report.generatedAt.toISOString()}</div>
        </header>

        <section class="summary">
            <h2>Executive Summary</h2>
            <div class="score-card ${report.summary.compliant ? 'compliant' : 'non-compliant'}">
                <div class="score">${report.summary.score}</div>
                <div class="label">Compliance Score</div>
            </div>
            <div class="stats">
                <div class="stat">
                    <span class="value">${report.totalDependencies}</span>
                    <span class="label">Total Dependencies</span>
                </div>
                <div class="stat">
                    <span class="value ${report.summary.errors > 0 ? 'error' : ''}">${report.summary.errors}</span>
                    <span class="label">Errors</span>
                </div>
                <div class="stat">
                    <span class="value ${report.summary.warnings > 0 ? 'warning' : ''}">${report.summary.warnings}</span>
                    <span class="label">Warnings</span>
                </div>
                <div class="stat">
                    <span class="value risk-${report.summary.riskLevel}">${report.summary.riskLevel.toUpperCase()}</span>
                    <span class="label">Risk Level</span>
                </div>
            </div>
        </section>

        ${report.violations.length > 0 ? `
        <section class="violations">
            <h2>🚨 Violations (${report.violations.length})</h2>
            <table>
                <thead>
                    <tr>
                        <th>Package</th>
                        <th>License</th>
                        <th>Severity</th>
                        <th>Message</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.violations.map(v => `
                    <tr class="${v.severity}">
                        <td>${v.package}${v.version !== 'unknown' ? `@${v.version}` : ''}</td>
                        <td><code>${v.license}</code></td>
                        <td><span class="badge ${v.severity}">${v.severity.toUpperCase()}</span></td>
                        <td>${v.message}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </section>
        ` : '<p class="no-issues">✅ No violations found!</p>'}

        ${report.warnings.length > 0 ? `
        <section class="warnings">
            <h2>⚠️ Warnings (${report.warnings.length})</h2>
            <ul>
                ${report.warnings.map(w => `
                <li>
                    <strong>${w.package}${w.version !== 'unknown' ? `@${w.version}` : ''}</strong>: 
                    ${w.issue}${w.details ? ` - ${w.details}` : ''}
                </li>
                `).join('')}
            </ul>
        </section>
        ` : ''}

        <section class="licenses">
            <h2>📊 License Distribution</h2>
            <div class="license-grid">
                ${report.licensesFound.mostCommon.slice(0, 10).map(l => `
                <div class="license-item">
                    <span class="license-name">${l.license}</span>
                    <span class="license-count">${l.count}</span>
                </div>
                `).join('')}
            </div>
        </section>

        ${report.recommendations.length > 0 ? `
        <section class="recommendations">
            <h2>💡 Recommendations</h2>
            <ul>
                ${report.recommendations.map(r => `
                <li class="priority-${r.priority}">
                    <strong>[${r.priority.toUpperCase()}]</strong> ${r.reason}
                    ${r.suggestedReplacement ? ` Consider: ${r.suggestedReplacement}` : ''}
                </li>
                `).join('')}
            </ul>
        </section>
        ` : ''}

        <footer>
            <p>Generated by LicenseGuard v${report.metadata.toolVersion}</p>
            <p>Scan Duration: ${report.metadata.scanDuration}ms | Platform: ${report.metadata.platform}</p>
        </footer>
    </div>
</body>
</html>`;
  }

  /**
   * Generate Markdown report
   */
  private static generateMarkdown(report: ComplianceReport, options?: ReportOptions): string {
    return `# 🔒 LicenseGuard Compliance Report

## ${report.projectName} v${report.projectVersion}

**Generated:** ${report.generatedAt.toISOString()}  
**Policy:** ${report.policy}

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Compliance Score** | ${report.summary.score}/100 |
| **Risk Level** | ${report.summary.riskLevel.toUpperCase()} |
| **Total Dependencies** | ${report.totalDependencies} |
| **Direct Dependencies** | ${report.directDependencies} |
| **Transitive Dependencies** | ${report.transitiveDependencies} |
| **Errors** | ${report.summary.errors} |
| **Warnings** | ${report.summary.warnings} |

**Status:** ${report.summary.compliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}

---

## Violations

${report.violations.length === 0 ? '✅ No violations found!' : report.violations.map(v => `
### ${v.package}${v.version !== 'unknown' ? ` @${v.version}` : ''}

- **License:** \`${v.license}\`
- **Severity:** ${v.severity.toUpperCase()}
- **Message:** ${v.message}
- **Rule:** \`${v.rule}\`
${v.autoFix ? `- **Suggested Fix:** ${v.autoFix}` : ''}
${v.documentation ? `- **Reference:** ${v.documentation}` : ''}
`).join('\n')}

---

## Warnings

${report.warnings.length === 0 ? 'No warnings.' : report.warnings.map(w => `
- **${w.package}${w.version !== 'unknown' ? ` @${w.version}` : ''}**: ${w.issue}${w.details ? `\n  - ${w.details}` : ''}
`).join('\n')}

---

## License Distribution

| License | Count |
|---------|-------|
${report.licensesFound.mostCommon.map(l => `| ${l.license} | ${l.count} |`).join('\n')}

**Total Unique Licenses:** ${report.licensesFound.uniqueLicenses.length}

---

## Recommendations

${report.recommendations.length === 0 ? 'No recommendations.' : report.recommendations.map(r => `
### [${r.priority.toUpperCase()}] ${r.package ? `For ${r.package}` : 'General'}

${r.reason}
${r.suggestedReplacement ? `**Suggested Replacement:** ${r.suggestedReplacement}` : ''}
${r.currentLicense ? `**Current License:** \`${r.currentLicense}\`` : ''}
${r.suggestedLicense ? `**Suggested License:** \`${r.suggestedLicense}\`` : ''}
${r.effort ? `**Effort:** ${r.effort}` : ''}
`).join('\n---\n')}

---

## Metadata

- **Tool Version:** ${report.metadata.toolVersion}
- **Node Version:** ${report.metadata.nodeVersion}
- **Platform:** ${report.metadata.platform}
- **Scan Duration:** ${report.metadata.scanDuration}ms
- **Files Scanned:** ${report.metadata.filesScanned.length}

---
*Generated by [LicenseGuard](https://github.com/moggan1337/LicenseGuard)*
`;
  }

  /**
   * Generate CSV report
   */
  private static generateCSV(report: ComplianceReport): string {
    const rows: string[] = [
      'Package,Version,License,Category,Severity,Rule,Message,AutoFix,Documentation'
    ];

    for (const violation of report.violations) {
      rows.push([
        `"${violation.package}"`,
        `"${violation.version}"`,
        `"${violation.license}"`,
        `""`,
        `"${violation.severity}"`,
        `"${violation.rule}"`,
        `"${violation.message.replace(/"/g, '""')}"`,
        `"${violation.autoFix || ''}"`,
        `"${violation.documentation || ''}"`
      ].join(','));
    }

    return rows.join('\n');
  }

  /**
   * Generate XML report
   */
  private static generateXML(report: ComplianceReport): string {
    const licensesJson = JSON.stringify({
      byLicense: Object.fromEntries(report.licensesFound.byLicense),
      byCategory: Object.fromEntries(report.licensesFound.byCategory)
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<ComplianceReport>
    <metadata>
        <generatedAt>${report.generatedAt.toISOString()}</generatedAt>
        <projectName>${report.projectName}</projectName>
        <projectVersion>${report.projectVersion}</projectVersion>
        <policy>${report.policy}</policy>
        <toolVersion>${report.metadata.toolVersion}</toolVersion>
    </metadata>
    <summary>
        <compliant>${report.summary.compliant}</compliant>
        <score>${report.summary.score}</score>
        <riskLevel>${report.summary.riskLevel}</riskLevel>
        <totalIssues>${report.summary.totalIssues}</totalIssues>
        <errors>${report.summary.errors}</errors>
        <warnings>${report.summary.warnings}</warnings>
    </summary>
    <statistics>
        <totalDependencies>${report.totalDependencies}</totalDependencies>
        <directDependencies>${report.directDependencies}</directDependencies>
        <transitiveDependencies>${report.transitiveDependencies}</transitiveDependencies>
    </statistics>
    <violations>
        ${report.violations.map(v => `
        <violation severity="${v.severity}">
            <package>${v.package}</package>
            <version>${v.version}</version>
            <license>${v.license}</license>
            <rule>${v.rule}</rule>
            <message>${v.message}</message>
        </violation>`).join('')}
    </violations>
    <warnings>
        ${report.warnings.map(w => `
        <warning>
            <package>${w.package}</package>
            <version>${w.version}</version>
            <issue>${w.issue}</issue>
            <details>${w.details || ''}</details>
        </warning>`).join('')}
    </warnings>
    <licenses>
        ${report.licensesFound.mostCommon.map(l => `
        <license spdxId="${l.license}" count="${l.count}"/>`).join('')}
    </licenses>
</ComplianceReport>`;
  }

  /**
   * Generate SPDX RDF/JSON format
   */
  private static generateSPDXJSON(report: ComplianceReport): string {
    const packages = report.violations.map(v => ({
      name: v.package,
      versionInfo: v.version,
      licenseConcluded: v.license,
      licenseDeclared: v.license,
      copyrightText: `NOASSERTION`,
      externalRef: `PACKAGE-MANAGER purl: npm/${v.package}@${v.version}`
    }));

    return JSON.stringify({
      spdxVersion: "SPDX-2.3",
      dataLicense: "CC0-1.0",
      SPDXID: "SPDXRef-DOCUMENT",
      name: `LicenseGuard-Report-${report.projectName}-${Date.now()}`,
      documentNamespace: `https://licenseguard.app/reports/${report.projectName}/${Date.now()}`,
      creationInfo: {
        created: new Date().toISOString(),
        creators: [`Tool: LicenseGuard-${report.metadata.toolVersion}`]
      },
      packages: packages,
      extractedLicensingInfo: Object.fromEntries(
        report.licensesFound.uniqueLicenses.map(id => [id, { licenseId: id }])
      )
    }, null, 2);
  }

  /**
   * Generate SPDX tag-value format
   */
  private static generateSPDXTagValue(report: ComplianceReport): string {
    const lines: string[] = [
      'SPDXVersion: SPDX-2.3',
      'DataLicense: CC0-1.0',
      `SPDXID: SPDXRef-DOCUMENT`,
      `DocumentName: LicenseGuard-Report-${report.projectName}`,
      `DocumentNamespace: https://licenseguard.app/reports/${report.projectName}/${Date.now()}`,
      '',
      'Creator: Tool: LicenseGuard',
      `Created: ${new Date().toISOString()}`,
      ''
    ];

    report.violations.forEach((v, i) => {
      lines.push(`PackageName: ${v.package}`);
      lines.push(`SPDXID: SPDXRef-Package${i + 1}`);
      lines.push(`PackageVersion: ${v.version}`);
      lines.push(`PackageLicenseConcluded: ${v.license}`);
      lines.push(`PackageLicenseDeclared: ${v.license}`);
      lines.push(`PackageCopyrightText: NOASSERTION`);
      lines.push('');
    });

    return lines.join('\n');
  }

  /**
   * Get light theme CSS
   */
  private static getLightTheme(): string {
    return `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        h1 { font-size: 2em; margin-bottom: 10px; }
        .subtitle { font-size: 1.2em; opacity: 0.9; }
        .meta { font-size: 0.9em; opacity: 0.7; margin-top: 10px; }
        h2 { color: #333; margin: 30px 0 15px; padding-bottom: 10px; border-bottom: 2px solid #667eea; }
        section { background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .score-card { display: inline-block; text-align: center; padding: 20px 40px; border-radius: 10px; margin: 10px; }
        .score-card.compliant { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; }
        .score-card.non-compliant { background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%); color: white; }
        .score { font-size: 3em; font-weight: bold; }
        .label { font-size: 0.9em; opacity: 0.9; }
        .stats { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 20px; }
        .stat { background: #f8f9fa; padding: 15px 25px; border-radius: 8px; text-align: center; flex: 1; min-width: 120px; }
        .stat .value { display: block; font-size: 1.8em; font-weight: bold; color: #333; }
        .stat .value.error { color: #dc3545; }
        .stat .value.warning { color: #ffc107; }
        .stat .label { font-size: 0.85em; color: #666; }
        .risk-critical { color: #dc3545; }
        .risk-high { color: #fd7e14; }
        .risk-medium { color: #ffc107; }
        .risk-low { color: #28a745; }
        .risk-none { color: #6c757d; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f8f9fa; font-weight: 600; }
        tr:hover { background: #f8f9fa; }
        .badge { padding: 4px 10px; border-radius: 20px; font-size: 0.8em; font-weight: bold; }
        .badge.error { background: #dc3545; color: white; }
        .badge.warning { background: #ffc107; color: #333; }
        .badge.info { background: #17a2b8; color: white; }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
        .no-issues { color: #28a745; font-size: 1.1em; padding: 20px; text-align: center; background: #d4edda; border-radius: 8px; }
        .license-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
        .license-item { background: #f8f9fa; padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
        .license-name { font-weight: 600; }
        .license-count { background: #667eea; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.9em; }
        footer { text-align: center; color: #666; font-size: 0.9em; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
    `;
  }

  /**
   * Get dark theme CSS
   */
  private static getDarkTheme(): string {
    return `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #e0e0e0; background: #1a1a2e; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        header { background: linear-gradient(135deg, #434343 0%, #000000 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        h1 { font-size: 2em; margin-bottom: 10px; }
        h2 { color: #e0e0e0; margin: 30px 0 15px; padding-bottom: 10px; border-bottom: 2px solid #667eea; }
        section { background: #16213e; padding: 25px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
        .subtitle, .meta { opacity: 0.8; }
        .stat { background: #1a1a2e; }
        .stat .value, .stat .label { color: #e0e0e0; }
        th, td { border-bottom: 1px solid #2d3748; }
        th { background: #1a1a2e; }
        code { background: #2d3748; }
        tr:hover { background: #1f2937; }
        .license-item { background: #1a1a2e; }
        footer { border-top-color: #2d3748; color: #888; }
    `;
  }
}
