/* DateField — precision selector beside every date (UI_UX.md §3.4).
   Selecting "Unknown" is a respected, first-class answer that stores precision='unknown'. */

import type { DatePrecision, FamilyDate } from '@ft/domain';
import { Input, Select } from './components';

export function DateField({
  label,
  value,
  onChange,
  allowRange = true,
}: {
  label: string;
  value: FamilyDate | null;
  onChange: (d: FamilyDate | null) => void;
  allowRange?: boolean;
}) {
  const cal = value?.calendar ?? 'gregorian';
  const precision: DatePrecision = value?.precision ?? 'unknown';

  const set = (patch: Partial<FamilyDate>) => {
    const base: FamilyDate = {
      calendar: cal,
      precision: value?.precision ?? 'year',
      year: value?.year,
      month: value?.month,
      day: value?.day,
      endYear: value?.endYear,
      endMonth: value?.endMonth,
      endDay: value?.endDay,
    };
    const next = { ...base, ...patch };
    // Drop fields inconsistent with the new precision (DB check constraints mirror this).
    if (next.precision === 'unknown') { delete next.year; delete next.month; delete next.day; delete next.endYear; }
    if (next.precision === 'year' || next.precision === 'circa') { delete next.month; delete next.day; delete next.endYear; }
    if (next.precision === 'month_year') { delete next.day; delete next.endYear; }
    if (next.precision === 'exact') { delete next.endYear; }
    onChange(next);
  };

  const showYear = precision !== 'unknown';
  const showMonth = precision === 'exact' || precision === 'month_year';
  const showDay = precision === 'exact';
  const showEnd = precision === 'range';

  return (
    <fieldset className="ft-datefield">
      <legend className="ft-label">{label}</legend>
      <div className="ft-datefield-row">
        <Select aria-label={`${label} calendar`} value={cal} onChange={(e) => set({ calendar: e.target.value as FamilyDate['calendar'] })}>
          <option value="gregorian">Gregorian</option>
          <option value="ethiopic">Ethiopian</option>
        </Select>
        <Select
          aria-label={`${label} precision`}
          value={precision}
          onChange={(e) => set({ precision: e.target.value as DatePrecision })}
        >
          <option value="exact">Exact</option>
          <option value="month_year">Month &amp; year</option>
          <option value="year">Year only</option>
          <option value="circa">Circa</option>
          {allowRange && <option value="range">Range</option>}
          <option value="unknown">Unknown</option>
        </Select>
        {showYear && (
          <Input
            type="number" inputMode="numeric" placeholder="Year"
            aria-label={`${label} year`} min={1} max={3000}
            value={value?.year ?? ''}
            onChange={(e) => set({ year: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
        )}
        {showMonth && (
          <Select aria-label={`${label} month`} value={value?.month ?? ''} onChange={(e) => set({ month: e.target.value === '' ? undefined : Number(e.target.value) })}>
            <option value="">Month…</option>
            {Array.from({ length: cal === 'ethiopic' ? 13 : 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{monthName(cal, m)}</option>
            ))}
          </Select>
        )}
        {showDay && (
          <Input
            type="number" inputMode="numeric" placeholder="Day" min={1} max={31}
            aria-label={`${label} day`}
            value={value?.day ?? ''}
            onChange={(e) => set({ day: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
        )}
        {showEnd && (
          <Input
            type="number" inputMode="numeric" placeholder="End year" min={1} max={3000}
            aria-label={`${label} end year`}
            value={value?.endYear ?? ''}
            onChange={(e) => set({ endYear: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
        )}
      </div>
    </fieldset>
  );
}

function monthName(cal: 'gregorian' | 'ethiopic', m: number): string {
  if (cal === 'ethiopic') {
    return ['Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'][m - 1] ?? String(m);
  }
  return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1] ?? String(m);
}
