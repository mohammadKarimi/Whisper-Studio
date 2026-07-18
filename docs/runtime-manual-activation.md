# Runtime manual activation note

This change updates the manual activation messaging and browser stub to be platform-aware.

- The manual activation error now shows the actual expected runtime paths for the selected platform instead of hard-coded Windows paths.
- The browser fallback stub for `transcribeWithWhisper` now returns a platform-appropriate `python` command instead of `python.exe` on non-Windows platforms.

Why:
- Previously users on macOS could see an error telling them to place `python\\python.exe` and `ffmpeg\\ffmpeg.exe` even though the runtime on macOS expects `python/bin/python` and `ffmpeg/ffmpeg`. The runtime checks were correct; the message was misleading.

If you want this reflected in docs or release notes, merge this branch and update any external documentation accordingly.
