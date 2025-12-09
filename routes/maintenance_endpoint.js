// Adicionar este endpoint em moduleRoutes.js após a linha 372

// Endpoint específico para manutenção
router.put('/:moduleId/assets/:assetId/maintenance', auth, modifyApiLimiter, async (req, res) => {
    try {
        const { moduleId, assetId } = req.params;
        const { maintenance_status, maintenance_ticket, maintenance_reason, maintenance_history_entry } = req.body;

        const module = await AssetModuleConfig.findById(moduleId);
        if (!module) {
            return res.status(404).json({ success: false, message: 'Módulo não encontrado' });
        }

        const Model = getModelByType(module.type);
        const asset = await Model.findById(assetId);

        if (!asset) {
            return res.status(404).json({ success: false, message: 'Ativo não encontrado' });
        }

        // Atualiza campos de manutenção
        if (typeof maintenance_status === 'boolean') {
            asset.maintenance_status = maintenance_status;
        }
        if (maintenance_ticket !== undefined) {
            asset.maintenance_ticket = maintenance_ticket;
        }
        if (maintenance_reason !== undefined) {
            asset.maintenance_reason = maintenance_reason;
        }

        // Adiciona entrada no histórico se fornecida
        if (maintenance_history_entry) {
            try {
                const historyEntry = typeof maintenance_history_entry === 'string'
                    ? JSON.parse(maintenance_history_entry)
                    : maintenance_history_entry;

                if (!asset.maintenance_history) {
                    asset.maintenance_history = [];
                }
                asset.maintenance_history.push(historyEntry);
            } catch (e) {
                logger.warn(`Erro ao parsear maintenance_history_entry: ${e.message}`);
            }
        }

        asset.updated_at = new Date();
        await asset.save();

        logger.info(`Manutenção atualizada: ${asset.asset_name} por ${req.user.username}`);

        res.json({
            success: true,
            message: 'Status de manutenção atualizado',
            asset: transformAssetForOutput(asset),
        });
    } catch (error) {
        logger.error(`Erro ao atualizar manutenção: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar manutenção',
            error: error.message
        });
    }
});
