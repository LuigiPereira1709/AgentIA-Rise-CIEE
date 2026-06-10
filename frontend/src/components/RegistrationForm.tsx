import React, { useState } from 'react';
import { Button, Input, Field, Text, Card, Avatar } from '@fluentui/react-components';
import { ArrowLeft24Regular, Person24Regular, Mail24Regular, Board24Regular, Briefcase24Regular, CheckmarkCircle24Filled } from '@fluentui/react-icons';
import { FloatingChatWidget } from './chat/FloatingChatWidget';
import styles from './RegistrationForm.module.css';

interface RegistrationFormProps {
  onBackToChat: () => void;
}

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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: '' }));
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
          {!isSubmitted ? (
            <Card className={styles.formCard} appearance="filled">
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
                    contentBefore={<Person24Regular />}
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
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
                    contentBefore={<Mail24Regular />}
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
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
                    contentBefore={<Board24Regular />}
                    value={formData.organization}
                    onChange={(e) => handleInputChange('organization', e.target.value)}
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
                    contentBefore={<Briefcase24Regular />}
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
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
    </div>
  );
};
