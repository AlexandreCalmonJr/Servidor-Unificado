/**
 * utils/paginationHelper.js
 * Helpers para paginação com cursor
 */

/**
 * Cria uma query com cursor para Mongoose
 * @param {Object} query - Query do Mongoose
 * @param {string} cursor - Cursor da última página (base64 do _id)
 * @param {number} limit - Quantidade de itens
 * @param {string} sortBy - Campo para ordenar (default: _id)
 * @param {number} sortOrder - 1 (asc) ou -1 (desc)
 * @returns {Promise<Object>} { items, nextCursor, hasMore, total }
 */
async function cursorPaginate(
  query,
  cursor = null,
  limit = 20,
  sortBy = '_id',
  sortOrder = -1
) {
  try {
    // Validações
    limit = Math.min(limit, 100); // Max 100
    limit = Math.max(limit, 1);

    // Se houver cursor, decodificar e aplicar na query
    if (cursor) {
      try {
        const decodedId = Buffer.from(cursor, 'base64').toString('utf-8');
        const sortOp = sortOrder === 1 ? '$gt' : '$lt';
        query[sortBy] = { [sortOp]: decodedId };
      } catch (e) {
        throw new Error('Cursor inválido');
      }
    }

    // Buscar limit + 1 para saber se há próxima página
    const results = await query
      .sort({ [sortBy]: sortOrder })
      .limit(limit + 1)
      .lean()
      .exec();

    // Total sem paginação (apenas para primeira chamada)
    const total = cursor ? null : await query.model.countDocuments();

    // Verificar hasMore
    const hasMore = results.length > limit;
    if (hasMore) results.pop(); // Remove o +1

    // Criar próximo cursor
    let nextCursor = null;
    if (hasMore && results.length > 0) {
      const lastItem = results[results.length - 1];
      const lastValue = lastItem[sortBy];
      nextCursor = Buffer.from(lastValue.toString()).toString('base64');
    }

    return {
      items: results,
      nextCursor,
      hasMore,
      count: results.length,
      total,
      limit,
    };
  } catch (error) {
    throw new Error(`Erro na paginação com cursor: ${error.message}`);
  }
}

/**
 * Middleware para extrair parâmetros de cursor da query
 */
function parseCursorParams(req, res, next) {
  req.cursorParams = {
    cursor: req.query.cursor || null,
    limit: parseInt(req.query.limit || 20),
    sortBy: req.query.sortBy || '_id',
    sortOrder: req.query.sortOrder === 'asc' ? 1 : -1,
  };
  next();
}

/**
 * Formata resposta de cursor pagination
 */
function formatCursorResponse(data, statusCode = 200) {
  return {
    success: true,
    data: data.items,
    pagination: {
      count: data.count,
      total: data.total,
      nextCursor: data.nextCursor,
      hasMore: data.hasMore,
      limit: data.limit,
    },
    links: {
      next: data.nextCursor ? `?cursor=${data.nextCursor}&limit=${data.limit}` : null,
    },
  };
}

module.exports = {
  cursorPaginate,
  parseCursorParams,
  formatCursorResponse,
};
