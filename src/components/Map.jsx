import { useGLTF } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useEffect } from "react";

export const MapModel = () => {
  const map = useGLTF("/models/Map.glb");

  useEffect(() => {
    map.scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [map]);

  return (
    <RigidBody colliders='trimesh' type='fixed'>
      <primitive object={map.scene} />
    </RigidBody>
  );
};

// Preload the GLTF
useGLTF.preload("/models/map.glb");
