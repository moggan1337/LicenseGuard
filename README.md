# LicenseGuard - Enterprise Dependency License Compliance Scanner

[![CI](https://github.com/moggan1337/LicenseGuard/actions/workflows/ci.yml/badge.svg)](https://github.com/moggan1337/LicenseGuard/actions/workflows/ci.yml)

<div align="center">

![LicenseGuard](https://img.shields.io/badge/LicenseGuard-Compliance%20Scanner-27AE60)
![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

</div>

> **Protect your codebase. Audit your dependencies.** LicenseGuard ensures your open source dependencies comply with your organization's license policies.

## 🎬 Demo

![LicenseGuard Demo](demo.gif)

*Enterprise dependency license compliance scanning*

## ✨ Features

- **License Detection** - Identifies 500+ license types automatically
- **Policy Enforcement** - Block violating dependencies before they ship
- **Compliance Reports** - Generate audit-ready documentation
- **License Text Extraction** - Get full license text for any dependency
- **CI/CD Integration** - Fail builds on policy violations

## 🚀 Quick Start

```bash
pip install licenseguard
licenseguard scan
licenseguard report --format html
```

## 📋 License Audit Report Demo

### Compliance Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         LICENSE COMPLIANCE DASHBOARD                             │
│                         Project: platform-api | Scan: 2024-04-21 14:30          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  COMPLIANCE SCORE: ██████████████████████████░░░░░░░░░░░░░░░░  78/100          │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  Status: 🟡 NEEDS ATTENTION                                                      │
│                                                                                  │
│  Dependencies Scanned:    1,247         Total Licenses:          23              │
│  Allowed:                1,189         Policy Violations:       58             │
│  Flagged:                   42         Pending Review:          16             │
│  Blocked:                    0         Last Full Scan:    2 hours ago           │
│                                                                                  │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  VIOLATIONS BY SEVERITY                                                         │
│  ══════════════════════════                                                      │
│                                                                                  │
│  🔴 CRITICAL (License Prohibited):        12 packages                           │
│  🟠 HIGH (Copyleft requiring attention):  23 packages                           │
│  🟡 MEDIUM (Commercial restrictions):     15 packages                           │
│  🟢 LOW (Attribution required):           8 packages                            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### License Dependency Tree

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         📦 LICENSE DEPENDENCY TREE                                │
│                         Visual representation of your dependency licenses         │
└─────────────────────────────────────────────────────────────────────────────────┘

                                  ┌─────────────────┐
                                  │   YOUR PROJECT   │
                                  │   (Proprietary)   │
                                  └────────┬────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
           ┌────────▼────────┐    ┌────────▼────────┐    ┌────────▼────────┐
           │   express@4.18   │    │   lodash@4.17   │    │   react@18.2   │
           │   MIT License    │    │   MIT License   │    │      MIT        │
           │        ✓         │    │        ✓        │    │        ✓        │
           └────────┬────────┘    └────────┬────────┘    └────────┬────────┘
                    │                      │                      │
        ┌───────────┼───────────┐          │          ┌───────────┼───────────┐
        │           │           │          │          │           │           │
 ┌──────▼────┐ ┌────▼────┐ ┌────▼────┐ ┌────▼────┐ ┌────▼────┐ ┌────▼────┐
 │body-parse │ │serve-sta│ │express-s│ │lodash.es│ │react-dom│ │  jsx    │
 │   1.4.0   │ │  tic 1.0 │ │  ess 4.0│ │  module  │ │  18.2   │ │ runtime │
 │    MIT ✓  │ │   MIT ✓  │ │   MIT ✓ │ │   MIT ✓  │ │   MIT ✓  │ │   MIT ✓ │
 └───────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘

 ───────────────────────────────────────────────────────────────────────────────

                    ┌─────────────────────────────────┐
                    │        ⚠️ COPYLEFT PACKAGES      │
                    │      (Requires Investigation)   │
                    └────────────────┬────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
     ┌────────▼────────┐    ┌────────▼────────┐    ┌────────▼────────┐
     │   postgres@15   │    │   wkhtmltopdf  │    │   opencv-python  │
     │  PostgreSQL L   │    │    AGPL-3.0    │    │      AGPL-3.0    │
     │       🟠        │    │       🔴       │    │        🔴        │
     └─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Detailed Violation Analysis

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         🚨 POLICY VIOLATIONS                                     │
│                         Critical issues requiring immediate attention            │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                                                                              │
  │  🔴 VIOLATION #1: Prohibited License (AGPL-3.0)                              │
  │  ────────────────────────────────────────────────────────────────────────   │
  │                                                                              │
  │  Package: wkhtmltopdf@0.12.6                                                 │
  │  License: GNU Affero General Public License v3.0 (AGPL-3.0)                  │
  │  Severity: CRITICAL                                                          │
  │  Status: ❌ BLOCKED                                                          │
  │                                                                              │
  │  Policy Rule: "No AGPL-3.0 licensed software in production"                │
  │  Rationale: AGPL requires disclosing source code of network-using software   │
  │                                                                              │
  │  Dependency Path:                                                            │
  │  platform-api → pdf-generator → wkhtmltopdf@0.12.6                          │
  │                                                                              │
  │  ┌───────────────────────────────────────────────────────────────────────┐  │
  │  │  Recommendation: Replace with one of:                                  │  │
  │  │                                                                     │  │
  │  │  1. puppeteer + chrome-headless (Apache-2.0)  ← RECOMMENDED         │  │
  │  │  2. @react-pdf/renderer (MIT)                                        │  │
  │  │  3. pdfkit (MIT)                                                     │  │
  │  │                                                                     │  │
  │  │  Estimated migration effort: 4 hours                               │  │
  │  │  Risk: Low (drop-in replacement available)                          │  │
  │  └───────────────────────────────────────────────────────────────────────┘  │
  │                                                                              │
  │  Actions:                                                                    │
  │  [ ] Find alternative PDF library                                            │
  │  [ ] Update pdf-generator package                                            │
  │  [ ] Test PDF generation functionality                                      │
  │  [ ] Remove wkhtmltopdf dependency                                          │
  │                                                                              │
  └─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                                                                              │
  │  🟠 VIOLATION #2: Strong Copyleft (GPL-3.0)                                 │
  │  ────────────────────────────────────────────────────────────────────────   │
  │                                                                              │
  │  Package: opencv-python@4.8.0                                                │
  │  License: GNU General Public License v3.0 (GPL-3.0)                          │
  │  Severity: HIGH                                                              │
  │  Status: ⚠️ FLAGGED (Requires legal review)                                 │
  │                                                                              │
  │  Policy Rule: "GPL-3.0 requires source code disclosure"                     │
  │  Rationale: If distributed, entire derivative work must be open source     │
  │                                                                              │
  │  Usage: Image processing for user-uploaded photos                            │
  │  Distribution: SaaS only (not redistributed)                               │
  │                                                                              │
  │  ┌───────────────────────────────────────────────────────────────────────┐  │
  │  │  Legal Analysis:                                                       │  │
  │  │                                                                     │  │
  │  │  Since platform-api is offered as a SaaS (not redistributed),       │  │
  │  │  GPL's copyleft provisions may not apply. However, this should       │  │
  │  │  be reviewed by legal counsel.                                      │  │
  │  │                                                                     │  │
  │  │  Alternative: pillow (PIL) for basic image processing (BSD)          │  │
  │  │  Estimated migration effort: 16 hours (complex image analysis)       │  │
  │  └───────────────────────────────────────────────────────────────────────┘  │
  │                                                                              │
  │  Actions:                                                                    │
  │  [ ] Consult legal team about SaaS GPL applicability                       │
  │  [x] Document usage rationale                                               │
  │  [ ] If approved, add to exceptions list                                    │
  │                                                                              │
  └─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                                                                              │
  │  🟡 VIOLATION #3: Commercial License Restriction                            │
  │  ────────────────────────────────────────────────────────────────────────   │
  │                                                                              │
  │  Package: @elastic/elasticsearch@8.10.0                                      │
  │  License: Elastic License 2.0 (Proprietary)                                  │
  │  Severity: MEDIUM                                                           │
  │  Status: ⚠️ FLAGGED (Monitor usage)                                         │
  │                                                                              │
  │  Policy Rule: "Commercial licenses require budget approval > $10K/year"     │
  │  Current Cost: $45,000/year (Elastic Cloud Professional)                    │
  │                                                                              │
  │  ┌───────────────────────────────────────────────────────────────────────┐  │
  │  │  Budget Status:                                                        │  │
  │  │                                                                     │  │
  │  │  Approved:      $50,000/year                                          │  │
  │  │  Current:       $45,000/year                                          │  │
  │  │  Remaining:     $5,000/year                                           │  │
  │  │                                                                     │  │
  │  │  ✓ Within budget. No action required.                                 │  │
  │  └───────────────────────────────────────────────────────────────────────┘  │
  │                                                                              │
  │  Actions:                                                                    │
  │  [x] Verify budget allocation                                               │
  │  [ ] Review at next budget cycle (Q2)                                        │
  │                                                                              │
  └─────────────────────────────────────────────────────────────────────────────┘
```

### License Distribution Chart

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         📊 LICENSE DISTRIBUTION                                  │
│                         Breakdown by license type                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  PERMISSIVE LICENSES (✅ Generally Allowed)                                     │
│  ─────────────────────────────────────────                                       │
│                                                                                  │
│  MIT License           ████████████████████████████████████████████████████     │
│                        456 packages (37%)                                       │
│                                                                                  │
│  Apache-2.0            ████████████████████████████████░░░░░░░░░░░░░░░░░░     │
│                        234 packages (19%)                                       │
│                                                                                  │
│  BSD-3-Clause          ██████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░     │
│                        178 packages (14%)                                       │
│                                                                                  │
│  ISC                   ██████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░     │
│                        89 packages (7%)                                         │
│                                                                                  │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  COPYLEFT LICENSES (⚠️ Requires Review)                                         │
│  ─────────────────────────────────────                                          │
│                                                                                  │
│  GPL-3.0               ██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░     │
│                        23 packages (2%)                                         │
│                                                                                  │
│  LGPL-2.1              ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░     │
│                        12 packages (1%)                                         │
│                                                                                  │
│  AGPL-3.0              ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░     │
│                        8 packages (0.6%)                                        │
│                                                                                  │
│  MPL-2.0               ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░     │
│                        7 packages (0.5%)                                        │
│                                                                                  │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  COMMERCIAL/PROPERTY (📋 Monitor & Budget)                                      │
│  ──────────────────────────────────────────                                      │
│                                                                                  │
│  Elastic License      ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░     │
│                       5 packages (0.4%)                                        │
│                                                                                  │
│  Proprietary          ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░     │
│                       4 packages (0.3%)                                        │
│                                                                                  │
│  Unknown              ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░     │
│                       2 packages (0.2%)                                        │
│                                                                                  │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  LEGEND:                                                                       │
│  ✓ = Allowed by default policy                                                │
│  ⚠️ = Requires review/approval                                                │
│  ❌ = Prohibited by policy                                                    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### CI/CD Integration

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         GITHUB ACTIONS INTEGRATION                              │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  # .github/workflows/license-check.yml                                       │
  │  name: License Compliance                                                    │
  │                                                                             │
  │  on: [push, pull_request]                                                   │
  │                                                                             │
  │  jobs:                                                                      │
  │    license-check:                                                           │
  │      runs-on: ubuntu-latest                                                  │
  │      steps:                                                                 │
  │        - uses: actions/checkout@v4                                          │
  │        - uses: actions/setup-python@v4                                      │
  │        - run: pip install licenseguard                                      │
  │        - name: Run License Scan                                             │
  │          run: |                                                             │
  │            licenseguard scan \                                             │
  │              --policy ./policies/company-policy.json \                      │
  │              --fail-level medium                                             │
  │        - name: Generate Report                                              │
  │          if: always()                                                       │
  │          run: licenseguard report --format html --output report.html       │
  │        - uses: actions/upload-artifact@v4                                    │
  │          if: always()                                                       │
  │          with:                                                              │
  │            name: license-report                                             │
  │            path: report.html                                                │
  └─────────────────────────────────────────────────────────────────────────────┘

  RUNNING WORKFLOW...

  ✓ Scanned 1,247 dependencies
  ✓ Policy loaded: company-policy.json
  ✓ Severity threshold: MEDIUM

  Results:
  ─────────────────────────────────────────
  CRITICAL:  0  (✅ Pass)
  HIGH:      2  (⚠️  Warning)
  MEDIUM:    5  (⚠️  Warning)
  LOW:      12  (ℹ️   Info)
  ─────────────────────────────────────────

  ✓ BUILD PASSED (No blocking violations)

  📊 Report: https://licenseguard.company.com/reports/abc123
```

### Policy Configuration Example

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         📋 LICENSE POLICY CONFIGURATION                          │
│                         .licenseguard/policy.json                                │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  {                                                                       │
  │    "version": "1.0",                                                      │
  │    "rules": [                                                            │
  │      {                                                                   │
  │        "id": "permissive-licenses",                                      │
  │        "action": "allow",                                                 │
  │        "licenses": [                                                      │
  │          "MIT", "Apache-2.0", "BSD-3-Clause", "BSD-2-Clause",             │
  │          "ISC", "Unlicense", "CC0-1.0", "Python-2.0"                       │
  │        ],                                                                 │
  │        "notes": "Common permissive open source licenses"                  │
  │      },                                                                   │
  │      {                                                                   │
  │        "id": "copyleft-review",                                          │
  │        "action": "flag",                                                  │
  │        "licenses": ["GPL-2.0", "GPL-3.0", "LGPL-2.1", "LGPL-3.0"],       │
  │        "severity": "HIGH",                                                │
  │        "notes": "Requires legal review before use"                        │
  │      },                                                                   │
  │      {                                                                   │
  │        "id": "prohibited",                                               │
  │        "action": "block",                                                 │
  │        "licenses": ["AGPL-3.0", "SSPL-1.0", "Commons-Clause"],           │
  │        "severity": "CRITICAL",                                           │
  │        "notes": "Prohibited for all production use"                      │
  │      },                                                                   │
  │      {                                                                   │
  │        "id": "commercial-monitor",                                      │
  │        "action": "warn",                                                  │
  │        "licenses": ["Elastic-2.0", "MongoDB-Server-Side-Public",         │
  │                     "Proprietary"],                                       │
  │        "notes": "Track costs and budget allocation"                      │
  │      }                                                                   │
  │    ],                                                                     │
  │    "exceptions": [                                                       │
  │      {                                                                   │
  │        "package": "mongodb@6.0",                                         │
  │        "license": "SSPL-1.0",                                            │
  │        "reason": "Database engine, not redistributable",                 │
  │        "approved_by": "legal@company.com",                                │
  │        "expires": "2025-01-01"                                           │
  │      }                                                                   │
  │    ]                                                                     │
  │  }                                                                       │
  └─────────────────────────────────────────────────────────────────────────────┘
```

## 🛠️ Installation

```bash
pip install licenseguard
```

## 📖 Usage

```bash
# Scan project dependencies
licenseguard scan

# Scan with custom policy
licenseguard scan --policy ./policy.json

# Generate compliance report
licenseguard report --format html --output report.html

# Check specific package
licenseguard check --package express

# Add exception
licenseguard exception add wkhtmltopdf --reason "Development only"

# CI/CD mode (fail on violations)
licenseguard scan --fail-level HIGH
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

MIT © 2024 moggan1337
