import React, { useState, useEffect } from 'react';
import { Button, Card, Text } from '@fluentui/react-components';
import { Dismiss12Regular } from '@fluentui/react-icons';
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

    // Auto-dismiss after 8.5 seconds
    setTimeout(() => {
      setIsVisible(false);
    }, 8500);
  };

  return (
    <div className={styles.alienContainer}>
      {/* Speech Bubble */}
      {isVisible && (
        <Card className={styles.speechBubble} appearance="filled">
          <div className={styles.bubbleHeader}>
            <Text weight="semibold" className={styles.alienName}>
              Lumi
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
      )}

      {/* CSS-drawn Alien Mascot */}
      <div
        className={styles.alienCharacter}
        onClick={triggerAlien}
        title="Clique para outra frase!"
      >
        {/* Antennas */}
        <div className={styles.antennas}>
          <div className={styles.antennaLeft}>
            <div className={styles.antennaStalk} />
            <div className={styles.antennaBulb} />
          </div>
          <div className={styles.antennaRight}>
            <div className={styles.antennaStalk} />
            <div className={styles.antennaBulb} />
          </div>
        </div>

        {/* Head */}
        <div className={styles.alienHead}>
          {/* Eyes */}
          <div className={styles.eyeLeft}>
            <div className={styles.eyePupil}>
              <div className={styles.eyeHighlightLarge} />
              <div className={styles.eyeHighlightSmall} />
            </div>
          </div>
          <div className={styles.eyeRight}>
            <div className={styles.eyePupil}>
              <div className={styles.eyeHighlightLarge} />
              <div className={styles.eyeHighlightSmall} />
            </div>
          </div>
          {/* Cheeks / Blush */}
          <div className={styles.blushLeft} />
          <div className={styles.blushRight} />
          {/* Smile */}
          <div className={styles.alienSmile} />
        </div>

        {/* Body & Arm */}
        <div className={styles.alienBody}>
          <div className={styles.alienArmLeft} />
          <div className={styles.alienArmRightWave} />
        </div>
      </div>
    </div>
  );
};
