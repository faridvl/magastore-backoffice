import type { NextApiRequest, NextApiResponse } from 'next';
import { CustomerService } from '@/shared/api/services/customers.service';
import { CookiesManager } from '@/shared/utils/cookies-manager';

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
            if (!id || typeof id !== 'string') {
                return res.status(400).json({ message: 'ID de cliente no válido' });
            }

            const customer = await CustomerService.getCustomerProfile(id);
            return res.status(200).json(customer);
        }

        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);

    } catch (error: any) {
        console.error('[Customer Detail Error]:', error);
        return res.status(error.message.includes('encontrado') ? 404 : 500).json({
            message: error.message || 'Error al obtener el detalle del cliente',
        });
    }
}