import React, { useState, useRef, useCallback } from 'react';
import { GooseBodyIcon } from './RegistrationForm';
import styles from './GooseJourney.module.css';

interface GooseJourneyProps {
  currentStep: number;
  formData: {
    varNomeCompleto: string;
    varCPF: string;
    varDataNascimento: string;
    varEmail: string;
    varTelefone: string;
    varSexo: string;
    varEstadoCivil: string;
    varCEP: string;
    varLogradouro: string;
    varBairro: string;
    varCidade: string;
    varEstado: string;
    varNumeroCasa: string;
    varNivelEscolar: string;
    varInstituicaoNome: string;
    varPeriodoCursando: string;
    varModalidadeEnsino: string;
    varTurnoEnsino: string;
  };
  isSubmitted: boolean;
  focusedField: string | null;
  onFieldChange: (field: any, value: string) => void;
}

type FormKey = keyof GooseJourneyProps['formData'];

const PHASES = [
  {
    id: 0,
    title: 'Pessoal',
    icon: '👤',
    fields: [
      { key: 'varNomeCompleto' as FormKey, label: 'Nome Completo', type: 'text' },
      { key: 'varCPF' as FormKey, label: 'CPF', type: 'text' },
      { key: 'varDataNascimento' as FormKey, label: 'Nascimento', type: 'text' },
      { key: 'varSexo' as FormKey, label: 'Sexo', type: 'text' },
      { key: 'varEstadoCivil' as FormKey, label: 'Estado Civil', type: 'text' }
    ]
  },
  {
    id: 1,
    title: 'Contato/Endereço',
    icon: '📍',
    fields: [
      { key: 'varEmail' as FormKey, label: 'E-mail', type: 'email' },
      { key: 'varTelefone' as FormKey, label: 'Telefone', type: 'tel' },
      { key: 'varCEP' as FormKey, label: 'CEP', type: 'text' },
      { key: 'varLogradouro' as FormKey, label: 'Logradouro', type: 'text' },
      { key: 'varBairro' as FormKey, label: 'Bairro', type: 'text' },
      { key: 'varCidade' as FormKey, label: 'Cidade', type: 'text' },
      { key: 'varEstado' as FormKey, label: 'Estado', type: 'text' },
      { key: 'varNumeroCasa' as FormKey, label: 'Número', type: 'text' }
    ]
  },
  {
    id: 2,
    title: 'Educação',
    icon: '🎓',
    fields: [
      { key: 'varNivelEscolar' as FormKey, label: 'Nível Escolar', type: 'text' },
      { key: 'varInstituicaoNome' as FormKey, label: 'Instituição', type: 'text' },
      { key: 'varPeriodoCursando' as FormKey, label: 'Período', type: 'text' },
      { key: 'varModalidadeEnsino' as FormKey, label: 'Modalidade', type: 'text' },
      { key: 'varTurnoEnsino' as FormKey, label: 'Turno', type: 'text' }
    ]
  },
  {
    id: 3,
    title: 'Finalizado!',
    icon: '🎉',
    fields: []
  }
];

export const GooseJourney: React.FC<GooseJourneyProps> = ({ 
  currentStep, 
  formData, 
  isSubmitted, 
  focusedField,
  onFieldChange
}) => {
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());

  // LOCAL edit state — isolated from formData so parent is never touched mid-edit
  const [localEditValues, setLocalEditValues] = useState<Partial<Record<FormKey, string>>>({});

  // Error warnings per field
  const [errorFields, setErrorFields] = useState<Set<FormKey>>(new Set());
  const errorTimers = useRef<Partial<Record<FormKey, ReturnType<typeof setTimeout>>>>({});

  const showFieldError = useCallback((key: FormKey) => {
    setErrorFields(prev => new Set(prev).add(key));
    if (errorTimers.current[key]) clearTimeout(errorTimers.current[key]);
    errorTimers.current[key] = setTimeout(() => {
      setErrorFields(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 2500);
  }, []);

  const togglePhase = (phaseId: number, phaseFields: { key: FormKey }[]) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        // Closing: clear local state for this phase's fields
        setLocalEditValues(prev => {
          const updated = { ...prev };
          phaseFields.forEach(f => delete updated[f.key]);
          return updated;
        });
        next.delete(phaseId);
      } else {
        // Opening: seed local state from current formData (our snapshot)
        setLocalEditValues(prev => {
          const updated = { ...prev };
          phaseFields.forEach(f => { updated[f.key] = formData[f.key]; });
          return updated;
        });
        next.add(phaseId);
      }
      return next;
    });
  };

  // Called on every keystroke — only updates LOCAL state, never touches parent
  const handleLocalChange = (key: FormKey, value: string) => {
    setLocalEditValues(prev => ({ ...prev, [key]: value }));
  };

  // Called on blur — validates and commits (or restores)
  const handleEditBlur = (key: FormKey) => {
    const localValue = (localEditValues[key] ?? '').trim();
    if (localValue === '') {
      // Restore: set local back to the last known good value from formData
      const restored = formData[key];
      setLocalEditValues(prev => ({ ...prev, [key]: restored }));
      showFieldError(key);
    } else {
      // Commit valid value to parent
      onFieldChange(key, localValue);
    }
  };

  return (
    <div className={styles.accordionContainer}>
      <div className={styles.accordionHeader}>
        <span className={styles.headerTitle}>SUA JORNADA</span>
        <span className={styles.headerSub}>progresso do cadastro</span>
      </div>

      <div className={styles.stepsWrapper}>
        {PHASES.map((phase, idx) => {
          const isCompleted = idx < currentStep || (idx === 3 && isSubmitted);
          const isActive    = idx === currentStep && !(idx === 3 && isSubmitted);
          const isLocked    = idx > currentStep;
          const isExpanded  = expandedPhases.has(phase.id);
          const showLivePreview = isActive && phase.fields.length > 0;
          const showEditPreview = isCompleted && isExpanded && phase.fields.length > 0;

          return (
            <div
              key={phase.id}
              className={[
                styles.phaseCard,
                isCompleted ? styles.completedCard : '',
                isActive    ? styles.activeCard    : '',
                isLocked    ? styles.lockedCard    : ''
              ].join(' ')}
            >
              {/* ── Header row ── */}
              <div
                className={[
                  styles.phaseHeader,
                  isCompleted && phase.fields.length > 0 ? styles.clickableHeader : ''
                ].join(' ')}
                onClick={() => isCompleted && phase.fields.length > 0 && togglePhase(phase.id, phase.fields)}
                role={isCompleted && phase.fields.length > 0 ? 'button' : undefined}
                aria-expanded={isCompleted ? isExpanded : undefined}
              >
                <div className={styles.phaseLeft}>
                  {isCompleted && <span className={styles.statusCheck}>✓</span>}
                  {isActive    && <span className={styles.statusDot} />}
                  {isLocked    && <span className={styles.statusLock}>○</span>}
                  <span className={styles.phaseIcon}>{phase.icon}</span>
                  <span className={styles.phaseTitle}>{phase.title}</span>
                </div>
                <div className={styles.phaseRight}>
                  {isCompleted && phase.fields.length > 0 && (
                    <span className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`}>›</span>
                  )}
                  {isActive && (
                    <span className={styles.gooseIndicator}>
                      <GooseBodyIcon />
                    </span>
                  )}
                </div>
              </div>

              {/* ── Active: live read-only preview (mirrors formData) ── */}
              {showLivePreview && (
                <div className={styles.fieldPreview}>
                  {phase.fields.map((field) => {
                    const value     = formData[field.key];
                    const isFilled  = value.trim() !== '';
                    const isFocused = focusedField === field.key;
                    return (
                      <div
                        key={field.key}
                        className={[
                          styles.miniField,
                          isFilled  ? styles.filledMiniField  : '',
                          isFocused ? styles.focusedMiniField : ''
                        ].join(' ')}
                      >
                        <span className={styles.miniLabel}>{field.label}</span>
                        <div className={styles.miniInput}>
                          {isFilled
                            ? <span className={styles.miniValue}>{value}</span>
                            : <span className={styles.miniPlaceholder}>Não preenchido</span>
                          }
                          {isFocused && <span className={styles.cursor} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Completed + expanded: editable with isolated local state ── */}
              {showEditPreview && (
                <div className={`${styles.fieldPreview} ${styles.reviewPreview}`}>
                  <span className={styles.reviewHint}>✏️ Clique para editar</span>
                  {phase.fields.map((field) => {
                    const hasError   = errorFields.has(field.key);
                    // Display the LOCAL value (isolated from formData during editing)
                    const localValue = localEditValues[field.key] ?? formData[field.key];
                    return (
                      <div
                        key={field.key}
                        className={[
                          styles.miniField,
                          styles.editableField,
                          hasError ? styles.errorField : ''
                        ].join(' ')}
                      >
                        <span className={styles.miniLabel}>{field.label}</span>
                        <input
                          type={field.type}
                          className={[
                            styles.miniEditInput,
                            hasError ? styles.miniEditInputError : ''
                          ].join(' ')}
                          value={localValue}
                          onChange={(e) => handleLocalChange(field.key, e.target.value)}
                          onBlur={() => handleEditBlur(field.key)}
                          placeholder="Digite aqui..."
                          spellCheck={false}
                        />
                        {hasError && (
                          <span className={styles.fieldErrorMsg}>
                            💡 Campo não pode ficar vazio — restaurado
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Final step active ── */}
              {isActive && phase.id === 3 && (
                <div className={styles.fieldPreview}>
                  <span className={styles.readyText}>Tudo pronto para enviar! 🚀</span>
                </div>
              )}

              {/* ── Connectors ── */}
              {idx < PHASES.length - 1 && (
                <>
                  <div className={`${styles.connector} ${isCompleted ? styles.connectorDone : ''}`} />
                  <div className={`${styles.connectorRight} ${isCompleted ? styles.connectorDone : ''}`} />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
