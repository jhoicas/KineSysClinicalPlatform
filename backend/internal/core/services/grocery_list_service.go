package services

import (
	"fmt"
	"math"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
	"github.com/kinesys/clinical-platform-backend/internal/core/ports"
)

type groceryListService struct{}

func NewGroceryListService() ports.GroceryListService {
	return &groceryListService{}
}

func (s *groceryListService) ParsePurchaseUnitGrams(raw *string) *float64 {
	if raw == nil || *raw == "" {
		return nil
	}

	str := strings.TrimSpace(*raw)
	str = strings.ReplaceAll(str, ",", ".")

	re := regexp.MustCompile(`-?\d+(\.\d+)?`)
	match := re.FindString(str)
	if match == "" {
		return nil
	}

	val, err := strconv.ParseFloat(match, 64)
	if err != nil || math.IsNaN(val) || math.IsInf(val, 0) || val <= 0 {
		return nil
	}

	return &val
}

func parsePrice(raw *float64) *float64 {
	if raw == nil {
		return nil
	}
	if math.IsNaN(*raw) || math.IsInf(*raw, 0) || *raw < 0 {
		return nil
	}
	val := *raw
	return &val
}

type foodAggregation struct {
	Name          string
	Category      *string
	DailyPortionG float64
	PurchaseUnit  *string
	PurchasePrice *float64
}

func (s *groceryListService) GenerateSmartGroceryList(planItems []domain.GroceryPlanItem, days int) (domain.SmartGroceryList, error) {
	if days < 1 {
		return domain.SmartGroceryList{}, fmt.Errorf("days debe ser un entero >= 1")
	}

	byFood := make(map[string]*foodAggregation)

	for _, item := range planItems {
		if item.FoodID == "" {
			continue
		}
		portion := item.PortionG
		if math.IsNaN(portion) || math.IsInf(portion, 0) || portion <= 0 {
			continue
		}

		agg, exists := byFood[item.FoodID]
		if !exists {
			name := item.FoodID
			if item.Name != nil && strings.TrimSpace(*item.Name) != "" {
				name = strings.TrimSpace(*item.Name)
			}
			var category *string
			if item.Category != nil && strings.TrimSpace(*item.Category) != "" {
				c := strings.TrimSpace(*item.Category)
				category = &c
			}

			byFood[item.FoodID] = &foodAggregation{
				Name:          name,
				Category:      category,
				DailyPortionG: portion,
				PurchaseUnit:  item.PurchaseUnit,
				PurchasePrice: item.PurchasePrice,
			}
		} else {
			agg.DailyPortionG += portion
			if agg.Name == item.FoodID && item.Name != nil && strings.TrimSpace(*item.Name) != "" {
				agg.Name = strings.TrimSpace(*item.Name)
			}
			if agg.Category == nil && item.Category != nil && strings.TrimSpace(*item.Category) != "" {
				c := strings.TrimSpace(*item.Category)
				agg.Category = &c
			}
			if agg.PurchaseUnit == nil && item.PurchaseUnit != nil {
				agg.PurchaseUnit = item.PurchaseUnit
			}
			if agg.PurchasePrice == nil && item.PurchasePrice != nil {
				agg.PurchasePrice = item.PurchasePrice
			}
		}
	}

	var lines []domain.GroceryListLine
	var grandTotal float64
	var withPrice, missingPrice int

	for foodID, agg := range byFood {
		totalGrams := roundTo(agg.DailyPortionG*float64(days), 1)
		unitG := s.ParsePurchaseUnitGrams(agg.PurchaseUnit)
		price := parsePrice(agg.PurchasePrice)

		var unitsToBuy *int
		var lineCost *float64
		var purchaseGramsRounded *float64

		if unitG != nil && price != nil {
			u := int(math.Max(1, math.Ceil(totalGrams/(*unitG))))
			unitsToBuy = &u
			
			pGrams := roundTo(float64(u)*(*unitG), 1)
			purchaseGramsRounded = &pGrams
			
			lCost := roundTo(float64(u)*(*price), 2)
			lineCost = &lCost
			
			grandTotal += lCost
			withPrice++
		} else if unitG != nil && price == nil {
			u := int(math.Max(1, math.Ceil(totalGrams/(*unitG))))
			unitsToBuy = &u
			
			pGrams := roundTo(float64(u)*(*unitG), 1)
			purchaseGramsRounded = &pGrams
			
			missingPrice++
		} else if price != nil && unitG == nil {
			// Fallback clinico: prorrateo asumiendo precio por 100g
			lCost := roundTo((totalGrams/100.0)*(*price), 2)
			lineCost = &lCost
			grandTotal += lCost
			withPrice++
		} else {
			missingPrice++
		}

		lines = append(lines, domain.GroceryListLine{
			FoodID:               foodID,
			Name:                 agg.Name,
			Category:             agg.Category,
			DailyPortionG:        roundTo(agg.DailyPortionG, 1),
			TotalGrams:           totalGrams,
			PurchaseUnitG:        unitG,
			PurchasePrice:        price,
			UnitsToBuy:           unitsToBuy,
			LineCost:             lineCost,
			PurchaseGramsRounded: purchaseGramsRounded,
		})
	}

	sort.Slice(lines, func(i, j int) bool {
		catI := "zzz"
		if lines[i].Category != nil {
			catI = *lines[i].Category
		}
		catJ := "zzz"
		if lines[j].Category != nil {
			catJ = *lines[j].Category
		}

		if catI != catJ {
			return catI < catJ
		}
		return lines[i].Name < lines[j].Name
	})

	return domain.SmartGroceryList{
		Days:              days,
		ItemCount:         len(lines),
		LinesWithPrice:    withPrice,
		LinesMissingPrice: missingPrice,
		GrandTotal:        roundTo(grandTotal, 2),
		CurrencyNote:      "COP / moneda de purchase_price en TCA 2018",
		Lines:             lines,
		GeneratedAt:       time.Now().UTC().Format(time.RFC3339),
	}, nil
}
