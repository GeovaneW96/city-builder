# Art Direction

## Visual Style

Recommended style:

> Polished realistic city-builder, optimized for a browser-scale map.

The rendering should pursue believable materials, varied architecture, natural terrain,
and cinematic depth while remaining clear from the city-builder camera. It should use
procedural geometry and material variation rather than heavy downloaded asset packs.

## Visual Goals

The city should feel:

- believable;
- detailed;
- alive;
- legible at city scale;
- grounded in natural light and material response.

It should not feel:

- flat or toy-like;
- repetitive;
- visually noisy at gameplay distance;
- dependent on unique heavyweight assets;
- so dark that placement and zoning become hard to read.

## Camera

Recommended camera:

- isometric or angled top-down;
- limited pitch;
- smooth zoom;
- optional rotation;
- strong visibility of grid and buildings.

## Building Style

Buildings should use modular procedural geometry with believable proportions,
category-specific silhouettes, façade depth, and physically plausible materials. Repeated
models must receive deterministic variation in height, roofline, color, window layout, and
small props so a dense district does not read as a repeated block pattern.

Residential:

- houses and apartments with roofs, façades, windows, doors, yards, and vegetation;
- warm but grounded materials such as painted stucco, brick, timber, and dark roofing;
- a clear progression from low-rise homes to multi-storey apartments.

Commercial:

- articulated storefronts, awnings, signs, and larger glazed areas;
- varied rooflines and heights;
- restrained color accents over stone, glass, metal, and concrete.

Industrial:

- warehouses, loading bays, rooftop vents, tanks, and chimneys;
- weathered grey, brown, and muted metal finishes;
- visible but non-obscuring pollution effects where simulation state requires it.

Services:

- recognizable silhouettes and material language;
- civic detailing such as entrances, towers, landscaping, or utility hardware;
- clear gameplay readability without relying on saturated placeholder colors.

## Environment

Initial environment:

- terrain with low-amplitude height variation, blended grass tones, shoreline rocks, and
  layered vegetation;
- a grid that recedes when not needed for placement;
- roads with asphalt, curbs, lane paint, intersections, and street furniture;
- atmospheric sky, fog, and sun direction that give the city depth;
- water with wave motion, color depth, and shore foam.

Environmental variety:

- terrain variation;
- water;
- forests;
- resource deposits;
- landmarks.

## Visual Feedback

Important visual states:

- valid placement;
- invalid placement;
- selected tile;
- hover tile;
- building under construction;
- abandoned building;
- no power/water warning;
- service coverage;
- pollution.

## Animation

Use restrained animations:

- building construction progress;
- subtle water, foliage, light, and vehicle movement;
- emissive night windows and street lights when a time-of-day presentation is added.

Avoid excessive animation that hurts readability.

## Asset Pipeline

Use procedural geometry, shared PBR-style materials, instancing, and generated detail maps
for repeated elements. Entrances, window bays, storefronts, loading doors, and roofs are
separate modular geometry, never repeated facade images wrapped over an entire building volume.
Heavy external assets are out of scope; visual quality must come from modular building kits,
material response, lighting, and composition without blocking gameplay development.
