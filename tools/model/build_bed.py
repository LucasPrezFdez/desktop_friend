# Modela la cama del perro: un colchón ovalado dentro de un reborde acolchado, alto por detrás y
# bajo por delante para que el perro entre y se le vea dentro. No parte de ningún fichero: toda la forma sale de aquí.
#
# Uso:
#   blender -b --factory-startup --python-exit-code 1 -P tools/model/build_bed.py -- --out cama.glb
#
# Las medidas son las de la escena de la app (el perro mide 1,12 de alto), no las del pack del perro.
# El frente de la cama es -Y en Blender, que al exportar queda en +Z: hacia la cámara de la app.
import argparse
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

UP = Vector((0.0, 0.0, 1.0))

# El reborde es un tubo que recorre una elipse. Estos son los radios de su línea central.
RIM_X = 0.88
RIM_Y = 0.46
# Medio ancho y media altura del tubo. La app mira la cama casi a ras de suelo: para que se vea
# por dentro, el reborde es alto por detrás, como un respaldo, y se aplasta hacia el frente.
RIM_WIDE = 0.14
RIM_HIGH = 0.21
RIM_LOW = 0.08
# Entre qué puntos del recorrido (0 es el frente, 1 es el fondo) sube el reborde.
RISE_FROM = 0.22
RISE_TO = 0.85
# Costuras: el tubo se estrangula un poco cada cierto tramo, como un cojín cosido por gajos.
SECTIONS = 10
PINCH = 0.10
PINCH_SHARP = 10
RIM_AROUND = 100
RIM_ACROSS = 18

# Colchón: abombado en el centro y metido bajo el reborde.
CUSHION_HEIGHT = 0.10
CUSHION_RINGS = 8
CUSHION_AROUND = 48

# Vivo: un cordón fino que recorre el reborde por fuera, algo por encima de su parte más ancha.
PIPING_RADIUS = 0.017
PIPING_AT = math.radians(38)
PIPING_SIDES = 6

COLORS = {
    "BedRim": (0.84, 0.62, 0.20),
    "BedCushion": (0.93, 0.88, 0.76),
    "BedPiping": (0.55, 0.33, 0.10),
}


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True)
    return parser.parse_args(argv)


def smoothstep(low, high, value):
    u = min(max((value - low) / (high - low), 0.0), 1.0)
    return u * u * (3 - 2 * u)


def rim_point(around, across, grow=0.0):
    """Punto de la superficie del reborde.

    `around` recorre la elipse (0 es +X, el frente está en -90 grados) y `across` da la vuelta
    al tubo (0 es hacia fuera, 90 grados es arriba). `grow` lo engorda, para apoyar el vivo.
    """
    center = Vector((RIM_X * math.cos(around), RIM_Y * math.sin(around), 0.0))
    outward = Vector((RIM_Y * math.cos(around), RIM_X * math.sin(around), 0.0)).normalized()
    back = smoothstep(RISE_FROM, RISE_TO, (1.0 + math.sin(around)) / 2)
    high = RIM_LOW + (RIM_HIGH - RIM_LOW) * back
    pinch = 1.0 - PINCH * abs(math.cos(around * SECTIONS / 2)) ** PINCH_SHARP
    wide = (RIM_WIDE + grow) * pinch
    tall = (high + grow) * pinch
    # El centro del tubo queda a su media altura sin estrangular: así siempre apoya en el suelo.
    return center + outward * (wide * math.cos(across)) + UP * (high + tall * math.sin(across))


def grid(bm, point, columns, rows, material):
    """Malla cerrada en las dos direcciones: `point(u, v)` con u y v de 0 a 1."""
    verts = [
        [bm.verts.new(point(column / columns, row / rows)) for row in range(rows)]
        for column in range(columns)
    ]
    for column in range(columns):
        for row in range(rows):
            face = bm.faces.new((
                verts[column][row],
                verts[(column + 1) % columns][row],
                verts[(column + 1) % columns][(row + 1) % rows],
                verts[column][(row + 1) % rows],
            ))
            face.material_index = material
            face.smooth = True


def add_rim(bm, material):
    grid(
        bm,
        lambda u, v: rim_point(u * math.tau, v * math.tau),
        RIM_AROUND, RIM_ACROSS, material,
    )


def add_piping(bm, material):
    def point(u, v):
        around = u * math.tau
        # El cordón gira alrededor de un punto de la superficie del reborde, medio hundido en ella.
        seat = rim_point(around, PIPING_AT, PIPING_RADIUS * 0.3)
        step = 1e-3
        along = (rim_point(around + step, PIPING_AT) - rim_point(around - step, PIPING_AT)).normalized()
        out = (rim_point(around, PIPING_AT, 0.05) - rim_point(around, PIPING_AT)).normalized()
        side = along.cross(out).normalized()
        turn = v * math.tau
        return seat + (out * math.cos(turn) + side * math.sin(turn)) * PIPING_RADIUS

    grid(bm, point, RIM_AROUND, PIPING_SIDES, material)


def add_cushion(bm, material):
    def point(ring, segment):
        reach = ring / CUSHION_RINGS
        around = segment / CUSHION_AROUND * math.tau
        height = CUSHION_HEIGHT * math.sqrt(max(1.0 - reach ** 4, 0.0))
        return Vector((RIM_X * reach * math.cos(around), RIM_Y * reach * math.sin(around), height))

    center = bm.verts.new(point(0, 0))
    rings = [
        [bm.verts.new(point(ring, segment)) for segment in range(CUSHION_AROUND)]
        for ring in range(1, CUSHION_RINGS + 1)
    ]
    faces = []
    for segment in range(CUSHION_AROUND):
        following = (segment + 1) % CUSHION_AROUND
        faces.append(bm.faces.new((center, rings[0][segment], rings[0][following])))
        for inner, outer in zip(rings, rings[1:]):
            faces.append(bm.faces.new((inner[segment], outer[segment], outer[following], inner[following])))
    for face in faces:
        face.material_index = material
        face.smooth = True


def material(name):
    made = bpy.data.materials.new(name)
    made.use_nodes = True
    shader = next(node for node in made.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = (*COLORS[name], 1.0)
    shader.inputs["Roughness"].default_value = 1.0
    shader.inputs["Metallic"].default_value = 0.0
    return made


def main():
    args = parse_args()
    bpy.ops.wm.read_factory_settings(use_empty=True)

    names = list(COLORS)
    bm = bmesh.new()
    add_rim(bm, names.index("BedRim"))
    add_piping(bm, names.index("BedPiping"))
    add_cushion(bm, names.index("BedCushion"))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # El colchón no es una superficie cerrada: se comprueba que quedó mirando hacia arriba.
    cushion = [face for face in bm.faces if face.material_index == names.index("BedCushion")]
    if sum(face.normal.z for face in cushion) < 0:
        bmesh.ops.reverse_faces(bm, faces=cushion)

    mesh = bpy.data.meshes.new("Bed")
    bm.to_mesh(mesh)
    print(f"[build] cama: {len(bm.verts)} vértices, {len(bm.faces)} caras")
    bm.free()
    for name in names:
        mesh.materials.append(material(name))
    bed = bpy.data.objects.new("Bed", mesh)
    bpy.context.scene.collection.objects.link(bed)

    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=out,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_animations=False,
        export_extras=False,
    )
    print(f"[build] materiales: {names}")
    print(f"[build] escrito {out} ({os.path.getsize(out)} bytes)")


main()
