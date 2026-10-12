# Convierte el Husky de Quaternius en el perro de DesktopFriend: un retrato del perro del usuario.
#
# Uso:
#   blender -b --factory-startup --python-exit-code 1 -P tools/model/build_dog.py -- \
#       --in assets/source/quaternius/Husky.glb --out tools/model/out/dog.glb
#
# Qué hace:
#   1. Limpia el modelo (objetos sobrantes, clips que no se usan).
#   2. Remodela la malla sin tocar el esqueleto: quita las orejas tiesas, agranda y redondea la
#      cabeza, acorta el hocico y da más cuerpo al tronco y a las patas.
#   3. Renombra y recolorea los materiales; pinta de gris el hocico.
#   4. Añade orejas caídas, ojos, mechones, collar, chapa y lengua.
#   5. Crea por código los clips que el pack no trae: sentarse, tumbarse, dormir, feliz, triste y en brazos.
#   6. Exporta un GLB con todos los clips.
#
# Requiere Blender 5.x (acciones con slots).
import argparse
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector, bvhtree, kdtree

# Clips del pack que se conservan, con su nombre final.
KEPT_CLIPS = {
    "Idle": "Idle",
    "Idle_2": "IdleLook",
    "Idle_2_HeadLow": "Sniff",
    "Walk": "Walk",
    "Gallop": "Run",
    "Eating": "Eat",
}

# Materiales del pack y el nombre con el que se quedan. Los de los ojos dejan de usarse:
# los ojos nuevos son una pieza añadida.
PACK_MATERIALS = {
    "Material": "Fur",
    "Material.001": "FurLight",
    "Material.006": "Nose",
    "Material.003": "PackEyeWhite",
    "Material.002": "PackEyePupil",
}
# Colores en espacio lineal. El pelaje es gris muy oscuro y no negro puro,
# para que el sombreado conserve relieve (ver docs/investigacion.md).
COLORS = {
    "Fur": (0.016, 0.016, 0.020),
    "FurLight": (0.034, 0.033, 0.040),
    "Nose": (0.004, 0.004, 0.005),
    # Canas: el hocico casi blanco y una franja gris de transición.
    "Muzzle": (0.450, 0.445, 0.435),
    "FurGrey": (0.100, 0.099, 0.110),
    "EyeIris": (0.025, 0.011, 0.005),
    # Pupila velada, azul grisáceo, como en las fotos.
    "EyePupil": (0.180, 0.280, 0.430),
    "EyeShine": (0.900, 0.900, 0.900),
    "Collar": (0.462, 0.258, 0.807),
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
EAR_BONES = ("Ear1", "Ear2", "Ear3", "Ear4")


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--in", dest="src", required=True)
    parser.add_argument("--out", required=True)
    return parser.parse_args(argv)


def update():
    bpy.context.view_layer.update()


def smoothstep(low, high, value):
    u = min(max((value - low) / (high - low), 0.0), 1.0)
    return u * u * (3 - 2 * u)


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


def material(name):
    """El material con ese nombre; lo crea la primera vez que se pide."""
    found = bpy.data.materials.get(name)
    if found is None:
        found = bpy.data.materials.new(name)
        found.use_nodes = True
        set_color(found, COLORS[name])
    return found


def recolor(dog):
    for pack_material in dog.data.materials:
        if pack_material.name not in PACK_MATERIALS:
            raise SystemExit(f"Material inesperado en el pack: {pack_material.name}")
        pack_material.name = PACK_MATERIALS[pack_material.name]
        if pack_material.name in COLORS:
            set_color(pack_material, COLORS[pack_material.name])
    for name in ("Muzzle", "FurGrey"):
        dog.data.materials.append(material(name))


def slot(dog, name):
    return next(i for i, m in enumerate(dog.data.materials) if m.name == name)


# --------------------------------------------------------------------------- remodelado
#
# Todo en coordenadas de mundo: el perro mira hacia -Y, +Z es arriba y +X es su izquierda.
# El esqueleto no se toca, así que los clips del pack siguen valiendo: solo cambia la malla.

# El cuello sube en diagonal de Neck2 a la cabeza. Lo que queda por encima de él a lo largo
# de ese eje es cabeza.
NECK_ORIGIN = Vector((0.0, -1.42, 2.16))
NECK_AXIS = Vector((0.0, -0.575, 0.817))
HEAD_PIVOT = Vector((0.0, -1.62, 2.48))
HEAD_SCALE = 1.32
# Donde acaba la frente y empieza el hocico, ya con la cabeza agrandada.
STOP_Y = -2.05
MUZZLE_LENGTH = 0.72
MUZZLE_WIDTH = 1.28
SKULL_CENTER = Vector((0.0, -1.80, 2.72))
SKULL_RADIUS = 0.43
BELLY_DROP = 0.25
# El perro retratado es pequeño y el Husky es alto de patas. Al final se aplasta el modelo entero
# en vertical (ver squash()): las patas se acortan y, como el aplastamiento afecta por igual a la
# malla, al esqueleto y a los clips, los pies siguen pisando donde pisaban. Para que la cabeza y el
# tronco no queden chatos, aquí se estiran antes en la misma proporción.
SQUASH = 0.82
SPINE_Z = 1.75
# La cola del Husky sube casi vertical; se baja para que caiga hacia atrás como un plumero.
TAIL_PIVOT = Vector((0.0, 1.04, 1.97))
TAIL_DROP = math.radians(38)
TAIL_BONES = ("Tail2", "Tail3", "Tail4", "Tail5", "Tail6")

TORSO_BONES = ("Body", "Back", "Torso", "Torso2", "Torso3")
# La grupa lleva el peso de Tail1.
TRUNK_BONES = (*TORSO_BONES, "Neck1", "Neck2", "Tail1")
NECK_BONES = ("Neck1", "Neck2")
# Grupo de huesos de cada pata, con la X de su eje y la Y del centro del pie.
LEG_GROUPS = [
    (("FrontUpperLeg", "FrontLowerLeg"), ("IKFrontLeg", "FF"), 0.30, -1.13),
    (("BackUpperLeg", "BackLowerLeg"), ("IKBackLeg", "FFB"), 0.37, 0.93),
]


def headness(point):
    return smoothstep(0.12, 0.45, (point - NECK_ORIGIN).dot(NECK_AXIS))


def reshape(dog):
    """Da al Husky las proporciones del perro retratado y devuelve dónde van los ojos."""
    world = dog.matrix_world.copy()
    groups = {g.name: g.index for g in dog.vertex_groups}
    bm = bmesh.new()
    bm.from_mesh(dog.data)
    bm.transform(world)
    # El pack trae los vértices desdoblados por cara; soldados, la malla se puede cortar y rellenar.
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-4)
    layer = bm.verts.layers.deform.verify()

    def weight(vert, bones, sides=("",)):
        return sum(vert[layer].get(groups[bone + side], 0.0) for bone in bones for side in sides if bone + side in groups)

    # Orejas tiesas fuera: se borran y se tapa el hueco. Las nuevas son una pieza añadida.
    tips = [groups[f"{bone}.{side}"] for bone in EAR_BONES[1:] for side in "LR"]
    ears = [v for v in bm.verts if any(v[layer].get(g, 0.0) > 0.05 for g in tips)]
    bmesh.ops.delete(bm, geom=ears, context="VERTS")
    caps = bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)["faces"]
    for face in caps:
        face.material_index = slot(dog, "Fur")
    # Triángulos lo más regulares posible: los largos y finos brillan como una raya.
    bmesh.ops.triangulate(bm, faces=caps, ngon_method="BEAUTY")
    # Lo que queda del cráneo ya no debe moverse con los huesos de las orejas.
    head_group = groups["Head"]
    for vert in bm.verts:
        weights = vert[layer]
        for bone in EAR_BONES:
            for side in "LR":
                index = groups[f"{bone}.{side}"]
                if index in weights:
                    weights[head_group] = weights.get(head_group, 0.0) + weights[index]
                    del weights[index]

    # Más caras en la cabeza: el cráneo se puede redondear y la mancha gris del hocico tiene mejor borde.
    head_edges = [e for e in bm.edges if all(headness(v.co) > 0.05 for v in e.verts)]
    bmesh.ops.subdivide_edges(bm, edges=head_edges, cuts=1, use_grid_fill=True)
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3])

    for vert in bm.verts:
        p = vert.co.copy()

        # Cabeza más grande en proporción al cuerpo, como en un perro pequeño.
        head = headness(p)
        p = HEAD_PIVOT + (p - HEAD_PIVOT) * (1 + (HEAD_SCALE - 1) * head)
        if head > 0:
            # Hocico más corto y más ancho.
            muzzle = smoothstep(0.0, 0.22, STOP_Y - p.y)
            if p.y < STOP_Y:
                p.y = STOP_Y + (p.y - STOP_Y) * MUZZLE_LENGTH
            p.x *= 1 + (MUZZLE_WIDTH - 1) * muzzle
            # Cráneo abombado: la parte de arriba se acerca a una esfera.
            dome = head * smoothstep(-0.08, 0.12, p.z - SKULL_CENTER.z) * smoothstep(-0.05, 0.12, p.y - STOP_Y)
            radial = p - SKULL_CENTER
            p += (SKULL_CENTER + radial.normalized() * SKULL_RADIUS - p) * 0.55 * dome
            # Detrás de los ojos, lo que aún queda por dentro de la esfera sale hasta su superficie:
            # si no, donde estaban las orejas tiesas se ve una hendidura.
            radial = p - SKULL_CENTER
            if radial.length < SKULL_RADIUS:
                fill = head * smoothstep(-0.16, 0.06, p.z - SKULL_CENTER.z) * smoothstep(0.02, 0.18, p.y - STOP_Y)
                p += (SKULL_CENTER + radial.normalized() * SKULL_RADIUS - p) * fill
            p.z = HEAD_PIVOT.z + (p.z - HEAD_PIVOT.z) * (1 + (1 / SQUASH - 1) * head)

        # Tronco más hondo y más ancho: el pelo de la barriga acorta las patas a la vista.
        torso = weight(vert, TORSO_BONES)
        p.z -= BELLY_DROP * torso * (1 - smoothstep(1.3, 1.95, p.z))
        p.x *= 1 + 0.12 * torso
        p.x *= 1 + 0.18 * weight(vert, NECK_BONES)
        trunk = min(weight(vert, TRUNK_BONES), 1.0) * (1 - head)
        p.z = SPINE_Z + (p.z - SPINE_Z) * (1 + (1 / SQUASH - 1) * trunk)

        tail = weight(vert, TAIL_BONES)
        if tail > 0:
            p = TAIL_PIVOT + Matrix.Rotation(-TAIL_DROP * tail, 3, "X") @ (p - TAIL_PIVOT)

        # Patas más gruesas y pies más grandes.
        for leg_bones, foot_bones, axis_x, foot_y in LEG_GROUPS:
            for side, sign in ((".L", 1), (".R", -1)):
                foot = weight(vert, foot_bones, (side,))
                leg = weight(vert, leg_bones, (side,)) + foot
                p.x = sign * axis_x + (p.x - sign * axis_x) * (1 + 0.30 * leg)
                p.y = foot_y + (p.y - foot_y) * (1 + 0.15 * foot)
        vert.co = p

    bm.normal_update()
    fur, light, nose = slot(dog, "Fur"), slot(dog, "FurLight"), slot(dog, "Nose")
    muzzle_slot, grey = slot(dog, "Muzzle"), slot(dog, "FurGrey")
    old_eyes = (slot(dog, "PackEyeWhite"), slot(dog, "PackEyePupil"))

    # Los ojos del pack marcan dónde van los nuevos; después se tapan con pelo.
    eyes = {}
    for sign in (1, -1):
        faces = [f for f in bm.faces if f.material_index in old_eyes and f.calc_center_median().x * sign > 0]
        area = sum(f.calc_area() for f in faces)
        center = sum((f.calc_center_median() * f.calc_area() for f in faces), Vector()) / area
        normal = sum((f.normal * f.calc_area() for f in faces), Vector()).normalized()
        eyes[sign] = (center, normal)
    eye_y = eyes[1][0].y
    tip_y = min(v.co.y for f in bm.faces if f.material_index == nose for v in f.verts)

    for face in bm.faces:
        center = face.calc_center_median()
        if headness(center) < 0.5:
            continue
        if face.material_index in old_eyes or (face.material_index == nose and center.y > (eye_y + tip_y) / 2):
            face.material_index = fur  # ojos del pack y su contorno
        if face.material_index == nose:
            continue
        # 0 a la altura de los ojos, 1 en la punta del hocico.
        along = (eye_y - center.y) / (eye_y - tip_y)
        bridge = face.normal.z > 0.55 and abs(center.x) < 0.11
        chin = face.normal.z < -0.3
        if along > 0.60 and not (bridge and along < 0.85) or chin and along > 0.25:
            face.material_index = muzzle_slot
        elif along > 0.36 and not bridge:
            face.material_index = grey
        elif min((center - eyes[sign][0]).length for sign in (1, -1)) < 0.14:
            face.material_index = grey  # canas alrededor de los ojos
        else:
            face.material_index = fur

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    for face in bm.faces:
        face.smooth = False
    bm.transform(world.inverted())
    bm.to_mesh(dog.data)
    bm.free()
    dog.data.update()
    return eyes


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


def catmull_rom(points, steps):
    """Curva suave que pasa por los puntos, con `steps` tramos entre cada dos."""
    out = []
    padded = [points[0], *points, points[-1]]
    for i in range(len(points) - 1):
        p0, p1, p2, p3 = padded[i:i + 4]
        for step in range(steps):
            t = step / steps
            out.append(0.5 * (
                2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t ** 3
            ))
    out.append(points[-1])
    return out


# Oreja izquierda desde su arranque en el cráneo: (hacia fuera, hacia atrás, hacia arriba) y ancho.
# Nace arriba, dentro de la cúpula del cráneo, baja pegada a ella y cuelga hasta la altura de la
# mandíbula. Si saliera de golpe por el costado, entre la cúpula y la oreja quedaría una hendidura.
EAR_PATH = [
    ((-0.19, 0.00, 0.205), 0.22),
    ((-0.07, 0.00, 0.112), 0.30),
    ((0.02, 0.00, -0.012), 0.38),
    ((0.09, 0.00, -0.14), 0.42),
    ((0.12, -0.02, -0.31), 0.45),
    ((0.11, -0.04, -0.48), 0.43),
    ((0.09, -0.06, -0.62), 0.26),
]
# La oreja no cuelga de canto: su cara ancha mira hacia fuera y algo hacia delante, así se ve
# tanto de frente como de perfil. Este es el eje de su ancho para la oreja izquierda.
EAR_ACROSS = Vector((0.6, 0.8, 0.0))
# En qué punto del recorrido (0 a 1) queda cada hueso de la oreja.
EAR_BONES_AT = (0.32, 0.52, 0.70, 0.87)
# Hasta aquí la oreja es raíz: va fija al cráneo y no se mueve con sus huesos.
EAR_ROOT = 0.20


class Extras:
    """Piezas añadidas, en una malla aparte que al final se une a la del perro."""

    def __init__(self, dog):
        self.dog = dog
        self.bm = bmesh.new()
        self.slots = []
        self.weights = []  # (vértice, hueso, peso)
        self.outward = []  # (caras, dirección) de las piezas abiertas, para orientarlas a mano
        self.points = world_vertices(dog)
        self.tree = kdtree.KDTree(len(self.points))
        for index, point in enumerate(self.points):
            self.tree.insert(point, index)
        self.tree.balance()
        self.skin = bvhtree.BVHTree.FromPolygons(self.points, [tuple(p.vertices) for p in dog.data.polygons])
        self.group_names = {g.index: g.name for g in dog.vertex_groups}

    def paint(self, faces, name):
        if name not in self.slots:
            self.slots.append(name)
        for face in faces:
            face.material_index = self.slots.index(name)

    def bind(self, verts, bones):
        """Peso de los vértices: un hueso, o un reparto {hueso: peso}."""
        if isinstance(bones, str):
            bones = {bones: 1.0}
        for vert in verts:
            for bone, value in bones.items():
                self.weights.append((vert, bone, value))

    def skin_at(self, point):
        """Los pesos del vértice del perro más cercano: la pieza se moverá con esa zona."""
        _co, index, _distance = self.tree.find(point)
        return {self.group_names[g.group]: g.weight for g in self.dog.data.vertices[index].groups if g.weight > 0.01}

    def surface(self, x, z, front, near=0.14):
        """Y de la superficie del perro en (x, z): la de delante o la de detrás."""
        ys = [p.y for p in self.points if abs(p.x - x) < near and abs(p.z - z) < near]
        if not ys:
            raise SystemExit(f"No hay malla cerca de x={x:.2f}, z={z:.2f}")
        return min(ys) if front else max(ys)

    def tuft(self, base, direction, length, side, width, thickness, name, bones=None):
        """Mechón: una púa aplastada que sale de `base`."""
        direction = direction.normalized()
        side = (side - direction * side.dot(direction)).normalized()
        normal = direction.cross(side)
        corners = [
            base + side * width / 2, base + normal * thickness, base - side * width / 2, base - normal * thickness,
        ]
        verts = [self.bm.verts.new(p) for p in corners]
        tip = self.bm.verts.new(base + direction * length)
        faces = [self.bm.faces.new((verts[i], verts[(i + 1) % 4], tip)) for i in range(4)]
        faces.append(self.bm.faces.new(verts))
        self.paint(faces, name)
        self.bind([*verts, tip], bones or self.skin_at(base))

    def ear(self, attach, sign):
        """Oreja caída: una lámina con algo de grosor que sigue EAR_PATH. Devuelve dónde van sus huesos."""
        def mirrored(offset):
            return Vector((offset[0] * sign, offset[1], offset[2] / SQUASH))

        steps = 2
        path = catmull_rom([attach + mirrored(offset) for offset, _ in EAR_PATH], steps)
        widths = catmull_rom([Vector((width, 0.0, 0.0)) for _, width in EAR_PATH], steps)
        hanging = Vector((EAR_ACROSS.x * sign, EAR_ACROSS.y, 0.0)).normalized()
        rows = []
        for i, center in enumerate(path):
            fraction = i / (len(path) - 1)
            # La raíz va tumbada sobre el cráneo, de delante a atrás y casi sin grosor; al colgar
            # gira hacia fuera y engorda.
            free = smoothstep(EAR_ROOT, 0.5, fraction)
            back = Vector((0.0, 1.0, 0.0)).lerp(hanging, free).normalized()
            tangent = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
            normal = tangent.cross(back).normalized() * sign  # hacia fuera
            half = widths[i].x / 2
            thickness = 0.09 * smoothstep(0.0, 0.4, fraction)
            # (posición, altura sobre la piel) de los cuatro vértices de la sección.
            section = [
                (center - back * half, -0.02), (center + normal * thickness, thickness),
                (center + back * half, -0.02), (center - normal * 0.03, -0.03),
            ]
            # La raíz se ciñe a la piel del cráneo: nace a ras de ella y se va despegando.
            hug = 1 - free
            row = []
            for point, height in section:
                if hug > 0:
                    on_skin, skin_normal, _index, _distance = self.skin.find_nearest(point)
                    point = point.lerp(on_skin + skin_normal * height, hug)
                row.append(self.bm.verts.new(point))
            rows.append(row)
            self.bind(row, self.ear_weights(fraction, sign))
        back = hanging
        faces = [self.bm.faces.new(rows[0]), self.bm.faces.new(rows[-1])]
        for a, b in zip(rows, rows[1:]):
            for k in range(4):
                faces.append(self.bm.faces.new((a[k], a[(k + 1) % 4], b[(k + 1) % 4], b[k])))
        self.paint(faces, "Fur")

        # Flecos: el pelo largo y ondulado que cuelga del borde.
        side = ".L" if sign > 0 else ".R"
        down = Vector((0.0, 0.0, -1.0))
        for row_index, shift, lean, length in ((-4, 0.9, 0.5, 0.14), (-3, -0.9, -0.35, 0.13), (-2, 0.8, 0.4, 0.16),
                                               (-1, -0.5, -0.2, 0.17), (-1, 0.5, 0.25, 0.15)):
            row = rows[row_index]
            center = (row[0].co + row[2].co) / 2 + (row[1].co - row[3].co) * 0.3
            half = (row[2].co - row[0].co).length / 2
            self.tuft(center + back * shift * half * 0.8, down + back * lean, length, back, 0.22, 0.04,
                      "FurLight", {f"Ear4{side}": 1.0})

        fractions = [i / (len(path) - 1) for i in range(len(path))]
        bones = {}
        for bone, at in zip(EAR_BONES, EAR_BONES_AT):
            index = min(range(len(path)), key=lambda i: abs(fractions[i] - at))
            bones[f"{bone}{side}"] = path[index]
        return bones

    @staticmethod
    def ear_weights(fraction, sign):
        """Reparte cada fila de la oreja entre los dos huesos que tiene más cerca."""
        side = ".L" if sign > 0 else ".R"
        if fraction <= EAR_ROOT:
            return {"Head": 1.0}
        if fraction <= EAR_BONES_AT[0]:
            u = (fraction - EAR_ROOT) / (EAR_BONES_AT[0] - EAR_ROOT)
            return {"Head": 1 - u, f"Ear1{side}": u}
        for k in range(len(EAR_BONES) - 1):
            low, high = EAR_BONES_AT[k], EAR_BONES_AT[k + 1]
            if fraction <= high:
                u = (fraction - low) / (high - low)
                return {f"{EAR_BONES[k]}{side}": 1 - u, f"{EAR_BONES[k + 1]}{side}": u}
        return {f"Ear4{side}": 1.0}

    def eye(self, center, normal, radius, segments=12):
        """Ojo grande y redondo: cerco negro, iris marrón, pupila velada y un brillo."""
        up = Vector((0.0, 0.0, 1.0))
        up = (up - normal * up.dot(normal)).normalized()
        right = up.cross(normal)
        up = up / SQUASH  # para que siga redondo después de squash()

        def ring(scale, height):
            return [
                self.bm.verts.new(center + (right * math.cos(a) + up * math.sin(a)) * radius * scale + normal * height)
                for a in (2 * math.pi * i / segments for i in range(segments))
            ]

        def band(inner, outer):
            return [
                self.bm.faces.new((outer[i], outer[(i + 1) % segments], inner[(i + 1) % segments], inner[i]))
                for i in range(segments)
            ]

        skirt, rim, iris = ring(1.16, -0.06), ring(1.0, 0.0), ring(0.45, 0.014)
        top = self.bm.verts.new(center + normal * 0.02)
        pupil = [self.bm.faces.new((iris[i], iris[(i + 1) % segments], top)) for i in range(segments)]
        lid, brown = band(rim, skirt), band(iris, rim)
        spot = center + (right * 0.30 + up * 0.38) * radius + normal * 0.028
        shine_verts = [
            self.bm.verts.new(spot + (right * dx + up * dy) * radius * 0.2)
            for dx, dy in ((1, 0), (0, 1), (-1, 0), (0, -1))
        ]
        shine = [self.bm.faces.new(shine_verts)]
        self.paint(lid, "Nose")
        self.paint(brown, "EyeIris")
        self.paint(pupil, "EyePupil")
        self.paint(shine, "EyeShine")
        self.bind([*skirt, *rim, *iris, top, *shine_verts], "Head")
        # Es una pieza abierta: el cálculo automático de normales podría dejarla del revés.
        self.outward.append(([*lid, *brown, *pupil, *shine], normal))

    def join(self):
        bm = self.bm
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        for faces, direction in self.outward:
            for face in faces:
                face.normal_update()
                if face.normal.dot(direction) < 0:
                    face.normal_flip()
        for face in bm.faces:
            face.smooth = False

        mesh = bpy.data.meshes.new("DogExtras")
        bm.verts.index_update()
        weights = [(vert.index, bone, value) for vert, bone, value in self.weights]
        bm.to_mesh(mesh)
        bm.free()
        for name in self.slots:
            mesh.materials.append(material(name))

        extras = bpy.data.objects.new("DogExtras", mesh)
        bpy.context.scene.collection.objects.link(extras)
        for index, bone, value in weights:
            group = extras.vertex_groups.get(bone) or extras.vertex_groups.new(name=bone)
            group.add([index], value, "REPLACE")

        dog = self.dog
        with bpy.context.temp_override(
            active_object=dog, object=dog, selected_objects=[dog, extras], selected_editable_objects=[dog, extras]
        ):
            bpy.ops.object.join()
            bpy.ops.object.material_slot_remove_unused()


def build_extras(armature, dog, section, eyes):
    """Orejas, ojos, mechones, collar, chapa y lengua. Devuelve dónde van los huesos de las orejas."""
    center, axis, side, front, radius_side, radius_front = section
    extras = Extras(dog)
    bm = extras.bm
    x_axis = Vector((1.0, 0.0, 0.0))
    up = Vector((0.0, 0.0, 1.0))

    collar = add_ring(bm, center, axis, side, front, radius_side + 0.012, radius_front + 0.012, 0.13, 0.05)
    extras.paint(collar, "Collar")
    extras.bind({v for f in collar for v in f.verts}, "Neck1")

    tag_center = center + front * (radius_front + 0.075) - axis * 0.12
    tag = bmesh.ops.create_cone(
        bm, cap_ends=True, segments=10, radius1=0.085, radius2=0.085, depth=0.03,
        matrix=Matrix.Translation(tag_center) @ front.to_track_quat("Z", "Y").to_matrix().to_4x4(),
    )
    extras.paint({f for v in tag["verts"] for f in v.link_faces}, "Tag")
    extras.bind(tag["verts"], "Neck1")

    # Lengua: una lámina redondeada que asoma bajo el hocico. La app la muestra solo cuando está contento.
    head_points = [p for p in extras.points if headness(p) > 0.5]
    snout_tip = min(p.y for p in head_points)
    chin = min(p.z for p in head_points if p.y < snout_tip + 0.22)
    tongue_root = Vector((0.0, snout_tip + 0.17, chin + 0.03))
    tongue_verts = []
    tongue_faces = []
    outline = [(-0.08, 0.0), (0.08, 0.0), (0.10, 0.13), (0.07, 0.24), (0.0, 0.28), (-0.07, 0.24), (-0.10, 0.13)]
    for depth in (0.0, 0.035):
        layer = []
        for x, down in outline:
            # Cuelga hacia abajo y un poco hacia delante.
            layer.append(bm.verts.new(tongue_root + Vector((x, -down * 0.35 - depth, -down))))
        tongue_verts.append(layer)
    tongue_faces.append(bm.faces.new(tongue_verts[0]))
    tongue_faces.append(bm.faces.new(list(reversed(tongue_verts[1]))))
    count = len(outline)
    for i in range(count):
        j = (i + 1) % count
        tongue_faces.append(bm.faces.new(
            (tongue_verts[0][j], tongue_verts[0][i], tongue_verts[1][i], tongue_verts[1][j])
        ))
    extras.paint(tongue_faces, "Tongue")
    extras.bind([v for layer in tongue_verts for v in layer], "Head")

    ear_bones = {}
    for sign in (1, -1):
        eye_center, eye_normal = eyes[sign]
        # Mira un poco más al frente que el ojo del pack: de cara se le ven los dos ojos enteros.
        gaze = (eye_normal + Vector((0.0, -0.45, 0.0))).normalized()
        extras.eye(eye_center + Vector((-0.035 * sign, -0.025, 0.0)), gaze, 0.115)

        # La oreja arranca detrás del ojo y algo por encima, en el costado del cráneo.
        attach_y, attach_z = eye_center.y + 0.31, eye_center.z + 0.05
        attach_x = max(
            abs(p.x) for p in extras.points if abs(p.y - attach_y) < 0.20 and abs(p.z - attach_z) < 0.16
        )
        ear_bones.update(extras.ear(Vector((sign * attach_x, attach_y, attach_z)), sign))
        print(f"[build] ojo {sign:+d}: {tuple(round(v, 2) for v in eye_center)}, oreja en x={attach_x:.2f} y={attach_y:.2f} z={attach_z:.2f}")

    # Mancha blanca del pecho y el pelo ondulado de alrededor.
    for x, z, length, name in (
        (0.0, 1.70, 0.13, "FurGrey"), (0.06, 1.58, 0.14, "Muzzle"), (-0.06, 1.56, 0.13, "FurGrey"),
        (0.0, 1.44, 0.15, "Muzzle"), (0.05, 1.32, 0.13, "FurGrey"),
        (0.19, 1.86, 0.24, "FurLight"), (-0.19, 1.84, 0.24, "FurLight"),
        (0.24, 1.62, 0.26, "FurLight"), (-0.24, 1.60, 0.26, "FurLight"),
        (0.14, 1.36, 0.24, "FurLight"), (-0.14, 1.38, 0.24, "FurLight"),
    ):
        base = Vector((x, extras.surface(x, z, front=True) + 0.04, z))
        extras.tuft(base, Vector((x * 0.5, -0.45, -0.9)), length, x_axis, 0.20, 0.05, name)

    # Flecos detrás de las patas.
    for sign in (1, -1):
        for x, z, length, y_low, y_high in ((0.30, 0.98, 0.22, -1.4, -0.6), (0.30, 0.74, 0.20, -1.4, -0.6),
                                            (0.30, 0.50, 0.16, -1.4, -0.6),
                                            (0.37, 1.45, 0.30, 0.4, 1.6), (0.37, 1.22, 0.28, 0.4, 1.6)):
            ys = [p.y for p in extras.points
                  if abs(p.x - sign * x) < 0.16 and abs(p.z - z) < 0.10 and y_low < p.y < y_high]
            base = Vector((sign * x, max(ys) - 0.04, z))
            extras.tuft(base, Vector((0.0, 0.6, -0.8)), length, up, 0.18, 0.04, "FurLight")

    # Cola de plumero: flecos largos por debajo, de la base a la punta.
    tail = [bone_head(armature, f"Tail{i}") for i in range(1, 7)]
    tail.append(tail[-1] + (tail[-1] - tail[-2]).normalized() * 0.22)
    for i, length in enumerate((0.22, 0.32, 0.40, 0.42, 0.36, 0.26)):
        along = (tail[i + 1] - tail[i]).normalized()
        under = Vector((0.0, along.z, -along.y))  # hacia atrás y abajo
        for at, scale in ((0.2, 0.85), (0.7, 1.0)):
            base = tail[i].lerp(tail[i + 1], at) + under * 0.03
            extras.tuft(base, under * 0.85 + along * 0.5, length * scale, along, 0.30, 0.055, "Fur",
                        {f"Tail{i + 1}": 1.0})

    extras.join()
    return ear_bones


def squash(armature):
    """Aplasta el modelo entero en vertical desde su nodo raíz."""
    root = armature
    while root.parent:
        root = root.parent
    root.matrix_world = Matrix.Diagonal((1.0, 1.0, SQUASH, 1.0)) @ root.matrix_world
    update()


def lower_tail_bones(armature):
    """Gira los huesos de la cola lo mismo que reshape() ha girado su malla."""
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode="EDIT")
    turn = Matrix.Translation(TAIL_PIVOT) @ Matrix.Rotation(-TAIL_DROP, 4, "X") @ Matrix.Translation(-TAIL_PIVOT)
    turn = armature.matrix_world.inverted() @ turn @ armature.matrix_world
    for name in TAIL_BONES:
        bone = armature.data.edit_bones[name]
        bone.use_connect = False
        bone.transform(turn)
    bpy.ops.object.mode_set(mode="OBJECT")


def move_ear_bones(armature, positions):
    """Lleva los huesos de las orejas a las orejas nuevas y los cuelga de la cabeza.

    Solo se trasladan: conservan su orientación, así que los giros que traen los clips siguen valiendo.
    """
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode="EDIT")
    to_armature = armature.matrix_world.inverted()
    bones = armature.data.edit_bones
    for name, point in positions.items():
        bone = bones[name]
        bone.use_connect = False
        bone.translate(to_armature @ point - bone.head)
    for side in "LR":
        bones[f"Ear1.{side}"].parent = bones["Head"]
    bpy.ops.object.mode_set(mode="OBJECT")


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
    "body.dz": -0.70,
    "FL.dy": -0.55, "FR.dy": -0.55, "FL.dz": -0.05, "FR.dz": -0.05,
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

# En brazos: colgado de la nuca y pensado para verse de frente, como un cachorro al que
# sostienen en alto de cara a ti. Cuerpo casi vertical, barriga hacia delante y patas sueltas.
CARRY = expand({
    "body.pitch": 62.0,
    # El cuello se dobla hacia delante para que mire al frente y no al cielo.
    # Neck1 no se toca: lleva el collar.
    "Neck2.pitch": -20.0, "Neck3.pitch": -20.0, "Head.pitch": -15.0,
    "BackLeg.*.pitch": -35.0,
    # Las patas caen flojas, con los dedos hacia abajo.
    "IKFrontLeg.*.pitch": -50.0, "IKBackLeg.*.pitch": -35.0,
})

# Dónde cuelga cada pie respecto al arranque de su pata (hombro o rodilla), en unidades de mundo.
# Las delanteras caen por delante del pecho y las traseras algo abiertas: de frente se ven las cuatro.
HANG = {
    "FL": Vector((0.07, -0.28, -0.95)),
    "FR": Vector((-0.07, -0.28, -0.95)),
    "BL": Vector((0.16, -0.05, -0.95)),
    "BR": Vector((-0.16, -0.05, -0.95)),
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
    """Pataleo en el aire, como un cachorro al que levantan: las patas se alternan.

    Visto de frente lo que se aprecia es el sube y baja y el vaivén lateral, así que el
    movimiento va sobre todo en esos dos ejes.
    """
    swing = math.sin(2 * math.pi * time / 1.2)
    lift = math.cos(2 * math.pi * time / 1.2)
    return {
        "FL.dz": 0.10 * swing, "FL.dx": 0.03 * lift,
        "FR.dz": -0.10 * swing, "FR.dx": 0.03 * lift,
        "BL.dz": -0.12 * swing, "BL.dx": 0.05 * lift,
        "BR.dz": 0.12 * swing, "BR.dx": 0.05 * lift,
        "Head.roll": 5.0 * swing,
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
    eyes = reshape(dog)
    lower_tail_bones(armature)
    section = neck_section(armature, dog)
    move_ear_bones(armature, build_extras(armature, dog, section, eyes))
    add_nape_bone(armature, nape_point(section))

    for bone in armature.pose.bones:
        bone.rotation_mode = "QUATERNION"
    rig = Rig(armature)
    for clip in CLIPS:
        action = bake_clip(rig, clip, fps)
        print(f"[build] clip {action.name}: {round(clip['duration'] * fps) + 1} fotogramas")
    stack_in_nla(armature)
    squash(armature)

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
