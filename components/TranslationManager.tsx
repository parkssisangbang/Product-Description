
import React, { useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { type CustomTranslation } from '../types';

const TranslationManager: React.FC = () => {
  const [translations, setTranslations] = useLocalStorage<CustomTranslation[]>('customTranslations', []);
  const [korean, setKorean] = useState('');
  const [english, setEnglish] = useState('');

  const handleAddTranslation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!korean.trim() || !english.trim()) return;

    const newTranslation: CustomTranslation = {
      id: Date.now().toString(),
      korean: korean.trim(),
      english: english.trim(),
    };
    setTranslations([...translations, newTranslation]);
    setKorean('');
    setEnglish('');
  };

  const handleDeleteTranslation = (id: string) => {
    setTranslations(translations.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold mb-4">한영 변환 단어 관리</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          AI가 번역할 때 특정 한글 단어를 지정된 영어로 변환하도록 규칙을 추가합니다. (예: '당초' → 'dangcho')
        </p>
        <form onSubmit={handleAddTranslation} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="w-full">
            <label htmlFor="korean-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">한글</label>
            <input
              id="korean-input"
              type="text"
              value={korean}
              onChange={(e) => setKorean(e.target.value)}
              placeholder="예: 당초"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>
          <div className="w-full">
            <label htmlFor="english-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">영어</label>
            <input
              id="english-input"
              type="text"
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
              placeholder="예: dangcho"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>
          <button
            type="submit"
            className="w-full px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-slate-400 transition-colors"
          >
            <i className="fa-solid fa-plus mr-2"></i>추가하기
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-bold mb-4">저장된 단어 목록</h3>
        <div className="max-h-96 overflow-y-auto pr-2">
          {translations.length > 0 ? (
            <ul className="space-y-3">
              {translations.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                >
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{t.korean}</span>
                    <i className="fa-solid fa-arrow-right-long mx-3 text-slate-400"></i>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{t.english}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteTranslation(t.id)}
                    className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"
                    aria-label="Delete translation"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center py-10 text-slate-500">저장된 변환 규칙이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TranslationManager;
