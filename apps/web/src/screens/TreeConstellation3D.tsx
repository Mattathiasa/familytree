import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sparkles, Html, Text } from '@react-three/drei';
import type { PersonDto, RelationshipDto } from '../api/types';
import { personLabel } from '../api/client';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

interface TreeConstellationProps {
  people: PersonDto[];
  rels: RelationshipDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
}

interface ConstellationNode {
  id: string;
  name: string;
  years: string;
  pos: [number, number, number];
  color: string;
  isLiving: boolean;
  isRoot: boolean;
}

const PALETTE = [
  '#df9732', // Gold
  '#c65322', // Terracotta
  '#e0781f', // Ember
  '#5a7c5a', // Sage
  '#4a3424', // Walnut
];

function ConstellationPoint({
  node,
  isSelected,
  onSelect,
  onOpen,
}: {
  node: ConstellationNode;
  isSelected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  const reduced = usePrefersReducedMotion();

  /* The other two canvases honour prefers-reduced-motion; this one pulsed every
     star forever regardless. Selection and hover still change the size — that
     is feedback, not decoration — but the idle animation stops. */
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const scale = isSelected ? 1.4 : hovered ? 1.25 : 1.0;
    const pulse = reduced ? 1 : 1 + Math.sin(clock.elapsedTime * 3 + Number(node.id.slice(-2) || 1)) * 0.06;
    meshRef.current.scale.setScalar(scale * pulse);
  });

  return (
    <group position={node.pos}>
      {/* Node Star Mesh */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[isSelected ? 0.42 : 0.32, 24, 24]} />
        <meshStandardMaterial
          color={isSelected ? '#ffffff' : node.color}
          emissive={isSelected ? '#df9732' : node.color}
          emissiveIntensity={isSelected ? 1.6 : hovered ? 1.1 : 0.5}
          roughness={0.2}
          metalness={0.4}
        />
      </mesh>

      {/* Orbit Halo */}
      <mesh rotation={[Math.PI / 4, 0, 0]}>
        <ringGeometry args={[0.55, 0.62, 32]} />
        <meshBasicMaterial
          color={isSelected ? '#df9732' : node.color}
          transparent
          opacity={isSelected ? 0.9 : hovered ? 0.7 : 0.25}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3D Floating Name Label */}
      <Text
        position={[0, -0.65, 0]}
        fontSize={0.28}
        color={isSelected ? '#ffffff' : '#f0e6d8'}
        anchorX="center"
        anchorY="top"
        maxWidth={3}
        lineHeight={1.1}
      >
        {node.name}
      </Text>

      {/* Interactive Tooltip Card on Hover or Selected */}
      {(hovered || isSelected) && (
        <Html distanceFactor={14} position={[0, 0.75, 0]} center style={{ pointerEvents: 'auto' }}>
          <div
            style={{
              background: 'rgba(24, 15, 10, 0.92)',
              backdropFilter: 'blur(12px)',
              border: `1px solid ${isSelected ? '#df9732' : 'rgba(223, 151, 50, 0.4)'}`,
              padding: '8px 14px',
              borderRadius: '12px',
              color: '#faf6f0',
              fontSize: '12px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
              fontFamily: 'Inter, sans-serif',
              whiteSpace: 'nowrap',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#df9732', fontSize: '13px' }}>✦</span>
              <strong style={{ fontSize: '13px' }}>{node.name}</strong>
              {node.isLiving && (
                <span
                  style={{
                    fontSize: '10px',
                    color: '#67b07d',
                    background: 'rgba(103, 176, 125, 0.15)',
                    padding: '1px 6px',
                    borderRadius: '999px',
                  }}
                >
                  Living
                </span>
              )}
            </div>
            <div style={{ color: '#baa999', fontSize: '11px' }}>{node.years}</div>
            <button
              type="button"
              onClick={onOpen}
              style={{
                marginTop: '4px',
                background: 'linear-gradient(135deg, #c65322, #df9732)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Open Profile →
            </button>
          </div>
        </Html>
      )}
    </group>
  );
}

function ConstellationFilaments({
  nodes,
  rels,
  selectedId,
}: {
  nodes: Map<string, ConstellationNode>;
  rels: RelationshipDto[];
  selectedId: string | null;
}) {
  const lineGeometry = useMemo(() => {
    const points: number[] = [];
    const colors: number[] = [];

    rels.forEach((rel) => {
      const fromNode = nodes.get(rel.fromPersonId);
      const toNode = nodes.get(rel.toPersonId);
      if (!fromNode || !toNode) return;

      const isHi = rel.fromPersonId === selectedId || rel.toPersonId === selectedId;

      points.push(fromNode.pos[0], fromNode.pos[1], fromNode.pos[2]);
      points.push(toNode.pos[0], toNode.pos[1], toNode.pos[2]);

      const c = isHi ? new THREE.Color('#ffffff') : new THREE.Color('#df9732');
      colors.push(c.r, c.g, c.b, c.r, c.g, c.b);
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, [nodes, rels, selectedId]);

  return (
    <lineSegments geometry={lineGeometry}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.45}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}

function SceneSetup() {
  const { gl } = useThree();
  useEffect(() => {
    gl.setClearColor(new THREE.Color('#0e0805'), 1);
  }, [gl]);
  return null;
}

export function TreeConstellation3D({
  people,
  rels,
  selectedId,
  onSelect,
  onOpen,
}: TreeConstellationProps) {
  // Map people into 3D generational constellation positions
  const nodeMap = useMemo(() => {
    const map = new Map<string, ConstellationNode>();
    if (people.length === 0) return map;

    people.forEach((p, idx) => {
      // Golden angle spiral distribution with vertical tiers
      const angle = idx * 2.39996; // Golden angle
      const radius = 2.5 + Math.sqrt(idx) * 2.2;
      const height = (idx % 3 - 1) * 2.8 + Math.sin(idx * 0.7) * 1.5;

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = height;

      const birthYear = p.birthDate?.year ? String(p.birthDate.year) : 'Unknown';
      const deathYear = p.deathDate?.year ? String(p.deathDate.year) : p.isLiving ? 'Present' : '';
      const years = deathYear ? `${birthYear} – ${deathYear}` : `b. ${birthYear}`;

      map.set(p.id, {
        id: p.id,
        name: personLabel(p),
        years,
        pos: [x, y, z],
        color: PALETTE[idx % PALETTE.length]!,
        isLiving: Boolean(p.isLiving),
        isRoot: idx === 0,
      });
    });

    return map;
  }, [people]);

  const nodesList = useMemo(() => Array.from(nodeMap.values()), [nodeMap]);

  return (
    <div className="constellation-3d-wrap" style={{ position: 'relative', width: '100%', height: '620px', borderRadius: '16px', overflow: 'hidden' }}>
      <Canvas
        camera={{ position: [0, 4, 16], fov: 48 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <SceneSetup />
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 15, 10]} intensity={1.2} />
        <directionalLight position={[-10, -5, -10]} intensity={0.4} color="#df9732" />
        <pointLight position={[0, 0, 0]} intensity={1.8} color="#c65322" distance={20} />

        <OrbitControls
          enableDamping
          dampingFactor={0.06}
          rotateSpeed={0.7}
          maxDistance={35}
          minDistance={5}
        />

        <ConstellationFilaments nodes={nodeMap} rels={rels} selectedId={selectedId} />

        {nodesList.map((node) => (
          <ConstellationPoint
            key={node.id}
            node={node}
            isSelected={node.id === selectedId}
            onSelect={() => onSelect(node.id)}
            onOpen={() => onOpen(node.id)}
          />
        ))}

        <Sparkles
          count={80}
          scale={[22, 18, 22]}
          size={3}
          speed={0.3}
          color="#f7b85d"
          opacity={0.6}
        />
      </Canvas>

      <div className="constellation-hud-overlay">
        <span className="hud-badge">✨ 3D KINSHIP CONSTELLATION</span>
        <span className="hud-hint">Drag to orbit · Scroll to zoom · Click stars to select</span>
      </div>
    </div>
  );
}
