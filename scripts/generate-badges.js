#!/usr/bin/env node
/**
 * Generate coverage badges from coverage-summary.json
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const coverageSummaryPath = join(
  process.cwd(),
  'coverage',
  'coverage-summary.json'
)
const badgesDir = join(process.cwd(), 'coverage', 'badges')

// Badge color thresholds
const getColor = (percentage) => {
  if (percentage >= 90) return 'brightgreen'
  if (percentage >= 70) return 'yellow'
  if (percentage >= 50) return 'orange'
  return 'red'
}

// Generate badge URL
const generateBadgeUrl = (label, percentage) => {
  const color = getColor(percentage)
  const value = `${percentage.toFixed(1)}%25` // URL encode %
  return `https://img.shields.io/badge/${label}-${value}-${color}`
}

// Read coverage summary
if (!existsSync(coverageSummaryPath)) {
  console.error('Coverage summary not found. Run tests with coverage first.')
  process.exit(1)
}

const coverageSummary = JSON.parse(readFileSync(coverageSummaryPath, 'utf8'))
const total = coverageSummary.total

// Generate badge URLs
const badges = {
  lines: generateBadgeUrl('Coverage', total.lines.pct),
  statements: generateBadgeUrl('Statements', total.statements.pct),
  branches: generateBadgeUrl('Branches', total.branches.pct),
  functions: generateBadgeUrl('Functions', total.functions.pct),
}

// Create badges markdown
const badgesMarkdown = `# Coverage Badges

![Coverage](${badges.lines})
![Statements](${badges.statements})
![Branches](${badges.branches})
![Functions](${badges.functions})

## Coverage Summary

| Type | Coverage | Details |
|------|----------|---------|
| Lines | ${total.lines.pct.toFixed(2)}% | ${total.lines.covered}/${total.lines.total} |
| Statements | ${total.statements.pct.toFixed(2)}% | ${total.statements.covered}/${total.statements.total} |
| Branches | ${total.branches.pct.toFixed(2)}% | ${total.branches.covered}/${total.branches.total} |
| Functions | ${total.functions.pct.toFixed(2)}% | ${total.functions.covered}/${total.functions.total} |

Generated on: ${new Date().toISOString()}
`

// Write badges file
writeFileSync(join(process.cwd(), 'coverage-badges.md'), badgesMarkdown)

// Output for GitHub Actions
console.log(`::set-output name=coverage::${total.lines.pct.toFixed(2)}`)
console.log(`::set-output name=color::${getColor(total.lines.pct)}`)

console.log('Coverage badges generated successfully!')
console.log(`Overall coverage: ${total.lines.pct.toFixed(2)}%`)
