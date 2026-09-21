package services

import (
	"fmt"
	"math"

	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
)

func roundToDecimals(val float64, places int) float64 {
	shift := math.Pow(10, float64(places))
	return math.Round(val*shift) / shift
}

func bodyFatFromDensitySiri(bodyDensity float64) (float64, error) {
	if bodyDensity <= 0 {
		return 0, fmt.Errorf("bodyDensity must be positive (received: %v)", bodyDensity)
	}
	return roundToDecimals((495/bodyDensity)-450, 2), nil
}

func withMassBreakdown(bodyFatPct float64, weightKg *float64, bodyDensity *float64, formula string) domain.BodyCompositionResult {
	var fatMassKg, fatFreeMassKg *float64

	if weightKg != nil && *weightKg > 0 {
		fm := roundToDecimals((bodyFatPct/100.0)*(*weightKg), 2)
		fatMassKg = &fm
		ffm := roundToDecimals((*weightKg)-fm, 2)
		fatFreeMassKg = &ffm
	}

	var bd *float64
	if bodyDensity != nil {
		roundedBd := roundToDecimals(*bodyDensity, 5)
		bd = &roundedBd
	}

	return domain.BodyCompositionResult{
		BodyDensity:   bd,
		BodyFatPct:    roundToDecimals(bodyFatPct, 2),
		FatMassKg:     fatMassKg,
		FatFreeMassKg: fatFreeMassKg,
		Formula:       formula,
	}
}

func (s *anthropometryService) CalculateJacksonPollock7(sex domain.BiologicalSex, age int, folds domain.JacksonPollock7Skinfolds, weightKg *float64) (domain.BodyCompositionResult, error) {
	if age < 0 {
		return domain.BodyCompositionResult{}, fmt.Errorf("age must be non-negative")
	}

	sum := folds.Chest + folds.Midaxillary + folds.Triceps + folds.Subscapular + folds.Abdomen + folds.Suprailiac + folds.Thigh
	if sum <= 0 {
		return domain.BodyCompositionResult{}, fmt.Errorf("sum of skinfolds must be positive")
	}

	sumSq := sum * sum
	var bd float64

	if sex == domain.SexMale {
		bd = 1.112 - (0.00043499 * sum) + (0.00000055 * sumSq) - (0.00028826 * float64(age))
	} else {
		bd = 1.097 - (0.00046971 * sum) + (0.00000056 * sumSq) - (0.00012828 * float64(age))
	}

	bf, err := bodyFatFromDensitySiri(bd)
	if err != nil {
		return domain.BodyCompositionResult{}, err
	}

	formula := fmt.Sprintf("Jackson-Pollock 7 pliegues (%s), Σ=%.1f mm, edad=%d", sex, roundToDecimals(sum, 1), age)
	return withMassBreakdown(bf, weightKg, &bd, formula), nil
}

func (s *anthropometryService) CalculateJacksonPollock3Male(age int, folds domain.JacksonPollock3SkinfoldsMale, weightKg *float64) (domain.BodyCompositionResult, error) {
	if age < 0 {
		return domain.BodyCompositionResult{}, fmt.Errorf("age must be non-negative")
	}

	sum := folds.Chest + folds.Abdomen + folds.Thigh
	if sum <= 0 {
		return domain.BodyCompositionResult{}, fmt.Errorf("sum of skinfolds must be positive")
	}

	sumSq := sum * sum
	bd := 1.10938 - (0.0008267 * sum) + (0.0000016 * sumSq) - (0.0002574 * float64(age))

	bf, err := bodyFatFromDensitySiri(bd)
	if err != nil {
		return domain.BodyCompositionResult{}, err
	}

	formula := fmt.Sprintf("Jackson-Pollock 3 pliegues (male), Σ=%.1f mm, edad=%d", roundToDecimals(sum, 1), age)
	return withMassBreakdown(bf, weightKg, &bd, formula), nil
}

func (s *anthropometryService) CalculateJacksonPollock3Female(age int, folds domain.JacksonPollock3SkinfoldsFemale, weightKg *float64) (domain.BodyCompositionResult, error) {
	if age < 0 {
		return domain.BodyCompositionResult{}, fmt.Errorf("age must be non-negative")
	}

	sum := folds.Triceps + folds.Suprailiac + folds.Thigh
	if sum <= 0 {
		return domain.BodyCompositionResult{}, fmt.Errorf("sum of skinfolds must be positive")
	}

	sumSq := sum * sum
	bd := 1.0994921 - (0.0009929 * sum) + (0.0000023 * sumSq) - (0.0001392 * float64(age))

	bf, err := bodyFatFromDensitySiri(bd)
	if err != nil {
		return domain.BodyCompositionResult{}, err
	}

	formula := fmt.Sprintf("Jackson-Pollock 3 pliegues (female), Σ=%.1f mm, edad=%d", roundToDecimals(sum, 1), age)
	return withMassBreakdown(bf, weightKg, &bd, formula), nil
}

func (s *anthropometryService) CalculateFaulkner4(folds domain.Faulkner4Skinfolds, weightKg *float64) (domain.BodyCompositionResult, error) {
	sum := folds.Triceps + folds.Subscapular + folds.Suprailiac + folds.Abdomen
	if sum <= 0 {
		return domain.BodyCompositionResult{}, fmt.Errorf("sum of skinfolds must be positive")
	}

	bf := (sum * 0.153) + 5.783
	formula := fmt.Sprintf("Faulkner 4 pliegues, Σ=%.1f mm", roundToDecimals(sum, 1))

	return withMassBreakdown(bf, weightKg, nil, formula), nil
}

func (s *anthropometryService) CalculateHeathCarterSomatotype(inputs domain.HeathCarterInputs) (domain.SomatotypeResult, error) {
	if inputs.HeightCm <= 0 || inputs.WeightKg <= 0 {
		return domain.SomatotypeResult{}, fmt.Errorf("height and weight must be positive")
	}

	// Endomorphy
	sum3 := inputs.TricepsMm + inputs.SubscapularMm + inputs.SuprailiacMm
	x := sum3 * (170.18 / inputs.HeightCm)
	endomorphy := -0.7182 + (0.1451 * x) - (0.00068 * x * x) + (0.0000014 * x * x * x)
	if endomorphy < 0.1 {
		endomorphy = 0.1
	}

	// Mesomorphy
	correctedArm := inputs.FlexedArmCm - (inputs.TricepsMm / 10)
	correctedCalf := inputs.CalfCm - (inputs.MedialCalfMm / 10)
	mesomorphy := (0.858 * inputs.HumerusBreadthCm) + (0.601 * inputs.FemurBreadthCm) + (0.188 * correctedArm) + (0.161 * correctedCalf) - (0.131 * inputs.HeightCm) + 4.5
	if mesomorphy < 0.1 {
		mesomorphy = 0.1
	}

	// Ectomorphy
	hwr := inputs.HeightCm / math.Cbrt(inputs.WeightKg)
	var ectomorphy float64
	if hwr >= 40.75 {
		ectomorphy = (0.732 * hwr) - 28.58
	} else if hwr > 38.25 {
		ectomorphy = (0.463 * hwr) - 17.63
	} else {
		ectomorphy = 0.1
	}
	if ectomorphy < 0.1 {
		ectomorphy = 0.1
	}

	return domain.SomatotypeResult{
		Endomorphy: roundToDecimals(endomorphy, 1),
		Mesomorphy: roundToDecimals(mesomorphy, 1),
		Ectomorphy: roundToDecimals(ectomorphy, 1),
		Label:      classifySomatotype(endomorphy, mesomorphy, ectomorphy),
	}, nil
}

func classifySomatotype(endo, meso, ecto float64) string {
	type somatoVal struct {
		name string
		val  float64
	}
	ranked := []somatoVal{
		{"endo", endo},
		{"meso", meso},
		{"ecto", ecto},
	}
	// Sort descending
	for i := 0; i < len(ranked)-1; i++ {
		for j := i + 1; j < len(ranked); j++ {
			if ranked[j].val > ranked[i].val {
				ranked[i], ranked[j] = ranked[j], ranked[i]
			}
		}
	}

	first := ranked[0]
	second := ranked[1]

	if math.Abs(first.val-second.val) < 0.5 {
		return fmt.Sprintf("%s-%smorfo (equilibrado)", first.name, second.name)
	}

	nameMap := map[string]string{
		"endo": "endomorfo",
		"meso": "mesomorfo",
		"ecto": "ectomorfo",
	}

	return fmt.Sprintf("%s (secundario %s)", nameMap[first.name], nameMap[second.name])
}

func (s *anthropometryService) CalculateMifflinStJeor(inputs domain.BmrInputs) (domain.BmrResult, error) {
	if inputs.WeightKg <= 0 || inputs.HeightCm <= 0 {
		return domain.BmrResult{}, fmt.Errorf("weight and height must be positive")
	}
	if inputs.AgeYears < 0 {
		return domain.BmrResult{}, fmt.Errorf("age must be non-negative")
	}

	base := (10 * inputs.WeightKg) + (6.25 * inputs.HeightCm) - (5 * float64(inputs.AgeYears))
	var bmr float64
	var formula string

	if inputs.Sex == domain.SexMale {
		bmr = base + 5
		formula = fmt.Sprintf("Mifflin-St Jeor ♂: 10×%.1f+6.25×%.1f−5×%d+5", inputs.WeightKg, inputs.HeightCm, inputs.AgeYears)
	} else {
		bmr = base - 161
		formula = fmt.Sprintf("Mifflin-St Jeor ♀: 10×%.1f+6.25×%.1f−5×%d−161", inputs.WeightKg, inputs.HeightCm, inputs.AgeYears)
	}

	return domain.BmrResult{
		BmrKcal: roundToDecimals(bmr, 0),
		Formula: formula,
	}, nil
}

func (s *anthropometryService) CalculateHarrisBenedict(inputs domain.BmrInputs) (domain.BmrResult, error) {
	if inputs.WeightKg <= 0 || inputs.HeightCm <= 0 {
		return domain.BmrResult{}, fmt.Errorf("weight and height must be positive")
	}
	if inputs.AgeYears < 0 {
		return domain.BmrResult{}, fmt.Errorf("age must be non-negative")
	}

	var bmr float64
	var formula string

	if inputs.Sex == domain.SexMale {
		bmr = 88.362 + (13.397 * inputs.WeightKg) + (4.799 * inputs.HeightCm) - (5.677 * float64(inputs.AgeYears))
		formula = fmt.Sprintf("Harris-Benedict 1984 ♂: 88.362+13.397×%.1f+4.799×%.1f−5.677×%d", inputs.WeightKg, inputs.HeightCm, inputs.AgeYears)
	} else {
		bmr = 447.593 + (9.247 * inputs.WeightKg) + (3.098 * inputs.HeightCm) - (4.330 * float64(inputs.AgeYears))
		formula = fmt.Sprintf("Harris-Benedict 1984 ♀: 447.593+9.247×%.1f+3.098×%.1f−4.330×%d", inputs.WeightKg, inputs.HeightCm, inputs.AgeYears)
	}

	return domain.BmrResult{
		BmrKcal: roundToDecimals(bmr, 0),
		Formula: formula,
	}, nil
}

func (s *anthropometryService) CalculateTDEE(bmr float64, activityFactor float64) (float64, error) {
	if bmr <= 0 {
		return 0, fmt.Errorf("BMR must be positive")
	}
	if activityFactor <= 0 {
		return 0, fmt.Errorf("activity factor must be positive")
	}
	return roundToDecimals(bmr*activityFactor, 0), nil
}
