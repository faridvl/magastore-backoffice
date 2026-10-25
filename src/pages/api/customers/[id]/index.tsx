import type { NextApiRequest, NextApiResponse } from 'next';
import { CustomerService } from '@/shared/api/services/customers.service';
import { CookiesManager } from '@/shared/utils/cookies-manager';
import { isUuid } from '@/shared/utils/is-uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const context = { req, res } as any;
    const { id } = req.query;

    let token = CookiesManager.getAccessToken(context);
    if (!token && req.headers.authorization) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) return res.status(401).json({ message: 'No autorizado' });

    try {
        if (req.method === 'GET') {
            if (!isUuid(id)) {
                return res.status(400).json({ message: 'Cliente inválido.' });
            }

            const customer = await CustomerService.getCustomerProfile(id);
            return res.status(200).json(customer);
        }

        if (req.method === 'PUT') {
            if (!isUuid(id)) {
                return res.status(400).json({ message: 'Cliente inválido.' });
            }

            const updated = await CustomerService.editCustomer(id, req.body);
            return res.status(200).json(updated);
        }

        res.setHeader('Allow', ['GET', 'PUT']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);

    } catch (error: any) {
        console.error('[Customer Detail Error]:', error);
        return res.status(error.message.includes('encontrado') ? 404 : 500).json({
            message: error.message || 'Error al obtener el detalle del cliente',
        });
    }
}