import React, { useState, useEffect, useRef } from 'react';
import styles from './GooseMascot.module.css';

interface GooseMascotProps {
  onHonk?: () => void;
}

const GANSO_PHRASES = [
  "HONK! Menos conversa, mais pão!",
  "Quack! Você tem certeza que esse e-mail existe?",
  "Bip bop... quero dizer, HONK! 🤖",
  "Peace was never an option. 🔪",
  "Se você não preencher, eu vou puxar o cabo da internet!",
  "Formulário legal, seria uma pena se alguém... comesse ele. 🍞",
  "Estou de olho nesse seu cursor aí... 👀",
  "Honk! Cadastrando mais um humano para o nosso banco de dados ganso.",
  "Diga-me o seu cargo e eu direi se você é digno de me dar migalhas.",
];

const NOTE_TEMPLATES = [
  {
    title: "nota.txt",
    content: "PAZ NUNCA FOI UMA OPÇÃO.\n\nAssinado,\nO Ganso."
  },
  {
    title: "importante.txt",
    content: "Gostei do seu formulário.\nVou levar o botão de enviar comigo."
  },
  {
    title: "tarefas.txt",
    content: "1. Roubar chaves\n2. Jogar o rastelo no lago\n3. Cancelar esse cadastro"
  },
  {
    title: "sistema.err",
    content: "ERRO:\nQuantidade insuficiente de pão detectada no sistema."
  },
  {
    title: "mensagem.txt",
    content: "A gravidade na Terra é de 9.8m/s²,\nmas a paciência do ganso é de 0."
  }
];

export const GooseMascot: React.FC<GooseMascotProps> = ({ onHonk }) => {
  const [side, setSide] = useState<'left' | 'right' | 'top' | 'hidden'>('hidden');
  const [isHonking, setIsHonking] = useState(false);
  const [eyeState, setEyeState] = useState<'normal' | 'angry' | 'wink' | 'closed'>('normal');
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState<{ title: string; content: string } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const bubbleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Periodically trigger the goose (every 18 seconds, 55% chance)
  useEffect(() => {
    // Initial delay before first check
    const initialTimer = setTimeout(() => {
      triggerGoosePeek();
    }, 4000);

    const interval = setInterval(() => {
      if (side === 'hidden' && !activeNote && Math.random() < 0.55) {
        triggerGoosePeek();
      }
    }, 18000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    };
  }, [side, activeNote]);

  const triggerGoosePeek = () => {
    const sides: ('left' | 'right')[] = ['left', 'right'];
    const chosenSide = sides[Math.floor(Math.random() * sides.length)];
    
    setSide(chosenSide);
    setEyeState('normal');
    setIsHonking(false);
    setSpeechBubble(null);

    // 45% chance of dragging a note, 55% chance of standard peek & honk
    const willDragNote = Math.random() < 0.45;

    if (willDragNote) {
      // Drag a notepad note
      const note = NOTE_TEMPLATES[Math.floor(Math.random() * NOTE_TEMPLATES.length)];
      
      // Delay note appearing to simulate goose "dragging" it onto screen
      timerRef.current = setTimeout(() => {
        setActiveNote(note);
        setEyeState('wink'); // Look happy/cheeky
      }, 800);
    } else {
      // Just a normal peek
      // Speech bubble appears after it slides in
      timerRef.current = setTimeout(() => {
        const phrase = GANSO_PHRASES[Math.floor(Math.random() * GANSO_PHRASES.length)];
        setSpeechBubble(phrase);
        setIsHonking(true);
        if (onHonk) onHonk();

        // Close beak after 600ms
        setTimeout(() => setIsHonking(false), 600);

        // Slide back after 5 seconds
        timerRef.current = setTimeout(() => {
          setSpeechBubble(null);
          setSide('hidden');
        }, 5000);
      }, 1000);
    }
  };

  const handleGooseClick = () => {
    if (side === 'hidden') return;
    
    // Trigger honk animation
    setIsHonking(true);
    setEyeState('angry');
    setSpeechBubble("HONK!!!");
    if (onHonk) onHonk();

    // Reset eye state and honking state after a delay
    if (timerRef.current) clearTimeout(timerRef.current);
    
    setTimeout(() => {
      setIsHonking(false);
    }, 500);

    // If there is no active note, slide back after 3 seconds
    if (!activeNote) {
      timerRef.current = setTimeout(() => {
        setSpeechBubble(null);
        setEyeState('normal');
        setSide('hidden');
      }, 3000);
    } else {
      // If there is an active note, just reset speech/eye after 2 seconds
      bubbleTimerRef.current = setTimeout(() => {
        setSpeechBubble(null);
        setEyeState('wink');
      }, 2000);
    }
  };

  const handleCloseNote = () => {
    // Protest Honk!
    setIsHonking(true);
    setEyeState('angry');
    setSpeechBubble("HONK! 💢");
    if (onHonk) onHonk();
    setActiveNote(null);

    setTimeout(() => {
      setIsHonking(false);
    }, 600);

    // Retract goose
    timerRef.current = setTimeout(() => {
      setSpeechBubble(null);
      setEyeState('normal');
      setSide('hidden');
    }, 1500);
  };

  // Determine classes based on side and honk states
  const containerClass = `${styles.gooseContainer} ${styles[side]}`;
  const characterClass = `${styles.gooseCharacter} ${isHonking ? styles.honking : ''}`;

  // Select eye element path based on eyeState
  let eyeElement = <circle cx="48" cy="40" r="3" fill="#000000" />;
  if (eyeState === 'angry') {
    eyeElement = (
      <path 
        d="M 44 37 L 52 41 M 52 37 L 44 41" 
        stroke="#000000" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
      />
    );
  } else if (eyeState === 'wink') {
    eyeElement = (
      <path 
        d="M 44 41 Q 48 36 52 41" 
        stroke="#000000" 
        strokeWidth="2.5" 
        fill="none" 
        strokeLinecap="round" 
      />
    );
  } else if (eyeState === 'closed') {
    eyeElement = (
      <line 
        x1="44" 
        y1="40" 
        x2="52" 
        y2="40" 
        stroke="#000000" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
      />
    );
  }

  // Beak paths:
  const topBeakD = "M 60 38 Q 78 40 85 44 Q 70 48 60 46 Z";
  const bottomBeakD = isHonking 
    ? "M 60 48 Q 74 57 78 59 Q 68 53 60 50 Z" 
    : "M 60 46 Q 74 48 81 48 Q 68 48 60 46 Z";

  return (
    <>
      <div className={containerClass}>
        {/* Speech Bubble */}
        {speechBubble && (
          <div className={styles.speechBubble}>
            <p className={styles.phraseText}>{speechBubble}</p>
            <div className={styles.bubbleArrow} />
          </div>
        )}

        {/* CSS/SVG Goose */}
        <div 
          className={characterClass} 
          onClick={handleGooseClick}
          title="Clique no ganso para irritá-lo!"
        >
          <svg 
            viewBox="0 0 100 120" 
            className={styles.gooseSvg}
          >
            <g>
              {/* Neck border (creates outline) */}
              <path 
                d="M 30 120 C 30 85, 34 62, 46 48" 
                stroke="#0c0f1d" 
                strokeWidth="26" 
                strokeLinecap="round" 
                fill="none" 
              />
              {/* White Neck */}
              <path 
                d="M 30 120 C 30 85, 34 62, 46 48" 
                stroke="#ffffff" 
                strokeWidth="20" 
                strokeLinecap="round" 
                fill="none" 
              />

              {/* Head */}
              <circle 
                cx="46" 
                cy="44" 
                r="18" 
                fill="#ffffff" 
                stroke="#0c0f1d" 
                strokeWidth="2.5" 
              />
              
              {/* Cheek / Blush */}
              <circle cx="38" cy="50" r="3.5" fill="rgba(255, 90, 95, 0.4)" />

              {/* Eye */}
              {eyeElement}

              {/* Beak */}
              {/* Bottom Beak */}
              <path d={bottomBeakD} fill="#ff9f1c" stroke="#0c0f1d" strokeWidth="2" />
              {/* Top Beak */}
              <path d={topBeakD} fill="#ff9f1c" stroke="#0c0f1d" strokeWidth="2" />
            </g>
          </svg>
        </div>
      </div>

      {/* Retro Notepad Window */}
      {activeNote && (
        <div className={`${styles.notepadWindow} ${styles[`noteFrom_${side}`]}`}>
          <div className={styles.notepadTitleBar}>
            <span className={styles.notepadTitle}>{activeNote.title} - Bloco de Notas</span>
            <button className={styles.notepadCloseBtn} onClick={handleCloseNote}>×</button>
          </div>
          <div className={styles.notepadBody}>
            <pre className={styles.notepadText}>{activeNote.content}</pre>
            <div className={styles.notepadOkWrapper}>
              <button className={styles.notepadOkBtn} onClick={handleCloseNote}>OK</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
