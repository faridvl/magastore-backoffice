import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { BillingDetail, DeliveryMethod } from '@/types/logistics/logistics.types';

const fmtCRC = (n: number) => `CRC ${Math.round(n).toLocaleString('es-CR')}`;

const DELIVERY_LABELS: Record<DeliveryMethod, string> = {
  CORREOS_CR: 'Correos de Costa Rica',
  TRACOPA: 'Tracopa / Encomienda',
  RETIRO: 'Retiro en Oficina',
};

const s = StyleSheet.create({
  page: { padding: 48, fontFamily: 'Helvetica', fontSize: 10, color: '#1e293b' },
  company: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 2 },
  tagline: { fontSize: 9, color: '#94a3b8' },
  divider: { borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginTop: 16, marginBottom: 16 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  metaBlock: { flexDirection: 'column' },
  label: { color: '#94a3b8', fontSize: 8, marginBottom: 3 },
  value: { fontFamily: 'Helvetica-Bold', color: '#0f172a', fontSize: 10 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#94a3b8', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 3, paddingBottom: 3 },
  rowLabel: { color: '#64748b', fontSize: 9, flex: 1 },
  rowValue: { color: '#0f172a', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  totalLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  totalValue: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  trackingWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  tracking: {
    fontFamily: 'Courier', fontSize: 8, backgroundColor: '#f8fafc',
    paddingTop: 3, paddingBottom: 3, paddingLeft: 6, paddingRight: 6,
    borderRadius: 4, marginRight: 4, marginBottom: 4, color: '#475569',
  },
  paidBadge: {
    backgroundColor: '#f0fdf4', color: '#15803d',
    paddingTop: 3, paddingBottom: 3, paddingLeft: 8, paddingRight: 8,
    borderRadius: 4, fontSize: 8, fontFamily: 'Helvetica-Bold',
  },
  pendingBadge: {
    backgroundColor: '#fff7ed', color: '#c2410c',
    paddingTop: 3, paddingBottom: 3, paddingLeft: 8, paddingRight: 8,
    borderRadius: 4, fontSize: 8, fontFamily: 'Helvetica-Bold',
  },
  footer: {
    position: 'absolute', bottom: 24, left: 48, right: 48,
    textAlign: 'center', fontSize: 8, color: '#94a3b8',
    borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8,
  },
});

interface Props {
  detail: BillingDetail;
}

export const BillingInvoicePDF: React.FC<Props> = ({ detail }) => {
  const shortId = detail.uuid.slice(-8).toUpperCase();
  const createdDate = new Date(detail.created_at).toLocaleDateString('es-CR');
  const flete = detail.total_weight_charged * detail.applied_rate_usd * detail.applied_exchange;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Encabezado */}
        <View style={{ marginBottom: 24 }}>
          <Text style={s.company}>MAGASTORE</Text>
          <Text style={s.tagline}>Courier · Factura de Servicio</Text>
        </View>

        <View style={s.divider} />

        {/* Metadatos de la factura */}
        <View style={[s.metaRow, { marginBottom: 0 }]}>
          <View style={s.metaBlock}>
            <Text style={s.label}>N de Factura</Text>
            <Text style={s.value}>{shortId}</Text>
          </View>
          <View style={s.metaBlock}>
            <Text style={s.label}>Fecha</Text>
            <Text style={s.value}>{createdDate}</Text>
          </View>
          <View style={s.metaBlock}>
            <Text style={s.label}>Estado</Text>
            <Text style={detail.is_paid ? s.paidBadge : s.pendingBadge}>
              {detail.is_paid ? 'PAGADO' : 'PENDIENTE'}
            </Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Cliente */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>CLIENTE</Text>
          <View style={s.row}>
            <Text style={s.rowLabel}>Nombre</Text>
            <Text style={s.rowValue}>{detail.customer_name}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>Casillero</Text>
            <Text style={s.rowValue}>{detail.customer_code}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>Correo</Text>
            <Text style={{ color: '#475569', fontSize: 9 }}>{detail.customer_email}</Text>
          </View>
        </View>

        {/* Paquetes */}
        {detail.package_trackings?.length > 0 && (
          <>
            <View style={s.divider} />
            <View style={s.section}>
              <Text style={s.sectionTitle}>PAQUETES INCLUIDOS</Text>
              <View style={s.trackingWrap}>
                {detail.package_trackings.map((t, i) => (
                  <Text key={i} style={s.tracking}>{t}</Text>
                ))}
              </View>
            </View>
          </>
        )}

        <View style={s.divider} />

        {/* Desglose */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>DESGLOSE</Text>
          <View style={s.row}>
            <Text style={s.rowLabel}>Peso cobrado</Text>
            <Text style={s.rowValue}>{detail.total_weight_charged} lb</Text>
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>
              {`Flete internacional ($${detail.applied_rate_usd}/lb x ${detail.applied_exchange} tipo de cambio)`}
            </Text>
            <Text style={s.rowValue}>{fmtCRC(flete)}</Text>
          </View>
          {detail.delivery_method && (
            <View style={s.row}>
              <Text style={s.rowLabel}>
                {`Envio local - ${DELIVERY_LABELS[detail.delivery_method]}`}
              </Text>
              <Text style={s.rowValue}>
                {detail.delivery_fee_crc > 0 ? fmtCRC(detail.delivery_fee_crc) : 'Sin cargo'}
              </Text>
            </View>
          )}
        </View>

        <View style={s.divider} />

        {/* Total */}
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>TOTAL A CANCELAR</Text>
          <Text style={s.totalValue}>{fmtCRC(detail.total_amount_crc)}</Text>
        </View>

        {detail.is_paid && detail.paid_at && (
          <View style={{ marginTop: 6 }}>
            <Text style={{ fontSize: 8, color: '#15803d' }}>
              {`Pago registrado el ${new Date(detail.paid_at).toLocaleDateString('es-CR')}`}
            </Text>
          </View>
        )}

        {/* Pie de pagina */}
        <Text style={s.footer}>
          Magastore Courier · Costa Rica · Comprobante de servicio de mensajeria internacional
        </Text>
      </Page>
    </Document>
  );
};
