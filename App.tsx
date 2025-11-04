
import React, { useState } from 'react';
import Layout from './components/Layout';
import DescriptionGenerator from './components/DescriptionGenerator';
import TranslationManager from './components/TranslationManager';
import LearningManager from './components/LearningManager';
import { type Page } from './types';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('generate');

  const renderPage = () => {
    switch (currentPage) {
      case 'generate':
        return <DescriptionGenerator />;
      case 'translate':
        return <TranslationManager />;
      case 'learn':
        return <LearningManager />;
      default:
        return <DescriptionGenerator />;
    }
  };

  return (
    <Layout currentPage={currentPage} setCurrentPage={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
};

export default App;
