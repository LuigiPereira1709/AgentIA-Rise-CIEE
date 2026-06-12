import { Avatar } from '@fluentui/react-components';
import { GooseHeadIcon } from '../RegistrationForm';

interface AgentIconProps {
  alt?: string;
  size?: 'small' | 'medium' | 'large';
  logoUrl?: string;
}

export function AgentIcon({ 
  alt = "AI Assistant", 
  size = 'medium',
  logoUrl
}: AgentIconProps) {
  const sizeMap: Record<string, number> = {
    small: 32,
    medium: 40,
    large: 48,
  };

  if (!logoUrl) {
    const s = sizeMap[size];
    return (
      <div 
        aria-label={alt}
        style={{
          width: s,
          height: s,
          borderRadius: '50%',
          background: 'rgba(15, 23, 42, 0.8)', // Dark slate background
          border: '1px solid rgba(168, 85, 247, 0.4)', // Subtle purple border to match theme
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
          flexShrink: 0
        }}
      >
        <div style={{ transform: `scale(${size === 'small' ? 1.0 : size === 'medium' ? 1.3 : 1.6})`, marginTop: '2px' }}>
          <GooseHeadIcon />
        </div>
      </div>
    );
  }

  return (
    <Avatar
      aria-label={alt}
      image={{ src: logoUrl }}
      size={sizeMap[size] as 16 | 20 | 24 | 28 | 32 | 36 | 40 | 48 | 56 | 64 | 72 | 96 | 120 | 128}
      color="neutral"
    />
  );
}
