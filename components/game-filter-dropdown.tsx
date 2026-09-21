import { FilterDropdown } from '@/components/filter-dropdown';
import { savedFilterLabel, type FilterOption, type GameFilter } from '@/lib/game-filters';

export function GameFilterDropdown({ value, onChange, disabled, options }: { options: FilterOption[]; value: GameFilter; onChange: (value: GameFilter) => void; disabled?: boolean }) {
  return <FilterDropdown options={options} value={value} onChange={onChange} disabled={disabled}
    label="Filter games" fallbackLabel={savedFilterLabel(value)} active={value !== 'all'} />;
}
