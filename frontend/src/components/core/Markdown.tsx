import type { ClassAttributes, HTMLAttributes } from 'react';
import type { Components, ExtraProps } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import copy from 'copy-to-clipboard';
import { Button } from '@fluentui/react-components';
import { CopyRegular, CheckmarkRegular } from '@fluentui/react-icons';
import React, { memo, useState, useMemo } from 'react';
import { CitationMarker } from '../chat/CitationMarker';
import { parseContentWithCitations } from '../../utils/citationParser';
import type { IAnnotation } from '../../types/chat';
import styles from './Markdown.module.css';

interface MarkdownProps {
  content: string;
  /** Annotations for inline citation rendering */
  annotations?: IAnnotation[];
  /** Callback when a citation marker is clicked */
  onCitationClick?: (index: number, annotation?: IAnnotation) => void;
  /** Callback to download a file by ID (for sandbox: links) */
  onDownloadFile?: (fileId: string, fileName: string, containerId?: string) => void;
  /** Callback when an option choice button is clicked */
  onChoiceClick?: (choice: string) => void;
  /** Flag to disable choice button interactions once used or outdated */
  choicesDisabled?: boolean;
}

interface CodeBlockProps
  extends ClassAttributes<HTMLElement>,
    HTMLAttributes<HTMLElement>,
    ExtraProps {
  inline?: boolean;
}

// Custom paragraph component - render inline for chat messages
const Paragraph: Components['p'] = ({ children }) => {
  return <span className={styles.paragraph}>{children} </span>;
};

// Enhanced code block with syntax highlighting and copy button
const CodeBlock = memo<CodeBlockProps>(
  ({ inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className ?? '');
    const [copied, setCopied] = useState(false);

    if (inline || !match) {
      return (
        <code {...props} className={styles.inlineCode}>
          {children}
        </code>
      );
    }

    const language = match[1];
    const content = String(children)
      .replace(/\n$/, '')
      .replaceAll('&nbsp;', '');

    const handleCopy = () => {
      copy(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className={styles.codeBlock}>
        <div className={styles.codeHeader}>
          <span className={styles.codeLanguage}>{language}</span>
          <Button
            appearance="subtle"
            icon={copied ? <CheckmarkRegular /> : <CopyRegular />}
            size="small"
            onClick={handleCopy}
            className={`${styles.copyButton} ${copied ? styles.copyButtonCopied : ''}`}
            aria-label={copied ? 'Copied' : 'Copy code'}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          showLineNumbers={true}
          wrapLines={true}
          wrapLongLines={true}
          customStyle={{
            margin: 0,
            borderBottomLeftRadius: '6px',
            borderBottomRightRadius: '6px',
            fontSize: '0.9em',
            maxWidth: '100%',
            overflowX: 'auto',
          }}
          codeTagProps={{
            style: {
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
            }
          }}
          PreTag="div"
        >
          {content}
        </SyntaxHighlighter>
      </div>
    );
  }
);

CodeBlock.displayName = 'CodeBlock';

// Default link component (no download capability)
const Link: Components['a'] = ({ href, children }) => {
  if (!href || href.startsWith('sandbox:')) {
    return <span className={styles.link}>{children}</span>;
  }
  return (
    <a href={href} className={styles.link} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
};

// Default image component
const Image: Components['img'] = ({ src, alt }) => {
  if (!src || src.startsWith('sandbox:')) {
    return null;
  }
  return <img src={src} alt={alt ?? ''} className={styles.image} />;
};

/** Find an annotation whose label matches the filename in a sandbox: URL */
function findAnnotationByFilename(sandboxUrl: string, annotationMap: Map<string, IAnnotation>): IAnnotation | undefined {
  const filename = sandboxUrl.split('/').pop()?.toLowerCase();
  return filename ? annotationMap.get(filename) : undefined;
}

/** Create Link/Image components that trigger file downloads for sandbox: URLs */
function createDownloadableComponents(
  annotations?: IAnnotation[],
  onDownloadFile?: (fileId: string, fileName: string, containerId?: string) => void,
) {
  // Pre-compute filename → annotation map for O(1) lookups
  const annotationMap = new Map<string, IAnnotation>();
  if (annotations) {
    for (const a of annotations) {
      if ((a.type === 'container_file_citation' || a.type === 'file_path') && a.fileId && a.label) {
        annotationMap.set(a.label.toLowerCase(), a);
      }
    }
  }

  const DownloadLink: Components['a'] = ({ href, children }) => {
    if (!href || href.startsWith('sandbox:')) {
      const match = href ? findAnnotationByFilename(href, annotationMap) : undefined;
      if (match?.fileId && onDownloadFile) {
        return (
          <a
            href="#"
            className={styles.link}
            aria-label={`Download ${match.label}`}
            onClick={(e) => { e.preventDefault(); onDownloadFile(match.fileId!, match.label, match.containerId); }}
          >
            {children}
          </a>
        );
      }
      return <span className={styles.link}>{children}</span>;
    }
    return (
      <a href={href} className={styles.link} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  };

  const DownloadImage: Components['img'] = ({ src, alt }) => {
    if (!src || src.startsWith('sandbox:')) {
      return null;
    }
    return <img src={src} alt={alt ?? ''} className={styles.image} />;
  };

  return { a: DownloadLink, img: DownloadImage };
}

// Custom list components
const UnorderedList: Components['ul'] = ({ children }) => {
  return <ul className={styles.list}>{children}</ul>;
};

const OrderedList: Components['ol'] = ({ children }) => {
  return <ol className={styles.list}>{children}</ol>;
};

const ListItem: Components['li'] = ({ children }) => {
  return <li className={styles.listItem}>{children}</li>;
};

// Custom heading components
const Heading: Components['h1'] = ({ children, ...props }) => {
  return <h1 className={styles.heading1} {...props}>{children}</h1>;
};

const Heading2: Components['h2'] = ({ children, ...props }) => {
  return <h2 className={styles.heading2} {...props}>{children}</h2>;
};

const Heading3: Components['h3'] = ({ children, ...props }) => {
  return <h3 className={styles.heading3} {...props}>{children}</h3>;
};

const Heading4: Components['h4'] = ({ children, ...props }) => {
  return <h4 className={styles.heading4} {...props}>{children}</h4>;
};

const Heading5: Components['h5'] = ({ children, ...props }) => {
  return <h5 className={styles.heading5} {...props}>{children}</h5>;
};

const Heading6: Components['h6'] = ({ children, ...props }) => {
  return <h6 className={styles.heading6} {...props}>{children}</h6>;
};

// Shared rehype sanitize config
const rehypeSanitizeConfig = [
  rehypeSanitize,
  {
    ...defaultSchema,
    tagNames: [...(defaultSchema.tagNames ?? []), 'sub', 'sup'],
    attributes: {
      ...defaultSchema.attributes,
      code: [['className', /^language-./]],
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
] as [typeof rehypeSanitize, any];

// Shared base components (without paragraph - that varies)
const baseComponents = {
  code: CodeBlock,
  a: Link,
  img: Image,
  ul: UnorderedList,
  ol: OrderedList,
  li: ListItem,
  h1: Heading,
  h2: Heading2,
  h3: Heading3,
  h4: Heading4,
  h5: Heading5,
  h6: Heading6,
};

function ContentWithCitations({ 
  content, 
  annotations,
  onCitationClick,
  onDownloadFile,
  onChoiceClick,
  choicesDisabled,
}: { 
  content: string; 
  annotations?: IAnnotation[];
  onCitationClick?: (index: number, annotation?: IAnnotation) => void;
  onDownloadFile?: (fileId: string, fileName: string, containerId?: string) => void;
  onChoiceClick?: (choice: string) => void;
  choicesDisabled?: boolean;
}) {
  const parsed = useMemo(
    () => parseContentWithCitations(content, annotations),
    [content, annotations]
  );
 
  // Build components with download support for sandbox: URLs and interactive choices
  const components = useMemo(() => {
    const customComponents = { ...baseComponents };

    if (onDownloadFile && annotations?.length) {
      const downloadable = createDownloadableComponents(annotations, onDownloadFile);
      Object.assign(customComponents, downloadable);
    }

    if (onChoiceClick) {
      customComponents.ol = ({ children }) => {
        const arrayChildren = React.Children.toArray(children);
        const validItems = arrayChildren.filter(child => React.isValidElement(child));

        // Detect if this is an options choice list (e.g. sex, civil status, school level)
        // by verifying all valid children are short enough.
        const isChoiceList = validItems.length > 0 && validItems.every(child => {
          if (React.isValidElement(child)) {
            const props = child.props as any;
            const text = getTextContent(props?.children).trim();
            return text.length > 0 && text.length < 60;
          }
          return false;
        });

        if (isChoiceList) {
          return (
            <div className={styles.optionsContainer}>
              {validItems.map((child, index) => {
                if (React.isValidElement(child)) {
                  const props = child.props as any;
                  const liChildren = props?.children;
                  const textContent = getTextContent(liChildren);
                  return (
                    <button
                      key={`opt-${index}`}
                      type="button"
                      className={styles.optionButton}
                      disabled={choicesDisabled}
                      onClick={() => !choicesDisabled && onChoiceClick(textContent)}
                    >
                      <span className={styles.optionNumber}>{index + 1}</span>
                      <span className={styles.optionText}>{liChildren}</span>
                    </button>
                  );
                }
                return child;
              })}
            </div>
          );
        }

        return <ol className={styles.list}>{children}</ol>;
      };
    }

    return customComponents;
  }, [annotations, onDownloadFile, onChoiceClick, choicesDisabled]);

  // If no citations, render plain markdown
  if (parsed.citations.length === 0) {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeSanitizeConfig]}
        components={{ p: Paragraph, ...components }}
      >
        {content}
      </ReactMarkdown>
    );
  }

  // Build citation index map for quick lookup
  const citationMap = new Map(
    parsed.citations.map(c => [c.index, c.annotation])
  );

  // Custom text renderer that handles [N] markers
  const TextWithCitations: Components['p'] = ({ children }) => {
    // children can be a string or array of React nodes
    const processNode = (node: React.ReactNode): React.ReactNode => {
      if (typeof node !== 'string') {
        return node;
      }

      // Split text on citation markers [N]
      const parts = node.split(/(\[\d+\])/g);
      
      return parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
          const idx = parseInt(match[1], 10);
          const annotation = citationMap.get(idx);
          return onCitationClick ? (
            <CitationMarker
              key={`citation-${idx}-${i}`}
              index={idx}
              annotation={annotation}
              onClick={onCitationClick}
            />
          ) : (
            <sup key={`citation-${idx}-${i}`}>[{idx}]</sup>
          );
        }
        return part;
      });
    };

    const processed = Array.isArray(children)
      ? children.map(processNode)
      : processNode(children);

    return <span className={styles.paragraph}>{processed} </span>;
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      rehypePlugins={[rehypeSanitizeConfig]}
      components={{ p: TextWithCitations, ...components }}
    >
      {parsed.processedText}
    </ReactMarkdown>
  );
}

export function Markdown({ content, annotations, onCitationClick, onDownloadFile, onChoiceClick, choicesDisabled }: MarkdownProps) {
  const [hasClicked, setHasClicked] = useState(false);

  const handleChoiceClick = (choice: string) => {
    setHasClicked(true);
    if (onChoiceClick) {
      onChoiceClick(choice);
    }
  };

  return (
    <div className={styles.markdown}>
      <ContentWithCitations 
        content={content} 
        annotations={annotations}
        onCitationClick={onCitationClick}
        onDownloadFile={onDownloadFile}
        onChoiceClick={onChoiceClick ? handleChoiceClick : undefined}
        choicesDisabled={choicesDisabled || hasClicked}
      />
    </div>
  );
}

/** Recursively extracts plain text content from React nodes */
function getTextContent(node: React.ReactNode): string {
  if (!node) return '';
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(getTextContent).join('');
  }
  if (React.isValidElement(node) && node.props) {
    return getTextContent((node.props as any).children);
  }
  return '';
}
