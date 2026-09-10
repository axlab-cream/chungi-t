---
skill: watch
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/watch/SKILL.md
---

# Skill: watch

Default Cream CLI wrapper for `.claude/skills/watch/SKILL.md`.

## Trigger

Watch a video (URL or local path). Downloads with yt-dlp, extracts auto-scaled frames with ffmpeg, pulls the transcript from captions (or Whisper API fallback), and hands the result to Claude so it can answer questions about what's in the video.

## Runtime Rule

Read `.claude/skills/watch/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


