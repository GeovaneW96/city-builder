"""Generate the reusable, tile-scale city asset kit used by the Three.js renderer.

Run from the repository root:

    blender --background --python tools/generate_city_assets.py

The generator deliberately produces a small number of composed, reusable GLBs rather than
one-off scene geometry. Every asset is centred on X/Z and rests on Y=0, so a renderer can
place its root directly at a building or road location. Geometry data is cached while this
script runs; repeated windows, roof units, wheels, and street furniture therefore share mesh
data in the exported GLBs and stay suitable for later instancing.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable

import bpy


REPOSITORY_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_ROOT = REPOSITORY_ROOT / "public" / "assets" / "generated"
CATEGORIES = (
    "buildings/residential",
    "buildings/commercial",
    "buildings/industrial",
    "buildings/civic",
    "roads",
    "props",
    "vehicles",
    "nature",
)

Color = tuple[float, float, float, float]
Vector3 = tuple[float, float, float]
MeshCache = dict[tuple[object, ...], bpy.types.Mesh]


@dataclass(frozen=True)
class BuildingSpec:
    asset_id: str
    width: float
    depth: float
    height: float
    floors: int
    facade: str
    roof: str
    detail: str


RESIDENTIAL_BUILDINGS = (
    BuildingSpec("residential_rowhouse_brick", 0.86, 0.82, 0.72, 1, "facade_brick", "gable", "chimney"),
    BuildingSpec("residential_rowhouse_stucco", 0.92, 0.86, 0.82, 1, "facade_stucco", "gable", "solar"),
    BuildingSpec("residential_cottage_corner", 1.08, 0.95, 0.96, 1, "facade_stucco", "hip", "chimney"),
    BuildingSpec("residential_duplex", 1.16, 0.94, 0.98, 1, "facade_brick", "gable", "dormer"),
    BuildingSpec("residential_townhouse", 1.04, 0.9, 1.34, 2, "facade_dark", "flat", "solar"),
    BuildingSpec("residential_walkup_3", 1.18, 1.0, 1.95, 3, "facade_concrete", "flat", "hvac"),
    BuildingSpec("residential_walkup_5", 1.24, 1.03, 3.08, 5, "facade_brick", "flat", "water_tank"),
    BuildingSpec("residential_apartment_balcony", 1.3, 1.08, 3.68, 6, "facade_concrete", "flat", "hvac"),
    BuildingSpec("residential_courtyard", 1.48, 1.26, 2.52, 4, "facade_stucco", "flat", "garden"),
    BuildingSpec("residential_tower_slim", 1.0, 0.92, 5.25, 9, "facade_dark", "flat", "antenna"),
)

COMMERCIAL_BUILDINGS = (
    BuildingSpec("commercial_corner_shop", 1.0, 0.9, 0.86, 1, "facade_brick", "flat", "sign"),
    BuildingSpec("commercial_market", 1.36, 0.98, 1.02, 1, "facade_concrete", "flat", "hvac"),
    BuildingSpec("commercial_cafe", 0.96, 0.88, 0.78, 1, "facade_stucco", "flat", "awning"),
    BuildingSpec("commercial_office_lowrise", 1.38, 1.02, 2.18, 3, "facade_dark", "flat", "hvac"),
    BuildingSpec("commercial_office_midrise", 1.28, 1.1, 3.48, 6, "facade_concrete", "flat", "solar"),
    BuildingSpec("commercial_glass_tower", 1.02, 1.0, 5.6, 10, "facade_glass", "flat", "antenna"),
    BuildingSpec("commercial_stepped_tower", 1.22, 1.07, 4.42, 8, "facade_dark", "stepped", "hvac"),
    BuildingSpec("commercial_hotel", 1.27, 1.08, 3.92, 7, "facade_concrete", "flat", "sign"),
    BuildingSpec("commercial_mall", 1.58, 1.22, 1.48, 2, "facade_concrete", "flat", "skylight"),
    BuildingSpec("commercial_office_slab", 1.46, 0.96, 3.0, 5, "facade_glass", "flat", "hvac"),
)

INDUSTRIAL_BUILDINGS = (
    BuildingSpec("industrial_small_warehouse", 1.42, 1.04, 1.15, 1, "industrial_wall", "flat", "vents"),
    BuildingSpec("industrial_long_warehouse", 1.8, 1.12, 1.38, 1, "industrial_wall", "flat", "hvac"),
    BuildingSpec("industrial_sawtooth_factory", 1.58, 1.35, 1.72, 2, "facade_concrete", "sawtooth", "chimney"),
    BuildingSpec("industrial_logistics_depot", 1.72, 1.2, 1.3, 1, "facade_dark", "flat", "loading"),
    BuildingSpec("industrial_processing_plant", 1.48, 1.28, 2.24, 3, "industrial_wall", "flat", "tanks"),
)

CIVIC_BUILDINGS = (
    BuildingSpec("civic_clinic", 1.3, 1.04, 1.52, 2, "facade_concrete", "flat", "medical"),
    BuildingSpec("civic_fire_station", 1.52, 1.05, 1.28, 1, "facade_brick", "flat", "garage"),
    BuildingSpec("civic_school", 1.74, 1.18, 1.54, 2, "facade_stucco", "flat", "clock"),
    BuildingSpec("civic_library", 1.24, 1.04, 1.86, 3, "facade_concrete", "flat", "skylight"),
    BuildingSpec("civic_city_hall", 1.34, 1.12, 2.92, 5, "facade_stucco", "stepped", "tower"),
)


MATERIAL_SPECS: dict[str, tuple[Color, float, float, Color | None, float]] = {
    "facade_dark": ((0.07, 0.1, 0.13, 1.0), 0.26, 0.5, None, 0.0),
    "facade_concrete": ((0.38, 0.42, 0.42, 1.0), 0.03, 0.82, None, 0.0),
    "facade_brick": ((0.3, 0.12, 0.08, 1.0), 0.02, 0.88, None, 0.0),
    "facade_stucco": ((0.58, 0.51, 0.42, 1.0), 0.01, 0.78, None, 0.0),
    "facade_glass": ((0.06, 0.16, 0.21, 1.0), 0.48, 0.2, (0.03, 0.1, 0.16, 1.0), 0.12),
    "industrial_wall": ((0.2, 0.25, 0.27, 1.0), 0.3, 0.72, None, 0.0),
    "foundation_concrete": ((0.16, 0.18, 0.18, 1.0), 0.01, 0.9, None, 0.0),
    "facade_panel": ((0.12, 0.17, 0.19, 1.0), 0.3, 0.58, None, 0.0),
    "window_emissive_warm": ((0.97, 0.48, 0.16, 1.0), 0.0, 0.32, (1.0, 0.22, 0.04, 1.0), 2.3),
    "window_emissive_cool": ((0.22, 0.55, 0.76, 1.0), 0.18, 0.24, (0.06, 0.3, 0.68, 1.0), 1.35),
    "roof_metal": ((0.08, 0.11, 0.12, 1.0), 0.7, 0.4, None, 0.0),
    "roof_membrane": ((0.14, 0.15, 0.15, 1.0), 0.0, 0.94, None, 0.0),
    "roof_tile": ((0.16, 0.06, 0.04, 1.0), 0.01, 0.86, None, 0.0),
    "metal_light": ((0.38, 0.44, 0.46, 1.0), 0.72, 0.32, None, 0.0),
    "asphalt": ((0.045, 0.055, 0.06, 1.0), 0.0, 0.94, None, 0.0),
    "sidewalk_concrete": ((0.38, 0.4, 0.4, 1.0), 0.0, 0.9, None, 0.0),
    "curb_concrete": ((0.5, 0.52, 0.51, 1.0), 0.0, 0.86, None, 0.0),
    "lane_marking": ((0.94, 0.85, 0.56, 1.0), 0.0, 0.6, None, 0.0),
    "crosswalk_paint": ((0.82, 0.84, 0.81, 1.0), 0.0, 0.7, None, 0.0),
    "lamp_emissive": ((1.0, 0.6, 0.25, 1.0), 0.0, 0.24, (1.0, 0.22, 0.03, 1.0), 4.0),
    "signal_red": ((1.0, 0.05, 0.02, 1.0), 0.0, 0.22, (1.0, 0.0, 0.0, 1.0), 3.0),
    "signal_yellow": ((1.0, 0.45, 0.02, 1.0), 0.0, 0.22, (1.0, 0.18, 0.0, 1.0), 2.2),
    "signal_green": ((0.05, 0.8, 0.18, 1.0), 0.0, 0.22, (0.0, 0.55, 0.08, 1.0), 2.2),
    "vehicle_paint": ((0.12, 0.24, 0.38, 1.0), 0.5, 0.3, None, 0.0),
    "vehicle_glass": ((0.03, 0.1, 0.16, 1.0), 0.5, 0.18, None, 0.0),
    "rubber": ((0.012, 0.014, 0.016, 1.0), 0.0, 0.92, None, 0.0),
    "headlight_emissive": ((1.0, 0.82, 0.46, 1.0), 0.0, 0.2, (1.0, 0.52, 0.12, 1.0), 4.0),
    "taillight_emissive": ((0.95, 0.03, 0.01, 1.0), 0.0, 0.2, (1.0, 0.0, 0.0, 1.0), 3.5),
    "foliage": ((0.06, 0.22, 0.08, 1.0), 0.0, 0.93, None, 0.0),
    "foliage_light": ((0.14, 0.34, 0.11, 1.0), 0.0, 0.9, None, 0.0),
    "trunk": ((0.16, 0.07, 0.025, 1.0), 0.0, 0.96, None, 0.0),
    "rock": ((0.25, 0.28, 0.29, 1.0), 0.0, 0.92, None, 0.0),
    "sign_blue": ((0.02, 0.12, 0.4, 1.0), 0.08, 0.42, None, 0.0),
}


def rounded(value: float) -> float:
    return round(value, 4)


def clear_scene() -> None:
    """Remove only objects; cached mesh data stays reusable across asset exports."""
    for obj in list(bpy.context.scene.objects):
        bpy.data.objects.remove(obj, do_unlink=True)


def configure_scene() -> None:
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.length_unit = "METERS"
    select_eevee_render_engine(scene)
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512


def select_eevee_render_engine(scene: bpy.types.Scene) -> None:
    """Blender 5.1 renamed the Eevee engine enum back to ``BLENDER_EEVEE``."""
    for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            scene.render.engine = engine
            return
        except TypeError:
            continue


def make_materials() -> dict[str, bpy.types.Material]:
    materials: dict[str, bpy.types.Material] = {}
    for name, (color, metallic, roughness, emission, emission_strength) in MATERIAL_SPECS.items():
        material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
        material.use_nodes = True
        principled = material.node_tree.nodes.get("Principled BSDF")
        if principled is None:
            raise RuntimeError(f"Material {name} is missing its Principled BSDF node")
        principled.inputs["Base Color"].default_value = color
        principled.inputs["Metallic"].default_value = metallic
        principled.inputs["Roughness"].default_value = roughness
        set_principled_emission(principled, emission, emission_strength)
        materials[name] = material
    return materials


def set_principled_emission(
    principled: bpy.types.Node,
    emission: Color | None,
    emission_strength: float,
) -> None:
    color_input = principled.inputs.get("Emission Color") or principled.inputs.get("Emission")
    strength_input = principled.inputs.get("Emission Strength")
    if color_input is not None:
        color_input.default_value = emission or (0.0, 0.0, 0.0, 1.0)
    if strength_input is not None:
        strength_input.default_value = emission_strength


def create_root(asset_id: str, category: str) -> bpy.types.Object:
    root = bpy.data.objects.new(asset_id, None)
    root.empty_display_type = "PLAIN_AXES"
    # Building helpers use the Three.js convention (X right, Y up, Z depth). Blender is
    # Z-up, so rotate the complete authored kit once at the root before glTF export.
    root.rotation_euler.x = math.radians(90)
    root["asset_id"] = asset_id
    root["asset_category"] = category
    bpy.context.collection.objects.link(root)
    return root


def add_box(
    root: bpy.types.Object,
    cache: MeshCache,
    materials: dict[str, bpy.types.Material],
    name: str,
    dimensions: Vector3,
    location: Vector3,
    material_name: str,
    bevel: float = 0.0,
    rotation: Vector3 = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    key = ("box", *(rounded(value) for value in dimensions), rounded(bevel), material_name)
    mesh = cache.get(key)
    if mesh is None:
        mesh = create_box_mesh(dimensions, materials[material_name], bevel)
        cache[key] = mesh
    return add_mesh_object(root, mesh, name, location, rotation)


def create_box_mesh(
    dimensions: Vector3,
    material: bpy.types.Material,
    bevel: float,
) -> bpy.types.Mesh:
    bpy.ops.mesh.primitive_cube_add(size=1)
    source = bpy.context.active_object
    source.dimensions = dimensions
    apply_object_scale(source)
    if bevel > 0:
        modifier = source.modifiers.new("edge_bevel", "BEVEL")
        modifier.width = min(bevel, min(dimensions) * 0.42)
        modifier.segments = 2
        modifier.limit_method = "ANGLE"
        bpy.context.view_layer.objects.active = source
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    source.data.materials.append(material)
    mesh = source.data
    bpy.data.objects.remove(source, do_unlink=True)
    return mesh


def add_cylinder(
    root: bpy.types.Object,
    cache: MeshCache,
    materials: dict[str, bpy.types.Material],
    name: str,
    radius: float,
    height: float,
    location: Vector3,
    material_name: str,
    vertices: int = 10,
    rotation: Vector3 = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    key = ("cylinder", rounded(radius), rounded(height), vertices, material_name)
    mesh = cache.get(key)
    if mesh is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=height)
        source = bpy.context.active_object
        source.data.materials.append(materials[material_name])
        shade_smooth(source)
        mesh = source.data
        bpy.data.objects.remove(source, do_unlink=True)
        cache[key] = mesh
    return add_mesh_object(root, mesh, name, location, rotation)


def add_cone(
    root: bpy.types.Object,
    cache: MeshCache,
    materials: dict[str, bpy.types.Material],
    name: str,
    radius_bottom: float,
    radius_top: float,
    height: float,
    location: Vector3,
    material_name: str,
    vertices: int = 10,
) -> bpy.types.Object:
    key = (
        "cone",
        rounded(radius_bottom),
        rounded(radius_top),
        rounded(height),
        vertices,
        material_name,
    )
    mesh = cache.get(key)
    if mesh is None:
        bpy.ops.mesh.primitive_cone_add(
            vertices=vertices,
            radius1=radius_bottom,
            radius2=radius_top,
            depth=height,
        )
        source = bpy.context.active_object
        source.data.materials.append(materials[material_name])
        shade_smooth(source)
        mesh = source.data
        bpy.data.objects.remove(source, do_unlink=True)
        cache[key] = mesh
    return add_mesh_object(root, mesh, name, location)


def add_uv_sphere(
    root: bpy.types.Object,
    cache: MeshCache,
    materials: dict[str, bpy.types.Material],
    name: str,
    radius: float,
    location: Vector3,
    material_name: str,
    scale: Vector3 = (1.0, 1.0, 1.0),
) -> bpy.types.Object:
    key = ("sphere", rounded(radius), material_name)
    mesh = cache.get(key)
    if mesh is None:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=radius)
        source = bpy.context.active_object
        source.data.materials.append(materials[material_name])
        shade_smooth(source)
        mesh = source.data
        bpy.data.objects.remove(source, do_unlink=True)
        cache[key] = mesh
    obj = add_mesh_object(root, mesh, name, location)
    obj.scale = scale
    return obj


def add_mesh_object(
    root: bpy.types.Object,
    mesh: bpy.types.Mesh,
    name: str,
    location: Vector3,
    rotation: Vector3 = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    obj.rotation_euler = rotation
    obj.parent = root
    bpy.context.collection.objects.link(obj)
    return obj


def apply_object_scale(obj: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)


def shade_smooth(obj: bpy.types.Object) -> None:
    for polygon in obj.data.polygons:
        polygon.use_smooth = True


def add_building_base(
    root: bpy.types.Object,
    cache: MeshCache,
    materials: dict[str, bpy.types.Material],
    spec: BuildingSpec,
) -> None:
    add_box(
        root,
        cache,
        materials,
        "foundation",
        (spec.width + 0.08, 0.1, spec.depth + 0.08),
        (0.0, 0.05, 0.0),
        "foundation_concrete",
        0.018,
    )
    add_box(
        root,
        cache,
        materials,
        "main_massing",
        (spec.width, spec.height, spec.depth),
        (0.0, 0.1 + spec.height / 2, 0.0),
        spec.facade,
        0.035,
    )
    add_box(
        root,
        cache,
        materials,
        "roof_slab",
        (spec.width + 0.035, 0.08, spec.depth + 0.035),
        (0.0, 0.14 + spec.height, 0.0),
        "roof_membrane",
        0.012,
    )


def add_window_grid(
    root: bpy.types.Object,
    cache: MeshCache,
    materials: dict[str, bpy.types.Material],
    spec: BuildingSpec,
    window_material: str,
    storefront: bool = False,
) -> None:
    columns = max(2, min(5, round(spec.width / 0.22)))
    side_columns = max(2, min(4, round(spec.depth / 0.25)))
    window_height = min(0.19, max(0.1, spec.height / max(2, spec.floors * 2.4)))
    window_width = min(0.16, spec.width * 0.65 / columns)
    side_width = min(0.16, spec.depth * 0.62 / side_columns)
    levels = 1 if storefront else spec.floors
    for floor in range(levels):
        y = 0.16 + (floor + 0.56) * (spec.height - 0.22) / levels
        if storefront:
            y = 0.16 + window_height / 2
            window_height = min(0.38, spec.height * 0.44)
        for column in range(columns):
            x = -spec.width * 0.32 + (column + 0.5) * spec.width * 0.64 / columns
            add_box(
                root,
                cache,
                materials,
                "front_window",
                (window_width, window_height, 0.022),
                (x, y, spec.depth / 2 + 0.014),
                window_material,
                0.004,
            )
            add_box(
                root,
                cache,
                materials,
                "rear_window",
                (window_width, window_height, 0.022),
                (x, y, -spec.depth / 2 - 0.014),
                window_material,
                0.004,
            )
        for column in range(side_columns):
            z = -spec.depth * 0.29 + (column + 0.5) * spec.depth * 0.58 / side_columns
            add_box(
                root,
                cache,
                materials,
                "side_window",
                (0.022, window_height, side_width),
                (spec.width / 2 + 0.014, y, z),
                window_material,
                0.004,
            )


def add_facade_bands(
    root: bpy.types.Object,
    cache: MeshCache,
    materials: dict[str, bpy.types.Material],
    spec: BuildingSpec,
) -> None:
    for floor in range(1, spec.floors + 1):
        y = 0.12 + floor * (spec.height - 0.16) / (spec.floors + 0.15)
        add_box(
            root,
            cache,
            materials,
            "facade_band_front",
            (spec.width * 0.9, 0.026, 0.028),
            (0.0, y, spec.depth / 2 + 0.02),
            "facade_panel",
        )
        add_box(
            root,
            cache,
            materials,
            "facade_band_side",
            (0.028, 0.026, spec.depth * 0.9),
            (spec.width / 2 + 0.02, y, 0.0),
            "facade_panel",
        )


def add_front_door(
    root: bpy.types.Object,
    cache: MeshCache,
    materials: dict[str, bpy.types.Material],
    spec: BuildingSpec,
    width: float = 0.14,
    height: float = 0.28,
) -> None:
    add_box(
        root,
        cache,
        materials,
        "entry_door",
        (width, height, 0.028),
        (0.0, 0.1 + height / 2, spec.depth / 2 + 0.022),
        "facade_dark",
        0.004,
    )
    add_box(
        root,
        cache,
        materials,
        "entry_canopy",
        (width * 1.8, 0.035, 0.11),
        (0.0, 0.1 + height + 0.025, spec.depth / 2 + 0.06),
        "roof_metal",
        0.008,
    )


def add_roof_detail(
    root: bpy.types.Object,
    cache: MeshCache,
    materials: dict[str, bpy.types.Material],
    spec: BuildingSpec,
) -> None:
    roof_y = 0.19 + spec.height
    if spec.detail == "antenna":
        add_cylinder(root, cache, materials, "antenna_mast", 0.012, 0.58, (0.0, roof_y + 0.29, 0.0), "metal_light", 8)
        add_box(root, cache, materials, "antenna_base", (0.14, 0.07, 0.14), (0.0, roof_y + 0.035, 0.0), "roof_metal", 0.01)
    elif spec.detail == "water_tank":
        add_cylinder(root, cache, materials, "water_tank", 0.12, 0.28, (0.0, roof_y + 0.14, 0.0), "metal_light", 12)
        add_cone(root, cache, materials, "water_tank_cap", 0.12, 0.03, 0.09, (0.0, roof_y + 0.325, 0.0), "roof_metal", 12)
    elif spec.detail in {"solar", "skylight"}:
        material = "facade_glass" if spec.detail == "skylight" else "facade_dark"
        for x in (-0.18, 0.18):
            add_box(
                root,
                cache,
                materials,
                "roof_panel",
                (0.22, 0.025, 0.32),
                (x, roof_y + 0.045, 0.0),
                material,
                0.004,
                (math.radians(8), 0.0, 0.0),
            )
    elif spec.detail in {"chimney", "vents"}:
        count = 2 if spec.detail == "vents" else 1
        for index in range(count):
            x = (index - (count - 1) / 2) * 0.16
            add_cylinder(root, cache, materials, "roof_vent", 0.045, 0.28, (x, roof_y + 0.14, 0.0), "roof_metal", 10)
            add_cone(root, cache, materials, "roof_vent_cap", 0.07, 0.042, 0.07, (x, roof_y + 0.315, 0.0), "roof_metal", 10)
    elif spec.detail == "tanks":
        for x in (-0.22, 0.22):
            add_cylinder(root, cache, materials, "process_tank", 0.11, 0.34, (x, roof_y + 0.17, 0.0), "metal_light", 12)
    else:
        add_hvac_units(root, cache, materials, spec, roof_y)


def add_hvac_units(
    root: bpy.types.Object,
    cache: MeshCache,
    materials: dict[str, bpy.types.Material],
    spec: BuildingSpec,
    roof_y: float,
) -> None:
    count = 2 if spec.width > 1.3 else 1
    for index in range(count):
        x = (index - (count - 1) / 2) * 0.28
        add_box(root, cache, materials, "hvac_unit", (0.22, 0.14, 0.18), (x, roof_y + 0.07, 0.0), "metal_light", 0.012)
        add_box(root, cache, materials, "hvac_grille", (0.15, 0.07, 0.012), (x, roof_y + 0.08, 0.096), "facade_dark", 0.002)


def add_gable_roof(
    root: bpy.types.Object,
    cache: MeshCache,
    materials: dict[str, bpy.types.Material],
    spec: BuildingSpec,
    hip: bool = False,
) -> None:
    roof_y = 0.17 + spec.height
    slope = math.radians(25 if hip else 29)
    for side in (-1, 1):
        add_box(
            root,
            cache,
            materials,
            "sloped_roof",
            (spec.width * 0.56, 0.075, spec.depth + 0.1),
            (side * spec.width * 0.25, roof_y + 0.1, 0.0),
            "roof_tile",
            0.012,
            (0.0, 0.0, -side * slope),
        )
    if hip:
        add_box(root, cache, materials, "roof_ridge", (0.05, 0.06, spec.depth * 0.74), (0.0, roof_y + 0.2, 0.0), "roof_tile", 0.008)


def make_residential(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material], spec: BuildingSpec) -> None:
    add_building_base(root, cache, materials, spec)
    add_window_grid(root, cache, materials, spec, "window_emissive_warm")
    add_facade_bands(root, cache, materials, spec)
    add_front_door(root, cache, materials, spec)
    if spec.floors >= 3:
        add_residential_balconies(root, cache, materials, spec)
    if spec.roof in {"gable", "hip"}:
        add_gable_roof(root, cache, materials, spec, spec.roof == "hip")
    add_roof_detail(root, cache, materials, spec)


def add_residential_balconies(
    root: bpy.types.Object,
    cache: MeshCache,
    materials: dict[str, bpy.types.Material],
    spec: BuildingSpec,
) -> None:
    for floor in range(1, spec.floors, 2):
        y = 0.13 + floor * spec.height / spec.floors
        add_box(root, cache, materials, "balcony_slab", (spec.width * 0.54, 0.026, 0.12), (0.0, y, spec.depth / 2 + 0.045), "roof_metal", 0.006)
        add_box(root, cache, materials, "balcony_rail", (spec.width * 0.54, 0.09, 0.014), (0.0, y + 0.055, spec.depth / 2 + 0.1), "metal_light", 0.003)


def make_commercial(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material], spec: BuildingSpec) -> None:
    add_building_base(root, cache, materials, spec)
    add_window_grid(root, cache, materials, spec, "window_emissive_cool")
    add_facade_bands(root, cache, materials, spec)
    add_storefront(root, cache, materials, spec)
    if spec.roof == "stepped":
        add_box(root, cache, materials, "tower_setback", (spec.width * 0.72, spec.height * 0.18, spec.depth * 0.72), (0.0, 0.2 + spec.height * 1.09, 0.0), spec.facade, 0.03)
    add_roof_detail(root, cache, materials, spec)


def add_storefront(
    root: bpy.types.Object,
    cache: MeshCache,
    materials: dict[str, bpy.types.Material],
    spec: BuildingSpec,
) -> None:
    add_box(root, cache, materials, "storefront_glazing", (spec.width * 0.74, min(0.42, spec.height * 0.42), 0.026), (0.0, 0.1 + min(0.42, spec.height * 0.42) / 2, spec.depth / 2 + 0.025), "window_emissive_warm", 0.004)
    add_box(root, cache, materials, "storefront_awning", (spec.width * 0.82, 0.055, 0.15), (0.0, min(spec.height * 0.5, 0.6), spec.depth / 2 + 0.08), "facade_panel", 0.008)
    add_box(root, cache, materials, "shop_sign", (spec.width * 0.45, 0.1, 0.026), (0.0, min(spec.height * 0.75, 0.85), spec.depth / 2 + 0.035), "sign_blue", 0.005)


def make_industrial(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material], spec: BuildingSpec) -> None:
    add_building_base(root, cache, materials, spec)
    add_industrial_cladding(root, cache, materials, spec)
    add_loading_bays(root, cache, materials, spec)
    if spec.roof == "sawtooth":
        add_sawtooth_roof(root, cache, materials, spec)
    add_roof_detail(root, cache, materials, spec)


def add_industrial_cladding(
    root: bpy.types.Object,
    cache: MeshCache,
    materials: dict[str, bpy.types.Material],
    spec: BuildingSpec,
) -> None:
    for index in range(4):
        x = -spec.width * 0.3 + index * spec.width * 0.2
        add_box(root, cache, materials, "cladding_rib", (0.025, spec.height * 0.78, 0.028), (x, spec.height * 0.48, spec.depth / 2 + 0.02), "metal_light", 0.002)
    add_box(root, cache, materials, "industrial_window_strip", (spec.width * 0.7, 0.16, 0.026), (0.0, spec.height * 0.68, spec.depth / 2 + 0.025), "window_emissive_cool", 0.004)


def add_loading_bays(
    root: bpy.types.Object,
    cache: MeshCache,
    materials: dict[str, bpy.types.Material],
    spec: BuildingSpec,
) -> None:
    count = 3 if spec.width > 1.55 else 2
    for index in range(count):
        x = -spec.width * 0.24 + index * spec.width * 0.24
        add_box(root, cache, materials, "loading_door", (0.18, spec.height * 0.42, 0.028), (x, 0.1 + spec.height * 0.21, -spec.depth / 2 - 0.02), "facade_dark", 0.004)
        add_box(root, cache, materials, "loading_canopy", (0.25, 0.035, 0.12), (x, spec.height * 0.45, -spec.depth / 2 - 0.06), "roof_metal", 0.006)


def add_sawtooth_roof(
    root: bpy.types.Object,
    cache: MeshCache,
    materials: dict[str, bpy.types.Material],
    spec: BuildingSpec,
) -> None:
    for index in range(3):
        x = -spec.width * 0.26 + index * spec.width * 0.26
        add_box(root, cache, materials, "sawtooth_roof", (spec.width * 0.27, 0.07, spec.depth + 0.04), (x, spec.height + 0.22, 0.0), "roof_metal", 0.01, (0.0, 0.0, math.radians(-17)))


def make_civic(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material], spec: BuildingSpec) -> None:
    add_building_base(root, cache, materials, spec)
    add_window_grid(root, cache, materials, spec, "window_emissive_warm")
    add_civic_entry(root, cache, materials, spec)
    add_civic_columns(root, cache, materials, spec)
    if spec.detail == "tower":
        add_box(root, cache, materials, "civic_tower", (spec.width * 0.26, spec.height * 0.65, spec.depth * 0.26), (0.0, spec.height + spec.height * 0.3, 0.0), "facade_concrete", 0.025)
    if spec.detail == "garage":
        add_box(root, cache, materials, "fire_station_door", (spec.width * 0.45, spec.height * 0.42, 0.03), (0.0, spec.height * 0.26, spec.depth / 2 + 0.025), "facade_dark", 0.004)
    add_roof_detail(root, cache, materials, spec)


def add_civic_entry(
    root: bpy.types.Object,
    cache: MeshCache,
    materials: dict[str, bpy.types.Material],
    spec: BuildingSpec,
) -> None:
    add_box(root, cache, materials, "civic_steps", (spec.width * 0.46, 0.08, 0.18), (0.0, 0.04, spec.depth / 2 + 0.08), "sidewalk_concrete", 0.008)
    add_box(root, cache, materials, "civic_entrance", (spec.width * 0.22, 0.38, 0.03), (0.0, 0.29, spec.depth / 2 + 0.024), "facade_glass", 0.004)
    add_box(root, cache, materials, "civic_canopy", (spec.width * 0.6, 0.06, 0.18), (0.0, 0.67, spec.depth / 2 + 0.1), "roof_metal", 0.008)


def add_civic_columns(
    root: bpy.types.Object,
    cache: MeshCache,
    materials: dict[str, bpy.types.Material],
    spec: BuildingSpec,
) -> None:
    for x in (-spec.width * 0.28, spec.width * 0.28):
        add_cylinder(root, cache, materials, "civic_column", 0.04, min(0.55, spec.height * 0.52), (x, min(0.55, spec.height * 0.52) / 2 + 0.1, spec.depth / 2 + 0.07), "sidewalk_concrete", 10)


def generate_buildings(
    directory: Path,
    category: str,
    specs: Iterable[BuildingSpec],
    builder: Callable[[bpy.types.Object, MeshCache, dict[str, bpy.types.Material], BuildingSpec], None],
    cache: MeshCache,
    materials: dict[str, bpy.types.Material],
    manifest: list[dict[str, object]],
) -> None:
    for spec in specs:
        clear_scene()
        root = create_root(spec.asset_id, category)
        builder(root, cache, materials, spec)
        export_asset(root, directory / f"{spec.asset_id}.glb")
        manifest.append({"id": spec.asset_id, "category": category, "path": relative_output_path(directory / f"{spec.asset_id}.glb"), "footprint": [spec.width, spec.depth], "height": spec.height})


def generate_roads(cache: MeshCache, materials: dict[str, bpy.types.Material], manifest: list[dict[str, object]]) -> None:
    generators: tuple[tuple[str, Callable[[bpy.types.Object, MeshCache, dict[str, bpy.types.Material]], None]], ...] = (
        ("road_2_lane_straight", make_two_lane_road),
        ("road_4_lane_straight", make_four_lane_road),
        ("road_4_way_intersection", make_four_way_intersection),
        ("road_t_intersection", make_t_intersection),
        ("road_with_sidewalks", make_sidewalk_road),
    )
    for asset_id, builder in generators:
        clear_scene()
        root = create_root(asset_id, "roads")
        builder(root, cache, materials)
        output = OUTPUT_ROOT / "roads" / f"{asset_id}.glb"
        export_asset(root, output)
        manifest.append({"id": asset_id, "category": "roads", "path": relative_output_path(output)})


def add_road_base(
    root: bpy.types.Object,
    cache: MeshCache,
    materials: dict[str, bpy.types.Material],
    width: float,
    length: float = 1.0,
    sidewalks: bool = True,
) -> None:
    add_box(root, cache, materials, "asphalt_surface", (width, 0.06, length), (0.0, 0.03, 0.0), "asphalt", 0.006)
    if not sidewalks:
        return
    for side in (-1, 1):
        x = side * (width / 2 + 0.075)
        add_box(root, cache, materials, "sidewalk", (0.15, 0.075, length), (x, 0.0375, 0.0), "sidewalk_concrete", 0.006)
        add_box(root, cache, materials, "curb", (0.035, 0.09, length), (side * (width / 2 + 0.004), 0.045, 0.0), "curb_concrete", 0.004)


def add_lane_dashes(
    root: bpy.types.Object,
    cache: MeshCache,
    materials: dict[str, bpy.types.Material],
    lane_x: Iterable[float],
) -> None:
    for x in lane_x:
        for z in (-0.28, 0.0, 0.28):
            add_box(root, cache, materials, "lane_dash", (0.035, 0.012, 0.13), (x, 0.067, z), "lane_marking", 0.002)


def make_two_lane_road(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material]) -> None:
    add_road_base(root, cache, materials, 0.7)
    add_lane_dashes(root, cache, materials, (0.0,))
    for x in (-0.3, 0.3):
        add_box(root, cache, materials, "edge_line", (0.018, 0.012, 0.92), (x, 0.067, 0.0), "lane_marking", 0.001)


def make_four_lane_road(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material]) -> None:
    add_road_base(root, cache, materials, 0.92)
    add_lane_dashes(root, cache, materials, (-0.22, 0.22))
    for z in (-0.28, 0.0, 0.28):
        add_box(root, cache, materials, "center_double_line", (0.055, 0.012, 0.13), (0.0, 0.068, z), "lane_marking", 0.001)


def make_four_way_intersection(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material]) -> None:
    add_box(root, cache, materials, "intersection_asphalt", (1.0, 0.06, 1.0), (0.0, 0.03, 0.0), "asphalt", 0.008)
    add_intersection_sidewalks(root, cache, materials, t_shape=False)
    for direction in (-1, 1):
        add_crosswalk(root, cache, materials, (0.0, direction * 0.31), horizontal=True)
        add_crosswalk(root, cache, materials, (direction * 0.31, 0.0), horizontal=False)


def make_t_intersection(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material]) -> None:
    add_box(root, cache, materials, "t_asphalt", (1.0, 0.06, 1.0), (0.0, 0.03, 0.0), "asphalt", 0.008)
    add_intersection_sidewalks(root, cache, materials, t_shape=True)
    add_crosswalk(root, cache, materials, (0.0, -0.31), horizontal=True)
    for direction in (-1, 1):
        add_crosswalk(root, cache, materials, (direction * 0.31, 0.0), horizontal=False)


def make_sidewalk_road(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material]) -> None:
    add_road_base(root, cache, materials, 0.58)
    add_lane_dashes(root, cache, materials, (0.0,))
    for z in (-0.3, 0.0, 0.3):
        add_box(root, cache, materials, "tactile_paving", (0.06, 0.014, 0.08), (-0.38, 0.085, z), "lane_marking", 0.002)


def add_intersection_sidewalks(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material], t_shape: bool) -> None:
    corners = [(-0.46, -0.46), (-0.46, 0.46), (0.46, -0.46), (0.46, 0.46)]
    if t_shape:
        corners = [corner for corner in corners if corner[1] < 0.4]
    for x, z in corners:
        add_box(root, cache, materials, "intersection_sidewalk", (0.16, 0.075, 0.16), (x, 0.0375, z), "sidewalk_concrete", 0.006)
        add_box(root, cache, materials, "corner_curb", (0.12, 0.09, 0.035), (x, 0.045, z - math.copysign(0.075, z)), "curb_concrete", 0.003)


def add_crosswalk(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material], center: tuple[float, float], horizontal: bool) -> None:
    for index in range(5):
        offset = -0.15 + index * 0.075
        dimensions = (0.05, 0.012, 0.17) if horizontal else (0.17, 0.012, 0.05)
        x = center[0] + (offset if horizontal else 0.0)
        z = center[1] + (0.0 if horizontal else offset)
        add_box(root, cache, materials, "crosswalk_stripe", dimensions, (x, 0.067, z), "crosswalk_paint", 0.001)


def generate_props(cache: MeshCache, materials: dict[str, bpy.types.Material], manifest: list[dict[str, object]]) -> None:
    generators: tuple[tuple[str, Callable[[bpy.types.Object, MeshCache, dict[str, bpy.types.Material]], None]], ...] = (
        ("streetlight", make_streetlight),
        ("traffic_light", make_traffic_light),
        ("bench", make_bench),
        ("trash_bin", make_trash_bin),
        ("bus_stop", make_bus_stop),
        ("billboard", make_billboard),
        ("road_sign", make_road_sign),
        ("plaza_planter", make_plaza_planter),
        ("rooftop_hvac", make_rooftop_hvac),
    )
    generate_simple_assets("props", generators, cache, materials, manifest)


def make_streetlight(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material]) -> None:
    add_cylinder(root, cache, materials, "streetlight_pole", 0.022, 0.78, (0.0, 0.39, 0.0), "metal_light", 10)
    add_box(root, cache, materials, "streetlight_arm", (0.27, 0.028, 0.028), (0.12, 0.73, 0.0), "metal_light", 0.004)
    add_uv_sphere(root, cache, materials, "streetlight_lamp", 0.055, (0.25, 0.69, 0.0), "lamp_emissive", (1.0, 0.7, 1.0))


def make_traffic_light(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material]) -> None:
    add_cylinder(root, cache, materials, "signal_pole", 0.025, 0.68, (0.0, 0.34, 0.0), "metal_light", 10)
    add_box(root, cache, materials, "signal_arm", (0.25, 0.028, 0.028), (0.12, 0.64, 0.0), "metal_light", 0.004)
    add_box(root, cache, materials, "signal_housing", (0.1, 0.28, 0.08), (0.24, 0.53, 0.0), "facade_dark", 0.01)
    for material, y in (("signal_red", 0.61), ("signal_yellow", 0.53), ("signal_green", 0.45)):
        add_uv_sphere(root, cache, materials, "signal_lens", 0.026, (0.24, y, 0.045), material, (1.0, 1.0, 0.42))


def make_bench(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material]) -> None:
    add_box(root, cache, materials, "bench_seat", (0.52, 0.055, 0.14), (0.0, 0.3, 0.0), "roof_metal", 0.008)
    add_box(root, cache, materials, "bench_back", (0.52, 0.16, 0.045), (0.0, 0.39, -0.055), "roof_metal", 0.008, (math.radians(-10), 0.0, 0.0))
    for x in (-0.18, 0.18):
        add_box(root, cache, materials, "bench_leg", (0.045, 0.28, 0.12), (x, 0.14, 0.0), "metal_light", 0.004)


def make_trash_bin(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material]) -> None:
    add_cylinder(root, cache, materials, "bin_body", 0.1, 0.28, (0.0, 0.14, 0.0), "facade_dark", 10)
    add_cone(root, cache, materials, "bin_lid", 0.105, 0.075, 0.06, (0.0, 0.31, 0.0), "metal_light", 10)


def make_bus_stop(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material]) -> None:
    for x in (-0.28, 0.28):
        add_cylinder(root, cache, materials, "shelter_post", 0.018, 0.48, (x, 0.24, 0.0), "metal_light", 8)
    add_box(root, cache, materials, "shelter_roof", (0.66, 0.045, 0.28), (0.0, 0.5, 0.0), "roof_metal", 0.008)
    add_box(root, cache, materials, "shelter_glass", (0.58, 0.33, 0.018), (0.0, 0.28, -0.12), "facade_glass", 0.002)
    add_box(root, cache, materials, "route_sign", (0.12, 0.17, 0.025), (0.36, 0.56, 0.0), "sign_blue", 0.004)


def make_billboard(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material]) -> None:
    for x in (-0.22, 0.22):
        add_cylinder(root, cache, materials, "billboard_post", 0.025, 0.58, (x, 0.29, 0.0), "metal_light", 10)
    add_box(root, cache, materials, "billboard_panel", (0.62, 0.32, 0.035), (0.0, 0.63, 0.0), "sign_blue", 0.01)
    add_box(root, cache, materials, "billboard_trim", (0.67, 0.035, 0.06), (0.0, 0.81, 0.0), "metal_light", 0.004)


def make_road_sign(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material]) -> None:
    add_cylinder(root, cache, materials, "sign_pole", 0.016, 0.46, (0.0, 0.23, 0.0), "metal_light", 8)
    add_box(root, cache, materials, "sign_face", (0.22, 0.16, 0.024), (0.0, 0.51, 0.0), "sign_blue", 0.006)


def make_plaza_planter(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material]) -> None:
    add_box(root, cache, materials, "planter", (0.52, 0.16, 0.36), (0.0, 0.08, 0.0), "sidewalk_concrete", 0.012)
    for x, z in ((-0.12, -0.05), (0.1, 0.04), (0.0, 0.1)):
        add_uv_sphere(root, cache, materials, "planter_shrub", 0.14, (x, 0.25, z), "foliage", (1.0, 0.78, 1.0))


def make_rooftop_hvac(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material]) -> None:
    add_box(root, cache, materials, "hvac_body", (0.42, 0.23, 0.28), (0.0, 0.115, 0.0), "metal_light", 0.018)
    add_box(root, cache, materials, "hvac_fan", (0.22, 0.02, 0.22), (0.0, 0.24, 0.0), "facade_dark", 0.003)
    add_box(root, cache, materials, "hvac_grille", (0.28, 0.11, 0.014), (0.0, 0.13, 0.147), "facade_dark", 0.002)


def generate_vehicles(cache: MeshCache, materials: dict[str, bpy.types.Material], manifest: list[dict[str, object]]) -> None:
    generators: tuple[tuple[str, Callable[[bpy.types.Object, MeshCache, dict[str, bpy.types.Material]], None]], ...] = (
        ("car_compact", lambda root, mesh_cache, mats: make_vehicle(root, mesh_cache, mats, 0.28, 0.56, 0.16, "compact")),
        ("car_sedan", lambda root, mesh_cache, mats: make_vehicle(root, mesh_cache, mats, 0.32, 0.66, 0.18, "sedan")),
        ("bus_city", lambda root, mesh_cache, mats: make_vehicle(root, mesh_cache, mats, 0.38, 1.02, 0.27, "bus")),
        ("truck_delivery", lambda root, mesh_cache, mats: make_vehicle(root, mesh_cache, mats, 0.38, 0.92, 0.29, "truck")),
    )
    generate_simple_assets("vehicles", generators, cache, materials, manifest)


def make_vehicle(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material], width: float, length: float, height: float, vehicle_type: str) -> None:
    body_y = 0.09
    add_box(root, cache, materials, "vehicle_body", (width, height, length), (0.0, body_y, 0.0), "vehicle_paint", 0.03)
    if vehicle_type == "truck":
        add_box(root, cache, materials, "cargo_box", (width * 0.94, height * 1.3, length * 0.56), (0.0, body_y + height * 0.53, -length * 0.12), "facade_concrete", 0.018)
    else:
        cabin_height = height * (1.45 if vehicle_type == "bus" else 1.05)
        cabin_length = length * (0.76 if vehicle_type == "bus" else 0.48)
        add_box(root, cache, materials, "vehicle_cabin", (width * 0.86, cabin_height, cabin_length), (0.0, body_y + height * 0.62, length * 0.03), "vehicle_glass", 0.02)
    add_vehicle_wheels(root, cache, materials, width, length)
    add_box(root, cache, materials, "headlights", (width * 0.62, 0.045, 0.025), (0.0, body_y, length / 2 + 0.006), "headlight_emissive", 0.004)
    add_box(root, cache, materials, "taillights", (width * 0.62, 0.04, 0.025), (0.0, body_y, -length / 2 - 0.006), "taillight_emissive", 0.004)


def add_vehicle_wheels(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material], width: float, length: float) -> None:
    radius = min(width * 0.18, 0.065)
    for x in (-width / 2 - 0.006, width / 2 + 0.006):
        for z in (-length * 0.28, length * 0.28):
            add_cylinder(root, cache, materials, "vehicle_wheel", radius, 0.035, (x, radius, z), "rubber", 10, (0.0, 0.0, math.pi / 2))


def generate_nature(cache: MeshCache, materials: dict[str, bpy.types.Material], manifest: list[dict[str, object]]) -> None:
    generators: tuple[tuple[str, Callable[[bpy.types.Object, MeshCache, dict[str, bpy.types.Material]], None]], ...] = (
        ("tree_oak", make_oak_tree),
        ("tree_maple", make_maple_tree),
        ("tree_conifer", make_conifer),
        ("bush_cluster", make_bush_cluster),
        ("rock_cluster", make_rock_cluster),
        ("park_lamp", make_streetlight),
    )
    generate_simple_assets("nature", generators, cache, materials, manifest)


def make_oak_tree(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material]) -> None:
    add_cylinder(root, cache, materials, "tree_trunk", 0.06, 0.62, (0.0, 0.31, 0.0), "trunk", 9)
    for x, y, z, scale in ((0.0, 0.78, 0.0, 1.0), (-0.17, 0.7, 0.04, 0.78), (0.16, 0.72, -0.05, 0.82)):
        add_uv_sphere(root, cache, materials, "oak_canopy", 0.28, (x, y, z), "foliage", (scale, scale * 0.8, scale))


def make_maple_tree(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material]) -> None:
    add_cylinder(root, cache, materials, "tree_trunk", 0.05, 0.54, (0.0, 0.27, 0.0), "trunk", 8)
    for x, y, z in ((0.0, 0.72, 0.0), (-0.14, 0.66, 0.02), (0.13, 0.65, -0.04)):
        add_uv_sphere(root, cache, materials, "maple_canopy", 0.24, (x, y, z), "foliage_light", (1.0, 0.86, 1.0))


def make_conifer(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material]) -> None:
    add_cylinder(root, cache, materials, "tree_trunk", 0.045, 0.54, (0.0, 0.27, 0.0), "trunk", 8)
    add_cone(root, cache, materials, "conifer_lower", 0.29, 0.09, 0.5, (0.0, 0.53, 0.0), "foliage", 10)
    add_cone(root, cache, materials, "conifer_upper", 0.2, 0.02, 0.46, (0.0, 0.84, 0.0), "foliage_light", 10)


def make_bush_cluster(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material]) -> None:
    for x, z, scale in ((-0.16, -0.04, 0.85), (0.04, 0.06, 1.0), (0.2, -0.03, 0.75)):
        add_uv_sphere(root, cache, materials, "bush", 0.18, (x, 0.14, z), "foliage", (scale, scale * 0.72, scale))


def make_rock_cluster(root: bpy.types.Object, cache: MeshCache, materials: dict[str, bpy.types.Material]) -> None:
    for x, z, scale in ((-0.14, 0.0, 1.0), (0.1, 0.08, 0.74), (0.17, -0.12, 0.56)):
        add_uv_sphere(root, cache, materials, "rock", 0.15, (x, 0.08 * scale, z), "rock", (scale, scale * 0.68, scale * 0.86))


def generate_simple_assets(
    category: str,
    generators: Iterable[tuple[str, Callable[[bpy.types.Object, MeshCache, dict[str, bpy.types.Material]], None]]],
    cache: MeshCache,
    materials: dict[str, bpy.types.Material],
    manifest: list[dict[str, object]],
) -> None:
    for asset_id, builder in generators:
        clear_scene()
        root = create_root(asset_id, category)
        builder(root, cache, materials)
        output = OUTPUT_ROOT / category / f"{asset_id}.glb"
        export_asset(root, output)
        manifest.append({"id": asset_id, "category": category, "path": relative_output_path(output)})


def export_asset(root: bpy.types.Object, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for child in root.children_recursive:
        child.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_texcoords=False,
        export_normals=True,
        export_tangents=False,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_extras=True,
    )


def prepare_output_directories() -> None:
    for category in CATEGORIES:
        directory = OUTPUT_ROOT / category
        directory.mkdir(parents=True, exist_ok=True)
        for output in directory.glob("*.glb"):
            output.unlink()
    manifest = OUTPUT_ROOT / "manifest.json"
    if manifest.exists():
        manifest.unlink()


def relative_output_path(output: Path) -> str:
    return output.relative_to(REPOSITORY_ROOT / "public").as_posix()


def write_manifest(manifest: list[dict[str, object]]) -> None:
    payload = {
        "generator": "tools/generate_city_assets.py",
        "assetCount": len(manifest),
        "assets": manifest,
    }
    (OUTPUT_ROOT / "manifest.json").write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    clear_scene()
    configure_scene()
    prepare_output_directories()
    cache: MeshCache = {}
    materials = make_materials()
    manifest: list[dict[str, object]] = []
    generate_buildings(OUTPUT_ROOT / "buildings" / "residential", "residential", RESIDENTIAL_BUILDINGS, make_residential, cache, materials, manifest)
    generate_buildings(OUTPUT_ROOT / "buildings" / "commercial", "commercial", COMMERCIAL_BUILDINGS, make_commercial, cache, materials, manifest)
    generate_buildings(OUTPUT_ROOT / "buildings" / "industrial", "industrial", INDUSTRIAL_BUILDINGS, make_industrial, cache, materials, manifest)
    generate_buildings(OUTPUT_ROOT / "buildings" / "civic", "civic", CIVIC_BUILDINGS, make_civic, cache, materials, manifest)
    generate_roads(cache, materials, manifest)
    generate_props(cache, materials, manifest)
    generate_vehicles(cache, materials, manifest)
    generate_nature(cache, materials, manifest)
    write_manifest(manifest)
    clear_scene()
    print(f"Generated {len(manifest)} assets in {OUTPUT_ROOT}")


if __name__ == "__main__":
    main()
