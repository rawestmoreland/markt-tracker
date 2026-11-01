package migrations

import (
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	m "ganigeorgiev.com/pocketbase/pocketbase/migrations"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/types"
)

// Lets signed-in users submit markets. Submissions are created unverified and
// stay visible only to their author until `verified` is set (via the admin UI).
func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_2256537436")
		if err != nil {
			return err
		}

		// Existing (seeded) markets have no author: mark them verified so they
		// remain publicly listed under the new listRule.
		if _, err := app.DB().NewQuery(
			"UPDATE markets SET verified = 1 WHERE created_by = '' OR created_by IS NULL",
		).Execute(); err != nil {
			return err
		}

		collection.ListRule = types.Pointer("verified = true || (@request.auth.id != '' && created_by = @request.auth.id)")
		collection.ViewRule = collection.ListRule
		// authors must claim the record as themselves and cannot self-verify
		collection.CreateRule = types.Pointer("@request.auth.id != '' && @request.body.created_by = @request.auth.id && @request.body.verified:isset = false")

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_2256537436")
		if err != nil {
			return err
		}

		collection.ListRule = types.Pointer("")
		collection.ViewRule = types.Pointer("")
		collection.CreateRule = nil

		return app.Save(collection)
	})
}
