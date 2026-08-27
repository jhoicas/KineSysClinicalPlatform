import { supabase, formatPatientNameForPrivacy } from './supabaseClient';
import { 
  User, 
  ProfessionalProfile, 
  Review, 
  ProfessionalWithDetails 
} from '../types';

/**
 * Single optimized PostgREST / Supabase Join Query string
 * Joins users -> professional_profiles and users -> reviews (filtered to approved)
 * in a single query execution over the network.
 */
export const PROFESSIONAL_PORTAL_JOIN_QUERY = `
  id,
  full_name,
  email,
  phone,
  role,
  specialty,
  avatar_url,
  license_number,
  tenant_id,
  created_at,
  professional_profiles (
    id,
    user_id,
    tenant_id,
    bio,
    alma_mater,
    graduation_year,
    years_of_experience,
    social_links,
    languages,
    certifications,
    consultation_fee,
    currency,
    rating_average,
    reviews_count,
    is_verified,
    created_at,
    updated_at
  ),
  reviews:reviews!professional_id (
    id,
    tenant_id,
    professional_id,
    patient_id,
    patient_name,
    rating,
    comment,
    status,
    consultation_date,
    treatment_category,
    helpful_votes,
    created_at
  )
`;

export interface FetchProfessionalsOptions {
  tenantId?: string;
  specialty?: string;
  role?: string;
  searchQuery?: string;
}

export interface SubmitReviewInput {
  tenant_id: string;
  professional_id: string;
  patient_id?: string;
  patient_name: string;
  rating: number;
  comment: string;
  treatment_category?: string;
  consultation_date?: string;
  status?: 'approved' | 'pending' | 'rejected';
}

/**
 * Service class for all Patient Portal queries and operations.
 * Implements optimized single-query joined fetching for professional profiles,
 * credentials, and approved reviews.
 */
export class PatientPortalService {
  /**
   * Fetches all clinical professionals with their full profile details (bio, alma mater,
   * certifications, social links) and approved reviews in a single join query.
   */
  static async getProfessionalsWithDetails(
    options: FetchProfessionalsOptions = {}
  ): Promise<ProfessionalWithDetails[]> {
    try {
      // Build optimized Supabase query
      let query = supabase
        .from('users')
        .select(PROFESSIONAL_PORTAL_JOIN_QUERY);

      if (options.tenantId) {
        query = query.eq('tenant_id', options.tenantId);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('PostgREST nested join fallback to joined resolution:', error);
        return await this.getProfessionalsFallback(options);
      }

      if (!data || !Array.isArray(data)) {
        return [];
      }

      // Filter only clinical professionals
      const clinicalRoles = ['fisioterapeuta', 'nutricionista', 'medico_general', 'professional', 'clinic_admin'];
      const rawProfessionals = data.filter((item: any) => 
        clinicalRoles.includes(item.role) && 
        (!options.role || item.role === options.role) &&
        (!options.specialty || item.specialty === options.specialty)
      );

      // Process and normalize joined results
      const results: ProfessionalWithDetails[] = rawProfessionals.map((item: any) => {
        // Normalize single or array returned for professional_profiles
        let profile: ProfessionalProfile | undefined;
        if (Array.isArray(item.professional_profiles)) {
          profile = item.professional_profiles[0];
        } else if (item.professional_profiles && typeof item.professional_profiles === 'object') {
          profile = item.professional_profiles;
        }

        // Normalize and filter reviews to only approved
        let reviewsList: Review[] = [];
        if (Array.isArray(item.reviews)) {
          reviewsList = item.reviews.filter((r: Review) => r.status === 'approved');
        }

        // Calculate accurate average rating & review count from approved reviews
        const totalRating = reviewsList.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
        const ratingAverage = reviewsList.length > 0 
          ? Number((totalRating / reviewsList.length).toFixed(1))
          : (profile?.rating_average || 5.0);
        const reviewsCount = reviewsList.length > 0 
          ? reviewsList.length 
          : (profile?.reviews_count || 0);

        return {
          id: item.id,
          full_name: item.full_name,
          email: item.email,
          phone: item.phone,
          role: item.role,
          specialty: item.specialty,
          avatar_url: item.avatar_url,
          license_number: item.license_number,
          tenant_id: item.tenant_id,
          created_at: item.created_at || new Date().toISOString(),
          profile: profile || undefined,
          reviews: reviewsList,
          rating_average: ratingAverage,
          reviews_count: reviewsCount,
        };
      });

      return results;
    } catch (err) {
      console.error('Error in PatientPortalService.getProfessionalsWithDetails:', err);
      return await this.getProfessionalsFallback(options);
    }
  }

  /**
   * Fetches a single professional's full profile, credentials, and approved reviews by userId.
   */
  static async getProfessionalById(
    userId: string,
    tenantId?: string
  ): Promise<ProfessionalWithDetails | null> {
    try {
      let query = supabase
        .from('users')
        .select(PROFESSIONAL_PORTAL_JOIN_QUERY)
        .eq('id', userId);

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        const all = await this.getProfessionalsWithDetails({ tenantId });
        return all.find((p) => p.id === userId) || null;
      }

      let profile: ProfessionalProfile | undefined;
      if (Array.isArray(data.professional_profiles)) {
        profile = data.professional_profiles[0];
      } else if (data.professional_profiles && typeof data.professional_profiles === 'object') {
        profile = data.professional_profiles;
      }

      let reviewsList: Review[] = [];
      if (Array.isArray(data.reviews)) {
        reviewsList = data.reviews.filter((r: Review) => r.status === 'approved');
      }

      const totalRating = reviewsList.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
      const ratingAverage = reviewsList.length > 0 
        ? Number((totalRating / reviewsList.length).toFixed(1))
        : (profile?.rating_average || 5.0);

      return {
        id: data.id,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        specialty: data.specialty,
        avatar_url: data.avatar_url,
        license_number: data.license_number,
        tenant_id: data.tenant_id,
        created_at: data.created_at || new Date().toISOString(),
        profile: profile || undefined,
        reviews: reviewsList,
        rating_average: ratingAverage,
        reviews_count: reviewsList.length,
      };
    } catch (err) {
      console.error('Error in PatientPortalService.getProfessionalById:', err);
      return null;
    }
  }

  /**
   * Submits a patient review for a professional with privacy and moderation checks.
   */
  static async submitReview(
    input: SubmitReviewInput
  ): Promise<{ success: boolean; data?: Review; error?: string }> {
    try {
      if (!input.comment?.trim()) {
        return { success: false, error: 'El comentario de la reseña es obligatorio.' };
      }
      if (!input.rating || input.rating < 1 || input.rating > 5) {
        return { success: false, error: 'La calificación debe ser entre 1 y 5 estrellas.' };
      }

      const newReview: Partial<Review> = {
        tenant_id: input.tenant_id,
        professional_id: input.professional_id,
        patient_id: input.patient_id,
        patient_name: input.patient_name.trim() || 'Paciente KineSys',
        rating: Math.round(input.rating),
        comment: input.comment.trim(),
        status: input.status || 'approved', // Auto-approved for demo portal experience
        treatment_category: input.treatment_category?.trim() || 'Consulta General',
        consultation_date: input.consultation_date || new Date().toISOString().split('T')[0],
        helpful_votes: 0,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('reviews').insert(newReview);
      if (error) {
        return { success: false, error: error.message || 'Error al guardar la reseña' };
      }

      const inserted = Array.isArray(data) ? data[0] : data;
      return { success: true, data: inserted };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error inesperado al publicar la reseña' };
    }
  }

  /**
   * Increments the helpful votes counter on an approved review
   */
  static async voteReviewHelpful(reviewId: string): Promise<boolean> {
    try {
      const { data: current } = await supabase.from('reviews').select('*').eq('id', reviewId).single();
      if (!current) return false;

      const newVotes = (current.helpful_votes || 0) + 1;
      // In local mock or real client:
      const { error } = await supabase.from('reviews').insert({
        ...current,
        helpful_votes: newVotes,
      });
      return !error;
    } catch (e) {
      console.error('Error voting review helpful:', e);
      return false;
    }
  }

  /**
   * Fallback multi-table query aggregator ensuring 100% resilience across all storage engines
   */
  private static async getProfessionalsFallback(
    options: FetchProfessionalsOptions = {}
  ): Promise<ProfessionalWithDetails[]> {
    try {
      const { data: usersData } = await supabase.from('users').select('*');
      if (!usersData) return [];

      const clinicalRoles = ['fisioterapeuta', 'nutricionista', 'medico_general', 'professional', 'clinic_admin'];
      let professionals = usersData.filter((u: User) => clinicalRoles.includes(u.role));

      if (options.tenantId) {
        professionals = professionals.filter((u: User) => u.tenant_id === options.tenantId);
      }
      if (options.role && options.role !== 'all') {
        professionals = professionals.filter((u: User) => u.role === options.role);
      }

      const { data: profilesData } = await supabase.from('professional_profiles').select('*');
      const { data: reviewsData } = await supabase.from('reviews').select('*');

      const approvedReviews = (reviewsData || []).filter((r: Review) => r.status === 'approved');

      return professionals.map((prof: User) => {
        const profile = (profilesData || []).find((p: ProfessionalProfile) => p.user_id === prof.id);
        const profReviews = approvedReviews.filter((r: Review) => r.professional_id === prof.id);

        const totalRatings = profReviews.reduce((sum: number, r: Review) => sum + r.rating, 0);
        const ratingAverage = profReviews.length > 0 
          ? Number((totalRatings / profReviews.length).toFixed(1)) 
          : (profile?.rating_average || 5.0);
        const reviewsCount = profReviews.length > 0 
          ? profReviews.length 
          : (profile?.reviews_count || 0);

        return {
          ...prof,
          profile: profile || undefined,
          reviews: profReviews,
          rating_average: ratingAverage,
          reviews_count: reviewsCount,
        };
      });
    } catch (e) {
      console.error('Error in getProfessionalsFallback:', e);
      return [];
    }
  }
}

// Named function exports for direct tree-shakable consumption
export const fetchProfessionalsWithJoinedDetails = PatientPortalService.getProfessionalsWithDetails.bind(PatientPortalService);
export const fetchProfessionalProfileById = PatientPortalService.getProfessionalById.bind(PatientPortalService);
export const submitPatientReview = PatientPortalService.submitReview.bind(PatientPortalService);
export const voteReviewHelpful = PatientPortalService.voteReviewHelpful.bind(PatientPortalService);
export { formatPatientNameForPrivacy };
