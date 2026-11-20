'use client';
import { useMemo, useState } from 'react';
import { Pagination } from './Pagination';
export interface DataColumn<T> { key: string; label: string; value: (row: T) => string; render?: (row: T) => React.ReactNode; sortable?: boolean }
export function DataTable<T>({ rows, columns, rowKey, label }: { rows: T[]; columns: DataColumn<T>[]; rowKey: (row: T) => string; label: string }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState({ key: columns[0].key, direction: 1 });
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const column = columns.find(item => item.key === sort.key);
    return rows.filter(row => !query || columns.some(item => item.value(row).toLowerCase().includes(query))).sort((left, right) => sort.direction * (column?.value(left) ?? '').localeCompare(column?.value(right) ?? '', undefined, { numeric: true }) || rowKey(left).localeCompare(rowKey(right)));
  }, [rows, columns, rowKey, search, sort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const currentPage = Math.min(page, totalPages);
  return <div className="card settings-data-table">
    <div className="settings-table-toolbar"><input className="form-control" aria-label={`Search ${label}`} placeholder="Search contacts…" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /><label>Rows <select className="form-select" aria-label={`${label} per page`} value={limit} onChange={event => { setLimit(Number(event.target.value)); setPage(1); }}>{[10, 20, 50].map(size => <option key={size} value={size}>{size}</option>)}</select></label></div>
    <div className="settings-table-scroll"><table className="statement-table"><thead><tr>{columns.map(column => <th key={column.key} aria-sort={column.sortable === false || sort.key !== column.key ? undefined : sort.direction === 1 ? 'ascending' : 'descending'}>{column.sortable === false ? column.label : <button className="settings-sort-button" onClick={() => { setSort({ key: column.key, direction: sort.key === column.key ? -sort.direction : 1 }); setPage(1); }}>{column.label} {sort.key === column.key ? sort.direction === 1 ? '↑' : '↓' : '↕'}</button>}</th>)}</tr></thead><tbody>{filtered.slice((currentPage - 1) * limit, currentPage * limit).map(row => <tr key={rowKey(row)}>{columns.map(column => <td key={column.key}>{column.render ? column.render(row) : column.value(row)}</td>)}</tr>)}{filtered.length === 0 && <tr><td colSpan={columns.length} className="settings-empty">No contacts match this view.</td></tr>}</tbody></table></div>
    <Pagination page={currentPage} totalPages={totalPages} total={filtered.length} limit={limit} onPageChange={setPage} label={label} />
  </div>;
}
