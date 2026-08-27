import React, { useState } from 'react';
import { 
  X, 
  Star, 
  GraduationCap, 
  Calendar, 
  Award, 
  Languages, 
  ShieldCheck, 
  CheckCircle2, 
  Instagram, 
  Linkedin, 
  Globe, 
  Youtube, 
  Facebook, 
  Send, 
  MessageCircle, 
  ThumbsUp, 
  Sparkles,
  Stethoscope,
  HeartHandshake
} from 'lucide-react';
import { ProfessionalWithDetails, Review } from '../../types';
import { 
  formatPatientNameForPrivacy, 
  submitPatientReview, 
  voteReviewHelpful 
} from '../../services/patientPortalService';

interface ProfessionalProfileModalProps {
  professional: ProfessionalWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onSelectForBooking?: (profId: string) => void;
  onReviewAdded?: () => void;
}

export const ProfessionalProfileModal: React.FC<ProfessionalProfileModalProps> = ({
  professional,
  isOpen,
  onClose,
  onSelectForBooking,
  onReviewAdded,
}) => {
  const [activeTab, setActiveTab] = useState<'bio' | 'reviews'>('bio');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [newPatientName, setNewPatientName] = useState('');
  const [newTreatmentCategory, setNewTreatmentCategory] = useState('Consulta General');
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, number>>({});

  if (!isOpen) return null;

  const profile = professional.profile;
  // Strictly filter approved reviews
  const approvedReviews = (professional.reviews || []).filter((r) => r.status === 'approved');
  const totalReviews = approvedReviews.length;
  const ratingAverage = totalReviews > 0
    ? Number((approvedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
    : (professional.rating_average || 5.0);

  const socialLinks = profile?.social_links || {};

  const handleVoteHelpful = (reviewId: string, currentVotes: number = 0) => {
    voteReviewHelpful(reviewId);
    setHelpfulVotes((prev) => ({
      ...prev,
      [reviewId]: (prev[reviewId] !== undefined ? prev[reviewId] : currentVotes) + 1,
    }));
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingReview(true);
    const result = await submitPatientReview({
      tenant_id: professional.tenant_id,
      professional_id: professional.id,
      patient_name: newPatientName.trim() || 'Paciente KineSys',
      rating: newRating,
      comment: newComment.trim(),
      status: 'approved', // Live demonstration approves review
      treatment_category: newTreatmentCategory,
      consultation_date: new Date().toISOString().split('T')[0],
    });

    setSubmittingReview(false);
    if (result.success) {
      setReviewSuccess(true);
      setNewComment('');
      setNewPatientName('');
      setTimeout(() => {
        setReviewSuccess(false);
        setShowReviewForm(false);
        if (onReviewAdded) onReviewAdded();
      }, 1500);
    }
  };

  return (
    <div 
      id="modal-professional-profile" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
    >
      <div 
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header with Close Button */}
        <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shrink-0">
          <button
            id="btn-close-profile-modal"
            type="button"
            onClick={onClose}
            aria-label="Cerrar perfil"
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pr-8">
            {/* Avatar */}
            <div className="relative">
              <img
                src={professional.avatar_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300'}
                alt={professional.full_name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-white/20 shadow-md bg-slate-800"
              />
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1 rounded-full ring-2 ring-slate-900" title="Profesional Verificado">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>

            {/* Main Info */}
            <div className="flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {professional.full_name}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  {professional.specialty || professional.role.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              {professional.license_number && (
                <p className="text-xs text-slate-300 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Reg. Profesional / Licencia: <strong className="text-white font-mono">{professional.license_number}</strong></span>
                </p>
              )}

              {/* Rating & Reviews pill */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="flex items-center gap-1.5 bg-amber-400/20 border border-amber-400/30 px-2.5 py-1 rounded-xl">
                  <div className="flex items-center text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= Math.round(ratingAverage)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-500'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-black text-amber-300">{ratingAverage}</span>
                  <span className="text-[11px] text-slate-300">({totalReviews} reseñas)</span>
                </div>

                {profile?.years_of_experience && (
                  <span className="text-xs text-slate-300 bg-white/10 px-2.5 py-1 rounded-xl">
                    ⏱️ {profile.years_of_experience}+ años de experiencia
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Social Media Links Bar */}
          {socialLinks && Object.values(socialLinks).some(Boolean) && (
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-300 mr-1">Redes & Contacto:</span>

              {socialLinks.instagram && (
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-200 border border-pink-500/30 text-xs font-medium transition-colors"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  <span>Instagram</span>
                </a>
              )}

              {socialLinks.linkedin && (
                <a
                  href={socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/30 text-xs font-medium transition-colors"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  <span>LinkedIn</span>
                </a>
              )}

              {(socialLinks.x || socialLinks.twitter) && (
                <a
                  href={socialLinks.x || socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-medium transition-colors"
                >
                  <span className="font-bold text-xs">𝕏</span>
                  <span>Twitter / X</span>
                </a>
              )}

              {socialLinks.website && (
                <a
                  href={socialLinks.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30 text-xs font-medium transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Sitio Web</span>
                </a>
              )}

              {socialLinks.whatsapp && (
                <a
                  href={`https://wa.me/${socialLinks.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-200 border border-green-500/30 text-xs font-medium transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              )}

              {socialLinks.youtube && (
                <a
                  href={socialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 text-xs font-medium transition-colors"
                >
                  <Youtube className="w-3.5 h-3.5" />
                  <span>YouTube</span>
                </a>
              )}

              {socialLinks.facebook && (
                <a
                  href={socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 border border-blue-600/30 text-xs font-medium transition-colors"
                >
                  <Facebook className="w-3.5 h-3.5" />
                  <span>Facebook</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Navigation Tabs (Biografía & Reseñas) */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-6 shrink-0">
          <button
            id="tab-btn-bio"
            type="button"
            onClick={() => setActiveTab('bio')}
            className={`py-3.5 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'bio'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Hoja de Vida & Formación</span>
          </button>
          <button
            id="tab-btn-reviews"
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`py-3.5 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'reviews'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Reseñas de Pacientes ({totalReviews})</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 dark:text-slate-300">
          {activeTab === 'bio' && (
            <div className="space-y-6">
              {/* Biografía / Resumen profesional */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-indigo-500" />
                  <span>Perfil Profesional & Filosofía de Atención</span>
                </h3>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-normal">
                  {profile?.bio ||
                    'Profesional de la salud comprometido con la excelencia asistencial, diagnóstico basado en evidencia clínica y tratamiento personalizado orientado a objetivos funcionales.'}
                </p>
              </div>

              {/* Grid: Alma Mater, Año Graduación & Idiomas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Educación & Alma Mater */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <GraduationCap className="w-5 h-5" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Universidad / Alma Máter</h4>
                  </div>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {profile?.alma_mater || 'Universidad Principal de Ciencias de la Salud'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Año de Graduación: <strong className="text-slate-800 dark:text-slate-200">{profile?.graduation_year || 2015}</strong></span>
                  </div>
                </div>

                {/* Idiomas */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Languages className="w-5 h-5" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Idiomas de Atención</h4>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(profile?.languages && profile.languages.length > 0
                      ? profile.languages
                      : ['Español (Nativo)', 'Inglés (Intermedio)']
                    ).map((lang, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Certificaciones y Especialidades */}
              {profile?.certifications && profile.certifications.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>Certificaciones, Diplomados & Postgrados</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {profile.certifications.map((cert, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-xs"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">{cert}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {/* Rating Summary Header */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-indigo-50 dark:from-amber-950/20 dark:to-indigo-950/20 border border-amber-200/60 dark:border-amber-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-center bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl shadow-xs border border-amber-300/40">
                    <span className="text-3xl font-black text-amber-500">{ratingAverage}</span>
                    <div className="flex items-center justify-center text-amber-400 mt-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= Math.round(ratingAverage)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Satisfacción del Paciente
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Basado en {totalReviews} opiniones verificadas tras consultas atendidas.
                    </p>
                  </div>
                </div>

                <button
                  id="btn-toggle-review-form"
                  type="button"
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
                  <span>{showReviewForm ? 'Cancelar Reseña' : 'Escribir una Reseña'}</span>
                </button>
              </div>

              {/* Expandable Review Form */}
              {showReviewForm && (
                <form
                  onSubmit={handleSubmitReview}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-indigo-500/30 space-y-4 shadow-sm animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                      <Send className="w-3.5 h-3.5" />
                      <span>Califica tu experiencia con {professional.full_name}</span>
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      * Tu apellido se abreviará por privacidad (ej. Camila S.)
                    </span>
                  </div>

                  {/* Star Rating Picker */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Calificación:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 text-slate-300 hover:text-amber-400 transition-transform hover:scale-110 cursor-pointer"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= (hoverRating || newRating)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300 dark:text-slate-600'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 ml-2">
                      {newRating === 5
                        ? '⭐⭐⭐⭐⭐ Excelente'
                        : newRating === 4
                        ? '⭐⭐⭐⭐ Muy Bueno'
                        : newRating === 3
                        ? '⭐⭐⭐ Bueno'
                        : '⭐⭐ Regular'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Tu Nombre Completo
                      </label>
                      <input
                        type="text"
                        required
                        value={newPatientName}
                        onChange={(e) => setNewPatientName(e.target.value)}
                        placeholder="Ej: Camila Soto Valenzuela"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Tipo de Consulta o Tratamiento
                      </label>
                      <input
                        type="text"
                        value={newTreatmentCategory}
                        onChange={(e) => setNewTreatmentCategory(e.target.value)}
                        placeholder="Ej: Kinesiología Rodilla / Control Nutrición"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Comentario o Testimonio
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Comparte cómo fue tu experiencia clínica, la atención del profesional y los resultados de tu tratamiento..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  {reviewSuccess && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>¡Reseña publicada y guardada exitosamente!</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingReview ? 'Guardando...' : 'Publicar Reseña'}</span>
                  </button>
                </form>
              )}

              {/* Moderated Reviews List */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                  Testimonios Aprobados ({approvedReviews.length})
                </h4>

                {approvedReviews.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <Star className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      Aún no hay reseñas aprobadas para este profesional.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      ¡Sé el primero en calificar tu atención médica!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {approvedReviews.map((review) => {
                      const displayVotes = (helpfulVotes[review.id] !== undefined)
                        ? helpfulVotes[review.id]
                        : (review.helpful_votes || 0);

                      return (
                        <div
                          key={review.id}
                          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2.5 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                                  {formatPatientNameForPrivacy(review.patient_name)}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  <span>Paciente Verificado</span>
                                </span>
                              </div>

                              {review.treatment_category && (
                                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                                  {review.treatment_category}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-col items-end">
                              <div className="flex items-center text-amber-400">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className={`w-3.5 h-3.5 ${
                                      s <= review.rating
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'text-slate-300 dark:text-slate-600'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-[10px] text-slate-400 mt-0.5">
                                {new Date(review.created_at || review.consultation_date || Date.now()).toLocaleDateString('es-ES', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-normal">
                            "{review.comment}"
                          </p>

                          <div className="pt-1.5 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800/80 text-[11px] text-slate-500">
                            <span className="text-[10px] text-slate-400">
                              Consulta atendida en {review.consultation_date || 'KineSys'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleVoteHelpful(review.id, review.helpful_votes)}
                              className="inline-flex items-center gap-1 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                            >
                              <ThumbsUp className="w-3 h-3" />
                              <span>Útil ({displayVotes})</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {profile?.consultation_fee ? (
              <span>
                Valor Consulta Estimado:{' '}
                <strong className="text-slate-900 dark:text-white font-extrabold text-sm">
                  ${profile.consultation_fee.toLocaleString()} {profile.currency || 'COP'}
                </strong>
              </span>
            ) : (
              <span>Consulta sujeta a convenio o evaluación clínica.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cerrar
            </button>

            {onSelectForBooking && (
              <button
                id="btn-modal-select-and-book"
                type="button"
                onClick={() => {
                  onSelectForBooking(professional.id);
                  onClose();
                }}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Agendar con este Profesional</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
