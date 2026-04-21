export type SourceType = 'VOICE' | 'IMAGE' | 'CAMERA' | 'TEXT';

export type QuestionComponentType =
  | 'text'
  | 'equation'
  | 'table'
  | 'diagram_description'
  | 'image_reference'
  | 'options';

export interface TextComponent {
  type: 'text';
  content: string;
}

export interface EquationComponent {
  type: 'equation';
  content: string; // LaTeX string
  display: boolean; // true = block, false = inline
}

export interface TableComponent {
  type: 'table';
  headers: string[];
  rows: string[][];
}

export interface DiagramComponent {
  type: 'diagram_description';
  content: string; // Mermaid.js-compatible description
}

export interface ImageReferenceComponent {
  type: 'image_reference';
  url: string;
  caption?: string;
}

export interface OptionsComponent {
  type: 'options';
  items: string[]; // ["A. ...", "B. ...", ...]
}

export type QuestionComponent =
  | TextComponent
  | EquationComponent
  | TableComponent
  | DiagramComponent
  | ImageReferenceComponent
  | OptionsComponent;

export interface ParsedContent {
  questionText: string;
  type: 'multiple_choice' | 'short_answer' | 'long_answer' | 'calculation' | 'diagram_based';
  subject: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  components: QuestionComponent[];
  tags: string[];
}

export interface Question {
  id: string;
  userId: string;
  sourceType: SourceType;
  rawInput?: string;
  imageUrl?: string;
  audioUrl?: string;
  parsedContent: ParsedContent;
  subject?: string;
  difficulty?: string;
  tags: string[];
  createdAt: string;
}
