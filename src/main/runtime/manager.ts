@@
-import { getRuntimeInstallPath } from './paths'
+import { getRuntimeInstallPath, getRuntimePythonPath, getRuntimeFfmpegPath } from './paths'
@@
-  try {
-    await checkRuntimeFiles(root)
-  } catch {
-    return {
-      ok: false,
-      status: await getRuntimeStatus(manifest),
-      stderr: `Runtime files not found at:\n${root}\n\nMake sure the folder contains python\\python.exe and ffmpeg\\ffmpeg.exe.`
-    }
-  }
+  try {
+    await checkRuntimeFiles(root)
+  } catch {
+    const pythonSample = getRuntimePythonPath(root)
+    const ffmpegSample = getRuntimeFfmpegPath(root)
+    return {
+      ok: false,
+      status: await getRuntimeStatus(manifest),
+      stderr: `Runtime files not found at:\n${root}\n\nMake sure the folder contains:\n${pythonSample}\n${ffmpegSample}`
+    }
+  }
