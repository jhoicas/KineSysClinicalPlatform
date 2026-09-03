import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, Link, Check, Sparkles } from 'lucide-react';

interface ExerciseImageUploaderProps {
  value?: string;
  onChange: (imageUrl: string) => void;
  title?: string;
}

const PRESET_EXERCISE_IMAGES = [
  {
    name: 'Sentadilla / Cadena Inferior',
    url: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Minibanda / Abducción',
    url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Pliometría / Aterrizaje',
    url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Cintura Escapular / Espalda',
    url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Movilidad / Foam Roller',
    url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Hip Thrust / Glúteos',
    url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Core / Cuadrupedia',
    url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Banda Elástica / Tracción',
    url: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=800&q=80',
  },
];

export const ExerciseImageUploader: React.FC<ExerciseImageUploaderProps> = ({
  value,
  onChange,
  title = 'Imagen de Referencia del Ejercicio',
}) => {
  const [activeMode, setActiveMode] = useState<'upload' | 'url' | 'presets'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        onChange(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    onChange(urlInput.trim());
    setUrlInput('');
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="font-bold text-slate-700 text-xs block">
          {title}
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
          >
            <X size={12} />
            Quitar imagen
          </button>
        )}
      </div>

      {/* Preview if image is present */}
      {value ? (
        <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center max-h-48">
          <img
            src={value}
            alt="Referencia de ejercicio"
            referrerPolicy="no-referrer"
            className="w-full h-44 object-cover object-center"
            onError={(e) => {
              // fallback if URL fails
              (e.currentTarget as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=800&q=80';
            }}
          />
          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-white text-slate-800 text-xs font-bold rounded-lg shadow-sm hover:bg-slate-100 transition-colors"
            >
              Cambiar imagen
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-rose-700 transition-colors"
            >
              Eliminar
            </button>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
            }}
          />
        </div>
      ) : (
        <div className="space-y-2">
          {/* Tabs: Upload / URL / Presets */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setActiveMode('upload')}
              className={`flex-1 py-1 rounded-md transition-all flex items-center justify-center gap-1 ${
                activeMode === 'upload' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              <Upload size={12} />
              <span>Subir Archivo</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('presets')}
              className={`flex-1 py-1 rounded-md transition-all flex items-center justify-center gap-1 ${
                activeMode === 'presets' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              <Sparkles size={12} />
              <span>Sugerencias</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('url')}
              className={`flex-1 py-1 rounded-md transition-all flex items-center justify-center gap-1 ${
                activeMode === 'url' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              <Link size={12} />
              <span>Enlace Web</span>
            </button>
          </div>

          {/* Mode 1: Drag & drop file upload */}
          {activeMode === 'upload' && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                  : 'border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-slate-50'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
                }}
              />
              <div className="flex flex-col items-center justify-center gap-1 text-slate-500">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-1">
                  <Upload size={16} />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  Haz clic para adjuntar o arrastra la foto del ejercicio
                </p>
                <p className="text-[11px] text-slate-400">
                  Admite JPG, PNG, WEBP (se guarda en la ficha clínica)
                </p>
              </div>
            </div>
          )}

          {/* Mode 2: Preset reference images */}
          {activeMode === 'presets' && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-slate-500 font-medium">
                Selecciona una imagen clínica de referencia de la biblioteca estándar:
              </p>
              <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1">
                {PRESET_EXERCISE_IMAGES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onChange(preset.url)}
                    className="group relative rounded-lg overflow-hidden border border-slate-200 hover:border-blue-500 transition-all text-left"
                    title={preset.name}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-14 object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-slate-900/30 group-hover:bg-transparent transition-colors" />
                    <span className="absolute bottom-0 inset-x-0 bg-slate-900/70 text-white text-[9px] font-semibold px-1 py-0.5 truncate block text-center">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mode 3: Web Image URL */}
          {activeMode === 'url' && (
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://ejemplo.com/ejercicio-foto.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyUrl();
                  }
                }}
                className="flex-1 text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
              >
                <Check size={13} />
                <span>Aplicar</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
