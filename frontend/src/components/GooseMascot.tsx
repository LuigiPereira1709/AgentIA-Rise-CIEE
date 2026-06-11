import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './GooseMascot.module.css';

interface GooseMascotProps {
  onHonk?: () => void;
  focusedField?: 'name' | 'email' | 'organization' | 'role' | null;
  onUnlockHeistAchievement?: () => void;
  onUnlockChaosAchievement?: () => void;
  onChangeMischief?: (level: number, isChaos: boolean) => void;
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

const playPettingSound = () => {
  try {
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12); // E6
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.15);
  } catch (e) {}
};

const playHonkSound = () => {
  try {
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.16);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.18);
  } catch (e) {}
};

const playChaosSound = () => {
  try {
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      const freq = i % 2 === 0 ? 587.33 : 698.46; // D5 and F5
      osc.frequency.setValueAtTime(freq, now + i * 0.15);
      
      gain.gain.setValueAtTime(0, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.1, now + i * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.13);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.15);
    }
  } catch (e) {}
};

export const GooseMascot: React.FC<GooseMascotProps> = ({ 
  onHonk, 
  focusedField, 
  onUnlockHeistAchievement,
  onUnlockChaosAchievement,
  onChangeMischief,
  isMuted = false
}) => {
  const [side, setSide] = useState<'left' | 'right' | 'top'>('left');
  const [isHonking, setIsHonking] = useState(false);
  const [eyeState, setEyeState] = useState<'normal' | 'angry' | 'wink' | 'closed'>('normal');
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [baseCoord, setBaseCoord] = useState<number>(180);
  const [heistState, setHeistState] = useState<'idle' | 'charging' | 'holding' | 'retreating'>('idle');

  // Mischief / Chaos states
  const [mischiefLevel, setMischiefLevel] = useState<number>(20); // starts at 20%
  const [isChaosMode, setIsChaosMode] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const petTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPetTimeRef = useRef<number>(0);
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

    // Cursor heist disabled
    const isHeist = false;

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
        if (!isMuted) {
          playHonkSound();
        }
        if (onHonk) onHonk();

        // Close beak after 600ms
        setTimeout(() => setIsHonking(false), 600);

        // Clear speech bubble after 5 seconds
        timerRef.current = setTimeout(() => {
          setSpeechBubble(null);
        }, 5000);
      }, 1000);
    }
  }, [onHonk, isMuted]);

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
          if (!isMuted) {
            playHonkSound();
          }
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
  }, [heistState, focusedField, triggerGoosePeek, onHonk, isMuted]);

  // Handle Chaos Mode trigger
  useEffect(() => {
    if (mischiefLevel >= 100 && !isChaosMode) {
      setIsChaosMode(true);
      if (!isMuted) {
        playChaosSound();
      }
      setSpeechBubble("MODO CAOS ATIVADO! Ninguém está seguro! 😈🔪");
      setEyeState('angry');
      setIsHonking(true);
      setTimeout(() => setIsHonking(false), 800);
      
      if (onUnlockChaosAchievement) {
        onUnlockChaosAchievement();
      }
    } else if (mischiefLevel === 0 && isChaosMode) {
      setIsChaosMode(false);
      setSpeechBubble("Ufa, ganhei carinho... 🍞❤️");
      setEyeState('normal');
      if (onUnlockHeistAchievement) {
        onUnlockHeistAchievement();
      }
    }
  }, [mischiefLevel, isChaosMode, onUnlockChaosAchievement, onUnlockHeistAchievement, isMuted]);

  // Notify parent of mischief status changes
  useEffect(() => {
    if (onChangeMischief) {
      onChangeMischief(mischiefLevel, isChaosMode);
    }
  }, [mischiefLevel, isChaosMode, onChangeMischief]);

  // Loop a synthesized retro 8-bit theme music during Chaos Mode
  useEffect(() => {
    if (!isChaosMode || isMuted) {
      return;
    }

    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    let ctx: AudioContext | null = null;
    let timer: any = null;

    try {
      ctx = new AudioContextClass();
    } catch (e) {
      return;
    }

    const bassNotes = [110.00, 110.00, 130.81, 146.83, 110.00, 110.00, 98.00, 82.41]; // A2, A2, C3, D3, A2, A2, G2, E2
    const leadNotes = [220.00, 261.63, 293.66, 329.63, 220.00, 261.63, 196.00, 164.81]; // A3, C4, D4, E4, A3, C4, G3, E3
    let noteIndex = 0;
    const tempo = 180; // BPM
    const noteLength = 60 / tempo; // Seconds per beat

    const playNextNote = () => {
      if (!ctx || ctx.state === 'closed') return;
      const now = ctx.currentTime;

      // Play bass note
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.value = bassNotes[noteIndex % bassNotes.length];
      bassGain.gain.setValueAtTime(0, now);
      bassGain.gain.linearRampToValueAtTime(0.04, now + 0.02);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + noteLength - 0.02);
      bassOsc.connect(bassGain);
      bassGain.connect(ctx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + noteLength);

      // Play lead melody note (on alternate steps)
      if (noteIndex % 2 === 0) {
        const leadOsc = ctx.createOscillator();
        const leadGain = ctx.createGain();
        leadOsc.type = 'triangle';
        leadOsc.frequency.value = leadNotes[(noteIndex / 2) % leadNotes.length];
        leadGain.gain.setValueAtTime(0, now);
        leadGain.gain.linearRampToValueAtTime(0.03, now + 0.02);
        leadGain.gain.exponentialRampToValueAtTime(0.001, now + noteLength * 2 - 0.05);
        leadOsc.connect(leadGain);
        leadGain.connect(ctx.destination);
        leadOsc.start(now);
        leadOsc.stop(now + noteLength * 2);
      }

      noteIndex++;
      timer = setTimeout(playNextNote, noteLength * 1000);
    };

    playNextNote();

    return () => {
      clearTimeout(timer);
      if (ctx) {
        ctx.close().catch(() => {});
      }
    };
  }, [isChaosMode, isMuted]);

  const handlePettingMove = () => {
    if (isDragging || heistState !== 'idle') return;

    const now = Date.now();
    if (now - lastPetTimeRef.current > 120) { // Throttle to 120ms
      lastPetTimeRef.current = now;

      setMischiefLevel((prev) => Math.max(0, prev - 4));
      setEyeState('closed');
      setSpeechBubble("❤️");
      if (!isMuted) {
        playPettingSound();
      }

      if (petTimerRef.current) clearTimeout(petTimerRef.current);
      petTimerRef.current = setTimeout(() => {
        setEyeState('normal');
        setSpeechBubble(null);
      }, 800);
    }
  };

  useEffect(() => {
    return () => {
      if (petTimerRef.current) clearTimeout(petTimerRef.current);
    };
  }, []);

  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const baseOffsetRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const baseScreenPosRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleGooseClick = useCallback(() => {
    setMischiefLevel((prev) => Math.min(100, prev + 15));
    
    // Trigger honk animation
    setIsHonking(true);
    setEyeState('angry');
    setSpeechBubble("HONK!!! 💢");
    if (!isMuted) {
      playHonkSound();
    }
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
  }, [onHonk, isMuted]);

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
    if (!isMuted) {
      playHonkSound();
    }
    const timer = setTimeout(() => setIsHonking(false), 500);

    return () => clearTimeout(timer);
  }, [focusedField, heistState, side, isMuted]);

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
      document.body.style.cursor = originalBodyCursor === 'none' ? '' : originalBodyCursor;
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

  // Failsafe: click, mousedown or keydown cancels cursor theft immediately
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
      window.addEventListener('click', restore, { capture: true });
      window.addEventListener('mousedown', restore, { capture: true });
      window.addEventListener('keydown', restore, { capture: true });
    }, 100);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', restore, { capture: true });
      window.removeEventListener('mousedown', restore, { capture: true });
      window.removeEventListener('keydown', restore, { capture: true });
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
          setMischiefLevel((prev) => Math.min(100, prev + 40));
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
    setMischiefLevel((prev) => Math.min(100, prev + 25));

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
  } ${isChaosMode ? styles.chaos : ''}`;
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

  let eyeElement = <circle cx="58" cy="12" r="2.5" fill="#000000" />;
  if (effectiveEyeState === 'angry') {
    eyeElement = (
      <path 
        d="M 54 8 L 62 14 M 62 8 L 54 14" 
        stroke="#000000" 
        strokeWidth="2" 
        strokeLinecap="round" 
      />
    );
  } else if (effectiveEyeState === 'wink') {
    eyeElement = (
      <path 
        d="M 54 14 Q 58 9 62 14" 
        stroke="#000000" 
        strokeWidth="2" 
        fill="none" 
        strokeLinecap="round" 
      />
    );
  } else if (effectiveEyeState === 'closed') {
    eyeElement = (
      <line 
        x1="54" 
        y1="12" 
        x2="62" 
        y2="12" 
        stroke="#000000" 
        strokeWidth="2" 
        strokeLinecap="round" 
      />
    );
  }

  // Beak paths:
  const topBeakD = "M 64 16 Q 80 16 84 18.5 Q 70 19 64 18.5 Z";
  const bottomBeakD = (isHonking || isDragging)
    ? "M 64 18.5 Q 74 27 82 24 Q 70 24 64 21 Z" 
    : "M 64 18.5 Q 70 19 84 18.5 Q 70 23 64 21 Z";

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
        onMouseMove={handlePettingMove}
        title={isChaosMode ? "FAÇA CARINHO PARA ACALMAR O GANSO!" : "Clique e arraste o ganso!"}
      >
        <svg 
          viewBox="0 0 80 80" 
          className={styles.gooseSvg}
          style={{ overflow: 'visible' }}
        >
          <g>
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
            {eyeElement}

            {/* Beak */}
            <path d={bottomBeakD} fill="#ff9f1c" stroke="#0c0f1d" strokeWidth="1.8" />
            <path d={topBeakD} fill="#ff9f1c" stroke="#0c0f1d" strokeWidth="1.8" />

            {/* Chaos Accessories */}
            {isChaosMode && (
              <g>
                {/* Temple/Arm */}
                <path d="M 50 8 Q 43 5 36 10" stroke="#0c0f1d" strokeWidth="2" fill="none" />
                {/* Lens */}
                <polygon points="46,5 64,5 61,15 49,15" fill="#000000" stroke="#0c0f1d" strokeWidth="2" />
                {/* Lens reflection */}
                <line x1="50" y1="8" x2="56" y2="12" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
              </g>
            )}

            {isChaosMode && (
              <g transform="translate(74, 18) rotate(20) scale(1.2)">
                {/* Knife Handle (hilt) */}
                <rect x="-8" y="-2" width="8" height="4" rx="1" fill="#704214" stroke="#0c0f1d" strokeWidth="1" />
                {/* Guard */}
                <rect x="0" y="-4" width="2" height="8" rx="0.5" fill="#b0b0b0" stroke="#0c0f1d" strokeWidth="1" />
                {/* Blade */}
                <path d="M 2 -2 L 18 -2 C 18 -2, 21 1, 16 2 L 2 2 Z" fill="#d0d0d0" stroke="#0c0f1d" strokeWidth="1.2" />
                {/* Blade cutting edge reflection */}
                <path d="M 3 1 L 16 1" stroke="#ffffff" strokeWidth="0.8" />
              </g>
            )}

            {/* Fake Cursor in the Beak */}
            {(heistState === 'holding' || heistState === 'retreating') && (
              <g transform="translate(82, 19) rotate(-35) scale(1.3)">
                <path 
                  d="M 0 0 L 8 8 L 5 9 L 7 14 L 5 15 L 3 10 L 0 12 Z" 
                  fill="#ffffff" 
                  stroke="#0c0f1d" 
                  strokeWidth="1.5" 
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
