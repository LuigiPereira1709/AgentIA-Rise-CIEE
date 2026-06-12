import React from 'react';
import styles from './HomePage.module.css';

export type Page = 'home' | 'registration' | 'chat';

interface HomePageProps {
  onNavigate: (page: Page) => void;
}

// Inline SVG goose (minimal, matching the mascot style)
const GooseSvg: React.FC = () => (
  <svg
    viewBox="0 0 90 90"
    width="88"
    height="88"
    xmlns="http://www.w3.org/2000/svg"
    className={styles.mascotGoose}
  >
    {/* Body */}
    <ellipse cx="45" cy="60" rx="26" ry="22" fill="#f5f5f0" />
    {/* Head */}
    <circle cx="62" cy="32" r="16" fill="#f5f5f0" />
    {/* Beak */}
    <path d="M76 32 L86 30 L86 34 Z" fill="#f5a623" />
    {/* Eye */}
    <circle cx="67" cy="28" r="3" fill="#1a1a2e" />
    <circle cx="68" cy="27" r="1" fill="white" />
    {/* Wing */}
    <path d="M22 58 Q18 45 30 42 Q40 44 38 60 Z" fill="#e8e8e0" />
    {/* Tail */}
    <path d="M22 72 Q12 68 16 60 Q24 64 26 74 Z" fill="#e8e8e0" />
    {/* Feet */}
    <line x1="38" y1="80" x2="34" y2="88" stroke="#f5a623" strokeWidth="3" strokeLinecap="round" />
    <line x1="34" y1="88" x2="28" y2="88" stroke="#f5a623" strokeWidth="3" strokeLinecap="round" />
    <line x1="34" y1="88" x2="34" y2="92" stroke="#f5a623" strokeWidth="3" strokeLinecap="round" />
    <line x1="52" y1="80" x2="48" y2="88" stroke="#f5a623" strokeWidth="3" strokeLinecap="round" />
    <line x1="48" y1="88" x2="42" y2="88" stroke="#f5a623" strokeWidth="3" strokeLinecap="round" />
    <line x1="48" y1="88" x2="48" y2="92" stroke="#f5a623" strokeWidth="3" strokeLinecap="round" />
    {/* Neck */}
    <path d="M50 46 Q58 38 62 46 Q58 52 48 56 Z" fill="#f5f5f0" />
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
