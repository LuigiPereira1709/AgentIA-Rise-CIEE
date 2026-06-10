import React, { useState, useEffect } from 'react';
import { Button, Card, Text } from '@fluentui/react-components';
import { Dismiss12Regular } from '@fluentui/react-icons';
import alienImage from '../assets/alien_mascot.png';
import styles from './AlienMascot.module.css';

const ALIEN_PHRASES = [
  "Saudações, terráqueo! Precisa de uma ajudinha? O robô ali no canto direito sabe de tudo!",
  "Sabia que no meu planeta natal também usamos o Microsoft Foundry para gerenciar agentes?",
  "Preencha o formulário com calma. Lembre-se: no espaço, o tempo é relativo!",
  "Hum... que e-mail corporativo interessante. De qual galáxia ele veio?",
  "Se tiver dúvidas sobre qual cargo preencher, pergunte para o meu colega ali no chat!",
  "A gravidade aqui na Terra é um pouco pesada, mas seu cadastro vai ser super leve!",
  "Bip bip! Conectando com a base lunar... Cadastro quase pronto para decolagem!",
  "Gostei do seu planeta! O céu azul combina com o neon da minha nave.",
];

export const AlienMascot: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentPhrase, setCurrentPhrase] = useState('');

  useEffect(() => {
    // 1. Show the alien 5 seconds after mounting
    const initialTimer = setTimeout(() => {
      triggerAlien();
    }, 5000);

    // 2. Periodically check to trigger the alien every 40 seconds
    const interval = setInterval(() => {
      // 70% chance to trigger if not already visible
      if (!isVisible && Math.random() < 0.7) {
        triggerAlien();
      }
    }, 40000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [isVisible]);

  const triggerAlien = () => {
    const randomIndex = Math.floor(Math.random() * ALIEN_PHRASES.length);
    setCurrentPhrase(ALIEN_PHRASES[randomIndex]);
    setIsVisible(true);

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      setIsVisible(false);
    }, 8500);
  };

  if (!isVisible) return null;

  return (
    <div className={styles.mascotContainer}>
      {/* Speech Bubble */}
      <Card className={styles.speechBubble} appearance="filled">
        <div className={styles.bubbleHeader}>
          <Text weight="semibold" className={styles.alienName}>
            Zoggy
          </Text>
          <Button
            appearance="subtle"
            size="small"
            icon={<Dismiss12Regular />}
            onClick={() => setIsVisible(false)}
            className={styles.closeButton}
            aria-label="Dismiss message"
          />
        </div>
        <p className={styles.phraseText}>{currentPhrase}</p>
        <div className={styles.bubbleArrow} />
      </Card>

      {/* Floating Alien Image */}
      <img
        src={alienImage}
        alt="Zoggy the alien mascot"
        className={styles.alienImage}
        onClick={triggerAlien} // Change phrase on click if clicked
        title="Clique para outra frase!"
      />
    </div>
  );
};
