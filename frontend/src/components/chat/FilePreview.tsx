import { makeStyles } from '@fluentui/react-components';
import { 
  Dismiss24Regular, 
  ImageRegular, 
  DocumentPdfRegular,
  DocumentRegular,
  DocumentTextRegular,
  CodeRegular
} from '@fluentui/react-icons';

import { getEffectiveMimeType } from '../../utils/fileAttachments';


const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '4px 0',
    backgroundColor: 'transparent',
    marginBottom: '8px',
  },
  previewItem: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    paddingRight: '6px', /* less padding on right because of close button */
    borderRadius: '999px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'background-color 0.2s ease, border-color 0.2s ease',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
      borderTopColor: 'rgba(168, 85, 247, 0.3)',
      borderRightColor: 'rgba(168, 85, 247, 0.3)',
      borderBottomColor: 'rgba(168, 85, 247, 0.3)',
      borderLeftColor: 'rgba(168, 85, 247, 0.3)',
    }
  },
  iconWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#818cf8', /* Soft blue/purple */
  },
  fileName: {
    fontSize: '13px',
    fontFamily: 'Outfit, sans-serif',
    fontWeight: 500,
    color: '#ffffff',
    maxWidth: '140px', /* Reduced to save space and trigger abbreviation sooner */
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: '1',
  },
  removeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.5)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '50%',
    marginLeft: '2px',
    transition: 'color 0.2s ease, background-color 0.2s ease',
    '&:hover': {
      color: '#ffffff',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    }
  },
});

interface FilePreviewProps {
  files: File[];
  onRemove: (index: number) => void;
  disabled?: boolean;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ files, onRemove, disabled }) => {
  const styles = useStyles();

  const getFileIcon = (file: File, size = 20) => {
    const mimeType = getEffectiveMimeType(file);

    if (mimeType.startsWith('image/')) {
      return <ImageRegular fontSize={size} aria-hidden="true" />;
    }
    if (mimeType === 'application/pdf') {
      return <DocumentPdfRegular fontSize={size} aria-hidden="true" />;
    }
    if (mimeType === 'application/json' || mimeType === 'text/xml' || mimeType === 'application/xml' || mimeType === 'text/html') {
      return <CodeRegular fontSize={size} aria-hidden="true" />;
    }
    if (mimeType === 'text/plain' || mimeType === 'text/markdown' || mimeType === 'text/csv') {
      return <DocumentTextRegular fontSize={size} aria-hidden="true" />;
    }
    return <DocumentRegular fontSize={size} aria-hidden="true" />;
  };

  if (files.length === 0) return null;

  return (
    <div className={styles.container} role="list" aria-label="Attached files">
      {files.map((file, index) => {
        const fileKey = `${file.name}-${file.size}-${index}`;
        
        return (
          <div key={fileKey} className={styles.previewItem} role="listitem" title={file.name}>
            <div className={styles.iconWrapper}>
              {getFileIcon(file, 20)}
            </div>
            <span className={styles.fileName}>
              {file.name}
            </span>
            <button
              onClick={() => onRemove(index)}
              disabled={disabled}
              aria-label={`Remove ${file.name}`}
              className={styles.removeButton}
            >
              <Dismiss24Regular fontSize={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
