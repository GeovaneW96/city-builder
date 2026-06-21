# Generated city assets

This directory is populated by the procedural Blender pipeline:

```bash
blender --background --python tools/generate_city_assets.py
```

The generator creates GLB assets under `buildings`, `roads`, `props`, `vehicles`, and `nature`,
plus `manifest.json`. Generated binaries are intentionally not committed; rerun the generator
after changing the source script.

Every GLB has a root pivot centred on X/Z at ground level (`Y = 0`). The existing render grid
uses one world unit per tile, so the asset library is authored at tile scale and can be placed
or scaled by the future asset registry without changing simulation state.
