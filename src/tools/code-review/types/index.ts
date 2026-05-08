export interface CodeReviewIssue {
  file: string;
  line: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  rule: string;
  message: string;
  suggestion?: string;
}

export interface CodeReviewOptions {
  files?: string[];
  excludePatterns?: string[];
  rules?: Partial<CodeReviewRules>;
  outputFormat?: 'json' | 'table' | 'markdown';
}

export interface CodeReviewRules {
  typescript: {
    unusedImports: boolean;
    noAny: boolean;
    explicitReturnTypes: boolean;
    noUnusedVariables: boolean;
  };
  react: {
    componentNaming: boolean;
    hooksDependencies: boolean;
    noInlineStyles: boolean;
    keyPropRequired: boolean;
  };
  security: {
    noEval: boolean;
    noInnerHTML: boolean;
    noUnvalidatedInputs: boolean;
  };
  style: {
    maxLineLength: number;
    indentation: 'spaces' | 'tabs';
    indentSize: number;
    namingConvention: boolean;
  };
}

export interface CodeReviewResult {
  totalFiles: number;
  totalIssues: number;
  issues: CodeReviewIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}