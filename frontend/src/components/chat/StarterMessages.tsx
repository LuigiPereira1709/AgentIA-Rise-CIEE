import type { ReactNode } from 'react';
import { AgentIcon } from '../core/AgentIcon';
import styles from './StarterMessages.module.css';

interface IStarterMessageProps {
  agentName?: string;
  agentDescription?: string;
  agentLogo?: string;
  starterPrompts?: string[];
  onPromptClick?: (prompt: string) => void;
}

// Prompts padrão em PT-BR quando não há configuração no Foundry
const defaultStarterPrompts = [
  "Como você pode me ajudar?",
  "Quais são suas capacidades?",
  "Me conte sobre você",
];

// Ganso SVG minimalista para a tela de boas-vindas
const WelcomeGoose = () => (
  <svg viewBox="0 0 90 90" width="64" height="64" xmlns="http://www.w3.org/2000/svg" className={styles.gooseSvg}>
    <ellipse cx="45" cy="62" rx="24" ry="19" fill="#f0f0eb" />
    <circle cx="61" cy="34" r="14" fill="#f0f0eb" />
    <path d="M73 34 L82 32 L82 36 Z" fill="#f5a623" />
    <circle cx="66" cy="30" r="2.5" fill="#1a1a2e" />
    <circle cx="67" cy="29" r="0.9" fill="white" />
    <circle cx="57.5" cy="52.5" r="3" fill="rgba(255,90,95,0.35)" />
    <path d="M24 60 Q20 48 31 45 Q40 47 38 62 Z" fill="#e4e4de" />
    <path d="M22 74 Q13 70 17 62 Q25 66 27 76 Z" fill="#e4e4de" />
    <line x1="38" y1="80" x2="34" y2="88" stroke="#f5a623" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="34" y1="88" x2="28" y2="88" stroke="#f5a623" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="50" y1="80" x2="46" y2="88" stroke="#f5a623" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="46" y1="88" x2="40" y2="88" stroke="#f5a623" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M49 48 Q57 40 61 48 Q57 53 47 57 Z" fill="#f0f0eb" />
  </svg>
);

export const StarterMessages = ({
  agentName,
  agentDescription,
  agentLogo,
  starterPrompts,
  onPromptClick,
}: IStarterMessageProps): ReactNode => {
  const prompts = starterPrompts && starterPrompts.length > 0
    ? starterPrompts
    : defaultStarterPrompts;

  return (
    <div className={styles.zeroprompt}>
      <div className={styles.content}>

        {/* Avatar / logo do agente com ganso de fallback */}
        <div className={styles.avatarArea}>
          {agentLogo ? (
            <AgentIcon alt={agentName ?? 'Agente'} size="large" logoUrl={agentLogo} />
          ) : (
            <div className={styles.gooseWrapper}>
              <WelcomeGoose />
              <div className={styles.gooseGlow} />
            </div>
          )}
        </div>

        {/* Saudação */}
        <h2 className={styles.welcome}>
          {agentName ? `Olá! Sou ${agentName} 👋` : 'Olá! Como posso ajudar? 👋'}
        </h2>

        {agentDescription ? (
          <p className={styles.caption}>{agentDescription}</p>
        ) : (
          <p className={styles.caption}>
            Estou aqui para responder suas dúvidas e ajudar no que precisar.
            Clique em uma sugestão abaixo ou escreva sua mensagem!
          </p>
        )}
      </div>

      {/* Prompts de início */}
      {onPromptClick && (
        <ul className={styles.promptList} aria-label="Sugestões de perguntas">
          {prompts.map((prompt, index) => (
            <li key={`prompt-${index}`}>
              <button
                className={styles.promptCard}
                onClick={() => onPromptClick(prompt)}
                type="button"
                title={prompt}
                id={`starter-prompt-${index}`}
              >
                <span className={styles.promptIcon}>💬</span>
                <span className={styles.promptText}>{prompt}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
