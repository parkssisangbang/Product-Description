
import React from 'react';
import { type Page } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

const NavItem: React.FC<{
  page: Page;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  icon: string;
  label: string;
}> = ({ page, currentPage, setCurrentPage, icon, label }) => {
  const isActive = currentPage === page;
  return (
    <button
      onClick={() => setCurrentPage(page)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-blue-600 text-white shadow-md'
          : 'text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700'
      }`}
    >
      <i className={`fa-solid ${icon}`}></i>
      <span className="font-medium">{label}</span>
    </button>
  );
};

const Layout: React.FC<LayoutProps> = ({ children, currentPage, setCurrentPage }) => {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <i className="fa-solid fa-wand-magic-sparkles text-2xl text-blue-600"></i>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">박씨상방 상세설명 작성기</h1>
            </div>
            <nav className="flex items-center space-x-2 sm:space-x-4">
              <NavItem
                page="generate"
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                icon="fa-file-pen"
                label="상세문구작성"
              />
              <NavItem
                page="translate"
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                icon="fa-language"
                label="한영변환입력"
              />
              <NavItem
                page="learn"
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                icon="fa-book"
                label="학습"
              />
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 py-4">
        <div className="text-center text-sm text-slate-500 dark:text-slate-400">
            © 2024 박씨상방 상세설명 작성기. Powered by Google Gemini.
        </div>
      </footer>
    </div>
  );
};

export default Layout;