import React from 'react';
import { TextHighlight, HighlightColor, FontSizeOption, ThemeMode } from '../types';

interface FormattedLogProps {
  content: string;
  fontSize?: FontSizeOption;
  theme?: ThemeMode;
  highlights?: TextHighlight[];
  onRemoveHighlight?: (highlightId: string) => void;
}

// 아주 작게(xs), 작게(sm), 보통(base), 크게(lg)
export const FONT_SIZE_CLASSES: Record<
  FontSizeOption,
  { base: string; heading1: string; heading2: string; heading3: string; sub: string; label: string }
> = {
  xs: {
    base: 'text-[12px] leading-relaxed',
    heading1: 'text-base',
    heading2: 'text-sm',
    heading3: 'text-xs',
    sub: 'text-[11px]',
    label: '아주 작게',
  },
  sm: {
    base: 'text-[13.5px] leading-relaxed',
    heading1: 'text-lg',
    heading2: 'text-base',
    heading3: 'text-sm',
    sub: 'text-[12px]',
    label: '작게',
  },
  base: {
    base: 'text-[15px] leading-relaxed',
    heading1: 'text-xl',
    heading2: 'text-lg',
    heading3: 'text-base',
    sub: 'text-sm',
    label: '보통',
  },
  lg: {
    base: 'text-[17.5px] leading-relaxed',
    heading1: 'text-2xl',
    heading2: 'text-xl',
    heading3: 'text-lg',
    sub: 'text-base',
    label: '크게',
  },
};

type BlockType =
  | { type: 'codeblock'; language: string; content: string }
  | { type: 'blockquote'; lines: string[] }
  | { type: 'image'; alt: string; src: string }
  | { type: 'divider' }
  | { type: 'best_badge'; text: string }
  | { type: 'comment_badge'; text: string }
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'h4'; text: string }
  | { type: 'h5'; text: string }
  | { type: 'nickname'; name: string }
  | { type: 'empty' }
  | { type: 'p'; text: string };

export const FormattedLog: React.FC<FormattedLogProps> = ({
  content,
  fontSize = 'base',
  theme = 'asphalt',
  highlights = [],
  onRemoveHighlight,
}) => {
  if (!content) return null;

  const sizeClasses = FONT_SIZE_CLASSES[fontSize] || FONT_SIZE_CLASSES.base;
  const isDark = theme === 'asphalt' || theme === 'grayblue';

  // 4개 색상 모드별 포인트 톤
  let accentColor = '#D4CEBF';
  let badgeColor = 'bg-[#efede3]/15 text-[#efede3]';
  let borderLine = isDark ? 'border-white/10' : 'border-stone-300';
  let quoteBorder = isDark
    ? 'border-[#efede3]/60 text-stone-200 bg-white/5'
    : 'border-[#302f2c]/70 text-stone-800 bg-black/5';
  let codeBlockStyle = isDark
    ? 'bg-[#181716] border-white/10 text-stone-200'
    : 'bg-[#E7E4D8] border-stone-300 text-stone-900';

  if (theme === 'asphalt') {
    accentColor = '#efede3';
    badgeColor = 'bg-[#efede3]/20 text-[#efede3]';
    quoteBorder = 'border-[#efede3]/60 text-[#efede3] bg-[#efede3]/5';
    codeBlockStyle = 'bg-[#232220] border-white/10 text-[#efede3]';
  } else if (theme === 'grayblue') {
    accentColor = '#9EADC8';
    badgeColor = 'bg-[#9EADC8]/20 text-[#C9D4E8]';
    quoteBorder = 'border-[#9EADC8]/60 text-stone-200 bg-[#9EADC8]/5';
    codeBlockStyle = 'bg-[#1C212A] border-white/10 text-[#f0f3f8]';
  } else if (theme === 'paper') {
    accentColor = '#302f2c';
    badgeColor = 'bg-[#302f2c]/15 text-[#302f2c]';
    quoteBorder = 'border-[#302f2c]/70 text-[#302f2c] bg-[#302f2c]/5';
    codeBlockStyle = 'bg-[#E3DFD0] border-stone-300 text-[#302f2c]';
  } else if (theme === 'milk') {
    accentColor = '#2b323f';
    badgeColor = 'bg-[#2b323f]/10 text-[#2b323f]';
    quoteBorder = 'border-[#2b323f]/60 text-[#2b323f] bg-[#2b323f]/5';
    codeBlockStyle = 'bg-[#EDE9E1] border-stone-200 text-[#2b323f]';
  }

  const textColor = isDark ? 'text-stone-100' : 'text-[#302f2c]';

  // Parse lines into structured blocks (handling multi-line codeblocks and blockquotes)
  const rawLines = content.split('\n');
  const blocks: BlockType[] = [];

  let i = 0;
  while (i < rawLines.length) {
    const rawLine = rawLines[i];
    const trimmed = rawLine.trim();

    // 0. Ignore HTML comment blocks like [//]: # (...)
    if (trimmed.startsWith('[//]: #') || trimmed.startsWith('<!--')) {
      i++;
      continue;
    }

    // 1. Code Block: ```lang ... ```
    if (trimmed.startsWith('```')) {
      const language = trimmed.replace(/^```/, '').trim();
      const codeLines: string[] = [];
      i++;
      while (i < rawLines.length && !rawLines[i].trim().startsWith('```')) {
        codeLines.push(rawLines[i]);
        i++;
      }
      if (i < rawLines.length && rawLines[i].trim().startsWith('```')) {
        i++; // skip closing ```
      }
      blocks.push({
        type: 'codeblock',
        language,
        content: codeLines.join('\n'),
      });
      continue;
    }

    // 2. Blockquote: Consecutive lines starting with >
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('>')) {
        quoteLines.push(rawLines[i].trim().replace(/^>\s*/, ''));
        i++;
      }
      blocks.push({
        type: 'blockquote',
        lines: quoteLines,
      });
      continue;
    }

    // 3. Image markdown: ![alt](url)
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/);
    if (imgMatch) {
      blocks.push({
        type: 'image',
        alt: imgMatch[1],
        src: imgMatch[2],
      });
      i++;
      continue;
    }

    // 4. Dividers: --- or *** or ___
    if (/^[-=_*]{3,}$/.test(trimmed)) {
      blocks.push({ type: 'divider' });
      i++;
      continue;
    }

    // 5. Section badges
    if (trimmed.includes('BEST COMMENTS') || trimmed.includes('베스트 댓글')) {
      blocks.push({ type: 'best_badge', text: '💡 BEST COMMENTS' });
      i++;
      continue;
    }
    if (trimmed.includes('NORMAL COMMENTS') || trimmed.includes('일반 댓글')) {
      blocks.push({ type: 'comment_badge', text: '💬 COMMENTS' });
      i++;
      continue;
    }

    // 6. Nickname line
    const nicknameMatch = trimmed.match(/^\*{0,2}\[닉네임:\s*([^\]]+)\]\*{0,2}/);
    if (nicknameMatch) {
      blocks.push({ type: 'nickname', name: nicknameMatch[1].trim() });
      i++;
      continue;
    }

    // 7. Headings
    if (trimmed.startsWith('##### ')) {
      blocks.push({ type: 'h5', text: trimmed.replace(/^#####\s+/, '') });
      i++;
      continue;
    }
    if (trimmed.startsWith('#### ')) {
      blocks.push({ type: 'h4', text: trimmed.replace(/^####\s+/, '') });
      i++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', text: trimmed.replace(/^###\s+/, '') });
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', text: trimmed.replace(/^##\s+/, '') });
      i++;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', text: trimmed.replace(/^#\s+/, '') });
      i++;
      continue;
    }

    // 8. Empty lines
    if (!trimmed) {
      blocks.push({ type: 'empty' });
      i++;
      continue;
    }

    // 9. Standard paragraph
    blocks.push({ type: 'p', text: rawLine });
    i++;
  }

  return (
    <div className={`space-y-3 font-sans ${textColor} ${sizeClasses.base} select-text`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'empty':
            return <div key={idx} className="h-2" />;

          case 'codeblock':
            return (
              <div
                key={idx}
                className={`my-3 p-3.5 sm:p-4 rounded-xl border font-mono text-xs overflow-x-auto shadow-2xs select-text ${codeBlockStyle}`}
              >
                {block.language && (
                  <div className="text-[10px] uppercase font-bold tracking-wider opacity-60 mb-2 border-b border-current/15 pb-1">
                    {block.language}
                  </div>
                )}
                <pre className="whitespace-pre-wrap font-mono leading-relaxed">
                  {block.content}
                </pre>
              </div>
            );

          case 'blockquote':
            return (
              <blockquote
                key={idx}
                className={`border-l-3 pl-4 py-2 my-2 rounded-r select-text space-y-1 ${quoteBorder}`}
              >
                {block.lines.map((qLine, qIdx) => (
                  <p key={qIdx} className="break-words leading-relaxed font-serif tracking-normal">
                    {renderLineWithHighlightsAndMarkdown(
                      qLine,
                      highlights,
                      isDark,
                      onRemoveHighlight
                    )}
                  </p>
                ))}
              </blockquote>
            );

          case 'image':
            return (
              <div key={idx} className="my-3 rounded-xl overflow-hidden border border-black/10 shadow-xs max-w-md mx-auto">
                <img
                  src={block.src}
                  alt={block.alt || '이미지'}
                  className="w-full h-auto object-cover max-h-[480px]"
                  loading="lazy"
                  onError={(e) => {
                    // fallback if broken
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                {block.alt && (
                  <div className="px-3 py-1.5 text-[11px] text-center opacity-65 font-medium bg-black/5">
                    {block.alt}
                  </div>
                )}
              </div>
            );

          case 'divider':
            return <hr key={idx} className={`my-4 ${borderLine}`} />;

          case 'best_badge':
            return (
              <div key={idx} className="pt-2 pb-1 select-text">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 font-bold text-xs rounded-md tracking-wider ${badgeColor}`}>
                  {block.text}
                </span>
              </div>
            );

          case 'comment_badge':
            return (
              <div key={idx} className="pt-4 pb-1 select-text">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 font-bold text-xs rounded-md tracking-wider ${
                    isDark ? 'bg-white/10 text-stone-300' : 'bg-black/10 text-stone-700'
                  }`}
                >
                  {block.text}
                </span>
              </div>
            );

          case 'nickname':
            return (
              <div
                key={idx}
                className="mt-3 font-semibold flex items-center gap-2 select-text"
                style={{ color: accentColor }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
                <span>{block.name}</span>
              </div>
            );

          case 'h1':
            return (
              <h1
                key={idx}
                className={`font-extrabold mt-4 pb-1.5 border-b select-text ${borderLine} ${sizeClasses.heading1}`}
              >
                {renderLineWithHighlightsAndMarkdown(block.text, highlights, isDark, onRemoveHighlight)}
              </h1>
            );

          case 'h2':
            return (
              <h2
                key={idx}
                className={`font-bold mt-3.5 select-text ${sizeClasses.heading2}`}
                style={{ color: accentColor }}
              >
                {renderLineWithHighlightsAndMarkdown(block.text, highlights, isDark, onRemoveHighlight)}
              </h2>
            );

          case 'h3':
            return (
              <h3
                key={idx}
                className={`font-bold mt-3 select-text ${sizeClasses.heading3}`}
                style={{ color: accentColor }}
              >
                {renderLineWithHighlightsAndMarkdown(block.text, highlights, isDark, onRemoveHighlight)}
              </h3>
            );

          case 'h4':
            return (
              <h4 key={idx} className={`font-semibold mt-2 select-text font-bold ${sizeClasses.heading3}`}>
                {renderLineWithHighlightsAndMarkdown(block.text, highlights, isDark, onRemoveHighlight)}
              </h4>
            );

          case 'h5':
            return (
              <h5 key={idx} className={`font-semibold mt-2 select-text opacity-85 ${sizeClasses.sub}`}>
                {renderLineWithHighlightsAndMarkdown(block.text, highlights, isDark, onRemoveHighlight)}
              </h5>
            );

          case 'p':
          default:
            return (
              <p key={idx} className="break-words select-text leading-relaxed">
                {renderLineWithHighlightsAndMarkdown(block.text, highlights, isDark, onRemoveHighlight)}
              </p>
            );
        }
      })}
    </div>
  );
};

// Color styles for highlighter
export const HIGHLIGHT_STYLES: Record<
  HighlightColor,
  { bg: string; darkBg: string; border: string; label: string; dot: string; markTag: string }
> = {
  yellow: {
    bg: 'bg-amber-300/40 text-stone-900',
    darkBg: 'bg-amber-400/25 text-amber-200 border-amber-400/80',
    border: 'border-b-2 border-amber-500',
    label: '형광 노랑',
    dot: 'bg-amber-400',
    markTag: '==',
  },
  green: {
    bg: 'bg-emerald-300/40 text-stone-900',
    darkBg: 'bg-emerald-400/25 text-emerald-200 border-emerald-400/80',
    border: 'border-b-2 border-emerald-500',
    label: '형광 초록',
    dot: 'bg-emerald-400',
    markTag: '==g:',
  },
  rose: {
    bg: 'bg-rose-300/40 text-stone-900',
    darkBg: 'bg-rose-400/25 text-rose-200 border-rose-400/80',
    border: 'border-b-2 border-rose-500',
    label: '형광 분홍',
    dot: 'bg-rose-400',
    markTag: '==r:',
  },
  blue: {
    bg: 'bg-sky-300/40 text-stone-900',
    darkBg: 'bg-sky-400/25 text-sky-200 border-sky-400/80',
    border: 'border-b-2 border-sky-500',
    label: '형광 하늘',
    dot: 'bg-sky-400',
    markTag: '==b:',
  },
};

function renderLineWithHighlightsAndMarkdown(
  lineText: string,
  highlights: TextHighlight[],
  isDark: boolean,
  onRemoveHighlight?: (id: string) => void
): React.ReactNode {
  if (!highlights || highlights.length === 0) {
    return renderInlineMarkdown(lineText, isDark);
  }

  interface MatchRange {
    start: number;
    end: number;
    highlight: TextHighlight;
  }
  const ranges: MatchRange[] = [];

  for (const h of highlights) {
    if (!h.text || h.text.trim().length === 0) continue;
    let startIndex = 0;
    while ((startIndex = lineText.indexOf(h.text, startIndex)) !== -1) {
      ranges.push({
        start: startIndex,
        end: startIndex + h.text.length,
        highlight: h,
      });
      startIndex += h.text.length;
    }
  }

  if (ranges.length === 0) {
    return renderInlineMarkdown(lineText, isDark);
  }

  ranges.sort((a, b) => a.start - b.start);

  const nonOverlapping: MatchRange[] = [];
  let lastEnd = 0;
  for (const r of ranges) {
    if (r.start >= lastEnd) {
      nonOverlapping.push(r);
      lastEnd = r.end;
    }
  }

  const nodes: React.ReactNode[] = [];
  let curIndex = 0;

  for (let i = 0; i < nonOverlapping.length; i++) {
    const r = nonOverlapping[i];
    if (r.start > curIndex) {
      nodes.push(
        <React.Fragment key={`text-${curIndex}`}>
          {renderInlineMarkdown(lineText.substring(curIndex, r.start), isDark)}
        </React.Fragment>
      );
    }

    const hlStyle = HIGHLIGHT_STYLES[r.highlight.color] || HIGHLIGHT_STYLES.yellow;
    const styleClass = isDark ? hlStyle.darkBg : `${hlStyle.bg} ${hlStyle.border}`;

    nodes.push(
      <mark
        key={`hl-${r.highlight.id}-${r.start}`}
        className={`${styleClass} px-1 py-0.5 rounded cursor-pointer transition-opacity hover:opacity-85 font-medium relative group inline-block border-b-2`}
        title={`마킹됨 (${hlStyle.label}) - 클릭 시 마킹 삭제`}
        onClick={(e) => {
          e.stopPropagation();
          if (onRemoveHighlight) {
            onRemoveHighlight(r.highlight.id);
          }
        }}
      >
        {renderInlineMarkdown(lineText.substring(r.start, r.end), isDark)}
      </mark>
    );

    curIndex = r.end;
  }

  if (curIndex < lineText.length) {
    nodes.push(
      <React.Fragment key={`text-${curIndex}`}>
        {renderInlineMarkdown(lineText.substring(curIndex), isDark)}
      </React.Fragment>
    );
  }

  return nodes;
}

/**
 * Enhanced inline markdown parser that supports:
 * - `inline code`
 * - **bold**
 * - *italic* (with elegant serif styling!)
 * - ~~strikethrough~~
 * - ==highlight==
 * - [//]: # (hidden comments)
 */
function renderInlineMarkdown(text: string, isDark: boolean): React.ReactNode {
  // First strip out any hidden comment blocks in inline text
  const cleaned = text.replace(/\[\/\/\]:\s*#[^\n]*/g, '');

  const parts: React.ReactNode[] = [];
  // Order matters: match code, then bold, then italic, then strike, then mark
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|==(?:([grb]):)?([^=]+)==)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      parts.push(cleaned.substring(lastIndex, match.index));
    }
    const token = match[0];

    if (token.startsWith('`') && token.endsWith('`')) {
      // Inline code
      parts.push(
        <code
          key={key++}
          className={`px-1.5 py-0.5 text-xs font-mono rounded border ${
            isDark
              ? 'bg-white/10 text-stone-200 border-white/15'
              : 'bg-black/5 text-stone-800 border-black/10'
          }`}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      // Bold
      parts.push(
        <strong key={key++} className="font-bold tracking-tight">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      // Italic (이탤릭체 - 소설/캐릭터 지문 및 서술을 위한 감성 이탤릭 폰트 스타일링)
      parts.push(
        <em
          key={key++}
          className={`italic font-serif tracking-wide ${
            isDark ? 'text-stone-300 opacity-95' : 'text-stone-700 opacity-90'
          }`}
        >
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('~~') && token.endsWith('~~')) {
      // Strikethrough
      parts.push(
        <del key={key++} className="line-through opacity-60">
          {token.slice(2, -2)}
        </del>
      );
    } else if (token.startsWith('==') && token.endsWith('==')) {
      // Highlighter tags
      const colorCode = match[2];
      const innerText = match[3];
      let color: HighlightColor = 'yellow';
      if (colorCode === 'g') color = 'green';
      else if (colorCode === 'r') color = 'rose';
      else if (colorCode === 'b') color = 'blue';

      const hlStyle = HIGHLIGHT_STYLES[color] || HIGHLIGHT_STYLES.yellow;
      const styleClass = isDark ? hlStyle.darkBg : `${hlStyle.bg} ${hlStyle.border}`;
      parts.push(
        <mark key={key++} className={`${styleClass} px-1 py-0.5 rounded font-medium inline-block border-b-2`}>
          {innerText}
        </mark>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < cleaned.length) {
    parts.push(cleaned.substring(lastIndex));
  }

  return parts.length > 0 ? parts : cleaned;
}
