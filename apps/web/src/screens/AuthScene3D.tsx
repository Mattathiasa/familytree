import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';

const COLOR_TERRACOTTA = '#c65322';
const COLOR_GOLD = '#df9732';

function AuthConstellation() {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.04;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.6} color="#fff6ea" />
      <pointLight position={[4, 4, 4]} intensity={0.8} color={COLOR_GOLD} />
      <pointLight position={[-4, -2, 2]} intensity={0.6} color={COLOR_TERRACOTTA} />

      {Array.from({ length: 24 }).map((_, i) => {
        const radius = 2 + Math.random() * 2;
        const y = (Math.random() - 0.5) * 2;
        const angle = (i / 24) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        return (
          <Float key={i} speed={0.5 + Math.random()} rotationIntensity={0.3} floatIntensity={0.2}>
            <mesh position={[x, y, z]}>
              <sphereGeometry args={[0.04 + Math.random() * 0.03, 16, 16]} />
              <meshBasicMaterial color={i % 3 === 0 ? COLOR_GOLD : COLOR_TERRACOTTA} opacity={0.8} transparent />
            </mesh>
          </Float>
        );
      })}

      <Sparkles count={30} scale={[4, 4, 4]} size={0.04} opacity={0.4} color={COLOR_GOLD} />
    </group>
  );
}

export function AuthCanvas() {
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) return null;

  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      dpr={[1, 1.5]}
    >
      <AuthConstellation />
    </Canvas>
  );
}
