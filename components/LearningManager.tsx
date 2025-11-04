import React, { useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { type LearningItem } from '../types';

const LearningManager: React.FC = () => {
  const [learningItems, setLearningItems] = useLocalStorage<LearningItem[]>('learningContext', []);
  const [newItemText, setNewItemText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 2500);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    const newItem: LearningItem = {
      id: Date.now().toString(),
      content: newItemText.trim(),
    };
    setLearningItems([...learningItems, newItem]);
    setNewItemText('');
    showNotification('학습 자료가 추가되었습니다.');
  };

  const handleDeleteItem = (id: string) => {
    setLearningItems(learningItems.filter(item => item.id !== id));
    showNotification('학습 자료가 삭제되었습니다.');
  };
  
  const handleStartEdit = (item: LearningItem) => {
    setEditingId(item.id);
    setEditText(item.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleSaveEdit = (id: string) => {
    if (!editText.trim()) {
      showNotification('내용은 비워둘 수 없습니다.');
      return;
    }
    setLearningItems(learningItems.map(item =>
      item.id === id ? { ...item, content: editText.trim() } : item
    ));
    setEditingId(null);
    setEditText('');
    showNotification('학습 자료가 수정되었습니다.');
  };

  return (
    <div className="space-y-8">
       {notification && (
        <div className="fixed top-20 right-8 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in-out z-50">
          <i className="fa-solid fa-check-circle mr-2"></i>
          {notification}
        </div>
      )}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold mb-4">AI 학습 자료 입력</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          '박씨상방', 한국 전통 등 상세 문구 생성 시 AI가 참고할 배경 지식을 항목별로 추가하고 관리하세요.
        </p>
        <form onSubmit={handleAddItem} className="space-y-4">
          <textarea
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="AI에게 학습시킬 새로운 내용을 입력하세요..."
            className="w-full h-40 p-4 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-y"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-slate-400 transition-colors"
            >
              <i className="fa-solid fa-plus mr-2"></i>학습 자료 추가
            </button>
          </div>
        </form>
      </div>
      
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-bold mb-4">저장된 학습 자료 목록</h3>
        <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
          {learningItems.length > 0 ? (
            learningItems.map(item => (
              <div key={item.id} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                {editingId === item.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full h-32 p-2 border border-slate-300 dark:border-slate-500 rounded-md bg-white dark:bg-slate-600 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={handleCancelEdit} className="px-4 py-1.5 text-sm font-medium rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500">취소</button>
                      <button onClick={() => handleSaveEdit(item.id)} className="px-4 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700">저장</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap mb-3">{item.content}</p>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleStartEdit(item)} className="p-2 w-9 h-9 flex items-center justify-center text-sm font-medium rounded-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-600 dark:text-slate-300" aria-label="Edit item">
                        <i className="fa-solid fa-pencil"></i>
                      </button>
                      <button onClick={() => handleDeleteItem(item.id)} className="p-2 w-9 h-9 flex items-center justify-center text-sm font-medium rounded-full bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900 text-red-600 dark:text-red-400" aria-label="Delete item">
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-center py-10 text-slate-500">저장된 학습 자료가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LearningManager;
