package migrations

import (
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	m "ganigeorgiev.com/pocketbase/pocketbase/migrations"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/types"
)

// Anonymous star ratings. The `ratings` collection has no API rules (superuser
// only): visitors rate through POST /api/markets/{id}/rate (see main.go), which
// upserts one rating per (market, voter) and refreshes the aggregate fields on
// the market. markets.rating_avg / rating_count are read-only for clients.
func init() {
	m.Register(func(app core.App) error {
		markets, err := app.FindCollectionByNameOrId("pbc_2256537436")
		if err != nil {
			return err
		}

		markets.Fields.Add(
			&core.NumberField{Name: "rating_avg", Min: types.Pointer(0.0), Max: types.Pointer(5.0)},
			&core.NumberField{Name: "rating_count", Min: types.Pointer(0.0), OnlyInt: true},
		)
		// authors must not set the aggregates on their own submissions
		markets.CreateRule = types.Pointer("@request.auth.id != '' && @request.body.created_by = @request.auth.id && @request.body.verified:isset = false && @request.body.rating_avg:isset = false && @request.body.rating_count:isset = false")
		if err := app.Save(markets); err != nil {
			return err
		}

		ratings := core.NewBaseCollection("ratings")
		ratings.Fields.Add(
			&core.RelationField{Name: "market", CollectionId: markets.Id, Required: true, CascadeDelete: true, MaxSelect: 1},
			&core.TextField{Name: "voter", Required: true, Max: 64},
			&core.NumberField{Name: "stars", Required: true, OnlyInt: true, Min: types.Pointer(1.0), Max: types.Pointer(5.0)},
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		ratings.AddIndex("idx_ratings_market_voter", true, "market, voter", "")
		return app.Save(ratings)
	}, func(app core.App) error {
		if ratings, err := app.FindCollectionByNameOrId("ratings"); err == nil {
			if err := app.Delete(ratings); err != nil {
				return err
			}
		}
		markets, err := app.FindCollectionByNameOrId("pbc_2256537436")
		if err != nil {
			return err
		}
		markets.Fields.RemoveByName("rating_avg")
		markets.Fields.RemoveByName("rating_count")
		markets.CreateRule = types.Pointer("@request.auth.id != '' && @request.body.created_by = @request.auth.id && @request.body.verified:isset = false")
		return app.Save(markets)
	})
}
