import { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, Search, X } from 'lucide-react';
import {
  ACTIVE_GOVERNORATES,
  PROJECTS,
  getUniqueDevelopers,
} from '../data';
import { getTranslations, localize } from '../i18n/translations';
import type {
  ActiveGovernorateId,
  DeliveryStatus,
  FilterState,
  Locale,
  StageId,
  UnitCategory,
} from '../types/portfolio';
import { normalizeArabic, searchCatalog } from '../utils/search';

const PRIMARY_CATEGORIES: readonly UnitCategory[] = [
  'apartment',
  'villa',
  'townhouse',
  'chalet',
  'commercial',
  'hospitality',
];

const PRIMARY_STATUSES: readonly DeliveryStatus[] = [
  'ready_to_move',
  'ready_and_phased',
  'phased_delivery',
  'under_construction',
  'new_launch',
];

export interface GovernorateRailProps {
  locale: Locale;
  stage: StageId;
  activeGovernorateId: ActiveGovernorateId | null;
  filters: FilterState;
  filteredCount: number;
  onSelectGovernorate: (govId: ActiveGovernorateId) => void;
  onSelectAllEgypt: () => void;
  onSelectProjectFromSearch: (projectId: string) => void;
  onUpdateFilters: (patch: Partial<FilterState>) => void;
  onResetFilters: () => void;
  onOpenConsultation: () => void;
}

type SearchChoice =
  | { kind: 'gov'; id: ActiveGovernorateId; label: string; sub: string }
  | { kind: 'project'; id: string; label: string; sub: string };

export function GovernorateRail({
  locale,
  stage,
  activeGovernorateId,
  filters,
  filteredCount,
  onSelectGovernorate,
  onSelectAllEgypt,
  onSelectProjectFromSearch,
  onUpdateFilters,
  onResetFilters,
  onOpenConsultation,
}: GovernorateRailProps) {
  const t = getTranslations(locale);
  const developers = useMemo(() => getUniqueDevelopers(), []);
  const [dropdownDismissed, setDropdownDismissed] = useState<boolean>(false);
  const [highlightIdx, setHighlightIdx] = useState<number>(-1);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const normalizedSearch = normalizeArabic(filters.query);
  const searchResults = useMemo(
    () => searchCatalog(filters.query, PROJECTS, ACTIVE_GOVERNORATES),
    [filters.query],
  );

  const flatChoices = useMemo<SearchChoice[]>(() => {
    if (searchResults.isEmptyQuery) return [];
    const items: SearchChoice[] = [];

    const exactOrPrefixProjects = searchResults.projects.filter((proj) => {
      const nAr = normalizeArabic(proj.name.ar);
      const nEn = normalizeArabic(proj.name.en);
      return (
        nAr === normalizedSearch ||
        nEn === normalizedSearch ||
        nAr.startsWith(normalizedSearch) ||
        nEn.startsWith(normalizedSearch)
      );
    });
    const exactIds = new Set(exactOrPrefixProjects.map((p) => p.id));

    for (const proj of exactOrPrefixProjects) {
      items.push({
        kind: 'project',
        id: proj.id,
        label: localize(proj.name, locale),
        sub: `${localize(proj.developer, locale)} · ${localize(proj.district, locale)}`,
      });
    }

    for (const gov of searchResults.governorates) {
      items.push({
        kind: 'gov',
        id: gov.id,
        label: localize(gov.name, locale),
        sub: `${gov.projectCount} ${
          gov.projectCount === 1
            ? t.egyptDock.projectsSingular
            : t.egyptDock.projectsPlural
        }`,
      });
    }

    for (const proj of searchResults.projects) {
      if (exactIds.has(proj.id)) continue;
      items.push({
        kind: 'project',
        id: proj.id,
        label: localize(proj.name, locale),
        sub: `${localize(proj.developer, locale)} · ${localize(proj.district, locale)}`,
      });
    }
    return items;
  }, [
    searchResults,
    normalizedSearch,
    locale,
    t.egyptDock.projectsPlural,
    t.egyptDock.projectsSingular,
  ]);

  const isDropdownVisible = normalizedSearch.length > 0 && !dropdownDismissed;

  useEffect(() => {
    if (!isDropdownVisible) return undefined;
    const onOutsidePointer = (event: MouseEvent | TouchEvent): void => {
      const root = searchBoxRef.current;
      if (root && event.target instanceof Node && !root.contains(event.target)) {
        setDropdownDismissed(true);
        setHighlightIdx(-1);
      }
    };
    document.addEventListener('mousedown', onOutsidePointer);
    document.addEventListener('touchstart', onOutsidePointer, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onOutsidePointer);
      document.removeEventListener('touchstart', onOutsidePointer);
    };
  }, [isDropdownVisible]);

  const chooseOption = (choice: SearchChoice): void => {
    setDropdownDismissed(true);
    setHighlightIdx(-1);
    onUpdateFilters({ query: '' });
    if (choice.kind === 'gov') {
      onSelectGovernorate(choice.id);
    } else {
      onSelectProjectFromSearch(choice.id);
    }
  };

  const hasActiveFilters =
    filters.unitCategory !== null ||
    filters.status !== null ||
    filters.developer !== null ||
    normalizedSearch.length > 0;

  return (
    <section
      className={
        stage === 'governorate'
          ? 'governorate-rail governorate-rail--with-drawer surface-plaster'
          : 'governorate-rail surface-plaster'
      }
      aria-label={t.egyptDock.title}
    >
      {/* Row 1: Search + Developer Dropdown + Live Count + Reset */}
      <div className="rail-top-row">
        <div ref={searchBoxRef} className="search-field rail-search-box">
          <Search size={15} className="rail-search-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            id="egypt-search-input"
            type="search"
            className="search-input rail-search-input"
            value={filters.query}
            placeholder={t.egyptDock.searchPlaceholder}
            aria-label={t.egyptDock.searchAria}
            autoComplete="off"
            onChange={(e) => {
              setDropdownDismissed(false);
              setHighlightIdx(-1);
              onUpdateFilters({ query: e.target.value });
            }}
            onFocus={() => {
              if (normalizedSearch.length > 0) {
                setDropdownDismissed(false);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && isDropdownVisible) {
                e.preventDefault();
                e.stopPropagation();
                setDropdownDismissed(true);
                setHighlightIdx(-1);
                return;
              }
              if (!isDropdownVisible || flatChoices.length === 0) return;

              if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                setHighlightIdx((prev) => (prev + 1) % flatChoices.length);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                setHighlightIdx((prev) =>
                  prev <= 0 ? flatChoices.length - 1 : prev - 1,
                );
              } else if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                const target = flatChoices[highlightIdx >= 0 ? highlightIdx : 0];
                if (target) chooseOption(target);
              }
            }}
          />
          {filters.query.length > 0 ? (
            <button
              type="button"
              className="rail-search-clear"
              aria-label={t.egyptDock.searchClear}
              onClick={() => {
                setDropdownDismissed(true);
                setHighlightIdx(-1);
                onUpdateFilters({ query: '' });
                inputRef.current?.focus();
              }}
            >
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}

          {isDropdownVisible ? (
            <div
              id="egypt-search-results"
              className="search-results"
              role="listbox"
              aria-label={t.egyptDock.searchAria}
            >
              {flatChoices.length === 0 ? (
                <div className="search-empty-box">
                  <p>{t.egyptDock.searchNoResults}</p>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      setDropdownDismissed(true);
                      onOpenConsultation();
                    }}
                  >
                    {t.egyptDock.searchSuggestConsult}
                  </button>
                </div>
              ) : (
                <div className="search-options-list">
                  {flatChoices.map((choice, idx) => {
                    const isActive = idx === highlightIdx;
                    return (
                      <button
                        key={`${choice.kind}-${choice.id}`}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        className={
                          isActive
                            ? 'search-option search-option--active'
                            : 'search-option'
                        }
                        onMouseEnter={() => setHighlightIdx(idx)}
                        onClick={() => chooseOption(choice)}
                      >
                        <span className="search-option__title">{choice.label}</span>
                        <span className="search-option__sub tabular-nums">
                          {choice.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="rail-select-wrap">
          <select
            id="filter-developer-select"
            className="select-field"
            aria-label={t.egyptDock.filterDeveloperLabel}
            value={filters.developer ?? ''}
            onChange={(e) =>
              onUpdateFilters({
                developer: e.target.value ? e.target.value : null,
              })
            }
          >
            <option value="">
              {t.egyptDock.filterDeveloperLabel}: {t.egyptDock.filterAll}
            </option>
            {developers.map((dev) => (
              <option key={dev.en} value={dev.en}>
                {localize(dev, locale)}
              </option>
            ))}
          </select>
        </div>

        <div className="rail-meta-actions">
          <span className="rail-count-pill tabular-nums">
            {t.egyptDock.showingCountLabel}: <strong>{filteredCount}</strong>
          </span>
          <button
            id="filter-reset-btn"
            type="button"
            className={
              hasActiveFilters ? 'btn btn--secondary btn--sm' : 'btn btn--ghost btn--sm'
            }
            onClick={onResetFilters}
          >
            <RotateCcw size={13} aria-hidden="true" />
            <span>{t.egyptDock.resetFilters}</span>
          </button>
        </div>
      </div>

      {/* Row 2: 6 Active Governorate Corridor Chips (Flagship Alexandria First) */}
      <div className="rail-scroll-row" role="group" aria-label={t.egyptDock.title}>
        {stage === 'governorate' ? (
          <button
            type="button"
            className="chip"
            onClick={onSelectAllEgypt}
          >
            {t.egyptDock.allEgypt}
          </button>
        ) : null}
        {ACTIVE_GOVERNORATES.map((gov) => {
          const isSelected = activeGovernorateId === gov.id;
          return (
            <button
              key={gov.id}
              id={`gov-card-${gov.id}`}
              type="button"
              className={isSelected ? 'chip chip--active' : 'chip'}
              aria-pressed={isSelected}
              data-active={isSelected ? 'true' : 'false'}
              onClick={() => onSelectGovernorate(gov.id)}
            >
              <span>{localize(gov.shortName, locale)}</span>{' '}
              <span className="badge badge--neutral tabular-nums">
                {gov.projectCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Row 3: Unit Category & Delivery Status Chips */}
      <div className="rail-scroll-row rail-filters-row">
        {PRIMARY_CATEGORIES.map((cat) => {
          const active = filters.unitCategory === cat;
          return (
            <button
              key={cat}
              id={`filter-category-${cat}`}
              type="button"
              className={active ? 'chip chip--sm chip--active' : 'chip chip--sm'}
              aria-pressed={active}
              data-active={active ? 'true' : 'false'}
              onClick={() =>
                onUpdateFilters({ unitCategory: active ? null : cat })
              }
            >
              {t.unitCategories[cat]}
            </button>
          );
        })}

        <span className="rail-divider" aria-hidden="true" />

        {PRIMARY_STATUSES.map((st) => {
          const active = filters.status === st;
          return (
            <button
              key={st}
              id={`filter-status-${st}`}
              type="button"
              className={active ? 'chip chip--sm chip--active' : 'chip chip--sm'}
              aria-pressed={active}
              data-active={active ? 'true' : 'false'}
              onClick={() => onUpdateFilters({ status: active ? null : st })}
            >
              {t.deliveryStatuses[st]}
            </button>
          );
        })}
      </div>

      {/* Zero-match Empty State (EC-05) */}
      {filteredCount === 0 && stage === 'egypt' ? (
        <div className="rail-empty-banner" role="status">
          <span>
            <strong>0</strong> · {t.egyptDock.emptyTitle}
          </span>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={onResetFilters}
          >
            {t.egyptDock.resetFilters}
          </button>
        </div>
      ) : null}
    </section>
  );
}
