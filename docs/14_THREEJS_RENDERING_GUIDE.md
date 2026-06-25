# Three.js Rendering Guide

## Purpose

This document defines rendering practices for the Three.js layer.

## Rendering Goals

- clear grid;
- readable city;
- smooth camera;
- responsive placement;
- acceptable browser performance.

## Presentation Composition

The game view uses a polished realistic city scene under a dark translucent HUD. Keep that HUD in
the UI layer: the renderer owns the city image, while the UI owns the city identity card,
centered city metrics, build rail, minimap, contextual inspector, and build/dashboard
drawers. This keeps the reference-inspired presentation independent of simulation state.

The production visual path is a bright readable golden-hour scene: a large soft sky gradient,
warm sun, cool fill, broad hemisphere light, restrained fog, ACES filmic tone mapping, and sRGB
output. These settings remain entirely inside the rendering layer.

Use natural atmospheric fog, blended terrain colors, textured-looking procedural materials,
soft directional shadows, and filmic color mapping. Buildings and roads should have façade and
surface depth rather than reading as flat colored blocks. These are renderer-only presentation
settings and must not influence grid or simulation state.

Large grass terrain receivers should avoid projected shadow-map reception when the camera can
rotate. The procedural terrain surface is broad and lightly displaced, so shadow reception there
can produce camera-dependent crawling or flicker. Use stable material variation for terrain
shading, and reserve received shadows for smaller road, building, and detail meshes where they
remain visually stable.

## Scene Structure

Suggested objects:

```txt
Scene
  GridLayer
  TerrainLayer
  RoadLayer
  ZoneOverlayLayer
  BuildingLayer
  ServiceOverlayLayer
  WarningIconLayer
  EffectsLayer
```

### Layer Synchronization

The animation loop may render every frame, but it must not rebuild the scene graph every frame.
City rendering is synchronized by dirty layer: terrain, roads, zones, buildings, overlays, and
warnings are cleared and recreated independently. A road placement should not dispose building
meshes, and an overlay change should not rebuild roads or terrain.

When adding a rendered layer, give it an explicit invalidation key derived from the simulation or
UI state it actually visualizes. If a layer depends on occupancy, include the relevant occupancy
fields in that key. Do not hide rebuild cost by throttling frames; keep the objects alive and only
update the layer whose visual inputs changed.

## Camera

Recommended camera:

- orthographic or perspective with city-builder angle;
- pan;
- zoom;
- optional rotation;
- constrained bounds.

Orthographic camera improves readability and city-builder feel.

### Dynamic Map Size

`createScene(container, gridSize)` accepts a configurable grid size. Camera distance, zoom limits, and shadow camera bounds scale proportionally to the grid size. The camera center also adapts to `gridSize / 2`. The `SceneContext` exposes the grid size for use by other rendering code.

## Picking

Use raycasting to convert mouse position to grid tile.

Picking should output a tile coordinate (grid x, y) and optionally an object id if a mesh was hit.

Do not put simulation logic inside picking.

## Grid Rendering

Can use:

- grid helper;
- custom plane with grid material;
- tile hover highlight mesh.

Avoid rendering thousands of individual tile meshes if unnecessary.

## Roads

Road rendering variants:

- road variants based on neighboring connections;
- intersections;
- curves;
- lane markings, curbs, sidewalks, and crosswalks;
- low-cost street furniture such as instanced street lights and signs.

The renderer should join contiguous, same-class road tiles into long visual corridors before
adding asphalt, sidewalks, curbs, and lane markings. This avoids the checkerboard look caused
by drawing every simulation tile as a separate road mesh. Road corridor assembly is purely a
rendering optimization and must not change the simulation road graph.
Generated road GLBs should not be used as the primary road surface because per-tile modular
pieces create visible seams at T and four-way intersections. Use the continuous corridor
renderer for asphalt, sidewalks, curbs, lane markings, and intersection plates, then layer
generated assets on top for streetlights, traffic lights, cars, signs, trees, and furniture.

## Buildings

Residential building variant range was expanded from `[0, 5]` to `[0, 6]` in `city.ts` when two new GLB models (`residential_house_detached`, `residential_stucco_cottage_reference`) were added to the asset registry.

The production building path uses the locally generated GLB library under
`public/assets/generated/`, not primitive building boxes. `CityAssetManager` preloads the
static registry once, then clones cached GLTF scenes with `SkeletonUtils.clone` so materials,
including emissive windows, are preserved. Selection is deterministic by render category:
residential, commercial, industrial (including utilities), and civic (including services).
Generated asset geometry and materials are shared resources and must not be disposed when a
render layer is rebuilt.

Buildings should be modular procedural meshes assembled from shared geometries and materials.
Prioritize façade depth, roof shapes, windows, doors, storefronts, loading bays, and rooftop
equipment over unique asset files. Deterministic per-instance variation prevents repetition.

Use instancing for repeated building types when practical.

The Foundation renderer groups buildings by definition and status, then draws each group
with a Three.js `InstancedMesh`. This keeps repeated homes and future repeated zone-grown
buildings efficient while still updating the visual when a building changes status.
Density upgrades replace the instance's definition ID, so the next renderer synchronization
automatically moves it into the appropriate mesh group and visual dimensions.

Terrain and water rendering should also be data-driven visualizations of tile state. The
renderer can draw a larger surrounding landscape so the map feels continuous, but only the
active tile rectangle is pickable and buildable. Terrain height, grass color variation, rocks,
and trees must never change tile simulation data.
Water animation, foam, and reflections are render-time effects only.

Small authored albedo textures are stored under `public/textures/` and loaded through the
renderer texture cache. Detailed facade images must not be wrapped around a building box: that
repeats doors and windows on every side, including the roof. Base volumes use distinct wall,
roof, and foundation materials; doors, storefronts, window bays, loading docks, and rooftop
access are separately instanced geometry at intentional positions. Reuse neutral tileable
surface textures with repeat wrapping where appropriate, but never use a door-bearing facade
as a repeated base material.

Curtain-wall textures are permitted only on the separate window meshes. Their repetition is
limited to glazing and mullions, while building entries, storefronts, loading doors, roofs, and
rooftop equipment remain explicit geometry.

## Night Rendering and Quality

`createScene` owns the cinematic night preset and supplies a composer chain with `RenderPass`,
`UnrealBloomPass`, and `OutputPass`. Bloom is enabled for high and ultra presets, allowing
emissive windows, streetlights, and vehicle lights to read cleanly without charging lower-end
devices for post-processing.

### Window Emissive Balance

Windows are rendered as individual small boxes (not full-width strips). Each building facade has
a grid of 4-8 columns × 6-10 floors of tiny window panes. 30-60% of windows per building are
lit (warm white, cool white, yellow, dim blue), the rest are dark reflective glass
(`0x080c14`, roughness 0.08, metalness 0.45). Window emissive is subdued at 0.06 intensity so
lit windows glow without washing out facade details. Thin frame strips above and below each
window, plus horizontal floor separators and vertical column lines, give facades visible
structure even when all windows are off.

### Scene Lighting

The night scene uses layered lighting:

- Ambient: blue `0x2a3a5a` at 0.45 (brighter fill for facade readability)
- Moonlight: cool directional `0xaabbdd` at 1.2, shadow-casting (less intense, cooler tint)
- Moon fill: `0x7799cc` at 0.8 from opposite side
- Blue rim: `0x4466aa` at 0.4 for edge definition
- Warm city glow: `0xff8844` at 0.18 from ground level
- Hemisphere: `0x1a2a50` (sky) / `0x0a0e15` (ground) at 0.45

Background is a 512×512 canvas with a deep gradient plus 300 randomly-placed star dots for
atmospheric depth. Fog is darker (`0x081018`) with closer start/end range scaled to grid size.

### Procedural Texture Generation

When external texture files are unavailable, the renderer generates procedural textures at
runtime using Canvas2D:

| Texture      | Use                           | Features                               |
| ------------ | ----------------------------- | -------------------------------------- |
| Concrete     | Sidewalks, walls, foundations | Speckled aggregate, random cracks      |
| Brick        | Residential walls             | Mortar grid, per-brick color variation |
| Asphalt      | Road surfaces                 | Dark noise, pebble dots, crack lines   |
| Facade panel | Tower cladding                | Panel grid with gap lines, wear marks  |
| Metal        | Industrial cladding           | Brushed directional scratch lines      |
| Roof         | Roof surfaces                 | Dark gravel noise                      |

These textures are cached by key and use `RepeatWrapping` for tiling.

### Quality Profiles

The renderer has `low`, `medium`, `high`, and `ultra` quality profiles. They control:

| Setting        | low | medium | high           | ultra       |
| -------------- | --- | ------ | -------------- | ----------- |
| pixelRatioCap  | 1   | 1.5    | 2              | 2           |
| shadowMapSize  | 512 | 1024   | 2048           | 2048        |
| bloom          | off | off    | 0.15/0.08/0.92 | 0.2/0.1/0.9 |
| detailDensity  | 0.3 | 0.55   | 0.8            | 1.0         |
| propDensity    | 0.2 | 0.4    | 0.7            | 1.0         |
| vehicleDensity | 0   | 0.3    | 0.6            | 1.0         |
| treeDensity    | 0.3 | 0.5    | 0.7            | 1.0         |
| fogDensity     | 0.4 | 0.7    | 1.0            | 1.0         |
| waterQuality   | 0   | 1      | 1              | 2           |

Bloom is selective with a 0.92 threshold so only the brightest emissive surfaces (streetlights,
vehicle headlights, a few windows) contribute. Strength is reduced (0.15-0.2) and radius is
tight (0.08-0.1) to prevent bloom from washing out building shapes.

The quality profile never affects simulation data or player actions.

### Street-Level Detail

Road rendering includes:

- Streetlights (instanced with pole, arm, lamp sphere, and warm light cone)
- Traffic lights (at intersections with 3+ connections)
- Parked cars (on 2-connection road segments, with headlights and taillights)
- Street trees (oak, maple, conifer alongside roads)
- Street furniture (benches, trash bins at low density)
- Road signs and bus stops (at high detail density)
- Crosswalks (5 white stripes per intersection direction)
- Stop bars (white lines at intersection approaches)
- Dashed center lane markings (arterial, collector, and local tiers)

Details are placed deterministically using hash-based selection relative to `detailDensity`,
ensuring consistent placement across renders without random state.

### Data Decoupling

Rendering code must not import from `src/data/` or `src/simulation/` directly. To access
building definition fields needed for rendering (size, category, service radii), the
`syncCityRenderLayers` function accepts a `BuildingRenderInfoLookup` callback. The
application layer (`src/main.ts`) provides this callback, bridging data access while
keeping the renderer agnostic of the data module. The lookup signature is:

```ts
type BuildingRenderInfoLookup = (definitionId: string) => BuildingRenderInfo | null;
```

## Placement Preview

Build mode should show:

- ghost object;
- footprint;
- valid/invalid indication;
- cost preview in UI.

## Overlays

Overlays should be separate visual modes.

Examples:

- zoning overlay;
- pollution overlay;
- service coverage;
- traffic.

Only one or two overlays should be active at once.

The Foundation toolbar provides zoning, pollution, health, education, and district overlay modes.
The zoning overlay draws the active zone color over every zoned tile, including tiles that
already contain a building. The UI keeps the active overlay mutually exclusive.

Zone fills should sit just above terrain, be semi-transparent, use subtle tile borders, and
remain readable over detailed terrain and buildings. Hover and selection states must be brighter
and more precise without obscuring the city.

The district overlay renders the saved color for each district-owned tile. It never assigns
tiles, validates policies, or computes policy effects; those responsibilities remain in the
simulation layer.

## Render State Cache

Maintain a mapping of `buildingId → mesh/object` and `roadCoord → mesh/object` so rendering can update changed objects without rebuilding everything.

This lets rendering update changed objects without rebuilding everything.

## Debug Rendering

Useful debug tools:

- show tile coordinates;
- show road graph;
- show building ids;
- show service radius;
- show simulation tick time;
- show draw calls/FPS.
