import React, { useState, useRef } from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useTheme } from '../../app/providers/ThemeProvider';
import { supabase } from '../../services/supabaseClient';
import { isValidHexColor, getContrastForeground } from '../../utils/themeUtils';

interface BrandingCustomizerProps {
  onSuccessToast?: (title: string, message: string) => void;
  onErrorToast?: (title: string, message: string) => void;
}

export const BrandingCustomizer: React.FC<BrandingCustomizerProps> = ({
  onSuccessToast,
  onErrorToast,
}) => {
  const { tenant } = useAuth();
  const {
    primaryColor,
    previewColor,
    activeColor,
    activeLogoUrl,
    clinicalPresets,
    setPreviewColor,
    setPreviewLogoUrl,
    resetPreview,
    saveBranding,
  } = useTheme();

  // Local form editing state
  const [selectedHex, setSelectedHex] = useState<string>(tenant?.primary_color || '#004870');
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string>(
    tenant?.logo_url || 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=150&auto=format&fit=crop&q=80'
  );
  const [brandDisplayMode, setBrandDisplayMode] = useState<'both' | 'logo_only' | 'name_only'>(
    tenant?.settings?.brand_name_display || 'both'
  );
  
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle color change from color picker input or text
  const handleColorChange = (hex: string) => {
    setSelectedHex(hex);
    if (isValidHexColor(hex)) {
      setPreviewColor(hex);
    }
  };

  // Preset click
  const handlePresetSelect = (hex: string) => {
    setSelectedHex(hex);
    setPreviewColor(hex);
  };

  // Upload Logo to Supabase Storage ('tenant_logos' bucket)
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate type and size (max 3MB)
    if (!file.type.startsWith('image/')) {
      onErrorToast?.('Formato no soportado', 'Por favor selecciona una imagen (PNG, JPG, SVG o WebP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      onErrorToast?.('Archivo muy grande', 'El logo no debe exceder los 3 MB.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    try {
      const tenantId = tenant?.id || 'tenant_kine_001';
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${tenantId}/logo_${Date.now()}.${fileExt}`;

      setUploadProgress(60);

      // Upload to Supabase Storage bucket 'tenant_logos'
      const { data, error } = await supabase.storage
        .from('tenant_logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      setUploadProgress(90);

      // Retrieve public URL
      const { data: urlData } = supabase.storage
        .from('tenant_logos')
        .getPublicUrl(data?.path || fileName);

      const publicUrl = urlData.publicUrl;
      setCurrentLogoUrl(publicUrl);
      setPreviewLogoUrl(publicUrl);
      setUploadProgress(100);

      onSuccessToast?.('Logo cargado', 'El logo fue subido correctamente al bucket tenant_logos.');
    } catch (err: any) {
      console.error('Error uploading logo:', err);
      onErrorToast?.('Error al subir logo', err?.message || 'No se pudo subir la imagen.');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Reset to default branding
  const handleResetToDefault = () => {
    const defaultColor = '#004870';
    const defaultLogo = 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=150&auto=format&fit=crop&q=80';
    setSelectedHex(defaultColor);
    setCurrentLogoUrl(defaultLogo);
    setBrandDisplayMode('both');
    resetPreview();
  };

  // Save changes to database
  const handleSaveAll = async () => {
    if (!isValidHexColor(selectedHex)) {
      onErrorToast?.('Color inválido', 'Introduce un código HEX válido (ej. #004870).');
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveBranding({
        primary_color: selectedHex,
        logo_url: currentLogoUrl,
        settings: {
          brand_name_display: brandDisplayMode,
        },
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      onSuccessToast?.(
        '¡Marca Blanca Actualizada!',
        'El logo y color principal se sincronizaron con éxito en la base de datos y la interfaz.'
      );
    } catch (err: any) {
      console.error('Save branding error:', err);
      onErrorToast?.('Error al guardar', err?.message || 'Ocurrió un error al persistir los cambios.');
    } finally {
      setIsSaving(false);
    }
  };

  const contrastColor = getContrastForeground(activeColor);

  // Backend SQL Script for SuperAdmin or Cloud deployment
  const sqlScript = `-- =========================================================================
-- MIGRACIÓN BACKEND SUPABASE: WHITE-LABELING & STORAGE 'tenant_logos'
-- =========================================================================

-- 1. Crear el Bucket de Storage para Logos de Clínicas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant_logos',
  'tenant_logos',
  true,
  3145728, -- 3MB límite
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 3145728;

-- 2. Políticas RLS (Row Level Security) para el Bucket 'tenant_logos'
-- Lectura pública para visualización en portal paciente y web
CREATE POLICY "Logos de clínicas son públicos"
ON storage.objects FOR SELECT
USING (bucket_id = 'tenant_logos');

-- Escritura (Upload/Update) restringida a administradores de clínica y super_admin
CREATE POLICY "Admins pueden subir logo de su tenant"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tenant_logos' 
  AND (
    (auth.jwt() ->> 'role') IN ('clinic_admin', 'super_admin')
    OR (name LIKE (auth.jwt() ->> 'tenant_id') || '/%')
  )
);

CREATE POLICY "Admins pueden actualizar logo de su tenant"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tenant_logos'
  AND (
    (auth.jwt() ->> 'role') IN ('clinic_admin', 'super_admin')
    OR (name LIKE (auth.jwt() ->> 'tenant_id') || '/%')
  )
);

CREATE POLICY "Admins pueden eliminar logo de su tenant"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tenant_logos'
  AND (
    (auth.jwt() ->> 'role') IN ('clinic_admin', 'super_admin')
    OR (name LIKE (auth.jwt() ->> 'tenant_id') || '/%')
  )
);

-- 3. Actualizar la tabla 'tenants' para soportar logo_url, primary_color y settings
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#004870',
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"brand_name_display": "both", "theme": "light"}'::jsonb;

-- Comentarios de documentación en esquema
COMMENT ON COLUMN public.tenants.logo_url IS 'URL pública del logo de la clínica en Supabase Storage';
COMMENT ON COLUMN public.tenants.primary_color IS 'Código HEX del color principal corporativo para personalización de marca';
COMMENT ON COLUMN public.tenants.settings IS 'Configuraciones adicionales de visualización y personalización';
`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div id="branding-customizer-root" className="space-y-8">
      {/* Header Banner */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 clinical-shadow p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-outline-variant/20">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-2xl">palette</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg md:text-xl text-on-surface">
                  Personalización de Marca (White-labeling)
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">
                  Multi-Tenant
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Adapta el logo y la paleta cromática a la identidad visual de tu clínica. Los cambios se reflejan al instante.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowSqlModal(true)}
            className="self-start md:self-auto bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-xs font-bold text-on-surface-variant hover:text-primary px-3.5 py-2 rounded-2xl flex items-center gap-2 transition-all cursor-pointer"
            title="Ver código SQL de Storage y Migraciones RLS"
          >
            <span className="material-symbols-outlined text-base">code</span>
            <span>Ver SQL & RLS Storage</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
          
          {/* Left: Controls (7 Cols) */}
          <div className="lg:col-span-7 space-y-7">
            
            {/* Logo Upload Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-on-surface-variant tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-primary">image</span>
                  Logo de la Clínica (Supabase Storage)
                </label>
                <span className="text-[11px] text-on-surface-variant">PNG, JPG, SVG o WebP (máx. 3MB)</span>
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-3xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-primary bg-primary/5 scale-[1.01]'
                    : 'border-outline-variant/50 hover:border-primary/60 bg-surface-container-low/50 hover:bg-surface-container-low'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />

                {isUploading ? (
                  <div className="py-4 space-y-3 w-full max-w-xs">
                    <span className="material-symbols-outlined animate-spin text-3xl text-primary">cloud_upload</span>
                    <p className="text-xs font-bold text-on-surface">Subiendo imagen al Storage...</p>
                    <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-16 h-16 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 p-1.5 flex items-center justify-center overflow-hidden shadow-xs shrink-0">
                        {activeLogoUrl ? (
                          <img
                            src={activeLogoUrl}
                            alt="Logo preview"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=150&auto=format&fit=crop&q=80';
                            }}
                          />
                        ) : (
                          <span className="material-symbols-outlined text-3xl text-on-surface-variant">photo_library</span>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-on-surface">
                          Arrastra tu archivo aquí o haz clic para explorar
                        </p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          Bucket: <span className="font-mono text-primary font-semibold">tenant_logos</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-extrabold transition-all"
                      >
                        Cambiar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Color Selection Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-on-surface-variant tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-primary">colorize</span>
                  Color Principal de la Clínica
                </label>
                <span className="text-[11px] font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                  {selectedHex.toUpperCase()}
                </span>
              </div>

              {/* Interactive Color Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Native Picker Wrapper */}
                <div className="flex items-center gap-3 bg-surface-container-low border border-outline-variant/40 rounded-2xl p-2.5">
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-xs border border-outline-variant/40 shrink-0">
                    <input
                      type="color"
                      value={isValidHexColor(selectedHex) ? selectedHex : '#004870'}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="absolute -top-3 -left-3 w-16 h-16 cursor-pointer border-0"
                      title="Seleccionar color visualmente"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-on-surface block">Selector Visual</span>
                    <span className="text-[10px] text-on-surface-variant">Clic para abrir paleta cromática</span>
                  </div>
                </div>

                {/* HEX Text Input */}
                <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant/40 rounded-2xl px-3 py-2">
                  <span className="text-xs font-mono font-bold text-on-surface-variant">#</span>
                  <input
                    type="text"
                    maxLength={7}
                    value={selectedHex.replace(/^#/, '')}
                    onChange={(e) => handleColorChange(`#${e.target.value}`)}
                    placeholder="004870"
                    className="w-full bg-transparent text-xs font-mono font-bold text-on-surface outline-none"
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: isValidHexColor(selectedHex) ? selectedHex : '#004870' }}
                  />
                </div>
              </div>

              {/* Presets Grid */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-on-surface-variant">
                    Paletas Clínicas Recomendadas
                  </span>
                  <span className="text-[10px] text-on-surface-variant">WCAG AA Optimizado</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {clinicalPresets.map((preset) => {
                    const isSelected = selectedHex.toLowerCase() === preset.hex.toLowerCase();
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handlePresetSelect(preset.hex)}
                        className={`p-2.5 rounded-2xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                            : 'border-outline-variant/30 hover:border-outline-variant/80 bg-surface-container-lowest'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className="w-5 h-5 rounded-lg shadow-xs border border-black/10"
                            style={{ backgroundColor: preset.hex }}
                          />
                          {isSelected && (
                            <span className="material-symbols-outlined text-sm text-primary">check_circle</span>
                          )}
                        </div>
                        <div>
                          <p className="text-[11px] font-extrabold text-on-surface truncate leading-tight">
                            {preset.name}
                          </p>
                          <p className="text-[10px] font-mono text-on-surface-variant">
                            {preset.hex}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Display Mode Preferences */}
              <div className="pt-2">
                <label className="text-[11px] font-extrabold text-on-surface-variant block mb-2">
                  Modo de Presentación de Marca
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'both', label: 'Logo y Nombre', icon: 'badge' },
                    { id: 'logo_only', label: 'Solo Logo', icon: 'image' },
                    { id: 'name_only', label: 'Solo Nombre', icon: 'title' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setBrandDisplayMode(mode.id as any)}
                      className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        brandDisplayMode === mode.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">{mode.icon}</span>
                      <span>{mode.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-xs font-bold text-on-surface-variant hover:text-primary px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">restart_alt</span>
                Restablecer Valores
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="bg-primary hover:bg-primary-container text-white font-extrabold text-xs px-6 py-3 rounded-2xl shadow-md shadow-primary/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-base">sync</span>
                      <span>Guardando Marca...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">save</span>
                      <span>Guardar Personalización</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

          {/* Right: Live Preview Sandbox (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-on-surface-variant tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-primary">visibility</span>
                Vista Previa en Tiempo Real
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Interactiva
              </span>
            </div>

            {/* Mock Screen Container */}
            <div className="bg-surface-container-low rounded-3xl border border-outline-variant/40 p-4 space-y-4 shadow-sm">
              
              {/* Mock Header Navigation */}
              <div className="bg-surface-container-lowest rounded-2xl p-3 border border-outline-variant/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {brandDisplayMode !== 'name_only' && activeLogoUrl ? (
                    <div className="w-8 h-8 rounded-xl overflow-hidden border border-outline-variant/30 bg-surface-container p-0.5 flex items-center justify-center">
                      <img src={activeLogoUrl} alt="Preview logo" className="w-full h-full object-cover rounded-lg" />
                    </div>
                  ) : (
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shadow-xs"
                      style={{ backgroundColor: activeColor, color: contrastColor }}
                    >
                      <span className="material-symbols-outlined text-lg font-bold">vital_signs</span>
                    </div>
                  )}

                  {brandDisplayMode !== 'logo_only' && (
                    <div>
                      <p className="text-xs font-black text-on-surface leading-tight">
                        {tenant?.name || 'KineSys Salud'}
                      </p>
                      <p className="text-[10px] text-on-surface-variant">Portal Médico</p>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold shadow-xs transition-all"
                  style={{ backgroundColor: activeColor, color: contrastColor }}
                >
                  Nueva Cita
                </button>
              </div>

              {/* Mock Patient Card */}
              <div className="bg-surface-container-lowest rounded-2xl p-3.5 border border-outline-variant/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: activeColor }}
                    />
                    <span className="text-xs font-extrabold text-on-surface">Consulta Kinésica #241</span>
                  </div>
                  <span
                    className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md"
                    style={{ backgroundColor: `${activeColor}15`, color: activeColor }}
                  >
                    Confirmada
                  </span>
                </div>

                <p className="text-[11px] text-on-surface-variant">
                  Paciente: <strong>Camila Soto</strong> • Evaluación Funcional
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    className="flex-1 py-1.5 rounded-xl text-xs font-extrabold shadow-xs text-center"
                    style={{ backgroundColor: activeColor, color: contrastColor }}
                  >
                    Abrir Ficha
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border border-outline-variant/40 bg-surface-container text-on-surface hover:bg-surface-container-high"
                  >
                    Reprogramar
                  </button>
                </div>
              </div>

              {/* Mock Patient Portal Hero */}
              <div
                className="rounded-2xl p-4 text-white relative overflow-hidden shadow-sm space-y-2"
                style={{ backgroundColor: activeColor }}
              >
                <div className="relative z-10">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider bg-white/20 px-2 py-0.5 rounded backdrop-blur-xs">
                    Portal del Paciente
                  </span>
                  <h4 className="text-sm font-extrabold mt-1">Agenda tu hora online</h4>
                  <p className="text-[11px] text-white/80">
                    Atención personalizada con el mejor equipo de profesionales.
                  </p>
                </div>
                <div
                  className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10 blur-lg pointer-events-none"
                />
              </div>

              {/* Status Note */}
              <div className="p-3 bg-surface-container rounded-2xl text-[11px] text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">info</span>
                <span>
                  Los botones, encabezados y elementos interactivos heredan dinámicamente este color mediante variables CSS.
                </span>
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* SQL & RLS Policies Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 md:p-8 max-w-3xl w-full max-h-[90vh] flex flex-col clinical-shadow">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">terminal</span>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-on-surface">
                    Código SQL & Políticas RLS de Storage
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Ejecuta este script en el Editor SQL de tu proyecto Supabase.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowSqlModal(false)}
                className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* SQL Code Body */}
            <div className="flex-1 overflow-y-auto my-4 p-4 bg-slate-950 text-slate-200 rounded-2xl font-mono text-xs leading-relaxed border border-slate-800">
              <pre className="whitespace-pre-wrap">{sqlScript}</pre>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between">
              <span className="text-xs text-on-surface-variant">
                Incluye creación de bucket, 4 políticas RLS y alter table en tenants.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copySqlToClipboard}
                  className="px-4 py-2 bg-primary hover:bg-primary-container text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                >
                  <span className="material-symbols-outlined text-base">
                    {copiedSql ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedSql ? '¡Copiado!' : 'Copiar SQL'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
