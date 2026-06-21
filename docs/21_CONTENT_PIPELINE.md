# Content Pipeline

## Purpose

This document defines how new content should be added.

Content includes:

- buildings;
- zones;
- roads;
- services;
- milestones;
- scenarios;
- tutorials;
- achievements.

## Data-Driven Content

New content should usually be added through data definitions plus existing systems.

Avoid custom code for every building unless behavior is truly unique.

## Adding a Building

Steps:

1. Add building definition.
2. Add visual asset/model id.
3. Add unlock if needed.
4. Add effects.
5. Add balance values.
6. Add tests if behavior is new.
7. Update docs.

## Adding a Scenario

Steps:

1. Define starting conditions.
2. Define objectives.
3. Define win/loss conditions.
4. Define rewards.
5. Add tutorial text if needed.
6. Playtest pacing.

## Placeholder Assets

Early content can use placeholders:

- boxes;
- simple low-poly meshes;
- generated colors;
- basic icons.

Final art should not block gameplay systems.

## Generated City Asset Library

The reusable final-art kit is generated locally with Blender rather than downloaded from an
external asset library. Run the following command from the repository root:

```bash
blender --background --python tools/generate_city_assets.py
```

It writes tile-scale GLB files to `public/assets/generated/` and a generated `manifest.json`.
Assets use a ground-centred root pivot, named PBR materials, emissive window or lighting
materials where applicable, and shared repeated geometry for an instancing-friendly loading
path. Do not edit generated GLB files by hand; change `tools/generate_city_assets.py` and
rerun the generator instead.

## Content Quality Checklist

Before adding content:

- Does it support the core loop?
- Does it create a meaningful choice?
- Is it visually readable?
- Is it balanced?
- Does it overlap too much with existing content?
- Is it unlocked at the right time?
