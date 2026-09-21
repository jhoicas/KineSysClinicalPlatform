package services

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"regexp"

	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
	"github.com/kinesys/clinical-platform-backend/internal/core/ports"
)

type dietPlannerService struct{}

func NewDietPlannerService() ports.DietPlannerService {
	return &dietPlannerService{}
}

func roundTo(n float64, decimals int) float64 {
	shift := math.Pow(10, float64(decimals))
	return math.Round(n*shift) / shift
}

func asFiniteNumber(val *string) *float64 {
	if val == nil || *val == "" {
		return nil
	}
	s := strings.TrimSpace(*val)
	s = strings.ReplaceAll(s, "%", "")
	s = strings.ReplaceAll(s, " ", "")
	s = strings.ReplaceAll(s, ",", ".")

	re := regexp.MustCompile(`-?\d+(\.\d+)?`)
	match := re.FindString(s)
	if match == "" {
		return nil
	}

	num, err := strconv.ParseFloat(match, 64)
	if err != nil || math.IsNaN(num) || math.IsInf(num, 0) {
		return nil
	}
	return &num
}

func (s *dietPlannerService) ScaleNutrientPer100g(portionG float64, nutrientPer100g *float64) float64 {
	if portionG <= 0 || math.IsNaN(portionG) || math.IsInf(portionG, 0) {
		return 0
	}
	if nutrientPer100g == nil || math.IsNaN(*nutrientPer100g) || math.IsInf(*nutrientPer100g, 0) {
		return 0
	}
	return (portionG / 100.0) * (*nutrientPer100g)
}

func (s *dietPlannerService) EstimateItemCost(portionG float64, food domain.FoodCatalogNutrients) *float64 {
	if portionG <= 0 || math.IsNaN(portionG) || math.IsInf(portionG, 0) {
		return nil
	}

	unitG := asFiniteNumber(food.PurchaseUnit)
	var price *float64
	if food.PurchasePrice != nil {
		p := *food.PurchasePrice
		if !math.IsNaN(p) && !math.IsInf(p, 0) {
			price = &p
		}
	}

	if unitG == nil || *unitG <= 0 || price == nil || *price < 0 {
		return nil
	}

	cost := (portionG / *unitG) * (*price)
	return &cost
}

func (s *dietPlannerService) CalculateDietPlanTotals(items []domain.DietItemWithFood) (domain.DietPlanTotals, error) {
	if len(items) == 0 {
		return domain.DietPlanTotals{
			TotalKcal:      0,
			TotalProteinG:  0,
			TotalLipidsG:   0,
			TotalCarbsG:    0,
			TotalFiberG:    0,
			TotalCost:      0,
			CostIncomplete: false,
			Items:          []domain.DietItemBreakdown{},
		}, nil
	}

	var breakdown []domain.DietItemBreakdown
	var totalKcal, totalProtein, totalLipids, totalCarbs, totalFiber, totalCost float64
	costIncomplete := false

	for _, item := range items {
		portion := item.PortionG
		if portion <= 0 || math.IsNaN(portion) || math.IsInf(portion, 0) {
			foodID := "?"
			if item.FoodID != nil {
				foodID = *item.FoodID
			} else if item.Food.ID != nil {
				foodID = *item.Food.ID
			}
			return domain.DietPlanTotals{}, fmt.Errorf("invalid portion_g for food_id=%s: %f", foodID, portion)
		}

		food := item.Food

		var carbsSource *float64
		if food.CarbsAvailableG != nil {
			carbsSource = food.CarbsAvailableG
		} else {
			carbsSource = food.CarbsTotalG
		}

		energy := s.ScaleNutrientPer100g(portion, food.EnergyKcal)
		protein := s.ScaleNutrientPer100g(portion, food.ProteinG)
		lipids := s.ScaleNutrientPer100g(portion, food.LipidsG)
		carbs := s.ScaleNutrientPer100g(portion, carbsSource)
		fiber := s.ScaleNutrientPer100g(portion, food.DietaryFiberG)
		cost := s.EstimateItemCost(portion, food)

		if cost == nil {
			costIncomplete = true
		} else {
			totalCost += *cost
		}

		totalKcal += energy
		totalProtein += protein
		totalLipids += lipids
		totalCarbs += carbs
		totalFiber += fiber

		var finalCost *float64
		if cost != nil {
			c := roundTo(*cost, 2)
			finalCost = &c
		}

		foodID := item.FoodID
		if foodID == nil {
			foodID = food.ID
		}

		breakdown = append(breakdown, domain.DietItemBreakdown{
			FoodID:     foodID,
			FoodName:   food.Name,
			PortionG:   roundTo(portion, 2),
			EnergyKcal: roundTo(energy, 2),
			ProteinG:   roundTo(protein, 2),
			LipidsG:    roundTo(lipids, 2),
			CarbsG:     roundTo(carbs, 2),
			FiberG:     roundTo(fiber, 2),
			Cost:       finalCost,
		})
	}

	return domain.DietPlanTotals{
		TotalKcal:      roundTo(totalKcal, 2),
		TotalProteinG:  roundTo(totalProtein, 2),
		TotalLipidsG:   roundTo(totalLipids, 2),
		TotalCarbsG:    roundTo(totalCarbs, 2),
		TotalFiberG:    roundTo(totalFiber, 2),
		TotalCost:      roundTo(totalCost, 2),
		CostIncomplete: costIncomplete,
		Items:          breakdown,
	}, nil
}
