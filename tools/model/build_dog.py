# Convierte el Husky de Quaternius en el perro negro de DesktopFriend.
#
# Uso:
#   blender -b --factory-startup --python-exit-code 1 -P tools/model/build_dog.py -- \
#       --in assets/source/quaternius/Husky.glb --out tools/model/out/dog.glb
#
# Qué hace:
#   1. Limpia el modelo (objetos sobrantes, clips que no se usan).
#   2. Renombra y recolorea los materiales.
#   3. Añade collar, chapa y lengua.
#   4. Crea por código los clips que el pack no trae: sentarse, tumbarse, dormir, feliz y triste.
#   5. Exporta un GLB con todos los clips.
#
# Requiere Blender 5.x (acciones con slots).
import argparse
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

# Clips del pack que se conservan, con su nombre final.
KEPT_CLIPS = {
    "Idle": "Idle",
    "Idle_2": "IdleLook",
    "Idle_2_HeadLow": "Sniff",
    "Walk": "Walk",
    "Gallop": "Run",
    "Eating": "Eat",
}

# Colores en espacio lineal. El pelaje es gris muy oscuro y no negro puro,
# para que el sombreado conserve relieve (ver docs/investigacion.md).
MATERIALS = {
    "Material": ("Fur", (0.016, 0.016, 0.020)),
    "Material.001": ("FurLight", (0.050, 0.048, 0.056)),
    "Material.006": ("Nose", (0.004, 0.004, 0.005)),
    "Material.003": ("EyeWhite", (0.750, 0.750, 0.720)),
    "Material.002": ("EyePupil", (0.050, 0.022, 0.010)),
}
EXTRA_MATERIALS = {
    "Collar": (0.750, 0.035, 0.040),
    "Tag": (0.900, 0.580, 0.080),
    "Tongue": (0.850, 0.230, 0.290),
}

FEET = {
    "FL": "IKFrontLeg.L",
    "FR": "IKFrontLeg.R",
    "BL": "IKBackLeg.L",
    "BR": "IKBackLeg.R",
}
# (hueso superior, hueso inferior, hueso de control del pie)
LEGS = [
    ("FrontUpperLeg.L", "FrontLowerLeg.L", "IKFrontLeg.L"),
    ("FrontUpperLeg.R", "FrontLowerLeg.R", "IKFrontLeg.R"),
    ("BackUpperLeg.L", "BackLowerLeg.L", "IKBackLeg.L"),
    ("BackUpperLeg.R", "BackLowerLeg.R", "IKBackLeg.R"),
]


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--in", dest="src", required=True)
    parser.add_argument("--out", required=True)
    return parser.parse_args(argv)


def update():
    bpy.context.view_layer.update()


# --------------------------------------------------------------------------- limpieza


def clean_scene():
    """Quita la malla suelta del pack y los nodos vacíos de fin de hueso."""
    armature = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
    dog = next(o for o in bpy.context.scene.objects if o.type == "MESH" and o.parent == armature)
    for obj in list(bpy.context.scene.objects):
        if obj.type == "EMPTY" and obj.name.endswith("_end"):
            bpy.data.objects.remove(obj, do_unlink=True)
        elif obj.type == "MESH" and obj != dog:
            bpy.data.objects.remove(obj, do_unlink=True)
    dog.name = "Dog"
    dog.data.name = "Dog"
    armature.name = "DogArmature"
    return armature, dog


def clean_clips(armature):
    """Deja solo los clips de KEPT_CLIPS, con su nombre final y sin pistas NLA."""
    anim = armature.animation_data
    if anim:
        anim.action = None
        for track in list(anim.nla_tracks):
            anim.nla_tracks.remove(track)
    for action in list(bpy.data.actions):
        if action.name in KEPT_CLIPS:
            action.name = KEPT_CLIPS[action.name]
        else:
            bpy.data.actions.remove(action)
    missing = set(KEPT_CLIPS.values()) - {a.name for a in bpy.data.actions}
    if missing:
        raise SystemExit(f"Faltan clips del pack: {sorted(missing)}")


# --------------------------------------------------------------------------- materiales


def set_color(material, color):
    material.diffuse_color = (*color, 1.0)
    principled = next(n for n in material.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    principled.inputs["Base Color"].default_value = (*color, 1.0)
    principled.inputs["Roughness"].default_value = 0.85
    principled.inputs["Metallic"].default_value = 0.0


def recolor(dog):
    for material in dog.data.materials:
        if material.name not in MATERIALS:
            raise SystemExit(f"Material inesperado en el pack: {material.name}")
        name, color = MATERIALS[material.name]
        material.name = name
        set_color(material, color)


def new_material(name):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    set_color(material, EXTRA_MATERIALS[name])
    return material


# --------------------------------------------------------------------------- piezas añadidas


def world_vertices(dog):
    matrix = dog.matrix_world
    return [matrix @ v.co for v in dog.data.vertices]


def bone_head(armature, name):
    return armature.matrix_world @ armature.data.bones[name].head_local


def neck_section(armature, dog):
    """Mide la sección del cuello donde va el collar: centro, ejes y semiejes."""
    low = bone_head(armature, "Neck1")
    high = bone_head(armature, "Neck2")
    axis = (high - low).normalized()
    origin = low.lerp(high, 0.35)
    side = Vector((1.0, 0.0, 0.0))
    front = side.cross(axis).normalized()  # apunta hacia delante y abajo
    xs, fs = [], []
    for point in world_vertices(dog):
        rel = point - origin
        if abs(rel.dot(axis)) < 0.07 and rel.length < 0.9:
            xs.append(rel.dot(side))
            fs.append(rel.dot(front))
    if len(xs) < 6:
        raise SystemExit("No se pudo medir el cuello para colocar el collar")
    center = origin + front * ((max(fs) + min(fs)) / 2)
    return center, axis, side, front, (max(xs) - min(xs)) / 2, (max(fs) - min(fs)) / 2


def add_ring(bm, center, axis, side, front, radius_side, radius_front, width, thickness, segments=24):
    """Banda elíptica de sección rectangular alrededor del cuello."""
    rings = []
    for i in range(segments):
        angle = 2 * math.pi * i / segments
        outward = side * math.cos(angle) * radius_side + front * math.sin(angle) * radius_front
        normal = (side * math.cos(angle) / radius_side + front * math.sin(angle) / radius_front).normalized()
        base = center + outward
        rings.append([
            bm.verts.new(base - axis * width / 2),
            bm.verts.new(base - axis * width / 2 + normal * thickness),
            bm.verts.new(base + axis * width / 2 + normal * thickness),
            bm.verts.new(base + axis * width / 2),
        ])
    faces = []
    for i in range(segments):
        a, b = rings[i], rings[(i + 1) % segments]
        for k in range(4):
            faces.append(bm.faces.new((a[k], a[(k + 1) % 4], b[(k + 1) % 4], b[k])))
    return faces


def nape_point(section):
    """Punto de la nuca, sobre la cara exterior del collar: de ahí lo coge la mano al levantarlo."""
    center, _axis, _side, front, _radius_side, radius_front = section
    return center - front * (radius_front + 0.06)


def add_nape_bone(armature, point):
    """Hueso sin malla que marca la nuca, para que la app sepa dónde está en cualquier pose."""
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode="EDIT")
    to_armature = armature.matrix_world.inverted()
    bone = armature.data.edit_bones.new("Nape")
    bone.head = to_armature @ point
    bone.tail = to_armature @ (point + Vector((0.0, 0.0, 0.1)))
    bone.parent = armature.data.edit_bones["Neck1"]
    bone.use_deform = False
    bpy.ops.object.mode_set(mode="OBJECT")


def build_extras(armature, dog, section):
    """Collar, chapa y lengua como una malla aparte que luego se une a la del perro."""
    center, axis, side, front, radius_side, radius_front = section
    bm = bmesh.new()
    groups = {}  # nombre del hueso -> vértices

    collar_faces = add_ring(bm, center, axis, side, front, radius_side + 0.012, radius_front + 0.012, 0.13, 0.05)
    groups["Neck1"] = [v for f in collar_faces for v in f.verts]

    tag_center = center + front * (radius_front + 0.075) - axis * 0.12
    tag = bmesh.ops.create_cone(
        bm, cap_ends=True, segments=10, radius1=0.085, radius2=0.085, depth=0.03,
        matrix=Matrix.Translation(tag_center) @ front.to_track_quat("Z", "Y").to_matrix().to_4x4(),
    )
    groups["Neck1"] += tag["verts"]
    tag_faces = {f for v in tag["verts"] for f in v.link_faces}

    # Lengua: una lámina redondeada que asoma bajo el hocico. La app la muestra solo cuando está contento.
    nose_points = [
        dog.matrix_world @ dog.data.vertices[i].co
        for poly in dog.data.polygons if dog.data.materials[poly.material_index].name == "Nose"
        for i in poly.vertices
    ]
    snout_tip = min(p.y for p in nose_points)
    nose_low = min(p.z for p in nose_points)
    tongue_root = Vector((0.0, snout_tip + 0.30, nose_low - 0.01))
    tongue_verts = []
    tongue_faces = set()
    outline = [(-0.07, 0.0), (0.07, 0.0), (0.085, 0.12), (0.06, 0.22), (0.0, 0.26), (-0.06, 0.22), (-0.085, 0.12)]
    for depth in (0.0, 0.035):
        layer = []
        for x, down in outline:
            # Cuelga hacia abajo y un poco hacia delante.
            layer.append(bm.verts.new(tongue_root + Vector((x, -down * 0.35 - depth, -down))))
        tongue_verts.append(layer)
    tongue_faces.add(bm.faces.new(tongue_verts[0]))
    tongue_faces.add(bm.faces.new(list(reversed(tongue_verts[1]))))
    count = len(outline)
    for i in range(count):
        j = (i + 1) % count
        tongue_faces.add(bm.faces.new(
            (tongue_verts[0][j], tongue_verts[0][i], tongue_verts[1][i], tongue_verts[1][j])
        ))
    groups["Head"] = [v for layer in tongue_verts for v in layer]

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    for face in bm.faces:
        face.smooth = False
        face.material_index = 1 if face in tag_faces else 2 if face in tongue_faces else 0

    mesh = bpy.data.meshes.new("DogExtras")
    bm.verts.index_update()
    weights = {bone: [v.index for v in verts] for bone, verts in groups.items()}
    bm.to_mesh(mesh)
    bm.free()
    for name in ("Collar", "Tag", "Tongue"):
        mesh.materials.append(new_material(name))

    extras = bpy.data.objects.new("DogExtras", mesh)
    bpy.context.scene.collection.objects.link(extras)
    for bone, indices in weights.items():
        extras.vertex_groups.new(name=bone).add(indices, 1.0, "REPLACE")

    with bpy.context.temp_override(
        active_object=dog, object=dog, selected_objects=[dog, extras], selected_editable_objects=[dog, extras]
    ):
        bpy.ops.object.join()


# --------------------------------------------------------------------------- poses


def expand(pose):
    """Desdobla las claves con '*' en izquierda y derecha. Giro y balanceo se reflejan."""
    out = {}
    for key, value in pose.items():
        if "*" not in key:
            out[key] = value
            continue
        mirrored = key.endswith((".yaw", ".roll", ".dx"))
        out[key.replace("*", "L")] = value
        out[key.replace("*", "R")] = -value if mirrored else value
    return out


def blend(a, b, u):
    return {key: a.get(key, 0.0) + (b.get(key, 0.0) - a.get(key, 0.0)) * u for key in a.keys() | b.keys()}


def sample_keys(keys, time):
    """Interpola entre poses clave con entrada y salida suaves."""
    if time <= keys[0][0]:
        return dict(keys[0][1])
    for (t0, p0), (t1, p1) in zip(keys, keys[1:]):
        if time <= t1:
            u = (time - t0) / (t1 - t0)
            return blend(p0, p1, u * u * (3 - 2 * u))
    return dict(keys[-1][1])


def euler(pitch=0.0, yaw=0.0, roll=0.0):
    """Rotación en ejes de mundo. pitch>0 levanta el morro, yaw>0 gira a su izquierda, roll>0 inclina a su izquierda."""
    return (
        Matrix.Rotation(math.radians(yaw), 4, "Z")
        @ Matrix.Rotation(math.radians(roll), 4, "Y")
        @ Matrix.Rotation(math.radians(-pitch), 4, "X")
    )


class Rig:
    """Coloca el esqueleto trabajando en coordenadas de mundo.

    La armadura del pack está girada 90 grados y escalada x100 respecto al mundo, así que
    las matrices de pose no se pueden usar directamente: se pasan a mundo, se transforman y se devuelven.
    """

    def __init__(self, armature):
        self.armature = armature
        self.bones = armature.pose.bones
        self.to_world = armature.matrix_world.copy()
        self.to_armature = self.to_world.inverted()
        data = armature.data.bones

        def rest(name):
            return self.to_world @ data[name].head_local

        self.pivots = {
            "shoulders": (rest("FrontUpperLeg.L") + rest("FrontUpperLeg.R")) / 2,
            "hips": (rest("BackLeg.L") + rest("BackLeg.R")) / 2,
            "nape": rest("Nape"),
        }
        self.legs = []
        for upper, lower, foot in LEGS:
            self.legs.append({
                "upper": upper,
                "lower": lower,
                "foot": foot,
                "upper_length": (rest(lower) - rest(upper)).length,
                "lower_length": (rest(foot) - rest(lower)).length,
                # Dónde queda el tobillo visto desde el hueso inferior.
                "ankle_local": data[lower].matrix_local.inverted() @ data[foot].head_local,
            })

    def world(self, bone):
        return self.to_world @ bone.matrix

    def position(self, bone):
        return self.world(bone).translation

    def transform(self, bone, matrix):
        """Aplica a un hueso una transformación expresada en coordenadas de mundo."""
        bone.matrix = self.to_armature @ matrix @ self.world(bone)
        update()

    def rotate(self, bone, rotation, pivot=None):
        """Gira un hueso en ejes de mundo alrededor de un punto (por defecto, su propia cabeza)."""
        pivot = self.position(bone).copy() if pivot is None else pivot
        self.transform(bone, Matrix.Translation(pivot) @ rotation @ Matrix.Translation(-pivot))

    def apply(self, pose, pivot_name, hang=False):
        """Coloca el esqueleto en una pose y recalcula las patas.

        Normalmente los pies se quedan plantados donde estaban. Con `hang`, el perro está en el
        aire y cada pie cuelga del arranque de su pata.
        """
        for bone in self.bones:
            bone.matrix_basis = Matrix.Identity(4)
        update()

        def angles(prefix):
            return {axis: pose.get(f"{prefix}.{axis}", 0.0) for axis in ("pitch", "yaw", "roll")}

        def offset(prefix):
            return Vector([pose.get(f"{prefix}.{axis}", 0.0) for axis in ("dx", "dy", "dz")])

        body = self.bones["Body"]
        self.rotate(body, euler(**angles("body")), self.pivots[pivot_name])
        self.transform(body, Matrix.Translation(offset("body")))

        # armature.pose.bones va de padres a hijos, que es el orden en que hay que girar.
        for bone in self.bones:
            if bone.name == "Body":
                continue
            turn = angles(bone.name)
            if any(turn.values()):
                self.rotate(bone, euler(**turn))

        for key, name in FEET.items():
            move = offset(key)
            if hang:
                leg = next(leg for leg in self.legs if leg["foot"] == name)
                root = self.position(self.bones[leg["upper"]])
                move += root + HANG[key] - self.position(self.bones[name])
            if move.length:
                self.transform(self.bones[name], Matrix.Translation(move))

        for leg in self.legs:
            self.solve_leg(leg)

    def solve_leg(self, leg):
        """Cinemática inversa de dos huesos: lleva el tobillo hasta el hueso de control del pie."""
        upper, lower = self.bones[leg["upper"]], self.bones[leg["lower"]]
        l1, l2 = leg["upper_length"], leg["lower_length"]
        root = self.position(upper).copy()
        to_target = self.position(self.bones[leg["foot"]]) - root
        # Fuera de este rango la pata no llega (o no se puede plegar más): se queda lo más cerca posible.
        reach = min(max(to_target.length, abs(l1 - l2) * 1.02), (l1 + l2) * 0.999)
        direction = to_target.normalized()
        target = root + direction * reach

        # Codo y corvejón doblan siempre hacia atrás (+Y de mundo). Heredar el lado de la pose
        # actual falla cuando el muslo ya está girado: la pata se pliega bajo el suelo.
        bend = Vector((0.0, 1.0, 0.0))
        bend -= direction * bend.dot(direction)
        if bend.length < 1e-6:
            bend = Vector((0.0, 0.0, 1.0))
        bend.normalize()
        along = (l1 * l1 - l2 * l2 + reach * reach) / (2 * reach)
        height = math.sqrt(max(l1 * l1 - along * along, 0.0))
        knee = root + direction * along + bend * height

        swing = (self.position(lower) - root).rotation_difference(knee - root)
        self.rotate(upper, swing.to_matrix().to_4x4())

        knee = self.position(lower).copy()
        ankle = self.to_world @ (lower.matrix @ leg["ankle_local"])
        swing = (ankle - knee).rotation_difference(target - knee)
        self.rotate(lower, swing.to_matrix().to_4x4())

    def snapshot(self):
        return {bone.name: (bone.location.copy(), bone.rotation_quaternion.copy()) for bone in self.bones}


# Poses clave, en unidades de mundo y grados. El perro mide unas 3,2 unidades de alto.
STAND = {}

SIT = expand({
    "body.pitch": 38.0,
    "BackLeg.*.pitch": 25.0,
    "BL.dy": -0.61, "BR.dy": -0.61,
    "Neck1.pitch": -12.0, "Neck2.pitch": -10.0, "Neck3.pitch": -8.0, "Head.pitch": -8.0,
})

LIE = expand({
    "body.dz": -0.95,
    "FL.dy": -0.75, "FR.dy": -0.75, "FL.dz": -0.05, "FR.dz": -0.05,
    # Tumbado, la rodilla sube junto a la barriga y la pata queda plegada bajo el cuerpo.
    "BackLeg.*.pitch": 69.0,
    "BL.dy": -0.53, "BR.dy": -0.53,
    "Neck1.pitch": -5.0,
})

SLEEP = {**LIE, **expand({
    "Neck1.pitch": -28.0, "Neck2.pitch": -22.0, "Neck3.pitch": -15.0, "Head.pitch": -5.0, "Head.roll": 12.0,
    "Ear1.*.pitch": 15.0,
    "Tail1.pitch": 40.0, "Tail2.pitch": 20.0,
})}

SAD = expand({
    "body.dz": -0.08,
    "Neck1.pitch": -14.0, "Neck2.pitch": -12.0, "Neck3.pitch": -10.0, "Head.pitch": -10.0,
    "Ear1.*.pitch": 25.0, "Ear1.*.roll": 20.0,
    "Tail1.pitch": 50.0, "Tail2.pitch": 25.0, "Tail3.pitch": 15.0,
})

# En brazos: colgado de la nuca, con el cuerpo inclinado y las patas sueltas.
CARRY = expand({
    "body.pitch": 35.0,
    # El cuello se endereza para que mire al frente y no al cielo. Neck1 no se toca: lleva el collar.
    "Neck2.pitch": -12.0, "Neck3.pitch": -12.0, "Head.pitch": -8.0,
    "BackLeg.*.pitch": -20.0,
    # Las patas caen con los dedos hacia abajo.
    "IKFrontLeg.*.pitch": -35.0, "IKBackLeg.*.pitch": -25.0,
})

# Dónde cuelga cada pie respecto al arranque de su pata (hombro o rodilla), en unidades de mundo.
HANG = {
    "FL": Vector((0.0, -0.15, -1.0)),
    "FR": Vector((0.0, -0.15, -1.0)),
    "BL": Vector((0.0, 0.25, -1.25)),
    "BR": Vector((0.0, 0.25, -1.25)),
}

HAPPY_CROUCH = {"body.dz": -0.10, "body.pitch": -3.0}
HAPPY_HOP = {"body.dz": 0.12, "body.pitch": 10.0, "FL.dz": 0.30, "FR.dz": 0.30, "Head.pitch": 8.0}
HAPPY_LAND = {"body.dz": -0.05}


def breathing(period, lift, nod):
    def overlay(time):
        wave = math.sin(2 * math.pi * time / period)
        return {"body.dz": lift * wave, "Neck1.pitch": nod * wave}
    return overlay


def paddle(time):
    """Pataleo en el aire, como un cachorro al que levantan: las patas se alternan."""
    swing = math.sin(2 * math.pi * time / 1.2)
    lift = math.cos(2 * math.pi * time / 1.2)
    return {
        "FL.dy": 0.14 * swing, "FL.dz": 0.05 * lift,
        "FR.dy": -0.14 * swing, "FR.dz": -0.05 * lift,
        "BL.dy": -0.10 * swing, "BR.dy": 0.10 * swing,
        "Head.roll": 4.0 * swing,
    }


def sad_sway(time):
    slow = math.sin(2 * math.pi * time / 4.0)
    return {"Head.yaw": 4.0 * slow, "body.dz": 0.01 * math.sin(4 * math.pi * time / 4.0)}


CLIPS = [
    {"name": "SitDown", "duration": 0.75, "pivot": "shoulders", "keys": [(0.0, STAND), (0.75, SIT)]},
    {"name": "Sit", "duration": 3.0, "pivot": "shoulders", "keys": [(0.0, SIT)], "overlay": breathing(3.0, 0.012, 1.2)},
    {"name": "LieDown", "duration": 1.0, "pivot": "shoulders", "keys": [(0.0, STAND), (1.0, LIE)]},
    {"name": "Lie", "duration": 3.0, "pivot": "shoulders", "keys": [(0.0, LIE)], "overlay": breathing(3.0, 0.010, 1.0)},
    {"name": "Sleep", "duration": 4.0, "pivot": "shoulders", "keys": [(0.0, SLEEP)], "overlay": breathing(4.0, 0.018, 1.5)},
    {"name": "Happy", "duration": 0.8, "pivot": "hips", "keys": [
        (0.0, STAND), (0.2, HAPPY_CROUCH), (0.4, HAPPY_HOP), (0.6, HAPPY_LAND), (0.8, STAND),
    ]},
    {"name": "Sad", "duration": 4.0, "pivot": "shoulders", "keys": [(0.0, SAD)], "overlay": sad_sway},
    {"name": "Carry", "duration": 1.2, "pivot": "nape", "hang": True, "keys": [(0.0, CARRY)], "overlay": paddle},
]

# Huesos cuya posición (no solo su giro) forma parte de la animación.
MOVING_BONES = {"Body", *FEET.values()}


def bake_clip(rig, clip, fps):
    armature = rig.armature
    armature.animation_data.action = None
    frames = round(clip["duration"] * fps)
    samples = []
    for frame in range(frames + 1):
        time = frame / fps
        pose = sample_keys(clip["keys"], time)
        overlay = clip.get("overlay")
        if overlay:
            for key, value in overlay(time).items():
                pose[key] = pose.get(key, 0.0) + value
        rig.apply(pose, clip["pivot"], clip.get("hang", False))
        samples.append(rig.snapshot())
        if os.environ.get("DOG_DEBUG") and frame == frames:
            for name in ("Back", "BackLeg.L", "BackUpperLeg.L", "BackLowerLeg.L", "IKBackLeg.L",
                         "FrontUpperLeg.L", "FrontLowerLeg.L", "IKFrontLeg.L", "Head"):
                p = rig.position(rig.bones[name])
                print(f"[debug] {clip['name']:8s} {name:16s} y={p.y:6.2f} z={p.z:6.2f}")

    action = bpy.data.actions.new(clip["name"])
    armature.animation_data.action = action
    previous = {}
    for frame, sample in enumerate(samples):
        for bone in rig.bones:
            location, rotation = sample[bone.name]
            # q y -q son el mismo giro; se elige el más cercano al anterior para que la interpolación no dé la vuelta larga.
            if bone.name in previous and previous[bone.name].dot(rotation) < 0:
                rotation.negate()
            previous[bone.name] = rotation
            bone.rotation_quaternion = rotation
            bone.keyframe_insert("rotation_quaternion", frame=frame)
            if bone.name in MOVING_BONES:
                bone.location = location
                bone.keyframe_insert("location", frame=frame)
    if armature.animation_data.action_slot is None:
        armature.animation_data.action_slot = action.slots[0]
    armature.animation_data.action = None
    return action


def stack_in_nla(armature):
    """El exportador solo saca las acciones que están activas o apiladas en pistas NLA."""
    for action in sorted(bpy.data.actions, key=lambda a: a.name):
        track = armature.animation_data.nla_tracks.new()
        track.name = action.name
        strip = track.strips.new(action.name, int(action.frame_range[0]), action)
        if strip.action_slot is None and action.slots:
            strip.action_slot = action.slots[0]
        if strip.action_slot is None:
            raise SystemExit(f"El clip '{action.name}' se quedó sin slot y saldría vacío")
    armature.animation_data.action = None
    for bone in armature.pose.bones:
        bone.matrix_basis = Matrix.Identity(4)


def main():
    args = parse_args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(args.src))
    fps = bpy.context.scene.render.fps

    armature, dog = clean_scene()
    clean_clips(armature)
    recolor(dog)
    section = neck_section(armature, dog)
    build_extras(armature, dog, section)
    add_nape_bone(armature, nape_point(section))

    for bone in armature.pose.bones:
        bone.rotation_mode = "QUATERNION"
    rig = Rig(armature)
    for clip in CLIPS:
        action = bake_clip(rig, clip, fps)
        print(f"[build] clip {action.name}: {round(clip['duration'] * fps) + 1} fotogramas")
    stack_in_nla(armature)

    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=out,
        export_format="GLB",
        export_yup=True,
        export_apply=False,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_nla_strips=True,
        export_force_sampling=True,
        export_reset_pose_bones=True,
        export_optimize_animation_size=True,
        export_skins=True,
        export_def_bones=False,
        export_extras=False,
    )
    print(f"[build] materiales: {[m.name for m in dog.data.materials]}")
    print(f"[build] clips: {sorted(a.name for a in bpy.data.actions)}")
    print(f"[build] escrito {out} ({os.path.getsize(out)} bytes)")


main()
