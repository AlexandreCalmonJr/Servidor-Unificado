// Ficheiro: controllers/ipMappingController.js

const ipMappingService = require('../services/ipMappingService');

exports.getAllMappings = async (req, res) => {
    const logger = req.logger || console;
    try {
        const mappings = await ipMappingService.getAll();
        res.status(200).json(mappings);
    } catch (error) {
        logger.error('Erro ao obter mapeamentos de IP:', error);
        res.status(500).json({ message: 'Erro ao obter mapeamentos', error: error.message });
    }
};

exports.createMapping = async (req, res) => {
    const logger = req.logger || console;
    try {
        const { location, ipStart, ipEnd } = req.body;
        if (!location || !ipStart || !ipEnd) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
        }
        const newMapping = await ipMappingService.create(location, ipStart, ipEnd);
        res.status(201).json(newMapping);
    } catch (error) {
        logger.error('Erro ao criar mapeamento de IP:', error);
        res.status(500).json({ message: 'Erro ao criar mapeamento', error: error.message });
    }
};

exports.deleteMapping = async (req, res) => {
    const logger = req.logger || console;
    try {
        const { id } = req.params;
        const result = await ipMappingService.deleteById(id);
        if (!result) {
            return res.status(404).json({ message: 'Mapeamento não encontrado.' });
        }
        res.status(200).json({ message: 'Mapeamento eliminado com sucesso.' });
    } catch (error) {
        logger.error('Erro ao eliminar mapeamento de IP:', error);
        res.status(500).json({ message: 'Erro ao eliminar mapeamento', error: error.message });
    }
};