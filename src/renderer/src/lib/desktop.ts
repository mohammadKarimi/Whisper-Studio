@@
-  transcribeWithWhisper: async (request) => ({
-    command: `python.exe -u -c faster_whisper "${request.filePath}"`,
-    exitCode: 1,
-    stdout: '',
-    stderr: 'Whisper transcription is available in the Electron desktop app.'
-  }),
+  transcribeWithWhisper: async (request) => {
+    const platform = detectBrowserPlatform()
+    const python = platform === 'win32' ? 'python.exe' : 'python'
+    return {
+      command: `${python} -u -c faster_whisper "${request.filePath}"`,
+      exitCode: 1,
+      stdout: '',
+      stderr: 'Whisper transcription is available in the Electron desktop app.'
+    }
+  },
