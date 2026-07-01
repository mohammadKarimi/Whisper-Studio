import { WHISPER_LANGUAGES } from '@shared/constants'

export const captions = {
  app: {
    defaultName: 'Whisper Studio'
  },
  titleBar: {
    workspace: 'Transcription Workspace',
    windowControls: 'Window controls',
    minimize: 'Minimize',
    restore: 'Restore',
    maximize: 'Maximize',
    close: 'Close'
  },
  sidebar: {
    searchPlaceholder: 'Search…',
    settings: 'Settings',
    reportBug: 'Report a Bug',
    expand: 'Expand',
    collapse: 'Collapse',
    theme: {
      dark: 'Dark theme',
      light: 'Light theme',
      switchToDark: 'Switch to dark theme',
      switchToLight: 'Switch to light theme'
    },
    sections: [
      {
        title: 'Workspace',
        items: [
          { label: 'Your Workspace', routeId: 'dashboard' },
          { label: 'New Transcription', routeId: 'new' },
          { label: 'Whisper Models', routeId: 'models' }
        ]
      }
    ]
  },
  statusBar: {
    label: 'System status',
    ready: 'System Ready',
    idle: 'Idle',
    metrics: [
      { label: 'CPU', value: 'Unknown' },
      { label: 'GPU', value: 'Unknown' },
      { label: 'Memory', value: 'Unknown' },
      { label: 'Platform', value: 'Unknown' }
    ]
  },
  routes: {
    dashboard: {
      title: 'Dashboard',
      placeholder: 'This page is ready for a feature.'
    }
  },
  dashboard: {
    welcomeHeader: {
      appName: 'Whisper Studio',
      greetings: {
        morning: 'Good morning',
        afternoon: 'Good afternoon',
        evening: 'Good evening'
      },
      subtitle:
        'Transcribe, edit, and enhance your audio with AI-powered accuracy. Pick up where you left off or start something new.',
      actions: {
        newTranscription: 'New Transcription'
      }
    },
    transcriptionGrid: {
      loading: 'Loading transcriptions...',
      empty: {
        title: 'No transcriptions yet',
        subtitle: 'Start a new transcription to see it here'
      },
      confirmDelete: {
        title: 'Delete transcription?',
        description:
          'This will permanently remove the transcription and all its files. This cannot be undone.',
        cancel: 'Cancel',
        confirm: 'Delete'
      },
      header: {
        title: 'Recent Transcriptions',
        singular: 'transcription',
        plural: 'transcriptions'
      },
      relativeTime: {
        justNow: 'Just now',
        minutesSuffix: 'm ago',
        hoursSuffix: 'h ago',
        yesterday: 'Yesterday',
        daysSuffix: ' days ago'
      }
    }
  },
  settingsPage: {
    title: 'Settings'
  },
  models: {
    header: {
      eyebrow: 'Model Manager',
      title: 'Whisper Models',
      subtitle: 'Download and manage OpenAI Whisper transcription models',
      storageLabel: 'Storage',
      modelsLabel: 'Models',
      emptyStorageValue: '0 B',
      modelCountSuffix: 'downloaded'
    },
    prerequisites: {
      title: 'Prerequisites',
      summary: {
        of: 'of',
        suffix: 'dependencies installed'
      },
      ready: {
        title: 'Environment ready',
        subtitle: 'All required dependencies are installed'
      },
      actions: {
        checkAll: 'Check all',
        install: 'Install',
        installing: 'Installing',
        openInstaller: 'Open installer',
        fix: 'Fix',
        fixAll: 'Fix all',
        expand: 'Show details',
        collapse: 'Hide details'
      },
      status: {
        ok: 'Installed',
        missing: 'Not installed',
        checking: 'Checking',
        installing: 'Installing',
        unsupported: 'Not supported',
        attention: 'Action needed'
      },
      versionPrefix: 'v',
      requiredPrefix: 'needs v',
      installFailed: 'Install failed',
      dependencyHint: 'Install Python first',
      unsupportedHint: 'Not available on this platform',
      items: [
        {
          id: 'python',
          name: 'Python',
          required: '3.8+',
          desc: 'Runtime environment for Whisper'
        },
        {
          id: 'ffmpeg',
          name: 'FFmpeg',
          required: 'any',
          desc: 'Audio/video extraction and decoding'
        },
        {
          id: 'cuda',
          name: 'CUDA Toolkit',
          required: '11.8+ / 12.x',
          desc: 'GPU acceleration for transcription'
        },
        {
          id: 'openai-whisper',
          name: 'openai-whisper',
          required: 'any',
          desc: 'OpenAI Whisper transcription library (pip)'
        },
        {
          id: 'torch',
          name: 'PyTorch',
          required: '2.0+',
          desc: 'Optional - for diarization & VAD'
        }
      ]
    },
    catalog: {
      title: 'Models',
      subtitle: 'Browse, download, and manage OpenAI Whisper models',
      installedBadge: 'Installed',
      addedPrefix: 'Added',
      filter: {
        all: 'All',
        installed: 'Installed',
        available: 'Available'
      },
      empty: {
        all: 'No models found',
        installed: 'No models downloaded yet',
        available: 'All models are downloaded',
        search: 'No models match your search',
        subtitle: 'Download a model to get started'
      }
    },
    downloaded: {
      title: 'Downloaded Models',
      summary: {
        suffix: 'models',
        separator: '·',
        storageSuffix: 'used'
      },
      empty: {
        title: 'No models downloaded yet',
        subtitle: 'Browse available models below to get started',
        loadingTitle: 'Checking downloaded models...'
      },
      detailSeparator: '·',
      languageSuffix: 'langs',
      actions: {
        more: 'Model actions',
        refresh: 'Refresh models',
        delete: 'Delete model',
        deleting: 'Deleting...',
        confirmDelete: 'Delete?',
        confirm: 'Delete',
        cancel: 'Cancel'
      }
    },
    available: {
      title: 'Available Models',
      subtitle: 'Download OpenAI Whisper models',
      recommended: 'Recommended',
      languageCount: '99',
      progressSuffix: '%',
      searchPlaceholder: 'Search models...',
      noSearchResults: 'No models match your search',
      sortLabel: 'Sort',
      etaPrefix: 'ETA',
      sort: {
        recommended: 'Recommended',
        sizeAsc: 'Size (small first)',
        sizeDesc: 'Size (large first)',
        speed: 'Fastest first',
        accuracy: 'Most accurate first'
      },
      empty: {
        title: 'All available models are downloaded',
        subtitle: 'Refresh downloaded models if you added or removed files outside the app.'
      },
      actions: {
        download: 'Download',
        downloading: 'Downloading...',
        downloaded: 'Downloaded',
        downloadFailed: 'Download failed'
      },
      blockedHint: 'Install Python and openai-whisper before downloading models'
    }
  },
  studio: {
    header: {
      title: 'Product Strategy Meeting Q4',
      status: 'Transcribed',
      duration: '1h 23m',
      speakers: '3 speakers',
      model: 'Large-v3',
      confidence: '96.4% confidence',
      separator: '·'
    },
    actions: {
      language: 'EN',
      label: 'Label',
      export: 'Export',
      replace: 'Replace',
      replaceAll: 'Replace All',
      comments: 'Comments',
      followOn: 'Follow: On',
      followOff: 'Follow: Off'
    },
    placeholders: {
      search: 'Search transcript…',
      replace: 'Replace with…'
    },
    emptyState: 'No segments match your filters.',
    matchesLabel: 'matches',
    defaultCurrentTime: '00:00:32',
    speakerPanel: {
      headings: {
        speakers: 'Speakers',
        statistics: 'Statistics',
        quality: 'Quality'
      },
      clear: 'Clear',
      segmentsLabel: 'segments',
      speakers: [
        { name: 'Sarah Chen', speaker: 'Speaker 1', segments: 3 },
        { name: 'Michael Torres', speaker: 'Speaker 2', segments: 3 },
        { name: 'Lisa Wang', speaker: 'Speaker 3', segments: 2 }
      ],
      stats: [
        { label: 'Word Count', value: '2,847' },
        { label: 'Duration', value: '1h 23m' },
        { label: 'Confidence', value: '96.4%' },
        { label: 'WPM', value: '142' }
      ],
      quality: [
        { label: 'Accuracy', value: '96%' },
        { label: 'Clarity', value: '89%' },
        { label: 'Noise', value: 'Low' }
      ]
    }
  },
  newTranscription: {
    title: 'New Transcription',
    subtitle: 'Configure and start your transcription job',
    completedStepMarker: '✓',
    initialFiles: [
      { name: 'board_meeting_2024_q4.mp4', size: '342 MB', duration: '2h 10m', type: 'video' },
      { name: 'customer_interview_sarah.wav', size: '128 MB', duration: '42m 15s', type: 'audio' }
    ],
    initialSettings: {
      language: 'Auto',
      model: '',
      compute: 'cpu',
      wordTimestamps: false,
      diarization: false,
      translate: false,
      removeSilence: false,
      noiseReduction: false
    },
    initialOutputFormats: ['srt', 'txt', 'vtt', 'json', 'tsv'],
    initialExportMode: 'single',
    steps: [
      { id: 1, label: 'Select Files', description: 'Choose audio or video files' },
      { id: 2, label: 'Settings', description: 'Configure transcription' },
      { id: 3, label: 'Output', description: 'Format & export options' },
      { id: 4, label: 'Processing', description: 'Transcribe selected files' }
    ],
    navigation: {
      back: 'Back',
      cancel: 'Cancel',
      continue: 'Continue',
      startTranscription: 'Start Transcription'
    },
    files: {
      dropZone: {
        title: 'Drop files here or click to browse',
        formats: 'MP3, WAV, MP4, WEBM, M4A, FLAC, OGG, AAC'
      },
      selectedFiles: 'Selected Files',
      largeFile: 'Large file',
      summary: {
        totalDuration: 'Total Duration',
        totalSize: 'Total Size',
        files: 'Files',
        totalDurationValue: '2h 52m 15s',
        totalSizeValue: '470 MB'
      }
    },
    settings: {
      recommendedBanner: {
        emphasis: 'CPU mode is selected by default.',
        detail: 'Choose one of your downloaded OpenAI Whisper models before starting transcription.'
      },
      recommendedBadge: 'Recommended',
      noDownloadedModelsAlert:
        'No downloaded models were found. Download a model before starting transcription.',
      noDownloadedModelsTooltip:
        'Go to Whisper Models Page and download an OpenAI Whisper model first.',
      modelPlaceholder: 'Select a model',
      goToModels: 'Go to Models',
      languageSearchPlaceholder: 'Search language...',
      noLanguageResults: 'No languages found',
      computeModes: [
        { value: 'cpu', label: 'CPU' },
        { value: 'gpu', label: 'GPU' }
      ],
      modelDetails: {
        speed: 'Speed',
        accuracy: 'Accuracy',
        vram: 'VRAM',
        note: 'Note'
      },
      advancedSettings: 'Advanced Settings',
      languages: WHISPER_LANGUAGES.map((language) => ({ value: language, label: language })),
      rows: {
        language: {
          label: 'Language',
          description: 'Source audio language',
          tooltip: 'Auto-detect works well for most languages. Select manually for better accuracy.'
        },
        model: {
          label: 'Model',
          description: 'Accuracy vs speed tradeoff',
          tooltip:
            'Larger models are more accurate but slower. Large-v3 is recommended for professional use.'
        },
        compute: {
          label: 'Compute',
          description: 'Processing hardware',
          tooltip: 'GPU is significantly faster. Falls back to CPU if no compatible GPU is found.'
        },
        wordTimestamps: {
          label: 'Word Timestamps',
          description: 'Precise timing for each word',
          tooltip: 'Enables word-level timing data, useful for subtitle editing.'
        },
        diarization: {
          label: 'Speaker Diarization',
          description: "Identify who's speaking",
          tooltip: 'Automatically labels different speakers. Works best with 2–6 speakers.'
        },
        translate: {
          label: 'Translate to English',
          description: 'Translate non-English audio to English'
        },
        removeSilence: {
          label: 'Remove Silence',
          description: 'Strip silent segments from output'
        },
        noiseReduction: {
          label: 'Noise Reduction',
          description: 'Pre-process audio to reduce background noise'
        }
      }
    },
    output: {
      title: 'Output Formats',
      description: 'Select one or more export formats',
      outputFolder: {
        title: 'Output Folder',
        description: 'Where to save exported files',
        path: '~/Documents/Whisper Studio/exports'
      },
      estimated: {
        timeLabel: 'Estimated Time',
        timeValue: '~21 min',
        unknownTimeValue: '—',
        lessThanMinute: '<1 min',
        fileSizeEstimateNote: 'Estimated from file size',
        hourUnit: 'h',
        minuteUnit: 'min',
        modelLabel: 'Model',
        modelValue: 'Large-v3',
        unknownModelValue: '—',
        outputFilesLabel: 'Output Files',
        fileSuffix: 'file',
        filesSuffix: 'files'
      },
      formats: [
        {
          value: 'txt',
          label: 'Plain Text',
          ext: '.txt',
          desc: 'Simple text transcript'
        },
        {
          value: 'srt',
          label: 'SRT Subtitles',
          ext: '.srt',
          desc: 'Standard subtitle format'
        },
        { value: 'vtt', label: 'WebVTT', ext: '.vtt', desc: 'Web-compatible subtitles' },
        { value: 'json', label: 'JSON', ext: '.json', desc: 'Structured data with metadata' },
        { value: 'tsv', label: 'TSV', ext: '.tsv', desc: 'Formatted text with headers' }
      ]
    }
  },
  processing: {
    title: 'Processing',
    status: {
      complete: 'Transcription complete',
      failed: 'Transcription failed',
      noFile: 'No file was selected for transcription.',
      inProgress: 'Transcription in progress...'
    },
    job: {
      fileName: 'board_meeting_2024_q4.mp4',
      details: '2h 10m · 342 MB · Large-v3 · GPU'
    },
    progress: {
      complete: 'Complete',
      allStagesComplete: 'All stages completed successfully'
    },
    commandLogTitle: 'Command Log',
    diagnosticLogTitle: 'Diagnostic Log',
    logs: {
      compute: 'compute',
      entries: 'entries',
      filePath: 'file',
      formats: 'formats',
      model: 'model',
      starting: 'Starting transcription request.',
      waiting: 'Waiting for diagnostics...'
    },
    liveOutputTitle: 'Live Output',
    outputsTitle: 'Generated Files',
    stagesTitle: 'Processing Stages',
    stageStatus: {
      done: 'Done',
      running: 'Running'
    },
    actions: {
      pause: 'Pause',
      cancel: 'Cancel',
      export: 'Export',
      openInStudio: 'Open in Studio'
    },
    stages: [
      {
        id: 'prepare',
        label: 'Checking Environment',
        desc: 'Verifying Python and openai-whisper'
      },
      { id: 'transcribe', label: 'Transcribing', desc: 'Processing audio with OpenAI Whisper' },
      { id: 'export', label: 'Saving Files', desc: 'Writing output files to disk' }
    ]
  },
  export: {
    title: 'Export',
    subtitle: 'Preview and export your transcription',
    defaultFormat: 'txt',
    formats: [
      { value: 'txt', label: 'TXT' },
      { value: 'srt', label: 'SRT' },
      { value: 'vtt', label: 'VTT' },
      { value: 'json', label: 'JSON' },
      { value: 'tsv', label: 'TSV' }
    ],
    fileInfo: {
      title: 'No file selected',
      details: '1h 23m · 3 speakers · 2,847 words · Large-v3',
      confidenceLabel: 'Confidence',
      confidenceValue: '96.4%',
      languageLabel: 'Language',
      languageValue: 'English'
    },
    actions: {
      copied: 'Copied',
      copiedWithBang: 'Copied!',
      copyToClipboard: 'Copy to Clipboard',
      copy: 'Copy',
      chooseFolder: 'Choose Folder',
      saveLocally: 'Save Locally',
      saveAll: 'Save All',
      backToStudio: 'Back to Studio'
    },
    labels: {
      format: 'Format',
      fallbackTitle: 'Export',
      segments: 'segments'
    },
    empty: {
      noTranscriptionLoaded: 'No transcription loaded.',
      goBackToStudio: 'No transcription loaded - go back to Studio first'
    },
    preview: {
      titlePrefix: 'Preview',
      titleSeparator: '—',
      fileNameStem: 'product_strategy_q4'
    },
    options: {
      title: 'Export Options',
      formatPrefix: 'Export as',
      formatSuffix: 'format'
    }
  },
  audioPlayer: {
    defaultDuration: '01:23:45',
    speed: '1.0x',
    tooltips: {
      back10s: 'Back 10s',
      play: 'Play',
      pause: 'Pause',
      forward10s: 'Forward 10s',
      mute: 'Mute',
      unmute: 'Unmute',
      playbackSpeed: 'Playback speed',
      loopOn: 'Loop on',
      loopOff: 'Loop off'
    }
  },
  errors: {
    selectContext: 'Select components must be used inside Select',
    tabsContext: 'Tabs components must be used inside Tabs',
    tooltipContext: 'Tooltip components must be used inside Tooltip',
    collapsibleContext: 'Collapsible components must be used inside Collapsible'
  }
} as const
