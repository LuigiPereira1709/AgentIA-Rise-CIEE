import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Input, Field, Text, Card, Avatar } from '@fluentui/react-components';
import { 
  ArrowLeft24Regular, 
  Person24Regular, 
  Mail24Regular, 
  Board24Regular, 
  Briefcase24Regular, 
  CheckmarkCircle24Filled,
  Calendar24Regular,
  Phone24Regular,
  Home24Regular,
  BookOpen24Regular
} from '@fluentui/react-icons';
import { FloatingChatWidget } from './chat/FloatingChatWidget';
import { GooseMascot } from './GooseMascot';
import { GooseJourney } from './GooseJourney';
import styles from './RegistrationForm.module.css';

export const GooseHeadIcon: React.FC<{ isChaos?: boolean }> = ({ isChaos = false }) => {
  return (
    <svg 
      viewBox="22 20 66 48" 
      width="24" 
      height="18" 
      style={{ overflow: 'visible' }}
    >
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
      {isChaos ? (
        <path d="M 42 38 L 50 44" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        <circle cx="48" cy="40" r="2.5" fill="#000000" />
      )}

      {/* Beak */}
      {/* Bottom Beak */}
      <path d="M 60 46 Q 74 48 81 48 Q 68 48 60 46 Z" fill="#ff9f1c" stroke="#0c0f1d" strokeWidth="2" />
      {/* Top Beak */}
      <path d="M 60 38 Q 78 40 85 44 Q 70 48 60 46 Z" fill="#ff9f1c" stroke="#0c0f1d" strokeWidth="2" />
    </svg>
  );
};

export const GooseBodyIcon: React.FC = () => {
  return (
    <svg 
      viewBox="15 10 75 70" 
      width="24" 
      height="24" 
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
        <circle cx="58" cy="12" r="2.5" fill="#000000" />

        {/* Beak */}
        <path d="M 64 18.5 Q 70 19 84 18.5 Q 70 23 64 21 Z" fill="#ff9f1c" stroke="#0c0f1d" strokeWidth="1.8" />
        <path d="M 64 16 Q 80 16 84 18.5 Q 70 19 64 18.5 Z" fill="#ff9f1c" stroke="#0c0f1d" strokeWidth="1.8" />
      </g>
    </svg>
  );
};

const triggerFeatherExplosion = (x: number, y: number) => {
  let container = document.getElementById('particle-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'particle-container';
    container.className = styles.particleContainer;
    document.body.appendChild(container);
  }

  const particleCount = 30;
  for (let i = 0; i < particleCount; i++) {
    const el = document.createElement('div');
    const type = Math.random() > 0.4 ? 'feather' : 'star';
    el.className = `${type === 'feather' ? styles.featherParticle : styles.starParticle} ${styles.animateParticle}`;
    
    // Position
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    // Randomize movement via CSS custom properties
    const angle = Math.random() * Math.PI * 2;
    const distance = 80 + Math.random() * 150;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance - 30;
    const rot = (Math.random() - 0.5) * 720;

    el.style.setProperty('--tx', `${tx}px`);
    el.style.setProperty('--ty', `${ty}px`);
    el.style.setProperty('--rot', `${rot}deg`);

    // Randomize scale
    const scale = 0.5 + Math.random() * 0.8;
    el.style.width = `${Math.round(14 * scale)}px`;
    el.style.height = `${Math.round(14 * scale)}px`;

    container.appendChild(el);

    // Remove element after animation
    setTimeout(() => {
      el.remove();
    }, 1500);
  }
};

interface RegistrationFormProps {
  onBackToChat: () => void;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
}

const ACHIEVEMENTS: Record<string, Achievement> = {
  speed: {
    id: 'speed',
    title: '⚡ Digitador Veloz',
    description: 'Preencheu o nome completo em menos de 4 segundos!',
    icon: '⚡'
  },
  duck_friend: {
    id: 'duck_friend',
    title: '🦆 Amigo dos Animais',
    description: 'Fez carinho ou irritou o ganso 5 vezes.',
    icon: '🦆'
  },
  heist_victim: {
    id: 'heist_victim',
    title: '💖 Domador de Gansos',
    description: 'Acalmou o ganso fazendo carinho até a travessura zerar.',
    icon: '💖'
  },
  curious: {
    id: 'curious',
    title: '💡 Investigador',
    description: 'Pesquisou/perguntou algo no assistente de chat.',
    icon: '💡'
  },
  chaos_agent: {
    id: 'chaos_agent',
    title: '😈 Agente do Caos',
    description: 'Deixou o ganso atingir 100% de travessura e ativar o Modo Caos.',
    icon: '😈'
  }
};

const playAchievementSound = () => {
  try {
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    // Retro arpeggio chime (C5 -> E5 -> G5 -> C6)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      
      // Volume envelope
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.3);
    });
  } catch (e) {
    console.error("Audio Context failed:", e);
  }
};

const capitalizeName = (name: string): string => {
  if (!name) return name;
  const lowerWordsToKeep = ['de', 'da', 'do', 'dos', 'das', 'e'];
  return name
    .split(' ')
    .map((word, index) => {
      const lowerWord = word.toLowerCase();
      if (index > 0 && lowerWordsToKeep.includes(lowerWord)) {
        return lowerWord;
      }
      if (lowerWord.length > 0) {
        return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
      }
      return '';
    })
    .join(' ');
};

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onBackToChat }) => {
  const [formData, setFormData] = useState({
    varNomeCompleto: '',
    varCPF: '',
    varDataNascimento: '',
    varEmail: '',
    varTelefone: '',
    varSexo: '',
    varEstadoCivil: '',
    varCEP: '',
    varLogradouro: '',
    varBairro: '',
    varCidade: '',
    varEstado: '',
    varNumeroCasa: '',
    varNivelEscolar: '',
    varInstituicaoNome: '',
    varPeriodoCursando: '',
    varModalidadeEnsino: '',
    varTurnoEnsino: ''
  });

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // Custom Tab selection state
  const [activeTab, setActiveTab] = useState<'pessoal' | 'contato' | 'educacao'>('pessoal');

  const getActiveStep = () => {
    if (isSubmitted) return 3;
    const p0Fields = ['varNomeCompleto', 'varCPF', 'varDataNascimento', 'varSexo', 'varEstadoCivil'];
    const p1Fields = ['varEmail', 'varTelefone', 'varCEP', 'varLogradouro', 'varBairro', 'varCidade', 'varEstado', 'varNumeroCasa'];
    const p2Fields = ['varNivelEscolar', 'varInstituicaoNome', 'varPeriodoCursando', 'varModalidadeEnsino', 'varTurnoEnsino'];

    const p0Done = p0Fields.every(f => (formData as any)[f]?.trim() !== '');
    const p1Done = p1Fields.every(f => (formData as any)[f]?.trim() !== '');
    const p2Done = p2Fields.every(f => (formData as any)[f]?.trim() !== '');

    if (p0Done && p1Done && p2Done) return 3;
    if (p0Done && p1Done) return 2;
    if (p0Done) return 1;
    return 0;
  };

  // Gamification states

  const [activeToasts, setActiveToasts] = useState<{ id: string; title: string; description: string; icon: string }[]>([]);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [mischiefLevel, setMischiefLevel] = useState(20);
  const [isChaosMode, setIsChaosMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const nameFocusTimeRef = useRef<number | null>(null);
  const nameUnlockedRef = useRef(false);
  const unlockedRef = useRef<string[]>([]);

  const unlockAchievement = useCallback((id: string) => {
    if (unlockedRef.current.includes(id)) return;
    unlockedRef.current.push(id);


    const achievement = ACHIEVEMENTS[id];
    if (achievement) {
      if (!isMuted) {
        playAchievementSound();
      }
      triggerFeatherExplosion(window.innerWidth / 2, window.innerHeight / 2);

      const toastId = `${id}-${Date.now()}`;
      setActiveToasts((currentToasts) => [
        ...currentToasts,
        {
          id: toastId,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
        },
      ]);

      // Auto-remove toast after 5 seconds
      setTimeout(() => {
        setActiveToasts((currentToasts) => currentToasts.filter((t) => t.id !== toastId));
      }, 5000);
    }
  }, [isMuted]);

  // Listen to chatbot messages
  useEffect(() => {
    const handleChatSent = () => {
      unlockAchievement('curious');
    };
    window.addEventListener('chat_message_sent', handleChatSent);
    return () => window.removeEventListener('chat_message_sent', handleChatSent);
  }, [unlockAchievement]);

  const handleGooseHonk = () => {
    setIsShaking(true);
    setTimeout(() => {
      setIsShaking(false);
    }, 350);
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'submit') {
      handleSubmit();
      return;
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: '' }));

    // Speed typing check
    if (field === 'varNomeCompleto' && nameFocusTimeRef.current && !nameUnlockedRef.current) {
      if (value.trim().length > 6 && value.trim().includes(' ')) {
        const duration = Date.now() - nameFocusTimeRef.current;
        if (duration < 4000) {
          nameUnlockedRef.current = true;
          unlockAchievement('speed');
        }
      }
    }
  };
  
  const isValidCpf = (cpf: string): boolean => {
    const clean = cpf.replace(/\D/g, '');
    if (clean.length !== 11) return false;
    if (/^(\d)\1+$/.test(clean)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(clean.charAt(i)) * (10 - i);
    }
    let rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(clean.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(clean.charAt(i)) * (11 - i);
    }
    rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(clean.charAt(10))) return false;

    return true;
  };

  const validateForm = () => {
    let valid = true;
    const errors: Record<string, string> = {};

    if (!formData.varNomeCompleto.trim()) {
      errors.varNomeCompleto = 'O nome completo é obrigatório.';
      valid = false;
    }

    if (!formData.varCPF.trim()) {
      errors.varCPF = 'O CPF é obrigatório.';
      valid = false;
    } else if (!isValidCpf(formData.varCPF)) {
      errors.varCPF = 'CPF inválido.';
      valid = false;
    }

    if (!formData.varDataNascimento.trim()) {
      errors.varDataNascimento = 'A data de nascimento é obrigatória.';
      valid = false;
    }

    if (!formData.varSexo) {
      errors.varSexo = 'O sexo é obrigatório.';
      valid = false;
    }

    if (!formData.varEstadoCivil) {
      errors.varEstadoCivil = 'O estado civil é obrigatório.';
      valid = false;
    }

    if (!formData.varEmail.trim()) {
      errors.varEmail = 'O e-mail é obrigatório.';
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.varEmail)) {
      errors.varEmail = 'E-mail inválido.';
      valid = false;
    }

    if (!formData.varTelefone.trim()) {
      errors.varTelefone = 'O telefone é obrigatório.';
      valid = false;
    }

    if (!formData.varCEP.trim()) {
      errors.varCEP = 'O CEP é obrigatório.';
      valid = false;
    }

    if (!formData.varLogradouro.trim()) {
      errors.varLogradouro = 'O logradouro é obrigatório.';
      valid = false;
    }

    if (!formData.varBairro.trim()) {
      errors.varBairro = 'O bairro é obrigatório.';
      valid = false;
    }

    if (!formData.varCidade.trim()) {
      errors.varCidade = 'A cidade é obrigatória.';
      valid = false;
    }

    if (!formData.varEstado.trim()) {
      errors.varEstado = 'O estado (UF) é obrigatório.';
      valid = false;
    }

    if (!formData.varNumeroCasa.trim()) {
      errors.varNumeroCasa = 'O número da casa é obrigatório.';
      valid = false;
    }

    if (!formData.varNivelEscolar) {
      errors.varNivelEscolar = 'O nível escolar é obrigatório.';
      valid = false;
    }

    if (!formData.varInstituicaoNome.trim()) {
      errors.varInstituicaoNome = 'A instituição de ensino é obrigatória.';
      valid = false;
    }

    if (!formData.varPeriodoCursando.trim()) {
      errors.varPeriodoCursando = 'O período/ano é obrigatório.';
      valid = false;
    }

    if (!formData.varModalidadeEnsino) {
      errors.varModalidadeEnsino = 'A modalidade é obrigatória.';
      valid = false;
    }

    if (!formData.varTurnoEnsino) {
      errors.varTurnoEnsino = 'O turno é obrigatório.';
      valid = false;
    }

    setFormErrors(errors);

    if (!valid) {
      const p0Fields = ['varNomeCompleto', 'varCPF', 'varDataNascimento', 'varSexo', 'varEstadoCivil'];
      const p1Fields = ['varEmail', 'varTelefone', 'varCEP', 'varLogradouro', 'varBairro', 'varCidade', 'varEstado', 'varNumeroCasa'];
      const p2Fields = ['varNivelEscolar', 'varInstituicaoNome', 'varPeriodoCursando', 'varModalidadeEnsino', 'varTurnoEnsino'];

      const firstErrKey = Object.keys(errors)[0];
      if (p0Fields.includes(firstErrKey)) {
        setActiveTab('pessoal');
      } else if (p1Fields.includes(firstErrKey)) {
        setActiveTab('contato');
      } else if (p2Fields.includes(firstErrKey)) {
        setActiveTab('educacao');
      }

      setFocusedField(firstErrKey);
    }

    return valid;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1500);
  };

  const handleReset = () => {
    setFormData({
      varNomeCompleto: '',
      varCPF: '',
      varDataNascimento: '',
      varEmail: '',
      varTelefone: '',
      varSexo: '',
      varEstadoCivil: '',
      varCEP: '',
      varLogradouro: '',
      varBairro: '',
      varCidade: '',
      varEstado: '',
      varNumeroCasa: '',
      varNivelEscolar: '',
      varInstituicaoNome: '',
      varPeriodoCursando: '',
      varModalidadeEnsino: '',
      varTurnoEnsino: ''
    });
    setFormErrors({});
    setIsSubmitted(false);
    setActiveTab('pessoal');
    nameFocusTimeRef.current = null;
    nameUnlockedRef.current = false;
    unlockedRef.current = [];
  };

  return (
    <div className={styles.pageContainer}>
      {/* Top Navbar */}
      <header className={styles.navbar}>
        <div className={styles.navLeft}>
          <Button
            appearance="subtle"
            icon={<ArrowLeft24Regular />}
            onClick={onBackToChat}
            className={styles.backButton}
          >
            Voltar ao Chat
          </Button>
          <div className={styles.separator} />
          <Text className={styles.navTitle} weight="semibold">
            Solicitação de Credenciais
          </Text>
        </div>

        {/* Centralized Goose Mischief Meter & Controls */}
        <div className={styles.navMischiefMeter}>
          <div className={styles.navMischiefHeader}>
            <span className={styles.navMischiefTitle}>
              <GooseHeadIcon isChaos={isChaosMode} />
              {isChaosMode ? "Ganso no MODO CAOS!" : "Travessura do Ganso"}
            </span>
            <div className={styles.mischiefControls}>
              <span className={styles.mischiefPercent}>{mischiefLevel}%</span>
            </div>
          </div>
          <div className={styles.navMischiefTrack}>
            <div 
              className={`${styles.navMischiefFill} ${isChaosMode ? styles.chaosFill : ''}`} 
              style={{ width: `${mischiefLevel}%` }} 
            />
          </div>
        </div>

        <div className={styles.navRight}>
          <button 
            type="button"
            className={styles.soundToggleButton}
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? "Ativar som do ganso" : "Silenciar ganso"}
          >
            {isMuted ? "🔇" : "🔊"}
          </button>
          <Avatar size={32} name="User" image={{ src: '/Avatar_Default.svg' }} />
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {/* VSCode-style Goose Journey Sidebar - floats fixed at the top-left corner */}
        <GooseJourney 
          currentStep={getActiveStep()} 
          formData={formData} 
          isSubmitted={isSubmitted} 
          focusedField={focusedField}
          onFieldChange={(field, value) => handleInputChange(field, value)}
        />

        <div className={styles.formWrapper}>
          {/* Goose Mascot (Desktop Goose style) */}
          <GooseMascot 
            onHonk={handleGooseHonk} 
            focusedField={focusedField}
            onUnlockHeistAchievement={() => unlockAchievement('heist_victim')}
            onUnlockChaosAchievement={() => unlockAchievement('chaos_agent')}
            onChangeMischief={(level, isChaos) => {
              setMischiefLevel(level);
              setIsChaosMode(isChaos);
            }}
            isMuted={isMuted}
          />

          {!isSubmitted ? (
            <Card className={`${styles.formCard} ${isShaking ? styles.shake : ''}`} appearance="filled">
              <div className={styles.cardHeader}>
                <h2 className={styles.formTitle}>Formulário de Cadastro</h2>
                <p className={styles.formSubtitle}>
                  Preencha os campos abaixo para solicitar acesso ao ambiente. Use o chat flutuante no canto inferior direito se precisar de ajuda com alguma dúvida.
                </p>
              </div>

              {/* Tab Header List */}
              <div className={styles.tabList}>
                <button
                  type="button"
                  className={`${styles.tabButton} ${activeTab === 'pessoal' ? styles.tabButtonActive : ''}`}
                  onClick={() => setActiveTab('pessoal')}
                >
                  👤 Pessoal
                </button>
                <button
                  type="button"
                  className={`${styles.tabButton} ${activeTab === 'contato' ? styles.tabButtonActive : ''}`}
                  onClick={() => setActiveTab('contato')}
                >
                  📍 Contato/Endereço
                </button>
                <button
                  type="button"
                  className={`${styles.tabButton} ${activeTab === 'educacao' ? styles.tabButtonActive : ''}`}
                  onClick={() => setActiveTab('educacao')}
                >
                  🎓 Educação
                </button>
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
                {activeTab === 'pessoal' && (
                  <div className={styles.fieldGrid}>
                    {/* Nome Completo */}
                    <Field
                      label="Nome Completo"
                      required
                      validationMessage={formErrors.varNomeCompleto}
                      validationState={formErrors.varNomeCompleto ? 'error' : 'none'}
                    >
                      <Input
                        id="field-varNomeCompleto"
                        contentBefore={<Person24Regular />}
                        value={formData.varNomeCompleto}
                        onChange={(e) => handleInputChange('varNomeCompleto', e.target.value)}
                        onFocus={() => {
                          setFocusedField('varNomeCompleto');
                          if (!nameFocusTimeRef.current) {
                            nameFocusTimeRef.current = Date.now();
                          }
                        }}
                        onBlur={() => {
                          setFocusedField(null);
                          const normalized = capitalizeName(formData.varNomeCompleto);
                          if (normalized !== formData.varNomeCompleto) {
                            handleInputChange('varNomeCompleto', normalized);
                          }
                        }}
                        placeholder="Ex: João da Silva"
                        disabled={isSubmitting}
                      />
                    </Field>

                    {/* CPF e Data de Nascimento */}
                    <div className={styles.fieldRow}>
                      <Field
                        label="CPF"
                        required
                        validationMessage={formErrors.varCPF}
                        validationState={formErrors.varCPF ? 'error' : 'none'}
                      >
                        <Input
                          id="field-varCPF"
                          contentBefore={<Board24Regular />}
                          value={formData.varCPF}
                          onChange={(e) => handleInputChange('varCPF', e.target.value)}
                          onFocus={() => setFocusedField('varCPF')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="000.000.000-00"
                          disabled={isSubmitting}
                        />
                      </Field>

                      <Field
                        label="Data de Nascimento"
                        required
                        validationMessage={formErrors.varDataNascimento}
                        validationState={formErrors.varDataNascimento ? 'error' : 'none'}
                      >
                        <Input
                          id="field-varDataNascimento"
                          contentBefore={<Calendar24Regular />}
                          value={formData.varDataNascimento}
                          onChange={(e) => handleInputChange('varDataNascimento', e.target.value)}
                          onFocus={() => setFocusedField('varDataNascimento')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="DD/MM/AAAA"
                          disabled={isSubmitting}
                        />
                      </Field>
                    </div>

                    {/* Sexo e Estado Civil */}
                    <div className={styles.fieldRow}>
                      <Field
                        label="Sexo"
                        required
                        validationMessage={formErrors.varSexo}
                        validationState={formErrors.varSexo ? 'error' : 'none'}
                      >
                        <select
                          id="field-varSexo"
                          className={styles.dropdownSelect}
                          value={formData.varSexo}
                          onChange={(e) => handleInputChange('varSexo', e.target.value)}
                          onFocus={() => setFocusedField('varSexo')}
                          onBlur={() => setFocusedField(null)}
                          disabled={isSubmitting}
                        >
                          <option value="">Selecione...</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Feminino">Feminino</option>
                          <option value="Transgênero">Transgênero</option>
                          <option value="Outro">Outro</option>
                          <option value="Preferiu não dizer">Preferiu não dizer</option>
                        </select>
                      </Field>

                      <Field
                        label="Estado Civil"
                        required
                        validationMessage={formErrors.varEstadoCivil}
                        validationState={formErrors.varEstadoCivil ? 'error' : 'none'}
                      >
                        <select
                          id="field-varEstadoCivil"
                          className={styles.dropdownSelect}
                          value={formData.varEstadoCivil}
                          onChange={(e) => handleInputChange('varEstadoCivil', e.target.value)}
                          onFocus={() => setFocusedField('varEstadoCivil')}
                          onBlur={() => setFocusedField(null)}
                          disabled={isSubmitting}
                        >
                          <option value="">Selecione...</option>
                          <option value="Solteiro(a)">Solteiro(a)</option>
                          <option value="Casado(a)">Casado(a)</option>
                          <option value="Divorciado(a)">Divorciado(a)</option>
                          <option value="Viúvo(a)">Viúvo(a)</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </Field>
                    </div>
                  </div>
                )}

                {activeTab === 'contato' && (
                  <div className={styles.fieldGrid}>
                    {/* E-mail e Telefone */}
                    <div className={styles.fieldRow}>
                      <Field
                        label="E-mail"
                        required
                        validationMessage={formErrors.varEmail}
                        validationState={formErrors.varEmail ? 'error' : 'none'}
                      >
                        <Input
                          id="field-varEmail"
                          contentBefore={<Mail24Regular />}
                          type="email"
                          value={formData.varEmail}
                          onChange={(e) => handleInputChange('varEmail', e.target.value)}
                          onFocus={() => setFocusedField('varEmail')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="usuario@dominio.com"
                          disabled={isSubmitting}
                        />
                      </Field>

                      <Field
                        label="Telefone"
                        required
                        validationMessage={formErrors.varTelefone}
                        validationState={formErrors.varTelefone ? 'error' : 'none'}
                      >
                        <Input
                          id="field-varTelefone"
                          contentBefore={<Phone24Regular />}
                          value={formData.varTelefone}
                          onChange={(e) => handleInputChange('varTelefone', e.target.value)}
                          onFocus={() => setFocusedField('varTelefone')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="(XX) XXXXX-XXXX"
                          disabled={isSubmitting}
                        />
                      </Field>
                    </div>

                    {/* CEP e Número */}
                    <div className={styles.fieldRow}>
                      <Field
                        label="CEP"
                        required
                        validationMessage={formErrors.varCEP}
                        validationState={formErrors.varCEP ? 'error' : 'none'}
                      >
                        <Input
                          id="field-varCEP"
                          contentBefore={<Home24Regular />}
                          value={formData.varCEP}
                          onChange={(e) => handleInputChange('varCEP', e.target.value)}
                          onFocus={() => setFocusedField('varCEP')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="XXXXX-XXX"
                          disabled={isSubmitting}
                        />
                      </Field>

                      <Field
                        label="Número da Casa"
                        required
                        validationMessage={formErrors.varNumeroCasa}
                        validationState={formErrors.varNumeroCasa ? 'error' : 'none'}
                      >
                        <Input
                          id="field-varNumeroCasa"
                          contentBefore={<Home24Regular />}
                          value={formData.varNumeroCasa}
                          onChange={(e) => handleInputChange('varNumeroCasa', e.target.value)}
                          onFocus={() => setFocusedField('varNumeroCasa')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="Ex: 123"
                          disabled={isSubmitting}
                        />
                      </Field>
                    </div>

                    {/* Logradouro */}
                    <Field
                      label="Rua / Avenida (Logradouro)"
                      required
                      validationMessage={formErrors.varLogradouro}
                      validationState={formErrors.varLogradouro ? 'error' : 'none'}
                    >
                      <Input
                        id="field-varLogradouro"
                        contentBefore={<Home24Regular />}
                        value={formData.varLogradouro}
                        onChange={(e) => handleInputChange('varLogradouro', e.target.value)}
                        onFocus={() => setFocusedField('varLogradouro')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Ex: Avenida Paulista"
                        disabled={isSubmitting}
                      />
                    </Field>

                    {/* Bairro e Cidade */}
                    <div className={styles.fieldRow}>
                      <Field
                        label="Bairro"
                        required
                        validationMessage={formErrors.varBairro}
                        validationState={formErrors.varBairro ? 'error' : 'none'}
                      >
                        <Input
                          id="field-varBairro"
                          contentBefore={<Home24Regular />}
                          value={formData.varBairro}
                          onChange={(e) => handleInputChange('varBairro', e.target.value)}
                          onFocus={() => setFocusedField('varBairro')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="Ex: Bela Vista"
                          disabled={isSubmitting}
                        />
                      </Field>

                      <Field
                        label="Cidade"
                        required
                        validationMessage={formErrors.varCidade}
                        validationState={formErrors.varCidade ? 'error' : 'none'}
                      >
                        <Input
                          id="field-varCidade"
                          contentBefore={<Home24Regular />}
                          value={formData.varCidade}
                          onChange={(e) => handleInputChange('varCidade', e.target.value)}
                          onFocus={() => setFocusedField('varCidade')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="Ex: São Paulo"
                          disabled={isSubmitting}
                        />
                      </Field>
                    </div>

                    {/* Estado */}
                    <Field
                      label="Estado (UF)"
                      required
                      validationMessage={formErrors.varEstado}
                      validationState={formErrors.varEstado ? 'error' : 'none'}
                    >
                      <Input
                        id="field-varEstado"
                        contentBefore={<Home24Regular />}
                        value={formData.varEstado}
                        onChange={(e) => handleInputChange('varEstado', e.target.value)}
                        onFocus={() => setFocusedField('varEstado')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Ex: SP"
                        disabled={isSubmitting}
                      />
                    </Field>
                  </div>
                )}

                {activeTab === 'educacao' && (
                  <div className={styles.fieldGrid}>
                    {/* Nível Escolar e Período */}
                    <div className={styles.fieldRow}>
                      <Field
                        label="Nível Escolar"
                        required
                        validationMessage={formErrors.varNivelEscolar}
                        validationState={formErrors.varNivelEscolar ? 'error' : 'none'}
                      >
                        <select
                          id="field-varNivelEscolar"
                          className={styles.dropdownSelect}
                          value={formData.varNivelEscolar}
                          onChange={(e) => handleInputChange('varNivelEscolar', e.target.value)}
                          onFocus={() => setFocusedField('varNivelEscolar')}
                          onBlur={() => setFocusedField(null)}
                          disabled={isSubmitting}
                        >
                          <option value="">Selecione...</option>
                          <option value="Fundamental">Fundamental</option>
                          <option value="Médio">Médio</option>
                          <option value="Técnico">Técnico</option>
                          <option value="Superior">Superior</option>
                        </select>
                      </Field>

                      <Field
                        label="Período / Ano Cursando"
                        required
                        validationMessage={formErrors.varPeriodoCursando}
                        validationState={formErrors.varPeriodoCursando ? 'error' : 'none'}
                      >
                        <Input
                          id="field-varPeriodoCursando"
                          contentBefore={<Briefcase24Regular />}
                          value={formData.varPeriodoCursando}
                          onChange={(e) => handleInputChange('varPeriodoCursando', e.target.value)}
                          onFocus={() => setFocusedField('varPeriodoCursando')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="Ex: 1º período, 3º ano"
                          disabled={isSubmitting}
                        />
                      </Field>
                    </div>

                    {/* Nome da Instituição */}
                    <Field
                      label="Nome da Instituição"
                      required
                      validationMessage={formErrors.varInstituicaoNome}
                      validationState={formErrors.varInstituicaoNome ? 'error' : 'none'}
                    >
                      <Input
                        id="field-varInstituicaoNome"
                        contentBefore={<BookOpen24Regular />}
                        value={formData.varInstituicaoNome}
                        onChange={(e) => handleInputChange('varInstituicaoNome', e.target.value)}
                        onFocus={() => setFocusedField('varInstituicaoNome')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Ex: Universidade de São Paulo"
                        disabled={isSubmitting}
                      />
                    </Field>

                    {/* Modalidade e Turno */}
                    <div className={styles.fieldRow}>
                      <Field
                        label="Modalidade"
                        required
                        validationMessage={formErrors.varModalidadeEnsino}
                        validationState={formErrors.varModalidadeEnsino ? 'error' : 'none'}
                      >
                        <select
                          id="field-varModalidadeEnsino"
                          className={styles.dropdownSelect}
                          value={formData.varModalidadeEnsino}
                          onChange={(e) => handleInputChange('varModalidadeEnsino', e.target.value)}
                          onFocus={() => setFocusedField('varModalidadeEnsino')}
                          onBlur={() => setFocusedField(null)}
                          disabled={isSubmitting}
                        >
                          <option value="">Selecione...</option>
                          <option value="Presencial">Presencial</option>
                          <option value="EAD">EAD</option>
                          <option value="Semipresencial">Semipresencial</option>
                        </select>
                      </Field>

                      <Field
                        label="Turno"
                        required
                        validationMessage={formErrors.varTurnoEnsino}
                        validationState={formErrors.varTurnoEnsino ? 'error' : 'none'}
                      >
                        <select
                          id="field-varTurnoEnsino"
                          className={styles.dropdownSelect}
                          value={formData.varTurnoEnsino}
                          onChange={(e) => handleInputChange('varTurnoEnsino', e.target.value)}
                          onFocus={() => setFocusedField('varTurnoEnsino')}
                          onBlur={() => setFocusedField(null)}
                          disabled={isSubmitting}
                        >
                          <option value="">Selecione...</option>
                          <option value="Matutino">Matutino</option>
                          <option value="Vespertino">Vespertino</option>
                          <option value="Noturno">Noturno</option>
                        </select>
                      </Field>
                    </div>
                  </div>
                )}

                {/* Navigation and Submit Buttons */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  {activeTab === 'contato' && (
                    <Button
                      type="button"
                      size="large"
                      onClick={() => setActiveTab('pessoal')}
                      disabled={isSubmitting}
                      style={{ flex: 1 }}
                    >
                      Anterior
                    </Button>
                  )}
                  {activeTab === 'educacao' && (
                    <Button
                      type="button"
                      size="large"
                      onClick={() => setActiveTab('contato')}
                      disabled={isSubmitting}
                      style={{ flex: 1 }}
                    >
                      Anterior
                    </Button>
                  )}
                  
                  {activeTab !== 'educacao' ? (
                    <Button
                      type="button"
                      appearance="primary"
                      size="large"
                      onClick={() => {
                        if (activeTab === 'pessoal') setActiveTab('contato');
                        else if (activeTab === 'contato') setActiveTab('educacao');
                      }}
                      disabled={isSubmitting}
                      className={styles.submitButton}
                      style={{ flex: 1 }}
                    >
                      Próximo
                    </Button>
                  ) : (
                    <Button
                      appearance="primary"
                      type="submit"
                      size="large"
                      disabled={isSubmitting}
                      className={styles.submitButton}
                      style={{ flex: 1 }}
                    >
                      {isSubmitting ? 'Enviando...' : 'Enviar Solicitação'}
                    </Button>
                  )}
                </div>
              </form>
            </Card>
          ) : (
            <Card className={styles.successCard} appearance="filled">
              <div className={styles.successIconWrapper}>
                <CheckmarkCircle24Filled className={styles.successIcon} />
              </div>
              <h2 className={styles.successTitle}>Solicitação Enviada!</h2>
              <p className={styles.successSubtitle}>
                Obrigado pelo seu cadastro, <strong>{formData.varNomeCompleto}</strong>. Nossa equipe irá analisar a solicitação enviada para <strong>{formData.varEmail}</strong> e responderemos em breve.
              </p>
              <div className={styles.successActions}>
                <Button appearance="primary" onClick={onBackToChat} size="large">
                  Voltar para o Chat Principal
                </Button>
                <Button appearance="outline" onClick={handleReset} size="large">
                  Enviar Outro Cadastro
                </Button>
              </div>
            </Card>
          )}
        </div>
      </main>

      {/* Floating Chatbot Widget */}
      <FloatingChatWidget 
        isChaosMode={isChaosMode} 
        currentStep={getActiveStep()} 
        formData={formData}
        onFormUpdate={handleInputChange}
      />

      {/* Toast Notifications */}
      <div className={styles.toastContainer}>
        {activeToasts.map((toast) => (
          <div key={toast.id} className={styles.toastCard}>
            <div className={styles.toastIcon}>{toast.icon}</div>
            <div className={styles.toastText}>
              <div className={styles.toastTitle}>{toast.title}</div>
              <div className={styles.toastDesc}>{toast.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
