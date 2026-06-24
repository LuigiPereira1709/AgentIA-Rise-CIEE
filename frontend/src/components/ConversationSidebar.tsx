import React, { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import {
  Drawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
  Button,
  Spinner,
  Text,
  Input,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  Dismiss24Regular,
  ChatAdd24Regular,
  Delete24Regular,
  Search24Regular,
  DismissCircle24Regular,
} from '@fluentui/react-icons';
import type { ConversationSummary } from '../types/appState';

interface ConversationSidebarProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: ConversationSummary[];
  isLoading: boolean;
  hasMore: boolean;
  currentConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onLoadMore: () => void;
  onNavigateToRegister?: () => void;
  onBack?: () => void;
}

const useStyles = makeStyles({
  drawer: {
    width: '320px',
    backgroundColor: 'var(--ciee-bg-alt) !important',
    borderRight: '1px solid var(--ciee-primary-light) !important',
    color: 'var(--ciee-text-body) !important',
  },
  headerTitle: {
    color: 'var(--ciee-text-h1)',
    fontSize: '18px',
    fontWeight: 600,
    fontFamily: 'Outfit, sans-serif',
  },
  newChatButton: {
    width: '100%',
    marginBottom: tokens.spacingVerticalM,
  },
  conversationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  conversationItem: {
    display: 'flex',
    alignItems: 'center',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'transparent',
    width: '100%',
    textAlign: 'left',
    gap: tokens.spacingHorizontalS,
    color: 'var(--ciee-text-sub)',
    transition: 'background-color 0.2s ease, color 0.2s ease',
    '&:hover': {
      backgroundColor: 'var(--ciee-bg-card)',
      color: 'var(--ciee-primary)',
    },
  },
  conversationItemActive: {
    backgroundColor: 'var(--ciee-bg-primary) !important',
    color: 'var(--ciee-primary)',
    borderLeft: '3px solid var(--ciee-primary)',
    boxShadow: '0 2px 8px rgba(91, 42, 140, 0.05)',
  },
  conversationContent: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  conversationTitle: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontWeight: 600,
  },
  conversationDate: {
    fontSize: tokens.fontSizeBase100,
    color: 'var(--ciee-text-muted)',
  },
  deleteButton: {
    flexShrink: 0,
    opacity: 0,
    color: 'var(--ciee-text-muted)',
    '.conversation-item:hover &, .conversation-item:focus-within &': {
      opacity: 1,
    },
    ':focus': {
      opacity: 1,
    },
    '&:hover': {
      color: 'var(--ciee-coral)',
    }
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacingVerticalXXL,
    color: 'var(--ciee-text-body)',
    textAlign: 'center',
  },
  spinnerContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: tokens.spacingVerticalXXL,
  },
  loadMoreButton: {
    width: '100%',
    marginTop: tokens.spacingVerticalS,
  },
  searchBox: {
    marginBottom: tokens.spacingVerticalS,
  },
  noResults: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacingVerticalL,
    color: 'var(--ciee-text-body)',
    textAlign: 'center',
  },
});

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000); // Backend sends Unix seconds
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  isOpen,
  onOpenChange,
  conversations,
  isLoading,
  hasMore,
  currentConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onLoadMore,
  onNavigateToRegister,
  onBack,
}) => {
  const styles = useStyles();
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearchChange = useCallback((_: React.ChangeEvent<HTMLInputElement>, data: { value: string }) => {
    setSearchQuery(data.value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(data.value);
    }, 300);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const filteredConversations = useMemo(() => {
    if (!debouncedQuery.trim()) return conversations;
    const query = debouncedQuery.toLowerCase();
    return conversations.filter(c => c.title?.toLowerCase().includes(query));
  }, [conversations, debouncedQuery]);

  const handleDelete = useCallback(
    (e: React.MouseEvent, conversationId: string) => {
      e.stopPropagation();
      onDeleteConversation(conversationId);
    },
    [onDeleteConversation]
  );

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(_, { open }) => onOpenChange(open)}
      position="start"
      className={styles.drawer}
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          className={styles.headerTitle}
          action={
            <Button
              appearance="subtle"
              aria-label="Close menu"
              icon={<Dismiss24Regular />}
              onClick={() => onOpenChange(false)}
              style={{ color: 'var(--ciee-text-muted)' }}
            />
          }
        >
          Menu
        </DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody>
        <Button
          appearance="primary"
          icon={<ChatAdd24Regular />}
          className={styles.newChatButton}
          onClick={() => {
            onNewChat(); // Restarts the registration chat flow
            onOpenChange(false);
          }}
        >
          Recomeçar Cadastro
        </Button>

        {onBack && (
          <Button
            appearance="outline"
            style={{ width: '100%', marginBottom: '16px' }}
            onClick={() => {
              onBack();
              onOpenChange(false);
            }}
          >
            Sair e Voltar ao Início
          </Button>
        )}
      </DrawerBody>
    </Drawer>
  );
};
