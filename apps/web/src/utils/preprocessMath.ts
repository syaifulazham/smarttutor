/**
 * Normalises all LaTeX math delimiters so remark-math can render them.
 *
 * AI models produce a mix of:
 *   \(...\)      →  $...$     (inline — most common from Gemini)
 *   \[...\]      →  $$...$$   (display)
 *   \$...\$      →  $...$     (AI-escaped dollar)
 *   \\cmd        →  \cmd      (double-backslash LaTeX commands)
 *   \text{N}     →  $\text{N}$ (bare LaTeX outside delimiters)
 *
 * Must run on the raw string BEFORE ReactMarkdown so the markdown tokeniser
 * never sees the original backslash forms.
 */
export function preprocessMath(content: string): string {
  // 0. Convert backtick-wrapped math to inline $...$ (AI sometimes codes math)
  content = content.replace(/`([^`\n]+)`/g, (match, inner) => {
    if (!/[×÷±√∞≤≥≠≈^_]/.test(inner) && !/\\[a-zA-Z]/.test(inner)) return match;
    const latex = inner
      .replace(/×/g, ' \\times ')
      .replace(/÷/g, ' \\div ')
      .replace(/±/g, ' \\pm ')
      .replace(/√/g, '\\sqrt')
      .replace(/∞/g, '\\infty')
      .replace(/≤/g, ' \\leq ')
      .replace(/≥/g, ' \\geq ')
      .replace(/≠/g, ' \\neq ')
      .replace(/≈/g, ' \\approx ')
      .replace(/\s+/g, ' ').trim();
    return `$${latex}$`;
  });

  // 1. \[...\] → $$...$$ (display — before inline to avoid partial overlap)
  content = content.replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `$$${m}$$`);
  // 2. \(...\) → $...$ (inline)
  content = content.replace(/\\\((.+?)\\\)/gs, (_, m) => `$${m}$`);
  // 3. \$...\$ → $...$ (escaped-dollar form)
  content = content.replace(/\\\$(.+?)\\\$/gs, (_, m) => `$${m}$`);
  // 4. Normalize double-backslash LaTeX commands: \\text → \text, \\circ → \circ, etc.
  content = content.replace(/\\\\([a-zA-Z])/g, '\\$1');
  // 5. Wrap bare LaTeX expressions not inside math delimiters
  content = wrapBareLaTeX(content);
  return content;
}

/**
 * Splits content into math/code segments (left untouched) and plain-text
 * segments (processed to wrap bare LaTeX commands in $...$).
 */
function wrapBareLaTeX(content: string): string {
  // Matches existing math delimiters and code spans so we skip them
  const PROTECTED_RE = /(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$|`{3}[\s\S]*?`{3}|`[^`\n]+`)/g;

  const parts: string[] = [];
  let lastIdx = 0;

  for (const m of content.matchAll(PROTECTED_RE)) {
    if (m.index! > lastIdx) {
      parts.push(wrapBareLaTeXInSegment(content.slice(lastIdx, m.index)));
    }
    parts.push(m[0]);
    lastIdx = m.index! + m[0].length;
  }
  if (lastIdx < content.length) {
    parts.push(wrapBareLaTeXInSegment(content.slice(lastIdx)));
  }

  return parts.join('');
}

/**
 * Detects bare LaTeX patterns in a non-math text segment and wraps them in $...$.
 *
 * Handles the most common cases the AI emits outside delimiters:
 *   \text{N}               → $\text{N}$
 *   \frac{1}{2}            → $\frac{1}{2}$
 *   \sqrt{3}               → $\sqrt{3}$
 *   30^\circ               → $30^\circ$
 *   \alpha, \beta, \theta  → $\alpha$, $\beta$, $\theta$
 */
function wrapBareLaTeXInSegment(text: string): string {
  // Step A: \text{...} → $\text{...}$
  text = text.replace(/\\text\{([^}]*)\}/g, (_, c) => `$\\text{${c}}$`);

  // Step B: \frac{...}{...} → $\frac{...}{...}$
  text = text.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, (_, n, d) => `$\\frac{${n}}{${d}}$`);

  // Step C: \sqrt{...} → $\sqrt{...}$
  text = text.replace(/\\sqrt\{([^}]*)\}/g, (_, c) => `$\\sqrt{${c}}$`);

  // Step D: word^\circ or word^{\circ} → $word^\circ$ (angles like 30^\circ)
  text = text.replace(/(\w+)\^(?:\{?\\circ\}?)/g, (_, base) => `$${base}^\\circ$`);

  // Step E: Standalone Greek letters and common math symbols
  text = text.replace(
    /\\(alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|varpi|rho|sigma|tau|upsilon|phi|varphi|chi|psi|omega|Alpha|Beta|Gamma|Delta|Epsilon|Zeta|Eta|Theta|Iota|Kappa|Lambda|Mu|Nu|Xi|Pi|Rho|Sigma|Tau|Upsilon|Phi|Chi|Psi|Omega|circ|infty|pm|mp|leq|geq|neq|approx|sim|equiv|cdot|times|div|partial|nabla|vec|hat|bar|dot|tilde|angle|perp|parallel|rightarrow|leftarrow|Rightarrow|Leftarrow|leftrightarrow)\b/g,
    (_, cmd) => `$\\${cmd}$`
  );

  // Step F: Merge adjacent math spans that are separated only by a ^ or _
  // e.g., "30^$\circ$" (if the ^ wasn't caught by step D) → "$30^\circ$"
  text = text.replace(/([a-zA-Z0-9.]+)\^\$([^$]+)\$/g, (_, base, exp) => `$${base}^${exp}$`);
  text = text.replace(/([a-zA-Z0-9.]+)_\$([^$]+)\$/g, (_, base, sub) => `$${base}_${sub}$`);

  return text;
}

/**
 * Strips wrapping markdown code fences that the AI sometimes adds around
 * its entire response (e.g. ```markdown ... ``` or ``` ... ```).
 */
export function stripOuterCodeFence(content: string): string {
  return content.replace(/^```(?:\w+)?\n?([\s\S]*?)\n?```\s*$/s, '$1').trim();
}

/**
 * Normalises AI scheme output so it renders with clear structure:
 * - Converts inline • bullets to markdown list items
 * - Ensures blank lines before sub-part headings
 * - Promotes multi-term inline math expressions to display math on their own line
 */
export function normalizeSchemeMarkdown(text: string): string {
  text = text
    // Blank line before **(a)** / **(b)** bold sub-part labels mid-paragraph
    .replace(/([^\n])\n(\*\*\([a-z]\))/g, '$1\n\n$2')
    // Convert inline • bullet char to markdown list item
    .replace(/^[ \t]*•[ \t]*/gm, '- ')
    // Bullets that appear after a sentence with no preceding newline
    .replace(/([.!?])\s+•\s+/g, '$1\n- ')
    // Blank line before ### headings if not already preceded by one
    .replace(/([^\n])\n(#{1,3} )/g, '$1\n\n$2');

  // Promote complex inline math to display math.
  // A "$...$" expression is "complex" if it contains =, \Rightarrow, \frac, \times, >, <, +, -.
  // We split on existing $$...$$ first so we don't double-promote already-display math.
  text = text.replace(
    /\$(?!\$)([^$\n]+?)\$(?!\$)/g,
    (match, inner) => {
      const isComplex =
        /[=<>]/.test(inner) ||
        /\\(Rightarrow|rightarrow|Leftarrow|leftarrow|frac|times|div|cdot|Leftrightarrow|implies)/.test(inner) ||
        /[+\-]{1}/.test(inner.replace(/^\s*[-+]?\d/, '')); // has operator beyond leading sign
      if (!isComplex) return match; // keep simple inline
      return `\n\n$$${inner}$$\n\n`;
    }
  );

  // Ensure any $$ block that follows text on the same line gets its own paragraph
  text = text.replace(/([^\n$\s][^\n$]*?)\s*(\$\$)/g, '$1\n\n$$');
  // Ensure any $$ block that is followed by text on the same line gets a blank line after
  text = text.replace(/(\$\$)\s*([^\n$\s])/g, '$1\n\n$2');
  // Remove stray lone $ signs left over from malformed AI output
  text = text.replace(/(?<!\$)\$(?!\$)(?![^$\n]*\$)/gm, '');

  // Clean up any triple+ blank lines introduced
  text = text.replace(/\n{3,}/g, '\n\n');

  return text;
}

/**
 * Client-side equivalent of server's reformatSchemeOutput.
 * Converts AI scheme output (inline $...$ math, **labels** inline) into
 * clean $$...$$ display-math blocks separated by bold labels.
 * Idempotent — safe to call on already-formatted content.
 */
export function reformatScheme(raw: string): string {
  // Strip code fences
  raw = raw.replace(/^```[\w]*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
  // Normalise \[...\] → $$...$$
  raw = raw.replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `$$${m.trim()}$$`);

  const parts = raw.split(/(\*\*[^*]+\*\*)/g);
  const output: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (/^\*\*[^*]+\*\*$/.test(trimmed)) {
      output.push('');
      output.push(trimmed);
      output.push('');
    } else {
      for (const rawLine of trimmed.split('\n')) {
        if (rawLine.trim().startsWith('###')) { output.push(rawLine.trim()); continue; }
        const line = rawLine.replace(/\$/g, '').trim();
        if (line) output.push(`$$${line}$$`);
      }
    }
  }

  return output.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Removes any trailing unclosed $...$ expression (e.g. from a title sliced at 100 chars).
 * An odd number of $ signs means the last one is unmatched — trim back to before it.
 */
export function trimUnclosedMath(text: string): string {
  const dollars = (text.match(/\$/g) ?? []).length;
  if (dollars % 2 !== 0) {
    const lastDollar = text.lastIndexOf('$');
    return text.slice(0, lastDollar).trimEnd() + '\u2026'; // append ellipsis
  }
  return text;
}
