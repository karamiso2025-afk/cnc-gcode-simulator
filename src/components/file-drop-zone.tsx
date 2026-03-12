'use client';
import React, { useState, useEffect, useCallback } from 'react';
import type { FileDropZoneProps } from '../shared-types';

type Props = Partial<FileDropZoneProps>;

export default function FileDropZone({ onFileLoad, hasFile = false }: Props): JSX.Element {
  const [isDragging, setIsDragging] = useState(false);

  const readFile = useCallback((file: File): void => {
    const allowed = ['.gcode', '.nc', '.tap', '.ngc'];
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
    if (!allowed.includes(ext)) {
      onFileLoad?.({ success: false, fileName: file.name, content: '', error: '非対応のファイル形式です' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev: ProgressEvent<FileReader>): void => {
      const content = ev.target?.result as string;
      onFileLoad?.({ success: true, fileName: file.name, content });
    };
    reader.readAsText(file);
  }, [onFileLoad]);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent): void => { e.preventDefault(); setIsDragging(true); };
    const handleDragOver = (e: DragEvent): void => { e.preventDefault(); };
    const handleDragLeave = (e: DragEvent): void => { if (e.relatedTarget === null) setIsDragging(false); };
    const handleDrop = (e: DragEvent): void => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer?.files[0];
      if (file) readFile(file);
    };

    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    return (): void => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };
  }, [readFile]);

  if (!hasFile) {
    return (
      <div
        data-testid="file-drop-zone"
        className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur z-10"
        aria-label="ファイルドロップゾーン"
      >
        <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-lg font-medium text-foreground mb-2">ファイルをドロップまたは選択してください</p>
          <p className="text-sm text-muted-foreground">対応形式: .gcode, .nc, .tap, .ngc</p>
        </div>
      </div>
    );
  }

  if (isDragging) {
    return (
      <div
        data-testid="file-drop-zone"
        className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur z-10"
        aria-label="ファイルドロップゾーン"
      >
        <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-lg font-medium text-foreground">G-codeファイルをドロップしてください</p>
        </div>
      </div>
    );
  }

  return <div data-testid="file-drop-zone" aria-hidden="true" />;
}
