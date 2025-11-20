// utils/validators.js - VALIDADORES REUTILIZÁVEIS

const { body, query, param } = require('express-validator');

/**
 * Validador de email
 */
const validateEmail = () => {
    return body('email')
        .trim()
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail()
        .isLength({ max: 255 })
        .withMessage('Email muito longo');
};

/**
 * Validador de senha forte
 */
const validatePassword = (fieldName = 'password') => {
    return body(fieldName)
        .isLength({ min: 8 })
        .withMessage('A senha deve ter no mínimo 8 caracteres')
        .matches(/[a-z]/)
        .withMessage('A senha deve conter pelo menos uma letra minúscula')
        .matches(/[A-Z]/)
        .withMessage('A senha deve conter pelo menos uma letra maiúscula')
        .matches(/[0-9]/)
        .withMessage('A senha deve conter pelo menos um número')
        .matches(/[@$!%*?&#]/)
        .withMessage('A senha deve conter pelo menos um caractere especial (@$!%*?&#)');
};

/**
 * Validador de username
 */
const validateUsername = () => {
    return body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username deve ter entre 3 e 50 caracteres')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Username deve conter apenas letras, números, _ e -');
};

/**
 * Validador de serial number
 */
const validateSerialNumber = (fieldName = 'serial_number') => {
    return body(fieldName)
        .trim()
        .notEmpty()
        .withMessage('Serial number é obrigatório')
        .isLength({ min: 3, max: 100 })
        .withMessage('Serial number deve ter entre 3 e 100 caracteres')
        .matches(/^[a-zA-Z0-9-_]+$/)
        .withMessage('Serial number contém caracteres inválidos');
};

/**
 * Validador de MongoDB ObjectId
 */
const validateObjectId = (fieldName = 'id') => {
    return param(fieldName)
        .trim()
        .matches(/^[0-9a-fA-F]{24}$/)
        .withMessage('ID inválido');
};

/**
 * Validador de role
 */
const validateRole = () => {
    return body('role')
        .optional()
        .isIn(['admin', 'user', 'viewer'])
        .withMessage('Role deve ser admin, user ou viewer');
};

/**
 * Validador de permissions
 */
const validatePermissions = () => {
    return body('permissions')
        .optional()
        .isArray()
        .withMessage('Permissions deve ser um array')
        .custom((value) => {
            const validPermissions = ['mobile', 'totem', 'admin'];
            return value.every((p) => validPermissions.includes(p));
        })
        .withMessage('Permissions contém valores inválidos');
};

/**
 * Validador de paginação
 */
const validatePagination = () => {
    return [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Página deve ser um número inteiro positivo')
            .toInt(),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit deve ser entre 1 e 100')
            .toInt(),
    ];
};

/**
 * Validador de busca
 */
const validateSearch = () => {
    return query('search')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Busca muito longa')
        .escape();
};

/**
 * Validador de status de dispositivo
 */
const validateDeviceStatus = () => {
    return body('status')
        .optional()
        .isIn(['online', 'offline', 'maintenance', 'error'])
        .withMessage('Status inválido');
};

/**
 * Validador de IP address
 */
const validateIpAddress = (fieldName = 'ip_address') => {
    return body(fieldName)
        .optional()
        .isIP()
        .withMessage('Endereço IP inválido');
};

/**
 * Validador de MAC address
 */
const validateMacAddress = (fieldName = 'mac_address') => {
    return body(fieldName)
        .optional()
        .matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)
        .withMessage('Endereço MAC inválido');
};

/**
 * Validador de BSSID
 */
const validateBssid = (fieldName = 'bssid') => {
    return body(fieldName)
        .trim()
        .notEmpty()
        .withMessage('BSSID é obrigatório')
        .matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)
        .withMessage('BSSID inválido (formato: XX:XX:XX:XX:XX:XX)');
};

/**
 * Validador de data
 */
const validateDate = (fieldName) => {
    return body(fieldName)
        .optional()
        .isISO8601()
        .withMessage('Data inválida (use formato ISO 8601)')
        .toDate();
};

/**
 * Sanitizador de string genérico
 */
const sanitizeString = (fieldName) => {
    return body(fieldName)
        .optional()
        .trim()
        .escape();
};

module.exports = {
    validateEmail,
    validatePassword,
    validateUsername,
    validateSerialNumber,
    validateObjectId,
    validateRole,
    validatePermissions,
    validatePagination,
    validateSearch,
    validateDeviceStatus,
    validateIpAddress,
    validateMacAddress,
    validateBssid,
    validateDate,
    sanitizeString,
};
