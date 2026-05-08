#!/usr/bin/env node

import { CodeReviewer } from './analyzers/code-reviewer';
import { CodeReviewOptions, CodeReviewResult } from './types';

export class CodeReviewCLI {
  static async run(args: string[] = process.argv.slice(2)): Promise<void> {
    const options = this.parseArgs(args);
    const reviewer = new CodeReviewer(options);
    
    console.log('🔍 Starting automated code review...\n');
    
    try {
      const result = await reviewer.reviewCode(options.target);
      this.displayResults(result, options.outputFormat || 'table');
      
      // Self-updating feedback system
      if (result.totalIssues > 0) {
        console.log('\n📈 Code Review Feedback & Self-Improvement:');
        this.provideFeedbackAndImprove(result);
      }
      
    } catch (error) {
      console.error('❌ Error during code review:', error);
      process.exit(1);
    }
  }

  private static parseArgs(args: string[]): CodeReviewOptions & { target?: string } {
    const options: CodeReviewOptions & { target?: string } = {};
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--target':
        case '-t':
          options.target = args[++i];
          break;
        case '--format':
        case '-f':
          options.outputFormat = args[++i] as 'json' | 'table' | 'markdown';
          break;
        case '--exclude':
        case '-e':
          options.excludePatterns = args[++i].split(',');
          break;
        case '--help':
        case '-h':
          this.showHelp();
          process.exit(0);
          break;
        default:
          if (!arg.startsWith('-') && !options.target) {
            options.target = arg;
          }
      }
    }
    
    return options;
  }

  private static displayResults(result: CodeReviewResult, format: string): void {
    switch (format) {
      case 'json':
        console.log(JSON.stringify(result, null, 2));
        break;
      case 'markdown':
        this.displayMarkdownResults(result);
        break;
      default:
        this.displayTableResults(result);
    }
  }

  private static displayTableResults(result: CodeReviewResult): void {
    console.log(`📊 Code Review Results`);
    console.log(`${'='.repeat(50)}`);
    console.log(`Files analyzed: ${result.totalFiles}`);
    console.log(`Total issues: ${result.totalIssues}`);
    console.log(`Errors: ${result.summary.errors} | Warnings: ${result.summary.warnings} | Info: ${result.summary.info}\n`);

    if (result.issues.length === 0) {
      console.log('✅ No issues found! Code looks great!');
      return;
    }

    // Group issues by file
    const issuesByFile = result.issues.reduce((acc, issue) => {
      if (!acc[issue.file]) acc[issue.file] = [];
      acc[issue.file].push(issue);
      return acc;
    }, {} as Record<string, typeof result.issues>);

    Object.entries(issuesByFile).forEach(([file, issues]) => {
      console.log(`📁 ${file}`);
      console.log(`${'─'.repeat(file.length + 3)}`);
      
      issues.forEach(issue => {
        const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${icon} Line ${issue.line}: ${issue.message}`);
        if (issue.suggestion) {
          console.log(`   💡 ${issue.suggestion}`);
        }
      });
      console.log('');
    });
  }

  private static displayMarkdownResults(result: CodeReviewResult): void {
    console.log('# Code Review Results\n');
    console.log(`**Files analyzed:** ${result.totalFiles}  `);
    console.log(`**Total issues:** ${result.totalIssues}  `);
    console.log(`**Errors:** ${result.summary.errors} | **Warnings:** ${result.summary.warnings} | **Info:** ${result.summary.info}\n`);

    if (result.issues.length === 0) {
      console.log('✅ **No issues found! Code looks great!**');
      return;
    }

    const issuesByFile = result.issues.reduce((acc, issue) => {
      if (!acc[issue.file]) acc[issue.file] = [];
      acc[issue.file].push(issue);
      return acc;
    }, {} as Record<string, typeof result.issues>);

    Object.entries(issuesByFile).forEach(([file, issues]) => {
      console.log(`## 📁 ${file}\n`);
      
      issues.forEach(issue => {
        const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${icon} **Line ${issue.line}:** ${issue.message}`);
        if (issue.suggestion) {
          console.log(`   💡 *${issue.suggestion}*`);
        }
        console.log('');
      });
    });
  }

  private static provideFeedbackAndImprove(result: CodeReviewResult): void {
    const mostCommonIssues = this.analyzeMostCommonIssues(result);
    
    console.log('🔄 Self-updating based on findings:');
    
    mostCommonIssues.forEach(({ rule, count, percentage }) => {
      console.log(`• Rule "${rule}": Found ${count} times (${percentage}%)`);
      
      // Provide specific feedback for common issues
      switch (rule) {
        case 'unused-import':
          console.log('  → Consider adding automatic import cleanup to your build process');
          break;
        case 'no-any':
          console.log('  → Team should establish TypeScript strict mode guidelines');
          break;
        case 'missing-key-prop':
          console.log('  → Add ESLint React rules to catch this automatically');
          break;
        case 'max-line-length':
          console.log('  → Configure Prettier with max line length for consistent formatting');
          break;
        default:
          console.log('  → This rule triggers frequently, consider team training or tooling');
      }
    });

    console.log('\n🎯 Recommended next actions:');
    if (result.summary.errors > 0) {
      console.log('• Fix all ERROR level issues first - they may cause bugs');
    }
    if (result.summary.warnings > 10) {
      console.log('• Consider stricter linting rules to catch issues earlier');
    }
    if (result.summary.info > 20) {
      console.log('• Setup automated formatting (Prettier) to reduce style issues');
    }
  }

  private static analyzeMostCommonIssues(result: CodeReviewResult): Array<{rule: string, count: number, percentage: number}> {
    const ruleCounts = result.issues.reduce((acc, issue) => {
      acc[issue.rule] = (acc[issue.rule] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(ruleCounts)
      .map(([rule, count]) => ({
        rule,
        count,
        percentage: Math.round((count / result.totalIssues) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 most common issues
  }

  private static showHelp(): void {
    console.log(`
🔍 Code Review CLI Tool

USAGE:
  npm run code-review [options] [target]

OPTIONS:
  -t, --target <path>     Target file or directory to review
  -f, --format <format>   Output format: table, json, markdown (default: table)
  -e, --exclude <patterns> Comma-separated exclude patterns
  -h, --help             Show this help message

EXAMPLES:
  npm run code-review                           # Review all src files
  npm run code-review src/app/page.tsx         # Review specific file
  npm run code-review --format=json            # JSON output
  npm run code-review --exclude="**/*.test.*"  # Exclude test files
`);
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  CodeReviewCLI.run().catch(console.error);
}