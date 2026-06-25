# Generated city assets

This directory contains the checked-in city asset library: GLB assets under `buildings`,
`roads`, `props`, `vehicles`, and `nature`, plus `manifest.json`.

Every GLB has a root pivot centred on X/Z at ground level (`Y = 0`). The existing render grid
uses one world unit per tile, so the asset library is authored at tile scale and can be placed
or scaled by the future asset registry without changing simulation state.
