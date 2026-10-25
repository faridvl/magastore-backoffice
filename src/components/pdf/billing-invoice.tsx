import { formatCrc } from '@/shared/utils/format-crc';
import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import path from 'path';
import fs from 'fs';
import { BillingDetail } from '@/types/logistics/logistics.types';
import { buildBillingBreakdown } from '@/shared/utils/billing-breakdown';
import { BUSINESS_WHATSAPP_DISPLAY } from '@/shared/constants/contact';
import { PDF_COLOR } from './pdf-theme';

const LOGO_BUFFER = fs.readFileSync(
  path.join(process.cwd(), 'public', 'logo', 'magastore-logo-secundario-dark.png'),
);

const fmtCRC = (n: number | string) =>
  formatCrc(Number(n)).replace('₡', 'CRC ');

const fmtUSD = (n: number | string) =>
  `$ ${Number(n).toFixed(2)}`;

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: PDF_COLOR.ink,
    backgroundColor: PDF_COLOR.white,
  },

  // ── Header oscuro ──────────────────────────────
  header: {
    backgroundColor: PDF_COLOR.headerBg,
    borderBottomWidth: 2,
    borderBottomColor: PDF_COLOR.gold,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
    paddingLeft: 32,
    paddingRight: 32,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    // Logo secundario horizontal (900x202): se respeta la proporción para no deformarlo.
    width: 180,
    height: 40,
  },
  headerMeta: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  headerMetaRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  headerMetaLabel: {
    fontSize: 8,
    color: PDF_COLOR.gold,
    marginRight: 6,
    fontFamily: 'Helvetica-Bold',
  },
  headerMetaValue: {
    fontSize: 8,
    color: PDF_COLOR.white,
    fontFamily: 'Helvetica-Bold',
  },

  // ── Fila de contacto ──────────────────────────
  contactRow: {
    backgroundColor: PDF_COLOR.ink,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 32,
    paddingRight: 32,
  },
  contactText: {
    fontSize: 8,
    color: PDF_COLOR.onDarkMuted,
  },
  contactHighlight: {
    fontSize: 8,
    color: PDF_COLOR.gold,
  },

  // ── Cuerpo ────────────────────────────────────
  body: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingLeft: 32,
    paddingRight: 32,
  },

  // Nota de orden de envío
  note: {
    fontSize: 8,
    color: PDF_COLOR.goldText,
    marginBottom: 16,
  },

  // ── Tabla de paquetes ─────────────────────────
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: PDF_COLOR.headerBg,
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 3,
    marginBottom: 0,
  },
  tableRow: {
    flexDirection: 'row',
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 8,
    paddingRight: 8,
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLOR.line,
  },
  tableRowAlt: {
    backgroundColor: PDF_COLOR.rowAlt,
  },
  colTracking: { flex: 3, fontSize: 8 },
  colPeso: { flex: 1, textAlign: 'right', fontSize: 8 },
  colPrecio: { flex: 1.5, textAlign: 'right', fontSize: 8 },
  colTotal: { flex: 1.5, textAlign: 'right', fontSize: 8 },
  thText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: PDF_COLOR.gold,
  },
  tdText: {
    color: PDF_COLOR.ink,
    fontSize: 8,
  },
  tdMono: {
    fontFamily: 'Courier',
    color: PDF_COLOR.inkMuted,
    fontSize: 7.5,
  },

  // ── Resumen ───────────────────────────────────
  summary: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: PDF_COLOR.line,
    paddingTop: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 4,
  },
  summaryLabel: {
    color: PDF_COLOR.inkMuted,
    fontSize: 9,
  },
  summaryValue: {
    color: PDF_COLOR.ink,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: PDF_COLOR.headerBg,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 4,
    marginTop: 10,
  },
  totalLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: PDF_COLOR.white,
  },
  totalValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 16,
    color: PDF_COLOR.gold,
  },

  // ── Estado de pago ────────────────────────────
  paidBadge: {
    backgroundColor: PDF_COLOR.paidBg,
    color: PDF_COLOR.paidText,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 4,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  pendingBadge: {
    backgroundColor: PDF_COLOR.pendingBg,
    color: PDF_COLOR.pendingText,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 4,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },

  // ── Pie de página ─────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 32,
    right: 32,
    textAlign: 'center',
    fontSize: 7.5,
    color: PDF_COLOR.inkSubtle,
    borderTopWidth: 1,
    borderTopColor: PDF_COLOR.line,
    paddingTop: 8,
  },
});

interface Props {
  detail: BillingDetail;
  deliveryMethodLabel: string | null;
}

export const BillingInvoicePDF: React.FC<Props> = ({ detail, deliveryMethodLabel }) => {
  const invoiceLabel = `F-${String(detail.invoice_number).padStart(4, '0')}`;
  const createdDate = new Date(detail.created_at).toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica',
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  const pricePerLb = Number(detail.applied_rate_usd);
  const packages = detail.packages ?? [];
  // El desglose respeta la regla de cobro congelada en la factura. Si se
  // reconstruyera a precio de lista, las líneas sumarían más que el TOTAL en
  // clientes con descuento o al costo.
  const breakdown = buildBillingBreakdown({
    packages,
    amountCrc: detail.total_amount_crc,
    deliveryFeeCrc: detail.delivery_fee_crc,
    totalWeightCharged: detail.total_weight_charged,
    appliedRateUsd: detail.applied_rate_usd,
    appliedExchange: detail.applied_exchange,
    billingMode: detail.applied_billing_mode,
    discountPercent: detail.applied_discount_percent,
  });
  // La copia guardada al facturar manda: la dirección viva puede editarse
  // después y la factura no debe cambiar. La viva queda para facturas sin copia.
  const deliveryAddress =
    detail.delivery_address_snapshot ||
    [detail.delivery_exact_address, detail.delivery_district, detail.delivery_canton, detail.delivery_province]
      .filter(Boolean)
      .join(', ');

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header oscuro ── */}
        <View style={s.header}>
          <View style={s.brandBlock}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de @react-pdf/renderer, no <img>: no acepta alt */}
            <Image style={s.brandLogo} src={LOGO_BUFFER} />
          </View>
          <View style={s.headerMeta}>
            <View style={s.headerMetaRow}>
              <Text style={s.headerMetaLabel}>N.º de factura:</Text>
              <Text style={s.headerMetaValue}>{invoiceLabel}</Text>
            </View>
            <View style={s.headerMetaRow}>
              <Text style={s.headerMetaLabel}>Cliente:</Text>
              <Text style={s.headerMetaValue}>{detail.customer_name}</Text>
            </View>
            <View style={s.headerMetaRow}>
              <Text style={s.headerMetaLabel}>N.º de casillero:</Text>
              <Text style={s.headerMetaValue}>{detail.customer_code}</Text>
            </View>
            <View style={[s.headerMetaRow, { marginTop: 4 }]}>
              <Text style={s.headerMetaLabel}>Fecha:</Text>
              <Text style={s.headerMetaValue}>{createdDate}</Text>
            </View>
            <View style={s.headerMetaRow}>
              <Text style={s.headerMetaLabel}>Estado:</Text>
              <Text style={detail.is_paid ? s.paidBadge : s.pendingBadge}>
                {detail.is_paid ? 'PAGADO' : 'PENDIENTE'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Fila de contacto ── */}
        <View style={s.contactRow}>
          <Text style={s.contactText}>
            Correo electrónico: <Text style={s.contactHighlight}>magastore.cr@gmail.com</Text>
          </Text>
          <Text style={s.contactText}>
            WhatsApp: <Text style={s.contactHighlight}>{BUSINESS_WHATSAPP_DISPLAY}</Text>
          </Text>
        </View>

        {/* ── Dirección de entrega ── */}
        {deliveryAddress && (
          <View style={[s.contactRow, { backgroundColor: PDF_COLOR.goldTint }]}>
            <Text style={[s.contactText, { color: PDF_COLOR.goldText }]}>
              Dirección de entrega:{' '}
              <Text style={[s.contactHighlight, { color: PDF_COLOR.ink }]}>
                {deliveryAddress}
              </Text>
            </Text>
          </View>
        )}

        {/* ── Cuerpo ── */}
        <View style={s.body}>
          <Text style={s.note}>
            En caso de esperar otro paquete para consolidar en un solo envío, por favor informarlo.
          </Text>

          {/* Tabla de paquetes */}
          {packages.length > 0 && (
            <>
              {/* Header de tabla */}
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

          {/* Resumen */}
          <View style={s.summary}>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Peso total (LB)</Text>
              <Text style={s.summaryValue}>{detail.total_weight_charged} lb</Text>
            </View>
            {/* Con una regla de cobro especial se muestra el precio de lista y
                la rebaja como líneas separadas: el cliente ve de dónde sale su
                monto en vez de un número menor sin explicación. */}
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
            {detail.delivery_method && (
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>
                  {`Envío — ${deliveryMethodLabel ?? detail.delivery_method}`}
                </Text>
                <Text style={s.summaryValue}>
                  {detail.delivery_fee_crc > 0 ? fmtCRC(detail.delivery_fee_crc) : 'Sin cargo'}
                </Text>
              </View>
            )}
          </View>

          {/* Total */}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TOTAL</Text>
            <Text style={s.totalValue}>{fmtCRC(detail.total_amount_crc)}</Text>
          </View>

          {detail.is_paid && detail.paid_at && (
            <Text style={{ fontSize: 8, color: PDF_COLOR.paidText, marginTop: 8 }}>
              {`Pago registrado el ${new Date(detail.paid_at).toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica' })}`}
            </Text>
          )}
        </View>

        {/* ── Pie de página ── */}
        <Text style={s.footer}>
          Magastore Courier · Costa Rica · Comprobante de servicio de mensajería internacional
        </Text>
      </Page>
    </Document>
  );
};
