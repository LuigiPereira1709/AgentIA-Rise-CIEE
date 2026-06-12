import React from 'react';
import styles from './HomePage.module.css';

export type Page = 'home' | 'registration' | 'chat';

interface HomePageProps {
  onNavigate: (page: Page) => void;
}

const GooseSvg: React.FC = () => (
  <svg 
    viewBox="0 0 80 80" 
    width="110"
    height="110"
    xmlns="http://www.w3.org/2000/svg"
    className={styles.mascotGoose}
    style={{ overflow: 'visible' }}
  >
    <g transform="translate(-10, 0)">
      {/* Body */}
      <ellipse cx="38" cy="52" rx="20" ry="14" fill="#ffffff" stroke="#0c0f1d" strokeWidth="2" />
      {/* Wing hint */}
      <path d="M 22 54 Q 28 60 38 58" fill="none" stroke="#e0e0e0" strokeWidth="1.5" />
      
      {/* Neck */}
      <path d="M 48 42 C 55 32 54 24 54 18" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" fill="none" />
      
      {/* Legs */}
      <line x1="32" y1="64" x2="30" y2="72" stroke="#ff9f1c" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="42" y1="65" x2="44" y2="73" stroke="#ff9f1c" strokeWidth="2.5" strokeLinecap="round" />
      {/* Feet */}
      <line x1="30" y1="72" x2="24" y2="72" stroke="#ff9f1c" strokeWidth="2" strokeLinecap="round" />
      <line x1="44" y1="73" x2="50" y2="73" stroke="#ff9f1c" strokeWidth="2" strokeLinecap="round" />

      {/* Head */}
      <circle cx="54" cy="16" r="14" fill="#ffffff" stroke="#0c0f1d" strokeWidth="2" />
      
      {/* Cheek / Blush */}
      <circle cx="53" cy="21" r="3.5" fill="rgba(255, 90, 95, 0.4)" />

      {/* Eye */}
      <circle cx="58" cy="12" r="2.5" fill="#000000" />

      {/* Beak */}
      <path d="M 64 18.5 Q 70 19 84 18.5 Q 70 23 64 21 Z" fill="#ff9f1c" stroke="#0c0f1d" strokeWidth="1.8" />
      <path d="M 64 16 Q 80 16 84 18.5 Q 70 19 64 18.5 Z" fill="#ff9f1c" stroke="#0c0f1d" strokeWidth="1.8" />
    </g>
  </svg>
);

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  return (
    <div className={styles.page}>
      {/* Background layers */}
      <div className={styles.bgMesh} />
      <div className={styles.bgGrid} />
      <div className={`${styles.blob} ${styles.blob1}`} />
      <div className={`${styles.blob} ${styles.blob2}`} />
      <div className={`${styles.blob} ${styles.blob3}`} />

      {/* Main card */}
      <div className={styles.card}>
        {/* Mascot */}
        <div className={styles.mascotWrapper}>
          <GooseSvg />
          <div className={styles.glowRing} />
        </div>

        {/* Header text */}
        <h1 className={styles.title}>Foundry Agent</h1>
        <p className={styles.subtitle}>
          Selecione uma das opções abaixo para continuar
        </p>

        {/* Navigation buttons */}
        <nav className={styles.navGrid} aria-label="Navegação principal">
          <button
            id="btn-registration"
            className={`${styles.navBtn} ${styles.btnRegistration}`}
            onClick={() => onNavigate('registration')}
            aria-label="Ir para o cadastro"
          >
            <span className={`${styles.iconBadge} ${styles.iconBadgeRegistration}`}>
              📝
            </span>
            <span className={styles.btnTextGroup}>
              <span className={styles.btnLabel}>Cadastro</span>
              <span className={styles.btnDesc}>Registre suas informações no sistema</span>
            </span>
            <span className={styles.btnArrow}>›</span>
          </button>

          <button
            id="btn-chat"
            className={`${styles.navBtn} ${styles.btnChat}`}
            onClick={() => onNavigate('chat')}
            aria-label="Ir para o chatbot"
          >
            <span className={`${styles.iconBadge} ${styles.iconBadgeChat}`}>
              💬
            </span>
            <span className={styles.btnTextGroup}>
              <span className={styles.btnLabel}>Chatbot</span>
              <span className={styles.btnDesc}>Converse com o agente de IA</span>
            </span>
            <span className={styles.btnArrow}>›</span>
          </button>
        </nav>

        <p className={styles.footerNote}>HONK · Powered by Azure AI Foundry</p>
      </div>
    </div>
  );
};
