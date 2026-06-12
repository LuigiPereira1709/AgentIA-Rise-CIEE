import type { ReactNode } from 'react';
import { AgentIcon } from '../core/AgentIcon';
import { GooseHeadIcon } from '../RegistrationForm';
import styles from './StarterMessages.module.css';

interface IStarterMessageProps {
  agentName?: string;
  agentDescription?: string;
  agentLogo?: string;
  starterPrompts?: string[];
  onPromptClick?: (prompt: string) => void;
}

// Prompts padrão em PT-BR mais gamificados e contextuais
const defaultStarterPrompts = [
  "Como funciona o sistema de cadastro?",
  "Quais são suas capacidades?",
  "Me conte uma curiosidade sobre gansos!",
];



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
              <div style={{ transform: 'scale(2.5)', transformOrigin: 'center', marginTop: '20px' }}>
                <GooseHeadIcon />
              </div>
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
