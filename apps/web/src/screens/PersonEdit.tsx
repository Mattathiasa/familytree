import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { family as familyApi, people as peopleApi } from '../api/client';
import type { PersonDto } from '../api/types';
import { Alert, Button, Card, Field, Input, Select, Textarea, useToast } from '@ft/ui';
import { DateField } from '@ft/ui';
import type { FamilyDate } from '@ft/domain';
import { displayName } from '@ft/domain';

export function PersonEdit() {
  const { familyId, personId } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const editing = Boolean(personId);
  const addRelative = params.get('add'); // 'parent' | 'child' | 'spouse'
  const [relativeOf, setRelativeOf] = useState<PersonDto | null>(null);

  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<PersonDto['gender']>('unknown');
  const [birthDate, setBirthDate] = useState<FamilyDate | null>(null);
  const [deathDate, setDeathDate] = useState<FamilyDate | null>(null);
  const [birthPlace, setBirthPlace] = useState('');
  const [occupation, setOccupation] = useState('');
  const [biography, setBiography] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!personId) return;
    peopleApi.get(familyId!, personId!).then((p) => {
      setGivenName(p.givenName);
      setFamilyName(p.familyName ?? '');
      setNickname(p.nickname ?? '');
      setGender(p.gender);
      setBirthDate(p.birthDate);
      setDeathDate(p.deathDate);
      setBirthPlace(p.birthPlace);
      setOccupation(p.occupation);
      setBiography(p.biography);
    });
  }, [familyId, personId]);

  useEffect(() => {
    if (!addRelative) return;
    const anchorId = params.get('person');
    if (!anchorId) return;
    peopleApi.get(familyId!, anchorId).then(setRelativeOf);
  }, [addRelative, familyId, params]);

  const previewName = useMemo(
    () => displayName({ givenName, familyName, nickname }),
    [givenName, familyName, nickname],
  );

  async function save() {
    setBusy(true);
    setError(null);
    try {
      let person: PersonDto;
      if (editing) {
        const current = await peopleApi.get(familyId!, personId!);
        person = await peopleApi.update(familyId!, personId!, current.version, {
          givenName, familyName, nickname, gender,
          birthDate, deathDate, birthPlace, occupation, biography,
        });
      } else {
        person = await peopleApi.create(familyId!, {
          givenName, familyName, nickname, gender,
          birthDate, deathDate, birthPlace, occupation, biography,
        });
      }
      if (relativeOf && addRelative === 'parent') {
        await familyApiRel(relativeOf.id, person.id, 'parent');
      } else if (relativeOf && addRelative === 'child') {
        await familyApiRel(person.id, relativeOf.id, 'parent');
      } else if (relativeOf && addRelative === 'spouse') {
        await familyApiRel(relativeOf.id, person.id, 'spouse');
      }
      toast.push(editing ? 'Changes saved.' : `${previewName} added.`, 'success');
      nav(`/f/${familyId}/people/${person.id}`);
    } catch (err) {
      const ex = err as { code?: string; message?: string; fields?: Record<string, string> };
      if (ex.code === 'CONFLICT') setError('Someone else updated this person while you were editing. Reload and try again to keep both sets of changes safe.');
      else setError(ex.fields?.givenName ?? ex.message ?? 'We couldn\'t save this. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function familyApiRel(from: string, to: string, kind: 'parent' | 'spouse') {
    const { relationships } = await import('../api/client');
    await relationships.create(familyId!, { fromPersonId: from, toPersonId: to, kind });
  }

  const relativeTitle = relativeOf
    ? addRelative === 'parent' ? ` — parent of ${displayName(relativeOf)}`
      : addRelative === 'child' ? ` — child of ${displayName(relativeOf)}`
        : addRelative === 'spouse' ? ` — spouse of ${displayName(relativeOf)}`
          : ''
    : '';

  return (
    <div className="person-edit">
      <div className="page-head">
        <div>
          <div className="eyebrow">People</div>
          <h1>{editing ? 'Edit person' : 'Add a person'}{relativeTitle}</h1>
          <p className="sub">A name is the only thing required. Everything else can be added any time.</p>
        </div>
        <Link to={editing ? `/f/${familyId}/people/${personId}` : `/f/${familyId}/people`} className="ft-btn ft-btn--ghost">Cancel</Link>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      {/* This was a bare <Card> with a Button onClick, so pressing Enter in the
          name field did nothing and the `required` attribute below took part in
          no validation at all — on the screen that is the core loop of the
          product (UI_UX.md §10). */}
      <form
        onSubmit={(e) => { e.preventDefault(); void save(); }}
        noValidate
      >
      <Card>
        <Field label="Name" hint='Full name, e.g. "Abebe Abebe", "Sara", or "A. Tesfaye".'>
          {(id) => (
            <Input
              id={id} value={givenName} required
              onChange={(e) => setGivenName(e.target.value)}
              placeholder="Name"
              autoFocus
            />
          )}
        </Field>
        <div className="field-row">
          <Field label="Family name" hint="Optional — leave blank if not used.">
            {(id) => <Input id={id} value={familyName} onChange={(e) => setFamilyName(e.target.value)} />}
          </Field>
          <Field label="Nickname" hint="Optional — shown in the tree.">
            {(id) => <Input id={id} value={nickname} onChange={(e) => setNickname(e.target.value)} />}
          </Field>
        </div>
        <Field label="Gender" hint="Optional.">
          {(id) => (
            <Select id={id} value={gender} onChange={(e) => setGender(e.target.value as PersonDto['gender'])}>
              <option value="unknown">Prefer not to say / unknown</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </Select>
          )}
        </Field>

        <DateField label="Birth" value={birthDate} onChange={setBirthDate} />
        <DateField label="Death" value={deathDate} onChange={setDeathDate} />

        <div className="field-row">
          <Field label="Birth place" hint="Optional — typeahead matching arrives with Places.">
            {(id) => <Input id={id} value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} placeholder="e.g. Gondar, Ethiopia" />}
          </Field>
          <Field label="Occupation" hint="Optional.">
            {(id) => <Input id={id} value={occupation} onChange={(e) => setOccupation(e.target.value)} />}
          </Field>
        </div>

        <button type="button" className="ft-btn ft-btn--ghost" style={{ marginBottom: 'var(--space-3)' }} aria-expanded={showAdvanced} onClick={() => setShowAdvanced(!showAdvanced)}>
          {showAdvanced ? 'Hide' : 'Show'} biography
        </button>
        {showAdvanced && (
          <Field label="Biography" hint="A few sentences future generations will thank you for.">
            {(id) => <Textarea id={id} rows={5} value={biography} onChange={(e) => setBiography(e.target.value)} />}
          </Field>
        )}

        <div className="edit-footer">
          <span className="muted small" aria-live="polite">
            {previewName.trim() ? `Will appear as “${previewName}”` : ' '}
          </span>
          <Button type="submit" loading={busy}>{editing ? 'Save changes' : 'Add person'}</Button>
        </div>
      </Card>
      </form>
    </div>
  );
}
