---
skill: humanizer
category: default-cream-cli
inputs: [task_context]
allowed-tools: [Read]
source-skill: .claude/skills/humanizer/SKILL.md
---

# Skill: humanizer

Default Cream CLI wrapper for `.claude/skills/humanizer/SKILL.md`.

## Trigger

AI가 생성한 한국어 텍스트의 특징적인 패턴을 감지하고 자연스러운 인간의 글쓰기로 변환합니다. 과학적 언어학 연구(KatFishNet 논문, 94.88% AUC 정확도)에 기반합니다. 쉼표 과다, 띄어쓰기 경직성, 품사 다양성, AI 어휘 과용, 번역투(에 대해/통해/되어진다), 대명사 과다, 복수형 과다, 구조적 단조로움 등 40가지 패턴을 S1/S2/S3 심각도로 분석합니다. ChatGPT/Claude/Gemini가 생성한 한국어 텍스트를 자연스럽게 만들거나 LLM 출력에서 AI 흔적을 제거할 때 사용하세요.

## Runtime Rule

Read `.claude/skills/humanizer/SKILL.md` when the task matches this trigger. Follow that SKILL.md as the authoritative instruction set.


