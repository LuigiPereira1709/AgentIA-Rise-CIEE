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
          {agentName === 'Lumi' || agentName === 'Assistente CIEE' || agentName === 'Assistente CIEE Rio' ? (
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
            Escreva sua mensagem abaixo para começarmos!
          </p>
        )}
      </div>
    </div>
  );
};
