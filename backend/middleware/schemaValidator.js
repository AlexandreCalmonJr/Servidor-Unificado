/**
 * backend/middleware/schemaValidator.js
 * Validador de contratos JSON Schema com Ajv (Fase P2)
 */

const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({
  allErrors: true,
  coerceTypes: true,
  useDefaults: true,
  allowUnionTypes: true,
});

addFormats(ajv);

// Carregamento e compilação de schemas padrão
const schemas = {
  telemetry: require('../schemas/telemetrySchema.json'),
  heartbeat: require('../schemas/heartbeatSchema.json'),
  commandResult: require('../schemas/commandResultSchema.json'),
};

const compiledValidators = {};
for (const [name, schema] of Object.entries(schemas)) {
  compiledValidators[name] = ajv.compile(schema);
}

/**
 * Cria middleware de validação para o schema especificado
 * @param {string|Object} schemaOrName - Nome do schema registrado ou objeto JSON Schema
 * @returns {Function} Express middleware (req, res, next)
 */
function validateBody(schemaOrName) {
  let validate;

  if (typeof schemaOrName === 'string') {
    validate = compiledValidators[schemaOrName];
    if (!validate) {
      throw new Error(`Schema não encontrado: ${schemaOrName}`);
    }
  } else {
    validate = ajv.compile(schemaOrName);
  }

  return (req, res, next) => {
    // Para telemetria com compatibilidade de camelCase:
    if (req.body && !req.body.serial_number && req.body.serialNumber) {
      req.body.serial_number = req.body.serialNumber;
    }

    const valid = validate(req.body);
    if (!valid) {
      const formattedErrors = (validate.errors || []).map((err) => ({
        field: err.instancePath || (err.params?.missingProperty ? `/${err.params.missingProperty}` : 'root'),
        message: err.message,
        keyword: err.keyword,
        params: err.params,
      }));

      return res.status(400).json({
        success: false,
        code: 'SCHEMA_VALIDATION_ERROR',
        message: 'Contrato de dados violado: payload inválido para o schema especificado',
        errors: formattedErrors,
      });
    }

    next();
  };
}

module.exports = {
  ajv,
  validateBody,
  schemas,
};
