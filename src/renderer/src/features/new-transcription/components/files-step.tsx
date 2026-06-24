import { useState, useCallback, type Dispatch, type DragEvent, type SetStateAction } from 'react'
import { Upload, FileAudio, FileVideo, X, AlertTriangle, Clock, HardDrive } from 'lucide-react'
import { motion } from '@/lib/motion'
import { captions } from '@/captions'

export interface TranscriptionFile {
  duration: string
  name: string
  size: string
  type: 'audio' | 'video'
}

interface StepFilesProps {
  files: TranscriptionFile[]
  setFiles: Dispatch<SetStateAction<TranscriptionFile[]>>
}

export default function StepFiles({ files, setFiles }: StepFilesProps): JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDrag = useCallback((e: DragEvent<HTMLDivElement>, over: boolean) => {
    e.preventDefault()
    setIsDragOver(over)
  }, [])

  const removeFile = (index: number): void => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const totalDuration = captions.newTranscription.files.summary.totalDurationValue
  const totalSize = captions.newTranscription.files.summary.totalSizeValue

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        className={`rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer
          ${
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-border/60 hover:border-muted-foreground/40 hover:bg-secondary/20'
          }`}
        onDragOver={(e) => handleDrag(e, true)}
        onDragEnter={(e) => handleDrag(e, true)}
        onDragLeave={(e) => handleDrag(e, false)}
        onDrop={(e) => handleDrag(e, false)}
      >
        <div className="py-12 text-center">
          <div
            className={`w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center transition-colors ${isDragOver ? 'bg-primary/20' : 'bg-secondary'}`}
          >
            <Upload
              className={`w-5 h-5 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`}
            />
          </div>
          <p className="text-sm font-medium mb-1">
            {captions.newTranscription.files.dropZone.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {captions.newTranscription.files.dropZone.formats}
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {captions.newTranscription.files.selectedFiles}
          </h3>
          {files.map((file, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="glass-panel rounded-xl p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                {file.type === 'video' ? (
                  <FileVideo className="w-4.5 h-4.5 text-primary" />
                ) : (
                  <FileAudio className="w-4.5 h-4.5 text-chart-2" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{file.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="w-3 h-3" /> {file.duration}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <HardDrive className="w-3 h-3" /> {file.size}
                  </span>
                </div>
              </div>
              {file.size.includes('342') && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-warning/10 text-warning">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="text-[10px] font-medium">
                    {captions.newTranscription.files.largeFile}
                  </span>
                </div>
              )}
              <button
                onClick={() => removeFile(i)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}

          {/* Summary */}
          <div className="flex items-center gap-6 px-4 pt-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                {captions.newTranscription.files.summary.totalDuration}
              </span>
              <span className="text-[12px] font-mono font-medium">{totalDuration}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                {captions.newTranscription.files.summary.totalSize}
              </span>
              <span className="text-[12px] font-mono font-medium">{totalSize}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                {captions.newTranscription.files.summary.files}
              </span>
              <span className="text-[12px] font-mono font-medium">{files.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
