"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, useGLTF, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

interface AvatarCanvasProps {
  avatarState: "idle" | "listening" | "thinking" | "speaking";
  audioLevel?: number;
}

function AvatarModel({ avatarState, audioLevel = 0 }: AvatarCanvasProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);

  const { scene } = useGLTF("/avatar.glb");

  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });
    }
  }, [scene]);

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;

    switch (avatarState) {
      case "idle":
        groupRef.current.position.y = Math.sin(time * 0.5) * 0.02;
        groupRef.current.rotation.y = Math.sin(time * 0.3) * 0.05;
        break;
      case "listening":
        groupRef.current.position.y = Math.sin(time * 2) * 0.01;
        groupRef.current.rotation.y = Math.sin(time * 1.5) * 0.03;
        break;
      case "thinking":
        groupRef.current.rotation.z = Math.sin(time * 2) * 0.03;
        groupRef.current.position.y = Math.sin(time * 1) * 0.015;
        break;
      case "speaking":
        groupRef.current.position.y = Math.sin(time * 4) * 0.01 * (1 + audioLevel);
        break;
    }

    if (leftEyeRef.current && rightEyeRef.current) {
      const blinkSpeed = avatarState === "listening" ? 0.15 : 0.08;
      const blinkThreshold = avatarState === "listening" ? 0.92 : 0.95;
      const isBlinking = Math.sin(time * blinkSpeed * 10) > blinkThreshold;
      
      leftEyeRef.current.scale.y = isBlinking ? 0.1 : 1;
      rightEyeRef.current.scale.y = isBlinking ? 0.1 : 1;
    }

    if (mouthRef.current && avatarState === "speaking") {
      const mouthScale = 1 + audioLevel * 0.5;
      mouthRef.current.scale.set(mouthScale, mouthScale, 1);
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.5, 0]} scale={1.5}>
      <primitive object={scene} />
    </group>
  );
}

function FallbackAvatar({ avatarState, audioLevel = 0 }: AvatarCanvasProps) {
  const groupRef = useRef<THREE.Group>(null);
  const eyeLeftRef = useRef<THREE.Mesh>(null);
  const eyeRightRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const blushLeftRef = useRef<THREE.Mesh>(null);
  const blushRightRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;

    switch (avatarState) {
      case "idle":
        groupRef.current.position.y = Math.sin(time * 0.5) * 0.02;
        groupRef.current.rotation.y = Math.sin(time * 0.3) * 0.1;
        groupRef.current.rotation.x = 0;
        break;
      case "listening":
        groupRef.current.position.y = Math.sin(time * 2) * 0.01;
        groupRef.current.rotation.y = Math.sin(time * 1.5) * 0.05;
        groupRef.current.rotation.x = -0.1;
        break;
      case "thinking":
        groupRef.current.rotation.z = Math.sin(time * 2) * 0.05;
        groupRef.current.position.y = Math.sin(time * 1) * 0.02;
        break;
      case "speaking":
        groupRef.current.position.y = Math.sin(time * 4) * 0.015 * (1 + audioLevel);
        groupRef.current.rotation.x = Math.sin(time * 3) * 0.02;
        break;
    }

    const blinkSpeed = avatarState === "listening" ? 0.12 : 0.06;
    const blinkThreshold = avatarState === "listening" ? 0.9 : 0.95;
    const shouldBlink = Math.sin(time * blinkSpeed * 10) > blinkThreshold;
    
    if (eyeLeftRef.current && eyeRightRef.current) {
      eyeLeftRef.current.scale.y = shouldBlink ? 0.1 : 1;
      eyeRightRef.current.scale.y = shouldBlink ? 0.1 : 1;
    }

    if (mouthRef.current) {
      if (avatarState === "speaking") {
        const scale = 1 + audioLevel * 0.8;
        mouthRef.current.scale.set(scale, scale * 0.6, 1);
      } else if (avatarState === "thinking") {
        mouthRef.current.scale.set(0.4, 0.3, 1);
      } else {
        mouthRef.current.scale.set(0.8, 0.3, 1);
      }
    }

    if (blushLeftRef.current && blushRightRef.current) {
      const blushOpacity = avatarState === "speaking" ? 0.4 : 0.15;
      (blushLeftRef.current.material as THREE.MeshStandardMaterial).opacity = blushOpacity;
      (blushRightRef.current.material as THREE.MeshStandardMaterial).opacity = blushOpacity;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.5, 0]}>
      <mesh position={[0, 0, 0]} castShadow>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#FFECD2" />
      </mesh>

      <mesh position={[0, 0, 0.48]}>
        <sphereGeometry args={[0.48, 32, 32]} />
        <meshStandardMaterial color="#FFF5E6" />
      </mesh>

      <mesh ref={eyeLeftRef} position={[-0.15, 0.08, 0.4]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#2D1B0E" />
      </mesh>
      <mesh ref={eyeRightRef} position={[0.15, 0.08, 0.4]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#2D1B0E" />
      </mesh>

      <mesh position={[-0.15, 0.08, 0.45]}>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0.15, 0.08, 0.45]}>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>

      <mesh ref={blushLeftRef} position={[-0.28, -0.02, 0.35]} rotation={[0, 0.3, 0]}>
        <circleGeometry args={[0.08, 16]} />
        <meshStandardMaterial color="#FFB6C1" transparent opacity={0.15} />
      </mesh>
      <mesh ref={blushRightRef} position={[0.28, -0.02, 0.35]} rotation={[0, -0.3, 0]}>
        <circleGeometry args={[0.08, 16]} />
        <meshStandardMaterial color="#FFB6C1" transparent opacity={0.15} />
      </mesh>

      <mesh ref={mouthRef} position={[0, -0.12, 0.42]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#E57373" />
      </mesh>

      <mesh position={[-0.18, 0.25, 0.38]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#3D2314" />
      </mesh>
      <mesh position={[0.18, 0.25, 0.38]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#3D2314" />
      </mesh>

      <mesh position={[0, 0, 0.44]} scale={[1.3, 1.1, 1]}>
        <planeGeometry args={[0.3, 0.05]} />
        <meshStandardMaterial color="#2D1B0E" />
      </mesh>

      <group position={[0, -0.7, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.25, 0.35, 0.6, 16]} />
          <meshStandardMaterial color="#FF6B9D" />
        </mesh>
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.2, 0.25, 0.1, 16]} />
          <meshStandardMaterial color="#FFB6C1" />
        </mesh>
      </group>
    </group>
  );
}

function LoadingIndicator() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );
}

export default function AvatarCanvas({ avatarState, audioLevel = 0 }: AvatarCanvasProps) {
  const [hasModel, setHasModel] = useState(false);

  useEffect(() => {
    fetch("/avatar.glb", { method: "HEAD" })
      .then((res) => setHasModel(res.ok))
      .catch(() => setHasModel(false));
  }, []);

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 0.5, 3], fov: 45 }}
        shadows={{ type: THREE.PCFShadowMap }}
        gl={{ antialias: true, alpha: true }}
        className="bg-gradient-to-b from-blue-100 to-purple-100 rounded-3xl"
        onCreated={({ gl }) => {
          gl.shadowMap.type = THREE.PCFShadowMap;
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-near={0.1}
          shadow-camera-far={100}
        />
        <pointLight position={[-5, 3, -5]} intensity={0.5} color="#FFE4C4" />
        
        <Suspense fallback={null}>
          {hasModel ? (
            <AvatarModel avatarState={avatarState} audioLevel={audioLevel} />
          ) : (
            <FallbackAvatar avatarState={avatarState} audioLevel={audioLevel} />
          )}
          <Environment preset="sunset" />
        </Suspense>
        
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              avatarState === "listening"
                ? "bg-green-500 animate-pulse"
                : avatarState === "speaking"
                ? "bg-blue-500 animate-pulse"
                : avatarState === "thinking"
                ? "bg-yellow-500 animate-pulse"
                : "bg-gray-400"
            }`}
          />
          <span className="text-sm font-medium text-gray-700 capitalize">
            {avatarState === "idle" ? "Ready" : avatarState}
          </span>
        </div>
      </div>
    </div>
  );
}
