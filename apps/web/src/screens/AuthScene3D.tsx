import { useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';

const COLOR_TERRACOTTA = '#c65322';
const COLOR_GOLD = '#df9732';

/* A seeded PRNG, so the star field is fixed at module load rather than
   generated during render. Unseeded Math.random in render made every star
   jump on any re-render, and it is not pure. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STARS = (() => {
  const rand = mulberry32(0x5eed);
  return Array.from({ length: 24 }, (_, i) => {
    const radius = 2 + rand() * 2;
    const y = (rand() - 0.5) * 2;
    const angle = (i / 24) * Math.PI * 2;
    return {
      key: i,
      position: [Math.cos(angle) * radius, y, Math.sin(angle) * radius] as [number, number, number],
      speed: 0.5 + rand(),
      size: 0.04 + rand() * 0.03,
    };
  });
})();

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

      {STARS.map((s) => (
        <Float key={s.key} speed={s.speed} rotationIntensity={0.3} floatIntensity={0.2}>
          <mesh position={s.position}>
            <sphereGeometry args={[s.size, 16, 16]} />
            <meshBasicMaterial color={s.key % 3 === 0 ? COLOR_GOLD : COLOR_TERRACOTTA} opacity={0.8} transparent />
          </mesh>
        </Float>
      ))}

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
