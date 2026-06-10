import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Input, Field, Text, Card, Avatar } from '@fluentui/react-components';
import { ArrowLeft24Regular, Person24Regular, Mail24Regular, Board24Regular, Briefcase24Regular, CheckmarkCircle24Filled } from '@fluentui/react-icons';
import { FloatingChatWidget } from './chat/FloatingChatWidget';
import { GooseMascot } from './GooseMascot';
import styles from './RegistrationForm.module.css';

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

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onBackToChat }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    role: '',
  });

  const [formErrors, setFormErrors] = useState({
    name: '',
    email: '',
    organization: '',
    role: '',
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // Gamification states
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [activeToasts, setActiveToasts] = useState<{ id: string; title: string; description: string; icon: string }[]>([]);
  const [focusedField, setFocusedField] = useState<'name' | 'email' | 'organization' | 'role' | null>(null);
  const [mischiefLevel, setMischiefLevel] = useState(20);
  const [isChaosMode, setIsChaosMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const nameFocusTimeRef = useRef<number | null>(null);
  const nameUnlockedRef = useRef(false);
  const unlockedRef = useRef<string[]>([]);

  const unlockAchievement = useCallback((id: string) => {
    if (unlockedRef.current.includes(id)) return;
    unlockedRef.current.push(id);

    setUnlockedAchievements((prev) => [...prev, id]);

    const achievement = ACHIEVEMENTS[id];
    if (achievement) {
      if (!isMuted) {
        playAchievementSound();
      }

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

    setClickCount((prev) => {
      const nextCount = prev + 1;
      if (nextCount >= 5) {
        unlockAchievement('duck_friend');
      }
      return nextCount;
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: '' }));

    // Speed typing check
    if (field === 'name' && nameFocusTimeRef.current && !nameUnlockedRef.current) {
      if (value.trim().length > 6 && value.trim().includes(' ')) {
        const duration = Date.now() - nameFocusTimeRef.current;
        if (duration < 4000) {
          nameUnlockedRef.current = true;
          unlockAchievement('speed');
        }
      }
    }
  };

  const validateForm = () => {
    let valid = true;
    const errors = { name: '', email: '', organization: '', role: '' };

    if (!formData.name.trim()) {
      errors.name = 'O nome é obrigatório.';
      valid = false;
    }

    if (!formData.email.trim()) {
      errors.email = 'O e-mail é obrigatório.';
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'E-mail inválido.';
      valid = false;
    }

    if (!formData.organization.trim()) {
      errors.organization = 'A organização é obrigatória.';
      valid = false;
    }

    if (!formData.role.trim()) {
      errors.role = 'O cargo/função é obrigatório.';
      valid = false;
    }

    setFormErrors(errors);

    // Auto-focus first field with error to slide the goose there
    if (!valid) {
      if (errors.name) setFocusedField('name');
      else if (errors.email) setFocusedField('email');
      else if (errors.organization) setFocusedField('organization');
      else if (errors.role) setFocusedField('role');
    }

    return valid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    // Mock API submission delay
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1500);
  };

  const handleReset = () => {
    setFormData({ name: '', email: '', organization: '', role: '' });
    setIsSubmitted(false);
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
        <div className={styles.navRight}>
          <Avatar size={32} name="User" image={{ src: '/Avatar_Default.svg' }} />
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.mainContent}>
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
              {/* Goose Mischief Meter */}
              <div className={styles.formMischiefMeter}>
                <div className={styles.mischiefHeader}>
                  <span className={styles.mischiefTitle}>
                    {isChaosMode ? "👿 Ganso no MODO CAOS!" : "🦆 Travessura do Ganso"}
                  </span>
                  <div className={styles.mischiefControls}>
                    <button 
                      type="button"
                      className={styles.soundToggleButton}
                      onClick={() => setIsMuted(!isMuted)}
                      title={isMuted ? "Ativar som do ganso" : "Silenciar ganso"}
                    >
                      {isMuted ? "🔇" : "🔊"}
                    </button>
                    <span className={styles.mischiefPercent}>{mischiefLevel}%</span>
                  </div>
                </div>
                <div className={styles.mischiefTrack}>
                  <div 
                    className={`${styles.mischiefFill} ${isChaosMode ? styles.chaosFill : ''}`} 
                    style={{ width: `${mischiefLevel}%` }} 
                  />
                </div>
              </div>

              <div className={styles.cardHeader}>
                <h2 className={styles.formTitle}>Formulário de Cadastro</h2>
                <p className={styles.formSubtitle}>
                  Preencha os campos abaixo para solicitar acesso ao ambiente. Use o chat flutuante no canto inferior direito se precisar de ajuda com alguma dúvida.
                </p>
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
                {/* Nome */}
                <Field
                  label="Nome Completo"
                  required
                  validationMessage={formErrors.name}
                  validationState={formErrors.name ? 'error' : 'none'}
                >
                  <Input
                    id="field-name"
                    contentBefore={<Person24Regular />}
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    onFocus={() => {
                      setFocusedField('name');
                      if (!nameFocusTimeRef.current) {
                        nameFocusTimeRef.current = Date.now();
                      }
                    }}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Ex: João Silva"
                    disabled={isSubmitting}
                  />
                </Field>

                {/* E-mail */}
                <Field
                  label="E-mail Corporativo"
                  required
                  validationMessage={formErrors.email}
                  validationState={formErrors.email ? 'error' : 'none'}
                >
                  <Input
                    id="field-email"
                    contentBefore={<Mail24Regular />}
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Ex: joao.silva@empresa.com"
                    disabled={isSubmitting}
                  />
                </Field>

                {/* Organização */}
                <Field
                  label="Empresa / Organização"
                  required
                  validationMessage={formErrors.organization}
                  validationState={formErrors.organization ? 'error' : 'none'}
                >
                  <Input
                    id="field-organization"
                    contentBefore={<Board24Regular />}
                    value={formData.organization}
                    onChange={(e) => handleInputChange('organization', e.target.value)}
                    onFocus={() => setFocusedField('organization')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Ex: Minha Empresa LTDA"
                    disabled={isSubmitting}
                  />
                </Field>

                {/* Cargo */}
                <Field
                  label="Cargo / Função"
                  required
                  validationMessage={formErrors.role}
                  validationState={formErrors.role ? 'error' : 'none'}
                >
                  <Input
                    id="field-role"
                    contentBefore={<Briefcase24Regular />}
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    onFocus={() => setFocusedField('role')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Ex: Engenheiro de Software"
                    disabled={isSubmitting}
                  />
                </Field>

                <Button
                  appearance="primary"
                  type="submit"
                  size="large"
                  disabled={isSubmitting}
                  className={styles.submitButton}
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar Solicitação'}
                </Button>
              </form>
            </Card>
          ) : (
            <Card className={styles.successCard} appearance="filled">
              <div className={styles.successIconWrapper}>
                <CheckmarkCircle24Filled className={styles.successIcon} />
              </div>
              <h2 className={styles.successTitle}>Solicitação Enviada!</h2>
              <p className={styles.successSubtitle}>
                Obrigado pelo seu cadastro, <strong>{formData.name}</strong>. Nossa equipe irá analisar a solicitação enviada para <strong>{formData.email}</strong> e responderemos em breve.
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
      <FloatingChatWidget />

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
