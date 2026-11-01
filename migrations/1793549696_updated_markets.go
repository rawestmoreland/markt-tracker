package migrations

import (
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	m "ganigeorgiev.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_2256537436")
		if err != nil {
			return err
		}

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(15, []byte(`{
			"cascadeDelete": false,
			"collectionId": "_pb_users_auth_",
			"help": "",
			"hidden": false,
			"id": "relation3725765462",
			"maxSelect": 0,
			"minSelect": 0,
			"name": "created_by",
			"presentable": false,
			"required": false,
			"system": false,
			"type": "relation"
		}`)); err != nil {
			return err
		}

		// add field
		if err := collection.Fields.AddMarshaledJSONAt(16, []byte(`{
			"help": "",
			"hidden": false,
			"id": "bool256245529",
			"name": "verified",
			"presentable": false,
			"required": false,
			"system": false,
			"type": "bool"
		}`)); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_2256537436")
		if err != nil {
			return err
		}

		// remove field
		collection.Fields.RemoveById("relation3725765462")

		// remove field
		collection.Fields.RemoveById("bool256245529")

		return app.Save(collection)
	})
}
