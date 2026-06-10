import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './GooseMascot.module.css';

interface GooseMascotProps {
  onHonk?: () => void;
  focusedField?: 'name' | 'email' | 'organization' | 'role' | null;
  onUnlockHeistAchievement?: () => void;
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
  "PAZ NUNCA FOI UMA OPÇÃO.\n\nAssinado: O Ganso. 🔪",
  "Gostei do seu formulário.\nVou levar o botão de enviar comigo! 😈",
  "Tarefas de hoje:\n1. Roubar chaves\n2. Jogar o rastelo no lago\n3. Cancelar esse cadastro",
  "SISTEMA.ERR:\nQuantidade insuficiente de pão detectada no sistema.",
  "A gravidade na Terra é de 9.8m/s²,\nmas a paciência do ganso é de 0."
];

const FIELD_HINTS = {
  name: [
    "Como se chama o seu avatar humano? 👤",
    "Preencha o nome completo sem apelidos de pato! 🦆",
    "Nome lindo! Quase tão bonito quanto 'Ganso'!"
  ],
  email: [
    "Preciso do seu e-mail corporativo. Sem spam! 📧",
    "Não tente inventar, eu vou de olho nesse e-mail! 🔍",
    "Um e-mail para te mandar novidades sobre pão."
  ],
  organization: [
    "Onde você trabalha? Patrocinam seu trigo? 🌾",
    "Qual empresa te paga para preencher formulários? 🏢",
    "Escreva o nome da sua organização ou bando."
  ],
  role: [
    "Você faz o quê? Eu sou Especialista em Anarquia. 💼",
    "Qual o seu cargo oficial na firma? 👔",
    "Escreva sua profissão. Engenheiro de Honks?"
  ]
};

export const GooseMascot: React.FC<GooseMascotProps> = ({ 
  onHonk, 
  focusedField, 
  onUnlockHeistAchievement 
}) => {
  const [side, setSide] = useState<'left' | 'right' | 'top'>('left');
  const [isHonking, setIsHonking] = useState(false);
  const [eyeState, setEyeState] = useState<'normal' | 'angry' | 'wink' | 'closed'>('normal');
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [baseCoord, setBaseCoord] = useState<number>(180);
  const [heistState, setHeistState] = useState<'idle' | 'charging' | 'holding' | 'retreating'>('idle');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });

  // Track mouse coordinates globally
  useEffect(() => {
    const handleMouseMoveGlobal = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMoveGlobal);
    return () => {
      window.removeEventListener('mousemove', handleMouseMoveGlobal);
    };
  }, []);

  const triggerGoosePeek = useCallback(() => {
    const sides: ('left' | 'right' | 'top')[] = ['left', 'right', 'top'];
    const chosenSide = sides[Math.floor(Math.random() * sides.length)];
    
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 900;
    if (chosenSide === 'top') {
      const maxLeft = isMobile ? 220 : 370;
      const minLeft = isMobile ? 20 : 40;
      setBaseCoord(Math.floor(Math.random() * (maxLeft - minLeft)) + minLeft);
    } else {
      const maxTop = isMobile ? 180 : 340;
      const minTop = isMobile ? 20 : 40;
      setBaseCoord(Math.floor(Math.random() * (maxTop - minTop)) + minTop);
    }

    setSide(chosenSide);
    setEyeState('normal');
    setIsHonking(false);
    setSpeechBubble(null);

    // 25% chance of initiating cursor heist (only if not on mobile, since mobile has no cursor)
    const isHeist = !isMobile && Math.random() < 0.25;

    if (isHeist) {
      // Show anticipation phrase
      timerRef.current = setTimeout(() => {
        const heistPhrases = [
          "Olha o que temos aqui... 👀",
          "Humm, um cursor brilhante! 💎",
          "Achei um brinquedo! 😈",
          "Vem cá, cursor! 🎯"
        ];
        setSpeechBubble(heistPhrases[Math.floor(Math.random() * heistPhrases.length)]);
        setEyeState('wink');

        // Charge after 1.2 seconds!
        timerRef.current = setTimeout(() => {
          setHeistState('charging');
        }, 1200);
      }, 1000);
    } else {
      // Just a normal peek
      timerRef.current = setTimeout(() => {
        const phrase = GANSO_PHRASES[Math.floor(Math.random() * GANSO_PHRASES.length)];
        setSpeechBubble(phrase);
        setIsHonking(true);
        if (onHonk) onHonk();

        // Close beak after 600ms
        setTimeout(() => setIsHonking(false), 600);

        // Clear speech bubble after 5 seconds
        timerRef.current = setTimeout(() => {
          setSpeechBubble(null);
        }, 5000);
      }, 1000);
    }
  }, [onHonk]);

  // Periodically trigger a random speech bubble or heist
  useEffect(() => {
    // Initial delay before first check
    const initialTimer = setTimeout(() => {
      triggerGoosePeek();
    }, 4000);

    const interval = setInterval(() => {
      if (heistState === 'idle' && !focusedField) {
        const rand = Math.random();
        if (rand < 0.15) {
          // 15% chance of initiating cursor heist
          triggerGoosePeek();
        } else if (rand < 0.45) {
          // 30% chance of a random cheeky remark
          const phrase = GANSO_PHRASES[Math.floor(Math.random() * GANSO_PHRASES.length)];
          setSpeechBubble(phrase);
          setIsHonking(true);
          setEyeState('normal');
          if (onHonk) onHonk();

          setTimeout(() => setIsHonking(false), 600);
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setSpeechBubble(null), 5000);
        }
      }
    }, 18000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [heistState, focusedField, triggerGoosePeek, onHonk]);

  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const baseOffsetRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const baseScreenPosRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleGooseClick = useCallback(() => {
    if (side === 'hidden') return;
    
    // Trigger honk animation
    setIsHonking(true);
    setEyeState('angry');
    setSpeechBubble("HONK!!! 💢");
    if (onHonk) onHonk();

    // Reset eye state and honking state after a delay
    if (timerRef.current) clearTimeout(timerRef.current);
    
    setTimeout(() => {
      setIsHonking(false);
    }, 500);

    // Clear speech bubble and reset eye state after 3 seconds
    timerRef.current = setTimeout(() => {
      setSpeechBubble(null);
      setEyeState('normal');
    }, 3000);
  }, [side, onHonk]);

  // Handle field focus and slide to it
  useEffect(() => {
    if (!focusedField || heistState !== 'idle') return;

    // Find the input element
    const inputEl = document.getElementById(`field-${focusedField}`);
    if (!inputEl || !containerRef.current) return;

    const parent = containerRef.current.parentElement;
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const inputRect = inputEl.getBoundingClientRect();

    // Calculate vertical position relative to parent formWrapper
    const relativeTop = inputRect.top - parentRect.top;
    const gansoHeadOffset = 44; // aligns ganso head center with input center
    const inputCenterY = relativeTop + inputRect.height / 2;
    const targetTop = inputCenterY - gansoHeadOffset;

    // Set baseCoord
    setBaseCoord(Math.max(10, Math.min(parentRect.height - 110, targetTop)));

    // Peek from the left if hidden
    if (side === 'hidden') {
      setSide('left');
    }

    // Set a field-specific hint
    const hints = FIELD_HINTS[focusedField];
    const chosenHint = hints[Math.floor(Math.random() * hints.length)];
    setSpeechBubble(chosenHint);
    setEyeState('normal');

    // Keep beak open briefly to mimic speaking
    setIsHonking(true);
    const timer = setTimeout(() => setIsHonking(false), 500);

    return () => clearTimeout(timer);
  }, [focusedField, heistState, side]);

  // Handle mouse and touch events for dragging
  useEffect(() => {
    if (!isDragging) return;

    // Set grabbing cursor globally during drag
    const originalBodyCursor = document.body.style.cursor;
    const originalBodyUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasMovedRef.current = true;
      }

      // Proposed screen coords
      const newScreenX = baseScreenPosRef.current.x + baseOffsetRef.current.x + deltaX;
      const newScreenY = baseScreenPosRef.current.y + baseOffsetRef.current.y + deltaY;

      // Clamping bounds
      const gooseWidth = 90;
      const gooseHeight = 110;
      const minX = 10;
      const maxX = window.innerWidth - gooseWidth - 10;
      const minY = 66; // 56px navbar + 10px padding
      const maxY = window.innerHeight - gooseHeight - 10;

      const clampedScreenX = Math.max(minX, Math.min(maxX, newScreenX));
      const clampedScreenY = Math.max(minY, Math.min(maxY, newScreenY));
      
      setDragOffset({
        x: clampedScreenX - baseScreenPosRef.current.x,
        y: clampedScreenY - baseScreenPosRef.current.y
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - dragStartRef.current.x;
      const deltaY = e.touches[0].clientY - dragStartRef.current.y;
      
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasMovedRef.current = true;
      }

      // Proposed screen coords
      const newScreenX = baseScreenPosRef.current.x + baseOffsetRef.current.x + deltaX;
      const newScreenY = baseScreenPosRef.current.y + baseOffsetRef.current.y + deltaY;

      // Clamping bounds
      const gooseWidth = 90;
      const gooseHeight = 110;
      const minX = 10;
      const maxX = window.innerWidth - gooseWidth - 10;
      const minY = 66; // 56px navbar + 10px padding
      const maxY = window.innerHeight - gooseHeight - 10;

      const clampedScreenX = Math.max(minX, Math.min(maxX, newScreenX));
      const clampedScreenY = Math.max(minY, Math.min(maxY, newScreenY));
      
      setDragOffset({
        x: clampedScreenX - baseScreenPosRef.current.x,
        y: clampedScreenY - baseScreenPosRef.current.y
      });
    };

    const dockAndRetract = () => {
      if (!containerRef.current) return;
      const parent = containerRef.current.parentElement;
      if (!parent) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();

      const gooseCenterX = containerRect.left + containerRect.width / 2;
      const gooseCenterY = containerRect.top + containerRect.height / 2;

      // Default targets relative to parentRect (the formWrapper)
      const leftTargetX = parentRect.left - 78 + 45;
      const leftTargetY = parentRect.top + 180 + 55;

      const rightTargetX = parentRect.right + 78 - 45;
      const rightTargetY = parentRect.top + 240 + 55;

      const topTargetX = parentRect.left + 200 + 45;
      const topTargetY = parentRect.top - 65 + 55;

      const distToLeft = Math.hypot(gooseCenterX - leftTargetX, gooseCenterY - leftTargetY);
      const distToRight = Math.hypot(gooseCenterX - rightTargetX, gooseCenterY - rightTargetY);
      const distToTop = Math.hypot(gooseCenterX - topTargetX, gooseCenterY - topTargetY);

      const minDist = Math.min(distToLeft, distToRight, distToTop);
      let closestSide: 'left' | 'right' | 'top' = 'left';
      if (minDist === distToRight) closestSide = 'right';
      else if (minDist === distToTop) closestSide = 'top';

      // Set baseCoord to where it was dropped (clamped relative to parent formWrapper)
      if (closestSide === 'left' || closestSide === 'right') {
        const relativeTop = containerRect.top - parentRect.top;
        const clampedTop = Math.max(10, Math.min(parentRect.height - 110, relativeTop));
        setBaseCoord(clampedTop);
      } else {
        const relativeLeft = containerRect.left - parentRect.left;
        const clampedLeft = Math.max(10, Math.min(parentRect.width - 90, relativeLeft));
        setBaseCoord(clampedLeft);
      }

      // Snap the side and clear offset so it glides to that position
      setSide(closestSide);
      setDragOffset({ x: 0, y: 0 });

      // After 2.5 seconds, clear speech bubble
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setSpeechBubble(null);
      }, 2500);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (!hasMovedRef.current) {
        handleGooseClick();
      } else {
        setSpeechBubble("Humph! 😤");
        dockAndRetract();
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      if (!hasMovedRef.current) {
        handleGooseClick();
      } else {
        setSpeechBubble("Humph! 😤");
        dockAndRetract();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.body.style.cursor = originalBodyCursor;
      document.body.style.userSelect = originalBodyUserSelect;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleGooseClick]);

  // Failsafe to restore cursor in case component unmounts
  useEffect(() => {
    return () => {
      const styleElement = document.getElementById('goose-cursor-hide');
      if (styleElement) styleElement.remove();
      document.body.style.cursor = '';
    };
  }, []);

  // Failsafe: click or keydown cancels cursor theft immediately
  useEffect(() => {
    if (heistState === 'idle') return;

    const restore = () => {
      setHeistState('idle');
      setSpeechBubble(null);
      setEyeState('normal');
      const styleElement = document.getElementById('goose-cursor-hide');
      if (styleElement) styleElement.remove();
      document.body.style.cursor = '';
    };

    const timer = setTimeout(() => {
      window.addEventListener('click', restore);
      window.addEventListener('keydown', restore);
    }, 100);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', restore);
      window.removeEventListener('keydown', restore);
    };
  }, [heistState]);

  // RequestAnimationFrame loop for cursor chasing & retreating
  useEffect(() => {
    if (heistState === 'idle') return;

    let animFrame: number;
    let currentX = dragOffset.x;
    let currentY = dragOffset.y;

    const loop = () => {
      if (!containerRef.current) {
        animFrame = requestAnimationFrame(loop);
        return;
      }
      const parent = containerRef.current.parentElement;
      if (!parent) return;

      if (heistState === 'charging') {
        const containerRect = containerRef.current.getBoundingClientRect();
        const baseScreenX = containerRect.left - dragOffset.x;
        const baseScreenY = containerRect.top - dragOffset.y;

        const targetScreenX = mousePosRef.current.x - 45; // center of goose
        const targetScreenY = mousePosRef.current.y - 55; // center of goose

        const targetOffsetX = targetScreenX - baseScreenX;
        const targetOffsetY = targetScreenY - baseScreenY;

        const dx = targetOffsetX - currentX;
        const dy = targetOffsetY - currentY;

        currentX += dx * 0.15;
        currentY += dy * 0.15;

        setDragOffset({ x: currentX, y: currentY });

        const dist = Math.hypot(dx, dy);
        if (dist < 20) {
          setHeistState('holding');
          setSpeechBubble("PEGUEI! 😈");
          setIsHonking(true);
          setEyeState('angry');

          if (onUnlockHeistAchievement) {
            onUnlockHeistAchievement();
          }

          // Hide real cursor
          document.body.style.cursor = 'none';
          const style = document.createElement('style');
          style.id = 'goose-cursor-hide';
          style.innerHTML = '* { cursor: none !important; }';
          document.head.appendChild(style);

          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            setIsHonking(false);
            setHeistState('retreating');
            setSpeechBubble("Tchau cursor! 🕊️");
          }, 1200);
        }
      } else if (heistState === 'retreating') {
        const dx = 0 - currentX;
        const dy = 0 - currentY;

        currentX += dx * 0.12;
        currentY += dy * 0.12;

        setDragOffset({ x: currentX, y: currentY });

        const dist = Math.hypot(currentX, currentY);
        if (dist < 5) {
          setHeistState('idle');
          setSpeechBubble(null);
          setEyeState('normal');

          const styleElement = document.getElementById('goose-cursor-hide');
          if (styleElement) styleElement.remove();
          document.body.style.cursor = '';
        }
      }

      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [heistState, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only left click
    e.preventDefault();

    // Cancel heist if user grabs the goose
    if (heistState !== 'idle') {
      setHeistState('idle');
      const styleElement = document.getElementById('goose-cursor-hide');
      if (styleElement) styleElement.remove();
      document.body.style.cursor = '';
    }

    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    baseOffsetRef.current = { ...dragOffset };

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      baseScreenPosRef.current = {
        x: rect.left - dragOffset.x,
        y: rect.top - dragOffset.y
      };
    }

    const strugglePhrases = [
      "ME SOLTA! 😡",
      "QUACK! ME DEIXA! 💢",
      "AIAI, MEU PESCOÇO! 🤕",
      "HONK! NÃO ME TOCAS! 🪶",
      "ISSO É ASSÉDIO DE GANSO! 🚨"
    ];
    setSpeechBubble(strugglePhrases[Math.floor(Math.random() * strugglePhrases.length)]);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    // Cancel heist if user grabs the goose
    if (heistState !== 'idle') {
      setHeistState('idle');
      const styleElement = document.getElementById('goose-cursor-hide');
      if (styleElement) styleElement.remove();
      document.body.style.cursor = '';
    }

    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    baseOffsetRef.current = { ...dragOffset };

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      baseScreenPosRef.current = {
        x: rect.left - dragOffset.x,
        y: rect.top - dragOffset.y
      };
    }

    const strugglePhrases = [
      "ME SOLTA! 😡",
      "QUACK! ME DEIXA! 💢",
      "AIAI, MEU PESCOÇO! 🤕",
      "HONK! NÃO ME TOCAS! 🪶",
      "ISSO É ASSÉDIO DE GANSO! 🚨"
    ];
    setSpeechBubble(strugglePhrases[Math.floor(Math.random() * strugglePhrases.length)]);
  };

  // Determine classes based on side and honk states
  const containerClass = `${styles.gooseContainer} ${styles[side]} ${
    isDragging || heistState === 'charging' || heistState === 'retreating' ? styles.dragging : ''
  }`;
  const characterClass = `${styles.gooseCharacter} ${isHonking ? styles.honking : ''}`;

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 900;
  const scaleStr = `${side === 'right' ? 'scaleX(-1)' : ''} ${isMobile ? 'scale(0.8)' : ''}`;
  const inlineStyle: React.CSSProperties = {
    cursor: isDragging ? 'grabbing' : 'grab',
    transform: dragOffset.x !== 0 || dragOffset.y !== 0
      ? `translate(${dragOffset.x}px, ${dragOffset.y}px) ${scaleStr}`
      : undefined
  };

  if (side === 'left' || side === 'right') {
    inlineStyle.top = `${baseCoord}px`;
  } else if (side === 'top') {
    inlineStyle.left = `${baseCoord}px`;
  }

  // Select eye element path based on eyeState (override to angry/X eye during drag)
  const effectiveEyeState = isDragging ? 'angry' : eyeState;

  let eyeElement = <circle cx="48" cy="40" r="3" fill="#000000" />;
  if (effectiveEyeState === 'angry') {
    eyeElement = (
      <path 
        d="M 44 37 L 52 41 M 52 37 L 44 41" 
        stroke="#000000" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
      />
    );
  } else if (effectiveEyeState === 'wink') {
    eyeElement = (
      <path 
        d="M 44 41 Q 48 36 52 41" 
        stroke="#000000" 
        strokeWidth="2.5" 
        fill="none" 
        strokeLinecap="round" 
      />
    );
  } else if (effectiveEyeState === 'closed') {
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
  const bottomBeakD = (isHonking || isDragging)
    ? "M 60 48 Q 74 57 78 59 Q 68 53 60 50 Z" 
    : "M 60 46 Q 74 48 81 48 Q 68 48 60 46 Z";

  return (
    <div ref={containerRef} className={containerClass} style={inlineStyle}>
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
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        title="Clique e arraste o ganso!"
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

            {/* Fake Cursor in the Beak */}
            {(heistState === 'holding' || heistState === 'retreating') && (
              <g transform="translate(82, 44) rotate(-35)">
                <path 
                  d="M 0 0 L 10 10 L 6 11 L 9 17 L 7 18 L 4 12 L 0 15 Z" 
                  fill="#ffffff" 
                  stroke="#0c0f1d" 
                  strokeWidth="2.2" 
                  strokeLinejoin="round" 
                />
              </g>
            )}
          </g>
        </svg>
      </div>
    </div>
  );
};
