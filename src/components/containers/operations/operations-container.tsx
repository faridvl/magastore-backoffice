import React from 'react';
import Link from 'next/link';
import {
  AlertCircle, Check, ChevronDown, ChevronRight, RotateCcw, RefreshCw,
} from 'lucide-react';
import { useOperations } from './use-operations';
import { OperationsTaskRowView } from './operations-task-row';
import { OperationsCollectionCard } from './operations-collection-card';
import { BillingDetailModal } from '@/components/common/billing-detail-modal/billing-detail-modal';
import { NotifyPackagesModal } from '@/components/common/notify-packages-modal/notify-packages-modal';

const CARD = 'bg-white rounded-3xl border border-neutral-200/70 shadow-sm';
const SKELETON_ROWS = 3;

function Shimmer({ className }: { className: string }) {
  return <div className={`bg-neutral-100 rounded-lg animate-pulse ${className}`} />;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="font-black text-neutral-900 tracking-tight">{title}</h2>
      <p className="text-neutral-500 text-xs font-semibold mt-0.5">{subtitle}</p>
    </div>
  );
}

export const OperationsContainer: React.FC = () => {
  const {
    isLoading, isErrorWithoutData, hasRefreshError, isRefreshing, updatedLabel, handleRefresh,
    pendingTasks, doneTasks, taskSkeletonRows, handleTaskAction,
    collectionsTab, setCollectionsTab, collectionTabs, activeCollectionsTabId,
    collectionsPanelId, collectionsSummaryLabel, activeCollections, isToNotifyTab, seeAllCollectionsHref, collectionOverdueDays,
    goToOrder,
    selectedBillingUuid, setSelectedBillingUuid,
    billingDetail, isLoadingDetail,
    handleMarkAsPaid, isMarkingPaid,
    handleDownloadPdf, isDownloadingPdf,
    notifyMultiple, closeNotifyModal,
  } = useOperations();

  if (isErrorWithoutData) {
    return (
      <div className={`${CARD} p-8 flex flex-col items-center text-center gap-3`}>
        <div className="h-12 w-12 rounded-full bg-danger/10 text-danger flex items-center justify-center">
          <AlertCircle size={22} />
        </div>
        <p className="font-black text-neutral-900">No pudimos cargar tu día</p>
        <p className="text-sm text-neutral-500">Revisa tu conexión e intenta de nuevo.</p>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="mt-2 min-h-[44px] px-5 rounded-xl bg-neutral-900 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60"
        >
          <RotateCcw size={16} className={isRefreshing ? 'animate-spin' : undefined} />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="pb-8 space-y-4 sm:space-y-6">
      {hasRefreshError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-2"
        >
          <p className="flex items-center gap-2 text-sm font-bold text-danger-dark">
            <AlertCircle size={16} className="shrink-0" aria-hidden />
            No se pudo actualizar
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="min-h-[44px] px-4 rounded-xl border border-danger/30 bg-white text-danger-dark text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60"
          >
            <RotateCcw size={16} className={isRefreshing ? 'animate-spin' : undefined} aria-hidden />
            Reintentar
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-neutral-500">{updatedLabel ?? 'Cargando…'}</p>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="min-h-[44px] px-4 rounded-xl border border-neutral-200 bg-white text-neutral-800 text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60 active:bg-neutral-100"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : undefined} aria-hidden />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 items-start">
        {/* Tu día */}
        <section className={`${CARD} lg:col-span-3`}>
          <div className="p-5 sm:p-6 pb-3 sm:pb-4">
            <SectionTitle title="Tu día" subtitle="En el orden en que conviene hacerlo" />
          </div>

          {isLoading ? (
            <div className="px-5 sm:px-6 pb-5 space-y-3">
              {Array.from({ length: taskSkeletonRows }).map((_, i) => (
                <Shimmer key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <>
              {pendingTasks.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-5 pb-8 pt-4 text-center">
                  <span className="h-12 w-12 rounded-full bg-primary-soft text-primary-dark flex items-center justify-center">
                    <Check size={22} aria-hidden />
                  </span>
                  <p className="font-black text-neutral-900">Todo al día</p>
                  <p className="text-sm text-neutral-500">No tienes nada pendiente por ahora.</p>
                </div>
              ) : (
                <ul className="divide-y divide-neutral-100 border-t border-neutral-100">
                  {pendingTasks.map((task) => (
                    <OperationsTaskRowView
                      key={task.key}
                      task={task}
                      onAction={() => handleTaskAction(task.key)}
                    />
                  ))}
                </ul>
              )}

              {doneTasks.length > 0 && pendingTasks.length > 0 && (
                <details className="group border-t border-neutral-100">
                  <summary className="min-h-[44px] flex items-center justify-between gap-3 px-5 sm:px-6 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2 text-sm font-bold text-neutral-600">
                      <Check size={16} className="text-primary-dark" aria-hidden />
                      Al día ({doneTasks.length})
                    </span>
                    <ChevronDown
                      size={18}
                      className="text-neutral-400 transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <ul className="px-5 sm:px-6 pb-4 space-y-2">
                    {doneTasks.map((task) => (
                      <li key={task.key} className="flex items-center gap-2 text-sm text-neutral-500">
                        <Check size={14} className="shrink-0 text-primary-dark" aria-hidden />
                        {task.title}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </section>

        {/* Cobros */}
        <section className={`${CARD} p-5 sm:p-6 lg:col-span-2`}>
          <SectionTitle title="Cobros" subtitle="Facturas que todavía no se pagan" />

          <div
            role="tablist"
            aria-label="Tipo de cobro"
            className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-neutral-100 p-1"
          >
            {collectionTabs.map((tab) => {
              const isActive = collectionsTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  id={tab.id}
                  aria-controls={collectionsPanelId}
                  aria-selected={isActive}
                  onClick={() => setCollectionsTab(tab.value)}
                  className={`min-h-[44px] rounded-xl px-2 text-sm font-bold whitespace-nowrap inline-flex items-center justify-center gap-1.5 transition-colors ${
                    isActive ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
                  }`}
                >
                  {tab.label}
                  {!isLoading && (
                    <span
                      className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs tabular-nums inline-flex items-center justify-center ${
                        isActive ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-600'
                      }`}
                    >
                      {tab.total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id={collectionsPanelId}
            aria-labelledby={activeCollectionsTabId}
            className="mt-4"
          >
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                  <Shimmer key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : activeCollections.items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <span className="h-12 w-12 rounded-full bg-primary-soft text-primary-dark flex items-center justify-center">
                  <Check size={22} aria-hidden />
                </span>
                <p className="font-black text-neutral-900">
                  {isToNotifyTab ? 'Todo avisado' : 'Nadie te debe por ahora'}
                </p>
              </div>
            ) : (
              <>
                <ul className="space-y-3">
                  {activeCollections.items.map((collection) => (
                    <OperationsCollectionCard
                      key={collection.billingUuid}
                      collection={collection}
                      overdueDays={collectionOverdueDays}
                      onNotify={goToOrder}
                      onOpenBilling={setSelectedBillingUuid}
                    />
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3">
                  <p className="text-xs font-semibold text-neutral-500">
                    {collectionsSummaryLabel}
                  </p>
                  {activeCollections.total > activeCollections.items.length && (
                    <Link
                      href={seeAllCollectionsHref}
                      className="min-h-[44px] inline-flex items-center gap-1 px-2 text-sm font-bold text-primary-dark"
                    >
                      Ver todas ({activeCollections.total})
                      <ChevronRight size={16} aria-hidden />
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {selectedBillingUuid && (
        <BillingDetailModal
          billingDetail={billingDetail}
          isLoading={isLoadingDetail}
          onClose={() => setSelectedBillingUuid(null)}
          onMarkAsPaid={handleMarkAsPaid}
          isMarkingPaid={isMarkingPaid}
          onDownloadPdf={handleDownloadPdf}
          isDownloadingPdf={isDownloadingPdf}
        />
      )}

      {notifyMultiple.isOpen && (
        <NotifyPackagesModal
          customers={notifyMultiple.customers}
          isLoading={notifyMultiple.isLoading}
          sentCustomerIds={notifyMultiple.sentCustomerIds}
          sendingCustomerId={notifyMultiple.sendingCustomerId}
          onSend={notifyMultiple.sendToCustomer}
          onClose={closeNotifyModal}
        />
      )}
    </div>
  );
};
