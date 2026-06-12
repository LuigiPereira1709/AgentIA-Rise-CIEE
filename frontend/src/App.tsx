import { useState } from "react";
import { ErrorBoundary } from "./components/core/ErrorBoundary";
import { AgentChat } from "./components/AgentChat";
import { RegistrationForm } from "./components/RegistrationForm";
import { HomePage } from "./components/HomePage";
import type { Page } from "./components/HomePage";
import "./App.css";

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const navigate = (page: Page) => {
    setCurrentPage(page);
  };

  return (
    <ErrorBoundary>
      <div className="app-container">
        {currentPage === 'home' && (
          <HomePage onNavigate={navigate} />
        )}

        {currentPage === 'registration' && (
          <RegistrationForm onBackToChat={() => navigate('home')} />
        )}

        {currentPage === 'chat' && (
          <AgentChat onBack={() => navigate('home')} />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
