import { AssetVersion, ChatMessage } from './types';
import { addDays } from 'date-fns';

const MOCK_IMAGE_V1 = "https://picsum.photos/id/28/1280/720"; // Forest
const MOCK_VIDEO_V2 = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
const MOCK_IMAGE_V3 = "https://picsum.photos/id/15/1280/720"; // Waterfall (Current)

export const ASSIGNEES = ['Alice (Client)', 'Bob (Staff)', 'Charlie (VFX)'];
export const LABELS = ['Color', 'Edit', 'VFX', 'Audio', 'Legal', 'General'];

export const LABEL_KEYWORDS: Record<string, string[]> = {
  'Color': ['color', 'grading', 'contrast', 'saturation', 'hue', 'brightness', 'dark', 'light', 'tone', 'exposure', 'gamma'],
  'Audio': ['audio', 'sound', 'music', 'volume', 'sfx', 'dialogue', 'mix', 'mute', 'narration', 'decibels'],
  'Edit': ['edit', 'cut', 'transition', 'timing', 'pacing', 'crop', 'zoom', 'sequence', 'shot', 'trim'],
  'VFX': ['vfx', 'effects', 'compositing', 'greenscreen', 'cgi', 'render', 'tracking', 'roto', 'comp'],
  'Legal': ['legal', 'logo', 'clearance', 'trademark', 'copyright', 'brand', 'release', 'chiron', 'super'],
};


export const MOCK_VERSIONS: AssetVersion[] = [
  {
    versionNumber: 1,
    label: "Initial Concept Upload",
    mediaType: 'image',
    mediaUrl: MOCK_IMAGE_V1,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    createdBy: 'Bob (Staff)',
    annotations: [
      {
        id: 'v1-c1',
        authorRole: 'client',
        authorName: 'Alice (Client)',
        text: 'This is too dark, can we try a different angle? Specifically, the trees on the left feel too uniform.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 47),
        commentType: 'Blocker',
        status: 'Open',
        assignee: 'Bob (Staff)',
        dueDate: addDays(new Date(), 1),
        labels: ['Color', 'Edit'],
        regions: [
          {
            id: 'v1-r1',
            type: 'drawing',
            pathData: [ { x: 15, y: 30 }, { x: 20, y: 60 }, { x: 35, y: 55 }, { x: 30, y: 25 }, { x: 15, y: 30 } ],
            color: '#E57373',
            strokeWidth: 8,
          }
        ]
      }
    ]
  },
  {
    versionNumber: 2,
    label: "Video Walkthrough Test",
    mediaType: 'video',
    mediaUrl: MOCK_VIDEO_V2,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    createdBy: 'Bob (Staff)',
    annotations: [
      {
        id: 'v2-c1',
        authorRole: 'staff',
        authorName: 'Bob (Staff)',
        text: 'Check the transition here at 0:05.',
        timestamp: 5.2,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 23),
        commentType: 'Note',
        status: 'Resolved',
        assignee: 'Bob (Staff)',
        dueDate: null,
        labels: ['Edit', 'VFX'],
        regions: [
          {
            id: 'v2-r1',
            type: 'point',
            point: { x: 45, y: 50 },
          }
        ]
      }
    ]
  },
  {
    versionNumber: 3,
    label: "Revised Static Shot",
    mediaType: 'image',
    mediaUrl: MOCK_IMAGE_V3,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    createdBy: 'Bob (Staff)',
    annotations: [
      {
        id: 'v3-c1',
        authorRole: 'client',
        authorName: 'Alice (Client)',
        text: 'Much better! Just need to fix the color grading on the waterfall itself.',
        createdAt: new Date(Date.now() - 1000 * 60 * 30),
        commentType: 'Question',
        status: 'Open',
        assignee: 'Charlie (VFX)',
        dueDate: addDays(new Date(), 3),
        labels: ['Color'],
        regions: [
          {
            id: 'v3-r1',
            type: 'point',
            point: { x: 50, y: 40 },
          }
        ]
      },
       {
        id: 'v3-c2',
        authorRole: 'staff',
        authorName: 'Bob (Staff)',
        text: 'Acknowledged. Charlie will take a look.',
        createdAt: new Date(Date.now() - 1000 * 60 * 20),
        commentType: 'Note',
        status: 'Open',
        assignee: null,
        dueDate: null,
        labels: ['General'],
        regions: [],
        isInternal: true,
      }
    ]
  }
];

export const INITIAL_CHAT: ChatMessage[] = [
  {
    id: 'm1',
    authorRole: 'staff',
    authorName: 'Bob (Staff)',
    text: 'Hey Alice, I just uploaded V3 for your review based on yesterday\'s feedback.',
    createdAt: new Date(Date.now() - 1000 * 60 * 120),
  },
];

export const STROKE_SIZES = [4, 8, 12, 20];
