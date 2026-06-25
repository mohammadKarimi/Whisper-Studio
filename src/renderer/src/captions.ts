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
    expand: 'Expand',
    collapse: 'Collapse',
    sections: [
      {
        title: 'Workspace',
        items: [{ label: 'Your Workspace', routeId: 'overview' }]
      },
      {
        title: 'Transcription',
        items: [{ label: 'New Transcription', routeId: 'new' }]
      }
    ]
  },
  statusBar: {
    label: 'System status',
    ready: 'System Ready',
    idle: 'Idle',
    metrics: [
      { label: 'GPU', value: 'RTX 4090' },
      { label: 'VRAM', value: '24 GB' },
      { label: 'Model', value: 'large-v3' }
    ]
  },
  routes: {
    dashboard: {
      title: 'Dashboard',
      placeholder: 'This page is ready for a feature.'
    }
  },
  settingsPage: {
    title: 'Settings'
  },
  studio: {
    transcript: [
      {
        id: 1,
        speaker: 'Speaker 1',
        name: 'Sarah Chen',
        time: '00:00:00',
        endTime: '00:00:15',
        text: "Good morning everyone. Thank you for joining today's product strategy meeting. We have a lot to cover, so let's get started right away."
      },
      {
        id: 2,
        speaker: 'Speaker 2',
        name: 'Michael Torres',
        time: '00:00:15',
        endTime: '00:00:32',
        text: "Thanks Sarah. I'd like to start by reviewing our Q3 metrics. Overall, we saw a 23% increase in user engagement, which exceeded our target of 18%."
      },
      {
        id: 3,
        speaker: 'Speaker 1',
        name: 'Sarah Chen',
        time: '00:00:32',
        endTime: '00:00:48',
        text: "That's excellent. Can you break down which features drove the most engagement? I'm particularly interested in the AI-powered suggestions we launched in August."
      },
      {
        id: 4,
        speaker: 'Speaker 2',
        name: 'Michael Torres',
        time: '00:00:48',
        endTime: '00:01:12',
        text: 'Absolutely. The AI suggestions feature had the highest adoption rate at 67% of active users. The real-time collaboration tools came in second at 45%. We also saw significant growth in our mobile usage, up 31% quarter over quarter.'
      },
      {
        id: 5,
        speaker: 'Speaker 3',
        name: 'Lisa Wang',
        time: '00:01:12',
        endTime: '00:01:35',
        text: 'I want to add some context from the user research side. We conducted 42 user interviews last quarter, and the feedback has been overwhelmingly positive. The main request is better integration with existing workflows, which aligns with our Q4 roadmap.'
      },
      {
        id: 6,
        speaker: 'Speaker 1',
        name: 'Sarah Chen',
        time: '00:01:35',
        endTime: '00:01:52',
        text: "Perfect. Let's talk about Q4 priorities then. I've outlined three key initiatives that I believe will position us well for next year. First, expanding our API ecosystem."
      },
      {
        id: 7,
        speaker: 'Speaker 2',
        name: 'Michael Torres',
        time: '00:01:52',
        endTime: '00:02:15',
        text: "The API expansion is critical. We've had over 200 requests from enterprise customers for deeper integrations. I'd suggest we prioritize the webhook system and the batch processing endpoints."
      },
      {
        id: 8,
        speaker: 'Speaker 3',
        name: 'Lisa Wang',
        time: '00:02:15',
        endTime: '00:02:38',
        text: "From a design perspective, we need to ensure the developer experience is world-class. I'd recommend we invest in comprehensive documentation and interactive playground environments."
      }
    ],
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
      comments: 'Comments'
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
      language: 'auto',
      model: 'large-v3',
      compute: 'gpu',
      wordTimestamps: true,
      diarization: true,
      translate: false,
      removeSilence: false,
      noiseReduction: true
    },
    initialOutputFormats: ['srt', 'txt'],
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
        emphasis: 'Recommended settings applied.',
        detail: 'Large-v3 model with GPU for maximum accuracy. Estimated speed: ~8x real-time.'
      },
      recommendedBadge: 'Recommended',
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
      models: [
        {
          value: 'tiny',
          label: 'Tiny',
          speed: '~75x',
          accuracy: 'Lower',
          vram: '1 GB',
          desc: 'Fastest, good for drafts'
        },
        {
          value: 'base',
          label: 'Base',
          speed: '~50x',
          accuracy: 'Fair',
          vram: '1 GB',
          desc: 'Quick transcriptions'
        },
        {
          value: 'small',
          label: 'Small',
          speed: '~32x',
          accuracy: 'Good',
          vram: '2 GB',
          desc: 'Balanced choice'
        },
        {
          value: 'medium',
          label: 'Medium',
          speed: '~16x',
          accuracy: 'High',
          vram: '5 GB',
          desc: 'Professional quality'
        },
        {
          value: 'large-v3',
          label: 'Large-v3',
          speed: '~8x',
          accuracy: 'Best',
          vram: '10 GB',
          desc: 'Maximum accuracy',
          recommended: true
        }
      ],
      languages: [
        { value: 'auto', label: 'Auto-detect' },
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Spanish' },
        { value: 'fr', label: 'French' },
        { value: 'de', label: 'German' },
        { value: 'ja', label: 'Japanese' },
        { value: 'ko', label: 'Korean' },
        { value: 'zh', label: 'Chinese' },
        { value: 'pt', label: 'Portuguese' },
        { value: 'it', label: 'Italian' },
        { value: 'ru', label: 'Russian' },
        { value: 'ar', label: 'Arabic' }
      ],
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
        modelLabel: 'Model',
        modelValue: 'Large-v3',
        outputFilesLabel: 'Output Files',
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
        { value: 'md', label: 'Markdown', ext: '.md', desc: 'Formatted text with headers' },
        { value: 'html', label: 'HTML', ext: '.html', desc: 'Styled web page output' }
      ]
    }
  },
  processing: {
    title: 'Processing',
    status: {
      complete: 'Transcription complete',
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
      { id: 'model', label: 'Loading Model', desc: 'Initializing Large-v3 model on GPU' },
      { id: 'extract', label: 'Extracting Audio', desc: 'Converting video to audio stream' },
      { id: 'transcribe', label: 'Transcribing', desc: 'Processing audio with Faster-Whisper' },
      { id: 'speaker', label: 'Speaker Detection', desc: 'Identifying speakers with diarization' },
      { id: 'export', label: 'Exporting', desc: 'Writing output files' }
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
      { value: 'md', label: 'Markdown' },
      { value: 'html', label: 'HTML' }
    ],
    fileInfo: {
      title: 'Product Strategy Meeting Q4',
      details: '1h 23m · 3 speakers · 2,847 words · Large-v3',
      confidenceLabel: 'Confidence',
      confidenceValue: '96.4%',
      languageLabel: 'Language',
      languageValue: 'English'
    },
    actions: {
      copied: 'Copied',
      copyToClipboard: 'Copy to Clipboard',
      chooseFolder: 'Choose Folder',
      saveLocally: 'Save Locally'
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
    },
    previews: {
      txt: `Product Strategy Meeting Q4

[00:00:00] Sarah Chen: Good morning everyone. Thank you for joining today's product strategy meeting. We have a lot to cover, so let's get started right away.

[00:00:15] Michael Torres: Thanks Sarah. I'd like to start by reviewing our Q3 metrics. Overall, we saw a 23% increase in user engagement, which exceeded our target of 18%.

[00:00:32] Sarah Chen: That's excellent. Can you break down which features drove the most engagement? I'm particularly interested in the AI-powered suggestions we launched in August.

[00:00:48] Michael Torres: Absolutely. The AI suggestions feature had the highest adoption rate at 67% of active users. The real-time collaboration tools came in second at 45%.`,
      srt: `1
00:00:00,000 --> 00:00:15,000
Good morning everyone. Thank you for joining
today's product strategy meeting. We have a lot
to cover, so let's get started right away.

2
00:00:15,000 --> 00:00:32,000
Thanks Sarah. I'd like to start by reviewing
our Q3 metrics. Overall, we saw a 23% increase
in user engagement, which exceeded our target of 18%.

3
00:00:32,000 --> 00:00:48,000
That's excellent. Can you break down which
features drove the most engagement? I'm particularly
interested in the AI-powered suggestions.`,
      vtt: `WEBVTT

00:00:00.000 --> 00:00:15.000
<v Sarah Chen>Good morning everyone. Thank you
for joining today's product strategy meeting.

00:00:15.000 --> 00:00:32.000
<v Michael Torres>Thanks Sarah. I'd like to start
by reviewing our Q3 metrics. Overall, we saw a
23% increase in user engagement.

00:00:32.000 --> 00:00:48.000
<v Sarah Chen>That's excellent. Can you break down
which features drove the most engagement?`,
      json: `{
  "metadata": {
    "title": "Product Strategy Meeting Q4",
    "duration": "1:23:45",
    "speakers": 3,
    "model": "large-v3",
    "language": "en"
  },
  "segments": [
    {
      "id": 1,
      "start": 0.0,
      "end": 15.0,
      "speaker": "Sarah Chen",
      "text": "Good morning everyone...",
      "confidence": 0.97,
      "words": [
        {"word": "Good", "start": 0.0, "end": 0.3},
        {"word": "morning", "start": 0.3, "end": 0.7}
      ]
    }
  ]
}`,
      md: `# Product Strategy Meeting Q4

**Date:** December 12, 2024  
**Duration:** 1h 23m  
**Speakers:** Sarah Chen, Michael Torres, Lisa Wang

---

## Transcript

**Sarah Chen** *(00:00:00)*  
Good morning everyone. Thank you for joining today's product strategy meeting. We have a lot to cover, so let's get started right away.

**Michael Torres** *(00:00:15)*  
Thanks Sarah. I'd like to start by reviewing our Q3 metrics. Overall, we saw a 23% increase in user engagement, which exceeded our target of 18%.

**Sarah Chen** *(00:00:32)*  
That's excellent. Can you break down which features drove the most engagement?`,
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Product Strategy Meeting Q4</title>
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 0 auto; padding: 2rem; }
    .speaker { font-weight: 600; color: #6C63FF; }
    .timestamp { color: #888; font-size: 0.85em; font-family: monospace; }
    .segment { margin-bottom: 1.5rem; line-height: 1.6; }
  </style>
</head>
<body>
  <h1>Product Strategy Meeting Q4</h1>
  <div class="segment">
    <span class="speaker">Sarah Chen</span>
    <span class="timestamp">00:00:00</span>
    <p>Good morning everyone...</p>
  </div>
</body>
</html>`
    }
  },
  audioPlayer: {
    defaultDuration: '01:23:45',
    speed: '1.0x'
  },
  errors: {
    selectContext: 'Select components must be used inside Select',
    tabsContext: 'Tabs components must be used inside Tabs',
    tooltipContext: 'Tooltip components must be used inside Tooltip',
    collapsibleContext: 'Collapsible components must be used inside Collapsible'
  }
} as const
