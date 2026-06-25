import React from 'react';
import styles from './HomePage.module.css';

export type Page = 'home' | 'registration' | 'chat';

interface HomePageProps {
  onNavigate: (page: Page) => void;
}

export const CieeLogo: React.FC = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="110" 
    height="50" 
    viewBox="0 0 110 43" 
    fill="none"
    className={styles.mascotGoose}
    style={{ overflow: 'visible' }}
  >
    <g clipPath="url(#clip0_728_1711)">
      <path d="M98.0945 19.8467H109.937V15.2505H92.3088C87.5843 15.2505 85.4502 18.1124 85.4395 22.9254V35.3251C85.4292 40.1383 87.5858 43 92.3098 43H109.938V38.4039H98.0954C96.5782 38.4039 96.0041 37.8408 96.015 36.6694V30.9009H109.903V26.3754H96.0141L96.0146 21.5811C96.025 20.4104 96.5774 19.8467 98.0945 19.8467Z" fill="#024089"></path>
      <path d="M53.4162 8.03357C53.4162 11.1466 50.8939 13.6707 47.7814 13.6707C44.6695 13.6707 42.1467 11.1466 42.1467 8.03357C42.1467 4.91992 44.6695 2.39648 47.7814 2.39648C50.8939 2.39648 53.4162 4.91992 53.4162 8.03357Z" fill="#ED6B06"></path>
      <path d="M13.6975 34.2478L13.6993 35.3251C13.6888 40.1383 15.8342 43 20.5581 43H38.1868V38.4039H26.344C24.8267 38.4039 24.2527 37.8408 24.2638 36.6694L24.2636 34.2436C20.5566 34.3992 16.995 34.3996 13.6975 34.2478Z" fill="#024089"></path>
      <path d="M42.3154 43H52.89L52.8894 28.8292C49.8097 30.261 46.281 31.442 42.3149 32.2741L42.3154 43Z" fill="#024089"></path>
      <path d="M81.7475 38.4039H69.9158C68.3988 38.4039 67.8245 37.8408 67.8352 36.6694V30.9009H81.7237V26.3754H67.8352L67.8347 21.5811C67.8454 20.4104 68.3976 19.8467 69.9147 19.8467H81.7471L81.7682 15.2505H67.212C65.6595 19.2717 62.3089 23.2367 57.2554 26.4498L57.2708 35.3251C57.2605 40.1383 59.4058 43 64.13 43H81.7695L81.7475 38.4039Z" fill="#024089"></path>
      <path d="M66.3024 6.08646C65.0595 2.75308 62.5683 0.954758 59.0584 0.000457764C60.3841 0.964821 61.5418 2.21134 62.0907 3.98626C63.965 10.0439 60.4951 16.7409 52.8893 21.9867L52.8891 15.2506H42.3144L42.315 27.2876C39.7498 28.2093 36.9725 29.0005 33.9957 29.6294C30.6057 30.3459 27.3788 30.8477 24.2637 31.195L24.2632 21.5812C24.2739 20.4104 24.8263 19.8467 26.3434 19.8467H38.1856V15.2506H20.5571C15.8332 15.2506 13.6881 18.1125 13.6773 22.9255L13.6933 31.8634C9.05566 31.9565 4.55706 31.8232 0 31.6887C8.15369 33.9594 23.7486 33.9668 37.2176 32.0272C58.5395 28.9556 69.9174 15.7835 66.3024 6.08646Z" fill="#024089"></path>
    </g>
    <defs>
      <clipPath id="clip0_728_1711">
        <rect width="109.938" height="43" fill="white"></rect>
      </clipPath>
    </defs>
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
          <CieeLogo />
          <div className={styles.glowRing} />
        </div>

        <h1 className={styles.welcomeTitle}>
          Seja bem-vindo(a) ao CIEE!
        </h1>

        <p className={styles.description}>
          Para iniciar seu processo cadastral de forma simples e conversacional, clique no botão abaixo. Nosso assistente virtual guiará você passo a passo na coleta dos dados necessários com total segurança e em conformidade com a LGPD.
        </p>

        {/* Navigation buttons */}
        <nav className={styles.navGrid} aria-label="Navegação principal">
          {/* <button
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
          </button> */}

          <button
            id="btn-chat"
            className={`${styles.navBtn} ${styles.btnChat}`}
            onClick={() => onNavigate('chat')}
            aria-label="Iniciar Cadastro"
          >
            <span className={`${styles.iconBadge} ${styles.iconBadgeChat}`}>
              💬
            </span>
            <span className={styles.btnTextGroup}>
              <span className={styles.btnLabel}>Iniciar Cadastro</span>
              <span className={styles.btnDesc}>Faça seu cadastro com a ajuda do nosso assistente</span>
            </span>
            <span className={styles.btnArrow}>›</span>
          </button>
        </nav>
      </div>
    </div>
  );
};
