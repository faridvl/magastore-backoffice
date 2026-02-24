import type { NextApiRequest, NextApiResponse } from 'next';
import * as SettingsService from '@/shared/api/services/settings.service';
import { CookiesManager } from '@/shared/utils/cookies-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const context = { req, res } as any;

  // 1. INTENTO HÍBRIDO DE OBTENER EL TOKEN
  // Primero intentamos por Cookie (Navegador)
  let token = CookiesManager.getAccessToken(context);

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'No autorizado: Token no encontrado' });
  }

  const userName = CookiesManager.getUserName(context) || 'Usuario API';

  try {
    if (req.method === 'GET') {
      const data = await SettingsService.getSystemDashboardData();
      return res.status(200).json(data);
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const newData = req.body;
      const finalUserName = userName;

      const updatedSettings = await SettingsService.updateSystemSettings(newData, finalUserName);
      return res.status(200).json(updatedSettings);
    }

    res.setHeader('Allow', ['GET', 'PUT', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error: any) {
    console.error('[Settings Controller Error]:', error);
    return res.status(500).json({
      message: 'Error al procesar la configuración',
      error: error.message,
    });
  }
}
