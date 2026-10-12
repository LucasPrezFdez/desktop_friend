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
    # Iris marrón oscuro y pupila negra; el blanco apenas asoma en las comisuras.
    "EyeIris": (0.047, 0.018, 0.007),
    "EyePupil": (0.003, 0.003, 0.004),
    "EyeWhite": (0.560, 0.530, 0.480),
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
# Tamaño final de la cabeza respecto a las medidas de abajo, que son las de referencia: se aplica
# al acabar de darle forma, así que encoge o agranda la cabeza entera sin cambiar sus proporciones.
HEAD_SIZE = 0.90
# Primer ajuste del Husky, antes de darle la forma del retrato (ver reshape): dónde acaba la
# frente y empieza el hocico, ya con la cabeza agrandada, y cuánto se acorta, ensancha y ahonda.
STOP_Y = -2.05
MUZZLE_LENGTH = 0.83
MUZZLE_WIDTH = 1.47
MUZZLE_DEPTH = 1.15
MUZZLE_TOP_Z = 2.78
# Medidas de la cabeza, sacadas de las fotos (docs/decisiones/0018, revisiones 4 y 8) y expresadas
# respecto al ancho del cráneo. Son las de la forma final, la que queda después de squash().
SKULL_WIDTH = 0.90
# El cráneo, visto de frente, es un arco ancho y rebajado: casi plano arriba y con las esquinas
# llenas. Se modela como un elipsoide de sección cuadrada redondeada; cuanto mayor es
# SKULL_SQUARENESS, más llenas las esquinas (2 sería una elipse).
SKULL_CENTER = Vector((0.0, -1.78, 2.72))
# Semiejes: medio ancho, fondo y alto. El fondo es distinto hacia delante (la frente) que hacia
# atrás (la nuca): con una frente tan abultada como la nuca, el perro salía frentón. Con el alto
# de 0,42 la coronilla queda 0,45 anchos de cráneo por encima de los ojos (en las fotos, 0,50).
SKULL_RADII = Vector((SKULL_WIDTH / 2, 0.50, 0.42))
SKULL_FRONT = 0.34
SKULL_SQUARENESS = 4.0
# El cráneo va inclinado hacia atrás: la frente sube tendida desde los ojos y lo más alto de la
# cabeza queda entre las orejas, no encima de los ojos.
SKULL_TILT = math.radians(24)
SKULL_TO_LOCAL = Matrix.Rotation(SKULL_TILT, 3, "X")
# Altura de la coronilla sobre el centro del cráneo, ya con la inclinación.
SKULL_TOP = math.hypot(SKULL_RADII.z * math.cos(SKULL_TILT), SKULL_RADII.y * math.sin(SKULL_TILT))
# Arista más larga que se admite en la cabeza antes de darle forma, en unidades del Husky.
SKULL_EDGE = 0.07
# Pasadas para repartir los vértices por la superficie de la cabeza.
HEAD_RELAX = 4
# El resto de la cabeza son volúmenes redondeados que se funden con el cráneo (ver head_field):
# la malla del Husky se lleva entera a esa superficie. Centros y radios en las mismas unidades.
# Quijada: rellena la cara por debajo de los ojos y por detrás del hocico.
JAW_CENTER = Vector((0.0, -1.80, 2.47))
JAW_RADII = Vector((0.36, 0.30, 0.28))
# Hocico: un cono redondeado que se estrecha del stop a la punta.
MUZZLE_BASE = Vector((0.0, -2.00, 2.41))
MUZZLE_BASE_RADIUS = 0.25
MUZZLE_END = Vector((0.0, -2.32, 2.40))
MUZZLE_END_RADIUS = 0.20
# Es más ancho que alto.
MUZZLE_WIDE = 1.32
# Canas del hocico: es casi blanco por delante y por debajo de un plano inclinado que pasa por
# MUZZLE_WHITE_AT, y gris hasta otro plano paralelo, más atrás. Al estar inclinados, la barbilla
# es blanca hasta la comisura. Por encima de MUZZLE_WHITE_TOP no hay canas: la caña es negra
# hasta la trufa.
MUZZLE_WHITE_AT = Vector((0.0, -2.30, 2.42))
MUZZLE_GREY_AT = Vector((0.0, -2.20, 2.42))
MUZZLE_WHITE_TOWARDS = Vector((0.0, -1.0, -0.6)).normalized()
MUZZLE_WHITE_TOP = 2.55
# Belfos: dos almohadillas a los lados de la trufa.
LIP_CENTER = Vector((0.13, -2.37, 2.34))
LIP_RADIUS = 0.16
# Arcos de las cejas: dos bultos sobre los ojos con un surco en medio. Cada uno se apoya en el
# cráneo, en el punto más cercano a BROW_AT, y sobresale BROW_OUT.
BROW_AT = Vector((0.20, -2.30, 3.00))
BROW_RADII = Vector((0.15, 0.12, 0.12))
BROW_OUT = 0.05
# La trufa: lo que asoma de este elipsoide mide unos 0,31 anchos de cráneo de ancho.
NOSE_CENTER = Vector((0.0, -2.475, 2.52))
NOSE_RADII = Vector((0.16, 0.075, 0.10))
# Los ojos quedan poco por encima del centro del cráneo; entre sus centros hay 0,67 anchos de cráneo.
EYE_X = 0.67 * SKULL_WIDTH / 2
EYE_Z = SKULL_CENTER.z + 0.025
EYE_RADIUS = 0.17 * SKULL_WIDTH / 2
# Dentro del ojo, en radios: hasta dónde llegan la pupila y el iris, y cuánto se abre la almendra
# de los párpados hacia arriba y hacia abajo.
EYE_PUPIL = 0.42
EYE_IRIS = 0.82
EYE_OPEN_UP = 0.62
EYE_OPEN_DOWN = 0.72
# Cejas canosas: unos pocos pelos sueltos sobre cada ojo, no una línea. Cada pelo es (ángulo desde
# la comisura de fuera, separación del borde de la abertura, largo, giro hacia la sien, material);
# ángulos en grados y distancias en radios del ojo. Los dos ojos no llevan los mismos.
BROW_HAIRS = {
    1: (
        (138, 0.55, 0.42, 62, "Muzzle"), (122, 0.95, 0.38, 60, "FurGrey"), (110, 0.50, 0.55, 55, "Muzzle"),
        (98, 1.10, 0.40, 50, "Muzzle"), (86, 0.62, 0.50, 45, "FurGrey"), (72, 0.98, 0.36, 40, "Muzzle"),
        (60, 0.58, 0.44, 30, "Muzzle"),
    ),
    -1: (
        (134, 0.80, 0.40, 64, "Muzzle"), (120, 0.48, 0.50, 58, "Muzzle"), (106, 1.05, 0.36, 52, "FurGrey"),
        (94, 0.60, 0.56, 48, "Muzzle"), (80, 1.12, 0.38, 42, "Muzzle"), (68, 0.66, 0.44, 36, "FurGrey"),
        (54, 0.92, 0.34, 28, "Muzzle"),
    ),
}
BROW_WIDTH = 0.20
# Las orejas nacen en las esquinas de arriba, 0,22 anchos de cráneo por debajo de la coronilla
# (medido en el render, con el grosor de la propia oreja, quedan a unos 0,15).
EAR_SET_Y = -1.73
EAR_SET_Z = SKULL_CENTER.z + SKULL_TOP - 0.22 * SKULL_WIDTH
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


def lift(z, amount=1.0):
    """Estira en vertical lo que squash() aplastará después, para que conserve su forma."""
    return HEAD_PIVOT.z + (z - HEAD_PIVOT.z) * (1 + (1 / SQUASH - 1) * amount)


def head_point(x, y, z):
    """Pasa un punto de las medidas de la cabeza a donde queda en la malla ya terminada."""
    return HEAD_PIVOT + (Vector((x, y, lift(z))) - HEAD_PIVOT) * HEAD_SIZE


def skull_reach(rel):
    """Cuánto se aleja un punto del centro del cráneo: 1 en su superficie, menos por dentro."""
    local = SKULL_TO_LOCAL @ rel
    n = SKULL_SQUARENESS
    section = (abs(local.x / SKULL_RADII.x) ** n + abs(local.z / SKULL_RADII.z) ** n) ** (2 / n)
    depth = SKULL_FRONT if local.y < 0 else SKULL_RADII.y
    return math.sqrt(section + (local.y / depth) ** 2)


def head_measure(point):
    """Lo contrario de head_point: de la malla terminada a las medidas de la cabeza."""
    p = HEAD_PIVOT + (point - HEAD_PIVOT) / HEAD_SIZE
    p.z = HEAD_PIVOT.z + (p.z - HEAD_PIVOT.z) * SQUASH
    return p


def smooth_min(a, b, k):
    """El menor de dos, redondeando la unión en un ancho k: así se funden dos volúmenes."""
    h = max(k - abs(a - b), 0.0) / k
    return min(a, b) - h * h * k / 4


def ellipsoid(p, center, radii):
    """Distancia aproximada a un elipsoide: negativa dentro."""
    rel = p - center
    k0 = Vector((rel.x / radii.x, rel.y / radii.y, rel.z / radii.z)).length
    k1 = Vector((rel.x / radii.x ** 2, rel.y / radii.y ** 2, rel.z / radii.z ** 2)).length
    return k0 * (k0 - 1) / k1 if k1 > 1e-9 else -min(radii)


def round_cone(p, a, b, radius_a, radius_b, wide=1.0):
    """Distancia aproximada a un cono de puntas redondas, de a a b; `wide` lo ensancha en X."""
    ab = b - a
    rel = p - a
    rel.x /= wide
    t = max(0.0, min(1.0, rel.dot(ab) / ab.length_squared))
    return (rel - ab * t).length - (radius_a + (radius_b - radius_a) * t)


def cranium_field(p):
    rel = p - SKULL_CENTER
    reach = skull_reach(rel)
    return rel.length * (1 - 1 / reach) if reach > 1e-6 else -SKULL_RADII.z


def to_surface(field, p, steps=12):
    """Lleva un punto a la superficie de un campo (donde vale 0), bajando por su pendiente."""
    p = p.copy()
    e = 2e-3
    for _ in range(steps):
        d = field(p)
        if abs(d) < 1e-4:
            break
        slope = Vector((
            field(p + Vector((e, 0, 0))) - field(p - Vector((e, 0, 0))),
            field(p + Vector((0, e, 0))) - field(p - Vector((0, e, 0))),
            field(p + Vector((0, 0, e))) - field(p - Vector((0, 0, e))),
        )) / (2 * e)
        if slope.length_squared < 1e-9:
            break
        p -= slope * (d / slope.length_squared)
    return p


def mirror_x(point, sign):
    return Vector((point.x * sign, point.y, point.z))


def brow_center(sign):
    """Centro de un arco de ceja: hundido en el cráneo hasta que solo asome BROW_OUT."""
    on_skull = to_surface(cranium_field, mirror_x(BROW_AT, sign))
    inward = (SKULL_CENTER - on_skull).normalized()
    return on_skull + inward * (BROW_RADII.y - BROW_OUT)


BROW_CENTERS = [brow_center(sign) for sign in (1, -1)]


def head_field(p):
    """La forma de la cabeza: distancia aproximada a su superficie, negativa dentro."""
    d = smooth_min(cranium_field(p), ellipsoid(p, JAW_CENTER, JAW_RADII), 0.12)
    d = smooth_min(d, round_cone(p, MUZZLE_BASE, MUZZLE_END, MUZZLE_BASE_RADIUS, MUZZLE_END_RADIUS, MUZZLE_WIDE), 0.10)
    for center in BROW_CENTERS:
        d = smooth_min(d, ellipsoid(p, center, BROW_RADII), 0.04)
    for sign in (1, -1):
        d = smooth_min(d, (p - mirror_x(LIP_CENTER, sign)).length - LIP_RADIUS, 0.06)
    return smooth_min(d, ellipsoid(p, NOSE_CENTER, NOSE_RADII), 0.03)


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
    # En la cabeza se sigue cortando toda arista larga. El relleno de las orejas deja triángulos
    # enormes y, con pocos vértices, las curvas se quedarían en líneas rectas.
    for _ in range(6):
        long_edges = [
            e for e in bm.edges
            if e.calc_length() > SKULL_EDGE and all(headness(v.co) > 0.6 for v in e.verts)
        ]
        if not long_edges:
            break
        bmesh.ops.subdivide_edges(bm, edges=long_edges, cuts=1, use_grid_fill=True)
        bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3])
    # Reparte mejor los triángulos: los muy afilados se sombrean como rayas oscuras.
    skull_faces = [f for f in bm.faces if all(headness(v.co) > 0.6 for v in f.verts)]
    skull_edges = {e for f in skull_faces for e in f.edges if all(face in skull_faces for face in e.link_faces)}
    bmesh.ops.beautify_fill(bm, faces=skull_faces, edges=list(skull_edges))

    # La cabeza, en dos pasos. Primero se acerca el Husky a las proporciones del retrato, para que
    # cada vértice caiga cerca de donde le toca; después se lleva a la superficie de head_field.
    heads, shaped = {}, {}
    for vert in bm.verts:
        head = headness(vert.co)
        heads[vert] = head
        if head <= 0:
            continue
        # Cabeza más grande en proporción al cuerpo, como en un perro pequeño.
        p = HEAD_PIVOT + (vert.co - HEAD_PIVOT) * (1 + (HEAD_SCALE - 1) * head)
        # Hocico más corto y más ancho.
        muzzle = smoothstep(0.0, 0.22, STOP_Y - p.y)
        if p.y < STOP_Y:
            p.y = STOP_Y + (p.y - STOP_Y) * MUZZLE_LENGTH
        p.x *= 1 + (MUZZLE_WIDTH - 1) * muzzle
        p.z = MUZZLE_TOP_Z + (p.z - MUZZLE_TOP_Z) * (1 + (MUZZLE_DEPTH - 1) * muzzle)
        shaped[vert] = p.lerp(to_surface(head_field, p), head)
    # Los vértices se reparten por la superficie: amontonados dan triángulos afilados.
    whole = [v for v in shaped if heads[v] >= 1.0]
    for _ in range(HEAD_RELAX):
        spread = {}
        for vert in whole:
            around = [shaped[e.other_vert(vert)] for e in vert.link_edges if e.other_vert(vert) in shaped]
            middle = sum(around, Vector()) / len(around)
            spread[vert] = to_surface(head_field, shaped[vert].lerp(middle, 0.5), steps=4)
        shaped.update(spread)

    for vert in bm.verts:
        p = vert.co.copy()
        head = heads[vert]
        if head > 0:
            p = shaped[vert]
            p.z = lift(p.z, head)
            p = HEAD_PIVOT + (p - HEAD_PIVOT) * (1 + (HEAD_SIZE - 1) * head)

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

    # Los ojos van donde digan EYE_X y EYE_Z, sobre la piel: se busca lanzando un rayo desde delante.
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    skin = bvhtree.BVHTree.FromBMesh(bm)
    eyes = {}
    for sign in (1, -1):
        origin = head_point(sign * EYE_X, 0.0, EYE_Z)
        origin.y = -5.0
        center, normal, _index, _distance = skin.ray_cast(origin, Vector((0.0, 1.0, 0.0)))
        if center is None:
            raise SystemExit("No se encontró la piel donde va el ojo")
        eyes[sign] = (center, normal)

    # Las canas del hocico acaban en planos. La malla se corta por ellos: si no, el borde de cada
    # mancha sale en dientes de sierra.
    def beyond(point, plane):
        at, towards = plane
        return (head_measure(point) - at).dot(towards) > 0

    white, grey_band = (MUZZLE_WHITE_AT, MUZZLE_WHITE_TOWARDS), (MUZZLE_GREY_AT, MUZZLE_WHITE_TOWARDS)
    below_bridge = (Vector((0.0, 0.0, MUZZLE_WHITE_TOP)), Vector((0.0, 0.0, -1.0)))
    for at, towards in (white, grey_band, below_bridge):
        head_faces = [f for f in bm.faces if all(headness(v.co) > 0.5 for v in f.verts)]
        geom = list({*head_faces, *(e for f in head_faces for e in f.edges), *(v for f in head_faces for v in f.verts)})
        # La normal del plano, pasada de las medidas de la cabeza a la malla estirada.
        normal = Vector((towards.x, towards.y, towards.z * SQUASH)).normalized()
        bmesh.ops.bisect_plane(bm, geom=geom, dist=1e-4, plane_co=head_point(*at), plane_no=normal)
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3])
    bm.normal_update()

    for face in bm.faces:
        center = face.calc_center_median()
        if headness(center) < 0.5:
            continue
        # La trufa es lo que queda dentro de su elipsoide; la del Husky y sus ojos se repintan.
        if ellipsoid(head_measure(center), NOSE_CENTER, NOSE_RADII) < 0.012:
            face.material_index = nose
        elif beyond(center, white) and beyond(center, below_bridge):
            face.material_index = muzzle_slot
        elif beyond(center, grey_band) and beyond(center, below_bridge):
            face.material_index = grey
        else:
            face.material_index = fur

    # Los triángulos casi sin área se sombrean como manchas oscuras.
    bmesh.ops.dissolve_degenerate(bm, dist=0.012, edges=[e for e in bm.edges if all(headness(v.co) > 0.3 for v in e.verts)])
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3])

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
# Nace dentro de la esquina de arriba del cráneo, sale hacia fuera y hacia abajo siguiendo su curva
# y cuelga hasta la altura de la boca. Vista de frente, la línea de la coronilla a la oreja es un
# solo arco, sin entrante; lo más ancho queda poco por debajo de los ojos.
EAR_PATH = [
    ((-0.10, 0.00, 0.06), 0.16),
    ((0.00, 0.00, 0.00), 0.20),
    ((0.06, 0.00, -0.09), 0.24),
    ((0.10, 0.00, -0.18), 0.34),
    ((0.16, -0.01, -0.29), 0.40),
    ((0.18, -0.02, -0.42), 0.42),
    ((0.16, -0.04, -0.56), 0.36),
    ((0.13, -0.05, -0.68), 0.16),
]
# La oreja no cuelga de canto: su cara ancha mira hacia fuera y algo hacia delante, así se ve
# tanto de frente como de perfil. Este es el eje de su ancho para la oreja izquierda.
EAR_ACROSS = Vector((0.8, 0.6, 0.0))
# En qué punto del recorrido (0 a 1) queda cada hueso de la oreja.
EAR_BONES_AT = (0.22, 0.45, 0.66, 0.85)
# Hasta aquí la oreja es raíz: va fija al cráneo y no se mueve con sus huesos.
EAR_ROOT = 0.12


def eye_axes(normal):
    """Ejes del plano del ojo: hacia la derecha y hacia arriba."""
    up = Vector((0.0, 0.0, 1.0))
    up = (up - normal * up.dot(normal)).normalized()
    right = up.cross(normal)
    return right, up / SQUASH  # para que siga redondo después de squash()


def eye_opening(angle, radius):
    """Hasta dónde llega la abertura del ojo en esa dirección: una almendra, más cerrada por arriba."""
    tall = EYE_OPEN_UP if math.sin(angle) > 0 else EYE_OPEN_DOWN
    return radius / (abs(math.cos(angle)) ** 1.6 + abs(math.sin(angle) / tall) ** 1.6) ** (1 / 1.6)


class Extras:
    """Piezas añadidas, en una malla aparte que al final se une a la del perro."""

    def __init__(self, dog):
        self.dog = dog
        self.bm = bmesh.new()
        self.slots = []
        self.weights = []  # (vértice, hueso, peso)
        self.outward = []  # (caras, dirección) de las piezas abiertas, para orientarlas a mano
        self.smooth = set()  # caras que se sombrean lisas; el resto, planas
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
            return Vector((offset[0] * sign, offset[1], offset[2] / SQUASH)) * HEAD_SIZE

        steps = 2
        path = catmull_rom([attach + mirrored(offset) for offset, _ in EAR_PATH], steps)
        widths = catmull_rom([Vector((width, 0.0, 0.0)) for _, width in EAR_PATH], steps)
        hanging = Vector((EAR_ACROSS.x * sign, EAR_ACROSS.y, 0.0)).normalized()
        rows = []
        for i, center in enumerate(path):
            fraction = i / (len(path) - 1)
            # La raíz va tumbada sobre el cráneo, de delante a atrás y casi sin grosor; al colgar
            # gira hacia fuera y engorda.
            free = smoothstep(0.05, 0.32, fraction)
            back = Vector((0.0, 1.0, 0.0)).lerp(hanging, free).normalized()
            tangent = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
            normal = tangent.cross(back).normalized() * sign  # hacia fuera
            half = widths[i].x * HEAD_SIZE / 2
            thickness = 0.09 * HEAD_SIZE * smoothstep(-0.10, 0.25, fraction)
            # (posición, altura sobre la piel) de los cuatro vértices de la sección.
            section = [
                (center - back * half, -0.02), (center + normal * thickness, thickness),
                (center + back * half, -0.02), (center - normal * 0.03, -0.03),
            ]
            # La raíz se ciñe a la piel del cráneo: nace a ras de ella y se va despegando. El borde de
            # delante y la cara de dentro siguen pegados casi hasta la punta, a lo largo de la sien
            # y la mejilla: si se despegan, entre la oreja y la cara queda una rendija por la que
            # se ve el fondo.
            loose = 1 - free
            held = 1 - smoothstep(0.72, 0.96, fraction)
            row = []
            for (point, height), hug in zip(section, (held, loose, loose, held)):
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
        for row_index, shift, lean, length in ((-4, 0.9, 0.5, 0.10), (-3, -0.9, -0.35, 0.09), (-2, 0.8, 0.4, 0.11),
                                               (-1, -0.5, -0.2, 0.11), (-1, 0.5, 0.25, 0.10)):
            row = rows[row_index]
            center = (row[0].co + row[2].co) / 2 + (row[1].co - row[3].co) * 0.3
            half = (row[2].co - row[0].co).length / 2
            self.tuft(center + back * shift * half * 0.8, down + back * lean, length * HEAD_SIZE, back, 0.20, 0.04,
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

    def eye(self, center, normal, radius, segments=16):
        """Ojo: un globo abombado (pupila negra, iris marrón oscuro y algo de blanco en las
        comisuras) que asoma por una abertura almendrada entre los párpados."""
        right, up = eye_axes(normal)
        angles = [2 * math.pi * i / segments for i in range(segments)]
        ball = 2.0 * radius
        # El borde del globo queda hundido bajo los párpados; solo asoma su parte central.
        sunk = math.sqrt(ball ** 2 - (1.1 * radius) ** 2) + 0.12 * radius

        def bulge(reach):
            """Altura del globo a esa distancia de su centro."""
            return math.sqrt(ball ** 2 - reach ** 2) - sunk

        def at(angle, reach, height):
            return center + (right * math.cos(angle) + up * math.sin(angle)) * reach + normal * height

        def band(inner, outer):
            return [
                self.bm.faces.new((outer[i], outer[(i + 1) % segments], inner[(i + 1) % segments], inner[i]))
                for i in range(segments)
            ]

        def on_ball(scale):
            return [self.bm.verts.new(at(a, radius * scale, bulge(radius * scale))) for a in angles]

        pupil_ring, iris_ring, white_ring = on_ball(EYE_PUPIL), on_ball(EYE_IRIS), on_ball(1.1)
        top = self.bm.verts.new(center + normal * bulge(0.0))
        pupil = [self.bm.faces.new((pupil_ring[i], pupil_ring[(i + 1) % segments], top)) for i in range(segments)]
        iris, white = band(pupil_ring, iris_ring), band(iris_ring, white_ring)

        # Párpados: del borde de la abertura, que se apoya en el globo, a la piel de alrededor.
        edge, rim, outer = [], [], []
        for angle in angles:
            reach = eye_opening(angle, radius)
            height = bulge(reach) + 0.04 * radius
            edge.append(self.bm.verts.new(at(angle, reach, height)))
            lid = at(angle, reach + 0.24 * radius, height * 0.5)
            on_skin, skin_normal, _index, _distance = self.skin.find_nearest(lid)
            rim.append(self.bm.verts.new(lid.lerp(on_skin + skin_normal * 0.012, 0.5)))
            halo = at(angle, reach + 0.42 * radius, 0.0)
            on_skin, skin_normal, _index, _distance = self.skin.find_nearest(halo)
            outer.append(self.bm.verts.new(on_skin + skin_normal * 0.006))
        lids, halo = band(edge, rim), band(rim, outer)

        # Dos brillos: uno grande arriba y otro pequeño enfrente.
        shine, shine_verts = [], []
        for angle, reach, size in ((2.2, 0.36, 0.17), (-0.9, 0.30, 0.08)):
            spot = at(angle, radius * reach, bulge(radius * reach) + 0.02 * radius)
            verts = [
                self.bm.verts.new(spot + (right * dx + up * dy) * radius * size)
                for dx, dy in ((1, 0), (0, 1), (-1, 0), (0, -1))
            ]
            shine.append(self.bm.faces.new(verts))
            shine_verts += verts

        self.paint(pupil, "EyePupil")
        self.paint(iris, "EyeIris")
        self.paint(white, "EyeWhite")
        self.paint(lids, "Nose")
        self.paint(halo, "FurGrey")
        self.paint(shine, "EyeShine")
        self.bind([*pupil_ring, *iris_ring, *white_ring, top, *edge, *rim, *outer, *shine_verts], "Head")
        # El globo se sombrea liso para que se vea redondo.
        self.smooth.update([*pupil, *iris, *white])
        # Es una pieza abierta: el cálculo automático de normales podría dejarla del revés.
        self.outward.append(([*pupil, *iris, *white, *lids, *halo, *shine], normal))

    def brow(self, center, normal, radius, sign):
        """Ceja canosa: unos pocos pelos sueltos, tendidos sobre la piel por encima del ojo."""
        right, up = eye_axes(normal)

        def spoke(angle):
            return right * sign * math.cos(angle) + up * math.sin(angle)

        for degrees, gap, length, sweep, name in BROW_HAIRS[sign]:
            angle = math.radians(degrees)
            along = spoke(angle - math.radians(sweep))
            across = along.cross(normal).normalized() * BROW_WIDTH * radius / 2
            base = center + spoke(angle) * (eye_opening(angle, radius) + gap * radius)
            # Raíz, mitad y punta, cada una apoyada en la piel: el pelo sigue su curva.
            verts = []
            for step, half in ((0.0, 1.0), (0.55, 0.8)):
                on_skin, skin_normal, _index, _distance = self.skin.find_nearest(base + along * length * radius * step)
                point = on_skin + skin_normal * 0.016
                verts += [self.bm.verts.new(point + across * half), self.bm.verts.new(point - across * half)]
            on_skin, skin_normal, _index, _distance = self.skin.find_nearest(base + along * length * radius)
            verts.append(self.bm.verts.new(on_skin + skin_normal * 0.016))
            faces = [self.bm.faces.new((verts[0], verts[1], verts[3], verts[2])),
                     self.bm.faces.new((verts[2], verts[3], verts[4]))]
            self.paint(faces, name)
            self.bind(verts, "Head")
            self.outward.append((faces, normal))

    def join(self):
        bm = self.bm
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        for faces, direction in self.outward:
            for face in faces:
                face.normal_update()
                if face.normal.dot(direction) < 0:
                    face.normal_flip()
        for face in bm.faces:
            face.smooth = face in self.smooth

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


def report_skull(skin):
    """Imprime el perfil del cráneo visto de frente, en anchos de cráneo, para cotejarlo con las fotos."""
    def half_width(z):
        hits = []
        for step in range(15):
            origin = head_point(0.0, SKULL_CENTER.y - 0.35 + 0.05 * step, z)
            origin.x = 3.0
            hit, _normal, _index, _distance = skin.ray_cast(origin, Vector((-1.0, 0.0, 0.0)))
            if hit is not None:
                hits.append(hit.x / HEAD_SIZE)
        return max(hits, default=0.0)

    crown = SKULL_CENTER.z + SKULL_TOP
    profile = ", ".join(
        f"{depth:.2f}: {2 * half_width(crown - depth * SKULL_WIDTH) / SKULL_WIDTH:.2f}"
        for depth in (0.05, 0.13, 0.20, 0.27, 0.37, 0.50)
    )
    print(f"[build] cabeza, ancho del cráneo según la profundidad bajo la coronilla: {profile}")


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

    report_skull(extras.skin)

    ear_bones = {}
    for sign in (1, -1):
        eye_center, eye_normal = eyes[sign]
        # Mira un poco más al frente que el ojo del pack: de cara se le ven los dos ojos enteros.
        gaze = (eye_normal + Vector((0.0, -0.45, 0.0))).normalized()
        extras.eye(eye_center, gaze, EYE_RADIUS * HEAD_SIZE)
        extras.brow(eye_center, gaze, EYE_RADIUS * HEAD_SIZE, sign)

        # La oreja arranca en la esquina de arriba del cráneo: se busca la piel lanzando un rayo
        # desde el costado.
        origin = head_point(0.0, EAR_SET_Y, EAR_SET_Z)
        origin.x = sign * 3.0
        attach, _normal, _index, _distance = extras.skin.ray_cast(origin, Vector((-sign, 0.0, 0.0)))
        if attach is None:
            raise SystemExit("No se encontró el cráneo donde nace la oreja")
        ear_bones.update(extras.ear(attach, sign))
        print(f"[build] ojo {sign:+d}: {tuple(round(v, 2) for v in eye_center)}, "
              f"oreja en {tuple(round(v, 2) for v in attach)}")

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
