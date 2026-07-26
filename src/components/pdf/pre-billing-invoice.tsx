import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import path from 'path';
import fs from 'fs';
import { DeliveryMethod } from '@/types/logistics/logistics.types';
import { buildBillingBreakdown } from '@/shared/utils/billing-breakdown';

const LOGO_BUFFER = fs.readFileSync(
  path.join(process.cwd(), 'public', 'logo', 'magastore-logo-2026.png'),
);

const fmtCRC = (n: number | string) =>
  `CRC ${Math.round(Number(n)).toLocaleString('es-CR')}`;

const fmtUSD = (n: number | string) => `$ ${Number(n).toFixed(2)}`;

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: '#1e293b', backgroundColor: '#ffffff' },
  header: {
    backgroundColor: '#0f1a2e', flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingTop: 20, paddingBottom: 20, paddingLeft: 32, paddingRight: 32,
  },
  brandBlock: { flexDirection: 'row', alignItems: 'center' },
  // El logo es apaisado (1126x718). Se respeta esa proporción: forzarlo a un
  // cuadrado lo deformaba.
  brandLogo: { width: 130, height: 83 },
  headerMeta: { flexDirection: 'column', alignItems: 'flex-end' },
  headerMetaRow: { flexDirection: 'row', marginBottom: 4 },
  headerMetaLabel: { fontSize: 8, color: '#93c5fd', marginRight: 6, fontFamily: 'Helvetica-Bold' },
  headerMetaValue: { fontSize: 8, color: '#ffffff', fontFamily: 'Helvetica-Bold' },
  estimadoBadge: {
    backgroundColor: '#f59e0b', color: '#1e293b', paddingTop: 3, paddingBottom: 3,
    paddingLeft: 8, paddingRight: 8, borderRadius: 4, fontSize: 8, fontFamily: 'Helvetica-Bold',
  },
  contactRow: {
    backgroundColor: '#1e293b', flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: 8, paddingBottom: 8, paddingLeft: 32, paddingRight: 32,
  },
  contactText: { fontSize: 8, color: '#94a3b8' },
  contactHighlight: { fontSize: 8, color: '#60a5fa' },
  alertRow: {
    backgroundColor: '#fffbeb', flexDirection: 'row', alignItems: 'center',
    paddingTop: 8, paddingBottom: 8, paddingLeft: 32, paddingRight: 32,
  },
  alertText: { fontSize: 8, color: '#92400e', fontFamily: 'Helvetica-Bold' },
  body: { paddingTop: 24, paddingBottom: 24, paddingLeft: 32, paddingRight: 32 },
  note: { fontSize: 8, color: '#3b82f6', marginBottom: 16 },
  tableHeader: {
    flexDirection: 'row', backgroundColor: '#0f1a2e', paddingTop: 7, paddingBottom: 7,
    paddingLeft: 8, paddingRight: 8, borderRadius: 3,
  },
  tableRow: {
    flexDirection: 'row', paddingTop: 7, paddingBottom: 7, paddingLeft: 8, paddingRight: 8,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  tableRowAlt: { backgroundColor: '#f8fafc' },
  colTracking: { flex: 3, fontSize: 8 },
  colPeso: { flex: 1, textAlign: 'right', fontSize: 8 },
  colPrecio: { flex: 1.5, textAlign: 'right', fontSize: 8 },
  colTotal: { flex: 1.5, textAlign: 'right', fontSize: 8 },
  thText: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: '#ffffff' },
  tdText: { color: '#1e293b', fontSize: 8 },
  tdMono: { fontFamily: 'Courier', color: '#475569', fontSize: 7.5 },
  summary: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 4 },
  summaryLabel: { color: '#64748b', fontSize: 9 },
  summaryValue: { color: '#1e293b', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#0f1a2e', paddingTop: 10, paddingBottom: 10, paddingLeft: 12,
    paddingRight: 12, borderRadius: 4, marginTop: 10,
  },
  totalLabel: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: '#ffffff' },
  totalValue: { fontFamily: 'Helvetica-Bold', fontSize: 16, color: '#f0c040' },
  footer: {
    position: 'absolute', bottom: 20, left: 32, right: 32, textAlign: 'center',
    fontSize: 7.5, color: '#94a3b8', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8,
  },
});

export interface PreBillingPDFPackage {
  tracking_number: string;
  weight_lb: number;
}

export interface PreBillingPDFData {
  uuid: string;
  customer_name: string;
  customer_code: string;
  customer_email: string;
  total_weight_lb: number;
  total_weight_charged: number;
  applied_rate_usd: number;
  applied_exchange: number;
  // Regla de cobro con la que se calculó el estimado — snapshot de pre_billing.
  applied_billing_mode: string | null;
  applied_discount_percent: number | null;
  estimated_amount_crc: number;
  delivery_method: DeliveryMethod | null;
  delivery_fee_crc: number;
  created_at: string;
  packages: PreBillingPDFPackage[];
  delivery_exact_address: string | null;
  delivery_district: string | null;
  delivery_canton: string | null;
  delivery_province: string | null;
}

interface Props {
  data: PreBillingPDFData;
  deliveryMethodLabel: string | null;
}

export const PreBillingInvoicePDF: React.FC<Props> = ({ data, deliveryMethodLabel }) => {
  const shortId = data.uuid.slice(-8).toUpperCase();
  const createdDate = new Date(data.created_at).toLocaleDateString('es-CR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  const pricePerLb = Number(data.applied_rate_usd);
  const packages = data.packages ?? [];
  // Mismo criterio que la factura final: el desglose sale del monto estimado
  // real, no de la tarifa de lista, para que las líneas cuadren con el total.
  const breakdown = buildBillingBreakdown({
    packages,
    amountCrc: data.estimated_amount_crc,
    deliveryFeeCrc: data.delivery_fee_crc,
    totalWeightCharged: data.total_weight_charged,
    appliedRateUsd: data.applied_rate_usd,
    appliedExchange: data.applied_exchange,
    billingMode: data.applied_billing_mode,
    discountPercent: data.applied_discount_percent,
  });

  return (
    <Document>
      <Page size="A4" style={s.page}>

        <View style={s.header}>
          <View style={s.brandBlock}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de @react-pdf/renderer, no <img>: no acepta alt */}
            <Image style={s.brandLogo} src={LOGO_BUFFER} />
          </View>
          <View style={s.headerMeta}>
            <View style={s.headerMetaRow}>
              <Text style={s.headerMetaLabel}>N.º estimado:</Text>
              <Text style={s.headerMetaValue}>{shortId}</Text>
            </View>
            <View style={s.headerMetaRow}>
              <Text style={s.headerMetaLabel}>Cliente:</Text>
              <Text style={s.headerMetaValue}>{data.customer_name}</Text>
            </View>
            <View style={s.headerMetaRow}>
              <Text style={s.headerMetaLabel}>N.º de casillero:</Text>
              <Text style={s.headerMetaValue}>{data.customer_code}</Text>
            </View>
            <View style={[s.headerMetaRow, { marginTop: 4 }]}>
              <Text style={s.headerMetaLabel}>Fecha:</Text>
              <Text style={s.headerMetaValue}>{createdDate}</Text>
            </View>
            <View style={s.headerMetaRow}>
              <Text style={s.headerMetaLabel}>Estado:</Text>
              <Text style={s.estimadoBadge}>ESTIMADO</Text>
            </View>
          </View>
        </View>

        <View style={s.contactRow}>
          <Text style={s.contactText}>
            Correo: <Text style={s.contactHighlight}>magastore.cr@gmail.com</Text>
          </Text>
          <Text style={s.contactText}>
            WhatsApp: <Text style={s.contactHighlight}>6204-8869</Text>
          </Text>
        </View>

        <View style={s.alertRow}>
          <Text style={s.alertText}>
            ⚠  Este documento es un ESTIMADO. El monto final puede variar. No es una factura oficial.
          </Text>
        </View>

        {data.delivery_exact_address && (
          <View style={[s.contactRow, { backgroundColor: '#f1f5f9' }]}>
            <Text style={[s.contactText, { color: '#475569' }]}>
              Dirección de entrega:{' '}
              <Text style={[s.contactHighlight, { color: '#1e293b' }]}>
                {[data.delivery_exact_address, data.delivery_district, data.delivery_canton, data.delivery_province]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            </Text>
          </View>
        )}

        <View style={s.body}>
          <Text style={s.note}>
            Para confirmar el envío, comuníquese con nosotros aprobando este estimado.
          </Text>

          {packages.length > 0 && (
            <>
              <View style={s.tableHeader}>
                <Text style={[s.thText, s.colTracking]}># de Tracking</Text>
                <Text style={[s.thText, s.colPeso]}>Peso (LB)</Text>
                <Text style={[s.thText, s.colPrecio]}>Precio x LB</Text>
                <Text style={[s.thText, s.colTotal]}>Subtotal</Text>
              </View>
              {breakdown.lines.map((line, i) => (
                <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                  <Text style={[s.tdMono, s.colTracking]}>{line.tracking_number}</Text>
                  <Text style={[s.tdText, s.colPeso]}>{line.weight.toFixed(2)}</Text>
                  <Text style={[s.tdText, s.colPrecio]}>
                    {breakdown.effectiveRateUsd != null ? fmtUSD(breakdown.effectiveRateUsd) : '—'}
                  </Text>
                  <Text style={[s.tdText, s.colTotal]}>{fmtCRC(line.subtotal)}</Text>
                </View>
              ))}
            </>
          )}

          <View style={s.summary}>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Peso total (LB)</Text>
              <Text style={s.summaryValue}>{data.total_weight_charged} lb</Text>
            </View>
            {/* Ver billing-invoice: con regla especial se separan lista y rebaja. */}
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>
                {breakdown.isNormal
                  ? `Precio Magastore (${fmtUSD(pricePerLb)}/lb)`
                  : `Precio Magastore (tarifa de lista ${fmtUSD(pricePerLb)}/lb)`}
              </Text>
              <Text style={s.summaryValue}>
                {fmtCRC(breakdown.isNormal ? breakdown.flete : breakdown.fleteLista)}
              </Text>
            </View>
            {!breakdown.isNormal && (
              <>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>{breakdown.ruleLabel}</Text>
                  <Text style={s.summaryValue}>{`- ${fmtCRC(breakdown.descuento)}`}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Subtotal envío internacional</Text>
                  <Text style={s.summaryValue}>{fmtCRC(breakdown.flete)}</Text>
                </View>
              </>
            )}
            {data.delivery_method && (
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>
                  {`Envío — ${deliveryMethodLabel ?? data.delivery_method}`}
                </Text>
                <Text style={s.summaryValue}>
                  {data.delivery_fee_crc > 0 ? fmtCRC(data.delivery_fee_crc) : 'Sin cargo'}
                </Text>
              </View>
            )}
          </View>

          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TOTAL ESTIMADO</Text>
            <Text style={s.totalValue}>{fmtCRC(data.estimated_amount_crc)}</Text>
          </View>
        </View>

        <Text style={s.footer}>
          Magastore Courier · Costa Rica · Estimado de servicio de mensajería internacional
        </Text>
      </Page>
    </Document>
  );
};
