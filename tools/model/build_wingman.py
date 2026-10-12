# Convierte el Wingman extraído de VALORANT en una mascota de DesktopFriend.
#
# Uso:
#   blender -b --factory-startup --python-exit-code 1 -P tools/model/build_wingman.py -- \
#       --in assets/source/riot/Wingman.glb --out tools/model/out/wingman.glb
#
# Qué hace:
#   1. Limpia el modelo: quita la malla sobrante del importador, los canales de UV y de color que
#      la app no usa, y deja una sola textura (el color).
#   2. Lo gira para que mire hacia donde mira el perro (+Z en el GLB) y separa los ojos en un
#      material propio, para que la app pueda cerrárselos.
#   3. Añade dos huesos sin malla: lo alto del casco (de ahí lo coge la mano; la app lo llama
#      nuca, como en el perro) y el centro de la cara.
#   4. Crea por código todos los clips: el fichero de origen no trae ninguna animación.
#   5. Exporta un GLB con los mismos clips que el perro (ver src/pet.ts).
#
# Requiere Blender 5.x (acciones con slots).
import argparse
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Matrix, Vector

# Materiales con los que sale el modelo. La app los sustituye por los suyos (ver src/wingman.ts).
BODY_MATERIAL = "Wingman"
EYE_MATERIAL = "WingmanEye"
# Recuadro de la textura donde están pintados los ojos (u, v con el origen abajo a la izquierda).
EYE_ISLAND = ((0.695, 0.675), (0.762, 0.782))

# (hueso superior, hueso inferior, hueso que marca el tobillo), por la clave del pie en las poses.
LEGS = {
    "LF": ("L_Upper_Leg", "L_Knee", "L_Foot"),
    "RF": ("R_Upper_Leg", "R_Knee", "R_Foot"),
}
# Huesos de los brazos: en ellos el giro se compone en otro orden (ver `rotation`).
LIMBS = {"L_Arm", "R_Arm"}
# Dónde van los huesos añadidos, en unidades de mundo con el modelo ya girado (frente en -Y).
NAPE_AT = Vector((0.0, 0.05, 0.98))
FACE_AT = Vector((0.0, -0.03, 0.90))


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--in", dest="src", required=True)
    parser.add_argument("--out", required=True)
    return parser.parse_args(argv)


# --------------------------------------------------------------------------- limpieza


def clean_scene():
    """Quita la esfera que añade el importador y gira el modelo: en el fichero mira hacia +X."""
    armature = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
    wingman = next(o for o in bpy.context.scene.objects if o.type == "MESH" and o.parent == armature)
    for obj in list(bpy.context.scene.objects):
        if obj.type == "MESH" and obj != wingman:
            bpy.data.objects.remove(obj, do_unlink=True)
    for bone in armature.pose.bones:
        bone.custom_shape = None
    wingman.name = "Wingman"
    wingman.data.name = "Wingman"
    armature.name = "WingmanArmature"
    # El frente pasa a -Y de Blender, que es +Z en el GLB: hacia donde mira el perro.
    # El importador deja el giro del objeto como cuaternión; en ese modo, rotation_euler no hace nada.
    armature.rotation_mode = "XYZ"
    armature.rotation_euler = (0.0, 0.0, -math.pi / 2)
    bpy.context.view_layer.update()
    return armature, wingman


def clean_mesh(wingman):
    """El juego trae ocho canales de UV y dos de color por vértice; la app solo usa el primer UV."""
    mesh = wingman.data
    for layer in list(mesh.uv_layers)[1:]:
        mesh.uv_layers.remove(layer)
    # Con colores por vértice, el cargador de la app teñiría la textura con ellos.
    for attribute in list(mesh.color_attributes):
        mesh.color_attributes.remove(attribute)


# --------------------------------------------------------------------------- materiales


def textured(name, image):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.use_backface_culling = True
    nodes = material.node_tree.nodes
    principled = next(n for n in nodes if n.type == "BSDF_PRINCIPLED")
    principled.inputs["Roughness"].default_value = 0.85
    principled.inputs["Metallic"].default_value = 0.0
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    material.node_tree.links.new(texture.outputs["Color"], principled.inputs["Base Color"])
    return material


def rebuild_materials(wingman):
    """Deja dos materiales con la textura de color: el cuerpo y los ojos.

    Los dos del juego usan las mismas tres texturas; la de normales y la de metal y rugosidad no
    se exportan, porque la app sombrea a su manera. Los ojos son una pieza aparte de la malla,
    con su propio trozo de textura: se reconocen por ahí y por estar en la cara.
    """
    mesh = wingman.data
    color = next(
        node.image
        for material in mesh.materials
        for node in material.node_tree.nodes
        if node.type == "TEX_IMAGE" and node.image.name.endswith("_DF")
    )
    width, height = color.size
    pixels = np.array(color.pixels[:], dtype=np.float32).reshape(height, width, 4)

    to_world = wingman.matrix_world
    uv = mesh.uv_layers[0].data
    (u0, v0), (u1, v1) = EYE_ISLAND
    eyes = []
    for polygon in mesh.polygons:
        u, v = np.mean([uv[i].uv for i in polygon.loop_indices], axis=0)
        if not (u0 < u < u1 and v0 < v < v1):
            continue
        # En ese recuadro también cae el borde de alguna placa de la armadura, que es oscura.
        r, g, b, _a = pixels[int(v * height), int(u * width)]
        center = to_world @ polygon.center
        if min(r, g, b) > 0.45 and center.y < 0.0 and center.z > 0.7:
            eyes.append(polygon.index)
    if not eyes:
        raise SystemExit("No se han encontrado las caras de los ojos")

    mesh.materials.clear()
    mesh.materials.append(textured(BODY_MATERIAL, color))
    mesh.materials.append(textured(EYE_MATERIAL, color))
    for polygon in mesh.polygons:
        polygon.material_index = 0
    for index in eyes:
        mesh.polygons[index].material_index = 1

    points = [to_world @ mesh.polygons[i].center for i in eyes]
    print(f"[build] ojos: {len(eyes)} caras, x de {min(p.x for p in points):.3f} a {max(p.x for p in points):.3f}, "
          f"z de {min(p.z for p in points):.3f} a {max(p.z for p in points):.3f}")


# --------------------------------------------------------------------------- huesos añadidos


def add_marker_bone(armature, name, point, parent):
    """Hueso sin malla que marca un punto, para que la app sepa dónde está en cualquier pose."""
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode="EDIT")
    to_armature = armature.matrix_world.inverted()
    bone = armature.data.edit_bones.new(name)
    bone.head = to_armature @ point
    bone.tail = to_armature @ (point + Vector((0.0, 0.0, 0.1)))
    bone.parent = armature.data.edit_bones[parent]
    bone.use_deform = False
    bpy.ops.object.mode_set(mode="OBJECT")


# --------------------------------------------------------------------------- poses


def expand(pose):
    """Desdobla las claves con '*' en izquierda y derecha. Giro, balanceo y desplazamiento lateral se reflejan."""
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


def rotation(pitch=0.0, yaw=0.0, roll=0.0, twist=0.0, limb=False):
    """Giro en los ejes de mundo, con el modelo en reposo (de pie, brazos en cruz, frente en -Y).

    pitch>0 levanta la cara, yaw>0 gira a su izquierda, roll>0 inclina a su izquierda.
    En un brazo, que en reposo está en cruz, roll>0 lo baja y pitch>0 lo lleva hacia delante una
    vez bajado; por eso ahí el balanceo se aplica antes que el cabeceo (`limb`). Antes de todo eso,
    twist>0 lo retuerce sobre sí mismo: la armadura, que mira hacia arriba, se vuelve hacia atrás.
    """
    rx = Matrix.Rotation(math.radians(-pitch), 4, "X")
    ry = Matrix.Rotation(math.radians(roll), 4, "Y")
    rz = Matrix.Rotation(math.radians(yaw), 4, "Z")
    if not limb:
        return rz @ ry @ rx
    return rz @ rx @ ry @ Matrix.Rotation(math.radians(-twist), 4, "X")


class Rig:
    """Coloca el esqueleto calculando a mano la cadena de huesos, en coordenadas de mundo.

    Cada giro de una pose se da en los ejes de mundo del modelo en reposo y lo arrastra el hueso
    padre: "bajar el brazo" significa lo mismo esté el cuerpo de pie o tumbado.
    """

    def __init__(self, armature):
        self.armature = armature
        # armature.pose.bones va de padres a hijos, que es el orden en que hay que encadenarlos.
        self.bones = armature.pose.bones
        to_world = armature.matrix_world
        self.rest = {bone.name: to_world @ bone.bone.matrix_local for bone in self.bones}
        self.parent = {bone.name: bone.parent.name if bone.parent else None for bone in self.bones}
        # Reposo de cada hueso visto desde su padre.
        self.local = {
            name: self.rest[parent].inverted() @ rest if parent else rest
            for name, rest in self.rest.items()
            for parent in [self.parent[name]]
        }
        self.basis = {}
        self.pose = {}

        def rest_at(name):
            return self.rest[name].translation.copy()

        self.pivots = {
            "feet": Vector((0.0, 0.0, 0.0)),
            "hips": (rest_at("L_Upper_Leg") + rest_at("R_Upper_Leg")) / 2,
            "nape": rest_at("Nape"),
        }
        self.legs = {
            key: {
                "bones": names,
                "upper_length": (rest_at(names[1]) - rest_at(names[0])).length,
                "lower_length": (rest_at(names[2]) - rest_at(names[1])).length,
                "ankle": rest_at(names[2]),
            }
            for key, names in LEGS.items()
        }

    def solve(self):
        """Recalcula dónde queda cada hueso."""
        for bone in self.bones:
            name = bone.name
            parent = self.parent[name]
            here = self.local[name] @ self.basis[name]
            self.pose[name] = self.pose[parent] @ here if parent else here

    def position(self, name):
        return self.pose[name].translation.copy()

    def turn(self, name, turn):
        """Gira un hueso alrededor de su cabeza, en ejes de mundo, sobre la pose que ya tiene."""
        axes = self.pose[name].to_3x3()
        self.basis[name] = self.basis[name] @ (axes.inverted() @ turn.to_3x3() @ axes).to_4x4()
        self.solve()

    def apply(self, pose, pivot_name, planted):
        """Coloca el esqueleto en una pose.

        Con `planted` los pies se quedan en el suelo (más lo que diga la pose) y las piernas se
        doblan lo que haga falta. Sin él, las piernas cuelgan del cuerpo y se giran como los brazos.
        """
        for bone in self.bones:
            self.basis[bone.name] = Matrix.Identity(4)

        def angles(prefix):
            return {axis: pose.get(f"{prefix}.{axis}", 0.0) for axis in ("pitch", "yaw", "roll", "twist")}

        def offset(prefix):
            return Vector([pose.get(f"{prefix}.{axis}", 0.0) for axis in ("dx", "dy", "dz")])

        # El cuerpo entero gira alrededor del punto de apoyo y después se desplaza.
        pivot = self.pivots[pivot_name]
        move = Matrix.Translation(offset("body") + pivot) @ rotation(**angles("body")) @ Matrix.Translation(-pivot)
        self.basis["Root"] = self.rest["Root"].inverted() @ move @ self.rest["Root"]

        for bone in self.bones:
            name = bone.name
            turn = angles(name)
            if name == "Root" or not any(turn.values()):
                continue
            axes = self.rest[name].to_3x3()
            self.basis[name] = (axes.inverted() @ rotation(**turn, limb=name in LIMBS).to_3x3() @ axes).to_4x4()
        self.solve()

        if planted:
            for key, leg in self.legs.items():
                self.solve_leg(leg, leg["ankle"] + offset(key))

    def solve_leg(self, leg, target):
        """Cinemática inversa de dos huesos: lleva el tobillo hasta donde debe estar el pie."""
        upper, lower, foot = leg["bones"]
        l1, l2 = leg["upper_length"], leg["lower_length"]
        root = self.position(upper)
        to_target = target - root
        # Fuera de este rango la pierna no llega (o no se puede plegar más): se queda lo más cerca posible.
        reach = min(max(to_target.length, abs(l1 - l2) * 1.02), (l1 + l2) * 0.999)
        direction = to_target.normalized()

        # La rodilla dobla siempre hacia delante (-Y de mundo).
        bend = Vector((0.0, -1.0, 0.0))
        bend -= direction * bend.dot(direction)
        if bend.length < 1e-6:
            bend = Vector((0.0, 0.0, 1.0))
        bend.normalize()
        along = (l1 * l1 - l2 * l2 + reach * reach) / (2 * reach)
        height = math.sqrt(max(l1 * l1 - along * along, 0.0))
        knee = root + direction * along + bend * height

        swing = (self.position(lower) - root).rotation_difference(knee - root)
        self.turn(upper, swing.to_matrix())
        knee = self.position(lower)
        swing = (self.position(foot) - knee).rotation_difference(root + direction * reach - knee)
        self.turn(lower, swing.to_matrix())

    def snapshot(self):
        return {name: (basis.to_translation(), basis.to_quaternion()) for name, basis in self.basis.items()}


# Poses clave, en unidades de mundo y grados. Wingman mide 1,08 unidades hasta la punta de las orejas.
# De pie: los brazos, que en reposo están en cruz, caídos a los lados y algo adelantados.
STAND = expand({"*_Arm.roll": 66.0, "*_Arm.pitch": 6.0, "*_Elbow.yaw": -14.0})

# Sentado en el suelo como un muñeco: el culo abajo y las piernas estiradas por delante.
SIT = {**STAND, **expand({
    "body.dz": -0.20, "body.dy": 0.05, "body.pitch": 5.0,
    "*F.dy": -0.24, "*F.dz": 0.07, "*F.dx": 0.03,
    "*_Arm.roll": 58.0, "*_Arm.pitch": 12.0,
    "Head.pitch": 4.0,
})}

# Tumbado boca abajo, con el pecho algo levantado, la cara al frente y los brazos por delante.
# Con el cuerpo así, "arriba" del modelo en reposo es hacia delante y "delante" es el suelo.
LIE = {**STAND, **expand({
    # La barriga sobresale 0,24 por delante: eso es lo que hay que subir para que apoye en el suelo.
    "body.pitch": -84.0, "body.dz": 0.21,
    "Spine_01.pitch": 6.0, "Spine_02.pitch": 10.0, "Head.pitch": 38.0,
    # Los brazos, hacia delante y abiertos, bajan hasta el suelo con la armadura hacia arriba.
    "*_Arm.roll": -45.0, "*_Arm.yaw": -30.0, "*_Arm.pitch": 0.0, "*_Arm.twist": 80.0,
    "*_Elbow.yaw": -25.0,
    # Las piernas quedan atrás, algo abiertas, y caen hasta el suelo.
    "*_Upper_Leg.pitch": 22.0, "*_Upper_Leg.roll": -8.0,
})}
# A medio caer: ya inclinado y con los brazos por delante para parar el golpe.
LIE_HALFWAY = {**STAND, **expand({
    "body.pitch": -40.0, "body.dz": 0.02,
    "*_Arm.roll": 40.0, "*_Arm.pitch": 60.0, "*_Arm.twist": 30.0,
})}

# Dormido en el suelo: la cabeza baja y cae sobre una mejilla.
SLEEP = {**LIE, **expand({
    "Spine_01.pitch": 2.0, "Spine_02.pitch": 2.0, "Head.pitch": 16.0, "Head.yaw": 30.0,
    "*_Arm.roll": -30.0, "*_Elbow.yaw": -45.0,
})}

# Dormido en la cama. En la app se le ve desde su lado derecho: la cara queda vuelta hacia quien mira.
NAP = {**SLEEP, **expand({
    "Head.yaw": -45.0, "Head.pitch": 14.0,
    "*_Arm.roll": -35.0, "*_Elbow.yaw": -60.0,
}), **{
    # El brazo de ese lado, hacia atrás y pegado al cuerpo: por delante le taparía la cara.
    "R_Arm.roll": -50.0, "R_Arm.yaw": 20.0, "R_Elbow.yaw": 10.0,
}}

SAD = {**STAND, **expand({
    "body.dz": -0.03,
    "Spine_01.pitch": -8.0, "Spine_02.pitch": -12.0, "Head.pitch": -20.0,
    "*_Arm.roll": 78.0, "*_Arm.pitch": 14.0, "*_Elbow.yaw": -6.0,
})}

# En brazos: colgado de la nuca y pensado para verse de frente, con brazos y piernas sueltos.
CARRY = {**STAND, **expand({
    "body.pitch": 8.0,
    "*_Arm.roll": 52.0, "*_Arm.pitch": 10.0,
    "*_Upper_Leg.pitch": 8.0,
    "Head.pitch": -6.0,
})}

# Comiendo: doblado sobre el cuenco, con los brazos hacia él.
EAT = {**STAND, **expand({
    "body.pitch": -30.0, "body.dz": -0.05,
    "Spine_01.pitch": -12.0, "Spine_02.pitch": -14.0, "Head.pitch": -8.0,
    "*_Arm.roll": 62.0, "*_Arm.pitch": 50.0, "*_Elbow.yaw": -25.0,
})}

# Curioseando: se inclina a mirar el suelo, con los brazos atrás para no caerse.
LEAN = {**STAND, **expand({
    "body.pitch": -18.0,
    "Spine_02.pitch": -10.0, "Head.pitch": -12.0,
    "*_Arm.roll": 70.0, "*_Arm.pitch": -15.0,
})}
LOOK_LEFT = {**STAND, "Head.yaw": 32.0, "Spine_02.yaw": 8.0}
LOOK_RIGHT = {**STAND, "Head.yaw": -32.0, "Spine_02.yaw": -8.0}

# Corriendo va echado hacia delante y con los brazos atrás, como en el juego.
RUN = {**STAND, **expand({
    "body.pitch": -14.0,
    "*_Arm.roll": 50.0, "*_Arm.pitch": -55.0, "*_Elbow.yaw": 0.0,
    "Head.pitch": 10.0,
})}

HAPPY_CROUCH = {**STAND, **expand({"body.dz": -0.07, "*_Arm.roll": 55.0})}
# Salta con los brazos en alto.
HAPPY_HOP = {**STAND, **expand({
    "body.dz": 0.16, "*F.dz": 0.13,
    "*_Arm.roll": -42.0, "*_Arm.pitch": 0.0, "*_Elbow.yaw": 0.0,
    "Head.pitch": 10.0,
})}
HAPPY_LAND = {**STAND, **expand({"body.dz": -0.05, "*_Arm.roll": 35.0})}


# Los movimientos que se suman a las poses clave reciben la fase del clip, de 0 a 1: así el último
# fotograma coincide con el primero y el bucle no da saltos.
def wave(phase, cycles=1.0):
    return math.sin(2 * math.pi * cycles * phase)


def breathing(lift, nod):
    def overlay(phase):
        breath = wave(phase)
        return {
            "body.dz": lift * breath, "Spine_02.pitch": nod * breath, "Head.pitch": -nod * breath,
            "L_Arm.roll": 1.5 * breath, "R_Arm.roll": -1.5 * breath,
        }
    return overlay


def stride(step, lift, sway, swing):
    """Andar de pato, sin avanzar (la que se mueve es la ventana): pies alternos, cuerpo que se
    balancea hacia el pie de apoyo y brazos al contrario que las piernas."""
    def overlay(phase):
        angle = 2 * math.pi * phase
        sin, cos = math.sin(angle), math.cos(angle)
        return {
            # El pie izquierdo va en el aire y hacia delante durante la primera mitad.
            "LF.dy": step * cos, "LF.dz": lift * max(sin, 0.0),
            "RF.dy": -step * cos, "RF.dz": lift * max(-sin, 0.0),
            "body.roll": -sway * sin, "body.dz": 0.012 * math.cos(2 * angle),
            "Spine_02.yaw": 0.8 * sway * cos, "Head.roll": 0.5 * sway * sin,
            "L_Arm.pitch": swing * cos, "R_Arm.pitch": -swing * cos,
        }
    return overlay


def munch(phase):
    bite = wave(phase, 4)
    reach = wave(phase, 2)
    return {
        "Head.pitch": 7.0 * bite, "Spine_02.pitch": 3.0 * bite,
        "L_Arm.pitch": 12.0 * reach, "R_Arm.pitch": -12.0 * reach,
    }


def paddle(phase):
    """Pataleo en el aire: piernas alternas y brazos que aletean un poco."""
    kick = wave(phase)
    return {
        "L_Upper_Leg.pitch": 20.0 * kick, "R_Upper_Leg.pitch": -20.0 * kick,
        "L_Knee.pitch": -12.0 * max(kick, 0.0), "R_Knee.pitch": -12.0 * max(-kick, 0.0),
        "L_Arm.roll": 8.0 * kick, "R_Arm.roll": 8.0 * kick,
        "Head.roll": 5.0 * kick,
    }


def sad_sway(phase):
    return {"Head.yaw": 5.0 * wave(phase), "body.dz": 0.006 * wave(phase, 2)}


# `planted`: los pies se quedan en el suelo. Sin él, el cuerpo se mueve entero (tumbado o en el aire).
CLIPS = [
    {"name": "Idle", "frames": 80, "pivot": "hips", "planted": True, "keys": [(0.0, STAND)], "overlay": breathing(0.006, 1.2)},
    {"name": "IdleLook", "frames": 80, "pivot": "hips", "planted": True, "overlay": breathing(0.006, 1.2), "keys": [
        (0.0, STAND), (0.5, LOOK_LEFT), (1.3, LOOK_LEFT), (1.9, LOOK_RIGHT), (2.7, LOOK_RIGHT), (3.333, STAND),
    ]},
    {"name": "Sniff", "frames": 96, "pivot": "hips", "planted": True, "keys": [
        (0.0, STAND), (0.7, LEAN), (1.5, {**LEAN, "Head.yaw": 28.0}), (2.5, {**LEAN, "Head.yaw": -28.0}),
        (3.3, LEAN), (4.0, STAND),
    ]},
    {"name": "Walk", "frames": 20, "pivot": "feet", "planted": True, "keys": [(0.0, STAND)], "overlay": stride(0.06, 0.07, 6.0, 22.0)},
    {"name": "Run", "frames": 12, "pivot": "hips", "planted": True, "keys": [(0.0, RUN)], "overlay": stride(0.09, 0.10, 4.0, 8.0)},
    {"name": "Eat", "frames": 64, "pivot": "hips", "planted": True, "keys": [(0.0, EAT)], "overlay": munch},
    {"name": "SitDown", "frames": 18, "pivot": "hips", "planted": True, "keys": [(0.0, STAND), (0.75, SIT)]},
    {"name": "Sit", "frames": 72, "pivot": "hips", "planted": True, "keys": [(0.0, SIT)], "overlay": breathing(0.004, 1.2)},
    # Se deja caer de barriga, como una tabla, con los pies de bisagra.
    {"name": "LieDown", "frames": 24, "pivot": "feet", "planted": False, "keys": [(0.0, STAND), (0.45, LIE_HALFWAY), (1.0, LIE)]},
    {"name": "Lie", "frames": 72, "pivot": "feet", "planted": False, "keys": [(0.0, LIE)], "overlay": breathing(0.004, 1.0)},
    {"name": "Sleep", "frames": 96, "pivot": "feet", "planted": False, "keys": [(0.0, SLEEP)], "overlay": breathing(0.007, 1.5)},
    {"name": "Nap", "frames": 96, "pivot": "feet", "planted": False, "keys": [(0.0, NAP)], "overlay": breathing(0.007, 1.5)},
    {"name": "Happy", "frames": 19, "pivot": "hips", "planted": True, "keys": [
        (0.0, STAND), (0.2, HAPPY_CROUCH), (0.4, HAPPY_HOP), (0.6, HAPPY_LAND), (0.792, STAND),
    ]},
    {"name": "Sad", "frames": 96, "pivot": "hips", "planted": True, "keys": [(0.0, SAD)], "overlay": sad_sway},
    {"name": "Carry", "frames": 29, "pivot": "nape", "planted": False, "keys": [(0.0, CARRY)], "overlay": paddle},
]


def bake_clip(rig, clip, fps):
    armature = rig.armature
    armature.animation_data.action = None
    frames = clip["frames"]
    samples = []
    for frame in range(frames + 1):
        phase = frame / frames
        pose = sample_keys(clip["keys"], phase * frames / fps)
        overlay = clip.get("overlay")
        if overlay:
            for key, value in overlay(phase).items():
                pose[key] = pose.get(key, 0.0) + value
        rig.apply(pose, clip["pivot"], clip["planted"])
        samples.append(rig.snapshot())

    action = bpy.data.actions.new(clip["name"])
    armature.animation_data.action = action
    previous = {}
    for frame, sample in enumerate(samples):
        for bone in rig.bones:
            location, turn = sample[bone.name]
            # q y -q son el mismo giro; se elige el más cercano al anterior para que la interpolación no dé la vuelta larga.
            if bone.name in previous and previous[bone.name].dot(turn) < 0:
                turn.negate()
            previous[bone.name] = turn
            bone.rotation_quaternion = turn
            bone.keyframe_insert("rotation_quaternion", frame=frame)
            # El único hueso que además se desplaza es el que mueve el cuerpo entero.
            if bone.name == "Root":
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

    armature, wingman = clean_scene()
    clean_mesh(wingman)
    rebuild_materials(wingman)
    add_marker_bone(armature, "Nape", NAPE_AT, "Head")
    add_marker_bone(armature, "Face", FACE_AT, "Head")

    if armature.animation_data is None:
        armature.animation_data_create()
    for bone in armature.pose.bones:
        bone.rotation_mode = "QUATERNION"
    rig = Rig(armature)
    for clip in CLIPS:
        action = bake_clip(rig, clip, fps)
        print(f"[build] clip {action.name}: {clip['frames'] + 1} fotogramas")
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
    print(f"[build] materiales: {[m.name for m in wingman.data.materials]}")
    print(f"[build] clips: {sorted(a.name for a in bpy.data.actions)}")
    print(f"[build] escrito {out} ({os.path.getsize(out)} bytes)")


main()
