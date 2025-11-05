// Fix: Removed self-import from types.ts which was causing declaration conflicts with the types defined in this file.

export type UserRole = 'client' | 'staff';
export type MediaType = 'image' | 'video';
export type Tool = 'cursor' | 'pen' | 'highlighter' | 'comment';
export type CommentType = 'Note' | 'Blocker' | 'Question';
export type CommentStatus = 'Open' | 'Resolved';

export interface DrawingRegion {
  id: string;
  type: 'drawing';
  pathData: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
}

export interface PointRegion {
  id: string;
  type: 'point';
  point: { x: number; y: number };
}

export type Region = DrawingRegion | PointRegion;

export interface ReferenceFile {
  name: string;
  type: string;
  url: string;
  size: number;
}

export interface Annotation {
  id: string;
  authorRole: UserRole;
  authorName: string;
  text: string;
  createdAt: Date;
  timestamp?: number | null; // For video. General comments on videos will have this.
  regions: Region[]; // Can be empty for general comments
  
  commentType: CommentType;
  status: CommentStatus;
  assignee: string | null;
  dueDate: Date | null;
  labels: string[];
  referenceFile?: ReferenceFile | null;
  isInternal?: boolean;
}

export interface ChatMessage {
  id: string;
  authorRole: UserRole;
  authorName: string;
  text: string;
  createdAt: Date;
}

export interface AssetVersion {
  versionNumber: number;
  label: string;
  mediaType: MediaType;
  mediaUrl: string;
  annotations: Annotation[];
  createdAt: Date;
  createdBy: string;
}