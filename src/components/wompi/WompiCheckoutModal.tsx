import React, { useState } from 'react';
import { PricingPlanConfig } from '../../types';
import { useI18n } from '../../app/providers/I18nProvider';

interface WompiCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PricingPlanConfig;
  clinicName: string;
  adminEmail: string;
  onPaymentSuccess: (transactionId: string) => void;
}

export const WompiCheckoutModal: React.FC<WompiCheckoutModalProps> = ({
  isOpen,
  onClose,
  plan,
  clinicName,
  adminEmail,
  onPaymentSuccess,
}) => {
  const { t } = useI18n();
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pse' | 'nequi' | 'bancolombia'>('card');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSimulatePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => {
        const mockTxId = `wompi_tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        onPaymentSuccess(mockTxId);
      }, 1200);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleUp">
        {/* Header with Wompi Branding */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white/80"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center">
              <span className="material-symbols-outlined text-teal-400">payments</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight">{t('wompi.title', 'Pasarela de Pagos Wompi')}</span>
                <span className="px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-300 text-[10px] font-bold uppercase tracking-wider">
                  {t('wompi.sandbox_badge', 'Sandbox Seguro')}
                </span>
              </div>
              <p className="text-xs text-slate-400">{t('wompi.subscription_for', 'Suscripción SaaS para')} {clinicName || 'tu clínica'}</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 flex items-baseline justify-between">
            <div>
              <p className="text-xs text-slate-300 font-medium">{plan.name}</p>
              <p className="text-[11px] text-teal-300 font-semibold">{t('wompi.free_trial_note', 'Incluye 7 días de prueba 100% gratis')}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-white">
                ${(plan.price_cop || 119000).toLocaleString('es-CO')}
              </span>
              <span className="text-xs text-slate-400"> COP{t('landing.per_month', '/mes')}</span>
              <p className="text-[10px] text-emerald-400 font-bold">{t('wompi.initial_charge', 'Cobro inicial: $0 hoy')}</p>
            </div>
          </div>
        </div>

        {/* Body Form */}
        <div className="p-6 space-y-5">
          {isSuccess ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <span className="material-symbols-outlined text-3xl">check_circle</span>
              </div>
              <h3 className="text-lg font-bold text-on-surface">{t('wompi.success_title', '¡Método de pago validado por Wompi!')}</h3>
              <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
                {t('wompi.success_desc', 'Tu período de prueba de 7 días ha sido activado exitosamente.')}
              </p>
            </div>
          ) : (
            <>
              {/* Payment Methods */}
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                  {t('wompi.card', 'Método de Pago')}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'card', label: t('wompi.card', 'Tarjeta'), icon: 'credit_card' },
                    { id: 'pse', label: t('wompi.pse', 'PSE / Débito'), icon: 'account_balance' },
                    { id: 'nequi', label: t('wompi.nequi', 'Nequi'), icon: 'smartphone' },
                    { id: 'bancolombia', label: t('wompi.bancolombia', 'Bancolombia'), icon: 'qr_code_2' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        paymentMethod === m.id
                          ? 'border-primary bg-primary/5 text-primary shadow-xs font-bold'
                          : 'border-outline-variant/40 hover:border-outline-variant text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl">{m.icon}</span>
                      <span className="text-[10px]">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Inputs */}
              <div className="space-y-3 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30">
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                    {t('wompi.card_number', 'Número de Tarjeta')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4242 4242 4242 4242"
                      className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-3.5 py-2.5 text-xs font-mono text-on-surface focus:outline-hidden focus:border-primary"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md">
                      VISA / MC
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                      {t('wompi.expiry', 'Fecha Expiración')}
                    </label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/AA"
                      className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-3.5 py-2.5 text-xs font-mono text-on-surface focus:outline-hidden focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                      {t('wompi.cvc', 'CVV / CVC')}
                    </label>
                    <input
                      type="password"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      placeholder="123"
                      maxLength={4}
                      className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-3.5 py-2.5 text-xs font-mono text-on-surface focus:outline-hidden focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                    {t('wompi.card_holder', 'Nombre del Titular')}
                  </label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="Ej: MARCELA LAGOS"
                    className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:outline-hidden focus:border-primary uppercase"
                  />
                </div>
              </div>

              {/* Security guarantee */}
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-800 text-[11px]">
                <span className="material-symbols-outlined text-base text-emerald-600">verified_user</span>
                <span>
                  <strong>Garantía Wompi:</strong> 0 cargos durante los 7 días de prueba. Cancela con un clic en cualquier momento.
                </span>
              </div>

              {/* Action Button */}
              <button
                id="btn-confirm-wompi-trial"
                type="button"
                disabled={isProcessing}
                onClick={handleSimulatePayment}
                className="w-full py-3 px-4 bg-primary hover:bg-primary-container disabled:opacity-50 text-white rounded-2xl text-xs font-extrabold transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                    <span>{t('wompi.processing', 'Procesando tokenización con Wompi...')}</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">lock</span>
                    <span>{t('wompi.pay_button', 'Confirmar y Comenzar Trial de 7 Días')}</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
