import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sparkles, Float, Html } from '@react-three/drei';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// Heritage Brand Color Palette (Gursha & Lehulu-Living inspired)
const COLOR_TERRACOTTA = '#c65322';
const COLOR_EMBER = '#e0781f';
const COLOR_GOLD = '#df9732';
const COLOR_GOLD_BRIGHT = '#f7b85d';
const COLOR_WALNUT = '#3d2516';
const COLOR_IVORY = '#faf5ee';

interface AncestorNode {
  id: string;
  name: string;
  relation: string;
  period: string;
  position: [number, number, number];
  generation: number;
  size: number;
  glowColor: string;
}

const GENERATION_NODES: AncestorNode[] = [
  // Generation 1: The Patriarchs & Matriarchs (Ancient Roots)
  { id: '1', name: 'Abebe Bikila', relation: 'Great-Grandfather', period: 'c. 1908', position: [-2.4, -2.2, 0.4], generation: 0, size: 0.55, glowColor: COLOR_GOLD },
  { id: '2', name: 'Taytu Betul', relation: 'Great-Grandmother', period: 'c. 1914', position: [2.2, -2.4, -0.6], generation: 0, size: 0.55, glowColor: COLOR_EMBER },

  // Generation 2: Grandparents (Sturdy Trunk & Main Branches)
  { id: '3', name: 'Yohannes', relation: 'Grandfather', period: '1934 – 2002', position: [-3.8, 1.2, 1.2], generation: 1, size: 0.48, glowColor: COLOR_GOLD_BRIGHT },
  { id: '4', name: 'Almaz', relation: 'Grandmother', period: '1938 – Present', position: [-1.4, 2.0, -1.2], generation: 1, size: 0.48, glowColor: COLOR_TERRACOTTA },
  { id: '5', name: 'Kassahun', relation: 'Grand-Uncle', period: '1941 – 2016', position: [2.8, 1.6, 1.0], generation: 1, size: 0.44, glowColor: COLOR_EMBER },
  { id: '6', name: 'Zewditu', relation: 'Grand-Aunt', period: '1945 – Present', position: [4.2, 2.2, -0.8], generation: 1, size: 0.44, glowColor: COLOR_GOLD },

  // Generation 3: Parents & Diaspora Generation (Canopy Branches)
  { id: '7', name: 'Dawit', relation: 'Father', period: 'b. 1968', position: [-3.6, 4.8, 0.6], generation: 2, size: 0.42, glowColor: COLOR_GOLD },
  { id: '8', name: 'Hanna', relation: 'Mother', period: 'b. 1972', position: [-1.8, 5.4, 1.4], generation: 2, size: 0.42, glowColor: COLOR_EMBER },
  { id: '9', name: 'Samuel', relation: 'Uncle (London)', period: 'b. 1974', position: [1.6, 5.0, -1.2], generation: 2, size: 0.38, glowColor: COLOR_TERRACOTTA },
  { id: '10', name: 'Senait', relation: 'Aunt (Toronto)', period: 'b. 1978', position: [3.4, 5.6, 0.8], generation: 2, size: 0.38, glowColor: COLOR_GOLD_BRIGHT },

  // Generation 4: Present & Future (Luminous Leaves in Starlight)
  { id: '11', name: 'Sara', relation: 'Daughter', period: 'b. 1998', position: [-3.2, 7.6, 1.0], generation: 3, size: 0.34, glowColor: COLOR_GOLD_BRIGHT },
  { id: '12', name: 'Mikael', relation: 'Son', period: 'b. 2003', position: [-1.2, 8.2, -0.4], generation: 3, size: 0.34, glowColor: COLOR_EMBER },
  { id: '13', name: 'Liya', relation: 'Cousin', period: 'b. 2007', position: [1.8, 7.8, 1.2], generation: 3, size: 0.32, glowColor: COLOR_GOLD },
  { id: '14', name: 'Noah', relation: 'Grandson', period: 'b. 2024', position: [0.2, 9.4, 0.6], generation: 4, size: 0.36, glowColor: COLOR_GOLD_BRIGHT },
];

// Curvilinear Branching Trunk and Generational Filaments
function TreeBranches() {
  const branchMeshRef = useRef<THREE.Group>(null!);

  const curves = useMemo(() => {
    // Branch pathways linking ancestors to descendants in organic sweeps
    const paths = [
      // Central trunk to root nodes
      [[0, -4.5, 0], [-1.2, -3.2, 0.2], [-2.4, -2.2, 0.4]],
      [[0, -4.5, 0], [1.1, -3.4, -0.3], [2.2, -2.4, -0.6]],

      // Main trunk rising to generation 2
      [[0, -4.5, 0], [0, -1.0, 0], [-2.2, 0.2, 0.6], [-3.8, 1.2, 1.2]],
      [[0, -1.0, 0], [-0.8, 0.6, -0.6], [-1.4, 2.0, -1.2]],
      [[0, -1.0, 0], [1.5, 0.4, 0.4], [2.8, 1.6, 1.0]],
      [[0, -1.0, 0], [2.2, 0.8, -0.4], [4.2, 2.2, -0.8]],

      // Generation 2 to Generation 3
      [[-3.8, 1.2, 1.2], [-3.7, 3.0, 0.9], [-3.6, 4.8, 0.6]],
      [[-1.4, 2.0, -1.2], [-1.6, 3.8, 0.2], [-1.8, 5.4, 1.4]],
      [[2.8, 1.6, 1.0], [2.2, 3.4, -0.2], [1.6, 5.0, -1.2]],
      [[4.2, 2.2, -0.8], [3.8, 3.9, 0.1], [3.4, 5.6, 0.8]],

      // Canopy filigree to present youth
      [[-3.6, 4.8, 0.6], [-3.4, 6.2, 0.8], [-3.2, 7.6, 1.0]],
      [[-1.8, 5.4, 1.4], [-1.5, 6.8, 0.5], [-1.2, 8.2, -0.4]],
      [[1.6, 5.0, -1.2], [1.7, 6.4, 0.0], [1.8, 7.8, 1.2]],
      [[-1.2, 8.2, -0.4], [-0.5, 8.8, 0.1], [0.2, 9.4, 0.6]],
    ];

    return paths.map((pts) => {
      const vPts = pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
      return new THREE.CatmullRomCurve3(vPts);
    });
  }, []);

  return (
    <group ref={branchMeshRef}>
      {curves.map((curve, idx) => (
        <mesh key={idx}>
          <tubeGeometry args={[curve, 32, 0.09 - Math.min(idx * 0.003, 0.05), 8, false]} />
          <meshStandardMaterial
            color={COLOR_WALNUT}
            roughness={0.65}
            metalness={0.15}
            emissive={COLOR_EMBER}
            emissiveIntensity={0.06}
          />
        </mesh>
      ))}

      {/* Decorative Golden Genealogical Rings around trunk layers */}
      <mesh position={[0, -1.2, 0]} rotation={[Math.PI / 2.3, 0, 0.2]}>
        <torusGeometry args={[1.4, 0.03, 16, 64]} />
        <meshStandardMaterial color={COLOR_GOLD} metalness={0.8} roughness={0.3} emissive={COLOR_GOLD} emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, 2.6, 0]} rotation={[Math.PI / 2.1, 0, -0.3]}>
        <torusGeometry args={[2.5, 0.025, 16, 64]} />
        <meshStandardMaterial color={COLOR_GOLD} metalness={0.8} roughness={0.3} emissive={COLOR_GOLD} emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, 6.0, 0]} rotation={[Math.PI / 1.9, 0, 0.4]}>
        <torusGeometry args={[3.4, 0.02, 16, 64]} />
        <meshStandardMaterial color={COLOR_GOLD} metalness={0.9} roughness={0.2} emissive={COLOR_GOLD_BRIGHT} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

// Interactive Glowing Ancestor Orb
function NodeOrb({ node, onHover }: { node: AncestorNode; onHover: (n: AncestorNode | null) => void }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime + Number(node.id) * 0.8;
    // Gentle breathing scale
    const baseScale = hovered ? 1.35 : 1.0;
    const pulse = 1 + Math.sin(t * 2) * 0.05;
    meshRef.current.scale.setScalar(baseScale * pulse);
  });

  return (
    <group position={node.position}>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHover(node);
        }}
        onPointerOut={() => {
          setHovered(false);
          onHover(null);
        }}
      >
        <sphereGeometry args={[node.size, 24, 24]} />
        <meshStandardMaterial
          color={hovered ? '#ffffff' : node.glowColor}
          roughness={0.2}
          metalness={0.4}
          emissive={node.glowColor}
          emissiveIntensity={hovered ? 1.4 : 0.6}
        />
      </mesh>

      {/* Orbiting halo ring */}
      <mesh rotation={[Math.PI / 3, Number(node.id), 0]}>
        <torusGeometry args={[node.size * 1.5, 0.015, 12, 32]} />
        <meshBasicMaterial color={node.glowColor} transparent opacity={hovered ? 0.9 : 0.4} />
      </mesh>

      {/* HTML tooltip on hover */}
      {hovered && (
        <Html distanceFactor={12} position={[0, node.size + 0.3, 0]} center style={{ pointerEvents: 'none' }}>
          <div
            style={{
              background: 'rgba(28, 18, 12, 0.92)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(223, 151, 50, 0.6)',
              padding: '6px 14px',
              borderRadius: '999px',
              color: COLOR_IVORY,
              fontSize: '12px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              fontFamily: 'Inter, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ color: COLOR_GOLD_BRIGHT }}>✦</span>
            <span>{node.name}</span>
            <span style={{ opacity: 0.65, fontSize: '11px' }}>({node.period})</span>
          </div>
        </Html>
      )}
    </group>
  );
}

// Master Living Tree Scene with GSAP Scroll Interaction & Mouse Physics
function LivingTreeScene({ activeNode, setActiveNode }: { activeNode: AncestorNode | null; setActiveNode: (n: AncestorNode | null) => void }) {
  const treeGroupRef = useRef<THREE.Group>(null!);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  // Mouse tilt tracking with smooth damping
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // GSAP ScrollTrigger to orchestrate cinematic camera & tree orbit
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ctx = gsap.context(() => {
      // Rotate and lift tree along scroll progress
      ScrollTrigger.create({
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.5,
        onUpdate: (self) => {
          if (!treeGroupRef.current) return;
          // Rotate around y as visitor scrolls through chapters
          treeGroupRef.current.rotation.y = self.progress * Math.PI * 1.5;
          // Camera view pans from canopy to middle branches
          treeGroupRef.current.position.y = -2.2 + self.progress * 4.5;
        },
      });
    });

    return () => ctx.revert();
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Smooth mouse inertia
    mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.04;
    mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.04;

    if (treeGroupRef.current) {
      treeGroupRef.current.rotation.x = mouseRef.current.y * 0.12 + Math.sin(t * 0.3) * 0.02;
      treeGroupRef.current.rotation.z = -mouseRef.current.x * 0.08 + Math.cos(t * 0.25) * 0.015;
    }
  });

  return (
    <group ref={treeGroupRef} position={[0, -2.2, 0]}>
      <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.3}>
        <TreeBranches />
        {GENERATION_NODES.map((node) => (
          <NodeOrb key={node.id} node={node} onHover={setActiveNode} />
        ))}
      </Float>

      {/* Floating golden memory embers drifting in the breeze */}
      <Sparkles
        count={50}
        scale={[12, 14, 12]}
        size={3}
        speed={0.4}
        color={COLOR_GOLD_BRIGHT}
        opacity={0.65}
      />
      <Sparkles
        count={35}
        scale={[10, 12, 10]}
        size={2}
        speed={0.25}
        color={COLOR_EMBER}
        opacity={0.45}
      />
    </group>
  );
}

function LightingAndAtmosphere() {
  const { gl } = useThree();

  useEffect(() => {
    gl.setClearColor(new THREE.Color('#0a0604'), 0);
  }, [gl]);

  return (
    <>
      <ambientLight intensity={0.7} color="#fff6ea" />
      <directionalLight position={[6, 12, 8]} intensity={1.1} color="#ffe8cc" />
      <directionalLight position={[-6, -4, -6]} intensity={0.4} color="#df9732" />
      <pointLight position={[0, 4, 3]} intensity={1.5} color={COLOR_GOLD} distance={14} />
      <pointLight position={[0, -3, 2]} intensity={1.2} color={COLOR_EMBER} distance={12} />
      <fog attach="fog" args={['#0e0805', 18, 38]} />
    </>
  );
}

export function LandingCanvas() {
  const [activeNode, setActiveNode] = useState<AncestorNode | null>(null);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 2.5, 17], fov: 46 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        dpr={[1, 2]}
      >
        <LightingAndAtmosphere />
        <LivingTreeScene activeNode={activeNode} setActiveNode={setActiveNode} />
      </Canvas>

      {/* Subtle bottom gradient mask for seamless blend */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '240px',
          background: 'linear-gradient(to top, var(--color-surface) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
