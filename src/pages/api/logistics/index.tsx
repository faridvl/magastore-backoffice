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
            const { uuid, page, limit, search, status, dateFrom, dateTo } = req.query;

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

            const result = await LogisticsService.getAllPackages(p, l, s, st, df, dt);
            return res.status(200).json(result);
        }

        // --- MÉTODOS POST ---
        if (req.method === 'POST') {
            const { action } = req.query;
            switch (action) {
                case 'register':
                    const newPkg = await LogisticsService.registerIncomingPackage(req.body);
                    return res.status(201).json(newPkg);

                case 'consolidate':
                    const { consolidationUuid, packageUuids } = req.body;
                    const consolidated = await LogisticsService.processConsolidation(consolidationUuid, packageUuids);
                    return res.status(200).json(consolidated);

                case 'invoice':
                    const { consolidationUuid: invUuid, deliveryMethod } = req.body;
                    if (!invUuid || !deliveryMethod) {
                        return res.status(400).json({ message: 'consolidationUuid y deliveryMethod son requeridos.' });
                    }
                    const invoice = await LogisticsService.createInvoice(invUuid, deliveryMethod);
                    return res.status(201).json(invoice);

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