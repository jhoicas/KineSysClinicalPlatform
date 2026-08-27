import React, { useState } from 'react';
import { PRICING_PLANS } from '../services/supabaseClient';
import { PricingPlanConfig } from '../types';
import { LanguageSelector } from '../components/common/LanguageSelector';
import { useI18n } from '../app/providers/I18nProvider';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { t } = useI18n();
  const [currency, setCurrency] = useState<'COP' | 'USD' | 'CLP'>('COP');
  const [activeTab, setActiveTab] = useState<'fisio' | 'nutri' | 'medico' | 'paciente'>('fisio');

  const handleSelectPlan = (plan: PricingPlanConfig) => {
    // Store selected plan in session for onboarding
    sessionStorage.setItem('kinesys_selected_plan', plan.id);
    onNavigate('/onboarding');
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans selection:bg-primary selection:text-white pb-20">
      {/* Top Banner: 7-Day Trial Announcement */}
      <div className="bg-primary-fixed/70 border-b border-outline-variant/30 py-2.5 px-4 text-center text-xs font-semibold text-on-primary-fixed flex flex-wrap items-center justify-center gap-2">
        <span className="bg-primary text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
          7 Días Gratis
        </span>
        <span>Comienza tu prueba de software clínico sin tarjeta ni permanencia. Integrado con Wompi Gateway.</span>
        <button
          onClick={() => onNavigate('/onboarding')}
          className="font-bold text-primary hover:underline cursor-pointer ml-1"
        >
          Registrar Clínica →
        </button>
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/30 px-4 sm:px-8 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('/landing')}>
            <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white shadow-sm shadow-primary/20">
              <span className="material-symbols-outlined text-2xl font-bold">vital_signs</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-on-surface">KineSys</span>
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed border border-primary-fixed-dim">
                  SaaS B2B2C
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant font-medium">Software Clínico Multidisciplinario</p>
            </div>
          </div>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-bold text-on-surface-variant">
            <a href="#caracteristicas" className="hover:text-primary transition-colors">
              Módulos RBAC
            </a>
            <a href="#mapa-dolor-demo" className="hover:text-primary transition-colors">
              Mapa de Dolor
            </a>
            <a href="#precios" className="hover:text-primary transition-colors">
              Planes & Precios
            </a>
            <a href="#wompi" className="hover:text-primary transition-colors">
              Pasarela Wompi
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelector variant="compact" />
            <button
              id="btn-nav-login"
              onClick={() => onNavigate('/login')}
              className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold text-primary hover:text-primary-container bg-primary-fixed/70 hover:bg-primary-fixed border border-primary-fixed-dim transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <span className="material-symbols-outlined text-base">login</span>
              <span>Iniciar Sesión</span>
            </button>
            <button
              id="btn-nav-trial"
              onClick={() => onNavigate('/onboarding')}
              className="hidden xs:flex px-4 py-2 rounded-full text-xs font-extrabold text-white bg-primary hover:bg-primary-container transition-all shadow-sm shadow-primary/25 cursor-pointer items-center gap-1.5"
            >
              <span>Comenzar Trial</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-12 pb-16 px-4 sm:px-8 max-w-7xl mx-auto text-center relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary-fixed border border-primary-fixed-dim text-xs font-bold text-on-primary-fixed mb-6 animate-fadeIn">
          <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
          <span>Versión 2.0: Soporte Multitenant + RBAC Médico Especializado</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-on-surface tracking-tight max-w-4xl mx-auto leading-tight">
          El Software Clínico Inteligente para <span className="text-primary">Centros de Salud y Kinesiología</span>
        </h1>

        <p className="mt-5 text-sm sm:text-base text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
          Centraliza fichas médicas, mapa de dolor 2D interactivo, composición corporal InBody, recetas electrónicas y pasarela de cobros Wompi. Todo con control de acceso por roles (RBAC) y 7 días de prueba gratis.
        </p>

        {/* Hero CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            id="btn-hero-onboarding"
            onClick={() => onNavigate('/onboarding')}
            className="w-full sm:w-auto px-7 py-3.5 rounded-full text-sm font-extrabold text-white bg-primary hover:bg-primary-container shadow-md shadow-primary/20 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">rocket_launch</span>
            <span>Registrar mi Clínica (7 Días Gratis)</span>
          </button>
          
          <button
            onClick={() => onNavigate('/calendario')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-full text-sm font-bold text-on-surface-variant hover:text-on-surface bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant/30 shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg text-primary">play_circle</span>
            <span>Explorar Dashboard Clínico</span>
          </button>
        </div>

        {/* Trust Badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-emerald-600 text-base">check_circle</span>
            <span>Multi-tenant con RLS Supabase</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-emerald-600 text-base">credit_card</span>
            <span>Wompi Gateway Integrado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-emerald-600 text-base">security</span>
            <span>Datos Clínicos Encriptados</span>
          </div>
        </div>

        {/* SaaS Dashboard Preview Mockup */}
        <div className="mt-12 relative rounded-3xl p-3 sm:p-4 bg-gradient-to-b from-slate-100 to-slate-200/70 border border-slate-300/80 shadow-xl max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl p-4 sm:p-6 text-left border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Top Mock Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                <span className="text-xs text-slate-400 font-mono ml-2">app.kinesys.cloud/dashboard</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-[11px] font-bold">
                  Suscripción Growth (Trial Activo)
                </span>
              </div>
            </div>

            {/* Mock Dashboard Grid */}
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-800">Agenda Médica Multidisciplinaria</h4>
                  <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">4 Profesionales en Línea</span>
                </div>
                <div className="space-y-2">
                  {[
                    { time: '09:00', prof: 'Klgo. Mateo Gómez', pat: 'Camila Soto', spec: 'Fisioterapia (LCA)', badge: 'Confirmado' },
                    { time: '11:30', prof: 'Nut. Valeria Benítez', pat: 'Valentina Ríos', spec: 'Nutrición (InBody)', badge: 'En Espera' },
                    { time: '14:00', prof: 'Dr. Fernando Castillo', pat: 'Diego Alarcón', spec: 'Medicina General', badge: 'Completado' },
                  ].map((row, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80 text-xs shadow-2xs">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-teal-700 font-bold">{row.time}</span>
                        <div>
                          <p className="font-bold text-slate-800">{row.pat}</p>
                          <p className="text-[10px] text-slate-500">{row.prof} • {row.spec}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                        {row.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">Métricas SaaS de la Clínica</h4>
                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">Pacientes Atendidos Mes</p>
                  <p className="text-2xl font-black text-slate-900 mt-0.5">128</p>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">+18% vs mes anterior</p>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">Facturación Cobrada (Wompi)</p>
                  <p className="text-2xl font-black text-teal-700 mt-0.5">$18.450.000 COP</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">Sin comisiones ocultas</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RBAC Specialized Modules Showcase */}
      <section id="caracteristicas" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto border-t border-slate-200">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-xs font-black tracking-widest text-teal-700 uppercase">
            Arquitectura RBAC Especializada
          </h2>
          <h3 className="text-2xl sm:text-4xl font-black text-slate-900 mt-2">
            Una vista a medida para cada profesional de la salud
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-3">
            KineSys adapta automáticamente las herramientas e historia clínica según el rol profesional autenticado.
          </p>
        </div>

        {/* Module Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {[
            { id: 'fisio', label: 'Fisioterapeuta / Kinesiólogo', icon: 'accessibility_new' },
            { id: 'nutri', label: 'Nutricionista', icon: 'nutrition' },
            { id: 'medico', label: 'Médico General', icon: 'stethoscope' },
            { id: 'paciente', label: 'Portal del Paciente', icon: 'person' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/20'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Panels */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm max-w-5xl mx-auto">
          {activeTab === 'fisio' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-xs font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Módulo Kinesiología
                </span>
                <h4 className="text-2xl font-black text-slate-900 mt-2">Mapa de Dolor 2D Interactivo</h4>
                <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed">
                  Pincha sobre el lienzo anatómico ventral o dorsal para registrar la localización exacta, intensidad EVA (1-10), tipo de dolor (punzante, sordo, urente) y evolución a lo largo del tratamiento.
                </p>
                <div className="mt-5 space-y-2.5 text-xs text-slate-700 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-600 text-sm">check_circle</span>
                    <span>Puntos anatómicos calibrados con persistencia en Supabase</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-600 text-sm">check_circle</span>
                    <span>Medición de rango de movimiento (ROM) y test funcionales</span>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('/mapa-dolor')}
                  className="mt-6 px-5 py-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold hover:bg-teal-100 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Probar Mapa de Dolor</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex justify-center">
                <img
                  src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80"
                  alt="Kinesiología"
                  className="rounded-xl object-cover h-64 w-full"
                />
              </div>
            </div>
          )}

          {activeTab === 'nutri' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-xs font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Módulo Nutrición
                </span>
                <h4 className="text-2xl font-black text-slate-900 mt-2">Composición Corporal InBody & Macronutrientes</h4>
                <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed">
                  Registra porcentaje de grasa, masa muscular en kilogramos, grasa visceral, gasto calórico basal (BMR) y diseña pautas alimentarias personalizadas con distribución de macros (proteínas, carbohidratos, lípidos).
                </p>
                <div className="mt-5 space-y-2.5 text-xs text-slate-700 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-600 text-sm">check_circle</span>
                    <span>Cálculo automático de requerimiento calórico total</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-600 text-sm">check_circle</span>
                    <span>Comparativa gráfica de evolución antropométrica</span>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('/nutricion')}
                  className="mt-6 px-5 py-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold hover:bg-teal-100 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Ver Módulo Nutrición</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex justify-center">
                <img
                  src="https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&auto=format&fit=crop&q=80"
                  alt="Nutrición"
                  className="rounded-xl object-cover h-64 w-full"
                />
              </div>
            </div>
          )}

          {activeTab === 'medico' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-xs font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Módulo Médico General
                </span>
                <h4 className="text-2xl font-black text-slate-900 mt-2">Recetas Electrónicas & Exámenes</h4>
                <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed">
                  Registro de signos vitales (presión arterial, frecuencia cardíaca, SpO2, temperatura), codificación de diagnóstico CIE-10, emisión de recetas con posología y solicitud de exámenes de laboratorio.
                </p>
                <div className="mt-5 space-y-2.5 text-xs text-slate-700 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-600 text-sm">check_circle</span>
                    <span>Ficha clínica con evolución y antecedentes médicos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-600 text-sm">check_circle</span>
                    <span>Generación de recetas listas para imprimir o enviar por correo</span>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('/medicina-general')}
                  className="mt-6 px-5 py-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold hover:bg-teal-100 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Ver Ficha Médica</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex justify-center">
                <img
                  src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&auto=format&fit=crop&q=80"
                  alt="Medicina General"
                  className="rounded-xl object-cover h-64 w-full"
                />
              </div>
            </div>
          )}

          {activeTab === 'paciente' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-xs font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Portal B2C
                </span>
                <h4 className="text-2xl font-black text-slate-900 mt-2">Auto-agendamiento para Pacientes</h4>
                <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed">
                  Permite a tus pacientes buscar profesionales por especialidad, revisar disponibilidad horaria en tiempo real, agendar su cita y consultar sus indicaciones médicas desde cualquier teléfono móvil.
                </p>
                <div className="mt-5 space-y-2.5 text-xs text-slate-700 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-600 text-sm">check_circle</span>
                    <span>Filtro inteligente por Kinesiología, Nutrición o Medicina</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-600 text-sm">check_circle</span>
                    <span>Recordatorios automáticos y política de cancelación</span>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('/portal-paciente')}
                  className="mt-6 px-5 py-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold hover:bg-teal-100 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Ver Portal del Paciente</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex justify-center">
                <img
                  src="https://images.unsplash.com/photo-1516549655169-df83a0774514?w=600&auto=format&fit=crop&q=80"
                  alt="Portal Paciente"
                  className="rounded-xl object-cover h-64 w-full"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Pricing Section with 7-Day Trial & Wompi */}
      <section id="precios" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto border-t border-slate-200">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-xs font-extrabold uppercase">
            Planes Transparentes
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-3">
            Elige el plan ideal para tu clínica o consultorio
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2">
            Todos los planes incluyen <strong>7 días de prueba gratis</strong>. Posteriormente se procesa el cobro seguro mediante Wompi.
          </p>

          {/* Currency Switcher */}
          <div className="mt-6 inline-flex items-center p-1 bg-white border border-slate-200 rounded-xl shadow-xs">
            <button
              onClick={() => setCurrency('COP')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currency === 'COP' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              COP ($ - Colombia)
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currency === 'USD' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              USD ($ - Dólar)
            </button>
            <button
              onClick={() => setCurrency('CLP')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currency === 'CLP' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              CLP ($ - Chile)
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch max-w-6xl mx-auto">
          {PRICING_PLANS.map((plan) => {
            const isPopular = plan.popular;
            const price =
              currency === 'COP'
                ? `$${(plan.price_cop || 119000).toLocaleString('es-CO')} COP`
                : currency === 'CLP'
                ? `$${(plan.price_clp || 24990).toLocaleString('es-CL')} CLP`
                : `$${plan.price_usd} USD`;

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 ${
                  isPopular
                    ? 'bg-white border-2 border-teal-600 shadow-xl shadow-teal-600/10 transform md:-translate-y-2'
                    : 'bg-white border border-slate-200 shadow-sm hover:border-slate-300'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-teal-600 text-white px-3.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs">
                    Más Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-slate-900">{plan.name}</h3>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {plan.max_users === 1 ? '1 Profesional' : `Hasta ${plan.max_users} usuarios`}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 min-h-[32px]">{plan.tagline}</p>

                  {/* Price Tag */}
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900">{price}</span>
                      <span className="text-xs text-slate-500 font-medium">/ mes</span>
                    </div>
                    <p className="text-[11px] text-teal-700 font-bold mt-1">
                      7 días de trial ($0 cobrado hoy)
                    </p>
                  </div>

                  {/* Feature List */}
                  <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-teal-600 text-sm mt-0.5 shrink-0">
                          check_circle
                        </span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Select Plan CTA */}
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isPopular
                        ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                    }`}
                  >
                    <span>Elegir {plan.name}</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                  <p className="text-[10px] text-center text-slate-500 mt-2">
                    Cancela en cualquier momento sin costo
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Wompi Integration Section */}
      <section id="wompi" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto border-t border-slate-200">
        <div className="bg-gradient-to-r from-teal-50 via-slate-50 to-emerald-50 border border-teal-100 rounded-3xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xs">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-teal-200 text-teal-800 text-xs font-bold mb-4 shadow-2xs">
              <span className="material-symbols-outlined text-sm text-teal-600">lock</span>
              <span>Pasarela de Pagos Oficial</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
              Cobros Recurrentes Seguros con Wompi
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed">
              KineSys integra la pasarela Wompi para automatizar la facturación de tu clínica. Permite aceptar tarjetas de crédito/débito, transferencias y pagos locales con total protección de datos y tokenización segura.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-emerald-600 text-sm">check_circle</span> Sandbox para Pruebas</span>
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-emerald-600 text-sm">check_circle</span> Llaves de Integridad SHA-256</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full md:w-80 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto border border-teal-200">
              <span className="material-symbols-outlined text-2xl">payments</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Wompi Gateway Status</p>
              <p className="text-[11px] text-emerald-600 font-bold">Listo para Transaccionar</p>
            </div>
            <button
              onClick={() => onNavigate('/configuracion')}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              Configurar Credenciales
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-slate-200 text-center text-xs text-slate-500 max-w-7xl mx-auto px-4">
        <p>© 2025 KineSys Clinical SaaS. Todos los derechos reservados. Diseñado para centros de salud y kinesiología moderna.</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:gap-4 font-medium">
          <button onClick={() => onNavigate('/login')} className="hover:text-primary font-bold text-primary cursor-pointer">
            Iniciar Sesión
          </button>
          <span>•</span>
          <button onClick={() => onNavigate('/super-admin')} className="hover:text-teal-700 cursor-pointer">
            Super Admin Portal
          </button>
          <span>•</span>
          <button onClick={() => onNavigate('/portal-paciente')} className="hover:text-teal-700 cursor-pointer">
            Portal Pacientes
          </button>
          <span>•</span>
          <button onClick={() => onNavigate('/calendario')} className="hover:text-teal-700 cursor-pointer">
            Dashboard
          </button>
        </div>
      </footer>
    </div>
  );
};
