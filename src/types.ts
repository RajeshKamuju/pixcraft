export type TemplateStyle = 'festival' | 'idcard' | 'birthday' | 'linkedin';

export interface Template {
  id: TemplateStyle;
  label: string;
  description: string;
  badge: string;
  color: string;
  gradient: string;
  longDesc: string;
  samplePrompt: string;
}

export interface Generation {
  id: string;
  userId: string;
  imageUrl: string;
  templateStyle: TemplateStyle;
  name: string;
  caption: string;
  createdAt: number; // UTC timestamp
  photoMode?: 'face' | 'object';
}

export interface AppStats {
  imagesCreated: number;
}
