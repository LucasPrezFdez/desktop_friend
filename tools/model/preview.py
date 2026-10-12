# Renderiza una hoja de contactos de un GLB para revisarlo como imagen.
#
# Uso:
#   blender -b --factory-startup --python-exit-code 1 -P tools/model/preview.py -- \
#       --in modelo.glb --out hoja.png --shots "rest@three,Walk:0.25@side" [--size 320] [--cols 4]
#
# Cada toma es "<clip>[:<fracción 0-1>]@<vista>". "rest" es la pose de reposo.
# Vistas: front, side, back, three (tres cuartos), top, above (desde arriba y de frente).
import argparse
import math
import os
import sys
import tempfile

import bmesh
import bpy
import numpy as np
from mathutils import Vector

VIEWS = {
    # El frente de un glTF (+Z) queda en -Y al importarlo en Blender.
    "front": Vector((0.0, -1.0, 0.15)),
    "side": Vector((1.0, 0.0, 0.1)),
    "back": Vector((0.0, 1.0, 0.15)),
    "three": Vector((0.8, -1.0, 0.45)),
    "top": Vector((0.0, -0.01, 1.0)),
    # Desde arriba y de frente: como se ve al perro cuando se le mira desde encima de la pantalla.
    "above": Vector((0.45, -1.0, 0.95)),
}


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--in", dest="src", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--shots", default="rest@three,rest@side,rest@front")
    parser.add_argument("--size", type=int, default=320)
    parser.add_argument("--cols", type=int, default=4)
    parser.add_argument("--bg", default="0.62,0.66,0.72")
    # Encuadre manual "x,y,z,tamaño" en unidades de mundo, para primeros planos.
    parser.add_argument("--frame", default="")
    # Recorta cada toma en círculo con fondo transparente (para el icono de la app).
    parser.add_argument("--round", action="store_true")
    # Materiales que no se dibujan, separados por comas (la lengua, que la app solo enseña a ratos).
    parser.add_argument("--hide", default="")
    # Dibuja el suelo, para ver si alguna pose lo atraviesa.
    parser.add_argument("--floor", action="store_true")
    return parser.parse_args(argv)


def world_bounds(objects):
    lo = Vector((math.inf,) * 3)
    hi = Vector((-math.inf,) * 3)
    for obj in objects:
        for corner in obj.bound_box:
            p = obj.matrix_world @ Vector(corner)
            lo = Vector(map(min, lo, p))
            hi = Vector(map(max, hi, p))
    return lo, hi


def setup_scene(size, bg):
    scene = bpy.context.scene
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "Standard"

    world = bpy.data.worlds.new("PreviewWorld")
    world.use_nodes = True
    background = world.node_tree.nodes["Background"]
    background.inputs[0].default_value = (*bg, 1.0)
    background.inputs[1].default_value = 1.0
    scene.world = world

    for name, rotation, energy in (
        ("Key", (math.radians(50), 0.0, math.radians(35)), 3.0),
        ("Rim", (math.radians(60), 0.0, math.radians(200)), 2.0),
    ):
        light = bpy.data.lights.new(name, "SUN")
        light.energy = energy
        obj = bpy.data.objects.new(name, light)
        obj.rotation_euler = rotation
        scene.collection.objects.link(obj)

    camera = bpy.data.objects.new("PreviewCam", bpy.data.cameras.new("PreviewCam"))
    camera.data.type = "ORTHO"
    scene.collection.objects.link(camera)
    scene.camera = camera
    return scene, camera


def aim_camera(camera, center, extent, view):
    # Una vista que no está en la lista es una dirección "x/y/z" desde el modelo hacia la cámara.
    direction = (VIEWS[view] if view in VIEWS else Vector([float(v) for v in view.split("/")])).normalized()
    camera.location = center + direction * extent * 4.0
    camera.rotation_euler = (-direction).to_track_quat("-Z", "Y").to_euler()
    camera.data.ortho_scale = extent * 1.5
    camera.data.clip_end = extent * 20.0


def set_clip(armature, clip, fraction, scene):
    if armature is None:
        return
    if clip == "rest":
        if armature.animation_data:
            armature.animation_data.action = None
        for bone in armature.pose.bones:
            bone.matrix_basis.identity()
        scene.frame_set(0)
        return
    action = bpy.data.actions.get(clip)
    if action is None:
        raise SystemExit(f"No existe el clip '{clip}'. Disponibles: {sorted(a.name for a in bpy.data.actions)}")
    if armature.animation_data is None:
        armature.animation_data_create()
    armature.animation_data.action = action
    if armature.animation_data.action_slot is None and action.slots:
        armature.animation_data.action_slot = action.slots[0]
    start, end = action.frame_range
    frame = start + (end - start) * fraction
    scene.frame_set(int(frame), subframe=frame - int(frame))


def render(scene, path):
    scene.render.filepath = path
    for engine in ("BLENDER_EEVEE", "CYCLES"):
        try:
            scene.render.engine = engine
            if engine == "CYCLES":
                scene.cycles.samples = 16
            bpy.ops.render.render(write_still=True)
            if os.path.exists(path):
                return engine
        except Exception as error:  # el siguiente motor es el respaldo
            print(f"[preview] {engine} falló: {error}")
    raise SystemExit("No se pudo renderizar con ningún motor")


def load_pixels(path, size):
    image = bpy.data.images.load(path)
    pixels = np.empty(size * size * 4, dtype=np.float32)
    image.pixels.foreach_get(pixels)
    bpy.data.images.remove(image)
    return pixels.reshape(size, size, 4)


def main():
    args = parse_args()
    bg = tuple(float(v) for v in args.bg.split(","))

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(args.src))

    # Como en la app: una cara vista por detrás no se dibuja. Así una pieza del revés se nota aquí.
    for material in bpy.data.materials:
        material.use_backface_culling = True

    # El importador guarda en una colección oculta la esfera con la que dibuja los huesos: no cuenta.
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH" and o.visible_get()]
    hidden = {name for name in args.hide.split(",") if name}
    for obj in meshes:
        slots = {i for i, m in enumerate(obj.data.materials) if m and m.name in hidden}
        if slots:
            bm = bmesh.new()
            bm.from_mesh(obj.data)
            bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index in slots], context="FACES")
            bm.to_mesh(obj.data)
            bm.free()
    armature = next((o for o in bpy.context.scene.objects if o.type == "ARMATURE"), None)
    scene, camera = setup_scene(args.size, bg)
    if args.floor:
        bpy.ops.mesh.primitive_plane_add(size=12.0, location=(0.0, 0.0, 0.0))
        ground = bpy.data.materials.new("PreviewFloor")
        ground.use_nodes = True
        shader = next(n for n in ground.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        shader.inputs["Base Color"].default_value = (bg[0] * 0.3, bg[1] * 0.3, bg[2] * 0.3, 1.0)
        shader.inputs["Roughness"].default_value = 1.0
        bpy.context.object.data.materials.append(ground)

    set_clip(armature, "rest", 0.0, scene)
    bpy.context.view_layer.update()
    lo, hi = world_bounds(meshes)
    center = (lo + hi) / 2
    extent = max(hi - lo)
    if args.frame:
        x, y, z, extent = (float(v) for v in args.frame.split(","))
        center = Vector((x, y, z))
    print(f"[preview] bbox min={tuple(round(v, 3) for v in lo)} max={tuple(round(v, 3) for v in hi)}")
    print(f"[preview] clips: {sorted(a.name for a in bpy.data.actions)}")

    shots = [s.strip() for s in args.shots.split(",") if s.strip()]
    tiles = []
    with tempfile.TemporaryDirectory() as tmp:
        for index, shot in enumerate(shots):
            pose, view = shot.split("@")
            clip, _, fraction = pose.partition(":")
            set_clip(armature, clip, float(fraction or 0.0), scene)
            aim_camera(camera, center, extent, view)
            path = os.path.join(tmp, f"shot_{index:02d}.png")
            engine = render(scene, path)
            tile = load_pixels(path, args.size)
            if args.round:
                ys, xs = np.mgrid[0:args.size, 0:args.size]
                radius = np.hypot(xs - (args.size - 1) / 2, ys - (args.size - 1) / 2)
                # Borde suavizado de un par de píxeles.
                tile[..., 3] = np.clip((args.size / 2 - 1 - radius) / 2, 0.0, 1.0)
            tiles.append(tile)
            print(f"[preview] toma {index}: {shot} ({engine})")

    cols = min(args.cols, len(tiles))
    rows = math.ceil(len(tiles) / cols)
    sheet = np.zeros((rows * args.size, cols * args.size, 4), dtype=np.float32)
    for index, tile in enumerate(tiles):
        row, col = divmod(index, cols)
        # Las filas de píxeles de Blender empiezan por abajo.
        y = (rows - 1 - row) * args.size
        sheet[y:y + args.size, col * args.size:(col + 1) * args.size] = tile

    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    image = bpy.data.images.new("sheet", width=cols * args.size, height=rows * args.size, alpha=True)
    image.pixels.foreach_set(sheet.ravel())
    image.filepath_raw = out
    image.file_format = "PNG"
    image.save()
    print(f"[preview] hoja: {out} ({cols}x{rows})")


main()
