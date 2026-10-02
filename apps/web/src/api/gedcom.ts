import type { PersonDto, RelationshipDto } from './types';
import { toGregorianAnchor } from '@ft/domain';

const GEDCOM_MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

function sanitizeGedcomText(str: string): string {
  return str.replace(/[\r\n]+/g, ' ').trim();
}

/**
 * Generates standard GEDCOM 5.5.1 text for universal family tree exchange.
 * Fully compatible with Ancestry, MyHeritage, FamilySearch, Gramps, and RootsMagic.
 */
export function generateGedcom(
  familyName: string,
  people: PersonDto[],
  relationships: RelationshipDto[],
): string {
  const lines: string[] = [];

  const now = new Date();
  const day = now.getDate();
  const mon = GEDCOM_MONTHS[now.getMonth()];
  const yr = now.getFullYear();
  const dateStr = `${day} ${mon} ${yr}`;

  // 1. Header
  lines.push('0 HEAD');
  lines.push('1 SOUR FAMILYTREE');
  lines.push('2 NAME FamilyTree Heritage');
  lines.push('2 VERS 1.0.0');
  lines.push('1 DEST ANY');
  lines.push(`1 DATE ${dateStr}`);
  lines.push('1 SUBM @SUBM1@');
  lines.push(`1 FILE ${sanitizeGedcomText(familyName || 'family')}.ged`);
  lines.push('1 GEDC');
  lines.push('2 VERS 5.5.1');
  lines.push('2 FORM LINEAGE-LINKED');
  lines.push('1 CHAR UTF-8');

  // Submitter
  lines.push('0 @SUBM1@ SUBM');
  lines.push('1 NAME FamilyTree User');

  // Build family group structures
  // A family group (FAM) in GEDCOM links parents (HUSB/WIFE) with their CHILDREN (CHIL)
  const childToParents = new Map<string, string[]>();
  for (const r of relationships) {
    if (r.kind === 'parent') {
      const childId = r.toPersonId;
      const parentId = r.fromPersonId;
      const existing = childToParents.get(childId) ?? [];
      existing.push(parentId);
      childToParents.set(childId, existing);
    }
  }

  // Find explicit spouse pairs
  const spousePairs: Array<{ id1: string; id2: string; marriedDate?: any }> = [];
  for (const r of relationships) {
    if (r.kind === 'spouse') {
      const already = spousePairs.some(
        (sp) => (sp.id1 === r.fromPersonId && sp.id2 === r.toPersonId) || (sp.id1 === r.toPersonId && sp.id2 === r.fromPersonId),
      );
      if (!already) {
        spousePairs.push({ id1: r.fromPersonId, id2: r.toPersonId, marriedDate: r.marriedDate });
      }
    }
  }

  interface FamRecord {
    id: string;
    husbId?: string;
    wifeId?: string;
    children: string[];
    marriedDate?: any;
  }

  const famRecords: FamRecord[] = [];
  let famCounter = 1;

  // Track which parents pair belongs to which FAM
  const parentPairToFamId = new Map<string, string>();

  function pairKey(idA: string, idB: string): string {
    return [idA, idB].sort().join('::');
  }

  // 1. Spouses become FAM records
  for (const sp of spousePairs) {
    const p1 = people.find((p) => p.id === sp.id1);
    const p2 = people.find((p) => p.id === sp.id2);
    let husbId = sp.id1;
    let wifeId = sp.id2;
    if (p1?.gender === 'female' || p2?.gender === 'male') {
      husbId = sp.id2;
      wifeId = sp.id1;
    }
    const fId = `F${famCounter++}`;
    famRecords.push({ id: fId, husbId, wifeId, children: [], marriedDate: sp.marriedDate });
    parentPairToFamId.set(pairKey(sp.id1, sp.id2), fId);
  }

  // 2. Children linked to parents
  for (const [childId, pList] of childToParents.entries()) {
    if (pList.length >= 2 && pList[0] && pList[1]) {
      const key = pairKey(pList[0], pList[1]);
      let fId = parentPairToFamId.get(key);
      if (!fId) {
        fId = `F${famCounter++}`;
        const p1 = people.find((p) => p.id === pList[0]);
        let husbId = pList[0];
        let wifeId = pList[1];
        if (p1?.gender === 'female') {
          husbId = pList[1];
          wifeId = pList[0];
        }
        famRecords.push({ id: fId, husbId, wifeId, children: [childId] });
        parentPairToFamId.set(key, fId);
      } else {
        const fam = famRecords.find((f) => f.id === fId);
        if (fam && !fam.children.includes(childId)) {
          fam.children.push(childId);
        }
      }
    } else if (pList.length === 1) {
      const singleParent = pList[0];
      const p = people.find((x) => x.id === singleParent);
      // see if single parent already has a fam record
      let fam = famRecords.find((f) => f.husbId === singleParent || f.wifeId === singleParent);
      if (!fam) {
        const fId = `F${famCounter++}`;
        fam = {
          id: fId,
          husbId: p?.gender === 'female' ? undefined : singleParent,
          wifeId: p?.gender === 'female' ? singleParent : undefined,
          children: [childId],
        };
        famRecords.push(fam);
      } else {
        if (!fam.children.includes(childId)) fam.children.push(childId);
      }
    }
  }

  // Map person to their FAMS (as spouse) and FAMC (as child)
  const personFams = new Map<string, string[]>();
  const personFamc = new Map<string, string[]>();

  for (const fam of famRecords) {
    if (fam.husbId) {
      const arr = personFams.get(fam.husbId) ?? [];
      arr.push(fam.id);
      personFams.set(fam.husbId, arr);
    }
    if (fam.wifeId) {
      const arr = personFams.get(fam.wifeId) ?? [];
      arr.push(fam.id);
      personFams.set(fam.wifeId, arr);
    }
    for (const cId of fam.children) {
      const arr = personFamc.get(cId) ?? [];
      if (!arr.includes(fam.id)) arr.push(fam.id);
      personFamc.set(cId, arr);
    }
  }

  // 2. Individuals (INDI)
  for (const p of people) {
    lines.push(`0 @I${p.id}@ INDI`);

    // Names
    const given = [p.givenName, p.middleName].filter(Boolean).join(' ');
    const surname = p.familyName || '';
    lines.push(`1 NAME ${given}${surname ? ` /${surname}/` : ''}`);
    if (given) lines.push(`2 GIVN ${given}`);
    if (surname) lines.push(`2 SURN ${surname}`);
    if (p.nickname) lines.push(`1 NICK ${p.nickname}`);

    // Gender
    const sex = p.gender === 'female' ? 'F' : p.gender === 'male' ? 'M' : 'U';
    lines.push(`1 SEX ${sex}`);

    // Birth
    if (p.birthDate && p.birthDate.precision !== 'unknown') {
      lines.push('1 BIRT');
      const greg = toGregorianAnchor(p.birthDate);
      if (greg) {
        const prefix = p.birthDate.precision === 'circa' ? 'ABT ' : '';
        const dayStr = p.birthDate.day ? `${p.birthDate.day} ` : '';
        const monStr = p.birthDate.month ? `${GEDCOM_MONTHS[p.birthDate.month - 1]} ` : '';
        lines.push(`2 DATE ${prefix}${dayStr}${monStr}${p.birthDate.year ?? greg.year}`);
      }
      if (p.birthPlace) {
        lines.push(`2 PLAC ${sanitizeGedcomText(p.birthPlace)}`);
      }
    }

    // Death
    if (p.deathDate && p.deathDate.precision !== 'unknown') {
      lines.push('1 DEAT');
      lines.push('2 DATE ' + (p.deathDate.year ?? ''));
      if (p.deathPlace) {
        lines.push(`2 PLAC ${sanitizeGedcomText(p.deathPlace)}`);
      }
    } else if (p.isLiving === false) {
      lines.push('1 DEAT Y');
    }

    // Occupation
    if (p.occupation) {
      lines.push(`1 OCCU ${sanitizeGedcomText(p.occupation)}`);
    }

    // Biography Notes
    if (p.biography) {
      const bioLines = p.biography.split(/\r?\n/).filter(Boolean);
      if (bioLines.length > 0 && bioLines[0]) {
        lines.push(`1 NOTE ${sanitizeGedcomText(bioLines[0])}`);
        for (let i = 1; i < bioLines.length; i++) {
          const l = bioLines[i];
          if (l) lines.push(`2 CONT ${sanitizeGedcomText(l)}`);
        }
      }
    }

    // Family links
    const fams = personFams.get(p.id) ?? [];
    for (const fId of fams) {
      lines.push(`1 FAMS @${fId}@`);
    }
    const famc = personFamc.get(p.id) ?? [];
    for (const fId of famc) {
      lines.push(`1 FAMC @${fId}@`);
    }
  }

  // 3. Family records (FAM)
  for (const fam of famRecords) {
    lines.push(`0 @${fam.id}@ FAM`);
    if (fam.husbId) lines.push(`1 HUSB @I${fam.husbId}@`);
    if (fam.wifeId) lines.push(`1 WIFE @I${fam.wifeId}@`);
    if (fam.marriedDate && fam.marriedDate.year) {
      lines.push('1 MARR');
      lines.push(`2 DATE ${fam.marriedDate.year}`);
    }
    for (const cId of fam.children) {
      lines.push(`1 CHIL @I${cId}@`);
    }
  }

  // 4. Trailer
  lines.push('0 TRLR');

  return lines.join('\n');
}
