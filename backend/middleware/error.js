// middleware/error.js - TRATAMENTO DE ERROS MELHORADO

/**
 * Classe de erro customizada para erros operacionais (esperados)
 */
class AppError extends Error {
  constructor(message, statusCode, isOperational = true, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erros específicos para facilitar o uso
 */
class BadRequestError extends AppError {
  constructor(message = 'Requisição inválida', details = null) {
    super(message, 400, true, details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado') {
    super(message, 401, true);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado') {
    super(message, 403, true);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado') {
    super(message, 404, true);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflito de dados', details = null) {
    super(message, 409, true, details);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Erro de validação', errors = []) {
    super(message, 422, true, { errors });
  }
}

/**
 * Handler principal de erros
 */
const errorHandler = (logger) => {
  return (err, req, res, next) => {
    // Mapeia erros de autenticação para 401 operacional antes do contexto
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError' || err.name === 'NoTokenError') {
      err.statusCode = 401;
      err.status = 'fail';
      err.isOperational = true;
    }

    // Define valores padrão
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Loga o erro com contexto
    const errorContext = {
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id,
      timestamp: err.timestamp || new Date().toISOString()
    };

    // Erros operacionais (esperados) - log como warn
    if (err.isOperational) {
      logger.warn('Erro operacional', errorContext);

      return res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message,
        ...(err.details && { details: err.details }),
        ...(process.env.NODE_ENV === 'development' && {
          path: req.path,
          timestamp: err.timestamp
        })
      });
    }

    // Erros de JWT - log como warn e retorna 401
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      logger.warn(`Erro de autenticação JWT: ${err.message}`, errorContext);
      return res.status(401).json({
        success: false,
        status: 'fail',
        message: 'Token inválido ou expirado'
      });
    }

    // Falta de token deve ser 401, não 500
    if (err.name === 'NoTokenError') {
      logger.warn(`Erro de autenticação: ${err.message}`, errorContext);
      return res.status(401).json({
        success: false,
        status: 'fail',
        message: 'Nenhum token fornecido'
      });
    }

    // Erros de programação (bugs) - log como error
    logger.error('ERRO NÃO TRATADO', {
      ...errorContext,
      stack: err.stack,
      isOperational: err.isOperational
    });

    // Resposta genérica para erros inesperados
    res.status(err.statusCode).json({
      success: false,
      status: 'error',
      message: process.env.NODE_ENV === 'production'
        ? 'Ocorreu um erro interno no servidor'
        : err.message,
      ...(process.env.NODE_ENV === 'development' && {
        error: {
          message: err.message,
          stack: err.stack,
          details: err.details
        }
      })
    });
  };
};

/**
 * Handler para erros de validação do express-validator
 */
const validationErrorHandler = (errors) => {
  const formattedErrors = errors.array().map(err => ({
    field: err.param,
    message: err.msg,
    value: err.value
  }));

  return new ValidationError('Erros de validação encontrados', formattedErrors);
};

/**
 * Handler para erros do Mongoose
 */
const handleMongooseError = (err) => {
  // Erro de validação do Mongoose
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
    return new ValidationError('Erro de validação do banco de dados', errors);
  }

  // Erro de chave duplicada (11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    return new ConflictError(
      `Já existe um registro com ${field}: ${value}`,
      { field, value }
    );
  }

  // Erro de cast (ID inválido)
  if (err.name === 'CastError') {
    return new BadRequestError(`ID inválido: ${err.value}`);
  }

  // Retorna o erro original se não for reconhecido
  return err;
};

/**
 * Wrapper para async handlers (evita try-catch em cada rota)
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  validationErrorHandler,
  handleMongooseError,
  asyncHandler
};
