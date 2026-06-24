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

// Prompts padrão em PT-BR mais gamificados e contextuais
const defaultStarterPrompts = [
  "Como funciona o sistema de cadastro?",
  "Quais são suas capacidades?",
  "Me conte uma curiosidade sobre corujas!",
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

        {/* Logo superior removido para evitar redundância com o texto */}

        {/* Saudação */}
        <h2 className={styles.welcome} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '6px' }}>
          {agentName === 'Lumi' || agentName === 'Assistente CIEE' ? (
            <>
              Olá! Sou Lumi, Assistente
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <AgentIcon size="large" logoUrl={agentLogo} />
              </div>
              👋
            </>
          ) : (
            agentName ? `Olá! Sou ${agentName} 👋` : 'Olá! Como posso ajudar? 👋'
          )}
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
