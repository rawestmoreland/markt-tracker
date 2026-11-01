package main

import (
	"log"
	"net/http"
	"os"

	"ganigeorgiev.com/pocketbase/dbx"
	"ganigeorgiev.com/pocketbase/pocketbase"
	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/plugins/migratecmd"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/osutils"

	_ "markt-tracker/migrations"
)

func main() {
	app := pocketbase.New()

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		// serves static files from the provided public dir (if exists)
		se.Router.GET("/{path...}", apis.Static(os.DirFS("./pb_public"), false))

		return se.Next()
	})

	// Anonymous rating: upsert one rating per (market, voter), then refresh the
	// market's aggregate. Runs with app privileges, so clients never need write
	// access to `markets` or `ratings`. `voter` is a random id kept in the
	// visitor's localStorage; it limits casual repeat-voting, not determined abuse.
	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		se.Router.POST("/api/markets/{id}/rate", func(e *core.RequestEvent) error {
			var body struct {
				Stars int    `json:"stars"`
				Voter string `json:"voter"`
			}
			if err := e.BindBody(&body); err != nil {
				return e.BadRequestError("invalid body", err)
			}
			if body.Stars < 1 || body.Stars > 5 || len(body.Voter) < 8 || len(body.Voter) > 64 {
				return e.BadRequestError("stars must be 1-5 and voter 8-64 chars", nil)
			}

			// only verified markets are public, so only those can be rated
			market, err := e.App.FindFirstRecordByFilter("markets", "id = {:id} && verified = true", dbx.Params{"id": e.Request.PathValue("id")})
			if err != nil {
				return e.NotFoundError("market not found", err)
			}

			err = e.App.RunInTransaction(func(tx core.App) error {
				rating, err := tx.FindFirstRecordByFilter("ratings", "market = {:m} && voter = {:v}", dbx.Params{"m": market.Id, "v": body.Voter})
				if err != nil {
					coll, cerr := tx.FindCollectionByNameOrId("ratings")
					if cerr != nil {
						return cerr
					}
					rating = core.NewRecord(coll)
					rating.Set("market", market.Id)
					rating.Set("voter", body.Voter)
				}
				rating.Set("stars", body.Stars)
				if err := tx.Save(rating); err != nil {
					return err
				}

				var agg struct {
					Avg   float64 `db:"avg"`
					Count int     `db:"count"`
				}
				if err := tx.DB().NewQuery("SELECT COALESCE(AVG(stars), 0) AS avg, COUNT(*) AS count FROM ratings WHERE market = {:m}").
					Bind(dbx.Params{"m": market.Id}).One(&agg); err != nil {
					return err
				}
				market.Set("rating_avg", float64(int(agg.Avg*10+0.5))/10)
				market.Set("rating_count", agg.Count)
				return tx.Save(market)
			})
			if err != nil {
				return e.InternalServerError("could not save rating", err)
			}
			return e.JSON(http.StatusOK, map[string]any{
				"rating_avg":   market.GetFloat("rating_avg"),
				"rating_count": market.GetInt("rating_count"),
			})
		})
		return se.Next()
	})

	// When a user is deleted, also delete their markets that are still pending
	// review (they'd otherwise be orphaned and invisible). Verified markets are
	// public content and are kept; their created_by is cleared by PocketBase.
	app.OnRecordDelete("users").BindFunc(func(e *core.RecordEvent) error {
		pending, err := e.App.FindRecordsByFilter(
			"markets",
			"created_by = {:user} && verified != true",
			"", 0, 0,
			dbx.Params{"user": e.Record.Id},
		)
		if err != nil {
			return err
		}
		for _, m := range pending {
			if err := e.App.Delete(m); err != nil {
				return err
			}
		}
		return e.Next()
	})

	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		// enable auto creation of migration files when making collection changes in the Dashboard
		// (the IsProbablyGoRun check is to enable it only during development)
		Automigrate: osutils.IsProbablyGoRun(),
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
