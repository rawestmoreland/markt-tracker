package main

import (
	"log"
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
