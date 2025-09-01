import { Canvas } from "@react-three/fiber";
import { Experience } from "./components/Experience";
import { SoftShadows } from "@react-three/drei";
import { Suspense } from "react";
import { Physics } from "@react-three/rapier";
import { Leaderboard } from "./components/LeaderBoard";
// import { EffectComposer } from "three-stdlib";
// import { Bloom } from "@react-three/postprocessing";

function App() {
  return (
    <>
      <Leaderboard />
      <Canvas shadows camera={{ position: [0, 10, 18], fov: 30, near: 2 }}>
        <color attach='background' args={["#242424"]} />
        <SoftShadows size={42} />
        <Suspense>
          <Physics debug>
            <Experience />
          </Physics>
        </Suspense>
        {/* <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={1} intensity={1.5} mipmapBlur />
      </EffectComposer> */}
      </Canvas>
    </>
  );
}

export default App;
