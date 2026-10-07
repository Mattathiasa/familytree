import { describe, it, expect } from 'vitest';
import { layoutTree, type TreePerson, type TreeEdge } from './layout';

const P = (id: string, birthYear?: number): TreePerson => ({
  id,
  givenName: id,
  birthDate: birthYear ? { calendar: 'gregorian', precision: 'year', year: birthYear } : null,
});

describe('layoutTree — golden positions', () => {
  it('places a single person deterministically', () => {
    const r = layoutTree('a', [P('a')], []);
    expect(r.nodes).toHaveLength(1);
    expect(r.nodes[0]!.x).toBe(84); // nodeWidth/2
    expect(r.nodes[0]!.y).toBe(32); // nodeHeight/2
    expect(r.width).toBe(168);
    expect(r.height).toBe(64);
  });

  it('deterministic: same input → same output', () => {
    const people = [P('a', 1940), P('b', 1965), P('c', 1968)];
    const edges: TreeEdge[] = [
      { id: 'e1', from: 'a', to: 'b', kind: 'parent' },
      { id: 'e2', from: 'a', to: 'c', kind: 'parent' },
    ];
    const r1 = layoutTree('a', people, edges);
    const r2 = layoutTree('a', people, edges);
    expect(r1).toEqual(r2);
  });
});

describe('layoutTree — structure', () => {
  it('puts a child one generation below its parent and honours birth order', () => {
    const people = [P('dad', 1940), P('kid1', 1965), P('kid2', 1968)];
    const edges: TreeEdge[] = [
      { id: 'e1', from: 'dad', to: 'kid1', kind: 'parent' },
      { id: 'e2', from: 'dad', to: 'kid2', kind: 'parent' },
    ];
    const r = layoutTree('dad', people, edges);
    const dad = r.byPersonId.get('dad')!;
    const k1 = r.byPersonId.get('kid1')!;
    const k2 = r.byPersonId.get('kid2')!;
    expect(dad.generation).toBe(0);
    expect(k1.generation).toBe(1);
    expect(k2.generation).toBe(1);
    expect(k1.y).toBeGreaterThan(dad.y);
    expect(k2.y).toBe(k1.y);
    expect(k1.x).toBeLessThan(k2.x); // earlier birth on the left
  });

  it('orders siblings by birth even when the input array disagrees', () => {
    // The assertion above passed incidentally for years: the layout ordered by
    // input position, and the fixture happened to list the elder first. This is
    // the same claim with the array deliberately out of order.
    const people = [P('dad', 1940), P('younger', 1968), P('elder', 1965)];
    const edges: TreeEdge[] = [
      { id: 'e1', from: 'dad', to: 'younger', kind: 'parent' },
      { id: 'e2', from: 'dad', to: 'elder', kind: 'parent' },
    ];
    const r = layoutTree('dad', people, edges);
    expect(r.byPersonId.get('elder')!.x).toBeLessThan(r.byPersonId.get('younger')!.x);
  });

  it('keeps siblings with no recorded birth year in a stable order after those who have one', () => {
    const people = [P('dad', 1940), P('unknown-a'), P('dated', 1970), P('unknown-b')];
    const edges: TreeEdge[] = [
      { id: 'e1', from: 'dad', to: 'unknown-a', kind: 'parent' },
      { id: 'e2', from: 'dad', to: 'dated', kind: 'parent' },
      { id: 'e3', from: 'dad', to: 'unknown-b', kind: 'parent' },
    ];
    const r = layoutTree('dad', people, edges);
    const x = (id: string) => r.byPersonId.get(id)!.x;

    // A missing date is normal, not an error (FR-20) — it must not reorder
    // unpredictably or vanish.
    expect(x('dated')).toBeLessThan(x('unknown-a'));
    expect(x('unknown-a')).toBeLessThan(x('unknown-b'));

    // And the whole thing is still deterministic.
    const again = layoutTree('dad', people, edges);
    expect(again.nodes.map((n) => [n.person.id, n.x, n.y]))
      .toEqual(r.nodes.map((n) => [n.person.id, n.x, n.y]));
  });

  it('couples sit adjacent on the same row, joined by a spouse edge', () => {
    const people = [P('a', 1940), P('b', 1942), P('c', 1965)];
    const edges: TreeEdge[] = [
      { id: 's1', from: 'a', to: 'b', kind: 'spouse' },
      { id: 'e1', from: 'a', to: 'c', kind: 'parent' },
    ];
    const r = layoutTree('a', people, edges);
    const a = r.byPersonId.get('a')!;
    const b = r.byPersonId.get('b')!;
    const c = r.byPersonId.get('c')!;
    expect(a.y).toBe(b.y); // same row
    expect(Math.abs(a.x - b.x)).toBe(188); // nodeWidth + spouseGap
    expect(c.generation).toBe(1);
    expect(r.edges.some((e) => e.kind === 'spouse')).toBe(true);
  });

  it('children of two parents hang under the couple', () => {
    const people = [P('a', 1940), P('b', 1942), P('c', 1965)];
    const edges: TreeEdge[] = [
      { id: 's1', from: 'a', to: 'b', kind: 'spouse' },
      { id: 'e1', from: 'a', to: 'c', kind: 'parent' },
      { id: 'e2', from: 'b', to: 'c', kind: 'parent' },
    ];
    const r = layoutTree('a', people, edges);
    const coupleCentre = (r.byPersonId.get('a')!.x + r.byPersonId.get('b')!.x) / 2;
    const c = r.byPersonId.get('c')!;
    expect(Math.abs(c.x - coupleCentre)).toBeLessThan(200);
  });

  it('handles multiple spouses (children from different unions)', () => {
    const people = [P('m', 1930), P('w1', 1932), P('w2', 1936), P('k1', 1955), P('k2', 1960)];
    const edges: TreeEdge[] = [
      { id: 's1', from: 'm', to: 'w1', kind: 'spouse' },
      { id: 's2', from: 'm', to: 'w2', kind: 'spouse' },
      { id: 'e1', from: 'm', to: 'k1', kind: 'parent' },
      { id: 'e2', from: 'w2', to: 'k2', kind: 'parent' },
    ];
    const r = layoutTree('m', people, edges);
    expect(r.byPersonId.get('k1')!.generation).toBe(1);
    expect(r.byPersonId.get('k2')!.generation).toBe(1);
    // all five people placed
    for (const p of people) expect(r.byPersonId.has(p.id)).toBe(true);
  });

  it('renders a grandchild two generations down', () => {
    const people = [P('g', 1920), P('p', 1945), P('c', 1970)];
    const edges: TreeEdge[] = [
      { id: 'e1', from: 'g', to: 'p', kind: 'parent' },
      { id: 'e2', from: 'p', to: 'c', kind: 'parent' },
    ];
    const r = layoutTree('g', people, edges);
    expect(r.byPersonId.get('g')!.generation).toBe(0);
    expect(r.byPersonId.get('p')!.generation).toBe(1);
    expect(r.byPersonId.get('c')!.generation).toBe(2);
  });

  it('ancestor direction inverts the row order', () => {
    const people = [P('g', 1920), P('p', 1945)];
    const edges: TreeEdge[] = [{ id: 'e1', from: 'g', to: 'p', kind: 'parent' }];
    const desc = layoutTree('p', people, edges, { direction: 'descendant' });
    const anc = layoutTree('p', people, edges, { direction: 'ancestor' });
    const gDesc = desc.byPersonId.get('g')!;
    const gAnc = anc.byPersonId.get('g')!;
    expect(gDesc.y).toBeLessThan(desc.byPersonId.get('p')!.y);
    expect(gAnc.y).toBeGreaterThan(anc.byPersonId.get('p')!.y);
  });

  it('survives a cycle attempt (defensive: layout must terminate)', () => {
    const people = [P('a'), P('b')];
    const edges: TreeEdge[] = [
      { id: 'e1', from: 'a', to: 'b', kind: 'parent' },
      { id: 'e2', from: 'b', to: 'a', kind: 'parent' },
    ];
    const r = layoutTree('a', people, edges);
    expect(r.nodes).toHaveLength(2); // terminates; guard places each person once
  });

  it('handles a disconnected person without crashing', () => {
    const people = [P('a'), P('loner')];
    const r = layoutTree('a', people, []);
    expect(r.nodes).toHaveLength(2);
    expect(r.byPersonId.has('loner')).toBe(true);
  });

  it('places a wide generation without overlap (within each row)', () => {
    const people = [P('dad'), ...['k1', 'k2', 'k3', 'k4', 'k5', 'k6'].map((k) => P(k))];
    const edges: TreeEdge[] = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6'].map((k, i) => ({
      id: `e${i}`, from: 'dad', to: k, kind: 'parent' as const,
    }));
    const r = layoutTree('dad', people, edges);
    // Nodes on the same row must never overlap; a parent centred between two
    // children may legitimately sit closer to each than one node-width.
    const byRow = new Map<number, number[]>();
    for (const n of r.nodes) {
      const list = byRow.get(n.y) ?? [];
      list.push(n.x);
      byRow.set(n.y, list);
    }
    for (const [, xs] of byRow) {
      const sorted = [...xs].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i]! - sorted[i - 1]!).toBeGreaterThanOrEqual(168);
      }
    }
  });
});
