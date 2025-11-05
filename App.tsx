import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { format, formatDistanceToNow, addDays } from 'date-fns';
import { Pen, Highlighter, MousePointer2, Send, Play, Pause, CheckCircle2, XCircle, User, Users, Trash2, Download, Undo, ChevronDown, RotateCcw, FileVideo, FileImage, Info, Check, Layers, GripVertical, Clock, Calendar, AlertOctagon, HelpCircle, MessageSquareText, Tag, Filter as FilterIcon, Paperclip, FileText, X, Search, MoreHorizontal, CornerDownLeft, Lock } from 'lucide-react';

import { MOCK_VERSIONS, STROKE_SIZES, ASSIGNEES, LABELS, LABEL_KEYWORDS } from './constants';
import type { UserRole, Tool, Annotation, AssetVersion, Region, DrawingRegion, PointRegion, CommentType, CommentStatus, ReferenceFile } from './types';
import ReadOnlyBanner from './components/ReadOnlyBanner';
import RequestChangesModal from './components/RequestChangesModal';
import { cn } from './utils';


export default function App() {
  // --- Global & Version State ---
  const [versions, setVersions] = useState<AssetVersion[]>(MOCK_VERSIONS);
  const [activeVersionIdx, setActiveVersionIdx] = useState<number>(MOCK_VERSIONS.length - 1);
  const [isVersionMenuOpen, setIsVersionMenuOpen] = useState(false);
  const [comparisonVersionIdx, setComparisonVersionIdx] = useState<number | null>(null);
  const [comparisonSplit, setComparisonSplit] = useState<number>(50);
  const [hoveredVersionIdx, setHoveredVersionIdx] = useState<number | null>(null);
  const [versionThumbnails, setVersionThumbnails] = useState<Record<number, string>>({});
  const [isGeneratingVersionThumbnail, setIsGeneratingVersionThumbnail] = useState<Record<number, boolean>>({});
  const [versionPreviewPosition, setVersionPreviewPosition] = useState<{ top: number; right: number } | null>(null);


  const activeVersion = versions[activeVersionIdx];
  const comparisonVersion = comparisonVersionIdx !== null ? versions[comparisonVersionIdx] : null;
  const isLatestVersion = activeVersionIdx === versions.length - 1;
  const mediaType = activeVersion.mediaType;

  // --- Derived State for Current View ---
  const [annotations, setAnnotations] = useState<Annotation[]>(activeVersion.annotations);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);

  // --- Timeline Thumbnail Preview State ---
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [thumbnailPreview, setThumbnailPreview] = useState<{ url: string; left: number } | null>(null);
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);


  // Sync annotations when switching versions and reset video state
  useEffect(() => {
    setAnnotations(activeVersion.annotations);
    setIsPlaying(false);
    setCurrentTime(0);
    setPendingRegions([]);
    setPendingTimestamp(null);
    setSelectedAnnotationId(null);
    setHoveredAnnotationId(null);
    setThumbnails([]);
    setThumbnailPreview(null);
    setIsGeneratingThumbnails(false);
    setComparisonVersionIdx(null); // Reset comparison on version change
  }, [activeVersionIdx, activeVersion]);

  // Auto-save annotations to master version list
  useEffect(() => {
    if (!isLatestVersion) return;
    setVersions(prev => {
      const newVersions = [...prev];
      newVersions[activeVersionIdx] = {
        ...newVersions[activeVersionIdx],
        annotations: annotations
      };
      return newVersions;
    });
  }, [annotations, activeVersionIdx, isLatestVersion]);

  // --- Other Global State ---
  const [userRole, setUserRole] = useState<UserRole>('client');
  const [isRequestChangesModalOpen, setIsRequestChangesModalOpen] = useState(false);
  const [isRequestChangesMenuOpen, setIsRequestChangesMenuOpen] = useState(false);
  const [previewedReference, setPreviewedReference] = useState<ReferenceFile | null>(null);

  // Media State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const comparisonVideoRef = useRef<HTMLVideoElement>(null);

  // Drawing State
  const [selectedTool, setSelectedTool] = useState<Tool>('cursor');
  const [strokeColor, setStrokeColor] = useState('#81C784');
  const [strokeWidth, setStrokeWidth] = useState(8);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [pendingRegions, setPendingRegions] = useState<Region[]>([]);
  const [pendingTimestamp, setPendingTimestamp] = useState<number | null>(null);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isStrokePickerOpen, setIsStrokePickerOpen] = useState(false);

  // New Comment State & Logic
  const [commentStatusTab, setCommentStatusTab] = useState<CommentStatus>('Open');
  const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentType, setNewCommentType] = useState<CommentType>('Note');
  const [newCommentAssignee, setNewCommentAssignee] = useState<string | null>(null);
  const [newCommentDueDate, setNewCommentDueDate] = useState<string>(''); // use string for input
  const [newCommentLabels, setNewCommentLabels] = useState<string[]>([]);
  const [newCommentReference, setNewCommentReference] = useState<ReferenceFile | null>(null);
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [showAdvancedComposer, setShowAdvancedComposer] = useState(false);
  
  // Comment Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const [filterAssignees, setFilterAssignees] = useState<string[]>([]);
  const [filterLabels, setFilterLabels] = useState<string[]>([]);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterInternalOnly, setFilterInternalOnly] = useState(false);


  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const versionMenuRef = useRef<HTMLDivElement>(null);
  const requestChangesMenuRef = useRef<HTMLDivElement>(null);
  const filterPopoverRef = useRef<HTMLDivElement>(null);
  const versionItemRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const toolbarsRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const commentRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Helpers ---
  const currentUser = useMemo(() => ({
    role: userRole,
    name: userRole === 'client' ? 'Alice (Client)' : 'Bob (Staff)'
  }), [userRole]);

  const getLabelColor = (label: string) => {
    const colors = [
      'bg-sky-100 text-sky-800 border-sky-200',
      'bg-rose-100 text-rose-800 border-rose-200',
      'bg-emerald-100 text-emerald-800 border-emerald-200',
      'bg-violet-100 text-violet-800 border-violet-200',
      'bg-amber-100 text-amber-800 border-amber-200',
      'bg-pink-100 text-pink-800 border-pink-200',
    ];
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
      hash = label.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash % colors.length)];
  };

  // Click outside to close menus
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (versionMenuRef.current && !versionMenuRef.current.contains(event.target as Node)) setIsVersionMenuOpen(false);
      if (requestChangesMenuRef.current && !requestChangesMenuRef.current.contains(event.target as Node)) setIsRequestChangesMenuOpen(false);
      if (toolbarsRef.current && !toolbarsRef.current.contains(event.target as Node)) { setIsColorPickerOpen(false); setIsStrokePickerOpen(false); }
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) setIsFilterPopoverOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus comment input when a drawing or point is pending
  useEffect(() => {
    if (pendingRegions.length > 0 && commentInputRef.current) {
      commentInputRef.current.focus();
    }
  }, [pendingRegions]);

    // Calculate version preview thumbnail position
    useEffect(() => {
      if (hoveredVersionIdx === null || !isVersionMenuOpen) { setVersionPreviewPosition(null); return; }
      const itemEl = versionItemRefs.current.get(hoveredVersionIdx);
      const menuEl = versionMenuRef.current;
      if (itemEl && menuEl) {
          const itemRect = itemEl.getBoundingClientRect();
          const menuRect = menuEl.getBoundingClientRect();
          setVersionPreviewPosition({ top: itemRect.top + itemRect.height / 2, right: window.innerWidth - menuRect.left + 12 });
      }
  }, [hoveredVersionIdx, isVersionMenuOpen]);

  // Composer shortcut parsing and auto-tagging
  useEffect(() => {
    const text = newCommentText;
    const detectedLabels = new Set(newCommentLabels);
    let detectedAssignee = newCommentAssignee;

    // Auto-label from keywords
    for (const label in LABEL_KEYWORDS) {
      if (LABEL_KEYWORDS[label].some(keyword => text.toLowerCase().includes(keyword))) {
        detectedLabels.add(label);
      }
    }

    // Shortcuts
    const mentionMatch = text.match(/@(\w+)/);
    if (mentionMatch) {
      const mentionedName = mentionMatch[1].toLowerCase();
      const assignee = ASSIGNEES.find(a => a.toLowerCase().includes(mentionedName));
      if (assignee) detectedAssignee = assignee;
    }

    const labelMatch = text.match(/#(\w+)/);
    if (labelMatch) {
        const matchedLabel = labelMatch[1].toLowerCase();
        const label = LABELS.find(l => l.toLowerCase() === matchedLabel);
        if (label) detectedLabels.add(label);
    }

    setNewCommentLabels(Array.from(detectedLabels));
    setNewCommentAssignee(detectedAssignee);
    if (text.endsWith('!')) setNewCommentType('Blocker');
    if (text.endsWith('?')) setNewCommentType('Question');
    if (text.startsWith('//')) setIsInternalComment(true);

  }, [newCommentText]);


  // --- Version Thumbnail Generation ---
  const generateVersionThumbnail = useCallback(async (version: AssetVersion) => {
    if (versionThumbnails[version.versionNumber] || isGeneratingVersionThumbnail[version.versionNumber]) return;
    if (version.mediaType === 'image') { setVersionThumbnails(prev => ({ ...prev, [version.versionNumber]: version.mediaUrl })); return; }

    setIsGeneratingVersionThumbnail(prev => ({ ...prev, [version.versionNumber]: true }));
    try {
      const video = document.createElement('video'); video.crossOrigin = 'anonymous'; video.muted = true; video.src = version.mediaUrl;
      await new Promise<void>((resolve, reject) => { video.addEventListener('loadedmetadata', () => resolve()); video.addEventListener('error', () => reject(new Error('Failed to load video metadata for thumbnail'))); });
      video.currentTime = Math.min(1, video.duration / 2);
      await new Promise<void>(resolve => { const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve(); }; video.addEventListener('seeked', onSeeked); });
      const canvas = document.createElement('canvas'); const context = canvas.getContext('2d'); if (!context) throw new Error('Could not get canvas context');
      const aspectRatio = video.videoWidth / video.videoHeight; canvas.width = 128; canvas.height = 128 / aspectRatio;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
      setVersionThumbnails(prev => ({ ...prev, [version.versionNumber]: thumbnailUrl }));
    } catch (error) { console.error(`Failed to generate thumbnail for V${version.versionNumber}:`, error);
    } finally { setIsGeneratingVersionThumbnail(prev => ({ ...prev, [version.versionNumber]: false })); }
  }, [versionThumbnails, isGeneratingVersionThumbnail]);


  // --- Timeline Thumbnail Generation ---
  const generateThumbnails = useCallback(async (videoUrl: string) => {
    setIsGeneratingThumbnails(true); setThumbnails([]);
    try {
      const video = document.createElement('video'); video.crossOrigin = 'anonymous'; video.muted = true;
      const canvas = document.createElement('canvas'); const context = canvas.getContext('2d'); if (!context) { throw new Error('Could not get canvas context'); }
      video.src = videoUrl;
      await new Promise<void>((resolve, reject) => { video.addEventListener('loadedmetadata', () => resolve()); video.addEventListener('error', () => reject(new Error('Failed to load video metadata'))); });
      const numThumbnails = 12; const interval = video.duration / numThumbnails; const newThumbnails: string[] = [];
      const aspectRatio = video.videoWidth / video.videoHeight; canvas.width = 160; canvas.height = 160 / aspectRatio;
      for (let i = 0; i < numThumbnails; i++) {
          video.currentTime = i * interval;
          await new Promise<void>(resolve => { const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve(); }; video.addEventListener('seeked', onSeeked); });
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          newThumbnails.push(canvas.toDataURL('image/jpeg', 0.8));
      }
      setThumbnails(newThumbnails);
    } catch (error) { console.error("Failed to generate thumbnails:", error); setThumbnails([]);
    } finally { setIsGeneratingThumbnails(false); }
  }, []);

  useEffect(() => {
    if (mediaType === 'video' && activeVersion.mediaUrl) generateThumbnails(activeVersion.mediaUrl);
  }, [activeVersion.mediaUrl, mediaType, generateThumbnails]);


  // --- Version Handlers ---
  const handleRestoreVersion = () => {
    const versionToRestore = versions[activeVersionIdx];
    const newVersionNumber = versions[versions.length - 1].versionNumber + 1;
    const newVersion: AssetVersion = { ...versionToRestore, versionNumber: newVersionNumber, label: `Restored from V${versionToRestore.versionNumber}`, createdAt: new Date(), createdBy: currentUser.name, annotations: JSON.parse(JSON.stringify(versionToRestore.annotations)) };
    setVersions(prev => [...prev, newVersion]); setActiveVersionIdx(versions.length);
  };

  // --- Media Handlers ---
  const togglePlay = () => {
    if (!videoRef.current) return;
    const newIsPlaying = !isPlaying;
    if (newIsPlaying) { videoRef.current.play(); if (comparisonVideoRef.current) comparisonVideoRef.current.play();
    } else { videoRef.current.pause(); if (comparisonVideoRef.current) comparisonVideoRef.current.pause(); }
  };

  const handleTimeUpdate = () => { if (videoRef.current) setCurrentTime(videoRef.current.currentTime); };
  const handleLoadedMetadata = () => { if (videoRef.current) setDuration(videoRef.current.duration); };
  const seekVideo = (time: number) => { if (videoRef.current) videoRef.current.currentTime = time; if (comparisonVideoRef.current) comparisonVideoRef.current.currentTime = time; setCurrentTime(time); };
  const handleProgressBarHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || thumbnails.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect(); const hoverX = e.clientX - rect.left; const hoverPercent = Math.max(0, Math.min(100, (hoverX / rect.width) * 100));
    const hoverTime = (hoverPercent / 100) * duration;
    const thumbnailIndex = Math.min(Math.floor((hoverTime / duration) * thumbnails.length), thumbnails.length - 1);
    if (thumbnails[thumbnailIndex]) setThumbnailPreview({ url: thumbnails[thumbnailIndex], left: hoverPercent });
  };

  // --- Drawing Handlers ---
  const getCoords = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width * 100, y: (e.clientY - rect.top) / rect.height * 100 };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (selectedTool === 'cursor') { setSelectedAnnotationId(null); return; }
    if (!isLatestVersion || comparisonVersion) return;
    if (mediaType === 'video' && pendingRegions.length > 0) { alert("Please add a comment to your current annotation before adding another."); return; }
    if (mediaType === 'video' && isPlaying) togglePlay();

    if(selectedTool === 'pen' || selectedTool === 'highlighter') { setIsDrawing(true); setCurrentPath([getCoords(e)]); e.currentTarget.setPointerCapture(e.pointerId);
    } else if (selectedTool === 'comment') {
        const newRegion: PointRegion = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'point',
            point: getCoords(e),
        };
        setPendingRegions(prev => [...prev, newRegion]);
        if (mediaType === 'video') {
            if (pendingRegions.length === 0) setPendingTimestamp(currentTime);
            setSelectedTool('cursor');
        }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => { if (!isDrawing) return; setCurrentPath((prev) => [...prev, getCoords(e)]); };
  
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false); e.currentTarget.releasePointerCapture(e.pointerId); if (currentPath.length < 2) return;
    
    const newRegion: DrawingRegion = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'drawing',
      pathData: currentPath,
      color: strokeColor,
      strokeWidth: selectedTool === 'highlighter' ? strokeWidth * 3 : strokeWidth,
    };

    setPendingRegions(prev => [...prev, newRegion]);
    setCurrentPath([]);
    
    if (mediaType === 'video') {
      if (pendingRegions.length === 0) setPendingTimestamp(currentTime);
      setSelectedTool('cursor');
    }
  };

  const pointsToPath = (points: { x: number; y: number }[]) => { if (points.length === 0) return ''; return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' '); };

  // --- Action Handlers ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert("File is too large. Max 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setNewCommentReference({
        name: file.name,
        type: file.type,
        url: event.target?.result as string,
        size: file.size,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset file input
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedText = newCommentText.replace(/(@\w+|#\w+|!|\?|\/\/)/g, '').trim();
    if (!trimmedText || comparisonVersion) return;

    const commonData = {
      id: Math.random().toString(36).substr(2, 9),
      authorRole: currentUser.role,
      authorName: currentUser.name,
      text: trimmedText,
      createdAt: new Date(),
      commentType: newCommentType,
      status: 'Open' as const,
      assignee: newCommentAssignee,
      dueDate: newCommentDueDate ? new Date(newCommentDueDate) : null,
      labels: newCommentLabels,
      referenceFile: newCommentReference,
      isInternal: isInternalComment,
    };

    let newAnnotation: Annotation;
    
    if (pendingRegions.length > 0) {
      newAnnotation = {
        ...commonData,
        regions: pendingRegions,
        timestamp: mediaType === 'video' ? pendingTimestamp : null,
      };
      setPendingRegions([]);
      setPendingTimestamp(null);
    } else {
      newAnnotation = {
        ...commonData,
        regions: [],
        timestamp: mediaType === 'video' ? currentTime : null,
      };
    }
    
    setAnnotations(prev => [...prev, newAnnotation]);
    setSelectedAnnotationId(newAnnotation.id);
    
    // Reset form
    setNewCommentText('');
    setNewCommentType('Note');
    setNewCommentAssignee(null);
    setNewCommentDueDate('');
    setNewCommentLabels([]);
    setNewCommentReference(null);
    setShowAdvancedComposer(false);
    setIsInternalComment(false);
  };

  const cancelPendingAnnotation = () => {
    setPendingRegions([]);
    setPendingTimestamp(null);
    setNewCommentText('');
    setNewCommentReference(null);
  };

  const deleteAnnotation = (id: string) => {
    if (!isLatestVersion) return;
    setAnnotations(prev => prev.filter(a => a.id !== id));
    if (selectedAnnotationId === id) setSelectedAnnotationId(null);
  };
  
  const toggleAnnotationStatus = (id: string, currentStatus: CommentStatus) => {
    if (!isLatestVersion) return;
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, status: currentStatus === 'Open' ? 'Resolved' : 'Open' } : a));
  };


  const undoLastDrawing = () => {
    if (pendingRegions.length > 0) {
        setPendingRegions(prev => {
            const newRegions = prev.slice(0, -1);
            if (newRegions.length === 0) setPendingTimestamp(null);
            return newRegions;
        });
        return;
    }
    if (!isLatestVersion) return;
    const lastAnnotationIndex = [...annotations].reverse().findIndex(a => a.authorRole === userRole && a.regions.length > 0);
    if (lastAnnotationIndex !== -1) {
      const realIndex = annotations.length - 1 - lastAnnotationIndex;
      setAnnotations(prev => prev.filter((_, i) => i !== realIndex));
    }
  };

  const handleRequestChangesConfirm = () => { setIsRequestChangesModalOpen(false); }

  const handleAnnotationClick = (id: string) => {
    setSelectedAnnotationId(id);
    const annotation = [...annotations, ...(comparisonVersion?.annotations || [])].find(a => a.id === id);
    if (annotation) {
      if (annotation.timestamp != null && mediaType === 'video') seekVideo(annotation.timestamp);
      const commentEl = commentRefs.current.get(id);
      commentEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const visibleAnnotations = useMemo(() => {
    if (mediaType === 'image') return annotations;
    return annotations.filter(a => {
      if (a.timestamp === null || a.timestamp === undefined) return true; // General comments always visible
      return Math.abs(a.timestamp - currentTime) < 1.5;
    });
  }, [annotations, mediaType, currentTime]);

  const combinedAnnotations = useMemo(() => {
    if (!comparisonVersion) return visibleAnnotations.map(a => ({ ...a, source: 'active' as const }));
    const activeIds = new Set(visibleAnnotations.map(a => a.id));
    const comparisonAnns = comparisonVersion.annotations.filter(a => !activeIds.has(a.id));
    const visibleComparisonAnns = mediaType === 'video' ? comparisonAnns.filter(a => a.timestamp != null && Math.abs(a.timestamp - currentTime) < 1.5) : comparisonAnns;
    return [ ...visibleAnnotations.map(a => ({ ...a, source: 'active' as const })), ...visibleComparisonAnns.map(a => ({ ...a, source: 'comparison' as const })) ];
}, [visibleAnnotations, comparisonVersion, mediaType, currentTime]);


  const filteredAndSortedComments = useMemo(() => {
    let visibleComments = annotations.filter(a => {
        if (a.isInternal && userRole !== 'staff') return false;
        return a.status === commentStatusTab;
    });

    if (searchQuery) {
        visibleComments = visibleComments.filter(a =>
            a.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.authorName.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    return visibleComments
      .filter(a => {
        if (filterTypes.length > 0 && !filterTypes.includes(a.commentType)) return false;
        if (filterAssignees.length > 0 && (!a.assignee || !filterAssignees.includes(a.assignee))) return false;
        if (filterLabels.length > 0 && !filterLabels.some(l => a.labels.includes(l))) return false;
        if (filterInternalOnly && !a.isInternal) return false;
        return true;
      })
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0) || a.createdAt.getTime() - b.createdAt.getTime());
  }, [annotations, commentStatusTab, searchQuery, filterTypes, filterAssignees, filterLabels, filterInternalOnly, userRole]);
  
  const commentNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    // Numbering is based on all annotations, not just filtered ones, for stability
    annotations
      .filter(a => a.regions.length > 0)
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0) || a.createdAt.getTime() - b.createdAt.getTime())
      .forEach((comment, index) => {
        map.set(comment.id, index + 1);
    });
    return map;
  }, [annotations]);

  const videoAnnotations = useMemo(() => { return annotations.filter(a => a.timestamp != null); }, [annotations]);

  const CommentTypeIcon = ({ type, size = 16 }: { type: CommentType, size?: number }) => {
    switch (type) {
        case 'Note': return <Info size={size} className="text-gray-500" />;
        case 'Blocker': return <AlertOctagon size={size} className="text-red-500" />;
        case 'Question': return <HelpCircle size={size} className="text-blue-500" />;
        default: return null;
    }
  };


  return (
    <div className="h-screen bg-gray-50 text-gray-900 font-sans flex flex-col overflow-hidden">
      
      <RequestChangesModal isOpen={isRequestChangesModalOpen} onClose={() => setIsRequestChangesModalOpen(false)} onConfirm={handleRequestChangesConfirm} />
      
      {previewedReference && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setPreviewedReference(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-4 relative animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewedReference(null)} className="absolute top-2 right-2 p-2 text-gray-500 hover:bg-gray-100 rounded-full z-10"><X size={20} /></button>
            <div className="p-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4 truncate pr-8">{previewedReference.name}</h3>
                {previewedReference.type.startsWith('image/') ? (
                <img src={previewedReference.url} alt={previewedReference.name} className="max-w-full max-h-[80vh] object-contain mx-auto" />
                ) : (
                <div className="text-center p-10 bg-gray-50 rounded-lg">
                    <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="font-semibold">No preview available</p>
                    <p className="text-sm text-gray-500">{(previewedReference.size / 1024).toFixed(1)} KB - {previewedReference.type}</p>
                </div>
                )}
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-30">
        <div className="flex items-center space-x-4">
          <h1 className="font-bold text-xl text-gray-800">Project Alpha - Main Scene</h1>
          <div className="w-px h-6 bg-gray-200"></div>
          <div ref={versionMenuRef} className="relative">
            <button onClick={() => setIsVersionMenuOpen(prev => !prev)} className="flex items-center space-x-1 px-2.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-semibold text-gray-700 transition-colors">
              <span>V{activeVersion.versionNumber}</span>
              <ChevronDown size={14} className={cn("transition-transform", isVersionMenuOpen && "rotate-180")} />
            </button>
             {isVersionMenuOpen && (
              <div className="absolute top-full mt-2 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-30">
                {versions.slice().reverse().map((v, i) => {
                  const index = versions.length - 1 - i;
                  return (
                    <div key={v.versionNumber} ref={el => versionItemRefs.current.set(index, el)} onMouseEnter={() => { setHoveredVersionIdx(index); generateVersionThumbnail(v); }} onMouseLeave={() => setHoveredVersionIdx(null)}
                      className={cn( "relative w-full text-left px-3 py-2 flex items-center justify-between space-x-3 hover:bg-gray-100 transition-colors", index === activeVersionIdx && "bg-indigo-50 text-indigo-700" )}>
                      <button onClick={() => { setActiveVersionIdx(index); setIsVersionMenuOpen(false); }} className="flex-1 flex items-center space-x-3 text-left">
                        <div className="flex-shrink-0">{v.mediaType === 'image' ? <FileImage size={16} className="text-gray-500" /> : <FileVideo size={16} className="text-gray-500" />}</div>
                        <div className="flex-1"><p className="font-semibold text-sm">V{v.versionNumber}: {v.label}</p><p className="text-xs text-gray-500">{formatDistanceToNow(v.createdAt, { addSuffix: true })} by {v.createdBy}</p></div>
                      </button>
                      <div className="flex-shrink-0">
                          {index === activeVersionIdx ? ( <CheckCircle2 size={16} className="text-indigo-600" /> ) : (
                              <button onClick={(e) => { e.stopPropagation(); setComparisonVersionIdx(index); setIsVersionMenuOpen(false); }} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors" title={`Compare with V${v.versionNumber}`}><Layers size={16} /></button>
                          )}
                      </div>
                    </div>
                  )
                })}
                {!isLatestVersion && ( <div className="p-2 border-t border-gray-200"><button onClick={handleRestoreVersion} className="w-full flex items-center justify-center space-x-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors"><RotateCcw size={14} /><span>Restore this version as new</span></button></div> )}
              </div>
            )}
          </div>
          <div className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">In Review</div>
          <div className="flex items-center space-x-2 text-sm text-gray-500"><Clock size={14} /><span>Last updated: {formatDistanceToNow(activeVersion.createdAt, { addSuffix: true })}</span></div>
          <div className="flex items-center space-x-2 text-sm text-gray-500"><Calendar size={14} /><span>Review due: {format(addDays(new Date(), 2), 'MMM d')}</span></div>
           {versionPreviewPosition && hoveredVersionIdx !== null && (
            <div className="fixed w-32 h-auto bg-black border-2 border-white rounded-md shadow-2xl pointer-events-none z-50 animate-in fade-in zoom-in-95 -translate-y-1/2" style={{ top: `${versionPreviewPosition.top}px`, right: `${versionPreviewPosition.right}px` }}>
              {(() => {
                const v = versions[hoveredVersionIdx]; if (!v) return null;
                if (isGeneratingVersionThumbnail[v.versionNumber]) { return ( <div className="aspect-video flex items-center justify-center bg-gray-700"><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div> );
                } else if (versionThumbnails[v.versionNumber]) { return ( <img src={versionThumbnails[v.versionNumber]} alt={`Preview of V${v.versionNumber}`} className="w-full h-full object-contain rounded"/> );
                } else { return ( <div className="aspect-video flex items-center justify-center bg-gray-700 text-white text-xs">Preview N/A</div> ); }
              })()}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 p-1 bg-gray-100 rounded-lg text-sm font-medium">
            <button onClick={() => setUserRole('client')} className={cn("px-3 py-1 rounded-md transition-colors", userRole === 'client' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:bg-gray-200')}><div className="flex items-center space-x-2"><User size={16} /><span>Client View</span></div></button>
            <button onClick={() => setUserRole('staff')} className={cn("px-3 py-1 rounded-md transition-colors", userRole === 'staff' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:bg-gray-200')}><div className="flex items-center space-x-2"><Users size={16} /><span>Staff View</span></div></button>
          </div>
          <button className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-lg transition-colors"><Download size={20}/></button>
          {isLatestVersion && userRole === 'client' && (
            <div className="flex items-center space-x-2">
              <div ref={requestChangesMenuRef} className="relative inline-flex rounded-lg shadow-sm">
                <button type="button" onClick={() => setIsRequestChangesModalOpen(true)} className="relative inline-flex items-center space-x-2 rounded-l-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"><XCircle size={16} /><span>Request Changes</span></button>
                <button type="button" onClick={() => setIsRequestChangesMenuOpen(p => !p)} className="relative -ml-px inline-flex items-center rounded-r-lg border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" aria-haspopup="true" aria-expanded={isRequestChangesMenuOpen}><ChevronDown size={16} /></button>
                {isRequestChangesMenuOpen && ( <div className="absolute right-0 z-40 mt-10 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in zoom-in-95" role="menu"><div className="py-1">{['Color', 'Audio', 'Content', 'Legal'].map(preset => ( <button key={preset} onClick={() => { setIsRequestChangesModalOpen(true); setIsRequestChangesMenuOpen(false); }} className="w-full text-left text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100">Request changes for {preset}</button>))}</div></div> )}
              </div>
              <button className="px-4 py-2 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center space-x-2 shadow-sm"><CheckCircle2 size={16} /><span>Approve</span></button>
            </div>
          )}
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content: Media Viewer */}
        <main className="flex-1 flex flex-col relative bg-gray-800 overflow-hidden">
          <ReadOnlyBanner isLatestVersion={isLatestVersion} activeVersion={activeVersion} onGoToLatest={() => setActiveVersionIdx(versions.length - 1)} />
          {comparisonVersion && ( <div className="flex-none bg-indigo-50 border-b border-indigo-200 text-indigo-800 px-4 py-2 text-sm font-medium flex items-center justify-center z-10"><Layers size={16} className="mr-2" /><span>Comparing <strong>V{activeVersion.versionNumber}</strong> with <strong>V{comparisonVersion.versionNumber}</strong></span><button onClick={() => setComparisonVersionIdx(null)} className="ml-4 text-indigo-900 underline hover:no-underline font-semibold">Exit Comparison</button></div> )}
          <div className="flex-1 flex items-center justify-center p-4 relative">
            <div ref={containerRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
              className={cn( "relative w-full max-w-7xl aspect-video bg-black rounded-lg shadow-2xl overflow-hidden", selectedTool !== 'cursor' && isLatestVersion && !comparisonVersion && (selectedTool === 'comment' ? 'cursor-copy' : 'cursor-crosshair'), (selectedTool === 'cursor' || !isLatestVersion || comparisonVersion) && 'cursor-default' )}>
              {mediaType === 'image' ? ( <img src={activeVersion.mediaUrl} alt={`Version ${activeVersion.versionNumber}`} className="w-full h-full object-contain pointer-events-none select-none" draggable="false" /> ) : ( <video ref={videoRef} src={activeVersion.mediaUrl} className="w-full h-full object-contain pointer-events-none select-none" onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} /> )}
              {comparisonVersion && ( <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ clipPath: `inset(0 ${100 - comparisonSplit}% 0 0)`}}> {comparisonVersion.mediaType === 'image' ? ( <img src={comparisonVersion.mediaUrl} alt={`Version ${comparisonVersion.versionNumber}`} className="w-full h-full object-contain select-none" draggable="false" /> ) : ( <video ref={comparisonVideoRef} src={comparisonVersion.mediaUrl} className="w-full h-full object-contain select-none" muted playsInline /> )} </div> )}
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
                {combinedAnnotations.map(ann => {
                  const isComparison = ann.source === 'comparison';
                  const commentNumber = commentNumberMap.get(ann.id);
                  const isSelected = selectedAnnotationId === ann.id;

                  return ann.regions.map(region => {
                     const isHovered = hoveredAnnotationId === ann.id;
                     return (
                        <g key={region.id} onClick={(e) => { e.stopPropagation(); handleAnnotationClick(ann.id); }} onMouseEnter={() => setHoveredAnnotationId(ann.id)} onMouseLeave={() => setHoveredAnnotationId(null)} className="cursor-pointer" style={{ pointerEvents: 'all' }}>
                          {region.type === 'drawing' && ( <> <path d={pointsToPath(region.pathData)} stroke="transparent" strokeWidth={((region.strokeWidth || 4) / 20) + 2} fill="none" strokeLinecap="round" strokeLinejoin="round" /> <path d={pointsToPath(region.pathData)} stroke={region.color} strokeWidth={isSelected ? ((region.strokeWidth || 4) / 20) * 1.5 : ((region.strokeWidth || 4) / 20)} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={isComparison ? '0.8 0.4' : 'none'} opacity={isComparison ? 0.65 : (region.color?.startsWith('#') ? 0.9 : 0.6)} className="transition-all duration-150" style={{ filter: isSelected ? `drop-shadow(0 0 0.7px ${region.color})` : 'none' }} /> </> )}
                          {region.type === 'point' && commentNumber && (
                             <g transform={`translate(${region.point.x}, ${region.point.y})`} style={{ transformBox: 'fill-box' }}>
                                <g transform={`scale(${isSelected || isHovered ? 0.05 : 0.04})`} className="transition-transform duration-150" style={{ transformOrigin: 'center', opacity: isComparison ? 0.65 : 1 }}>
                                  <circle cx="0" cy="0" r="30" className={cn(ann.authorRole === 'client' ? 'fill-blue-500' : 'fill-purple-500', isSelected || isHovered ? 'stroke-white' : 'stroke-transparent' )} strokeWidth="5" style={{ filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.4))` }} />
                                  {isComparison && !isSelected && ( <circle cx="0" cy="0" r="30" fill="none" stroke="white" strokeWidth="4" strokeDasharray="10 5" opacity="0.8" /> )}
                                  {(isHovered || isSelected) ?
                                    <text x="0" y="10" textAnchor="middle" fill="white" fontSize="40" fontWeight="bold" style={{ pointerEvents: 'none', userSelect: 'none' }}>{commentNumber}</text>
                                    :
                                    <path d="M-15 -5 H 15 M-15 5 H 15" stroke="white" strokeWidth="6" strokeLinecap="round" />
                                  }
                                </g>
                              </g>
                          )}
                        </g>
                     )
                  })
                })}
                {pendingRegions.map(region => (
                  <g key={region.id}>
                    {region.type === 'drawing' && region.pathData && ( <path d={pointsToPath(region.pathData)} stroke={region.color} strokeWidth={region.strokeWidth / 20} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.8} /> )}
                    {region.type === 'point' && region.point && (
                      <g transform={`translate(${region.point.x}, ${region.point.y}) scale(0.09)`} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
                        <path
                          d="M-14 -12 a4 4 0 0 1 4 -4 h20 a4 4 0 0 1 4 4 v10 a4 4 0 0 1 -4 4 h-8 l-5 5 v-5 h-7 a4 4 0 0 1 -4 -4 z"
                          className={cn(currentUser.role === 'client' ? 'fill-blue-500' : 'fill-purple-500')} style={{ filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.4))` }}/>
                      </g>
                    )}
                  </g>
                ))}
                {isDrawing && currentPath.length > 0 && ( <path d={pointsToPath(currentPath)} stroke={strokeColor} strokeWidth={(selectedTool === 'highlighter' ? strokeWidth * 3 : strokeWidth) / 20} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.8} /> )}
              </svg>
              {comparisonVersion && ( <> <div className="absolute top-0 bottom-0 -translate-x-1/2 w-1 bg-white/50 backdrop-blur-sm pointer-events-none z-30" style={{ left: `${comparisonSplit}%` }}><div className="absolute top-1/2 -translate-y-1/2 -left-[17px] w-9 h-9 bg-white rounded-full shadow-lg flex items-center justify-center"><GripVertical size={20} className="text-gray-600" /></div></div> <input type="range" min="0" max="100" step="0.1" value={comparisonSplit} onChange={(e) => setComparisonSplit(parseFloat(e.target.value))} className="absolute inset-0 w-full h-full cursor-ew-resize opacity-0 z-30" aria-label="Comparison slider" /> </> )}
            </div>
          </div>
          
          {isLatestVersion && !comparisonVersion && (
            <div ref={toolbarsRef} className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-lg rounded-xl p-1 flex items-center space-x-1 z-10 shadow-lg">
                <button onClick={() => setSelectedTool('cursor')} className={cn("p-2 rounded-lg transition-colors", selectedTool === 'cursor' ? 'bg-indigo-500 text-white' : 'hover:bg-white/20 text-white')}><MousePointer2 size={20} /></button>
                <button onClick={() => setSelectedTool('comment')} className={cn("p-2 rounded-lg transition-colors", selectedTool === 'comment' ? 'bg-indigo-500 text-white' : 'hover:bg-white/20 text-white')}><MessageSquareText size={20} /></button>
                <div className="w-px h-6 bg-white/20 mx-1"></div>
                <button onClick={() => setSelectedTool('pen')} className={cn("p-2 rounded-lg transition-colors", selectedTool === 'pen' ? 'bg-indigo-500 text-white' : 'hover:bg-white/20 text-white')}><Pen size={20} /></button>
                <button onClick={() => setSelectedTool('highlighter')} className={cn("p-2 rounded-lg transition-colors", selectedTool === 'highlighter' ? 'bg-indigo-500 text-white' : 'hover:bg-white/20 text-white')}><Highlighter size={20} /></button>
                <div className="relative"><button onClick={() => { setIsColorPickerOpen(p => !p); setIsStrokePickerOpen(false); }} className="p-2 rounded-lg transition-colors hover:bg-white/20"><div className="w-5 h-5 rounded-full ring-1 ring-white/50" style={{backgroundColor: strokeColor}}></div></button>
                  {isColorPickerOpen && ( <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-28 aspect-square flex items-center justify-center bg-white rounded-xl shadow-2xl border border-gray-200"><div className="grid grid-cols-2 gap-3">{[{ value: '#E57373', label: 'Red' }, { value: '#F4E67C', label: 'Yellow' }, { value: '#81C784', label: 'Green' }, { value: '#64B5F6', label: 'Blue' }].map((colorItem) => ( <button key={colorItem.value} onClick={() => { setStrokeColor(colorItem.value); setIsColorPickerOpen(false); }} className="relative w-10 h-10 rounded-full transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" style={{ backgroundColor: colorItem.value }} aria-label={`Select ${colorItem.label} color`}>{strokeColor === colorItem.value && ( <div className="absolute inset-0 flex items-center justify-center"><Check className="text-white drop-shadow-lg" size={20} strokeWidth={3} /></div> )}</button>))}</div></div> )}
                </div>
                <div className="relative"><button onClick={() => { setIsStrokePickerOpen(p => !p); setIsColorPickerOpen(false); }} className="p-2 rounded-lg transition-colors hover:bg-white/20 text-white"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16M4 6h16M4 18h16"/></svg></button>
                  {isStrokePickerOpen && ( <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-gray-800 rounded-lg shadow-xl flex flex-col items-center space-y-2 animate-in fade-in zoom-in-95">{STROKE_SIZES.map(s => ( <button key={s} onClick={() => { setStrokeWidth(s); setIsStrokePickerOpen(false); }} className={cn( "w-24 h-8 flex items-center justify-center p-2 rounded-lg transition-colors", strokeWidth === s ? 'bg-white/20' : 'hover:bg-white/10' )}><svg viewBox="0 0 100 24" className="w-full h-auto" preserveAspectRatio="none"><path d="M 5 12 C 30 0, 70 24, 95 12" stroke="white" strokeWidth={s / 1.5} fill="none" strokeLinecap="round" /></svg></button>))}</div> )}
                </div>
                <div className="w-px h-6 bg-white/20 mx-1"></div>
                <button onClick={undoLastDrawing} className="p-2 rounded-lg transition-colors hover:bg-white/20 text-white"><Undo size={20} /></button>
            </div>
          )}

          {mediaType === 'video' && (
            <div className="flex-none p-4 pt-0">
                <div className="w-full flex items-center space-x-4 text-white">
                    <button onClick={togglePlay} className="p-2 hover:bg-white/10 rounded-full transition-colors">{isPlaying ? <Pause size={20}/> : <Play size={20} />}</button>
                    <div className="text-xs font-mono">{new Date(currentTime * 1000).toISOString().substring(14, 19)}</div>
                    <div className="relative w-full flex items-center group" onMouseMove={handleProgressBarHover} onMouseLeave={() => setThumbnailPreview(null)}>
                        {thumbnailPreview && ( <div className="absolute bottom-full mb-2 -translate-x-1/2 pointer-events-none z-20 animate-in fade-in zoom-in-95" style={{ left: `${thumbnailPreview.left}%` }}><img src={thumbnailPreview.url} alt="Video thumbnail preview" className="w-40 border-2 border-white bg-black rounded-md shadow-lg" /><p className="absolute bottom-1 right-1 bg-black/50 text-white text-xs font-mono px-1 rounded">{new Date(((thumbnailPreview.left / 100) * duration) * 1000).toISOString().substring(14, 19)}</p></div> )}
                        <input type="range" min="0" max={duration || 1} value={currentTime} onChange={(e) => seekVideo(parseFloat(e.target.value))} className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer thumb:bg-indigo-500" />
                         {duration > 0 && videoAnnotations.map(annotation => {
                           const commentNumber = commentNumberMap.get(annotation.id);
                           return (
                             <button key={annotation.id} onClick={() => handleAnnotationClick(annotation.id)} onMouseEnter={() => setHoveredAnnotationId(annotation.id)} onMouseLeave={() => setHoveredAnnotationId(null)}
                              className={cn( "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center border-2 border-gray-800 transition-transform z-10", 
                              annotation.authorRole === 'client' ? 'bg-blue-500' : 'bg-purple-500', 
                              selectedAnnotationId === annotation.id || hoveredAnnotationId === annotation.id ? 'scale-125' : 'scale-100',
                              selectedAnnotationId === annotation.id && 'ring-2 ring-white'
                              )} 
                              style={{ left: `${(annotation.timestamp! / duration) * 100}%` }} title={`${annotation.authorName} @ ${new Date(annotation.timestamp! * 1000).toISOString().substring(14, 19)}: "${annotation.text.substring(0, 50)}..."`}>
                                <span className="text-white text-xs font-bold">{commentNumber || '-'}</span>
                             </button>
                           )}
                         )}
                    </div>
                    <div className="text-xs font-mono">{new Date(duration * 1000).toISOString().substring(14, 19)}</div>
                </div>
            </div>
          )}
        </main>
        
        {/* Sidebar */}
        <aside className="w-[420px] bg-white border-l border-gray-200 flex flex-col">
          <div className="flex-none p-3 border-b border-gray-200 space-y-3">
              <div className="flex p-0.5 bg-gray-100 rounded-lg">
                <button onClick={() => setCommentStatusTab('Open')} className={cn("flex-1 text-center py-1.5 text-sm font-semibold rounded-md flex items-center justify-center space-x-2", commentStatusTab === 'Open' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:bg-gray-200')}>
                    <span>Open</span>
                    <span className="text-xs bg-gray-300 text-gray-700 px-1.5 rounded-full">{annotations.filter(a => a.status === 'Open').length}</span>
                </button>
                <button onClick={() => setCommentStatusTab('Resolved')} className={cn("flex-1 text-center py-1.5 text-sm font-semibold rounded-md flex items-center justify-center space-x-2", commentStatusTab === 'Resolved' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:bg-gray-200')}>
                    <span>Resolved</span>
                    <span className="text-xs bg-gray-300 text-gray-700 px-1.5 rounded-full">{annotations.filter(a => a.status === 'Resolved').length}</span>
                </button>
              </div>
              <div className="flex items-center space-x-2">
                 <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search comments..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-gray-100 border border-transparent rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 text-sm"/>
                 </div>
                 <div ref={filterPopoverRef} className="relative">
                    <button onClick={() => setIsFilterPopoverOpen(p => !p)} className="p-2.5 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 relative">
                        <FilterIcon size={16} />
                        {(filterTypes.length + filterAssignees.length + filterLabels.length > 0 || filterInternalOnly) && <div className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full"></div>}
                    </button>
                    {isFilterPopoverOpen && (
                        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-2xl border z-20 animate-in fade-in zoom-in-95 p-4">
                            <h4 className="font-semibold text-sm mb-3">Filter by</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-600">Type</label>
                                    <div className="flex space-x-2 mt-1">{['Note', 'Blocker', 'Question'].map(t => <button key={t} onClick={() => setFilterTypes(p => p.includes(t) ? p.filter(i => i !== t) : [...p, t])} className={cn('px-2 py-1 text-xs rounded-full border', filterTypes.includes(t) ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-gray-100 text-gray-600 border-gray-200')}>{t}</button>)}</div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600">Assignee</label>
                                    <select onChange={(e) => setFilterAssignees(e.target.value ? [e.target.value] : [])} className="w-full mt-1 p-2 text-sm border border-gray-300 rounded-md"><option value="">All Assignees</option>{ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}</select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600">Labels</label>
                                    <div className="flex flex-wrap gap-1.5 mt-1">{LABELS.map(l => <button key={l} onClick={() => setFilterLabels(p => p.includes(l) ? p.filter(i => i !== l) : [...p, l])} className={cn('px-2 py-1 text-xs rounded-full border', filterLabels.includes(l) ? `ring-1 ring-offset-1 ${getLabelColor(l).replace('bg-', 'ring-')}` : getLabelColor(l))}>{l}</button>)}</div>
                                </div>
                                {userRole === 'staff' && (
                                  <label className="flex items-center space-x-2 cursor-pointer text-sm">
                                      <input type="checkbox" checked={filterInternalOnly} onChange={(e) => setFilterInternalOnly(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                      <span>Show internal only</span>
                                  </label>
                                )}
                            </div>
                        </div>
                    )}
                 </div>
              </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
            {filteredAndSortedComments.map(annotation => {
              const commentNumber = commentNumberMap.get(annotation.id);
              const isExpanded = expandedCommentId === annotation.id;

              return (
                <div key={annotation.id} ref={el => { commentRefs.current.set(annotation.id, el); }} 
                  onClick={() => handleAnnotationClick(annotation.id)} 
                  onMouseEnter={() => setHoveredAnnotationId(annotation.id)}
                  onMouseLeave={() => setHoveredAnnotationId(null)}
                  className={cn( "p-3 rounded-lg cursor-pointer transition-all duration-150 border", 
                    selectedAnnotationId === annotation.id ? "bg-indigo-50 border-indigo-300" : 
                    hoveredAnnotationId === annotation.id ? "bg-blue-50 border-blue-200" :
                    "bg-white border-gray-200 hover:border-gray-300" 
                  )}>
                  <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-2 text-sm">
                        {commentNumber && <div className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600 flex-shrink-0">{commentNumber}</div>}
                        <span className="font-semibold">{annotation.authorName}</span>
                        <span className="text-gray-400">&middot;</span>
                        <span className="text-gray-500">{formatDistanceToNow(annotation.createdAt, { addSuffix: true })}</span>
                        {annotation.isInternal && <Lock size={12} className="text-gray-500" title="Internal Note"/>}
                     </div>
                     <div className={cn("px-2 py-0.5 text-xs font-medium rounded-full flex items-center space-x-1.5", annotation.status === 'Open' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800')}>{annotation.status}</div>
                  </div>
                  
                  <p className="text-sm text-gray-800 mt-2 whitespace-pre-wrap">{annotation.text}</p>
                  
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-3 animate-in fade-in duration-200">
                        <div>
                            <label className="text-xs font-medium text-gray-500">Assignee</label>
                            <select value={annotation.assignee || ''} onChange={(e) => setAnnotations(p => p.map(a => a.id === annotation.id ? {...a, assignee: e.target.value || null} : a))} className="w-full mt-1 p-1.5 text-sm border border-gray-300 rounded-md"><option value="">Unassigned</option>{ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}</select>
                        </div>
                         <div>
                            <label className="text-xs font-medium text-gray-500">Due Date</label>
                            <input type="date" value={annotation.dueDate ? format(annotation.dueDate, 'yyyy-MM-dd') : ''} onChange={(e) => setAnnotations(p => p.map(a => a.id === annotation.id ? {...a, dueDate: e.target.value ? new Date(e.target.value) : null} : a))} className="w-full mt-1 p-1.5 text-sm border border-gray-300 rounded-md"/>
                         </div>
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center flex-wrap gap-1.5 text-xs">
                        {mediaType === 'video' && annotation.timestamp != null && ( <button onClick={(e) => {e.stopPropagation(); seekVideo(annotation.timestamp!)}} className="text-xs text-indigo-600 font-mono bg-indigo-50 px-1.5 py-0.5 rounded hover:bg-indigo-100">@{new Date(annotation.timestamp * 1000).toISOString().substring(14, 19)}</button>)}
                        {annotation.labels[0] && <div className={cn('px-2 py-0.5 rounded-full border text-xs', getLabelColor(annotation.labels[0]))}>{annotation.labels[0]}</div>}
                        {annotation.labels.length > 1 && <div className="px-2 py-0.5 rounded-full border bg-gray-100 text-gray-600 text-xs">+{annotation.labels.length - 1}</div>}
                    </div>
                    <div className="flex items-center space-x-1">
                        <button className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-md"><CornerDownLeft size={14}/></button>
                        <button onClick={(e) => { e.stopPropagation(); toggleAnnotationStatus(annotation.id, annotation.status); }} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-md"><CheckCircle2 size={14}/></button>
                        <button onClick={(e) => { e.stopPropagation(); setExpandedCommentId(isExpanded ? null : annotation.id) }} className={cn("p-1.5 rounded-md", isExpanded ? "bg-gray-200 text-gray-800" : "text-gray-500 hover:bg-gray-200")}><MoreHorizontal size={14}/></button>
                    </div>
                  </div>
                </div>
              )
            })}
            {filteredAndSortedComments.length === 0 && <div className="text-center py-10 text-gray-500"><FilterIcon size={32} className="mx-auto mb-2" /><p className="font-medium">No comments found.</p><p className="text-sm">Try adjusting your filters or search.</p></div>}
          </div>
          
          <div className="flex-none p-3 border-t border-gray-200 bg-white">
            {isLatestVersion && (
              <form onSubmit={handleAddComment}>
                {pendingRegions.length > 0 && !comparisonVersion && ( <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg mb-2 text-sm text-indigo-800"><div className="flex items-start justify-between"><div className="flex items-start space-x-2"><Info size={16} className="mt-0.5 flex-shrink-0" /><p>{pendingRegions.length} region(s) added. Add details below.</p></div><button type="button" onClick={cancelPendingAnnotation} className="text-indigo-500 hover:text-indigo-800"><XCircle size={16}/></button></div></div> )}
                <div className="relative">
                  <textarea ref={commentInputRef} value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} placeholder="Add a comment… @ to assign, # to label" className="w-full p-2 pr-28 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors disabled:bg-gray-100 text-sm" rows={1} disabled={!!comparisonVersion} />
                  <div className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center space-x-1">
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1.5 text-gray-500 hover:text-indigo-600 rounded-md"><Paperclip size={16}/></button>
                      {userRole === 'staff' && <button type="button" onClick={() => setIsInternalComment(p => !p)} className={cn("p-1.5 rounded-md", isInternalComment ? "text-indigo-600 bg-indigo-100" : "text-gray-500 hover:text-indigo-600")}><Lock size={16}/></button>}
                      <button type="button" onClick={() => setShowAdvancedComposer(p => !p)} className={cn("p-1.5 rounded-md", showAdvancedComposer ? "text-indigo-600 bg-indigo-100" : "text-gray-500 hover:text-indigo-600")}><MoreHorizontal size={16}/></button>
                  </div>
                </div>

                {showAdvancedComposer && (
                  <div className="mt-2 space-y-2 p-3 bg-gray-50 rounded-lg border animate-in fade-in duration-200">
                    <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">Type:</span>
                        <button type="button" onClick={() => setNewCommentType(p => p === 'Question' ? 'Note' : 'Question')} className={cn("w-7 h-7 flex items-center justify-center rounded-full text-sm", newCommentType === 'Question' ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700")}>?</button>
                        <button type="button" onClick={() => setNewCommentType(p => p === 'Blocker' ? 'Note' : 'Blocker')} className={cn("w-7 h-7 flex items-center justify-center rounded-full text-sm", newCommentType === 'Blocker' ? "bg-red-500 text-white" : "bg-gray-200 text-gray-700")}>!</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       <select value={newCommentAssignee || ''} onChange={e => setNewCommentAssignee(e.target.value || null)} className="p-2 text-sm rounded-md border border-gray-300 w-full"><option value="">Assign to...</option>{ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}</select>
                       <input type="date" value={newCommentDueDate} onChange={e => setNewCommentDueDate(e.target.value)} className="p-2 text-sm rounded-md border border-gray-300 w-full"/>
                    </div>
                  </div>
                )}
                
                <div className="mt-2 flex items-center justify-end">
                    <button type="submit" className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:bg-indigo-300 flex items-center justify-center space-x-2" disabled={!newCommentText.trim() || !!comparisonVersion}><Send size={16}/><span>Comment</span></button>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*,.pdf,.lut,.cube" />
                </div>
              </form>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
