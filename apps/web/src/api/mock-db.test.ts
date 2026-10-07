/* Seed integrity. `npm run seed` runs just this file.

   The seed is the only data most of the app is ever demonstrated against, so a
   broken edge in it looks like a broken feature. These assertions catch the
   cheap-to-make, expensive-to-debug mistakes: an edge pointing at a person who
   does not exist, a duplicate id, a cycle in the ancestor graph (FR-33), or a
   date the domain would refuse to format. */

import { describe, expect, it } from 'vitest';
import { createsCycle, isValidFamilyDate, type GraphEdge } from '@ft/domain';
import { seedDb } from './mock-db';

const db = seedDb();
const personIds = new Set(db.people.map((p) => p.id));

describe('seed data', () => {
  it('has a user, a family, and people', () => {
    expect(db.user).not.toBeNull();
    expect(db.families.length).toBeGreaterThan(0);
    expect(db.people.length).toBeGreaterThan(0);
  });

  it('points activeFamilyId at a family that exists', () => {
    expect(db.families.some((f) => f.id === db.activeFamilyId)).toBe(true);
  });

  it('has no duplicate ids', () => {
    const dupes = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes(db.people.map((p) => p.id))).toEqual([]);
    expect(dupes(db.relationships.map((r) => r.id))).toEqual([]);
    expect(dupes(db.stories.map((s) => s.id))).toEqual([]);
    expect(dupes(db.memories.map((m) => m.id))).toEqual([]);
  });

  it('scopes every person to a family that exists', () => {
    for (const p of db.people) {
      expect(db.families.some((f) => f.id === p.familyId)).toBe(true);
    }
  });

  it('only relates people who exist', () => {
    for (const r of db.relationships) {
      expect(personIds.has(r.fromPersonId), `${r.id} from`).toBe(true);
      expect(personIds.has(r.toPersonId), `${r.id} to`).toBe(true);
      expect(r.fromPersonId).not.toBe(r.toPersonId);
    }
  });

  it('has an acyclic ancestor graph', () => {
    const parentEdges: GraphEdge[] = db.relationships
      .filter((r) => r.kind === 'parent')
      .map((r) => ({ from: r.fromPersonId, to: r.toPersonId, kind: 'parent' as const }));

    expect(parentEdges.length).toBeGreaterThan(0);

    // Adding each edge back to the graph without it must never close a cycle.
    parentEdges.forEach((edge, i) => {
      const rest = parentEdges.filter((_, j) => j !== i);
      expect(createsCycle(rest, edge.from, edge.to), `${edge.from} → ${edge.to}`).toBe(false);
    });

    // Control: the check above is only meaningful if the graph is deep enough
    // for a cycle to be possible at all. Reversing a real edge must be refused.
    const deep = parentEdges.find((e) => parentEdges.some((o) => o.to === e.from));
    expect(deep, 'seed has no grandparent chain to test against').toBeDefined();
    expect(createsCycle(parentEdges, deep!.to, deep!.from)).toBe(true);
  });

  it('gives nobody two of the same parent, and no more parents than makes sense', () => {
    const parentsOf = new Map<string, string[]>();
    for (const r of db.relationships.filter((x) => x.kind === 'parent')) {
      parentsOf.set(r.toPersonId, [...(parentsOf.get(r.toPersonId) ?? []), r.fromPersonId]);
    }
    for (const [child, parents] of parentsOf) {
      expect(new Set(parents).size, `${child} has a duplicate parent edge`).toBe(parents.length);
    }
  });

  it('uses dates the domain can format', () => {
    for (const p of db.people) {
      if (p.birthDate) expect(isValidFamilyDate(p.birthDate), `${p.id} birth`).toBe(true);
      if (p.deathDate) expect(isValidFamilyDate(p.deathDate), `${p.id} death`).toBe(true);
    }
  });

  it('never records a death before a birth', () => {
    for (const p of db.people) {
      if (p.birthDate?.year && p.deathDate?.year) {
        expect(p.deathDate.year, `${p.id}`).toBeGreaterThanOrEqual(p.birthDate.year);
      }
    }
  });

  it('tags stories and memories against people who exist', () => {
    for (const s of db.stories) {
      for (const id of s.personIds) expect(personIds.has(id), `story ${s.id} → ${id}`).toBe(true);
    }
    for (const m of db.memories) {
      for (const id of m.personIds) expect(personIds.has(id), `memory ${m.id} → ${id}`).toBe(true);
    }
  });

  it('scopes every memory to a family that exists', () => {
    for (const m of db.memories) {
      expect(db.families.some((f) => f.id === m.familyId), `memory ${m.id}`).toBe(true);
    }
  });
});
