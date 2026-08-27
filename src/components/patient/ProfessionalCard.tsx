import React from 'react';
import { 
  Star, 
  GraduationCap, 
  ShieldCheck, 
  Info, 
  CalendarPlus, 
  Instagram, 
  Linkedin, 
  Globe, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { ProfessionalWithDetails } from '../../types';

interface ProfessionalCardProps {
  professional: ProfessionalWithDetails;
  isSelected: boolean;
  onSelect: (profId: string) => void;
  onOpenDetails: (prof: ProfessionalWithDetails) => void;
}

export const ProfessionalCard: React.FC<ProfessionalCardProps> = ({
  professional,
  isSelected,
  onSelect,
  onOpenDetails,
}) => {
  const profile = professional.profile;
  const approvedReviews = (professional.reviews || []).filter((r) => r.status === 'approved');
  const totalReviews = approvedReviews.length || professional.reviews_count || 0;
  const ratingAverage = approvedReviews.length > 0
    ? Number((approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length).toFixed(1))
    : (professional.rating_average || 5.0);

  const socialLinks = profile?.social_links || {};

  return (
    <div
      id={`card-prof-${professional.id}`}
      className={`relative rounded-3xl p-5 border transition-all duration-200 flex flex-col justify-between space-y-4 ${
        isSelected
          ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/60 shadow-xs'
      }`}
    >
      {/* Top Section: Avatar, Name, Rating */}
      <div className="space-y-3">
        <div className="flex items-start gap-3.5">
          <div className="relative shrink-0">
            <img
              src={professional.avatar_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200'}
              alt={professional.full_name}
              className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-100 dark:ring-slate-800 shadow-xs bg-slate-100 dark:bg-slate-800"
            />
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full ring-2 ring-white dark:ring-slate-900" title="Verificado">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-1">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                {professional.full_name}
              </h3>
              {isSelected && (
                <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Seleccionado
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-2 py-0.5 rounded-md capitalize">
                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                {professional.specialty || professional.role.replace('_', ' ')}
              </span>
            </div>

            {/* Stars & Reviews */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <div className="flex items-center text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-3.5 h-3.5 ${
                      s <= Math.round(ratingAverage)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300 dark:text-slate-700'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-black text-slate-900 dark:text-white">{ratingAverage}</span>
              <button
                type="button"
                onClick={() => onOpenDetails(professional)}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
              >
                ({totalReviews} reseñas)
              </button>
            </div>
          </div>
        </div>

        {/* Bio Snippet */}
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {profile?.bio || 'Especialista en atención clínica personalizada y rehabilitación integral.'}
        </p>

        {/* Education & Experience info tag */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 truncate max-w-[200px]" title={profile?.alma_mater}>
            <GraduationCap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">{profile?.alma_mater || 'Universidad de Ciencias de la Salud'}</span>
          </div>

          {profile?.years_of_experience && (
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {profile.years_of_experience}+ años exp.
            </span>
          )}
        </div>
      </div>

      {/* Bottom Action Bar: Social Media & Action Buttons */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
        {/* Social media icons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {socialLinks.instagram && (
              <a
                href={socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Instagram de ${professional.full_name}`}
                className="p-1.5 rounded-lg text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-950/40 transition-colors"
                title="Instagram"
                onClick={(e) => e.stopPropagation()}
              >
                <Instagram className="w-3.5 h-3.5" />
              </a>
            )}
            {socialLinks.linkedin && (
              <a
                href={socialLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`LinkedIn de ${professional.full_name}`}
                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                title="LinkedIn"
                onClick={(e) => e.stopPropagation()}
              >
                <Linkedin className="w-3.5 h-3.5" />
              </a>
            )}
            {(socialLinks.x || socialLinks.twitter) && (
              <a
                href={socialLinks.x || socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Twitter/X de ${professional.full_name}`}
                className="p-1.5 rounded-lg text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Twitter / X"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="font-bold text-xs">𝕏</span>
              </a>
            )}
            {socialLinks.website && (
              <a
                href={socialLinks.website}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Sitio web de ${professional.full_name}`}
                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                title="Sitio Web"
                onClick={(e) => e.stopPropagation()}
              >
                <Globe className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <button
            type="button"
            onClick={() => onOpenDetails(professional)}
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Ver Hoja de Vida</span>
          </button>
        </div>

        {/* Select for Booking button */}
        <button
          id={`btn-select-prof-${professional.id}`}
          type="button"
          onClick={() => onSelect(professional.id)}
          className={`w-full py-2.5 px-3 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            isSelected
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300'
          }`}
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          <span>{isSelected ? '✓ Profesional Seleccionado' : 'Seleccionar para Consulta'}</span>
        </button>
      </div>
    </div>
  );
};
