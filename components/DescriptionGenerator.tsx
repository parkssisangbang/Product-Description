import React, { useState, useCallback, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { generateFullProductCopy, regenerateMainTitle, regenerateSectionTitle, translateToEnglish, type ProductInput } from '../services/geminiService';
import { type CustomTranslation, type GeneratedCopy, type LearningItem } from '../types';
import LoadingSpinner from './LoadingSpinner';

type InputType = 'url' | 'text' | 'image';

const DescriptionGenerator: React.FC = () => {
  const [inputType, setInputType] = useState<InputType>('url');
  const [url, setUrl] = useState('');
  const [inputText, setInputText] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [koreanCopy, setKoreanCopy] = useState<GeneratedCopy | null>(null);
  const [englishCopy, setEnglishCopy] = useState<GeneratedCopy | null>(null);
  const [learningItems] = useLocalStorage<LearningItem[]>('learningContext', []);
  const [customTranslations] = useLocalStorage<CustomTranslation[]>('customTranslations', []);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [requiredKeywords, setRequiredKeywords] = useState<string[]>(['', '', '']);
  const [briefDescription, setBriefDescription] = useState('');
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  useEffect(() => {
    // Clean up object URLs to prevent memory leaks
    return () => {
      imagePreviews.forEach(preview => URL.revokeObjectURL(preview));
    };
  }, [imagePreviews]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedItem(id);
      setTimeout(() => setCopiedItem(null), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      alert('텍스트를 복사하는데 실패했습니다.');
    });
  };
  
  const handleKeywordChange = (index: number, value: string) => {
    const newKeywords = [...requiredKeywords];
    newKeywords[index] = value;
    setRequiredKeywords(newKeywords);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImageFiles(prev => [...prev, ...files]);
      // FIX: Added type assertion to resolve TypeScript error.
      // The 'file' from e.target.files was being inferred as 'unknown', causing a type mismatch.
      const newPreviews = files.map(file => URL.createObjectURL(file as Blob));
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => {
      const newPreviews = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index]);
      return newPreviews;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let productInput: ProductInput | null = null;
    let validationError: string | null = null;

    switch (inputType) {
      case 'url':
        if (!url.trim()) validationError = '상품 URL을 입력해주세요.';
        else productInput = { type: 'url', value: url };
        break;
      case 'text':
        if (!inputText.trim()) validationError = '분석할 텍스트를 입력해주세요.';
        else productInput = { type: 'text', value: inputText };
        break;
      case 'image':
        if (imageFiles.length === 0) validationError = '하나 이상의 이미지를 업로드해주세요.';
        else productInput = { type: 'images', value: imageFiles };
        break;
    }

    if (!requiredKeywords[0].trim()) {
        validationError = '첫 번째 필수 단어는 반드시 입력해야 합니다.';
    }

    if (validationError) {
      setError(validationError);
      return;
    }
    
    if (!productInput) return;

    setIsLoading(true);
    setError(null);
    setKoreanCopy(null);
    setEnglishCopy(null);
    try {
      const learningContext = learningItems.map(item => item.content).join('\n\n---\n\n');
      const result = await generateFullProductCopy(
        productInput,
        learningContext, 
        customTranslations,
        requiredKeywords.filter(k => k.trim() !== ''),
        briefDescription
      );
      setKoreanCopy(result.koreanCopy);
      setEnglishCopy(result.englishCopy);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateMainTitle = async () => {
    const id = 'main-ko';
    if (!koreanCopy || regeneratingId) return;

    setRegeneratingId(id);
    setError(null);
    try {
      const newKoreanTitle = await regenerateMainTitle(
        koreanCopy,
        'ko',
        requiredKeywords.filter(k => k.trim() !== ''),
        briefDescription,
        customTranslations
      );
      
      const newKoreanCopy = { ...koreanCopy, mainTitle: newKoreanTitle };
      setKoreanCopy(newKoreanCopy);

      const newEnglishCopy = await translateToEnglish(newKoreanCopy, customTranslations);
      setEnglishCopy(newEnglishCopy);

    } catch (err) {
      setError(err instanceof Error ? `제목 재생성 실패: ${err.message}` : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleRegenerateSectionTitle = async (sectionIndex: number) => {
    const id = `section-ko-${sectionIndex}`;
    if (!koreanCopy || !koreanCopy.sections[sectionIndex] || regeneratingId) return;

    setRegeneratingId(id);
    setError(null);
    try {
      const { content } = koreanCopy.sections[sectionIndex];
      const newKoreanTitle = await regenerateSectionTitle(
        content,
        koreanCopy.mainTitle,
        'ko',
        customTranslations
      );

      const updatedSections = [...koreanCopy.sections];
      updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], title: newKoreanTitle };
      const newKoreanCopy = { ...koreanCopy, sections: updatedSections };
      
      setKoreanCopy(newKoreanCopy);

      const newEnglishCopy = await translateToEnglish(newKoreanCopy, customTranslations);
      setEnglishCopy(newEnglishCopy);

    } catch (err) {
      setError(err instanceof Error ? `소제목 재생성 실패: ${err.message}` : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setRegeneratingId(null);
    }
  };
  
  interface CopyDisplayProps {
    title: string;
    copy: GeneratedCopy | null;
    lang: 'ko' | 'en';
    regeneratingId: string | null;
    onRegenerateMainTitle?: () => void;
    onRegenerateSectionTitle?: (index: number) => void;
  }

  const CopyDisplay: React.FC<CopyDisplayProps> = ({ title, copy, lang, regeneratingId, onRegenerateMainTitle, onRegenerateSectionTitle }) => {
    
    const handleCopyAll = () => {
      if (!copy) return;
      const allText = `${copy.mainTitle}\n\n${copy.sections.map(item => `${item.title}\n${item.content}`).join('\n\n')}`;
      handleCopy(allText, `all-${lang}`);
    };

    return (
      <div className="w-full lg:w-1/2 p-4">
        <div className="flex justify-between items-center mb-4 pb-2 border-b-2 border-slate-300 dark:border-slate-600">
          <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-300">{title}</h3>
          {copy && copy.sections.length > 0 && (
             <button 
              onClick={handleCopyAll}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${copiedItem === `all-${lang}`
                  ? 'bg-green-100 text-green-700 dark:bg-green-800/50 dark:text-green-300'
                  : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600'
              }`}
             >
               {copiedItem === `all-${lang}` ? (
                 <><i className="fa-solid fa-check"></i><span>복사됨</span></>
               ) : (
                 <><i className="fa-solid fa-copy"></i><span>전체 복사</span></>
               )}
            </button>
          )}
        </div>

        {!copy || copy.sections.length === 0 ? (
           <div className="text-center py-10 text-slate-500">
             <p>생성된 내용이 없습니다.</p>
           </div>
        ) : (
          <div>
            <div className="mb-6 bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
              <div className="flex items-center justify-center gap-2">
                <h4 className="font-bold text-xl text-center text-slate-800 dark:text-slate-200">{copy.mainTitle}</h4>
                {regeneratingId?.startsWith('main') ? (
                    <div className="w-9 h-9 flex items-center justify-center"><LoadingSpinner /></div>
                ) : (
                    lang === 'ko' && onRegenerateMainTitle && (
                      <button
                          onClick={onRegenerateMainTitle}
                          aria-label="Regenerate main title"
                          className="p-2 rounded-full transition-all text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
                          disabled={!!regeneratingId}
                      >
                          <i className="fa-solid fa-arrows-rotate fa-fw"></i>
                      </button>
                    )
                )}
              </div>
            </div>
            <div className="space-y-6">
                {copy.sections.map((item, index) => (
                  <div key={index} className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
                    <div className="flex items-start justify-between gap-4">
                        <h4 className="font-semibold text-lg text-blue-600 dark:text-blue-400">{item.title}</h4>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {regeneratingId === `section-ko-${index}` ? (
                            <div className="w-9 h-9 flex items-center justify-center"><LoadingSpinner /></div>
                          ) : (
                             lang === 'ko' && onRegenerateSectionTitle && (
                              <button
                                onClick={() => onRegenerateSectionTitle(index)}
                                aria-label="Regenerate section title"
                                className="p-2 rounded-full transition-all text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
                                disabled={!!regeneratingId}
                              >
                                <i className="fa-solid fa-arrows-rotate fa-fw"></i>
                              </button>
                            )
                          )}
                          <button
                            onClick={() => handleCopy(`${item.title}\n${item.content}`, `${lang}-${index}`)}
                            aria-label="Copy text"
                            className={`p-2 rounded-full transition-all text-slate-400 dark:text-slate-500
                              ${copiedItem === `${lang}-${index}` 
                                ? 'bg-green-100 dark:bg-green-800/50 text-green-700 dark:text-green-300' 
                                : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
                              }`
                            }
                          >
                            {copiedItem === `${lang}-${index}` ? (
                              <i className="fa-solid fa-check fa-fw"></i>
                            ) : (
                              <i className="fa-solid fa-copy fa-fw"></i>
                            )}
                          </button>
                        </div>
                    </div>
                    <p className="mt-2 text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{item.content}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  const InputTypeButton: React.FC<{
      label: string;
      icon: string;
      type: InputType;
      currentType: InputType;
      onClick: (type: InputType) => void;
  }> = ({ label, icon, type, currentType, onClick }) => (
      <button
          type="button"
          onClick={() => onClick(type)}
          className={`flex-1 sm:flex-initial sm:flex-shrink-0 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors flex items-center justify-center gap-2 ${
              currentType === type
                  ? 'bg-white dark:bg-slate-800 border-blue-600 text-blue-600'
                  : 'bg-slate-100 dark:bg-slate-800/50 border-transparent text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
      >
          <i className={`fa-solid ${icon}`}></i>
          {label}
      </button>
  );

  const commonInputClass = "w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition";

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold mb-4">상세 문구 생성</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">소스 종류(URL, 텍스트, 이미지)를 선택하고 필수 단어, 간략 설명을 입력 후 버튼을 누르세요.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-700">
             <div className="flex flex-col sm:flex-row -mb-px">
                <InputTypeButton label="URL" icon="fa-link" type="url" currentType={inputType} onClick={setInputType} />
                <InputTypeButton label="텍스트" icon="fa-paragraph" type="text" currentType={inputType} onClick={setInputType} />
                <InputTypeButton label="이미지" icon="fa-image" type="image" currentType={inputType} onClick={setInputType} />
             </div>
          </div>

          <div className="pt-4">
            {inputType === 'url' && (
                <div className="relative">
                  <i className="fa-solid fa-link absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://koreasang.co.kr/product/..."
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    disabled={isLoading}
                  />
                </div>
            )}
            {inputType === 'text' && (
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="AI가 참고할 텍스트를 여기에 붙여넣으세요."
                  className={`${commonInputClass} h-40 resize-y`}
                  disabled={isLoading}
                />
            )}
            {inputType === 'image' && (
              <div className="space-y-4">
                  <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center">
                      <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={isLoading}
                      />
                      <div className="text-slate-500 dark:text-slate-400">
                          <i className="fa-solid fa-cloud-arrow-up text-4xl mb-2"></i>
                          <p>이미지를 드래그하거나 여기를 클릭해서 업로드하세요.</p>
                      </div>
                  </div>
                  {imagePreviews.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {imagePreviews.map((preview, index) => (
                              <div key={index} className="relative group">
                                  <img src={preview} alt={`preview ${index}`} className="w-full h-24 object-cover rounded-md" />
                                  <button
                                      type="button"
                                      onClick={() => removeImage(index)}
                                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                      aria-label="Remove image"
                                      disabled={isLoading}
                                  >
                                      &times;
                                  </button>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
            )}
          </div>
           
           <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="brief-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  간략 설명
                </label>
                <textarea
                  id="brief-description"
                  value={briefDescription}
                  onChange={(e) => setBriefDescription(e.target.value)}
                  placeholder="제품의 핵심 특징이나 강조하고 싶은 내용을 입력하세요."
                  className={`${commonInputClass} h-32 resize-y`}
                  disabled={isLoading}
                />
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  제목 필수 단어
                </label>
                <div className="space-y-2">
                   <input
                      type="text"
                      value={requiredKeywords[0]}
                      onChange={(e) => handleKeywordChange(0, e.target.value)}
                      placeholder="필수 단어 1 (필수)"
                      className={commonInputClass}
                      disabled={isLoading}
                      required
                    />
                    <input
                      type="text"
                      value={requiredKeywords[1]}
                      onChange={(e) => handleKeywordChange(1, e.target.value)}
                      placeholder="필수 단어 2 (선택)"
                      className={commonInputClass}
                      disabled={isLoading}
                    />
                    <input
                      type="text"
                      value={requiredKeywords[2]}
                      onChange={(e) => handleKeywordChange(2, e.target.value)}
                      placeholder="필수 단어 3 (선택)"
                      className={commonInputClass}
                      disabled={isLoading}
                    />
                </div>
              </div>
           </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto flex justify-center items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? <LoadingSpinner /> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
              <span>{isLoading ? '생성 중...' : '생성하기'}</span>
            </button>
          </div>
        </form>
        {error && <p className="text-red-500 mt-4"><i className="fa-solid fa-circle-exclamation mr-2"></i>{error}</p>}
      </div>

      {isLoading && (
         <div className="text-center py-10 text-slate-500 dark:text-slate-400">
            <LoadingSpinner large={true} />
            <p className="mt-4 text-lg">AI가 문구를 작성하고 있습니다. 잠시만 기다려주세요...</p>
         </div>
      )}

      {(koreanCopy || englishCopy) && !isLoading && (
        <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl">
          <div className="flex flex-col lg:flex-row -m-4">
            <CopyDisplay 
              title="🇰🇷 한글 홍보 문구" 
              copy={koreanCopy} 
              lang="ko"
              regeneratingId={regeneratingId}
              onRegenerateMainTitle={handleRegenerateMainTitle}
              onRegenerateSectionTitle={handleRegenerateSectionTitle}
            />
            <CopyDisplay 
              title="🇺🇸 영문 홍보 문구" 
              copy={englishCopy} 
              lang="en" 
              regeneratingId={regeneratingId}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DescriptionGenerator;