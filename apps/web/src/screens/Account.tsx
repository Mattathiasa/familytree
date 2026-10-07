import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, resetDemoData, family as familyApi } from '../api/client';
import { generateGedcom } from '../api/gedcom';
import { useApp } from '../app/store';
import { Avatar, Badge, Button, Card, Field, Input, Select, useToast } from '@ft/ui';
import type { NotificationPrefs, SessionUser } from '../api/types';
import { DEFAULT_NOTIFICATION_PREFS } from '../api/types';

export function Account() {
  const { user, familyId, families, refresh } = useApp();
  const nav = useNavigate();
  const toast = useToast();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [locale, setLocale] = useState<SessionUser['locale']>(user?.locale ?? 'en');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const notifications = { ...DEFAULT_NOTIFICATION_PREFS, ...user?.notifications };

  const fam = families.find((f) => f.id === familyId);

  async function setNotification(key: keyof NotificationPrefs, value: boolean) {
    try {
      await auth.updateProfile({ notifications: { [key]: value } });
      refresh();
    } catch {
      toast.push('We couldn\'t save that preference. Try again.', 'danger');
    }
  }

  async function signOut() {
    await auth.logout();
    refresh();
    nav('/');
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await auth.updateProfile({ displayName, locale });
      setSaved(true);
      toast.push('Profile saved.', 'success');
      refresh();
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.push('Failed to save profile.', 'danger');
    } finally {
      setSaving(false);
    }
  }

  function downloadJson() {
    const raw = localStorage.getItem('ft.mock.db.v1');
    const blob = new Blob([raw ?? '{}'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'familytree-complete-archive.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.push('Archive downloaded.', 'success');
  }

  async function downloadGedcom() {
    if (!familyId) return;
    setExporting(true);
    try {
      const { people: peopleApi } = await import('../api/client');
      const [peopleList, treeData] = await Promise.all([
        peopleApi.list(familyId),
        familyApi.tree(familyId),
      ]);
      const gedText = generateGedcom(fam?.name ?? 'family', peopleList, treeData.edges);
      const blob = new Blob([gedText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(fam?.name || 'family').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-lineage.ged`;
      a.click();
      URL.revokeObjectURL(url);
      toast.push('GEDCOM export downloaded.', 'success');
    } catch {
      toast.push('Failed to generate GEDCOM export.', 'danger');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Account & Session · መለያ</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2rem, 1.8rem + 1vw, 2.5rem)', margin: '0 0 6px' }}>
            Account Settings
          </h1>
          <p className="sub" style={{ margin: 0 }}>
            Your personal identity, session, and data sovereignty.
          </p>
        </div>
      </div>

      {/* User Identity Card */}
      <Card style={{ marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
          <Avatar name={user?.displayName ?? 'User'} size={64} />
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)', margin: '0 0 4px' }}>
              {user?.displayName}
            </h2>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{user?.email}</span>
              {user?.emailVerified
                ? <Badge tone="success">Verified</Badge>
                : <Badge tone="danger">Not verified</Badge>}
            </div>
          </div>
        </div>

        <Field label="Display name">
          {(id) => <Input id={id} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />}
        </Field>
        <Field label="Email" hint="Email changes arrive with the live backend service.">
          {(id) => <Input id={id} value={user?.email ?? ''} readOnly />}
        </Field>

        <Field label="Language / Language preference">
          {(id) => (
            <Select id={id} value={locale} onChange={(e) => setLocale(e.target.value as SessionUser['locale'])}>
              <option value="en">English</option>
              <option value="am">Amharic (አማርኛ)</option>
            </Select>
          )}
        </Field>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button onClick={saveProfile} loading={saving} disabled={saving || !user}>
            {saved ? 'Saved ✓' : 'Save profile'}
          </Button>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card style={{ marginBottom: 'var(--space-5)' }}>
        <div className="panel-title">Notification Preferences</div>
        <p className="muted small" style={{ marginBottom: 'var(--space-4)' }}>
          Control when and how you receive updates about your family archive.
        </p>
        {/* These were defaultChecked with no onChange and nothing behind them,
            so every visit showed the same two ticks and a reload undid any
            click. Spec §40/§42: every reminder must be individually
            disableable, which means the choice has to be stored. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {([
            ['contentAdded', 'Email me when someone adds a story or memory'],
            ['occasions', 'Notify me about family birthdays and anniversaries'],
            ['weeklyDigest', 'Weekly digest of family tree activity'],
          ] as const).map(([key, label]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={notifications[key]}
                onChange={(e) => void setNotification(key, e.target.checked)}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </Card>

      {/* Universal Data Backup */}
      <Card style={{ marginBottom: 'var(--space-5)' }}>
        <div className="panel-title">Data Sovereignty & Backups</div>
        <p className="muted small" style={{ lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
          Your ancestral archive belongs exclusively to your family. You can download the entire dataset at any time in universal formats:
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {familyId && (
            <Button variant="secondary" loading={exporting} onClick={downloadGedcom}>
              📜 Export GEDCOM (.ged)
            </Button>
          )}
          <Button variant="ghost" onClick={downloadJson}>
            📦 Export Full JSON Archive
          </Button>
          <Button variant="ghost" onClick={() => { resetDemoData(); toast.push('Demo data reset.'); refresh(); }}>
            Reset Demo Data
          </Button>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card style={{ borderColor: 'var(--color-danger)' }}>
        <div className="panel-title" style={{ color: 'var(--color-danger)' }}>Danger zone</div>
        <p className="muted small" style={{ marginBottom: 'var(--space-3)' }}>
          Deleting your account removes all your data permanently. This cannot be undone.
        </p>
        <Button variant="danger" onClick={() => toast.push('Account deletion is not available in the demo build.', 'danger')}>
          Delete my account
        </Button>
      </Card>

      {/* Session Card */}
      <Card style={{ marginTop: 'var(--space-5)' }}>
        <div className="panel-title">Active Session</div>
        <p className="muted small" style={{ marginBottom: 'var(--space-3)' }}>
          Signed in on this browser. Logging out will clear your local active session.
        </p>
        <Button variant="ghost" onClick={signOut}>Sign out</Button>
      </Card>
    </div>
  );
}
