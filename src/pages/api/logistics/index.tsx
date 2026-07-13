import type { NextApiRequest, NextApiResponse } from 'next';
import { LogisticsService } from '@/shared/api/services/logistics.service';
import { CookiesManager } from '@/shared/utils/cookies-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const context = { req, res } as any;

    // 1. Verificación de Seguridad
    let token = CookiesManager.getAccessToken(context);
    if (!token && req.headers.authorization) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'No autorizado: Sesión inválida' });
    }

    try {
        // --- MÉTODOS GET ---
        if (req.method === 'GET') {
            const { uuid, page, limit, search, status, dateFrom, dateTo, consolidationFilter, customerUuid, action: getAction } = req.query;

            if (getAction === 'courier-rates') {
                const rates = await LogisticsService.getCourierRates();
                return res.status(200).json(rates);
            }

            if (uuid) {
                const pkg = await LogisticsService.getPackageByUuid(uuid as string);
                return res.status(200).json(pkg);
            }

            const { tracking } = req.query;
            if (tracking) {
                const pkg = await LogisticsService.lookupPackageByTracking(tracking as string);
                return res.status(200).json(pkg);
            }

            const p = parseInt(page as string) || 1;
            const l = parseInt(limit as string) || 10;
            const s = search as string | undefined;
            const st = status as string | undefined;
            const df = dateFrom as string | undefined;
            const dt = dateTo as string | undefined;
            const cf = consolidationFilter as string | undefined;
            const cu = customerUuid as string | undefined;

            const result = await LogisticsService.getAllPackages(p, l, s, st, df, dt, cf, cu);
            return res.status(200).json(result);
        }

        // --- MÉTODOS POST ---
        if (req.method === 'POST') {
            const { action } = req.query;
            switch (action) {
                case 'register':
                    const { courier_cost_usd, tc_banco, insurance_applied, ...restBody } = req.body;
                    const newPkg = await LogisticsService.registerIncomingPackage({
                      ...restBody,
                      courier_cost_usd: courier_cost_usd != null ? Number(courier_cost_usd) : null,
                      tc_banco: tc_banco != null ? Number(tc_banco) : null,
                      insurance_applied: insurance_applied ?? true,
                    });
                    return res.status(201).json(newPkg);

                case 'consolidate':
                    const { consolidationUuid, packageUuids } = req.body;
                    const consolidated = await LogisticsService.processConsolidation(consolidationUuid, packageUuids);
                    return res.status(200).json(consolidated);

                case 'pre-billing':
                    const { consolidationUuid: preUuid, deliveryMethod: preDm } = req.body;
                    if (!preUuid || !preDm) {
                        return res.status(400).json({ message: 'consolidationUuid y deliveryMethod son requeridos.' });
                    }
                    const preBill = await LogisticsService.generatePreBilling(preUuid, preDm);
                    return res.status(201).json(preBill);

                case 'confirm-pre-billing':
                    const { consolidationUuid: confirmUuid } = req.body;
                    if (!confirmUuid) {
                        return res.status(400).json({ message: 'consolidationUuid es requerido.' });
                    }
                    const confirmed = await LogisticsService.confirmPreBilling(confirmUuid);
                    return res.status(200).json(confirmed);

                case 'bulk-status':
                    const { packageUuids: bulkUuids, status: bulkStatus } = req.body;
                    if (!bulkUuids?.length || !bulkStatus) {
                        return res.status(400).json({ message: 'packageUuids y status son requeridos.' });
                    }
                    const updated = await LogisticsService.bulkUpdateStatus(bulkUuids, bulkStatus);
                    return res.status(200).json({ updated });

                case 'log-notified':
                    const { packageUuids: notifiedUuids } = req.body;
                    if (!notifiedUuids?.length) {
                        return res.status(400).json({ message: 'packageUuids es requerido.' });
                    }
                    await LogisticsService.logPackagesNotified(notifiedUuids);
                    return res.status(200).json({ data: { logged: true } });

                default:
                    return res.status(400).json({ message: 'Acción no reconocida' });
            }
        }

        // --- MÉTODOS PATCH (Actualizaciones parciales) ---
        if (req.method === 'PATCH') {
            const { uuid } = req.query;
            if (!uuid) return res.status(400).json({ message: 'UUID requerido para actualización' });

            const { action: bodyAction, status, note, evidenceUrl, weight_lb, location } = req.body;

            if (bodyAction === 'weight') {
                if (!weight_lb) return res.status(400).json({ message: 'weight_lb es requerido.' });
                const updated = await LogisticsService.updatePackageWeight(uuid as string, Number(weight_lb));
                return res.status(200).json(updated);
            }

            const updated = await LogisticsService.updateStatus(uuid as string, status, note, evidenceUrl, location);
            return res.status(200).json(updated);
        }

        res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);

    } catch (error: any) {
        console.error('[Logistics Controller Error]:', error);
        return res.status(500).json({ message: error.message || 'Error interno' });
    }
}