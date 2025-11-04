export type Page = 'generate' | 'translate' | 'learn';

export interface CustomTranslation {
  id: string;
  korean: string;
  english: string;
}

export interface GeneratedCopyItem {
  title: string;
  content: string;
}

export interface GeneratedCopy {
  mainTitle: string;
  sections: GeneratedCopyItem[];
}

export interface LearningItem {
  id: string;
  content: string;
}
