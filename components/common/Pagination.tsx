"use client";

export function pageNumbers(page: number, totalPages: number): (number | string)[] {
  const total = Math.max(1, totalPages);
  const selected = new Set([1, total]);
  for (let index = Math.max(1, page - 1); index <= Math.min(total, page + 1); index++) selected.add(index);
  if (total <= 7) for (let index = 1; index <= total; index++) selected.add(index);
  const pages = [...selected].sort((left, right) => left - right);
  return pages.flatMap((value, index) => index && value - pages[index - 1] > 1 ? [`gap-${value}`, value] : [value]);
}

export function Pagination({ page, totalPages, total, limit, disabled = false, onPageChange, label = 'Records' }: {
  page: number; totalPages: number; total: number; limit: number; disabled?: boolean;
  onPageChange: (page: number) => void; label?: string;
}) {
  return <nav className="admin-pagination" aria-label={`${label} pagination`}>
    <span>{total ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)}` : '0'} of {total} {label.toLowerCase()}</span>
    <div className="admin-page-buttons">
      <button type="button" className="btn btn-sm btn-ghost" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
      {pageNumbers(page, totalPages).map(value => typeof value === 'number' ? <button key={value} type="button" className={`btn btn-sm ${value === page ? 'btn-primary' : 'btn-ghost'}`} aria-label={`Page ${value}`} aria-current={value === page ? 'page' : undefined} disabled={disabled} onClick={() => onPageChange(value)}>{value}</button> : <span key={value} aria-hidden="true">…</span>)}
      <button type="button" className="btn btn-sm btn-ghost" disabled={disabled || page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
    </div>
  </nav>;
}
