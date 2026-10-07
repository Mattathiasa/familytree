/**
 * Pure, headless family-tree layout (ARCHITECTURE.md §6 Layer 1).
 * No DOM, no React — deterministic positions so it is testable without a browser.
 * Two directions: `descendant` (traditional tree) and `ancestor` (where we came from).
 */

import { displayName, type FamilyDate } from '@ft/domain';

export interface TreePerson {
  id: string;
  givenName?: string;
  middleName?: string;
  familyName?: string;
  nickname?: string;
  birthDate?: FamilyDate | null;
  deathDate?: FamilyDate | null;
  photoUrl?: string | null;
  gender?: 'female' | 'male' | 'other' | 'unknown';
}

export interface TreeEdge {
  id: string;
  from: string; // parent (for kind 'parent'); spouse A
  to: string; // child; spouse B
  kind: 'parent' | 'spouse';
}

export interface PositionedNode {
  person: TreePerson;
  x: number; // centre
  y: number; // centre
  generation: number;
  depthUnloaded: number; // >0 → show "+N" badge
  collapsed: boolean;
}

export interface PositionedEdge {
  id: string;
  kind: 'parent' | 'spouse';
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface LayoutResult {
  width: number;
  height: number;
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  byPersonId: Map<string, PositionedNode>;
}

export interface LayoutOptions {
  direction?: 'descendant' | 'ancestor';
  nodeWidth?: number;
  nodeHeight?: number;
  spouseGap?: number; // horizontal gap between spouses
  siblingGap?: number;
  generationGap?: number; // vertical gap between generation rows
}

const DEFAULTS: Required<Omit<LayoutOptions, 'direction'>> = {
  nodeWidth: 168,
  nodeHeight: 64,
  spouseGap: 20,
  siblingGap: 24,
  generationGap: 110,
};

interface Union {
  anchor: string;
  spouses: string[];
  children: Set<string>;
  spouseEdgeIds: string[];
}

/**
 * Compute positions for a person-centric subgraph.
 * Deterministic: same input, same output (golden-tested).
 */
export function layoutTree(
  rootId: string,
  people: TreePerson[],
  edges: TreeEdge[],
  opts: LayoutOptions = {},
): LayoutResult {
  const direction = opts.direction ?? 'descendant';
  const cfg = { ...DEFAULTS, ...opts };
  const personById = new Map(people.map((p) => [p.id, p]));
  const parentEdgesByChild = new Map<string, TreeEdge[]>();
  const spouseByPerson = new Map<string, TreeEdge[]>();
  for (const e of edges) {
    if (e.kind === 'parent') {
      const list = parentEdgesByChild.get(e.to) ?? [];
      list.push(e);
      parentEdgesByChild.set(e.to, list);
    } else {
      const a = spouseByPerson.get(e.from) ?? [];
      a.push(e);
      spouseByPerson.set(e.from, a);
      const b = spouseByPerson.get(e.to) ?? [];
      b.push(e);
      spouseByPerson.set(e.to, b);
    }
  }

  /* --- unions: a person plus all spouses they are connected to -------------

     Union discovery order decides left-to-right placement within a row, so the
     order people are walked in here is the order siblings appear in. Walking
     the input array gave insertion order; a genealogy tree is read eldest-first,
     and layout.test.ts already asserted "earlier birth on the left" — it just
     passed because the fixture happened to be in order.

     Sorting by birth year makes that true. People with no recorded year keep
     their input position relative to each other and sort after those who have
     one, so the result stays fully deterministic (FR-20: a missing date is
     normal, not an error). */
  const unions: Union[] = [];
  const unionOf = new Map<string, number>();

  const byBirthThenInput = people
    .map((p, index) => ({ p, index }))
    .sort((a, b) => {
      const ay = a.p.birthDate?.year;
      const by = b.p.birthDate?.year;
      if (ay !== undefined && by !== undefined && ay !== by) return ay - by;
      if (ay !== undefined && by === undefined) return -1;
      if (ay === undefined && by !== undefined) return 1;
      return a.index - b.index;
    })
    .map((entry) => entry.p);

  for (const p of byBirthThenInput) {
    if (unionOf.has(p.id)) continue;
    const u: Union = { anchor: p.id, spouses: [], children: new Set<string>(), spouseEdgeIds: [] };
    unions.push(u);
    const i = unions.length - 1;
    unionOf.set(p.id, i);
    // Walk spouses transitively so a polygamous chain forms one union.
    const stack = [p.id];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const e of spouseByPerson.get(cur) ?? []) {
        const other = e.from === cur ? e.to : e.from;
        if (!unionOf.has(other)) {
          unionOf.set(other, i);
          u.spouses.push(other);
          u.spouseEdgeIds.push(e.id);
          stack.push(other);
        }
      }
    }
  }

  // Attach children to unions (a parent→child edge attaches to the parent's union).
  for (const e of edges) {
    if (e.kind !== 'parent') continue;
    const ui = unionOf.get(e.from);
    if (ui === undefined) continue;
    const u = unions[ui]!;
    if (unionOf.get(e.to) === ui) continue; // edge inside a union; not a child link
    u.children.add(e.to);
  }

  // --- root handling --------------------------------------------------------
  const rootUi = unionOf.get(rootId);
  if (rootUi === undefined) {
    const p = personById.get(rootId);
    if (!p) return { width: 0, height: 0, nodes: [], edges: [], byPersonId: new Map() };
    const node: PositionedNode = {
      person: p, x: cfg.nodeWidth / 2, y: cfg.nodeHeight / 2,
      generation: 0, depthUnloaded: 0, collapsed: false,
    };
    return { width: cfg.nodeWidth, height: cfg.nodeHeight, nodes: [node], edges: [], byPersonId: new Map([[rootId, node]]) };
  }

  // --- generation assignment (union-level, BFS down then up) ---------------
  const genByUnion = new Map<number, number>();
  const genByPerson = new Map<string, number>();
  genByUnion.set(rootUi, 0);

  const down = (ui: number, gen: number): void => {
    const u = unions[ui]!;
    for (const child of u.children) {
      if (genByPerson.has(child)) continue;
      genByPerson.set(child, gen + 1);
      const cui = unionOf.get(child);
      if (cui !== undefined && !genByUnion.has(cui)) {
        genByUnion.set(cui, gen + 1);
        down(cui, gen + 1);
      }
    }
  };
  down(rootUi, 0);

  const up = (ui: number, gen: number): void => {
    const u = unions[ui]!;
    for (const m of [u.anchor, ...u.spouses]) {
      for (const pe of parentEdgesByChild.get(m) ?? []) {
        const pui = unionOf.get(pe.from);
        if (pui === undefined || pui === ui) continue;
        if (genByUnion.has(pui)) continue;
        genByUnion.set(pui, gen - 1);
        up(pui, gen - 1);
      }
    }
  };
  up(rootUi, 0);

  // Any union unreachable from root (disconnected branch) gets a generation below.
  let spill = Math.max(0, ...genByUnion.values()) + 1;
  for (let i = 0; i < unions.length; i++) {
    if (!genByUnion.has(i)) {
      genByUnion.set(i, spill);
      spill += 1;
    }
  }

  // --- rows -----------------------------------------------------------------
  const minGen = Math.min(...genByUnion.values(), 0);
  const maxGen = Math.max(...genByUnion.values(), 0);
  const rows: number[][] = [];
  for (let g = minGen; g <= maxGen; g++) rows.push([]);
  for (const [ui, g] of genByUnion) {
    if (g < minGen || g > maxGen) continue;
    rows[g - minGen]!.push(ui);
  }
  for (const r of rows) r.sort((a, b) => a - b); // union index = discovery order → deterministic

  // --- widths ---------------------------------------------------------------
  const widthOfUnion = (ui: number): number => {
    const u = unions[ui]!;
    const members = 1 + u.spouses.length;
    return members * cfg.nodeWidth + Math.max(0, members - 1) * cfg.spouseGap;
  };
  const subtreeWidth = new Map<number, number>();
  const inProgress = new Set<number>();
  const computeWidth = (ui: number): number => {
    if (subtreeWidth.has(ui)) return subtreeWidth.get(ui)!;
    if (inProgress.has(ui)) return widthOfUnion(ui); // cycle guard: layout must always terminate
    inProgress.add(ui);
    const u = unions[ui]!;
    const own = widthOfUnion(ui);
    const kids = [...u.children].map((c) => unionOf.get(c)).filter((x): x is number => x !== undefined && x !== ui);
    const kidWidth = kids.reduce((acc, k) => acc + computeWidth(k), 0) + Math.max(0, kids.length - 1) * cfg.siblingGap;
    inProgress.delete(ui);
    const w = Math.max(own, kidWidth);
    subtreeWidth.set(ui, w);
    return w;
  };
  for (let i = 0; i < unions.length; i++) computeWidth(i);

  // --- x placement: bottom-up centring + per-row overlap sweep --------------
  // Only same-row overlap can collide visually (rows are vertically separated),
  // so placement is per row: lay the deepest row out, then centre each shallower
  // row over its (now-final) children and sweep left→right to remove overlaps.
  const unionX = new Map<number, number>(); // left edge
  const rowHeight = cfg.nodeHeight + cfg.generationGap;

  const gensDesc = [...new Set([...genByUnion.values()])].sort((a, b) => b - a);
  const rowUnions = (gen: number): number[] =>
    [...genByUnion.entries()].filter(([, g]) => g === gen).map(([ui]) => ui).sort((a, b) => a - b);

  // 1) initial left-to-right layout, deepest row first
  for (const gen of gensDesc) {
    let cursor = 0;
    for (const ui of rowUnions(gen)) {
      unionX.set(ui, cursor);
      cursor += (subtreeWidth.get(ui) ?? widthOfUnion(ui)) + cfg.siblingGap;
    }
  }

  // 2) centre each union over its children, then sweep the row
  for (const gen of gensDesc) {
    const row = rowUnions(gen);
    for (const ui of row) {
      const u = unions[ui]!;
      const kids = [...u.children].map((c) => unionOf.get(c)).filter((x): x is number => x !== undefined && x !== ui);
      if (kids.length === 0) continue;
      const kidLeft = Math.min(...kids.map((k) => unionX.get(k)!));
      const kidRight = Math.max(...kids.map((k) => unionX.get(k)! + (subtreeWidth.get(k) ?? 0)));
      unionX.set(ui, (kidLeft + kidRight) / 2 - widthOfUnion(ui) / 2);
    }
    row.sort((a, b) => unionX.get(a)! - unionX.get(b)!);
    for (let i = 1; i < row.length; i++) {
      const prev = row[i - 1]!;
      const cur = row[i]!;
      const minX = unionX.get(prev)! + (subtreeWidth.get(prev) ?? 0) + cfg.siblingGap;
      if (unionX.get(cur)! < minX) unionX.set(cur, minX);
    }
  }

  // Normalise to positive coordinates.
  let minX = Infinity;
  for (const x of unionX.values()) minX = Math.min(minX, x);
  if (!isFinite(minX)) minX = 0;
  const shift = -minX;
  let totalWidth = 0;
  for (const [ui, x] of unionX) totalWidth = Math.max(totalWidth, x + shift + (subtreeWidth.get(ui) ?? 0));

  // --- node placement -------------------------------------------------------
  const rowY = (origIndex: number) => {
    const visual = direction === 'descendant' ? origIndex : rows.length - 1 - origIndex;
    return visual * rowHeight + cfg.nodeHeight / 2;
  };
  const nodes: PositionedNode[] = [];
  const byPersonId = new Map<string, PositionedNode>();
  const placed = new Set<number>();
  for (let origIndex = 0; origIndex < rows.length; origIndex++) {
    for (const ui of rows[origIndex]!) {
      if (placed.has(ui)) continue;
      placed.add(ui);
      const u = unions[ui]!;
      const members = [u.anchor, ...u.spouses];
      let x = (unionX.get(ui) ?? 0) + shift;
      const y = rowY(origIndex);
      const gen = genByUnion.get(ui) ?? 0;
      for (const m of members) {
        const p = personById.get(m);
        if (p && !byPersonId.has(m)) {
          const node: PositionedNode = {
            person: p, x: x + cfg.nodeWidth / 2, y, generation: gen,
            depthUnloaded: 0, collapsed: false,
          };
          nodes.push(node);
          byPersonId.set(m, node);
        }
        x += cfg.nodeWidth + cfg.spouseGap;
      }
    }
  }

  // --- edges ------------------------------------------------------------------
  const posEdges: PositionedEdge[] = [];
  for (const e of edges) {
    const a = byPersonId.get(e.from);
    const b = byPersonId.get(e.to);
    if (!a || !b) continue;
    posEdges.push({ id: e.id, kind: e.kind, from: e.from, to: e.to, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }

  return {
    width: Math.max(totalWidth, cfg.nodeWidth),
    height: Math.max(rows.length * rowHeight - cfg.generationGap, cfg.nodeHeight),
    nodes,
    edges: posEdges,
    byPersonId,
  };
}

export function treePersonLabel(p: TreePerson): string {
  return displayName(p);
}

export function treePersonLifespan(p: TreePerson): string {
  const b = p.birthDate?.year;
  const d = p.deathDate?.year;
  if (!b && !d) return '';
  if (!d) return `${p.birthDate?.precision === 'circa' ? 'c. ' : ''}${b}`;
  return `${b ?? '?'} — ${d}`;
}
