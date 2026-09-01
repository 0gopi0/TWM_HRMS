export function parsePagination(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function paginated(items, total, { page, pageSize }) {
  return {
    data: items,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 0,
    },
  };
}
