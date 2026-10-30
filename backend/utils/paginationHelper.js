/**
 * backend/utils/paginationHelper.js
 * Helpers para paginação híbrida (Cursor e Offset/Page) e projeção de dados (Fase P3)
 */

const mongoose = require('mongoose');

// Projeção padrão enxuta para tabelas e grids de listagem de ativos
const ASSET_SUMMARY_PROJECTION = [
  '_id', 'module_id', 'asset_name', 'asset_type', 'serial_number',
  'status', 'health_status', 'health_issues', 'ip_address',
  'unit', 'sector', 'floor', 'location',
  'model', 'manufacturer', 'hostname',
  'ram', 'ram_total_mb', 'ram_free_mb',
  'storage', 'storage_total_gb', 'storage_free_gb',
  'battery_level', 'printer_status',
  'last_seen', 'is_deleted', 'created_at', 'updated_at',
].join(' ');

/**
 * Cria uma query com cursor para Mongoose
 * Suporta tanto _id simples quanto cursor composto { v: valor, id: ObjectId }
 */
async function cursorPaginate(
  query,
  cursor = null,
  limit = 20,
  sortBy = '_id',
  sortOrder = -1
) {
  try {
    limit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);

    // Decodifica cursor se presente
    if (cursor) {
      try {
        const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
        const sortOp = sortOrder === 1 ? '$gt' : '$lt';

        // Tenta parsear como cursor composto JSON { v, id }
        if (decoded.startsWith('{') && decoded.endsWith('}')) {
          const parsed = JSON.parse(decoded);
          const filterVal = parsed.v;
          const targetId = mongoose.Types.ObjectId.isValid(parsed.id)
            ? new mongoose.Types.ObjectId(parsed.id)
            : parsed.id;

          const currentFilter = query.getFilter ? query.getFilter() : {};
          query.setQuery({
            ...currentFilter,
            $or: [
              { [sortBy]: { [sortOp]: filterVal } },
              {
                [sortBy]: filterVal,
                _id: { [sortOp]: targetId },
              },
            ],
          });
        } else {
          // Cursor simples de _id
          const targetId = mongoose.Types.ObjectId.isValid(decoded)
            ? new mongoose.Types.ObjectId(decoded)
            : decoded;
          const currentFilter = query.getFilter ? query.getFilter() : {};
          query.setQuery({
            ...currentFilter,
            [sortBy]: { [sortOp]: targetId },
          });
        }
      } catch {
        throw new Error('Cursor de paginação inválido');
      }
    }

    const sortObject = sortBy === '_id'
      ? { _id: sortOrder }
      : { [sortBy]: sortOrder, _id: sortOrder };

    // Filtro ativo para contagem precisa
    const activeFilter = query.getFilter ? query.getFilter() : {};
    const total = cursor ? null : await query.model.countDocuments(activeFilter);

    // Busca limit + 1 para identificar hasMore
    const results = await query
      .sort(sortObject)
      .limit(limit + 1)
      .lean()
      .exec();

    const hasMore = results.length > limit;
    if (hasMore) results.pop();

    let nextCursor = null;
    if (hasMore && results.length > 0) {
      const lastItem = results[results.length - 1];
      if (sortBy === '_id') {
        nextCursor = Buffer.from(lastItem._id.toString()).toString('base64');
      } else {
        const compound = {
          v: lastItem[sortBy] instanceof Date ? lastItem[sortBy].toISOString() : lastItem[sortBy],
          id: lastItem._id.toString(),
        };
        nextCursor = Buffer.from(JSON.stringify(compound)).toString('base64');
      }
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
 * Paginação híbrida (suporta cursor ou page/offset)
 */
async function hybridPaginate(query, options = {}) {
  const isCursor = options.cursor !== undefined && options.cursor !== null && options.cursor !== false;

  if (isCursor) {
    const cursorResult = await cursorPaginate(
      query,
      options.cursor || null,
      options.limit || 20,
      options.sortBy || '_id',
      options.sortOrder || -1
    );
    return {
      type: 'cursor',
      items: cursorResult.items,
      count: cursorResult.count,
      total: cursorResult.total,
      hasMore: cursorResult.hasMore,
      nextCursor: cursorResult.nextCursor,
      limit: cursorResult.limit,
    };
  }

  // Paginação tradicional por página/offset (compatibilidade com frontend atual)
  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.min(Math.max(parseInt(options.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const sortBy = options.sortBy || 'last_seen';
  const sortOrder = options.sortOrder || -1;
  const activeFilter = query.getFilter ? query.getFilter() : {};

  const [items, total] = await Promise.all([
    query
      .sort({ [sortBy]: sortOrder, _id: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    query.model.countDocuments(activeFilter),
  ]);

  const pages = Math.ceil(total / limit) || 1;
  const hasMore = page < pages;

  return {
    type: 'offset',
    items,
    count: items.length,
    total,
    page,
    pages,
    limit,
    hasMore,
  };
}

/**
 * Middleware para extrair parâmetros de paginação por cursor
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
 * Formata resposta padronizada com cursor
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
  ASSET_SUMMARY_PROJECTION,
  cursorPaginate,
  hybridPaginate,
  parseCursorParams,
  formatCursorResponse,
};
