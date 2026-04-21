/**
 * CI/CD Integration
 * 
 * Provides integration capabilities for CI/CD pipelines including:
 * - GitHub Actions
 * - GitLab CI
 * - Jenkins
 * - Azure DevOps
 */

import { CIGateConfig, ComplianceReport, ExportFormat, SPDXLicenseID } from '../core/types';
import { DependencyTreeAnalyzer } from '../core/dependency-tree';
import { PolicyEngine } from '../core/policy-engine';
import { ReportGenerator } from '../core/reporter';

/**
 * Default CI gate configuration
 */
export const DEFAULT_CI_CONFIG: CIGateConfig = {
  enabled: true,
  failOnErrors: true,
  failOnWarnings: false,
  allowWarnings: true,
  outputFormat: 'json',
  outputPath: 'license-guard-report.json',
  summaryInPR: true,
  requireApproval: false
};

/**
 * GitHub Actions workflow generator
 */
export class GitHubActionsIntegration {
  /**
   * Generate GitHub Actions workflow file
   */
  static generateWorkflow(config?: Partial<CIGateConfig>): string {
    const cfg = { ...DEFAULT_CI_CONFIG, ...config };

    return `# LicenseGuard CI/CD Pipeline
# This workflow runs license compliance checks on every push and pull request

name: License Compliance

on:
  push:
    branches: [ main, develop, master ]
  pull_request:
    branches: [ main, develop, master ]
  schedule:
    - cron: '0 0 * * 0'  # Weekly scan
  workflow_dispatch:  # Manual trigger

jobs:
  license-compliance:
    name: License Compliance Check
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run LicenseGuard scan
        id: license-scan
        run: |
          npx licenseguard scan \\
            --project "\${{ github.workspace }}" \\
            --output "\${{ github.workspace }}/license-report.json" \\
            --format json \\
            --fail-on-errors
        continue-on-error: \${{ ${!cfg.failOnErrors} }}
        
      - name: Upload compliance report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: license-compliance-report
          path: \${{ github.workspace }}/license-report.json
          retention-days: 30
          
      - name: Add PR comment with summary
        if: github.event_name == 'pull_request' && ${cfg.summaryInPR}
        uses: actions/github-script@v7
        with:
          script: |
            const report = require('./license-report.json');
            const fs = require('fs');
            
            let comment = '## 📋 License Compliance Report\\n\\n';
            comment += \`| Metric | Value |\\n|--------|-------|\\n\`;
            comment += \`| Compliance Score | \${report.summary.score}/100 |\\n\`;
            comment += \`| Risk Level | \${report.summary.riskLevel.toUpperCase()} |\\n\`;
            comment += \`| Errors | \${report.summary.errors} |\\n\`;
            comment += \`| Warnings | \${report.summary.warnings} |\\n\\n\`;
            
            if (report.summary.compliant) {
              comment += '✅ **Project is compliant**\\n';
            } else {
              comment += '❌ **Project has compliance issues**\\n';
            }
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });

      - name: Fail on critical violations
        if: ${cfg.failOnErrors} && failure()
        run: |
          echo "::error::License compliance check failed. Review the report for details."
          exit 1
`;}

  /**
   * Generate GitHub Actions configuration for specific platforms
   */
  static generateMatrixWorkflow(): string {
    return `# LicenseGuard Matrix Workflow
# Tests multiple Node.js versions across different platforms

name: License Compliance (Matrix)

on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  test:
    runs-on: \${{ matrix.os }}
    strategy:
      matrix:
        node-version: [18, 20, 22]
        os: [ubuntu-latest, windows-latest, macos-latest]
        
    steps:
      - uses: actions/checkout@v4
      
      - name: Use Node.js \${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run LicenseGuard
        run: npx licenseguard scan --fail-on-errors
`;
  }
}

/**
 * GitLab CI integration
 */
export class GitLabCIIntegration {
  /**
   * Generate GitLab CI configuration
   */
  static generateCIConfig(config?: Partial<CIGateConfig>): string {
    const cfg = { ...DEFAULT_CI_CONFIG, ...config };

    return `# LicenseGuard GitLab CI Configuration

license_compliance:
  stage: test
  image: node:20-alpine
  
  before_script:
    - npm ci
  
  script:
    - npx licenseguard scan --project . --output license-report.json --format json
    - cat license-report.json | jq '.summary'
  
  artifacts:
    when: always
    reports:
      junit: license-report.json
    paths:
      - license-report.json
    expire_in: 30 days
    
  rules:
    - if: $CI_MERGE_REQUEST_ID
    - if: $CI_COMMIT_BRANCH == "main"
    - if: $CI_COMMIT_BRANCH == "master"
    - if: $CI_PIPELINE_SOURCE == "schedule"
    
  ${cfg.failOnErrors ? 'allow_failure: false' : 'allow_failure: true'}
  
  ${cfg.failOnWarnings && !cfg.failOnErrors ? 'dependency_scanning: true' : ''}
`;
}

/**
 * Jenkins integration
 */
export class JenkinsIntegration {
  /**
   * Generate Jenkins declarative pipeline
   */
  static generatePipeline(config?: Partial<CIGateConfig>): string {
    const cfg = { ...DEFAULT_CI_CONFIG, ...config };

    return `// LicenseGuard Jenkins Pipeline
// Add this to your Jenkinsfile

pipeline {
    agent any
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '30'))
        timestamps()
    }
    
    stages {
        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }
        
        stage('License Compliance Check') {
            steps {
                script {
                    def report = sh(
                        returnStdout: true,
                        script: 'npx licenseguard scan --project . --output license-report.json --format json || true'
                    ).trim()
                    
                    // Parse and display summary
                    def reportJson = readJSON text: readFile('license-report.json')
                    echo "Compliance Score: \${reportJson.summary.score}/100"
                    echo "Risk Level: \${reportJson.summary.riskLevel}"
                    echo "Errors: \${reportJson.summary.errors}"
                    echo "Warnings: \${reportJson.summary.warnings}"
                    
                    // Fail if errors and configured to do so
                    if (${cfg.failOnErrors} && reportJson.summary.errors > 0) {
                        error("License compliance check failed with \${reportJson.summary.errors} errors")
                    }
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'license-report.json', allowEmptyArchive: true
                    junit 'license-report.json'
                }
            }
        }
    }
    
    post {
        failure {
            emailext(
                subject: "BUILD FAILURE: License Compliance Issue",
                body: "The build has failed due to license compliance issues. Please review the report.",
                to: "\${env.DEFAULT_RECIPIENTS}"
            )
        }
    }
}
`;
}

/**
 * Azure DevOps integration
 */
export class AzureDevOpsIntegration {
  /**
   * Generate Azure DevOps pipeline YAML
   */
  static generatePipeline(config?: Partial<CIGateConfig>): string {
    const cfg = { ...DEFAULT_CI_CONFIG, ...config };

    return `# LicenseGuard Azure DevOps Pipeline

trigger:
  branches:
    include:
      - main
      - master
      - develop
  paths:
    include:
      - package.json
      - package-lock.json

pr:
  branches:
    include:
      - main
      - develop

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: LicenseCompliance
    displayName: 'License Compliance Check'
    jobs:
      - job: LicenseScan
        displayName: 'LicenseGuard Scan'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'
            displayName: 'Install Node.js'
            
          - script: |
              npm ci
              npx licenseguard scan --project . --output $(Build.StagingDirectory)/license-report.json --format json
            displayName: 'Run LicenseGuard'
            continueOnError: \${{ ${!cfg.failOnErrors} }}
            
          - task: PublishBuildArtifacts@1
            inputs:
              pathtoPublish: '$(Build.StagingDirectory)/license-report.json'
              artifactName: 'license-report'
            condition: always()
            
          - task: PublishTestResults@2
            inputs:
              testResultsFormat: 'JUnit'
              testResultsFiles: '$(Build.StagingDirectory)/license-report.json'
            condition: always()
            
          - script: |
              echo "##vso[task.setvariable variable=COMPLIANCE_SCORE;isOutput=true]\$(cat license-report.json | jq -r '.summary.score')"
              echo "##vso[task.setvariable variable=RISK_LEVEL;isOutput=true]\$(cat license-report.json | jq -r '.summary.riskLevel')"
            name: 'ParseResults'
            displayName: 'Parse Results'
            
        outputs:
          COMPLIANCE_SCORE: $(ParseResults.COMPLIANCE_SCORE)
          RISK_LEVEL: $(ParseResults.RISK_LEVEL)
          
  - stage: GateCheck
    dependsOn: LicenseCompliance
    condition: succeeded()
    jobs:
      - job: ComplianceGate
        steps:
          - script: |
              SCORE=\$(LicenseCompliance.LicenseScan.COMPLIANCE_SCORE)
              RISK=\$(LicenseCompliance.LicenseScan.RISK_LEVEL)
              echo "Compliance Score: $SCORE"
              echo "Risk Level: $RISK"
              ${cfg.failOnErrors ? `
              if [ "$RISK" == "critical" ] || [ "$RISK" == "high" ]; then
                echo "##vso[task.logissue type=error]License compliance gate failed"
                exit 1
              fi` : ''}
            displayName: 'Evaluate Compliance Gate'
`;
  }

/**
 * Bitbucket Pipelines integration
 */
export class BitbucketIntegration {
  /**
   * Generate Bitbucket Pipelines configuration
   */
  static generateBitbucketYML(config?: Partial<CIGateConfig>): string {
    const cfg = { ...DEFAULT_CI_CONFIG, ...config };

    return `# LicenseGuard Bitbucket Pipelines Configuration

pipelines:
  pull-requests:
    '**':
      - step:
          name: License Compliance
          image: node:20-alpine
          caches:
            - npm
          script:
            - npm ci
            - npx licenseguard scan --project . --output license-report.json --format json
          artifacts:
            - license-report.json
          after-script:
            - pipe: atlassian/default-artefact:*
              variables:
                ARTIFACT: 'license-report.json'
                
  branches:
    main:
      - step:
          name: License Compliance
          image: node:20-alpine
          caches:
            - npm
          script:
            - npm ci
            - npx licenseguard scan --project . --output license-report.json --format json
          artifacts:
            - license-report.json
${cfg.failOnErrors ? `          script:
            - |
              if [ -f license-report.json ]; then
                ERRORS=\$(cat license-report.json | jq -r '.summary.errors')
                if [ "$ERRORS" -gt 0 ]; then
                  echo "License compliance check failed with $ERRORS errors"
                  exit 1
                fi
              fi` : ''}
`;
}

/**
 * CI Gate Runner - executes compliance check in CI environment
 */
export class CIGateRunner {
  private config: CIGateConfig;
  private projectPath: string;

  constructor(projectPath: string = process.cwd(), config?: Partial<CIGateConfig>) {
    this.projectPath = projectPath;
    this.config = { ...DEFAULT_CI_CONFIG, ...config };
  }

  /**
   * Run the compliance gate
   */
  async run(): Promise<{
    passed: boolean;
    report: ComplianceReport | null;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Analyze dependencies
      const analyzer = new DependencyTreeAnalyzer(this.projectPath);
      const dependencies = await analyzer.buildFullTree();

      // Evaluate policy
      const policyEngine = new PolicyEngine();
      const { violations, warnings, recommendations, summary } = policyEngine.evaluate(dependencies);

      // Generate report
      const report: ComplianceReport = {
        generatedAt: new Date(),
        scannedAt: new Date(),
        projectName: 'project',
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
        policy: 'ci-gate',
        summary,
        metadata: {
          toolVersion: '1.0.0',
          nodeVersion: process.version,
          platform: process.platform,
          scanDuration: 0,
          filesScanned: []
        }
      };

      // Check gate conditions
      let passed = true;

      if (this.config.failOnErrors && summary.errors > 0) {
        passed = false;
        errors.push(`Gate failed: ${summary.errors} error(s) found`);
      }

      if (this.config.failOnWarnings && summary.warnings > 0) {
        passed = false;
        errors.push(`Gate failed: ${summary.warnings} warning(s) found`);
      }

      // Output report
      if (this.config.outputPath) {
        await ReportGenerator.generate(
          report,
          this.config.outputFormat,
          this.config.outputPath
        );
      }

      // Output summary for PR
      if (this.config.summaryInPR) {
        this.outputPRSummary(report);
      }

      return { passed, report, errors };

    } catch (error) {
      errors.push(`Gate error: ${error.message}`);
      return { passed: false, report: null, errors };
    }
  }

  /**
   * Output PR summary
   */
  private outputPRSummary(report: ComplianceReport): void {
    const summary = report.summary;

    console.log('::group::📋 License Compliance Summary');
    console.log(`Compliance Score: ${summary.score}/100`);
    console.log(`Risk Level: ${summary.riskLevel}`);
    console.log(`Status: ${summary.compliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`);
    console.log(`Errors: ${summary.errors}`);
    console.log(`Warnings: ${summary.warnings}`);
    console.log('::endgroup::');

    // Output annotations for GitHub Actions
    if (process.env.GITHUB_ACTIONS) {
      for (const violation of report.violations.slice(0, 10)) {
        console.log(`::error file=${violation.package}::${violation.message}`);
      }
    }
  }
}
