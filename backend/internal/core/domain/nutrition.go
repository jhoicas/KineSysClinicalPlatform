package domain

import (
	"time"

	"github.com/google/uuid"
)

type NutritionPlan struct {
	ID             uuid.UUID      `json:"id"`
	TenantID       uuid.UUID      `json:"tenant_id"`
	PatientID      uuid.UUID      `json:"patient_id"`
	ProfessionalID uuid.UUID      `json:"professional_id"`
	PlanName       string         `json:"plan_name"`
	PlanType       *string        `json:"plan_type,omitempty"`
	CaloricTarget  *int           `json:"caloric_target_kcal,omitempty"`
	MacrosPct      map[string]any `json:"macros_pct,omitempty"`
	Meals          []map[string]any `json:"meals"`
	Notes          *string        `json:"notes,omitempty"`
	CreatedAt      time.Time        `json:"created_at"`
	UpdatedAt      time.Time        `json:"updated_at"`
}

type FoodCatalogNutrients struct {
	ID               *string  `json:"id,omitempty"`
	Name             *string  `json:"name,omitempty"`
	EnergyKcal       *float64 `json:"energy_kcal,omitempty"`
	ProteinG         *float64 `json:"protein_g,omitempty"`
	LipidsG          *float64 `json:"lipids_g,omitempty"`
	CarbsTotalG      *float64 `json:"carbs_total_g,omitempty"`
	CarbsAvailableG  *float64 `json:"carbs_available_g,omitempty"`
	DietaryFiberG    *float64 `json:"dietary_fiber_g,omitempty"`
	PurchaseUnit     *string  `json:"purchase_unit,omitempty"` // can be text "500", "500g"
	PurchasePrice    *float64 `json:"purchase_price,omitempty"`
}

type DietItemWithFood struct {
	ID       *string              `json:"id,omitempty"`
	MealID   *string              `json:"meal_id,omitempty"`
	FoodID   *string              `json:"food_id,omitempty"`
	PortionG float64              `json:"portion_g"`
	Food     FoodCatalogNutrients `json:"food"`
}

type DietItemBreakdown struct {
	FoodID     *string  `json:"food_id,omitempty"`
	FoodName   *string  `json:"food_name,omitempty"`
	PortionG   float64  `json:"portion_g"`
	EnergyKcal float64  `json:"energy_kcal"`
	ProteinG   float64  `json:"protein_g"`
	LipidsG    float64  `json:"lipids_g"`
	CarbsG     float64  `json:"carbs_g"`
	FiberG     float64  `json:"fiber_g"`
	Cost       *float64 `json:"cost"` // nil if missing price/unit
}

type DietPlanTotals struct {
	TotalKcal      float64             `json:"total_kcal"`
	TotalProteinG  float64             `json:"total_protein_g"`
	TotalLipidsG   float64             `json:"total_lipids_g"`
	TotalCarbsG    float64             `json:"total_carbs_g"`
	TotalFiberG    float64             `json:"total_fiber_g"`
	TotalCost      float64             `json:"total_cost"`
	CostIncomplete bool                `json:"cost_incomplete"`
	Items          []DietItemBreakdown `json:"items"`
}

type GroceryPlanItem struct {
	FoodID        string   `json:"food_id"`
	Name          *string  `json:"name,omitempty"`
	PortionG      float64  `json:"portion_g"`
	PurchaseUnit  *string  `json:"purchase_unit,omitempty"`
	PurchasePrice *float64 `json:"purchase_price,omitempty"`
	Category      *string  `json:"category,omitempty"`
}

type GroceryListLine struct {
	FoodID               string   `json:"food_id"`
	Name                 string   `json:"name"`
	Category             *string  `json:"category"`
	DailyPortionG        float64  `json:"daily_portion_g"`
	TotalGrams           float64  `json:"total_grams"`
	PurchaseUnitG        *float64 `json:"purchase_unit_g"`
	PurchasePrice        *float64 `json:"purchase_price"`
	UnitsToBuy           *int     `json:"units_to_buy"`
	LineCost             *float64 `json:"line_cost"`
	PurchaseGramsRounded *float64 `json:"purchase_grams_rounded"`
}

type SmartGroceryList struct {
	Days              int               `json:"days"`
	ItemCount         int               `json:"item_count"`
	LinesWithPrice    int               `json:"lines_with_price"`
	LinesMissingPrice int               `json:"lines_missing_price"`
	GrandTotal        float64           `json:"grand_total"`
	CurrencyNote      string            `json:"currency_note"`
	Lines             []GroceryListLine `json:"lines"`
	GeneratedAt       string            `json:"generated_at"`
}
