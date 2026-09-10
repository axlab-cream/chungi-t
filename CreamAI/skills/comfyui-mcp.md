# ComfyUI MCP Skill Note

Use this note when an AI agent needs to use ComfyUI or Comfy Cloud through MCP
for generated media, workflow JSON, or synthetic datasets.

## Default

- Project MCP server: `comfy-cloud`
- URL: `https://cloud.comfy.org/mcp`
- Project config schema: `.mcp.json` uses `"type": "http"` and `"url"`.
- Authentication: use the MCP client's normal OAuth/login flow. Do not store
  tokens in this repository.

## Cloud vs Local

- Use Comfy Cloud for hosted GPU generation, current public templates/models,
  and non-private assets.
- Use local ComfyUI only when the local ComfyUI endpoint and MCP server command
  are known. Example endpoint: `http://localhost:8188`.
- Keep local ComfyUI out of default SETUP because a missing Python module or
  wrong working directory creates broken MCP state.

## Prompt Contract

Capture these fields before running generation:

- output type: image, video, audio, 3D, workflow JSON, or dataset
- target subject/domain/classes
- count, duration, frames, resolution, aspect ratio
- variation conditions: lighting, camera, lens, motion, background, style
- output folder and metadata format
- privacy/licensing requirements

## Synthetic Data Pattern

For repeatable research data, create a YAML/JSON catalog first, then run Comfy
MCP generation and use Codex/file tools for metadata and validation.

Minimum catalog fields:

```yaml
task: object_detection
classes: []
per_class: 0
resolution: 1024x1024
conditions:
  backgrounds: []
  lighting: []
outputs:
  images: datasets/example/images
  annotations: datasets/example/annotations.json
  format: coco
```

Record model/template, seed policy, prompt source, output path, and verification
in `status.md`.
