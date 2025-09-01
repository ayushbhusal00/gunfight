import { useEffect, useRef, useState } from "react";

import { OrbitControls, Environment } from "@react-three/drei";
import { useHelper } from "@react-three/drei";
import { DirectionalLightHelper } from "three";
import {
  insertCoin,
  onPlayerJoin,
  Joystick,
  myPlayer,
  useMultiplayerState,
  isHost,
} from "playroomkit";
import { MapModel } from "./Map";
import { CharacterController } from "./CharacterController";
import Bullet from "./Bullet";
import { use } from "react";
export const Experience = () => {
  // Track players
  const [players, setPlayers] = useState([]);
  const [bullets, setBullets] = useState([]);
  const [networkBullets, setNetworkBullets] = useMultiplayerState(
    "bullets",
    []
  );

  useEffect(() => {
    setNetworkBullets(bullets);
  }, [bullets]);
  const onFire = (bullet) => {
    setBullets((bullets) => [...bullets, bullet]);
  };

  const onHit = (bulletId) => {
    setBullets((bullets) => bullets.filter((b) => b.id !== bulletId));
  };
  //Helper to visualize the directional light
  const dirLightRef = useRef();
  useHelper(dirLightRef, DirectionalLightHelper, 5, "yellow");

  const start = async () => {
    //Show playroom UI, let it handle players joining etc and wait for host to tap 'launch'
    await insertCoin();

    //Create a joystick controller when a player joins
    onPlayerJoin((state) => {
      //Joystick will only create UI for current player (myPlayer)
      //For others it will only sync their states
      const joystick = new Joystick(state, {
        type: "angular", //or 'directional'
        // position: "bottom-left", //or 'bottom-right'
        buttons: [{ id: "fire", label: "Fire" }],
      });
      //Create a new player with network state and joystick
      const newPlayer = { state, joystick };
      state.setState("health", 100);
      state.setState("deaths", 0);
      state.setState("kills", 0);
      setPlayers((players) => [...players, newPlayer]);
      state.onQuit(() => {
        setPlayers((players) => players.filter((p) => p.state.id !== state.id));
      });
    });
  };

  useEffect(() => {
    start();
  }, []);

  const onKilled = (_victim, killer) => {
    const killerState = players.find((p) => p.state.id === killer).state;
    killerState.setState("kills", killerState.state.kills + 1);
  };
  return (
    <>
      <directionalLight
        ref={dirLightRef}
        position={[25, 18, -25]}
        intensity={1}
        scale={3}
        castShadow
        shadow-camera-near={0}
        shadow-camera-far={80}
        shadow-camera-top={25}
        shadow-camera-right={30}
        shadow-camera-bottom={-25}
        shadow-camera-left={-30}
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-bias={-0.0001}
      />
      <Environment preset='sunset' />
      {/* <OrbitControls /> */}
      {players.map(({ state, joystick }, idx) => (
        <CharacterController
          key={state.id}
          // position-x={idx * 2}
          state={state}
          joystick={joystick}
          userPlayer={state.id === myPlayer()?.id} //MyUser
          onFire={onFire}
          onKilled={onKilled}
        />
      ))}
      {(isHost() ? bullets : networkBullets).map((bullet) => (
        <Bullet key={bullet.id} {...bullet} onHit={() => onHit(bullet.id)} />
      ))}
      <MapModel />
    </>
  );
};
