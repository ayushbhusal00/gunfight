import { Billboard, CameraControls, Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, vec3 } from "@react-three/rapier";
import { isHost } from "playroomkit";
import { useEffect, useRef, useState } from "react";
import { CharacterSoldier } from "./CharacterSoldier";

const MOVEMENT_SPEED = 202;
export const WEAPON_OFFSET = { x: -0.2, y: 1.4, z: 0.8 };

export const CharacterController = ({
  state,
  joystick,
  userPlayer,
  onKilled,
  onFire,
  downgradedPerformance,
  ...props
}) => {
  // --- Refs & States ---
  const group = useRef();
  const character = useRef();
  const rigidbody = useRef();
  const controls = useRef();
  const directionalLight = useRef();

  const keyboard = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    fire: false,
  });
  const fireLock = useRef(false);

  const [animation, setAnimation] = useState("Idle");
  const [weapon, setWeapon] = useState("GrenadeLauncher");

  const scene = useThree((state) => state.scene);

  // --- Keyboard handlers ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return;
      switch (e.key.toLowerCase()) {
        case "w":
          keyboard.current.w = true;
          break;
        case "a":
          keyboard.current.a = true;
          break;
        case "s":
          keyboard.current.s = true;
          break;
        case "d":
          keyboard.current.d = true;
          break;
        case " ":
          keyboard.current.fire = true;
          break;
      }
    };
    const handleKeyUp = (e) => {
      switch (e.key.toLowerCase()) {
        case "w":
          keyboard.current.w = false;
          break;
        case "a":
          keyboard.current.a = false;
          break;
        case "s":
          keyboard.current.s = false;
          break;
        case "d":
          keyboard.current.d = false;
          break;
        case " ":
          keyboard.current.fire = false;
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // --- Spawn randomly for host ---
  const spawnRandomly = () => {
    const spawns = [];
    for (let i = 0; i < 1000; i++) {
      const spawn = scene.getObjectByName(`spawn_${i}`);
      if (spawn) spawns.push(spawn);
      else break;
    }
    const spawnPos =
      spawns[Math.floor(Math.random() * spawns.length)]?.position;
    if (spawnPos) rigidbody.current.setTranslation(spawnPos);
  };
  useEffect(() => {
    if (isHost()) spawnRandomly();
  }, []);

  // --- Audio effects ---
  useEffect(() => {
    if (state.state.dead) {
      const audio = new Audio("/audios/dead.mp3");
      audio.volume = 0.5;
      audio.play();
    }
  }, [state.state.dead]);

  useEffect(() => {
    if (state.state.health < 100) {
      const audio = new Audio("/audios/hurt.mp3");
      audio.volume = 0.4;
      audio.play();
    }
  }, [state.state.health]);

  // --- Main frame update ---
  useFrame((_, delta) => {
    if (!rigidbody.current || !character.current) return;

    // --- Camera follow ---
    if (controls.current) {
      const camDistY = window.innerWidth < 1024 ? 16 : 20;
      const camDistZ = window.innerWidth < 1024 ? 12 : 16;
      const p = vec3(rigidbody.current.translation());
      controls.current.setLookAt(
        p.x,
        p.y + (state.state.dead ? 12 : camDistY),
        p.z + (state.state.dead ? 2 : camDistZ),
        p.x,
        p.y + 1.5,
        p.z,
        true,
      );
    }

    if (state.state.dead) {
      setAnimation("Death");
      return;
    }

    // --- Movement input ---
    let moveX = 0,
      moveZ = 0,
      move = false,
      angle = joystick.angle?.() || 0;

    // Fixed W/S directions
    if (keyboard.current.w) {
      moveZ -= 1;
      move = true;
    } // forward
    if (keyboard.current.s) {
      moveZ += 1;
      move = true;
    } // backward
    if (keyboard.current.a) {
      moveX -= 1;
      move = true;
    }
    if (keyboard.current.d) {
      moveX += 1;
      move = true;
    }

    if (move) angle = Math.atan2(moveX, moveZ);

    const isMoving =
      (joystick.isJoystickPressed?.() && joystick.angle?.()) || move;
    if (isMoving) {
      setAnimation("Run");
      character.current.rotation.y = angle;
      const impulse = {
        x: Math.sin(angle) * MOVEMENT_SPEED * delta,
        y: 0,
        z: Math.cos(angle) * MOVEMENT_SPEED * delta,
      };
      rigidbody.current.applyImpulse(impulse, true);
    } else {
      setAnimation("Idle");
    }

    // --- Fire input ---
    const firePressed = joystick.isPressed?.("fire") || keyboard.current.fire;
    if (firePressed && !fireLock.current) {
      fireLock.current = true;
      const fireAngle = angle || character.current?.rotation.y || 0;
      setAnimation(isMoving ? "Run_Shoot" : "Idle_Shoot");

      if (isHost()) {
        onFire({
          id: state.id + "-" + +new Date(),
          position: vec3(rigidbody.current.translation()),
          angle: fireAngle,
          player: state.id,
        });
      }
    } else if (!firePressed) {
      fireLock.current = false;
    }

    // --- Sync positions ---
    if (isHost()) {
      state.setState("pos", rigidbody.current.translation());
    } else {
      const pos = state.getState("pos");
      if (pos) {
        const curr = rigidbody.current.translation();
        rigidbody.current.setTranslation({
          x: curr.x + (pos.x - curr.x) * 0.15,
          y: curr.y + (pos.y - curr.y) * 0.15,
          z: curr.z + (pos.z - curr.z) * 0.15,
        });
      }
    }
  });

  // --- Light follow ---
  useEffect(() => {
    if (character.current && userPlayer) {
      directionalLight.current.target = character.current;
    }
  }, [character.current]);

  return (
    <group {...props} ref={group}>
      {userPlayer && <CameraControls ref={controls} />}
      <RigidBody
        ref={rigidbody}
        colliders={false}
        linearDamping={12}
        lockRotations
        type={isHost() ? "dynamic" : "kinematicPosition"}
        onIntersectionEnter={({ other }) => {
          if (
            isHost() &&
            other.rigidBody.userData.type === "bullet" &&
            state.state.health > 0
          ) {
            const newHealth =
              state.state.health - other.rigidBody.userData.damage;
            if (newHealth <= 0) {
              state.setState("deaths", state.state.deaths + 1);
              state.setState("dead", true);
              state.setState("health", 0);
              rigidbody.current.setEnabled(false);
              setTimeout(() => {
                spawnRandomly();
                rigidbody.current.setEnabled(true);
                state.setState("health", 100);
                state.setState("dead", false);
              }, 2000);
              onKilled(state.id, other.rigidBody.userData.player);
            } else {
              state.setState("health", newHealth);
            }
          }
        }}
      >
        <PlayerInfo state={state.state} />
        <group ref={character}>
          <CharacterSoldier
            color={state.state.profile?.color}
            animation={animation}
            weapon={weapon}
          />
          {userPlayer && (
            <Crosshair
              position={[WEAPON_OFFSET.x, WEAPON_OFFSET.y, WEAPON_OFFSET.z]}
            />
          )}
        </group>
        {userPlayer && (
          <directionalLight
            ref={directionalLight}
            position={[25, 18, -25]}
            intensity={0.3}
            castShadow={!downgradedPerformance}
            shadow-camera-near={0}
            shadow-camera-far={100}
            shadow-camera-left={-20}
            shadow-camera-right={20}
            shadow-camera-top={20}
            shadow-camera-bottom={-20}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-bias={-0.0001}
          />
        )}
        <CapsuleCollider args={[0.7, 0.6]} position={[0, 1.28, 0]} />
      </RigidBody>
    </group>
  );
};

// --- Player Info above character ---
const PlayerInfo = ({ state }) => {
  const health = state.health;
  const name = state.profile?.name || "Player";
  return (
    <Billboard position-y={2.5}>
      <Text position-y={0.36} fontSize={0.4}>
        {name}
        <meshBasicMaterial color={state.profile?.color || "white"} />
      </Text>
      <mesh position-z={-0.1}>
        <planeGeometry args={[1, 0.2]} />
        <meshBasicMaterial color='black' transparent opacity={0.5} />
      </mesh>
      <mesh scale-x={health / 100} position-x={-0.5 * (1 - health / 100)}>
        <planeGeometry args={[1, 0.2]} />
        <meshBasicMaterial color='red' />
      </mesh>
    </Billboard>
  );
};

// --- Crosshair in front of player ---
const Crosshair = (props) => (
  <group {...props}>
    {[1, 2, 3, 4.5, 6.5, 9].map((z, i) => (
      <mesh key={i} position-z={z}>
        <boxGeometry args={[0.05, 0.05, 0.05]} />
        <meshBasicMaterial
          color='black'
          transparent
          opacity={[0.9, 0.85, 0.8, 0.7, 0.6, 0.2][i]}
        />
      </mesh>
    ))}
  </group>
);
