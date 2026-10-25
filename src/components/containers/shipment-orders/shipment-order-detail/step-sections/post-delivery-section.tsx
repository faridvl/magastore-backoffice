import { formatBusinessDate } from '@/shared/utils/timezone';
import React from 'react';
import { HeartHandshake, MessageCircle, Star } from 'lucide-react';
import { ConsolidationDetail } from '@/types/logistics/logistics.types';
import { FOLLOW_UP_DELAY_DAYS } from '@/shared/constants/post-delivery';
import { usePostDelivery } from './use-post-delivery';

const formatDate = (iso: string) =>
  formatBusinessDate(iso);

const SentChip: React.FC<{ label: string; sentAt: string | null }> = ({ label, sentAt }) => (
  <div className={`flex items-center justify-between gap-2 rounded-2xl px-4 py-3 border ${
    sentAt ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'
  }`}>
    <p className="text-xs font-bold text-slate-500">{label}</p>
    <p className={`text-xs font-bold ${sentAt ? 'text-emerald-700' : 'text-slate-500'}`}>
      {sentAt ? formatDate(sentAt) : 'Pendiente'}
    </p>
  </div>
);

export const PostDeliverySection: React.FC<{ detail: ConsolidationDetail }> = ({ detail }) => {
  const {
    daysSinceDispatch,
    isFollowUpEarly,
    canRequestReview,
    handleSendFollowUp, isSendingFollowUp,
    handleRequestReview, isRequestingReview,
  } = usePostDelivery(detail);

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <HeartHandshake size={14} className="text-slate-400" />
        <p className="text-xs font-bold text-slate-500">Postventa</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <SentChip label="Seguimiento" sentAt={detail.follow_up_sent_at} />
        <SentChip label="Reseña" sentAt={detail.review_requested_at} />
      </div>

      {isFollowUpEarly && !detail.follow_up_sent_at && (
        <p className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
          {daysSinceDispatch === 0
            ? 'Se despachó hoy.'
            : `Se despachó hace ${daysSinceDispatch} día${daysSinceDispatch === 1 ? '' : 's'}.`}{' '}
          Haz el seguimiento desde el día {FOLLOW_UP_DELAY_DAYS}.
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={handleSendFollowUp}
          disabled={isSendingFollowUp}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-2xl font-bold text-sm transition-all disabled:opacity-40 ${
            detail.follow_up_sent_at || isFollowUpEarly
              ? 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          <MessageCircle size={15} />
          {detail.follow_up_sent_at ? 'Reenviar seguimiento' : 'Hacer seguimiento'}
        </button>
        {/* El mensaje de reseña asume que el cliente confirmó que todo llegó bien. */}
        {canRequestReview && (
          <button
            onClick={handleRequestReview}
            disabled={isRequestingReview}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-2xl font-bold text-sm transition-all disabled:opacity-40 ${
              detail.review_requested_at
                ? 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            <Star size={15} />
            {detail.review_requested_at ? 'Volver a pedir reseña' : 'Pedir reseña'}
          </button>
        )}
      </div>
    </div>
  );
};
